<template>
  <div class="asset-allocation">
    <!-- 加载状态 -->
    <div v-if="isLoading" class="loading-stocks">
      <div class="loading-spinner">
        <div class="spinner"></div>
        <div>正在加载资产配置数据...</div>
      </div>
    </div>
    
    <!-- 错误状态 -->
    <div v-else-if="error" class="error-message">
      {{ error }}
      <button class="btn btn-primary retry-btn" @click="$emit('retry')">
        重试
      </button>
    </div>
    
    <!-- 资产配置信息 -->
    <div v-else-if="fund?.assetData" class="asset-content">
      <!-- 资产配置概览 -->
      <div class="asset-overview">
        <div class="asset-overview-item">
          <span class="asset-label">数据来源</span>
          <span class="asset-value">{{ fund.assetData.source_mark || fund.assetData.source }}</span>
        </div>
        <div class="asset-chart">
          <div v-for="item in fund.assetData.chart_list" :key="item.type" class="chart-item">
            <div class="chart-color" :style="{ backgroundColor: item.color }"></div>
            <span class="chart-label">{{ item.type_desc }}</span>
            <span class="chart-percent">{{ item.percent }}%</span>
          </div>
        </div>
      </div>
      
      <!-- 行业配置 -->
      <div v-if="fund.assetData.industry_list && fund.assetData.industry_list.length > 0" class="asset-section">
        <h4 class="section-title">行业配置</h4>
        <div class="industry-list">
          <div v-for="industry in fund.assetData.industry_list" :key="industry.industry_code" class="industry-item">
            <span class="industry-name">{{ industry.industry_name }}</span>
            <span class="industry-percent">{{ industry.percent }}%</span>
          </div>
        </div>
      </div>
      
      <!-- 股票持仓 -->
      <div v-if="stockPositions.length > 0" class="asset-section">
        <h4 class="section-title">股票持仓 (前{{ stockPositions.length }}名)</h4>
        <div class="stock-list">
          <div class="stock-item" v-for="stock in stockPositions" :key="stock.code" @click="$emit('stock-click', stock)">
            <div class="stock-header">
              <div class="stock-name">{{ stock.name }}</div>
              <div class="stock-code">{{ stock.code }}</div>
            </div>
            <div class="stock-data">
              <div class="stock-percent">{{ stock.percent }}%</div>
              <div class="stock-price">{{ stock.current_price || '--' }}</div>
              <div class="stock-change" :class="{ 'positive': stock.change_percentage > 0, 'negative': stock.change_percentage < 0 }">
                {{ stock.change_percentage > 0 ? '+' : '' }}{{ stock.change_percentage || '--' }}%
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 债券持仓 -->
      <div v-if="fund.assetData.bond_list && fund.assetData.bond_list.length > 0" class="asset-section">
        <h4 class="section-title">债券持仓</h4>
        <div class="bond-list">
          <div v-for="bond in fund.assetData.bond_list" :key="bond.code" class="bond-item">
            <span class="bond-name">{{ bond.name }}</span>
            <span class="bond-percent">{{ bond.percent }}%</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 空状态 -->
    <div v-else class="empty-stocks">
      <div class="empty-icon">📊</div>
      <div class="empty-text">暂无资产配置数据</div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AssetAllocation',
  props: {
    fund: {
      type: Object,
      default: null
    },
    isLoading: {
      type: Boolean,
      default: false
    },
    error: {
      type: String,
      default: ''
    }
  },
  emits: ['retry', 'stock-click'],
  computed: {
    stockPositions() {
      return this.fund?.assetData?.stock_list || []
    }
  }
}
</script>

<style scoped>
.asset-allocation {
  padding: 0;
}

.loading-stocks {
  padding: 48px 20px;
  text-align: center;
  color: #94a3b8;
}

.retry-btn {
  margin-top: 16px;
  padding: 12px 24px;
  font-size: 15px;
  font-weight: 600;
  border-radius: 10px;
  background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
  color: white;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.retry-btn:hover {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
}

.retry-btn:active {
  transform: translateY(0);
}

.asset-content {
  padding: 0;
}

.asset-overview {
  margin-bottom: 24px;
  padding: 20px;
  background: rgba(241, 245, 249, 0.3);
  border-radius: 14px;
  border: 1px solid rgba(226, 232, 240, 0.2);
}

.asset-overview-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding: 8px 12px;
  background: rgba(15, 23, 42, 0.4);
  border-radius: 8px;
}

.asset-label {
  color: #94a3b8;
  font-size: 14px;
  font-weight: 500;
}

.asset-value {
  color: #e2e8f0;
  font-size: 14px;
  font-weight: 600;
}

.asset-chart {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}

.chart-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: rgba(15, 23, 42, 0.6);
  border-radius: 10px;
  font-size: 13px;
  border: 1px solid rgba(226, 232, 240, 0.1);
  transition: all 0.3s ease;
}

.chart-item:hover {
  background: rgba(15, 23, 42, 0.8);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.chart-color {
  width: 14px;
  height: 14px;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.chart-label {
  font-size: 13px;
  color: #e2e8f0;
  font-weight: 500;
}

.chart-percent {
  font-size: 13px;
  font-weight: 700;
  color: #60a5fa;
  background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.asset-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 17px;
  font-weight: 700;
  color: #e2e8f0;
  margin-bottom: 16px;
  padding-bottom: 10px;
  border-bottom: 2px solid rgba(226, 232, 240, 0.2);
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title::before {
  content: '';
  display: block;
  width: 4px;
  height: 20px;
  background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
  border-radius: 2px;
}

.industry-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.industry-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(241, 245, 249, 0.2);
  border-radius: 10px;
  border: 1px solid rgba(226, 232, 240, 0.1);
  transition: all 0.3s ease;
}

.industry-item:hover {
  background: rgba(241, 245, 249, 0.4);
  transform: translateX(4px);
  border-color: rgba(96, 165, 250, 0.3);
}

.industry-name {
  font-size: 14px;
  color: #e2e8f0;
  font-weight: 500;
}

.industry-percent {
  font-size: 15px;
  font-weight: 700;
  color: #60a5fa;
  background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.bond-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bond-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(241, 245, 249, 0.2);
  border-radius: 10px;
  border: 1px solid rgba(226, 232, 240, 0.1);
  transition: all 0.3s ease;
}

.bond-item:hover {
  background: rgba(241, 245, 249, 0.4);
  transform: translateX(4px);
  border-color: rgba(96, 165, 250, 0.3);
}

.bond-name {
  font-size: 14px;
  color: #e2e8f0;
  font-weight: 500;
}

.bond-percent {
  font-size: 15px;
  font-weight: 700;
  color: #2dd4bf;
  background: linear-gradient(135deg, #2dd4bf 0%, #0ea5e9 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stock-list {
  max-height: 450px;
  overflow-y: auto;
  padding-right: 4px;
}

.stock-list::-webkit-scrollbar {
  width: 6px;
}

.stock-list::-webkit-scrollbar-track {
  background: rgba(15, 23, 42, 0.2);
  border-radius: 3px;
}

.stock-list::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.4);
  border-radius: 3px;
}

.stock-list::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.6);
}

.stock-item {
  padding: 16px;
  margin-bottom: 10px;
  background: rgba(241, 245, 249, 0.15);
  border: 1px solid rgba(226, 232, 240, 0.1);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.stock-item:hover {
  background: rgba(241, 245, 249, 0.3);
  transform: translateY(-2px) scale(1.01);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
  border-color: rgba(96, 165, 250, 0.3);
}

.stock-item:active {
  transform: translateY(-1px) scale(1);
}

.stock-item:last-child {
  margin-bottom: 0;
}

.stock-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.stock-name {
  font-size: 15px;
  font-weight: 700;
  color: #e2e8f0;
  flex: 1;
}

.stock-code {
  font-size: 12px;
  color: #94a3b8;
  background: rgba(15, 23, 42, 0.6);
  padding: 4px 8px;
  border-radius: 6px;
  font-weight: 600;
  font-family: 'Courier New', monospace;
}

.stock-data {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 8px;
  border-top: 1px solid rgba(226, 232, 240, 0.1);
}

.stock-percent {
  font-size: 16px;
  font-weight: 800;
  color: #60a5fa;
  background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stock-price {
  font-size: 14px;
  color: #94a3b8;
  font-weight: 600;
}

.stock-change {
  font-size: 14px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 6px;
}

.stock-change.positive {
  color: #fca5a5;
  background: rgba(248, 113, 113, 0.15);
}

.stock-change.negative {
  color: #86efac;
  background: rgba(74, 222, 128, 0.15);
}

.empty-stocks {
  padding: 80px 20px;
  text-align: center;
  color: #94a3b8;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.2));
}

.empty-text {
  font-size: 17px;
  font-weight: 500;
  color: #cbd5e1;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(148, 163, 184, 0.2);
  border-top: 4px solid #60a5fa;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px auto;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-message {
  color: #fca5a5;
  text-align: center;
  padding: 48px 20px;
  background: rgba(248, 113, 113, 0.1);
  border-radius: 12px;
  border: 1px solid rgba(248, 113, 113, 0.2);
  font-size: 15px;
  font-weight: 500;
}

/* 移动端优化 */
@media (max-width: 768px) {
  .asset-overview {
    padding: 16px;
    border-radius: 12px;
  }

  .section-title {
    font-size: 16px;
  }

  .stock-item {
    padding: 14px;
    border-radius: 10px;
  }

  .stock-name {
    font-size: 14px;
  }

  .stock-percent {
    font-size: 15px;
  }

  .chart-item {
    padding: 8px 12px;
    font-size: 12px;
  }

  .industry-item,
  .bond-item {
    padding: 10px 14px;
  }

  .empty-icon {
    font-size: 56px;
  }

  .retry-btn {
    padding: 14px 28px;
    font-size: 16px;
  }
}

/* 触摸设备优化 */
@media (hover: none) and (pointer: coarse) {
  .stock-item:active {
    transform: scale(0.98);
    background: rgba(241, 245, 249, 0.4);
  }

  .retry-btn:active {
    transform: scale(0.98);
  }
}
</style>