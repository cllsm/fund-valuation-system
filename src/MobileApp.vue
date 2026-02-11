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
          <button class="refresh-btn" @click="() => refreshAllData()" :disabled="isRefreshing">
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
      <!-- 控制栏 -->
      <div class="control-bar">
        <!-- 分组选择器 -->
        <div class="group-selector" v-if="groups.length > 0">
          <select v-model="currentGroup" class="group-select">
            <option value="">所有基金</option>
            <option v-for="group in groups" :key="group.id" :value="group.id">
              {{ group.name }} ({{ group.fundCount }})
            </option>
          </select>
        </div>

        <!-- 排序选择器 -->
        <div class="sort-selector">
          <select v-model="currentSort" class="sort-select">
            <option value="default">默认排序</option>
            <option value="changeRateDesc">涨跌幅 ↓</option>
            <option value="changeRateAsc">涨跌幅 ↑</option>
          </select>
        </div>
      </div>

      <!-- 基金列表 -->
      <div class="fund-list">
      <FundItem
        v-for="fund in displayedFunds"
        :key="fund.id"
          :fund="fund"
          :groups="groups"
          :show-group="true"
          :show-refresh="true"
          @click="showFundDetail(fund)"
          @delete="deleteFund(fund.id)"
          @refresh="refreshSingleFund(fund.id)"
          @change-group="handleChangeGroup(fund, $event)"
        />

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
      <button class="nav-btn" @click="handleManageGroups">
        <span class="nav-icon">📁</span>
        <span class="nav-text">分组</span>
      </button>
      <button class="nav-btn" @click="toggleAutoRefresh">
        <span class="nav-icon">{{ autoRefresh ? '⏰' : '⏸️' }}</span>
        <span class="nav-text">{{ autoRefresh ? `自动(${refreshCountdown}s)` : '暂停' }}</span>
      </button>
    </nav>

    <!-- 添加基金对话框 -->
    <BaseModal
      v-model:show="showAddFundDialog"
      title="添加基金"
      size="small"
      @close="resetAddFundForm"
    >
      <div class="modal-content">
        <input 
          v-model="newFundCode" 
          type="text" 
          placeholder="请输入6位基金代码" 
          maxlength="6"
          class="input-field"
          @keyup.enter="handleAddFund"
        >
        <div v-if="addFundError" class="error-message">{{ addFundError }}</div>
      </div>

      <template #footer>
        <button class="btn btn-secondary" @click="showAddFundDialog = false">取消</button>
        <button class="btn btn-primary" @click="handleAddFund" :disabled="!newFundCode || loading">
          {{ loading ? '添加中...' : '确定' }}
        </button>
      </template>
    </BaseModal>

    <!-- 新建分组对话框 -->
    <BaseModal
      v-model:show="showAddGroupDialog"
      title="新建分组"
      size="small"
      @close="resetAddGroupForm"
    >
      <div class="modal-content">
        <input
          v-model="newGroupName"
          type="text"
          placeholder="请输入分组名称"
          maxlength="20"
          class="input-field"
          @keyup.enter="handleAddGroup"
        >
        <div v-if="addGroupError" class="error-message">{{ addGroupError }}</div>
      </div>

      <template #footer>
        <button class="btn btn-secondary" @click="showAddGroupDialog = false">取消</button>
        <button class="btn btn-primary" @click="handleAddGroup" :disabled="!newGroupName">确定</button>
      </template>
    </BaseModal>

    <!-- 分组管理对话框 -->
    <BaseModal
      v-model:show="showManageGroupDialog"
      title="分组管理"
      size="medium"
      @close="showManageGroupDialog = false"
    >
      <div class="modal-content group-management">
        <div v-if="groups.length > 0" class="group-list">
          <div
            v-for="group in groups"
            :key="group.id"
            class="group-management-item"
            :class="{ active: group.id === currentGroup }"
          >
            <div class="group-info">
              <span class="group-name">{{ group.name }}</span>
              <span class="group-count">({{ group.fundCount }})</span>
            </div>
            <div class="group-actions">
              <button class="action-btn edit-btn" @click="handleEditGroupName(group.id)" title="重命名">
                <span class="btn-icon">✏️</span>
              </button>
              <button class="action-btn delete-btn" @click="deleteGroupById(group.id)" title="删除">
                <span class="btn-icon">🗑️</span>
              </button>
            </div>
          </div>
        </div>
        <div v-else class="empty-groups">
          <div class="empty-icon">📁</div>
          <div class="empty-text">暂无分组</div>
          <button class="add-first-btn" @click="showManageGroupDialog = false; showAddGroupDialog = true">
            创建第一个分组
          </button>
        </div>
      </div>

      <template #footer>
        <!-- 新建 -->
         <button class="btn btn-primary" @click="showManageGroupDialog = false; showAddGroupDialog = true">
           新建分组
         </button>
        <button class="btn btn-secondary" @click="showManageGroupDialog = false">关闭</button>
      </template>
    </BaseModal>

    <!-- 重命名分组对话框 -->
    <BaseModal
      v-model:show="showEditGroupDialog"
      title="重命名分组"
      size="small"
      @close="resetEditGroupForm"
    >
      <div class="modal-content">
        <input
          v-model="editGroupName"
          type="text"
          placeholder="请输入新分组名称"
          maxlength="20"
          class="input-field"
          @keyup.enter="saveGroupName"
        >
      </div>

      <template #footer>
        <button class="btn btn-secondary" @click="showEditGroupDialog = false">取消</button>
        <button class="btn btn-primary" @click="saveGroupName" :disabled="!editGroupName.trim()">保存</button>
      </template>
    </BaseModal>

    <!-- 基金详情弹窗 -->
    <FundDetailModal
      v-model:show="showFundDetailDialog"
      :fund="selectedFund"
      :is-loading-assets="isLoadingStocks"
      @refresh="refreshSingleFund(selectedFund.id)"
      @view-assets="showFundStockPositions"
      @delete="deleteFund(selectedFund.id)"
      @close="showFundDetailDialog = false"
    />

    <!-- 资产配置弹窗 -->
    <BaseModal
      v-model:show="showStockPositionsDialog"
      :title="`资产配置 - ${selectedFund?.name} (${selectedFund?.code})`"
      size="large"
    >
      <AssetAllocation
        :fund="selectedFund"
        :is-loading="isLoadingStocks"
        :error="stockError"
        @retry="loadFundAssetAllocation"
      />

      <template #footer>
        <button class="btn btn-secondary" @click="showStockPositionsDialog = false">关闭</button>
      </template>
    </BaseModal>

    <!-- 加载遮罩 -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner">
        <div class="spinner"></div>
        <div>数据加载中...</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { getFundAssetAllocation } from './services/danjuanApi'
import { useFundData } from './composables/useFundData'
import { useGroupManagement } from './composables/useGroupManagement'
import { useStorage } from './composables/useStorage'
import BaseModal from './components/BaseModal.vue'
import FundItem from './components/FundItem.vue'
import FundDetailModal from './components/FundDetailModal.vue'
import AssetAllocation from './components/AssetAllocation.vue'

// 使用组合式函数
const { 
  funds, 
  isRefreshing, 
  refreshSingleFund, 
  refreshAllData, 
  addFund, 
  deleteFund,
  changeFundGroup
} = useFundData()

const {
  groups,
  currentGroup,
  currentGroupName,
  addGroup,
  renameGroup,
  deleteGroup,
  updateGroupStats,
  getGroupFunds
} = useGroupManagement()

const { saveFundsAndGroups, loadFundsAndGroups } = useStorage()

// 响应式数据
const showAddFundDialog = ref(false)
const showAddGroupDialog = ref(false)
const showManageGroupDialog = ref(false)
const showEditGroupDialog = ref(false)
const showFundDetailDialog = ref(false)
const showStockPositionsDialog = ref(false)
const selectedFund = ref(null)
const stockPositions = ref([])
const newFundCode = ref('')
const newGroupName = ref('')
const editGroupName = ref('')
const addFundError = ref('')
const addGroupError = ref('')
const stockError = ref('')
const loading = ref(false)
const isLoadingStocks = ref(false)
const autoRefresh = ref(true)
const refreshCountdown = ref(0)
const connectionStatus = ref('ok')
const currentTime = ref('')
const currentSort = ref('default')

// 计算属性
const displayedFunds = computed(() => {
  if (!funds.value || !Array.isArray(funds.value)) {
    return []
  }
  
  let filteredFunds = getGroupFunds(funds.value, currentGroup.value)
  
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
const showFundDetail = (fund) => {
  selectedFund.value = fund
  showFundDetailDialog.value = true
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

const handleAddFund = async () => {
  if (!newFundCode.value) return
  
  const code = newFundCode.value.trim()
  
  loading.value = true
  addFundError.value = ''

  try {
    await addFund(code, currentGroup.value)
    updateGroupStats(funds.value)
    saveFundsAndGroups(funds.value, groups.value, currentGroup.value)
    
    showAddFundDialog.value = false
    newFundCode.value = ''
  } catch (error) {
    addFundError.value = error.message
  } finally {
    loading.value = false
  }
}

const handleAddGroup = () => {
  if (!newGroupName.value.trim()) {
    addGroupError.value = '请输入分组名称'
    return
  }

  try {
    addGroup(newGroupName.value.trim())
    updateGroupStats(funds.value)
    saveFundsAndGroups(funds.value, groups.value, currentGroup.value)

    showAddGroupDialog.value = false
    newGroupName.value = ''
    addGroupError.value = ''
  } catch (error) {
    addGroupError.value = error.message
  }
}

const handleManageGroups = () => {
  showManageGroupDialog.value = true
}

const handleEditGroupName = (groupId) => {
  const group = groups.value.find(g => g.id === groupId)
  if (group) {
    editGroupName.value = group.name
    showEditGroupDialog.value = true
  }
}

const saveGroupName = () => {
  if (!currentGroup.value) {
    return
  }

  try {
    renameGroup(currentGroup.value, editGroupName.value.trim())
    saveFundsAndGroups(funds.value, groups.value, currentGroup.value)
    showEditGroupDialog.value = false
    editGroupName.value = ''
  } catch (error) {
    alert(error.message)
  }
}

const deleteGroupById = (groupId) => {
  const group = groups.value.find(g => g.id === groupId)
  if (!group) return

  if (confirm(`确定要删除分组 "${group.name}" 吗？分组中的基金将移出分组。`)) {
    // 将分组中的基金移出分组
    funds.value.forEach(fund => {
      if (fund.groupId === groupId) {
        fund.groupId = ''
      }
    })

    deleteGroup(groupId)
    updateGroupStats(funds.value)
    saveFundsAndGroups(funds.value, groups.value, currentGroup.value)
  }
}

const resetEditGroupForm = () => {
  editGroupName.value = ''
}

// 监听分组变化
watch(currentGroup, () => {
  // 当分组改变时，可以执行一些逻辑
  console.log('当前分组已切换到:', currentGroup.value)
})

// 监听排序变化
watch(currentSort, () => {
  // 排序已通过计算属性自动应用
})

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
let countdownTimer = null
let timeTimer = null

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
      refreshAllData(3)
    }
  }, 60000)
}

const startTimeUpdate = () => {
  updateTime()
  timeTimer = setInterval(updateTime, 1000)
}

// 处理分组变更
const handleChangeGroup = (fund, groupId) => {
  const fundFromList = funds.value.find(f => f.id === fund.id)
  if (fundFromList) {
    fundFromList.groupId = groupId
    updateGroupStats(funds.value)
    saveFundsAndGroups(funds.value, groups.value, currentGroup.value)
  }
}

// 切换自动刷新
const toggleAutoRefresh = () => {
  autoRefresh.value = !autoRefresh.value
  
  if (autoRefresh.value && funds.value.length > 0) {
    startAutoRefresh()
  } else {
    clearInterval(refreshTimer)
    refreshTimer = null
    clearInterval(countdownTimer)
    countdownTimer = null
    refreshCountdown.value = 0
  }
}

// 监听自动刷新开关
watch(autoRefresh, (newVal) => {
  if (newVal && funds.value.length > 0) {
    startAutoRefresh()
  } else {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
})

// 加载数据
const loadFromStorage = async () => {
  const data = loadFundsAndGroups()
  
  if (data.funds && data.funds.length > 0) {
    loading.value = true
    
    funds.value = data.funds.map(fund => ({
      ...fund,
      isUpdating: false
    }))
    
    groups.value = data.groups || []
    currentGroup.value = data.currentGroup || ''
    updateGroupStats(funds.value)
    
    setTimeout(async () => {
      await refreshAllData(3) // 移动端使用较小的批次
      loading.value = false
    }, 100)
  }
}

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
</script>

<style scoped>
.mobile-app {
  min-height: 100vh;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
  display: flex;
  flex-direction: column;
}

/* 状态栏 */
.status-bar {
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #e2e8f0;
  font-size: 14px;
  background: rgba(15, 23, 42, 0.3);
}

.time {
  font-weight: 500;
}

.status {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  background: rgba(76, 175, 80, 0.2);
  color: #4ade80;
}

.status.error {
  background: rgba(244, 67, 54, 0.2);
  color: #f87171;
}

/* 头部 */
.header {
  padding: 16px;
  background: rgba(15, 23, 42, 0.2);
  backdrop-filter: blur(10px);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.app-title {
  color: #e2e8f0;
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
  background: rgba(226, 232, 240, 0.1);
  border: 1px solid rgba(226, 232, 240, 0.2);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #e2e8f0;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.refresh-btn:hover, .add-btn:hover {
  background: rgba(226, 232, 240, 0.2);
  border-color: rgba(226, 232, 240, 0.4);
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

.control-bar {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 16px;
}

.group-selector, .sort-selector {
  flex: 1;
}

.group-select, .sort-select {
  width: 100%;
  padding: 12px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  border-radius: 8px;
  background: rgba(248, 250, 252, 0.15);
  color: #e2e8f0;
  font-size: 14px;
  font-weight: 500;
  backdrop-filter: blur(10px);
  transition: all 0.2s ease;
}

.group-select:focus, .sort-select:focus {
  outline: none;
  border-color: rgba(226, 232, 240, 0.7);
  box-shadow: 0 0 0 2px rgba(226, 232, 240, 0.1);
}

/* 基金列表 */
.fund-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
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
  background: rgba(226, 232, 240, 0.1);
  border: 1px solid rgba(226, 232, 240, 0.3);
  border-radius: 8px;
  color: #e2e8f0;
  padding: 12px 24px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.add-first-btn:hover {
  background: rgba(226, 232, 240, 0.2);
  transform: scale(1.05);
}

/* 底部导航 */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(15, 23, 42, 0.9);
  backdrop-filter: blur(10px);
  display: flex;
  justify-content: space-around;
  padding: 12px 0;
  border-top: 1px solid rgba(226, 232, 240, 0.1);
}

.nav-btn {
  background: none;
  border: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.3s ease;
  padding: 8px 16px;
  border-radius: 8px;
}

.nav-btn:hover {
  color: #e2e8f0;
  background: rgba(226, 232, 240, 0.1);
}

.nav-icon {
  font-size: 20px;
}

.nav-text {
  font-size: 12px;
}

/* 模态框内容 */
.modal-content {
  padding: 0;
}

/* 模态框输入框容器优化 */
.modal-content + .modal-footer {
  padding-top: 8px;
}

@media (max-width: 768px) {
  .modal-content + .modal-footer {
    padding-top: 12px;
    gap: 12px;
  }

  .modal-content {
    margin-bottom: 8px;
  }
}

.input-field {
  width: 100%;
  padding: 16px 18px;
  border: 1.5px solid rgba(148, 163, 184, 0.4);
  border-radius: 14px;
  font-size: 17px;
  font-weight: 500;
  background: rgba(15, 23, 42, 0.4);
  color: #e2e8f0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  -webkit-appearance: none;
  -webkit-tap-highlight-color: transparent;
}

.input-field:focus {
  outline: none;
  border-color: #60a5fa;
  background: rgba(15, 23, 42, 0.6);
  box-shadow: 0 0 0 4px rgba(96, 165, 250, 0.15), 0 4px 12px rgba(96, 165, 250, 0.2);
  transform: translateY(-1px);
}

.input-field::placeholder {
  color: #94a3b8;
  font-weight: 400;
}

/* 移动端输入框优化 */
@media (max-width: 768px) {
  .input-field {
    padding: 16px 18px;
    font-size: 17px;
    border-radius: 14px;
  }

  .input-field:focus {
    box-shadow: 0 0 0 4px rgba(96, 165, 250, 0.2), 0 6px 20px rgba(96, 165, 250, 0.3);
  }
}

.error-message {
  color: #fca5a5;
  font-size: 14px;
  margin-top: 12px;
  font-weight: 500;
  padding: 12px 16px;
  background: rgba(248, 113, 113, 0.15);
  border-radius: 10px;
  border-left: 4px solid #f87171;
  box-shadow: 0 2px 8px rgba(248, 113, 113, 0.15);
}

@media (max-width: 768px) {
  .error-message {
    font-size: 15px;
    padding: 14px 18px;
    border-radius: 12px;
  }
}

/* 加载遮罩 */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.loading-spinner {
  background: rgba(30, 41, 59, 0.9);
  padding: 24px;
  border-radius: 12px;
  text-align: center;
  color: #e2e8f0;
  border: 1px solid rgba(226, 232, 240, 0.1);
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(148, 163, 184, 0.2);
  border-top: 3px solid #60a5fa;
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

  .control-bar {
    flex-direction: column;
    gap: 8px;
  }
}

/* 分组管理样式 */
.group-management {
  padding: 0;
}

.group-list {
  max-height: 400px;
  overflow-y: auto;
  padding: 8px 0;
}

.group-list::-webkit-scrollbar {
  width: 6px;
}

.group-list::-webkit-scrollbar-track {
  background: rgba(15, 23, 42, 0.2);
  border-radius: 3px;
}

.group-list::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.4);
  border-radius: 3px;
}

.group-list::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.6);
}

.group-management-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  margin-bottom: 10px;
  background: rgba(241, 245, 249, 0.15);
  border: 1px solid rgba(226, 232, 240, 0.1);
  border-radius: 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.group-management-item:hover {
  background: rgba(241, 245, 249, 0.25);
  transform: translateX(4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: rgba(96, 165, 250, 0.3);
}

.group-management-item.active {
  background: rgba(96, 165, 250, 0.15);
  border-color: rgba(96, 165, 250, 0.4);
  box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.1);
}

.group-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.group-name {
  font-size: 15px;
  font-weight: 600;
  color: #e2e8f0;
}

.group-count {
  font-size: 13px;
  color: #94a3b8;
  background: rgba(15, 23, 42, 0.6);
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 500;
}

.group-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.edit-btn {
  background: rgba(96, 165, 250, 0.15);
  border: 1px solid rgba(96, 165, 250, 0.3);
}

.edit-btn:hover {
  background: rgba(96, 165, 250, 0.25);
  transform: scale(1.1);
  box-shadow: 0 4px 8px rgba(96, 165, 250, 0.3);
}

.edit-btn:active {
  transform: scale(0.95);
}

.delete-btn {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.delete-btn:hover {
  background: rgba(239, 68, 68, 0.25);
  transform: scale(1.1);
  box-shadow: 0 4px 8px rgba(239, 68, 68, 0.3);
}

.delete-btn:active {
  transform: scale(0.95);
}

.btn-icon {
  font-size: 16px;
}

.empty-groups {
  text-align: center;
  padding: 48px 20px;
}

.empty-groups .empty-icon {
  font-size: 56px;
  margin-bottom: 20px;
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.2));
}

.empty-groups .empty-text {
  font-size: 16px;
  margin-bottom: 24px;
  color: #94a3b8;
}

.empty-groups .add-first-btn {
  background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
  color: white;
  border: none;
  padding: 14px 24px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.empty-groups .add-first-btn:active {
  transform: scale(0.98);
}

/* 移动端额外优化 */
@media (max-width: 768px) and (pointer: coarse) {
  .group-management-item {
    padding: 16px 14px;
  }

  .group-name {
    font-size: 14px;
  }

  .action-btn {
    width: 44px;
    height: 44px;
    border-radius: 12px;
  }

  .btn-icon {
    font-size: 18px;
  }

  .empty-groups .add-first-btn {
    padding: 16px 28px;
    font-size: 16px;
  }
}

/* 移动端额外优化 */
@media (max-width: 768px) and (pointer: coarse) {
  /* 触摸设备优化 */
  .btn {
    min-height: 48px;
    min-width: 48px;
  }

  .input-field {
    min-height: 52px;
  }

  .refresh-btn,
  .add-btn {
    min-width: 48px;
    min-height: 48px;
  }

  .nav-btn {
    min-height: 48px;
    padding: 12px 20px;
  }
}
</style>
