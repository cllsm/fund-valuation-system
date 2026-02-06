import { ref, computed } from 'vue'
import { generateUUID } from '../utils/uuid'

/**
 * 分组管理的通用逻辑
 */
export function useGroupManagement() {
  const groups = ref([])
  const currentGroup = ref('')

  // 当前分组名称
  const currentGroupName = computed(() => {
    if (!currentGroup.value) return '所有基金'
    const group = groups.value.find(g => g.id === currentGroup.value)
    return group ? group.name : '所有基金'
  })

  // 添加分组
  const addGroup = (name) => {
    if (!name.trim()) {
      throw new Error('请输入分组名称')
    }

    if (groups.value.some(group => group.name === name.trim())) {
      throw new Error('分组名称已存在')
    }

    const newGroup = {
      id: generateUUID(),
      name: name.trim(),
      fundCount: 0
    }

    groups.value.push(newGroup)
    return newGroup
  }

  // 删除分组
  const deleteGroup = (groupId) => {
    groups.value = groups.value.filter(group => group.id !== groupId)
    if (currentGroup.value === groupId) {
      currentGroup.value = ''
    }
  }

  // 重命名分组
  const renameGroup = (groupId, newName) => {
    if (!newName.trim()) {
      throw new Error('请输入分组名称')
    }

    const group = groups.value.find(g => g.id === groupId)
    if (!group) {
      throw new Error('分组不存在')
    }

    if (groups.value.some(g => g.id !== groupId && g.name === newName.trim())) {
      throw new Error('分组名称已存在')
    }

    group.name = newName.trim()
  }

  // 更新分组统计
  const updateGroupStats = (funds = []) => {
    if (!funds || !Array.isArray(funds)) {
      funds = []
    }
    groups.value.forEach(group => {
      group.fundCount = funds.filter(fund => fund.groupId === group.id).length
    })
  }

  // 切换分组
  const switchGroup = (groupId) => {
    currentGroup.value = groupId
  }

  // 获取分组中的基金
  const getGroupFunds = (funds, groupId) => {
    if (!groupId) return funds
    return funds.filter(fund => fund.groupId === groupId)
  }

  return {
    groups,
    currentGroup,
    currentGroupName,
    addGroup,
    deleteGroup,
    renameGroup,
    updateGroupStats,
    switchGroup,
    getGroupFunds
  }
}