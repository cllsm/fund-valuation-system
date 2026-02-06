import { ref, computed } from 'vue'
import { generateUUID } from '../utils/uuid'

/**
 * 基金数据管理的通用逻辑
 */
export function useFundData() {
  const funds = ref([])
  const isRefreshing = ref(false)

  // 格式化涨跌幅
  const formatChangeRate = (rate) => {
    if (rate === undefined || rate === null) return '--'
    return rate > 0 ? `+${rate}%` : `${rate}%`
  }

  // 获取基金数据
  const fetchFundData = (code) => {
    return new Promise((resolve, reject) => {
      const timestamp = Date.now()
      const url = `https://fundgz.1234567.com.cn/js/${code}.js?rt=${timestamp}`
      
      const script = document.createElement('script')
      const originalJsonpgz = window.jsonpgz
      let isResolved = false
      
      window.jsonpgz = (data) => {
        if (isResolved) return
        isResolved = true
        
        window.jsonpgz = originalJsonpgz
        if (script.parentNode) {
          document.body.removeChild(script)
        }
        
        if (data && typeof data === 'object' && data.fundcode) {
          resolve(data)
        } else {
          reject(new Error('返回数据格式错误'))
        }
      }

      script.src = url
      script.onerror = () => {
        if (isResolved) return
        isResolved = true
        
        window.jsonpgz = originalJsonpgz
        if (script.parentNode) {
          document.body.removeChild(script)
        }
        reject(new Error('JSONP请求失败'))
      }

      document.body.appendChild(script)
      
      // 设置超时
      setTimeout(() => {
        if (!isResolved) {
          isResolved = true
          window.jsonpgz = originalJsonpgz
          if (script.parentNode) {
            document.body.removeChild(script)
          }
          reject(new Error(`请求超时: ${code}`))
        }
      }, 10000)
    })
  }

  // 刷新单个基金
  const refreshSingleFund = async (fundId) => {
    const fund = funds.value.find(f => f.id === fundId)
    if (!fund) return

    fund.isUpdating = true

    try {
      const fundData = await fetchFundData(fund.code)
      if (fundData) {
        fund.name = fundData.name
        fund.currentValue = fundData.gsz
        fund.changeRate = parseFloat(fundData.gszzl)
        fund.updateTime = fundData.gztime
      }
    } catch (error) {
      console.error(`刷新基金 ${fund.code} 数据失败:`, error)
    } finally {
      fund.isUpdating = false
    }
  }

  // 批量刷新基金数据
  const refreshAllData = async (batchSize = 5) => {
    if (funds.value.length === 0) return
    
    isRefreshing.value = true
    funds.value.forEach(fund => fund.isUpdating = true)

    try {
      const promises = []
      
      for (let i = 0; i < funds.value.length; i += batchSize) {
        const batch = funds.value.slice(i, i + batchSize)
        const batchPromise = Promise.allSettled(
          batch.map(async (fund) => {
            try {
              const data = await fetchFundData(fund.code)
              if (data) {
                fund.name = data.name
                fund.currentValue = data.gsz
                fund.changeRate = parseFloat(data.gszzl)
                fund.updateTime = data.gztime
              }
            } catch (error) {
              console.error(`刷新基金 ${fund.code} 数据失败:`, error)
            } finally {
              fund.isUpdating = false
            }
          })
        )
        
        promises.push(batchPromise)
        
        if (i + batchSize < funds.value.length) {
          await new Promise(resolve => setTimeout(resolve, 300))
        }
      }

      await Promise.allSettled(promises)
    } catch (error) {
      console.error('刷新数据失败:', error)
    } finally {
      isRefreshing.value = false
    }
  }

  // 添加基金
  const addFund = async (code, groupId = '') => {
    if (!code || !/^\d{6}$/.test(code)) {
      throw new Error('请输入6位数字的基金代码')
    }

    if (funds.value.some(fund => fund.code === code)) {
      throw new Error('该基金已存在')
    }

    const fundData = await fetchFundData(code)
    if (!fundData) {
      throw new Error('获取基金数据失败，请检查基金代码是否正确')
    }

    const newFund = {
      id: generateUUID(),
      code: code,
      name: fundData.name,
      currentValue: fundData.gsz,
      changeRate: parseFloat(fundData.gszzl),
      updateTime: fundData.gztime,
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