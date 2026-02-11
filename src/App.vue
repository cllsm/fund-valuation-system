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
      <button class="btn btn-success" @click="() => refreshAllData()">
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
        <span class="auto-refresh-label">自动刷新 ({{ autoRefresh ? refreshCountdown + '秒' : '60秒' }})</span>
      </div>
    </div>

    <!-- 分组操作栏 -->
    <div class="group-toolbar" v-if="currentGroup && groups.length > 0">
      <span class="group-title">当前分组：{{ currentGroupName }}</span>
      <button class="btn btn-outline" @click="handleEditGroupName">
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
      <FundTable
        :funds="displayedFunds"
        :groups="groups"
        :selected-funds="selectedFunds"
        :current-group="currentGroup"
        :show-group="groups.length > 0"
        @select="showFundDetail"
        @toggle-selection="toggleFundSelection"
        @change-group="changeFundGroup"
        @view-detail="showFundDetail"
        @refresh="(fund) => refreshSingleFund(fund.id)"
        @delete="(fund) => handleSingleDelete(fund)"
      />
    </div>

    <!-- 添加基金对话框 -->
    <BaseModal
      v-model:show="showAddFundDialog"
      title="添加基金"
      size="small"
      @close="resetAddFundForm"
    >
      <div class="add-fund-form">
        <div class="form-group">
          <label>基金代码：</label>
          <input 
            v-model="newFundCode" 
            type="text" 
            placeholder="请输入6位基金代码"
            maxlength="6"
            @keyup.enter="addNewFund"
          />
        </div>
        <div class="form-group" v-if="groups.length > 0">
          <label>分组：</label>
          <select v-model="newFundGroup">
            <option value="">未分组</option>
            <option v-for="group in groups" :key="group.id" :value="group.id">
              {{ group.name }}
            </option>
          </select>
        </div>
        <div v-if="addFundError" class="error-message">
          {{ addFundError }}
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" @click="addNewFund" :disabled="!newFundCode.trim()">
            添加
          </button>
          <button class="btn btn-secondary" @click="showAddFundDialog = false">
            取消
          </button>
        </div>
      </div>
    </BaseModal>

    <!-- 添加分组对话框 -->
    <BaseModal
      v-model:show="showAddGroupDialog"
      title="新建分组"
      size="small"
      @close="resetAddGroupForm"
    >
      <div class="add-group-form">
        <div class="form-group">
          <label>分组名称：</label>
          <input 
            v-model="newGroupName" 
            type="text" 
            placeholder="请输入分组名称"
            @keyup.enter="addNewGroup"
          />
        </div>
        <div v-if="addGroupError" class="error-message">
          {{ addGroupError }}
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" @click="addNewGroup" :disabled="!newGroupName.trim()">
            创建
          </button>
          <button class="btn btn-secondary" @click="showAddGroupDialog = false">
            取消
          </button>
        </div>
      </div>
    </BaseModal>

    <!-- 重命名分组对话框 -->
    <BaseModal
      v-model:show="showEditGroupDialog"
      title="重命名分组"
      size="small"
    >
      <div class="edit-group-form">
        <div class="form-group">
          <label>新分组名称：</label>
          <input 
            v-model="editGroupName" 
            type="text" 
            placeholder="请输入新分组名称"
            @keyup.enter="saveGroupName"
          />
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" @click="saveGroupName" :disabled="!editGroupName.trim()">
            保存
          </button>
          <button class="btn btn-secondary" @click="showEditGroupDialog = false">
            取消
          </button>
        </div>
      </div>
    </BaseModal>

    <!-- 基金详情对话框 -->
    <FundDetailModal
      v-model:show="showFundDetailDialog"
      :fund="selectedFund"
      :is-loading-assets="isLoadingAssets"
      @update:show="showFundDetailDialog = $event"
      @close="closeFundDetail"
      @refresh="refreshSingleFund(selectedFund.id)"
      @view-assets="viewStockPositions"
      @delete="handleSingleDelete(selectedFund)"
    />

    <!-- 资产配置对话框 -->
    <BaseModal
      v-model:show="showStockPositionsDialog"
      title="基金资产配置"
      size="large"
      @close="closeStockPositions"
    >
      <AssetAllocation
        v-if="selectedFund && selectedFund.assetData"
        :fund="selectedFund"
        :is-loading="isLoadingAssets"
        :error="stockError"
        @retry="viewStockPositions(selectedFund)"
      />
      <div v-else-if="isLoadingAssets" class="loading-container">
        正在加载资产配置数据...
      </div>
      <div v-else class="error-container">
        无法获取资产配置数据
      </div>
    </BaseModal>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useFundData } from './composables/useFundData'
import { useGroupManagement } from './composables/useGroupManagement'
import { useStorage } from './composables/useStorage'
import { getFundAssetAllocation } from './services/danjuanApi'
import BaseModal from './components/BaseModal.vue'
import FundTable from './components/FundTable.vue'
import FundDetailModal from './components/FundDetailModal.vue'
import AssetAllocation from './components/AssetAllocation.vue'

// 使用组合式函数
const { 
  funds, 
  isRefreshing, 
  refreshAllData, 
  refreshSingleFund, 
  addFund, 
  deleteFund
} = useFundData()

const { 
  groups, 
  currentGroup, 
  currentGroupName,
  addGroup,
  editGroup,
  deleteGroup,
  updateGroupStats
} = useGroupManagement()

const { saveFundsAndGroups, loadFundsAndGroups } = useStorage()

// UI状态
const showAddFundDialog = ref(false)
const showAddGroupDialog = ref(false)
const showEditGroupDialog = ref(false)
const showFundDetailDialog = ref(false)
const showStockPositionsDialog = ref(false)

// 表单数据
const newFundCode = ref('')
const newFundGroup = ref('')
const newGroupName = ref('')
const editGroupName = ref('')

// 错误信息
const addFundError = ref('')
const addGroupError = ref('')
const stockError = ref('')

// 选中的基金
const selectedFunds = ref([])
const selectedFund = ref(null)

// 排序状态
const sortField = ref('changeRate')
const sortOrder = ref('desc')

// 自动刷新状态
const autoRefresh = ref(false)
const refreshCountdown = ref(0)

// 资产配置数据
const stockPositions = ref(null)
const isLoadingAssets = ref(false)

// 连接状态
const connectionStatus = ref('ok')
const statusText = computed(() => {
  switch (connectionStatus.value) {
    case 'ok': return '连接正常'
    case 'error': return '连接异常'
    default: return '连接中...'
  }
})

// 计算属性 - 显示基金列表
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
  if (sortField.value && sortOrder.value) {
    filteredFunds = [...filteredFunds].sort((a, b) => {
      let aVal = a[sortField.value] || 0
      let bVal = b[sortField.value] || 0
      
      if (sortOrder.value === 'desc') {
        return bVal - aVal
      } else {
        return aVal - bVal
      }
    })
  }
  
  return filteredFunds
})

// 选中状态计算属性
const isAllSelected = computed(() => {
  return displayedFunds.value.length > 0 && selectedFunds.value.length === displayedFunds.value.length
})

// 方法
const toggleSort = (field) => {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc'
  } else {
    sortField.value = field
    sortOrder.value = 'desc'
  }
}

const toggleFundSelection = (fundId, selectAll = false) => {
  if (selectAll === 'all') {
    if (isAllSelected.value) {
      selectedFunds.value = []
    } else {
      selectedFunds.value = displayedFunds.value.map(fund => fund.id)
    }
  } else {
    const index = selectedFunds.value.indexOf(fundId)
    if (index > -1) {
      selectedFunds.value.splice(index, 1)
    } else {
      selectedFunds.value.push(fundId)
    }
  }
}

const deleteSelectedFunds = () => {
  if (selectedFunds.value.length === 0) return

  const fundNames = selectedFunds.value.map(fundId => {
    const fund = funds.value.find(f => f.id === fundId)
    return fund ? `${fund.name} (${fund.code})` : fundId
  }).join('、')

  if (confirm(`确定要删除选中的基金吗？\n${fundNames}`)) {
    selectedFunds.value.forEach(fundId => {
      deleteFund(fundId)
    })
    selectedFunds.value = []
    saveToStorage()
  }
}

const addNewFund = async () => {
  try {
    addFundError.value = ''
    const code = newFundCode.value.trim()
    
    if (!code) {
      addFundError.value = '请输入基金代码'
      return
    }
    
    if (!/^\d{6}$/.test(code)) {
      addFundError.value = '请输入6位数字的基金代码'
      return
    }
    
    const newFund = await addFund(code, newFundGroup.value)
    updateGroupStats()
    saveToStorage()
    
    showAddFundDialog.value = false
    resetAddFundForm()
    
    setTimeout(() => {
      refreshSingleFund(newFund.id)
    }, 500)
    
  } catch (error) {
    addFundError.value = error.message
  }
}

const addNewGroup = () => {
  try {
    addGroupError.value = ''
    addGroup(newGroupName.value.trim())
    updateGroupStats()
    saveToStorage()
    
    showAddGroupDialog.value = false
    resetAddGroupForm()
    
  } catch (error) {
    addGroupError.value = error.message
  }
}

const handleEditGroupName = () => {
  const currentGroupObj = groups.value.find(g => g.id === currentGroup.value)
  if (currentGroupObj) {
    editGroupName.value = currentGroupObj.name
    showEditGroupDialog.value = true
  }
}

const saveGroupName = () => {
  try {
    editGroup(editGroupName.value.trim())
    updateGroupStats()
    saveToStorage()
    showEditGroupDialog.value = false
  } catch (error) {
    alert(error.message)
  }
}

const deleteCurrentGroup = () => {
  const currentGroupObj = groups.value.find(g => g.id === currentGroup.value)
  if (!currentGroupObj) return
  
  if (confirm(`确定要删除分组 "${currentGroupObj.name}" 吗？分组中的基金将移出分组。`)) {
    // 将分组中的基金移出分组
    funds.value.forEach(fund => {
      if (fund.groupId === currentGroup.value) {
        fund.groupId = ''
      }
    })
    
    deleteGroup(currentGroup.value)
    updateGroupStats()
    saveToStorage()
    
    currentGroup.value = ''
  }
}

const changeFundGroup = ({ fund, groupId }) => {
  const fundFromList = funds.value.find(f => f.id === fund.id)
  if (fundFromList) {
    fundFromList.groupId = groupId
    updateGroupStats()
    saveToStorage()
  }
}

const handleSingleDelete = (fund) => {
  if (confirm(`确定要删除基金 "${fund.name}" (${fund.code}) 吗？`)) {
    deleteFund(fund.id)
    updateGroupStats()
    saveToStorage()
    
    // 如果删除的是当前选中的基金，关闭详情弹窗
    if (selectedFund.value && selectedFund.value.id === fund.id) {
      showFundDetailDialog.value = false
      selectedFund.value = null
    }
  }
}

const showFundDetail = (fund) => {
  selectedFund.value = fund
  showFundDetailDialog.value = true
}

const closeFundDetail = () => {
  selectedFund.value = null
  showFundDetailDialog.value = false
}

const viewStockPositions = async (fund) => {
  try {
    selectedFund.value = fund
    isLoadingAssets.value = true
    stockError.value = ''
    stockPositions.value = null
    
    showStockPositionsDialog.value = true
    
    // 调用获取资产配置数据的API
    const assetData = await getFundAssetAllocation(fund.code)
    
    if (assetData) {
      // 更新基金的assetData
      selectedFund.value.assetData = assetData
      // stockPositions会在AssetAllocation组件中从fund.assetData.stock_list获取
    } else {
      throw new Error('无法获取资产配置数据')
    }
    
  } catch (error) {
    stockError.value = error.message
    console.error('获取持仓数据失败:', error)
  } finally {
    isLoadingAssets.value = false
  }
}

const closeStockPositions = () => {
  // 不要清空selectedFund，因为详情弹窗可能还在使用
  stockPositions.value = null
  stockError.value = ''
  showStockPositionsDialog.value = false
}

const switchGroup = () => {
  selectedFunds.value = []
}

const resetAddFundForm = () => {
  newFundCode.value = ''
  newFundGroup.value = ''
  addFundError.value = ''
}

const resetAddGroupForm = () => {
  newGroupName.value = ''
  addGroupError.value = ''
}

const saveToStorage = () => {
  saveFundsAndGroups(funds.value, groups.value, currentGroup.value)
}

// 自动刷新定时器
let refreshTimer = null
let countdownTimer = null

const startAutoRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
  if (countdownTimer) {
    clearInterval(countdownTimer)
  }
  
  // 启动倒计时
  refreshCountdown.value = 60
  countdownTimer = setInterval(() => {
    if (refreshCountdown.value > 0) {
      refreshCountdown.value--
    } else {
      refreshCountdown.value = 60
    }
  }, 1000)
  
  // 启动刷新定时器
  refreshTimer = setInterval(() => {
    if (autoRefresh.value && funds.value.length > 0) {
      refreshAllData()
    }
  }, 60000)
}

// 监听自动刷新开关
watch(autoRefresh, (newVal) => {
  if (newVal && funds.value.length > 0) {
    startAutoRefresh()
  } else {
    if (refreshTimer) {
      clearInterval(refreshTimer)
      refreshTimer = null
    }
    if (countdownTimer) {
      clearInterval(countdownTimer)
      countdownTimer = null
      refreshCountdown.value = 0
    }
  }
})

// 生命周期
onMounted(() => {
  // 加载本地存储的数据
  const data = loadFundsAndGroups()

  if (data.funds && data.funds.length > 0) {
    funds.value = data.funds.map(fund => ({
      ...fund,
      isUpdating: false
    }))

    groups.value = data.groups || []
    currentGroup.value = data.currentGroup || ''
    updateGroupStats()

    // 延迟刷新数据
    setTimeout(() => {
      refreshAllData()
    }, 100)
  }

  // 启动自动刷新
  startAutoRefresh()
})

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
  if (countdownTimer) {
    clearInterval(countdownTimer)
  }
})
</script>

<style scoped>
.app {
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  height: 100vh;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-radius: 12px 12px 0 0;
  margin: -20px -20px 20px -20px;
}

.title {
  font-size: 28px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.status-bar {
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
}

.status-ok {
  background-color: #d4edda;
  color: #155724;
}

.status-error {
  background-color: #f8d7da;
  color: #721c24;
}

.toolbar {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.group-selector {
  margin-left: auto;
}

.group-select {
  padding: 6px 12px;
  border: 1px solid #334155;
  border-radius: 6px;
  background-color: #f8fafc;
  color: #1e293b;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.group-select:focus {
  outline: none;
  border-color: #0f172a;
  box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.1);
}

.auto-refresh {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 20px;
}

.switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 20px;
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
  border-radius: 20px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: #2196F3;
}

input:checked + .slider:before {
  transform: translateX(20px);
}

.auto-refresh-label {
  font-size: 14px;
  color: #666;
}

.group-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
  padding: 10px;
  background-color: #f8f9fa;
  border-radius: 4px;
}

.group-title {
  font-weight: 600;
  color: #333;
}

.table-container {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.table-container.loading {
  opacity: 0.7;
}

.add-fund-form,
.add-group-form,
.edit-group-form {
  padding: 20px 0;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #e2e8f0;
  font-size: 14px;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 8px;
  box-sizing: border-box;
  background: rgba(15, 23, 42, 0.2);
  color: #e2e8f0;
  font-size: 15px;
  transition: all 0.3s ease;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #60a5fa;
  box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.1);
}

.form-group input::placeholder,
.form-group select option:first-child {
  color: #94a3b8;
}

.error-message {
  color: #f87171;
  font-size: 13px;
  margin-bottom: 15px;
  font-weight: 500;
  padding: 8px 12px;
  background: rgba(248, 113, 113, 0.1);
  border-radius: 6px;
  border-left: 3px solid #f87171;
}

.form-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #0056b3;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #545b62;
}

.btn-info {
  background-color: #17a2b8;
  color: white;
}

.btn-danger {
  background-color: #dc3545;
  color: white;
}

.btn-success {
  background-color: #28a745;
  color: white;
}

.btn-outline {
  background-color: transparent;
  border: 1px solid #ddd;
  color: #333;
}

.btn-outline:hover:not(:disabled) {
  background-color: #f8f9fa;
}

.btn-active {
  background-color: #007bff;
  color: white;
  border-color: #007bff;
}

.btn-icon {
  font-size: 16px;
}

.loading-container,
.error-container {
  padding: 40px;
  text-align: center;
  color: #666;
}

.error-container {
  color: #dc3545;
}
</style>