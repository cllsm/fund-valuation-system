<template>
  <div class="app">
    <!-- 头部标题 -->
    <header class="header">
      <h1 class="title">基金实时估值查询</h1>
      <div class="status-bar" :class="{ 'status-ok': connectionStatus === 'ok', 'status-error': connectionStatus === 'error' }">
        {{ statusText }}
      </div>
    </header>

    <!-- 功能按钮区域 -->
    <div class="toolbar">
      <button class="btn btn-primary" @click="showAddFundDialog = true">
        <span class="btn-icon">+</span>
        增加基金
      </button>
      <button class="btn btn-info" @click="showAddGroupDialog = true">
        <span class="btn-icon">📁</span>
        新建分组
      </button>
      <button class="btn btn-danger" @click="deleteSelectedFunds" :disabled="selectedFunds.length === 0">
        <span class="btn-icon">×</span>
        删除选中
      </button>
      <button class="btn btn-success" @click="refreshAllData">
        <span class="btn-icon">↻</span>
        刷新最新数据
      </button>
      
      <!-- 排序按钮 -->
      <div class="sort-controls">
        <button 
          class="btn btn-outline" 
          @click="toggleSort('changeRate')"
          :class="{ 'btn-active': sortField === 'changeRate' }"
        >
          <span class="btn-icon">{{ sortField === 'changeRate' ? (sortOrder === 'desc' ? '↓' : '↑') : '↕' }}</span>
          涨跌幅排序
        </button>
      </div>
      
      <!-- 分组选择器 -->
      <div class="group-selector" v-if="groups.length > 0">
        <select v-model="currentGroup" @change="switchGroup" class="group-select">
          <option value="">所有基金</option>
          <option v-for="group in groups" :key="group.id" :value="group.id">
            {{ group.name }} ({{ group.fundCount }})
          </option>
        </select>
      </div>
      
      <!-- 自动刷新开关 -->
      <div class="auto-refresh">
        <label class="switch">
          <input type="checkbox" v-model="autoRefresh">
          <span class="slider"></span>
        </label>
        <span class="auto-refresh-label">自动刷新 (60秒)</span>
      </div>
    </div>

    <!-- 分组操作栏 -->
    <div class="group-toolbar" v-if="currentGroup && groups.length > 0">
      <span class="group-title">当前分组：{{ currentGroupName }}</span>
      <button class="btn btn-outline" @click="editGroupName">
        <span class="btn-icon">✏️</span>
        重命名
      </button>
      <button class="btn btn-outline" @click="deleteCurrentGroup">
        <span class="btn-icon">🗑️</span>
        删除分组
      </button>
    </div>

    <!-- 基金数据表格 -->
    <div class="table-container" :class="{ 'loading': isRefreshing }">
      <table class="fund-table">
        <thead>
          <tr>
            <th class="select-col">
              <input 
                type="checkbox" 
                :indeterminate="isIndeterminate" 
                :checked="isAllSelected" 
                @change="toggleSelectAll"
              >
            </th>
            <th class="code-col">基金代码</th>
            <th class="name-col">基金名称</th>
            <th class="value-col">估算净值</th>
            <th class="change-col" @click="toggleSort('changeRate')" :class="{ 'sortable': true, 'sorted': sortField === 'changeRate', 'sort-desc': sortField === 'changeRate' && sortOrder === 'desc' }">
              估算涨跌幅
              <span v-if="sortField === 'changeRate'" class="sort-indicator">
                {{ sortOrder === 'desc' ? '↓' : '↑' }}
              </span>
            </th>
            <th class="time-col">更新时间</th>
            <th class="group-col" v-if="groups.length > 0">分组</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="fund in displayedFunds" :key="fund.code" :class="{ 'selected': selectedFunds.includes(fund.code), 'updating': fund.isUpdating }" @click="showFundDetail(fund)">
            <td class="select-col">
              <input 
                type="checkbox" 
                :checked="selectedFunds.includes(fund.code)" 
                @change="toggleFundSelection(fund.code)"
              >
            </td>
            <td class="code-col">{{ fund.code }}</td>
            <td class="name-col">{{ fund.name }}</td>
            <td class="value-col">
              <span class="value-display">{{ fund.currentValue || '--' }}</span>
              <span v-if="fund.isUpdating" class="updating-indicator">🔄</span>
            </td>
            <td class="change-col" :class="getChangeClass(fund.changeRate)">
              {{ formatChangeRate(fund.changeRate) }}
            </td>
            <td class="time-col">{{ fund.updateTime || '--' }}</td>
            <td class="group-col" v-if="groups.length > 0">
              <select v-model="fund.groupId" @change="updateFundGroup(fund)" class="group-assign">
                <option value="">未分组</option>
                <option v-for="group in groups" :key="group.id" :value="group.id">
                  {{ group.name }}
                </option>
              </select>
            </td>
          </tr>
          <tr v-if="displayedFunds.length === 0">
            <td :colspan="groups.length > 0 ? 7 : 6" class="empty-message">
              {{ currentGroup ? '该分组暂无基金数据' : '暂无基金数据，请点击"增加基金"按钮添加' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

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

    <!-- 重命名分组对话框 -->
    <div v-if="showRenameGroupDialog" class="modal-overlay" @click="showRenameGroupDialog = false">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>重命名分组</h3>
          <button class="close-btn" @click="showRenameGroupDialog = false">×</button>
        </div>
        <div class="modal-body">
          <input 
            v-model="renameGroupName" 
            type="text" 
            placeholder="请输入新的分组名称" 
            maxlength="20"
            class="input-field"
            @keyup.enter="renameGroup"
          >
          <div v-if="renameGroupError" class="error-message">{{ renameGroupError }}</div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showRenameGroupDialog = false">取消</button>
          <button class="btn btn-primary" @click="renameGroup" :disabled="!renameGroupName">确定</button>
        </div>
      </div>
    </div>

    <!-- 加载遮罩 -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner">数据加载中...</div>
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
            <div class="detail-item" v-if="selectedFund.groupId">
              <span class="detail-label">分组</span>
              <span class="detail-value">{{ getGroupName(selectedFund.groupId) }}</span>
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
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { getFundAssetAllocation } from './services/danjuanApi'

export default {
  name: 'App',
  setup() {
    // 响应式数据
    const funds = ref([])
    const groups = ref([])
    const selectedFunds = ref([])
    const showAddFundDialog = ref(false)
    const showAddGroupDialog = ref(false)
    const showRenameGroupDialog = ref(false)
    const showFundDetailDialog = ref(false)
    const showStockPositionsDialog = ref(false)
    const showStockDetailDialog = ref(false)
    const selectedFund = ref(null)
    const selectedStock = ref(null)
    const stockPositions = ref([])
    const newFundCode = ref('')
    const newGroupName = ref('')
    const renameGroupName = ref('')
    const addFundError = ref('')
    const addGroupError = ref('')
    const renameGroupError = ref('')
    const stockError = ref('')
    const loading = ref(false)
    const isRefreshing = ref(false)
    const isLoadingStocks = ref(false)
    const autoRefresh = ref(true)
    const connectionStatus = ref('ok')
    const currentGroup = ref('')
    const editingGroupId = ref('')
    const sortField = ref('')
    const sortOrder = ref('desc') // desc: 降序, asc: 升序

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
      
      // 排序
      if (sortField.value) {
        filteredFunds = [...filteredFunds].sort((a, b) => {
          const aValue = a[sortField.value] || 0
          const bValue = b[sortField.value] || 0
          
          if (sortField.value === 'changeRate') {
            // 处理涨跌幅排序，null/undefined值排在最后
            if (aValue === undefined || aValue === null) return 1
            if (bValue === undefined || bValue === null) return -1
            
            if (sortOrder.value === 'desc') {
              return bValue - aValue // 降序：涨幅大的在前
            } else {
              return aValue - bValue // 升序：跌幅大的在前
            }
          }
          
          // 默认排序
          if (sortOrder.value === 'desc') {
            return bValue > aValue ? 1 : -1
          } else {
            return aValue > bValue ? 1 : -1
          }
        })
      }
      
      return filteredFunds
    })

    const isAllSelected = computed(() => {
      return displayedFunds.value.length > 0 && selectedFunds.value.length === displayedFunds.value.length
    })

    const isIndeterminate = computed(() => {
      return selectedFunds.value.length > 0 && selectedFunds.value.length < displayedFunds.value.length
    })

    const statusText = computed(() => {
      return connectionStatus.value === 'ok' ? '连接正常' : '连接异常'
    })

    const currentGroupName = computed(() => {
      if (!currentGroup.value) return ''
      const group = groups.value.find(g => g.id === currentGroup.value)
      return group ? group.name : ''
    })

    // 方法
    const formatChangeRate = (rate) => {
      if (rate === undefined || rate === null) return '--'
      return rate > 0 ? `+${rate}%` : `${rate}%`
    }

    const getChangeClass = (rate) => {
      if (rate === undefined || rate === null) return ''
      return rate > 0 ? 'positive' : rate < 0 ? 'negative' : ''
    }

    const toggleSelectAll = () => {
      if (isAllSelected.value) {
        selectedFunds.value = []
      } else {
        selectedFunds.value = displayedFunds.value.map(fund => fund.code)
      }
    }

    const toggleFundSelection = (code) => {
      const index = selectedFunds.value.indexOf(code)
      if (index > -1) {
        selectedFunds.value.splice(index, 1)
      } else {
        selectedFunds.value.push(code)
      }
    }

    const deleteSelectedFunds = () => {
      if (selectedFunds.value.length === 0) return
      
      funds.value = funds.value.filter(fund => !selectedFunds.value.includes(fund.code))
      selectedFunds.value = []
      saveToStorage()
      
      // 更新分组统计
      updateGroupStats()
    }

    // 分组相关方法
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

    const editGroupName = () => {
      if (!currentGroup.value) return
      const group = groups.value.find(g => g.id === currentGroup.value)
      if (group) {
        renameGroupName.value = group.name
        editingGroupId.value = group.id
        showRenameGroupDialog.value = true
      }
    }

    const renameGroup = () => {
      if (!renameGroupName.value.trim()) {
        renameGroupError.value = '请输入分组名称'
        return
      }

      const groupName = renameGroupName.value.trim()
      if (groups.value.some(group => group.name === groupName && group.id !== editingGroupId.value)) {
        renameGroupError.value = '分组名称已存在'
        return
      }

      const groupIndex = groups.value.findIndex(g => g.id === editingGroupId.value)
      if (groupIndex > -1) {
        groups.value[groupIndex].name = groupName
        saveToStorage()
        showRenameGroupDialog.value = false
        renameGroupName.value = ''
        renameGroupError.value = ''
      }
    }

    const deleteCurrentGroup = () => {
      if (!currentGroup.value) return
      
      // 将分组中的基金移出分组
      funds.value.forEach(fund => {
        if (fund.groupId === currentGroup.value) {
          fund.groupId = ''
        }
      })

      // 删除分组
      groups.value = groups.value.filter(g => g.id !== currentGroup.value)
      currentGroup.value = ''
      saveToStorage()
    }

    const switchGroup = () => {
      selectedFunds.value = []
    }

    const updateFundGroup = (fund) => {
      saveToStorage()
      
      // 更新分组统计
      updateGroupStats()
    }

    // 排序方法
    const toggleSort = (field) => {
      if (sortField.value === field) {
        // 切换排序顺序
        sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc'
      } else {
        // 设置新的排序字段，默认降序
        sortField.value = field
        sortOrder.value = 'desc'
      }
    }

    const updateGroupStats = () => {
      groups.value.forEach(group => {
        group.fundCount = funds.value.filter(fund => fund.groupId === group.id).length
      })
    }

    // 持仓相关方法
    const showFundDetail = (fund) => {
      // 创建基金数据的深拷贝，避免自动刷新影响详情弹窗
      selectedFund.value = {
        code: fund.code,
        name: fund.name,
        currentValue: fund.currentValue,
        changeRate: fund.changeRate,
        updateTime: fund.updateTime,
        groupId: fund.groupId,
        assetData: fund.assetData
      }
      showFundDetailDialog.value = true
    }

    const refreshSingleFund = async (fund) => {
      if (!fund) return

      // 在原始数据中找到对应的基金对象并标记更新状态
      const originalFund = funds.value.find(f => f.code === fund.code)
      if (originalFund) {
        originalFund.isUpdating = true
      }

      try {
        const fundData = await fetchFundData(fund.code)
        if (fundData) {
          // 更新详情弹窗中的副本数据
          fund.name = fundData.name
          fund.currentValue = fundData.gsz
          fund.changeRate = parseFloat(fundData.gszzl)
          fund.updateTime = fundData.gztime

          // 同步更新原始数据
          if (originalFund) {
            originalFund.name = fundData.name
            originalFund.currentValue = fundData.gsz
            originalFund.changeRate = parseFloat(fundData.gszzl)
            originalFund.updateTime = fundData.gztime
            originalFund.isUpdating = false

            // 同时更新MobileApp.vue中的数据（如果存在）
            syncFundDataToMobile(originalFund)
            saveToStorage()
          }
        }
      } catch (error) {
        console.error(`刷新基金 ${fund.code} 数据失败:`, error)
      } finally {
        if (originalFund) {
          originalFund.isUpdating = false
        }
      }
    }

    const deleteFund = (code) => {
      funds.value = funds.value.filter(fund => fund.code !== code)
      saveToStorage()
      updateGroupStats()
    }

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

    const getGroupName = (groupId) => {
      const group = groups.value.find(g => g.id === groupId)
      return group ? group.name : '未分组'
    }

    // 同步基金数据到MobileApp.vue
    const syncFundDataToMobile = (fund) => {
      // 先确保数据保存到localStorage
      saveToStorage()
      
      // 触发自定义事件通知MobileApp.vue更新数据
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

    const addFund = async () => {
      if (!newFundCode.value) return
      
      const code = newFundCode.value.trim()
      if (!/^\d{6}$/.test(code)) {
        addFundError.value = '请输入6位数字的基金代码'
        return
      }

      // 检查是否已存在
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
          
          // 更新分组统计
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
        // 根据当前分组筛选需要刷新的基金
        const fundsToRefresh = currentGroup.value 
          ? funds.value.filter(fund => fund.groupId === currentGroup.value)
          : funds.value
        
        if (fundsToRefresh.length === 0) {
          isRefreshing.value = false
          return
        }

        // 标记需要刷新的基金为更新中状态
        fundsToRefresh.forEach(fund => {
          fund.isUpdating = true
        })

        // 分批刷新，避免屏闪
        const batchSize = 5
        const promises = []
        
        for (let i = 0; i < fundsToRefresh.length; i += batchSize) {
                const batch = fundsToRefresh.slice(i, i + batchSize)
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

                          // 同步数据到MobileApp
                          syncFundDataToMobile(targetFund)
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
          
          // 批次间延迟，避免同时大量请求
          if (i + batchSize < fundsToRefresh.length) {
            await new Promise(resolve => setTimeout(resolve, 300))
          }
        }

        await Promise.allSettled(promises)
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
        
        // 保存原有的jsonpgz函数
        const originalJsonpgz = window.jsonpgz
        
        // 重写全局jsonpgz函数
        window.jsonpgz = (data) => {
          // 恢复原有函数
          window.jsonpgz = originalJsonpgz
          if (script.parentNode) {
            document.body.removeChild(script)
          }
          
          // 检查返回数据
          if (data && typeof data === 'object' && data.fundcode) {
            resolve(data)
          } else {
            reject(new Error('返回数据格式错误'))
          }
        }

        script.src = url
        script.onerror = () => {
          // 恢复原有函数
          window.jsonpgz = originalJsonpgz
          if (script.parentNode) {
            document.body.removeChild(script)
          }
          reject(new Error('JSONP请求失败'))
        }

        document.body.appendChild(script)
        
        // 设置超时
        setTimeout(() => {
          if (window.jsonpgz !== originalJsonpgz) {
            // 恢复原有函数
            window.jsonpgz = originalJsonpgz
            if (script.parentNode) {
              document.body.removeChild(script)
            }
            reject(new Error('请求超时'))
          }
        }, 10000)
      })
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
          
          // 恢复基础数据
          funds.value = data.funds.map(fund => ({
            ...fund,
            isUpdating: false
          }))
          
          groups.value = data.groups || []
          currentGroup.value = data.currentGroup || ''
          
          // 更新分组统计
          updateGroupStats()
          
          // 异步加载最新数据
          setTimeout(async () => {
            await refreshAllData()
            loading.value = false
          }, 100)
        }
      }
    }

    // 自动刷新定时器
    let refreshTimer = null

    const startAutoRefresh = () => {
      if (refreshTimer) {
        clearInterval(refreshTimer)
      }
      refreshTimer = setInterval(() => {
        if (autoRefresh.value && funds.value.length > 0) {
          refreshAllData()
        }
      }, 60000) // 60秒刷新一次
    }

    // 监听自动刷新开关
    watch(autoRefresh, (newVal) => {
      if (newVal && funds.value.length > 0) {
        startAutoRefresh()
      } else {
        clearInterval(refreshTimer)
      }
    })

    // 监听MobileApp的数据更新事件
    const handleFundDataUpdated = (event) => {
      const updatedFund = event.detail
      const existingFund = funds.value.find(fund => fund.code === updatedFund.code)
      
      if (existingFund) {
        // 更新现有基金数据
        existingFund.name = updatedFund.name
        existingFund.currentValue = updatedFund.currentValue
        existingFund.changeRate = updatedFund.changeRate
        existingFund.updateTime = updatedFund.updateTime
        
        // 保存到存储
        saveToStorage()
      }
    }

    // 生命周期
    onMounted(() => {
      loadFromStorage()
      startAutoRefresh()
      
      // 添加事件监听器
      window.addEventListener('fundDataUpdated', handleFundDataUpdated)
    })

    onUnmounted(() => {
      if (refreshTimer) {
        clearInterval(refreshTimer)
      }
      
      // 移除事件监听器
      window.removeEventListener('fundDataUpdated', handleFundDataUpdated)
    })

    return {
      funds,
      displayedFunds,
      groups,
      selectedFunds,
      showAddFundDialog,
      showAddGroupDialog,
      showRenameGroupDialog,
      showFundDetailDialog,
      showStockPositionsDialog,
      showStockDetailDialog,
      selectedFund,
      selectedStock,
      stockPositions,
      newFundCode,
      newGroupName,
      renameGroupName,
      addFundError,
      addGroupError,
      renameGroupError,
      stockError,
      loading,
      isRefreshing,
      isLoadingStocks,
      autoRefresh,
      connectionStatus,
      currentGroup,
      currentGroupName,
      isAllSelected,
      isIndeterminate,
      statusText,
      sortField,
      sortOrder,
      formatChangeRate,
      getChangeClass,
      toggleSelectAll,
      toggleFundSelection,
      deleteSelectedFunds,
      addFund,
      refreshAllData,
      addGroup,
      editGroupName,
      renameGroup,
      deleteCurrentGroup,
      switchGroup,
      updateFundGroup,
      toggleSort,
      showFundDetail,
      refreshSingleFund,
      deleteFund,
      showFundStockPositions,
      showStockDetail,
      openStockXueqiu,
      formatStockChangeRate,
      formatTimestamp,
      getGroupName
    }
  }
}
</script>

<style scoped>
.app {
  max-width: 1200px;
  margin: 0 auto;
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  min-height: 80vh;
  overflow: hidden;
}

/* 头部样式 */
.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  font-size: 24px;
  font-weight: 600;
  margin: 0;
}

.status-bar {
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  background: rgba(255, 255, 255, 0.2);
}

.status-ok {
  background: rgba(76, 175, 80, 0.3);
}

.status-error {
  background: rgba(244, 67, 54, 0.3);
}

/* 工具栏样式 */
.toolbar {
  padding: 20px 30px;
  display: flex;
  gap: 15px;
  align-items: center;
  flex-wrap: wrap;
  border-bottom: 1px solid #eee;
  background: #f8f9fa;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
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
  transform: translateY(-1px);
}

.btn-danger {
  background: #ff4d4f;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #ff7875;
  transform: translateY(-1px);
}

.btn-success {
  background: #52c41a;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background: #73d13d;
  transform: translateY(-1px);
}

.btn-secondary {
  background: #f0f0f0;
  color: #666;
}

.btn-info {
  background: #17a2b8;
  color: white;
}

.btn-info:hover:not(:disabled) {
  background: #138496;
  transform: translateY(-1px);
}

.btn-outline {
  background: transparent;
  border: 1px solid #d9d9d9;
  color: #666;
}

.btn-outline:hover:not(:disabled) {
  background: #f5f5f5;
  border-color: #40a9ff;
  color: #40a9ff;
}

.btn-icon {
  font-size: 16px;
  font-weight: bold;
}

/* 分组选择器 */
.group-selector {
  margin-left: 20px;
}

.group-select {
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: white;
  font-size: 14px;
  min-width: 150px;
}

.group-select:focus {
  outline: none;
  border-color: #40a9ff;
}

/* 排序控制 */
.sort-controls {
  margin-left: 10px;
}

.btn-active {
  background: #40a9ff !important;
  color: white !important;
  border-color: #40a9ff !important;
}

/* 分组操作栏 */
.group-toolbar {
  padding: 15px 30px;
  background: #f8f9fa;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: center;
  gap: 15px;
}

.group-title {
  font-weight: 600;
  color: #333;
  font-size: 16px;
}

/* 自动刷新开关 */
.auto-refresh {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}

.switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .4s;
  border-radius: 24px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: #52c41a;
}

input:checked + .slider:before {
  transform: translateX(26px);
}

.auto-refresh-label {
  font-size: 14px;
  color: #666;
  white-space: nowrap;
}

/* 表格容器 */
.table-container {
  overflow-x: auto;
  max-height: 500px;
}

.fund-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 800px;
}

.fund-table th,
.fund-table td {
  padding: 16px 12px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.fund-table th {
  background: #fafafa;
  font-weight: 600;
  color: #333;
  position: sticky;
  top: 0;
  z-index: 1;
}

.fund-table th.sortable {
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.fund-table th.sortable:hover {
  background: #f0f0f0;
}

.fund-table th.sorted {
  background: #e6f7ff;
}

.sort-indicator {
  margin-left: 4px;
  font-weight: bold;
  font-size: 12px;
}

.fund-table tbody tr:hover {
  background: #f8f9fa;
}

.fund-table tbody tr.selected {
  background: #e6f7ff;
}

.select-col {
  width: 60px;
  text-align: center;
}

.code-col {
  width: 120px;
}

.name-col {
  min-width: 200px;
}

.value-col, .change-col, .time-col {
  width: 150px;
}

.group-col {
  width: 120px;
}

.value-display {
  display: inline-block;
  transition: all 0.3s ease;
}

.updating-indicator {
  margin-left: 5px;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { opacity: 0.3; }
  50% { opacity: 1; }
  100% { opacity: 0.3; }
}

.fund-table tbody tr.updating {
  background: #f0f9ff;
}

.group-assign {
  width: 100%;
  padding: 4px 8px;
  border: 1px solid #d9d9d9;
  border-radius: 3px;
  font-size: 12px;
  background: white;
}

.group-assign:focus {
  outline: none;
  border-color: #40a9ff;
}

.change-col.positive {
  color: #f5222d;
  font-weight: 600;
}

.change-col.negative {
  color: #52c41a;
  font-weight: 600;
}

.empty-message {
  text-align: center;
  color: #999;
  padding: 40px;
  font-size: 16px;
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
}

.modal {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
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
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
}

.modal-body {
  padding: 20px;
}

.input-field {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
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
  gap: 10px;
  justify-content: flex-end;
}

/* 加载遮罩 */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.loading-spinner {
  background: #333;
  color: white;
  padding: 20px 30px;
  border-radius: 8px;
  font-size: 16px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .app {
    margin: 10px;
    border-radius: 8px;
  }

  .header {
    padding: 15px 20px;
    flex-direction: column;
    gap: 10px;
    text-align: center;
  }

  .title {
    font-size: 20px;
  }

  .toolbar {
    padding: 15px 20px;
    flex-direction: column;
    align-items: stretch;
  }

  .btn {
    justify-content: center;
  }

  .auto-refresh {
    margin-left: 0;
    justify-content: center;
  }

  .fund-table {
    font-size: 14px;
  }

  .fund-table th,
  .fund-table td {
    padding: 12px 8px;
  }

  .select-col {
    width: 50px;
  }

  .code-col {
    width: 100px;
  }

  .name-col {
    min-width: 150px;
  }
}

@media (max-width: 480px) {
  .header {
    padding: 12px 15px;
  }

  .title {
    font-size: 18px;
  }

  .toolbar {
    padding: 12px 15px;
  }

  .fund-table {
    font-size: 12px;
  }

  .fund-table th,
  .fund-table td {
    padding: 8px 6px;
  }
}

/* 基金详情弹窗样式 */
.detail-modal {
  max-width: 500px;
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

/* 持仓个股弹窗样式 */
.stock-modal {
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
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
  /* max-height: 400px; */
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
  color: #666;
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
  max-width: 500px;
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
  padding: 20px;
}

.asset-overview {
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid #f0f0f0;
}

.asset-overview-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.asset-label {
  color: #666;
  font-size: 14px;
  font-weight: 500;
}

.asset-value {
  color: #333;
  font-size: 16px;
  font-weight: 600;
}

.asset-chart {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 16px;
}

.chart-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 6px;
}

.chart-color {
  width: 16px;
  height: 16px;
  border-radius: 4px;
}

.chart-label {
  font-size: 14px;
  color: #333;
}

.chart-percent {
  font-size: 14px;
  font-weight: 600;
  color: #1890ff;
}

.asset-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.industry-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.industry-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f8f9fa;
}

.industry-name {
  font-size: 14px;
  color: #333;
}

.industry-percent {
  font-size: 14px;
  font-weight: 600;
  color: #1890ff;
}

.bond-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bond-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f8f9fa;
}

.bond-name {
  font-size: 14px;
  color: #333;
}

.bond-percent {
  font-size: 14px;
  font-weight: 600;
  color: #287DFF;
}

.stock-item {
  padding: 12px 0;
  border-bottom: 1px solid #f8f9fa;
}

.stock-item:last-child {
  border-bottom: none;
}

.stock-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.stock-name {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  flex: 1;
}

.stock-code {
  font-size: 12px;
  color: #666;
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 4px;
}

.stock-data {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stock-percent {
  font-size: 16px;
  font-weight: 700;
  color: #1890ff;
}

.stock-price {
  font-size: 14px;
  color: #666;
}

.stock-change.positive {
  color: #f5222d;
  font-size: 14px;
  font-weight: 600;
}

.stock-change.negative {
  color: #52c41a;
  font-size: 14px;
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
</style>