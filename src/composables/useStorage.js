/**
 * 本地存储管理的通用逻辑
 */
export function useStorage() {
  const STORAGE_KEY = 'fundData'

  // 保存数据到本地存储
  const saveToStorage = (data) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
      console.error('保存数据到本地存储失败:', error)
    }
  }

  // 从本地存储加载数据
  const loadFromStorage = () => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY)
      if (savedData) {
        return JSON.parse(savedData)
      }
    } catch (error) {
      console.error('从本地存储加载数据失败:', error)
    }
    return null
  }

  // 保存基金和分组数据
  const saveFundsAndGroups = (funds, groups, currentGroup = '') => {
    const storageData = {
      funds: funds,
      groups: groups,
      currentGroup: currentGroup
    }
    saveToStorage(storageData)
  }

  // 加载基金和分组数据
  const loadFundsAndGroups = () => {
    const data = loadFromStorage()
    if (data) {
      return {
        funds: data.funds || [],
        groups: data.groups || [],
        currentGroup: data.currentGroup || ''
      }
    }
    return { funds: [], groups: [], currentGroup: '' }
  }

  return {
    saveToStorage,
    loadFromStorage,
    saveFundsAndGroups,
    loadFundsAndGroups
  }
}