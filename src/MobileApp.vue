<template>
  <div class="mobile-app">
    <!-- 顶部状态栏 -->
    <div class="status-bar">
      <div class="time">{{ currentTime }}</div>
      <div class="status" :class="connectionStatus">
        {{ statusText }}
      </div>
    </div>

    <!-- 头部 -->
    <header class="header">
      <div class="header-content">
        <h1 class="app-title">
          <span class="icon">📊</span>
          基金估值
        </h1>
        <div class="header-actions">
          <button class="refresh-btn" @click="refreshAllData" :disabled="isRefreshing">
            <span class="icon">{{ isRefreshing ? '⏳' : '🔄' }}</span>
          </button>
          <button class="add-btn" @click="showAddFundDialog = true">
            <span class="icon">+</span>
          </button>
        </div>
      </div>
    </header>

    <!-- 基金列表 -->
    <div class="fund-list-container" :class="{ 'loading': isRefreshing }">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <!-- 分组选择器（如果有分组） -->
        <div class="group-selector" v-if="groups.length > 0">
          <select v-model="currentGroup" @change="switchGroup" class="group-select">
            <option value="">所有基金</option>
            <option v-for="group in groups" :key="group.id" :value="group.id">
              {{ group.name }} ({{ group.fundCount }})
            </option>
          </select>
        </div>

        <!-- 排序选择器 -->
        <div class="sort-selector">
          <select v-model="currentSort" @change="applySort" class="sort-select">
            <option value="default">默认排序</option>
            <option value="changeRateDesc">涨跌幅 ↓</option>
            <option value="changeRateAsc">涨跌幅 ↑</option>
          </select>
        </div>
      </div>

        <!-- 基金卡片列表 -->
        <div class="fund-list">
          <div 
            v-for="fund in displayedFunds" 
            :key="fund.code" 
            class="fund-card"
            :class="{ 
              'up': fund.changeRate > 0, 
              'down': fund.changeRate < 0,
              'updating': fund.isUpdating
            }"
            @click="showFundDetail(fund)"
          >
            <div class="fund-info">
              <div class="fund-header">
                <div class="fund-name">{{ fund.name }}</div>
                <div class="fund-code">{{ fund.code }}</div>
              </div>
              <div class="fund-data">
                <div class="current-value">{{ fund.currentValue || '--' }}</div>
                <div class="change-rate" :class="{ 'positive': fund.changeRate > 0, 'negative': fund.changeRate < 0 }">
                  {{ formatChangeRate(fund.changeRate) }}
                </div>
              </div>
              <div class="fund-time">{{ fund.updateTime || '--' }}</div>
              <div v-if="fund.isUpdating" class="updating-indicator">更新中...</div>
            </div>
            <div class="fund-actions">
              <button class="action-btn delete-btn" @click.stop="deleteFund(fund.code)">
                <span class="icon">🗑️</span>
              </button>
            </div>
          </div>

        <!-- 空状态 -->
        <div v-if="displayedFunds.length === 0" class="empty-state">
          <div class="empty-icon">📈</div>
          <div class="empty-text">{{ currentGroup ? '该分组暂无基金数据' : '暂无基金数据' }}</div>
          <button class="add-first-btn" @click="showAddFundDialog = true">
            添加第一个基金
          </button>
        </div>
      </div>
    </div>

    <!-- 底部导航 -->
    <nav class="bottom-nav">
      <button class="nav-btn" @click="showAddFundDialog = true">
        <span class="nav-icon">+</span>
        <span class="nav-text">添加</span>
      </button>
      <button class="nav-btn" @click="showAddGroupDialog = true">
        <span class="nav-icon">📁</span>
        <span class="nav-text">分组</span>
      </button>
      <button class="nav-btn" @click="toggleAutoRefresh">
        <span class="nav-icon">{{ autoRefresh ? '⏰' : '⏸️' }}</span>
        <span class="nav-text">{{ autoRefresh ? '自动' : '暂停' }}</span>
      </button>
    </nav>

    <!-- 添加基金对话框 -->
    <div v-if="showAddFundDialog" class="modal-overlay" @click="showAddFundDialog = false">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>添加基金</h3>
          <button class="close-btn" @click="showAddFundDialog = false">×</button>
        </div>
        <div class="modal-body">
          <input 
            v-model="newFundCode" 
            type="text" 
            placeholder="请输入6位基金代码" 
            maxlength="6"
            class="input-field"
            @keyup.enter="addFund"
          >
          <div v-if="addFundError" class="error-message">{{ addFundError }}</div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showAddFundDialog = false">取消</button>
          <button class="btn btn-primary" @click="addFund" :disabled="!newFundCode">确定</button>
        </div>
      </div>
    </div>

    <!-- 新建分组对话框 -->
    <div v-if="showAddGroupDialog" class="modal-overlay" @click="showAddGroupDialog = false">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>新建分组</h3>
          <button class="close-btn" @click="showAddGroupDialog = false">×</button>
        </div>
        <div class="modal-body">
          <input 
            v-model="newGroupName" 
            type="text" 
            placeholder="请输入分组名称" 
            maxlength="20"
            class="input-field"
            @keyup.enter="addGroup"
          >
          <div v-if="addGroupError" class="error-message">{{ addGroupError }}</div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showAddGroupDialog = false">取消</button>
          <button class="btn btn-primary" @click="addGroup" :disabled="!newGroupName">确定</button>
        </div>
      </div>
    </div>

    <!-- 基金详情弹窗 -->
    <div v-if="showFundDetailDialog" class="modal-overlay" @click="showFundDetailDialog = false">
      <div class="modal detail-modal" @click.stop>
        <div class="modal-header">
          <h3>基金详情</h3>
          <button class="close-btn" @click="showFundDetailDialog = false">×</button>
        </div>
        <div class="modal-body detail-body" v-if="selectedFund">
          <div class="detail-section">
            <div class="detail-item">
              <span class="detail-label">基金名称</span>
              <span class="detail-value">{{ selectedFund.name }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">基金代码</span>
              <span class="detail-value">{{ selectedFund.code }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">估算净值</span>
              <span class="detail-value value-large">{{ selectedFund.currentValue || '--' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">估算涨跌幅</span>
              <span class="detail-value" :class="{ 'positive': selectedFund.changeRate > 0, 'negative': selectedFund.changeRate < 0 }">
                {{ formatChangeRate(selectedFund.changeRate) }}
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">更新时间</span>
              <span class="detail-value">{{ selectedFund.updateTime || '--' }}</span>
            </div>
          </div>
          <div class="detail-actions">
            <button class="btn btn-primary" @click="refreshSingleFund(selectedFund)">
              刷新数据
            </button>
            <button class="btn btn-info" @click="showFundStockPositions(selectedFund)" :disabled="isLoadingStocks">
              {{ isLoadingStocks ? '加载中...' : '查看持仓' }}
            </button>
            <button class="btn btn-danger" @click="deleteFund(selectedFund.code); showFundDetailDialog = false">
              删除基金
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 资产配置弹窗 -->
    <div v-if="showStockPositionsDialog" class="modal-overlay" @click="showStockPositionsDialog = false">
      <div class="modal stock-modal" @click.stop>
        <div class="modal-header">
          <h3>资产配置 ({{ selectedFund?.name }} - {{ selectedFund?.code }})</h3>
          <button class="close-btn" @click="showStockPositionsDialog = false">×</button>
        </div>
        <div class="modal-body stock-body">
          <!-- 加载状态 -->
          <div v-if="isLoadingStocks" class="loading-stocks">
            <div class="loading-spinner">
              <div class="spinner"></div>
              <div>正在加载资产配置数据...</div>
            </div>
          </div>
          
          <!-- 错误状态 -->
          <div v-else-if="stockError" class="error-message">
            {{ stockError }}
            <button class="btn btn-primary retry-btn" @click="loadFundAssetAllocation">
              重试
            </button>
          </div>
          
          <!-- 资产配置信息 -->
          <div v-else-if="selectedFund?.assetData" class="asset-allocation">
            <!-- 资产配置概览 -->
            <div class="asset-overview">
              <div class="asset-overview-item">
                <span class="asset-label">数据来源</span>
                <span class="asset-value">{{ selectedFund.assetData.source_mark || selectedFund.assetData.source }}</span>
              </div>
              <div class="asset-chart">
                <div v-for="item in selectedFund.assetData.chart_list" :key="item.type" class="chart-item">
                  <div class="chart-color" :style="{ backgroundColor: item.color }"></div>
                  <span class="chart-label">{{ item.type_desc }}</span>
                  <span class="chart-percent">{{ item.percent }}%</span>
                </div>
              </div>
            </div>
            
            <!-- 行业配置 -->
            <div v-if="selectedFund.assetData.industry_list && selectedFund.assetData.industry_list.length > 0" class="asset-section">
              <h4 class="section-title">行业配置</h4>
              <div class="industry-list">
                <div v-for="industry in selectedFund.assetData.industry_list" :key="industry.industry_code" class="industry-item">
                  <span class="industry-name">{{ industry.industry_name }}</span>
                  <span class="industry-percent">{{ industry.percent }}%</span>
                </div>
              </div>
            </div>
            
            <!-- 股票持仓 -->
            <div v-if="stockPositions.length > 0" class="asset-section">
              <h4 class="section-title">股票持仓 (前{{ stockPositions.length }}名)</h4>
              <div class="stock-list">
                <div class="stock-item" v-for="stock in stockPositions" :key="stock.code" @click="openStockXueqiu(stock)">
                  <div class="stock-header">
                    <div class="stock-name">{{ stock.name }}</div>
                    <div class="stock-code">{{ stock.code }}</div>
                  </div>
                  <div class="stock-data">
                    <div class="stock-percent">{{ stock.percent }}%</div>
                    <div class="stock-price">{{ stock.current_price || '--' }}</div>
                    <div class="stock-change" :class="{ 'positive': stock.change_percentage > 0, 'negative': stock.change_percentage < 0 }">
                      {{ stock.change_percentage > 0 ? '+' : '' }}{{ stock.change_percentage || '--' }}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- 债券持仓 -->
            <div v-if="selectedFund.assetData.bond_list && selectedFund.assetData.bond_list.length > 0" class="asset-section">
              <h4 class="section-title">债券持仓</h4>
              <div class="bond-list">
                <div v-for="bond in selectedFund.assetData.bond_list" :key="bond.code" class="bond-item">
                  <span class="bond-name">{{ bond.name }}</span>
                  <span class="bond-percent">{{ bond.percent }}%</span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 空状态 -->
          <div v-else class="empty-stocks">
            <div class="empty-icon">📊</div>
            <div class="empty-text">暂无资产配置数据</div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showStockPositionsDialog = false">
            关闭
          </button>
        </div>
      </div>
    </div>

    <!-- 个股详情弹窗 -->
    <div v-if="showStockDetailDialog" class="modal-overlay" @click="showStockDetailDialog = false">
      <div class="modal stock-detail-modal" @click.stop>
        <div class="modal-header">
          <h3>个股详情</h3>
          <button class="close-btn" @click="showStockDetailDialog = false">×</button>
        </div>
        <div class="modal-body stock-detail-body" v-if="selectedStock">
          <div class="stock-detail-section">
            <div class="detail-item">
              <span class="detail-label">股票名称</span>
              <span class="detail-value">{{ selectedStock.name }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">股票代码</span>
              <span class="detail-value">{{ selectedStock.code }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">当前价格</span>
              <span class="detail-value value-large">{{ selectedStock.currentPrice || '--' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">涨跌幅</span>
              <span class="detail-value" :class="{ 'positive': selectedStock.changeRate > 0, 'negative': selectedStock.changeRate < 0 }">
                {{ formatChangeRate(selectedStock.changeRate) }}
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">涨跌额</span>
              <span class="detail-value" :class="{ 'positive': selectedStock.change > 0, 'negative': selectedStock.change < 0 }">
                {{ selectedStock.change > 0 ? '+' : '' }}{{ selectedStock.change || '--' }}
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">今开</span>
              <span class="detail-value">{{ selectedStock.todayOpen || '--' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">最高</span>
              <span class="detail-value">{{ selectedStock.high || '--' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">最低</span>
              <span class="detail-value">{{ selectedStock.low || '--' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">成交量</span>
              <span class="detail-value">{{ selectedStock.volume ? (selectedStock.volume / 10000).toFixed(2) + '万手' : '--' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">更新时间</span>
              <span class="detail-value">{{ selectedStock.timestamp ? formatTimestamp(selectedStock.timestamp) : '--' }}</span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showStockDetailDialog = false">
            关闭
          </button>
        </div>
      </div>
    </div>

    <!-- 加载遮罩 -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner">
        <div class="spinner"></div>
        <div>数据加载中...</div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { getFundAssetAllocation } from './services/danjuanApi'

export default {
  name: 'MobileApp',
  setup() {
    // 响应式数据
    const funds = ref([])
    const groups = ref([])
    const showAddFundDialog = ref(false)
    const showAddGroupDialog = ref(false)
    const showFundDetailDialog = ref(false)
    const showStockPositionsDialog = ref(false)
    const showStockDetailDialog = ref(false)
    const selectedFund = ref(null)
    const selectedStock = ref(null)
    const stockPositions = ref([])
    const newFundCode = ref('')
    const newGroupName = ref('')
    const addFundError = ref('')
    const addGroupError = ref('')
    const stockError = ref('')
    const loading = ref(false)
    const isRefreshing = ref(false)
    const isLoadingStocks = ref(false)
    const autoRefresh = ref(true)
    const connectionStatus = ref('ok')
    const currentGroup = ref('')
    const currentTime = ref('')
    const currentSort = ref('default')

    // 计算属性
    const displayedFunds = computed(() => {
      if (!funds.value || !Array.isArray(funds.value)) {
        return []
      }
      
      let filteredFunds = funds.value
      
      // 分组筛选
      if (currentGroup.value) {
        filteredFunds = filteredFunds.filter(fund => fund.groupId === currentGroup.value)
      }
      
      // 排序逻辑
      const sortedFunds = [...filteredFunds]
      switch (currentSort.value) {
        case 'changeRateDesc':
          return sortedFunds.sort((a, b) => (b.changeRate || -Infinity) - (a.changeRate || -Infinity))
        case 'changeRateAsc':
          return sortedFunds.sort((a, b) => (a.changeRate || Infinity) - (b.changeRate || Infinity))
        default:
          return sortedFunds
      }
    })

    const statusText = computed(() => {
      return connectionStatus.value === 'ok' ? '正常' : '异常'
    })

    // 方法
    const formatChangeRate = (rate) => {
      if (rate === undefined || rate === null) return '--'
      return rate > 0 ? `+${rate}%` : `${rate}%`
    }

    const deleteFund = (code) => {
      funds.value = funds.value.filter(fund => fund.code !== code)
      saveToStorage()
    }

    const showFundDetail = (fund) => {
      selectedFund.value = fund
      showFundDetailDialog.value = true
    }

    const refreshSingleFund = async (fund) => {
      if (!fund) return
      
      fund.isUpdating = true
      
      try {
        const fundData = await fetchFundData(fund.code)
        if (fundData) {
          // 更新本地数据
          fund.name = fundData.name
          fund.currentValue = fundData.gsz
          fund.changeRate = parseFloat(fundData.gszzl)
          fund.updateTime = fundData.gztime
          
          // 同时更新App.vue中的数据（如果存在）
          syncFundDataToApp(fund)
          saveToStorage()
        }
      } catch (error) {
        console.error(`刷新基金 ${fund.code} 数据失败:`, error)
      } finally {
        fund.isUpdating = false
      }
    }

    const addFund = async () => {
      if (!newFundCode.value) return
      
      const code = newFundCode.value.trim()
      if (!/^\d{6}$/.test(code)) {
        addFundError.value = '请输入6位数字的基金代码'
        return
      }

      if (funds.value.some(fund => fund.code === code)) {
        addFundError.value = '该基金已存在'
        return
      }

      loading.value = true
      addFundError.value = ''

      try {
        const fundData = await fetchFundData(code)
        if (fundData) {
          const newFund = {
            code: code,
            name: fundData.name,
            currentValue: fundData.gsz,
            changeRate: parseFloat(fundData.gszzl),
            updateTime: fundData.gztime,
            groupId: currentGroup.value || '',
            isUpdating: false
          }
          
          funds.value.push(newFund)
          updateGroupStats()
          saveToStorage()
          
          showAddFundDialog.value = false
          newFundCode.value = ''
        } else {
          addFundError.value = '获取基金数据失败，请检查基金代码是否正确'
        }
      } catch (error) {
        addFundError.value = '网络错误，请稍后重试'
        console.error('添加基金失败:', error)
      } finally {
        loading.value = false
      }
    }

    const refreshAllData = async () => {
      if (funds.value.length === 0) return
      
      isRefreshing.value = true
      connectionStatus.value = 'ok'

      try {
        funds.value.forEach(fund => {
          fund.isUpdating = true
        })

        const batchSize = 3
        const promises = []
        
        for (let i = 0; i < funds.value.length; i += batchSize) {
            const batch = funds.value.slice(i, i + batchSize)
            const batchPromise = Promise.allSettled(
              batch.map(async (fund, index) => {
                try {
                  const data = await fetchFundData(fund.code)
                  if (data) {
                    // 使用基金代码作为唯一标识符精确匹配，避免排序后的索引问题
                    const targetFund = funds.value.find(f => f.code === fund.code)
                    if (targetFund) {
                      // 直接更新数据，不使用setTimeout避免排序后数据错位
                      targetFund.name = data.name
                      targetFund.currentValue = data.gsz
                      targetFund.changeRate = parseFloat(data.gszzl)
                      targetFund.updateTime = data.gztime
                      targetFund.isUpdating = false

                      // 同步数据到App.vue
                      syncFundDataToApp(targetFund)
                      saveToStorage()
                    }
                  }
                } catch (error) {
                  console.error(`刷新基金 ${fund.code} 数据失败:`, error)
                  const targetFund = funds.value.find(f => f.code === fund.code)
                  if (targetFund) {
                    targetFund.isUpdating = false
                  }
                }
              })
            )
          
          promises.push(batchPromise)
          
          if (i + batchSize < funds.value.length) {
            await new Promise(resolve => setTimeout(resolve, 300))
          }
        }

        await Promise.allSettled(promises)
        saveToStorage() // 批量刷新完成后统一保存
      } catch (error) {
        connectionStatus.value = 'error'
        console.error('刷新数据失败:', error)
      } finally {
        isRefreshing.value = false
      }
    }

    const fetchFundData = (code) => {
      return new Promise((resolve, reject) => {
        const timestamp = Date.now()
        const url = `https://fundgz.1234567.com.cn/js/${code}.js?rt=${timestamp}`
        
        const script = document.createElement('script')
        const originalJsonpgz = window.jsonpgz
        
        window.jsonpgz = (data) => {
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
          window.jsonpgz = originalJsonpgz
          if (script.parentNode) {
            document.body.removeChild(script)
          }
          reject(new Error('JSONP请求失败'))
        }

        document.body.appendChild(script)
        
        setTimeout(() => {
          if (window.jsonpgz !== originalJsonpgz) {
            window.jsonpgz = originalJsonpgz
            if (script.parentNode) {
              document.body.removeChild(script)
            }
            reject(new Error('请求超时'))
          }
        }, 10000)
      })
    }

    const addGroup = () => {
      if (!newGroupName.value.trim()) {
        addGroupError.value = '请输入分组名称'
        return
      }

      const groupName = newGroupName.value.trim()
      if (groups.value.some(group => group.name === groupName)) {
        addGroupError.value = '分组名称已存在'
        return
      }

      const newGroup = {
        id: 'group_' + Date.now(),
        name: groupName,
        fundCount: 0
      }

      groups.value.push(newGroup)
      saveToStorage()
      showAddGroupDialog.value = false
      newGroupName.value = ''
      addGroupError.value = ''
    }

    const switchGroup = () => {
      // 切换分组逻辑
    }

    const applySort = () => {
      // 排序已通过计算属性自动应用
    }

    // 资产配置相关方法
    const showFundStockPositions = async (fund) => {
      selectedFund.value = fund
      showStockPositionsDialog.value = true
      await loadFundAssetAllocation()
    }

    const loadFundAssetAllocation = async () => {
      if (!selectedFund.value) return
      
      isLoadingStocks.value = true
      stockError.value = ''
      
      try {
        const assetData = await getFundAssetAllocation(selectedFund.value.code)
        stockPositions.value = assetData.stock_list || []
        
        // 保存完整的资产配置数据用于显示
        selectedFund.value.assetData = assetData
      } catch (error) {
        console.error('获取基金资产配置数据失败:', error)
        stockError.value = '获取资产配置数据失败，请检查网络连接或稍后重试'
        stockPositions.value = []
      } finally {
        isLoadingStocks.value = false
      }
    }

    const showStockDetail = (stock) => {
      selectedStock.value = stock
      showStockDetailDialog.value = true
    }

    const openStockXueqiu = (stock) => {
      console.log('打开雪球股票页面:', stock)
      if (stock.xq_url) {
        // 在新标签页打开雪球股票页面
        window.open(stock.xq_url, '_blank')
      } else {
        // 如果没有xq_url，使用默认的雪球链接格式
        const defaultUrl = `https://xueqiu.com/S/${stock.code}`
        window.open(defaultUrl, '_blank')
      }
    }

    const formatStockChangeRate = (rate) => {
      if (rate === undefined || rate === null) return '--'
      return rate > 0 ? `+${rate}%` : `${rate}%`
    }

    const formatTimestamp = (timestamp) => {
      // 格式化时间戳：20260205120517 -> 2026-02-05 12:05:17
      if (!timestamp || timestamp.length !== 14) return timestamp
      
      const year = timestamp.substring(0, 4)
      const month = timestamp.substring(4, 6)
      const day = timestamp.substring(6, 8)
      const hour = timestamp.substring(8, 10)
      const minute = timestamp.substring(10, 12)
      const second = timestamp.substring(12, 14)
      
      return `${year}-${month}-${day} ${hour}:${minute}:${second}`
    }

    // 同步基金数据到App.vue
    const syncFundDataToApp = (fund) => {
      // 先确保数据保存到localStorage
      saveToStorage()
      
      // 触发自定义事件通知App.vue更新数据
      const event = new CustomEvent('fundDataUpdated', {
        detail: {
          code: fund.code,
          name: fund.name,
          currentValue: fund.currentValue,
          changeRate: fund.changeRate,
          updateTime: fund.updateTime,
          timestamp: Date.now() // 添加时间戳确保顺序
        }
      })
      window.dispatchEvent(event)
    }

    const updateGroupStats = () => {
      groups.value.forEach(group => {
        group.fundCount = funds.value.filter(fund => fund.groupId === group.id).length
      })
    }

    const toggleAutoRefresh = () => {
      autoRefresh.value = !autoRefresh.value
    }

    const saveToStorage = () => {
      const storageData = {
        funds: funds.value,
        groups: groups.value,
        currentGroup: currentGroup.value
      }
      localStorage.setItem('fundData', JSON.stringify(storageData))
    }

    const loadFromStorage = async () => {
      const savedData = localStorage.getItem('fundData')
      if (savedData) {
        const data = JSON.parse(savedData)
        
        if (data.funds && data.funds.length > 0) {
          loading.value = true
          
          funds.value = data.funds.map(fund => ({
            ...fund,
            isUpdating: false
          }))
          
          groups.value = data.groups || []
          currentGroup.value = data.currentGroup || ''
          updateGroupStats()
          
          setTimeout(async () => {
            await refreshAllData()
            loading.value = false
          }, 100)
        }
      }
    }

    // 更新时间显示
    const updateTime = () => {
      const now = new Date()
      currentTime.value = now.toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    }

    // 自动刷新定时器
    let refreshTimer = null
    let timeTimer = null

    const startAutoRefresh = () => {
      if (refreshTimer) {
        clearInterval(refreshTimer)
      }
      refreshTimer = setInterval(() => {
        if (autoRefresh.value && funds.value.length > 0) {
          refreshAllData()
        }
      }, 60000)
    }

    const startTimeUpdate = () => {
      updateTime()
      timeTimer = setInterval(updateTime, 1000)
    }

    // 监听自动刷新开关
    watch(autoRefresh, (newVal) => {
      if (newVal && funds.value.length > 0) {
        startAutoRefresh()
      } else {
        clearInterval(refreshTimer)
      }
    })

    // 生命周期
    onMounted(() => {
      loadFromStorage()
      startAutoRefresh()
      startTimeUpdate()
    })

    onUnmounted(() => {
      if (refreshTimer) {
        clearInterval(refreshTimer)
      }
      if (timeTimer) {
        clearInterval(timeTimer)
      }
    })

    return {
      funds,
      displayedFunds,
      groups,
      showAddFundDialog,
      showAddGroupDialog,
      showFundDetailDialog,
      showStockPositionsDialog,
      showStockDetailDialog,
      selectedFund,
      selectedStock,
      stockPositions,
      newFundCode,
      newGroupName,
      addFundError,
      addGroupError,
      stockError,
      loading,
      isRefreshing,
      isLoadingStocks,
      autoRefresh,
      connectionStatus,
      currentGroup,
      currentSort,
      currentTime,
      statusText,
      formatChangeRate,
      deleteFund,
      addFund,
      refreshAllData,
      addGroup,
      switchGroup,
      applySort,
      toggleAutoRefresh,
      showFundDetail,
      refreshSingleFund,
      showFundStockPositions,
      showStockDetail,
      formatStockChangeRate,
      formatTimestamp,
      openStockXueqiu
    }
  }
}
</script>

<style scoped>
.mobile-app {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  flex-direction: column;
}

/* 状态栏 */
.status-bar {
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: white;
  font-size: 14px;
  background: rgba(255, 255, 255, 0.1);
}

.status {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  background: rgba(76, 175, 80, 0.3);
}

.status.error {
  background: rgba(244, 67, 54, 0.3);
}

/* 头部 */
.header {
  padding: 16px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.app-title {
  color: white;
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.refresh-btn, .add-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.refresh-btn:hover, .add-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* 基金列表容器 */
.fund-list-container {
  flex: 1;
  padding: 0 16px 80px 16px;
  overflow-y: auto;
}

.group-selector {
  margin: 10px 10px 10px 0;
  width: 100%;
}

.sort-selector {
  margin: 10px 0 10px 10px;
  width: 100%;
}

.group-select, .sort-select {
  width: 100%;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  color: #083055;
  font-size: 14px;
  backdrop-filter: blur(10px);
}

.group-select:focus, .sort-select:focus {
  outline: none;
  border-color: rgba(255, 255, 255, 0.6);
}

/* 基金列表 */
.fund-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.fund-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  border-left: 4px solid #ddd;
}

.fund-card.up {
  border-left-color: #f5222d;
}

.fund-card.down {
  border-left-color: #52c41a;
}

.fund-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
}

.fund-card.updating {
  opacity: 0.7;
}

.fund-info {
  flex: 1;
}

.fund-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.fund-name {
  width: 200px;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fund-code {
  font-size: 12px;
  color: #666;
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 8px;
}

.fund-data {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.current-value {
  font-size: 20px;
  font-weight: 700;
  color: #333;
}

.change-rate {
  font-size: 16px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 4px;
}

.change-rate.positive {
  color: #f5222d;
  background: rgba(245, 34, 45, 0.1);
}

.change-rate.negative {
  color: #52c41a;
  background: rgba(82, 196, 26, 0.1);
}

.fund-time {
  font-size: 12px;
  color: #999;
}

.updating-indicator {
  font-size: 12px;
  color: #1890ff;
  margin-top: 4px;
}

.fund-actions {
  margin-left: 12px;
}

.delete-btn {
  background: none;
  border: none;
  color: #999;
  font-size: 16px;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.delete-btn:hover {
  background: rgba(255, 77, 79, 0.1);
  color: #ff4d4f;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: rgba(255, 255, 255, 0.8);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 16px;
  margin-bottom: 24px;
}

.add-first-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 8px;
  color: white;
  padding: 12px 24px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.add-first-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

/* 底部导航 */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  display: flex;
  justify-content: space-around;
  padding: 12px 0;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.nav-btn {
  background: none;
  border: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: #666;
  cursor: pointer;
  transition: all 0.3s ease;
  padding: 8px 16px;
  border-radius: 8px;
}

.nav-btn:hover {
  color: #1890ff;
  background: rgba(24, 144, 255, 0.1);
}

.nav-icon {
  font-size: 20px;
}

.nav-text {
  font-size: 12px;
}

/* 模态框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.modal {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  padding: 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-body {
  padding: 20px;
}

.input-field {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 16px;
  transition: border-color 0.3s ease;
}

.input-field:focus {
  outline: none;
  border-color: #1890ff;
}

.error-message {
  color: #f5222d;
  font-size: 14px;
  margin-top: 8px;
}

.modal-footer {
  padding: 20px;
  border-top: 1px solid #eee;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #1890ff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #40a9ff;
}

.btn-secondary {
  background: #f0f0f0;
  color: #666;
}

.btn-secondary:hover {
  background: #e0e0e0;
}

/* 基金详情弹窗样式 */
.detail-modal {
  max-width: 90%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.detail-body {
  padding: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.detail-section {
  padding: 20px;
  flex: 1;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-label {
  color: #666;
  font-size: 14px;
  font-weight: 500;
}

.detail-value {
  color: #333;
  font-size: 16px;
  font-weight: 600;
}

.detail-value.value-large {
  font-size: 20px;
  font-weight: 700;
}

.detail-value.positive {
  color: #f5222d;
}

.detail-value.negative {
  color: #52c41a;
}

.detail-actions {
  padding: 20px;
  border-top: 1px solid #eee;
  display: flex;
  gap: 12px;
}

.detail-actions .btn {
  flex: 1;
  padding: 12px;
  font-size: 14px;
}

/* 加载遮罩 */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.loading-spinner {
  background: white;
  padding: 24px;
  border-radius: 12px;
  text-align: center;
  color: #333;
}

/* 持仓个股弹窗样式 */
.stock-modal {
  max-width: 95%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.stock-body {
  padding: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: auto;
}

.loading-stocks {
  padding: 40px 20px;
  text-align: center;
  color: #666;
}

.retry-btn {
  margin-top: 10px;
  padding: 8px 16px;
  font-size: 14px;
}

.stock-list {
  flex: 1;
  overflow-y: auto;
  max-height: 400px;
}

.stock-item {
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.stock-item:last-child {
  border-bottom: none;
}

.stock-item:hover {
  background: #f8f9fa;
}

.stock-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.stock-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stock-code {
  font-size: 12px;
  color: #666;
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 8px;
}

.stock-data {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.stock-price {
  font-size: 18px;
  font-weight: 700;
  color: #333;
}

.stock-change {
  font-size: 14px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 4px;
}

.stock-change.positive {
  color: #f5222d;
  background: rgba(245, 34, 45, 0.1);
}

.stock-change.negative {
  color: #52c41a;
  background: rgba(82, 196, 26, 0.1);
}

.stock-time {
  font-size: 12px;
  color: #999;
}

.empty-stocks {
  padding: 60px 20px;
  text-align: center;
  color: rgba(255, 255, 255, 0.8);
}

.empty-stocks .empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-stocks .empty-text {
  font-size: 16px;
}

/* 个股详情弹窗样式 */
.stock-detail-modal {
  max-width: 95%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.stock-detail-body {
  padding: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.stock-detail-section {
  padding: 20px;
  flex: 1;
  overflow-y: auto;
}

/* 资产配置弹窗样式 */
.asset-allocation {
  padding: 0 20px 20px 20px;
}

.asset-overview {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.asset-overview-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.asset-label {
  color: #666;
  font-size: 14px;
  font-weight: 500;
}

.asset-value {
  color: #333;
  font-size: 14px;
  font-weight: 600;
}

.asset-chart {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.chart-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: #f8f9fa;
  border-radius: 6px;
  font-size: 12px;
}

.chart-color {
  width: 12px;
  height: 12px;
  border-radius: 3px;
}

.chart-label {
  font-size: 12px;
  color: #333;
}

.chart-percent {
  font-size: 12px;
  font-weight: 600;
  color: #1890ff;
}

.asset-section {
  margin-bottom: 20px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid #f0f0f0;
}

.industry-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.industry-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid #f8f9fa;
}

.industry-name {
  font-size: 13px;
  color: #333;
}

.industry-percent {
  font-size: 13px;
  font-weight: 600;
  color: #1890ff;
}

.bond-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.bond-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid #f8f9fa;
}

.bond-name {
  font-size: 13px;
  color: #333;
}

.bond-percent {
  font-size: 13px;
  font-weight: 600;
  color: #287DFF;
}

.stock-item {
  padding: 10px 0;
  border-bottom: 1px solid #f8f9fa;
}

.stock-item:last-child {
  border-bottom: none;
}

.stock-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.stock-name {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  flex: 1;
}

.stock-code {
  font-size: 11px;
  color: #666;
  background: #f0f0f0;
  padding: 1px 4px;
  border-radius: 3px;
}

.stock-data {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stock-percent {
  font-size: 14px;
  font-weight: 700;
  color: #1890ff;
}

.stock-price {
  font-size: 12px;
  color: #666;
}

.stock-change.positive {
  color: #f5222d;
  font-size: 12px;
  font-weight: 600;
}

.stock-change.negative {
  color: #52c41a;
  font-size: 12px;
  font-weight: 600;
}

.stock-detail-section .detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.stock-detail-section .detail-item:last-child {
  border-bottom: none;
}

.stock-detail-section .detail-label {
  color: #666;
  font-size: 14px;
  font-weight: 500;
}

.stock-detail-section .detail-value {
  color: #333;
  font-size: 16px;
  font-weight: 600;
}

.stock-detail-section .detail-value.value-large {
  font-size: 20px;
  font-weight: 700;
}

.stock-detail-section .detail-value.positive {
  color: #f5222d;
}

.stock-detail-section .detail-value.negative {
  color: #52c41a;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #f0f0f0;
  border-top: 3px solid #1890ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 12px auto;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 响应式调整 */
@media (max-width: 320px) {
  .fund-list-container {
    padding: 0 12px 80px 12px;
  }
  
  .fund-card {
    padding: 12px;
  }
  
  .current-value {
    font-size: 18px;
  }
  
  .change-rate {
    font-size: 14px;
  }
}

/* 滚动条样式 */
.fund-list-container::-webkit-scrollbar {
  width: 4px;
}

.fund-list-container::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

.fund-list-container::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
}

.fund-list-container::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}
</style>