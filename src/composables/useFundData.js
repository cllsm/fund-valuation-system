import { ref } from 'vue'
import { generateUUID } from '../utils/uuid'

/**
 * 请求管理器 - 用于跟踪和控制并发请求
 */
class RequestManager {
  constructor() {
    this.activeRequests = new Map()
    this.maxConcurrent = 5
  }

  generateCallbackName() {
    const requestId = generateUUID().replace(/-/g, '')
    return `jsonp_callback_${requestId}`
  }

  registerRequest(requestId, callbackName, resolve, reject) {
    this.activeRequests.set(requestId, {
      callbackName,
      resolve,
      reject,
      timestamp: Date.now()
    })
  }

  cancelAllRequests() {
    this.activeRequests.forEach((request, requestId) => {
      const { callbackName, reject } = request
      if (window[callbackName]) {
        delete window[callbackName]
      }
      reject(new Error('请求已取消'))
    })
    this.activeRequests.clear()
  }
}

const requestManager = new RequestManager()

const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000,
  backoffMultiplier: 2
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const withRetry = async (fn, retries = RETRY_CONFIG.maxRetries, delayMs = RETRY_CONFIG.retryDelay) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === retries - 1) throw error
      
      console.log(`请求失败，${delayMs}ms后重试 (${i + 1}/${retries})...`)
      await delay(delayMs)
      delayMs *= RETRY_CONFIG.backoffMultiplier
    }
  }
}

/**
 * 基金数据管理的通用逻辑 - 重构版本，支持并发且保证数据一一对应
 */
export function useFundData() {
  const funds = ref([])
  const isRefreshing = ref(false)
  const abortController = ref(null)

  // 格式化涨跌幅
  const formatChangeRate = (rate) => {
    if (rate === undefined || rate === null) return '--'
    return rate > 0 ? `+${rate}%` : `${rate}%`
  }

  const createFetchPromise = (code, requestId, signal) => {
    return new Promise((resolve, reject) => {
      const timestamp = Date.now()
      const callbackName = requestManager.generateCallbackName()
      
      if (signal?.aborted) {
        reject(new Error('请求已取消'))
        return
      }

      const url = `https://fundgz.1234567.com.cn/js/${code}.js?rt=${timestamp}&callback=${callbackName}`
      
      let isResolved = false
      let script = null
      
      const callback = (data) => {
        if (isResolved) return
        isResolved = true
        cleanup()
        
        if (data && typeof data === 'object' && data.fundcode) {
          resolve({ requestId, code, data })
        } else {
          reject(new Error('返回数据格式错误'))
        }
      }

      const cleanup = () => {
        if (script && script.parentNode) {
          document.body.removeChild(script)
        }
        if (window[callbackName]) {
          delete window[callbackName]
        }
        requestManager.activeRequests.delete(requestId)
      }

      const abortHandler = () => {
        if (isResolved) return
        isResolved = true
        cleanup()
        reject(new Error('请求已取消'))
      }

      if (signal) {
        signal.addEventListener('abort', abortHandler, { once: true })
      }

      window[callbackName] = callback

      script = document.createElement('script')
      script.src = url
      script.onerror = () => {
        if (isResolved) return
        isResolved = true
        cleanup()
        reject(new Error('JSONP请求失败'))
      }

      document.body.appendChild(script)
      
      setTimeout(() => {
        if (!isResolved) {
          isResolved = true
          cleanup()
          reject(new Error(`请求超时: ${code}`))
        }
      }, 10000)
    })
  }

  const fetchFundData = (code, requestId = generateUUID(), signal = null) => {
    return withRetry(() => createFetchPromise(code, requestId, signal))
  }

  const refreshSingleFund = async (fundId) => {
    const fund = funds.value.find(f => f.id === fundId)
    if (!fund) return

    fund.isUpdating = true
    const requestId = generateUUID()

    try {
      const result = await fetchFundData(fund.code, requestId, abortController.value?.signal)
      
      if (result.requestId === requestId && result.data.fundcode === fund.code) {
        Object.assign(fund, {
          name: result.data.name,
          currentValue: result.data.gsz,
          changeRate: parseFloat(result.data.gszzl),
          updateTime: result.data.gztime,
          isUpdating: false
        })
      }
    } catch (error) {
      console.error(`刷新基金 ${fund.code} 数据失败:`, error)
      fund.isUpdating = false
    }
  }

  const refreshAllData = async (batchSize = 5) => {
    if (funds.value.length === 0) return
    
    isRefreshing.value = true
    
    abortController.value = new AbortController()
    requestManager.maxConcurrent = batchSize
    
    const fundRequestMap = new Map()
    funds.value.forEach(fund => {
      fund.isUpdating = true
      const requestId = generateUUID()
      fundRequestMap.set(requestId, {
        fundId: fund.id,
        fundCode: fund.code,
        originalIndex: funds.value.indexOf(fund)
      })
    })

    const requests = Array.from(fundRequestMap.entries()).map(([requestId, info]) => ({
      requestId,
      fundCode: info.fundCode
    }))

    try {
      const results = await processBatchRequests(requests, batchSize, abortController.value.signal)
      
      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          const { requestId, code, data } = result.value
          const requestInfo = fundRequestMap.get(requestId)
          
          if (!requestInfo) {
            console.warn(`未找到请求ID ${requestId} 对应的基金`)
            return
          }
          
          if (code !== requestInfo.fundCode) {
            console.warn(`基金代码不匹配: 请求 ${code}, 预期 ${requestInfo.fundCode}`)
            return
          }
          
          const fund = funds.value.find(f => f.id === requestInfo.fundId)
          if (!fund) {
            console.warn(`未找到基金ID ${requestInfo.fundId}`)
            return
          }
          
          Object.assign(fund, {
            name: data.name,
            currentValue: data.gsz,
            changeRate: parseFloat(data.gszzl),
            updateTime: data.gztime,
            isUpdating: false,
            updateError: null
          })
        }
      })
      
    } catch (error) {
      console.error('批量刷新数据过程发生错误:', error)
      
      funds.value.forEach(fund => {
        fund.isUpdating = false
      })
    } finally {
      isRefreshing.value = false
      abortController.value = null
    }
  }

  // 添加基金
  const processBatchRequests = async (requests, batchSize, signal) => {
    const results = []
    
    for (let i = 0; i < requests.length; i += batchSize) {
      if (signal?.aborted) {
        throw new Error('操作已取消')
      }
      
      const batch = requests.slice(i, i + batchSize)
      
      const batchPromises = batch.map(({ requestId, fundCode }) => 
        fetchFundData(fundCode, requestId, signal)
          .catch(error => ({
            requestId,
            fundCode,
            error: error.message
          }))
      )
      
      const batchResults = await Promise.allSettled(batchPromises)
      results.push(...batchResults)
      
      if (i + batchSize < requests.length) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }
    
    return results
  }

  const addFund = async (code, groupId = '') => {
    if (!code || !/^\d{6}$/.test(code)) {
      throw new Error('请输入6位数字的基金代码')
    }

    if (funds.value.some(fund => fund.code === code)) {
      throw new Error('该基金已存在')
    }

    const requestId = generateUUID()
    const result = await fetchFundData(code, requestId)
    
    if (!result || !result.data) {
      throw new Error('获取基金数据失败，请检查基金代码是否正确')
    }

    const newFund = {
      id: generateUUID(),
      code: code,
      name: result.data.name,
      currentValue: result.data.gsz,
      changeRate: parseFloat(result.data.gszzl),
      updateTime: result.data.gztime,
      groupId: groupId,
      isUpdating: false
    }
    
    funds.value.push(newFund)
    return newFund
  }

  // 删除基金
  const deleteFund = (fundId) => {
    funds.value = funds.value.filter(fund => fund.id !== fundId)
  }

  // 更改基金的分组
  const changeFundGroup = (fundId, groupId) => {
    const fund = funds.value.find(f => f.id === fundId)
    if (fund) {
      fund.groupId = groupId
      return fund
    }
    return null
  }

  return {
    funds,
    isRefreshing,
    formatChangeRate,
    fetchFundData,
    refreshSingleFund,
    refreshAllData,
    addFund,
    deleteFund,
    changeFundGroup
  }
}