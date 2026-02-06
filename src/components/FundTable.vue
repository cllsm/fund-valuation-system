<template>
  <div class="fund-table-container">
    <table class="fund-table">
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
      <tbody>
        <tr
          v-for="fund in funds"
          :key="fund.id"
          :class="{
            'selected': selectedFunds.includes(fund.id),
            'updating': fund.isUpdating
          }"
          @click="$emit('select', fund)"
        >
          <td class="select-col">
            <input
              type="checkbox"
              :checked="selectedFunds.includes(fund.id)"
              @click.stop="$emit('toggle-selection', fund.id)"
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
              @click.stop
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
        <tr v-if="funds.length === 0">
          <td :colspan="showGroup ? 8 : 7" class="empty-message">
            {{ currentGroup ? '该分组暂无基金数据' : '暂无基金数据，请点击"增加基金"按钮添加' }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { computed } from 'vue'

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
</script>

<style scoped>
.fund-table-container {
  width: 100%;
  overflow-x: auto;
}

.fund-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.fund-table th,
.fund-table td {
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid #e0e0e0;
}

.fund-table th {
  background-color: #f5f5f5;
  font-weight: 600;
  color: #333;
}

.fund-table tbody tr:hover {
  background-color: #f8f9fa;
}

.fund-table tbody tr.selected {
  background-color: #e3f2fd;
}

.fund-table tbody tr.updating {
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
</style>