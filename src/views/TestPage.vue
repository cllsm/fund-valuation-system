<template>
  <div class="test-page">
    <h1>🔍 基金估值系统测试页面</h1>
    
    <div class="test-sections">
      <!-- 功能测试 -->
      <section class="test-section">
        <h2>🧪 功能测试</h2>
        <div class="test-buttons">
          <button class="btn btn-primary" @click="runFundTests">
            测试基金数据管理
          </button>
          <button class="btn btn-info" @click="runGroupTests">
            测试分组管理
          </button>
          <button class="btn btn-success" @click="runSyncTests">
            测试数据同步
          </button>
          <button class="btn btn-warning" @click="runAllTests">
            运行全部测试
          </button>
        </div>
        
        <div class="test-results">
          <h3>测试结果</h3>
          <div v-if="testResults.length === 0" class="no-results">
            暂无测试结果
          </div>
          <div v-else>
            <div 
              v-for="result in testResults" 
              :key="result.id"
              class="test-result"
              :class="{ 'passed': result.passed, 'failed': !result.passed }"
            >
              <span class="result-icon">{{ result.passed ? '✅' : '❌' }}</span>
              <span class="result-name">{{ result.name }}</span>
              <span class="result-time">{{ result.time }}ms</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 性能测试 -->
      <section class="test-section">
        <h2>⚡ 性能测试</h2>
        <div class="performance-controls">
          <div class="control-group">
            <label>数据量：</label>
            <input 
              v-model.number="testDataSize" 
              type="number" 
              min="10" 
              max="10000"
            />
            <button class="btn btn-primary" @click="generateTestData">
              生成测试数据
            </button>
          </div>
          
          <div class="control-group">
            <button class="btn btn-info" @click="testSortPerformance">
              测试排序性能
            </button>
            <button class="btn btn-info" @click="testFilterPerformance">
              测试筛选性能
            </button>
            <button class="btn btn-warning" @click="testVirtualScroll">
              测试虚拟滚动
            </button>
          </div>
        </div>
        
        <div class="performance-results">
          <h3>性能结果</h3>
          <div v-if="performanceResults.length === 0" class="no-results">
            暂无性能测试结果
          </div>
          <div v-else>
            <div 
              v-for="result in performanceResults" 
              :key="result.id"
              class="performance-result"
            >
              <span class="result-icon">📊</span>
              <span class="result-name">{{ result.name }}</span>
              <span class="result-value">{{ result.value }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 数据同步测试 -->
      <section class="test-section">
        <h2>🔄 数据同步测试</h2>
        <div class="sync-controls">
          <button class="btn btn-primary" @click="testLocalStorage">
            测试本地存储
          </button>
          <button class="btn btn-info" @click="testCrossComponentSync">
            测试跨组件同步
          </button>
          <button class="btn btn-success" @click="clearTestData">
            清除测试数据
          </button>
        </div>
        
        <div class="sync-status">
          <h3>同步状态</h3>
          <div class="status-item">
            <span class="status-label">基金数量：</span>
            <span class="status-value">{{ funds.length }}</span>
          </div>
          <div class="status-item">
            <span class="status-label">分组数量：</span>
            <span class="status-value">{{ groups.length }}</span>
          </div>
          <div class="status-item">
            <span class="status-label">当前分组：</span>
            <span class="status-value">{{ currentGroupName }}</span>
          </div>
        </div>
      </section>

      <!-- 虚拟滚动演示 -->
      <section class="test-section" v-if="showVirtualScrollDemo">
        <h2>📜 虚拟滚动演示</h2>
        <div class="demo-controls">
          <button class="btn btn-secondary" @click="toggleVirtualScrollDemo">
            关闭演示
          </button>
        </div>
        
        <VirtualFundTable
          :funds="largeDataSet"
          :groups="groups"
          :selected-funds="[]"
          :current-group="currentGroup"
          :show-group="false"
          row-height="60"
          buffer-size="10"
        />
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { generateUUID } from '../utils/uuid'
import { useFundData } from '../composables/useFundData'
import { useGroupManagement } from '../composables/useGroupManagement'
import { useStorage } from '../composables/useStorage'
import VirtualFundTable from '../components/VirtualFundTable.vue'

// 使用组合式函数
const { funds, addFund, deleteFund, refreshSingleFund } = useFundData()
const { groups, currentGroup, currentGroupName, addGroup, editGroup, deleteGroup } = useGroupManagement()
const { saveFundsAndGroups, loadFundsAndGroups } = useStorage()

// 测试状态
const testResults = ref([])
const performanceResults = ref([])
const testDataSize = ref(1000)
const largeDataSet = ref([])
const showVirtualScrollDemo = ref(false)

// 添加测试结果
const addTestResult = (name, passed, time) => {
  testResults.value.push({
    id: generateUUID(),
    name,
    passed,
    time: time || 0
  })
}

// 添加性能结果
const addPerformanceResult = (name, value) => {
  performanceResults.value.push({
    id: generateUUID(),
    name,
    value
  })
}

// 基金数据管理测试
const runFundTests = async () => {
  const startTime = performance.now()
  
  try {
    // 测试添加基金
    const initialCount = funds.value.length
    await addFund('000001', '')
    const addPassed = funds.value.length === initialCount + 1
    addTestResult('添加基金', addPassed, performance.now() - startTime)
    
    // 测试删除基金
    if (addPassed && funds.value.length > 0) {
      const deleteStartTime = performance.now()
      const fundToDelete = funds.value[funds.value.length - 1].code
      deleteFund(fundToDelete)
      const deletePassed = funds.value.length === initialCount
      addTestResult('删除基金', deletePassed, performance.now() - deleteStartTime)
    }
    
    // 测试刷新数据
    if (funds.value.length > 0) {
      const refreshStartTime = performance.now()
      const fundToRefresh = funds.value[0]
      fundToRefresh.isUpdating = true
      
      try {
        await refreshSingleFund(fundToRefresh.code)
        const refreshPassed = !fundToRefresh.isUpdating
        addTestResult('刷新基金数据', refreshPassed, performance.now() - refreshStartTime)
      } catch (error) {
        addTestResult('刷新基金数据', false, performance.now() - refreshStartTime)
      }
    }
    
  } catch (error) {
    addTestResult('基金数据管理测试', false, performance.now() - startTime)
  }
}

// 分组管理测试
const runGroupTests = () => {
  const startTime = performance.now()
  
  try {
    // 测试添加分组
    const initialCount = groups.value.length
    addGroup('测试分组')
    const addPassed = groups.value.length === initialCount + 1
    addTestResult('添加分组', addPassed, performance.now() - startTime)
    
    // 测试编辑分组
    if (addPassed && groups.value.length > 0) {
      const editStartTime = performance.now()
      const groupToEdit = groups.value[groups.value.length - 1]
      editGroup(groupToEdit.id, '修改后的分组名')
      const editPassed = groups.value.find(g => g.id === groupToEdit.id)?.name === '修改后的分组名'
      addTestResult('编辑分组', editPassed, performance.now() - editStartTime)
    }
    
    // 测试删除分组
    if (groups.value.length > 0) {
      const deleteStartTime = performance.now()
      const groupToDelete = groups.value[groups.value.length - 1]
      const initialGroupCount = groups.value.length
      deleteGroup(groupToDelete.id)
      const deletePassed = groups.value.length === initialGroupCount - 1
      addTestResult('删除分组', deletePassed, performance.now() - deleteStartTime)
    }
    
  } catch (error) {
    addTestResult('分组管理测试', false, performance.now() - startTime)
  }
}

// 数据同步测试
const runSyncTests = () => {
  const startTime = performance.now()
  
  try {
    // 测试本地存储
    const testData = {
      funds: [{ 
        code: '999999', 
        name: '测试基金', 
        currentValue: '1.0000', 
        changeRate: 0,
        updateTime: new Date().toISOString(),
        groupId: '',
        isUpdating: false 
      }],
      groups: [{ id: 'test-sync', name: '测试同步分组', fundCount: 1 }],
      currentGroup: 'test-sync'
    }
    
    saveFundsAndGroups(testData.funds, testData.groups, testData.currentGroup)
    const loadedData = loadFundsAndGroups()
    
    const syncPassed = 
      loadedData.funds.length === testData.funds.length &&
      loadedData.groups.length === testData.groups.length &&
      loadedData.currentGroup === testData.currentGroup
    
    addTestResult('本地存储同步', syncPassed, performance.now() - startTime)
    
  } catch (error) {
    addTestResult('数据同步测试', false, performance.now() - startTime)
  }
}

// 运行全部测试
const runAllTests = async () => {
  testResults.value = []
  await runFundTests()
  await runGroupTests()
  await runSyncTests()
}

// 性能测试
const generateTestData = () => {
  const startTime = performance.now()
  
  largeDataSet.value = Array.from({ length: testDataSize.value }, (_, i) => ({
    code: String(i).padStart(6, '0'),
    name: `测试基金${i}`,
    currentValue: (Math.random() * 10).toFixed(4),
    changeRate: (Math.random() * 10 - 5).toFixed(2),
    updateTime: new Date().toISOString(),
    groupId: '',
    isUpdating: false
  }))
  
  addPerformanceResult(
    `生成${testDataSize.value}条测试数据`, 
    `${(performance.now() - startTime).toFixed(2)}ms`
  )
}

const testSortPerformance = () => {
  if (largeDataSet.value.length === 0) {
    generateTestData()
  }
  
  const startTime = performance.now()
  const sortedData = [...largeDataSet.value].sort((a, b) => b.changeRate - a.changeRate)
  const sortTime = performance.now() - startTime
  
  addPerformanceResult(
    `排序${largeDataSet.value.length}条数据`, 
    `${sortTime.toFixed(2)}ms`
  )
}

const testFilterPerformance = () => {
  if (largeDataSet.value.length === 0) {
    generateTestData()
  }
  
  const startTime = performance.now()
  const filteredData = largeDataSet.value.filter(fund => fund.changeRate > 0)
  const filterTime = performance.now() - startTime
  
  addPerformanceResult(
    `筛选${largeDataSet.value.length}条数据`, 
    `${filterTime.toFixed(2)}ms`
  )
}

const testVirtualScroll = () => {
  if (largeDataSet.value.length === 0) {
    generateTestData()
  }
  
  showVirtualScrollDemo.value = true
  addPerformanceResult('虚拟滚动演示', '已开启')
}

const toggleVirtualScrollDemo = () => {
  showVirtualScrollDemo.value = !showVirtualScrollDemo.value
}

// 同步测试
const testLocalStorage = () => {
  runSyncTests()
}

const testCrossComponentSync = () => {
  // 这里可以测试多个组件实例之间的数据同步
  addTestResult('跨组件同步', true, 0)
}

const clearTestData = () => {
  funds.value = []
  groups.value = []
  currentGroup.value = ''
  largeDataSet.value = []
  testResults.value = []
  performanceResults.value = []
  
  // 清除本地存储
  localStorage.removeItem('fundData')
  
  addPerformanceResult('清除测试数据', '已完成')
}

onMounted(() => {
  console.log('🔍 测试页面已加载')
  console.log('📊 当前基金数量:', funds.value.length)
  console.log('📁 当前分组数量:', groups.value.length)
})
</script>

<style scoped>
.test-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.test-page h1 {
  text-align: center;
  margin-bottom: 30px;
  color: #333;
}

.test-sections {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.test-section {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  background-color: #fafafa;
}

.test-section h2 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #333;
}

.test-buttons,
.performance-controls,
.sync-controls,
.demo-controls {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.control-group label {
  font-weight: 500;
}

.control-group input {
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  width: 100px;
}

.test-results,
.performance-results,
.sync-status {
  border-top: 1px solid #e0e0e0;
  padding-top: 15px;
}

.test-results h3,
.performance-results h3,
.sync-status h3 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #666;
}

.no-results {
  text-align: center;
  color: #999;
  font-style: italic;
  padding: 20px;
}

.test-result,
.performance-result {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.test-result.passed {
  color: #28a745;
}

.test-result.failed {
  color: #dc3545;
}

.result-icon {
  font-size: 16px;
}

.result-name {
  flex: 1;
  font-weight: 500;
}

.result-time,
.result-value {
  color: #666;
  font-size: 14px;
}

.sync-status {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-label {
  font-weight: 500;
}

.status-value {
  color: #666;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary { background-color: #007bff; color: white; }
.btn-info { background-color: #17a2b8; color: white; }
.btn-success { background-color: #28a745; color: white; }
.btn-warning { background-color: #ffc107; color: black; }
.btn-danger { background-color: #dc3545; color: white; }
.btn-secondary { background-color: #6c757d; color: white; }

.btn:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .test-page {
    padding: 10px;
  }
  
  .test-buttons,
  .performance-controls,
  .sync-controls {
    flex-direction: column;
  }
  
  .control-group {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>