import { ref } from 'vue'
import { generateUUID } from '../utils/uuid'

class RequestManager {
  constructor() {
    this.activeRequests = new Map()
    this.maxConcurrent = 5
  }

  registerRequest(requestId, fundCode, resolve, reject) {
    this.activeRequests.set(requestId, {
      fundCode,
      resolve,
      reject,
      timestamp: Date.now()
    })
  }

  handleCallback(fundCode, data) {
    for (const [requestId, request] of this.activeRequests.entries()) {
      if (request.fundCode === fundCode) {
        request.resolve({ requestId, code: fundCode, data })
        this.activeRequests.delete(requestId)
        return true
      }
    }
    return false
  }

  cancelAllRequests() {
    this.activeRequests.forEach((request, requestId) => {
      request.reject(new Error('请求已取消'))
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
      const url = `https://fundgz.1234567.com.cn/js/${code}.js?rt=${timestamp}`
      
      console.log(`[fetchFundData] 创建请求: code=${code}, requestId=${requestId}`)
      
      if (signal?.aborted) {
        reject(new Error('请求已取消'))
        return
      }
      
      requestManager.registerRequest(requestId, code, resolve, reject)
      
      let isResolved = false
      let script = null
      
      const cleanup = () => {
        console.log(`[fetchFundData] 清理资源: code=${code}`)
        if (script && script.parentNode) {
          document.body.removeChild(script)
        }
        if (!isResolved) {
          requestManager.activeRequests.delete(requestId)
        }
      }

      const abortHandler = () => {
        console.log(`[fetchFundData] 请求已取消: code=${code}`)
        if (isResolved) return
        isResolved = true
        cleanup()
        reject(new Error('请求已取消'))
      }

      if (signal) {
        signal.addEventListener('abort', abortHandler, { once: true })
      }

      script = document.createElement('script')
      script.src = url
      script.onerror = () => {
        console.error(`[fetchFundData] script加载失败: code=${code}, url=${url}`)
        if (isResolved) return
        isResolved = true
        cleanup()
        reject(new Error('JSONP请求失败'))
      }
      
      script.onload = () => {
        console.log(`[fetchFundData] script加载完成: code=${code}`)
      }

      document.body.appendChild(script)
      console.log(`[fetchFundData] script标签已添加: code=${code}`)
      
      setTimeout(() => {
        if (!isResolved) {
          console.warn(`[fetchFundData] 请求超时: code=${code}, 10秒内未收到回调`)
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
    
    const originalJsonpgz = window.jsonpgz
    
    window.jsonpgz = (data) => {
      if (data && data.fundcode === fund.code) {
        originalJsonpgz?.(data)
      }
    }

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
    } finally {
      window.jsonpgz = originalJsonpgz
    }
  }

  const refreshAllData = async (batchSize = 5) => {
    if (funds.value.length === 0) return
    
    console.log('[refreshAllData] 开始刷新，基金数量:', funds.value.length)
    isRefreshing.value = true
    
    abortController.value = new AbortController()
    requestManager.maxConcurrent = batchSize
    requestManager.cancelAllRequests()
    
    const originalJsonpgz = window.jsonpgz
    
    window.jsonpgz = (data) => {
      if (data && data.fundcode) {
        const handled = requestManager.handleCallback(data.fundcode, data)
        if (!handled) {
          console.warn(`收到未预期的基金数据: ${data.fundcode}`)
        }
      }
    }
    
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
      console.log('[refreshAllData] 开始处理批次请求')
      const results = await processBatchRequests(requests, batchSize, abortController.value.signal)
      console.log('[refreshAllData] 批次请求完成，结果数:', results.length)
      
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
      console.log('[refreshAllData] 刷新完成，isRefreshing 设置为 false')
      isRefreshing.value = false
      abortController.value = null
      window.jsonpgz = originalJsonpgz
      requestManager.cancelAllRequests()
    }
  }

  // 添加基金
  const processBatchRequests = async (requests, batchSize, signal) => {
    const results = []
    
    for (let i = 0; i < requests.length; i += batchSize) {
      if (signal?.aborted) {
        console.log('[processBatchRequests] 信号已中止，取消所有请求')
        requestManager.cancelAllRequests()
        throw new Error('操作已取消')
      }
      
      const batch = requests.slice(i, i + batchSize)
      
      console.log(`[processBatchRequests] 处理批次 ${Math.floor(i/batchSize) + 1}, 请求数: ${batch.length}`)
      
      const batchPromises = batch.map(({ requestId, fundCode }) => 
        fetchFundData(fundCode, requestId, signal)
          .catch(error => {
            console.error(`[processBatchRequests] 请求失败: ${fundCode}`, error)
            return {
              requestId,
              fundCode,
              error: error.message
            }
          })
      )
      
      const batchResults = await Promise.allSettled(batchPromises)
      console.log(`[processBatchRequests] 批次完成，成功: ${batchResults.filter(r => r.status === 'fulfilled').length}`)
      results.push(...batchResults)
      
      if (i + batchSize < requests.length) {
        console.log(`[processBatchRequests] 等待 200ms 后处理下一批次`)
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }
    
    console.log(`[processBatchRequests] 所有批次处理完成，总结果数: ${results.length}`)
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
    const originalJsonpgz = window.jsonpgz
    
    window.jsonpgz = (data) => {
      if (data && data.fundcode === code) {
        originalJsonpgz?.(data)
      }
    }

    try {
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
    } finally {
      window.jsonpgz = originalJsonpgz
    }
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