<template>
  <BaseModal
    :show="show"
    :title="fund ? `基金详情 - ${fund.name} (${fund.code})` : '基金详情'"
    size="medium"
    @update:show="$emit('update:show', $event)"
    @close="$emit('close')"
  >
    <!-- 基金基本信息 -->
    <div v-if="fund" class="fund-detail-section">
      <div class="detail-item">
        <span class="detail-label">基金名称</span>
        <span class="detail-value">{{ fund.name || '--' }}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">基金代码</span>
        <span class="detail-value">{{ fund.code || '--' }}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">估算净值</span>
        <span class="detail-value value-large">{{ fund.currentValue || '--' }}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">估算涨跌幅</span>
        <span class="detail-value" :class="{ 'positive': fund.changeRate > 0, 'negative': fund.changeRate < 0 }">
          {{ formatChangeRate(fund.changeRate) }}
        </span>
      </div>
      <div class="detail-item">
        <span class="detail-label">更新时间</span>
        <span class="detail-value">{{ fund.updateTime || '--' }}</span>
      </div>
    </div>
    
    <!-- 空状态 -->
    <div v-else class="empty-state">
      <div class="empty-icon">📊</div>
      <div class="empty-text">基金数据加载中...</div>
    </div>

    <!-- 操作按钮 -->
    <template #footer>
      <button class="btn btn-primary" @click="$emit('refresh', fund)">
        刷新数据
      </button>
      <button class="btn btn-info" @click="$emit('view-assets', fund)" :disabled="isLoadingAssets">
        {{ isLoadingAssets ? '加载中...' : '查看持仓' }}
      </button>
      <button class="btn btn-danger" @click="handleDelete">
        删除基金
      </button>
      <button class="btn btn-secondary" @click="$emit('update:show', false)">
        关闭
      </button>
    </template>
  </BaseModal>
</template>

<script>
import BaseModal from './BaseModal.vue'

export default {
  name: 'FundDetailModal',
  components: {
    BaseModal
  },
  props: {
    show: {
      type: Boolean,
      required: true
    },
    fund: {
      type: Object,
      required: true
    },
    isLoadingAssets: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:show', 'close', 'refresh', 'view-assets', 'delete'],
  methods: {
    formatChangeRate(rate) {
      if (rate === undefined || rate === null) return '--'
      return rate > 0 ? `+${rate}%` : `${rate}%`
    },
    handleDelete() {
      const fundName = this.fund ? `${this.fund.name || '未知基金'} (${this.fund.code || '未知代码'})` : '该基金'
      if (confirm(`确定要删除基金 ${fundName} 吗？`)) {
        this.$emit('delete', this.fund)
        this.$emit('update:show', false)
      }
    }
  }
}
</script>

<style scoped>
.fund-detail-section {
  padding: 0;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 0;
  border-bottom: 1px solid rgba(226, 232, 240, 0.15);
  transition: all 0.3s ease;
}

.detail-item:hover {
  background: rgba(241, 245, 249, 0.5);
  margin: 0 -10px;
  padding: 14px 10px;
  border-radius: 8px;
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-label {
  color: #94a3b8;
  font-size: 14px;
  font-weight: 500;
}

.detail-value {
  color: #e2e8f0;
  font-size: 16px;
  font-weight: 600;
}

.detail-value.value-large {
  font-size: 24px;
  font-weight: 700;
  background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.detail-value.positive {
  color: #fca5a5;
  background: linear-gradient(135deg, #fca5a5 0%, #f87171 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.detail-value.negative {
  color: #86efac;
  background: linear-gradient(135deg, #86efac 0%, #4ade80 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.modal-footer {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  padding-top: 8px;
}

.btn {
  flex: 1;
  min-width: 100px;
  padding: 12px 20px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.3px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  -webkit-tap-highlight-color: transparent;
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.btn-primary {
  background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  order: -1;
}

.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
}

.btn-primary:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.btn-info {
  background: linear-gradient(135deg, #2dd4bf 0%, #0ea5e9 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3);
}

.btn-info:hover:not(:disabled) {
  background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(14, 165, 233, 0.4);
}

.btn-info:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(14, 165, 233, 0.3);
}

.btn-danger {
  background: linear-gradient(135deg, #fb7185 0%, #ef4444 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.btn-danger:hover:not(:disabled) {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4);
}

.btn-danger:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
}

.btn-secondary {
  background: rgba(226, 232, 240, 0.15);
  color: #94a3b8;
  border: 1.5px solid rgba(226, 232, 240, 0.3);
}

.btn-secondary:hover:not(:disabled) {
  background: rgba(226, 232, 240, 0.25);
  color: #e2e8f0;
  border-color: rgba(226, 232, 240, 0.4);
  transform: translateY(-1px);
}

.btn-secondary:active:not(:disabled) {
  transform: translateY(0);
  background: rgba(226, 232, 240, 0.2);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 移动端优化 */
@media (max-width: 768px) {
  .modal-footer {
    flex-direction: column;
    gap: 10px;
  }

  .btn {
    min-width: auto;
    padding: 14px 20px;
    font-size: 15px;
    border-radius: 12px;
  }

  .detail-item {
    padding: 16px 0;
  }

  .detail-value.value-large {
    font-size: 22px;
  }
}

/* 触摸设备优化 */
@media (hover: none) and (pointer: coarse) {
  .btn {
    min-height: 48px;
  }

  .btn-primary:active:not(:disabled),
  .btn-info:active:not(:disabled),
  .btn-danger:active:not(:disabled),
  .btn-secondary:active:not(:disabled) {
    transform: scale(0.98);
  }
}
</style>