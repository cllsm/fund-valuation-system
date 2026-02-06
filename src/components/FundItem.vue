<template>
  <div 
    class="fund-item"
    :class="{
      'up': fund.changeRate > 0, 
      'down': fund.changeRate < 0,
      'updating': fund.isUpdating,
      'selected': isSelected
    }"
    @click="$emit('click', fund)"
  >
    <!-- 选择框（桌面端） -->
    <div v-if="showCheckbox" class="fund-select">
      <input 
        type="checkbox" 
        :checked="isSelected"
        @click.stop="$emit('select', fund)"
      >
    </div>

    <!-- 基金信息 -->
    <div class="fund-info">
      <div class="fund-header">
        <div class="fund-name" :title="fund.name">{{ fund.name }}</div>
        <div class="fund-code">{{ fund.code }}</div>
      </div>
      <div class="fund-data">
        <div class="current-value">{{ fund.currentValue || '--' }}</div>
        <div class="change-rate" :class="{ 'positive': fund.changeRate > 0, 'negative': fund.changeRate < 0 }">
          {{ formatChangeRate(fund.changeRate) }}
        </div>
      </div>
      <div class="fund-time">{{ fund.updateTime || '--' }}</div>
      
      <!-- 分组设置 -->
      <div v-if="showGroup && groups.length > 0" class="fund-group-section">
        <select 
          :value="fund.groupId || ''" 
          @click.stop
          @change="$emit('change-group', $event.target.value)"
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
      </div>
      
      <div v-if="fund.isUpdating" class="updating-indicator">更新中...</div>
    </div>

    <!-- 操作按钮 -->
    <div class="fund-actions">
      <button 
        v-if="showDelete" 
        class="action-btn delete-btn" 
        @click.stop="$emit('delete', fund)"
        :title="`删除${fund.name}`"
      >
        <span class="icon">🗑️</span>
      </button>
      <button 
        v-if="showRefresh" 
        class="action-btn refresh-btn" 
        @click.stop="$emit('refresh', fund)"
        :title="`刷新${fund.name}数据`"
      >
        <span class="icon">🔄</span>
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'FundItem',
  props: {
    fund: {
      type: Object,
      required: true
    },
    isSelected: {
      type: Boolean,
      default: false
    },
    groups: {
      type: Array,
      default: () => []
    },
    showCheckbox: {
      type: Boolean,
      default: false
    },
    showDelete: {
      type: Boolean,
      default: true
    },
    showRefresh: {
      type: Boolean,
      default: false
    },
    showGroup: {
      type: Boolean,
      default: false
    }
  },
  emits: ['click', 'select', 'delete', 'refresh', 'change-group'],
  methods: {
    formatChangeRate(rate) {
      if (rate === undefined || rate === null) return '--'
      return rate > 0 ? `+${rate}%` : `${rate}%`
    },
    getGroupName(groupId) {
      const group = this.groups.find(g => g.id === groupId)
      return group ? group.name : ''
    }
  }
}
</script>

<style scoped>
.fund-item {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  border-left: 4px solid #ddd;
  cursor: pointer;
  margin-bottom: 12px;
}

.fund-item.up {
  border-left-color: #f5222d;
}

.fund-item.down {
  border-left-color: #52c41a;
}

.fund-item.updating {
  opacity: 0.7;
}

.fund-item.selected {
  background: rgba(24, 144, 255, 0.1);
}

.fund-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
}

.fund-select {
  margin-right: 12px;
}

.fund-select input {
  width: 16px;
  height: 16px;
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

.fund-group-section {
  margin-top: 8px;
}

.group-select {
  width: 100%;
  padding: 4px 8px;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  background: white;
  color: #333;
  font-size: 12px;
  cursor: pointer;
}

.group-select:focus {
  outline: none;
  border-color: #60a5fa;
}

.fund-group {
  font-size: 12px;
  color: #666;
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 4px;
  margin-top: 4px;
  display: inline-block;
}

.updating-indicator {
  font-size: 12px;
  color: #1890ff;
  margin-top: 4px;
}

.fund-actions {
  margin-left: 12px;
  display: flex;
  gap: 8px;
}

.action-btn {
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

.refresh-btn:hover {
  background: rgba(24, 144, 255, 0.1);
  color: #1890ff;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .fund-item {
    padding: 12px;
  }
  
  .current-value {
    font-size: 18px;
  }
  
  .change-rate {
    font-size: 14px;
  }
}
</style>