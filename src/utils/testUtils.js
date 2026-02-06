/**
 * 功能测试工具
 */

/**
 * 模拟基金数据用于测试
 */
export const mockFundData = {
  '000001': {
    code: '000001',
    name: '华夏成长混合',
    currentValue: '1.2345',
    changeRate: 0.56,
    updateTime: '2024-01-15 15:00:00',
    groupId: '',
    isUpdating: false
  },
  '000002': {
    code: '000002',
    name: '易方达中小盘',
    currentValue: '2.3456',
    changeRate: -0.34,
    updateTime: '2024-01-15 15:00:00',
    groupId: '',
    isUpdating: false
  },
  '000003': {
    code: '000003',
    name: '嘉实增长混合',
    currentValue: '3.4567',
    changeRate: 1.23,
    updateTime: '2024-01-15 15:00:00',
    groupId: '',
    isUpdating: false
  }
}

/**
 * 测试基金数据管理功能
 */
export function testFundDataManagement() {
  const tests = []
  
  // 测试1: 添加基金
  tests.push({
    name: '添加基金功能',
    test: () => {
      const { addFund, funds } = useFundData()
      const initialCount = funds.value.length
      
      // 模拟添加基金
      const mockFund = mockFundData['000001']
      addFund(mockFund.code, mockFund.groupId)
      
      return funds.value.length === initialCount + 1
    }
  })
  
  // 测试2: 删除基金
  tests.push({
    name: '删除基金功能',
    test: () => {
      const { deleteFund, funds } = useFundData()
      const initialCount = funds.value.length
      
      if (initialCount === 0) return false
      
      const fundToDelete = funds.value[0].code
      deleteFund(fundToDelete)
      
      return funds.value.length === initialCount - 1
    }
  })
  
  // 测试3: 刷新数据
  tests.push({
    name: '刷新基金数据功能',
    test: async () => {
      const { refreshSingleFund, funds } = useFundData()
      
      if (funds.value.length === 0) return false
      
      const fundToRefresh = funds.value[0]
      fundToRefresh.isUpdating = true
      
      try {
        await refreshSingleFund(fundToRefresh.code)
        return !fundToRefresh.isUpdating
      } catch (error) {
        return false
      }
    }
  })
  
  return tests
}

/**
 * 测试分组管理功能
 */
export function testGroupManagement() {
  const tests = []
  
  // 测试1: 添加分组
  tests.push({
    name: '添加分组功能',
    test: () => {
      const { addGroup, groups } = useGroupManagement()
      const initialCount = groups.value.length
      
      addGroup('测试分组')
      
      return groups.value.length === initialCount + 1
    }
  })
  
  // 测试2: 编辑分组
  tests.push({
    name: '编辑分组功能',
    test: () => {
      const { editGroup, groups } = useGroupManagement()
      
      if (groups.value.length === 0) return false
      
      const groupToEdit = groups.value[0]
      const newName = '修改后的分组名'
      
      editGroup(groupToEdit.id, newName)
      
      return groups.value.find(g => g.id === groupToEdit.id)?.name === newName
    }
  })
  
  // 测试3: 删除分组
  tests.push({
    name: '删除分组功能',
    test: () => {
      const { deleteGroup, groups } = useGroupManagement()
      
      if (groups.value.length === 0) return false
      
      const initialCount = groups.value.length
      const groupToDelete = groups.value[0]
      
      deleteGroup(groupToDelete.id)
      
      return groups.value.length === initialCount - 1
    }
  })
  
  return tests
}

/**
 * 测试数据同步功能
 */
export function testDataSync() {
  const tests = []
  
  // 测试1: 本地存储同步
  tests.push({
    name: '本地存储数据同步',
    test: () => {
      const { saveFundsAndGroups, loadFundsAndGroups } = useStorage()
      const { funds, groups, currentGroup } = useFundData()
      
      // 保存测试数据
      const testData = {
        funds: [mockFundData['000001']],
        groups: [{ id: 'test-group', name: '测试分组', fundCount: 1 }],
        currentGroup: 'test-group'
      }
      
      saveFundsAndGroups(testData.funds, testData.groups, testData.currentGroup)
      
      // 加载数据
      const loadedData = loadFundsAndGroups()
      
      return (
        loadedData.funds.length === testData.funds.length &&
        loadedData.groups.length === testData.groups.length &&
        loadedData.currentGroup === testData.currentGroup
      )
    }
  })
  
  // 测试2: 跨组件数据同步
  tests.push({
    name: '跨组件数据同步',
    test: () => {
      // 模拟两个组件使用相同的数据源
      const { funds: funds1 } = useFundData()
      const { funds: funds2 } = useFundData()
      
      // 在一个组件中添加数据
      const initialCount = funds1.value.length
      funds1.value.push(mockFundData['000002'])
      
      // 检查另一个组件是否同步
      return funds2.value.length === initialCount + 1
    }
  })
  
  return tests
}

/**
 * 运行所有测试
 */
export async function runAllTests() {
  console.group('🔍 基金估值系统功能测试')
  
  const allTests = [
    ...testFundDataManagement(),
    ...testGroupManagement(),
    ...testDataSync()
  ]
  
  let passed = 0
  let failed = 0
  
  for (const test of allTests) {
    try {
      const result = await test.test()
      if (result) {
        console.log(`✅ ${test.name} - 通过`)
        passed++
      } else {
        console.log(`❌ ${test.name} - 失败`)
        failed++
      }
    } catch (error) {
      console.log(`❌ ${test.name} - 错误: ${error.message}`)
      failed++
    }
  }
  
  console.groupEnd()
  console.log(`\n📊 测试结果: ${passed} 通过, ${failed} 失败, 总计 ${allTests.length} 个测试`)
  
  return { passed, failed, total: allTests.length }
}

/**
 * 性能测试工具
 */
export function performanceTest() {
  const { funds } = useFundData()
  
  // 生成大量测试数据
  const largeDataSet = Array.from({ length: 1000 }, (_, i) => ({
    code: String(i).padStart(6, '0'),
    name: `测试基金${i}`,
    currentValue: (Math.random() * 10).toFixed(4),
    changeRate: (Math.random() * 10 - 5).toFixed(2),
    updateTime: new Date().toISOString(),
    groupId: '',
    isUpdating: false
  }))
  
  // 测试排序性能
  const startTime = performance.now()
  const sortedData = [...largeDataSet].sort((a, b) => b.changeRate - a.changeRate)
  const sortTime = performance.now() - startTime
  
  // 测试筛选性能
  const filterStartTime = performance.now()
  const filteredData = largeDataSet.filter(fund => fund.changeRate > 0)
  const filterTime = performance.now() - filterStartTime
  
  console.log(`📊 性能测试结果:`)
  console.log(`- 排序1000条数据耗时: ${sortTime.toFixed(2)}ms`)
  console.log(`- 筛选1000条数据耗时: ${filterTime.toFixed(2)}ms`)
  
  return { sortTime, filterTime }
}