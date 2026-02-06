<template>
  <div 
    ref="containerRef" 
    class="virtual-table-container" 
    @scroll="handleScroll"
  >
    <table class="virtual-fund-table">
      <thead>
        <tr>
          <th class="select-col">
            <input 
              type="checkbox" 
              :checked="isAllSelected"
              :indeterminate="isIndeterminate"
              @change="toggleSelectAll"
            />
          </th>
          <th class="name-col">基金名称</th>
          <th class="code-col">基金代码</th>
          <th class="value-col">估算净值</th>
          <th class="change-col">估算涨跌幅</th>
          <th class="time-col">更新时间</th>
          <th v-if="showGroup" class="group-col">分组</th>
          <th class="actions-col">操作</th>
        </tr>
      </thead>
      <tbody :style="{ height: totalHeight + 'px' }">
        <tr 
          v-for="fund in visibleFunds" 
          :key="fund.code"
          :style="{ transform: `translateY(${fund.offset}px)` }"
          :class="{ 
            'selected': selectedFunds.includes(fund.code), 
            'updating': fund.isUpdating 
          }"
          @click="$emit('select', fund)"
        >
          <td class="select-col">
            <input 
              type="checkbox" 
              :checked="selectedFunds.includes(fund.code)"
              @click.stop="$emit('toggle-selection', fund.code)"
            />
          </td>
          <td class="name-col">
            <div class="fund-name">
              <span class="name-text">{{ fund.name }}</span>
              <span v-if="fund.isUpdating" class="updating-badge">更新中</span>
            </div>
          </td>
          <td class="code-col">{{ fund.code }}</td>
          <td class="value-col value-large">{{ fund.currentValue || '--' }}</td>
          <td 
            class="change-col" 
            :class="{ 
              'positive': fund.changeRate > 0, 
              'negative': fund.changeRate < 0 
            }"
          >
            {{ formatChangeRate(fund.changeRate) }}
          </td>
          <td class="time-col">{{ fund.updateTime || '--' }}</td>
          <td v-if="showGroup" class="group-col">
            <select 
              v-model="fund.groupId" 
              @change="$emit('change-group', { fund, groupId: fund.groupId })"
              class="group-select"
            >
              <option value="">未分组</option>
              <option 
                v-for="group in groups" 
                :key="group.id" 
                :value="group.id"
              >
                {{ group.name }}
              </option>
            </select>
          </td>
          <td class="actions-col">
            <button 
              class="btn btn-sm btn-info" 
              @click.stop="$emit('view-detail', fund)"
              title="查看详情"
            >
              👁️
            </button>
            <button 
              class="btn btn-sm btn-warning" 
              @click.stop="$emit('refresh', fund)"
              :disabled="fund.isUpdating"
              title="刷新数据"
            >
              {{ fund.isUpdating ? '⏳' : '↻' }}
            </button>
            <button 
              class="btn btn-sm btn-danger" 
              @click.stop="$emit('delete', fund)"
              title="删除基金"
            >
              ×
            </button>
          </td>
        </tr>
      </tbody>
    </table>
    
    <div v-if="funds.length === 0" class="empty-message">
      {{ currentGroup ? '该分组暂无基金数据' : '暂无基金数据，请点击"增加基金"按钮添加' }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

// Props定义
const props = defineProps({
  funds: {
    type: Array,
    required: true,
    default: () => []
  },
  groups: {
    type: Array,
    default: () => []
  },
  selectedFunds: {
    type: Array,
    default: () => []
  },
  currentGroup: {
    type: String,
    default: ''
  },
  showGroup: {
    type: Boolean,
    default: true
  },
  rowHeight: {
    type: Number,
    default: 50
  },
  bufferSize: {
    type: Number,
    default: 5
  }
})

// 事件定义
const emit = defineEmits([
  'select',
  'toggle-selection',
  'change-group',
  'view-detail',
  'refresh',
  'delete'
])

// 虚拟滚动相关
const containerRef = ref(null)
const scrollTop = ref(0)
const containerHeight = ref(0)

// 计算总高度
const totalHeight = computed(() => props.funds.length * props.rowHeight)

// 计算可见区域
const visibleRange = computed(() => {
  const startIndex = Math.max(0, Math.floor(scrollTop.value / props.rowHeight) - props.bufferSize)
  const endIndex = Math.min(
    props.funds.length - 1,
    Math.ceil((scrollTop.value + containerHeight.value) / props.rowHeight) + props.bufferSize
  )
  
  return { startIndex, endIndex }
})

// 可见的基金数据
const visibleFunds = computed(() => {
  const { startIndex, endIndex } = visibleRange.value
  
  return props.funds.slice(startIndex, endIndex + 1).map((fund, index) => ({
    ...fund,
    offset: (startIndex + index) * props.rowHeight
  }))
})

// 滚动处理
const handleScroll = () => {
  if (containerRef.value) {
    scrollTop.value = containerRef.value.scrollTop
  }
}

// 计算属性
const isAllSelected = computed(() => {
  return props.funds.length > 0 && props.selectedFunds.length === props.funds.length
})

const isIndeterminate = computed(() => {
  return props.selectedFunds.length > 0 && props.selectedFunds.length < props.funds.length
})

// 方法
const toggleSelectAll = () => {
  if (isAllSelected.value) {
    emit('toggle-selection', 'all', false)
  } else {
    emit('toggle-selection', 'all', true)
  }
}

const formatChangeRate = (rate) => {
  if (rate === undefined || rate === null) return '--'
  return rate > 0 ? `+${rate}%` : `${rate}%`
}

// 监听容器高度变化
const resizeObserver = new ResizeObserver((entries) => {
  for (const entry of entries) {
    containerHeight.value = entry.contentRect.height
  }
})

onMounted(() => {
  if (containerRef.value) {
    containerHeight.value = containerRef.value.clientHeight
    resizeObserver.observe(containerRef.value)
  }
})

onUnmounted(() => {
  resizeObserver.disconnect()
})

// 监听数据变化，自动滚动到顶部
watch(() => props.funds.length, () => {
  if (containerRef.value) {
    containerRef.value.scrollTop = 0
  }
})
</script>

<style scoped>
.virtual-table-container {
  height: 600px;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}

.virtual-fund-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  position: relative;
}

.virtual-fund-table th,
.virtual-fund-table td {
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid #e0e0e0;
}

.virtual-fund-table th {
  background-color: #f5f5f5;
  font-weight: 600;
  color: #333;
  position: sticky;
  top: 0;
  z-index: 10;
}

.virtual-fund-table tbody {
  position: relative;
}

.virtual-fund-table tbody tr {
  position: absolute;
  left: 0;
  right: 0;
  height: v-bind(rowHeight + 'px');
  box-sizing: border-box;
}

.virtual-fund-table tbody tr:hover {
  background-color: #f8f9fa;
}

.virtual-fund-table tbody tr.selected {
  background-color: #e3f2fd;
}

.virtual-fund-table tbody tr.updating {
  opacity: 0.6;
}

.select-col {
  width: 40px;
  text-align: center;
}

.name-col {
  width: 200px;
}

.code-col {
  width: 100px;
}

.value-col {
  width: 120px;
}

.change-col {
  width: 120px;
}

.time-col {
  width: 150px;
}

.group-col {
  width: 150px;
}

.actions-col {
  width: 150px;
  text-align: center;
}

.value-large {
  font-size: 16px;
  font-weight: 600;
}

.positive {
  color: #f56c6c;
}

.negative {
  color: #67c23a;
}

.fund-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.name-text {
  flex: 1;
}

.updating-badge {
  background-color: #ff9800;
  color: white;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 12px;
}

.group-select {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background-color: #f8fafc;
  color: #1e293b;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s ease;
  cursor: pointer;
}

.group-select:hover {
  border-color: #94a3b8;
  background-color: #f1f5f9;
}

.group-select:focus {
  outline: none;
  border-color: #0f172a;
  box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.1);
}

.empty-message {
  text-align: center;
  color: #999;
  padding: 40px;
  font-style: italic;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.btn {
  border: none;
  padding: 4px 8px;
  border-radius: 3px;
  cursor: pointer;
  margin: 0 2px;
}

.btn-sm {
  padding: 2px 6px;
  font-size: 12px;
}

.btn-info { background-color: #17a2b8; color: white; }
.btn-warning { background-color: #ffc107; color: black; }
.btn-danger { background-color: #dc3545; color: white; }

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 滚动条样式 */
.virtual-table-container::-webkit-scrollbar {
  width: 8px;
}

.virtual-table-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.virtual-table-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.virtual-table-container::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>