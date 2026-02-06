<template>
  <div v-if="show" class="modal-overlay" @click="handleOverlayClick">
    <div class="modal" :class="modalClass" @click.stop>
      <!-- 头部 -->
      <div v-if="showHeader" class="modal-header">
        <h3>{{ title }}</h3>
        <button v-if="showClose" class="close-btn" @click="close" :title="`关闭${title}`">
          ×
        </button>
      </div>
      
      <!-- 内容区域 -->
      <div class="modal-body" :class="{ 'no-header': !showHeader }">
        <slot></slot>
      </div>
      
      <!-- 底部按钮 -->
      <div v-if="showFooter" class="modal-footer">
        <slot name="footer">
          <button class="btn btn-secondary" @click="close">
            {{ cancelText }}
          </button>
          <button 
            class="btn btn-primary" 
            @click="confirm"
            :disabled="confirmDisabled"
          >
            {{ confirmText }}
          </button>
        </slot>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'BaseModal',
  props: {
    show: {
      type: Boolean,
      required: true
    },
    title: {
      type: String,
      default: ''
    },
    showHeader: {
      type: Boolean,
      default: true
    },
    showFooter: {
      type: Boolean,
      default: true
    },
    showClose: {
      type: Boolean,
      default: true
    },
    closeOnOverlay: {
      type: Boolean,
      default: true
    },
    cancelText: {
      type: String,
      default: '取消'
    },
    confirmText: {
      type: String,
      default: '确定'
    },
    confirmDisabled: {
      type: Boolean,
      default: false
    },
    size: {
      type: String,
      default: 'medium', // small, medium, large, fullscreen
      validator: (value) => ['small', 'medium', 'large', 'fullscreen'].includes(value)
    }
  },
  emits: ['update:show', 'close', 'confirm'],
  computed: {
    modalClass() {
      return {
        'modal-small': this.size === 'small',
        'modal-medium': this.size === 'medium',
        'modal-large': this.size === 'large',
        'modal-fullscreen': this.size === 'fullscreen'
      }
    }
  },
  methods: {
    close() {
      this.$emit('update:show', false)
      this.$emit('close')
    },
    confirm() {
      this.$emit('confirm')
    },
    handleOverlayClick() {
      if (this.closeOnOverlay) {
        this.close()
      }
    }
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
  backdrop-filter: blur(8px);
}

.modal {
  background: rgba(30, 41, 59, 0.95);
  border-radius: 16px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
  animation: slideUp 0.3s ease;
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  border: 1px solid rgba(226, 232, 240, 0.1);
  backdrop-filter: blur(20px);
  overflow: hidden;
}

.modal-small {
  width: 100%;
  max-width: 400px;
}

.modal-medium {
  width: 100%;
  max-width: 600px;
}

.modal-large {
  width: 100%;
  max-width: 800px;
}

.modal-fullscreen {
  width: 95vw;
  height: 95vh;
  max-width: none;
  border-radius: 20px;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  padding: 24px 24px 20px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.4) 0%, rgba(30, 41, 59, 0.4) 100%);
}

.modal-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #e2e8f0;
  letter-spacing: 0.5px;
}

.close-btn {
  background: rgba(226, 232, 240, 0.1);
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #94a3b8;
  padding: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.close-btn:hover {
  color: #e2e8f0;
  background: rgba(226, 232, 240, 0.2);
  transform: rotate(90deg);
}

.modal-body {
  padding: 24px;
  flex: 1;
  overflow-y: auto;
  color: #cbd5e1;
}

.modal-body.no-header {
  padding-top: 24px;
}

.modal-body::-webkit-scrollbar {
  width: 8px;
}

.modal-body::-webkit-scrollbar-track {
  background: rgba(15, 23, 42, 0.2);
  border-radius: 4px;
}

.modal-body::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.4);
  border-radius: 4px;
}

.modal-body::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.6);
}

.modal-footer {
  padding: 20px 24px;
  border-top: 1px solid rgba(226, 232, 240, 0.1);
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  background: rgba(15, 23, 42, 0.2);
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  letter-spacing: 0.5px;
  -webkit-tap-highlight-color: transparent;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 触摸设备优化 */
@media (hover: none) and (pointer: coarse) {
  .btn {
    min-height: 44px;
    padding: 12px 20px;
    font-size: 15px;
  }

  .btn:active:not(:disabled) {
    transition: transform 0.1s ease;
  }
}

.btn-primary {
  background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
  color: white;
  box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);
}

.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(59, 130, 246, 0.4);
}

.btn-primary:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
}

/* 移动端触摸优化 */
@media (hover: none) and (pointer: coarse) {
  .btn-primary:active:not(:disabled) {
    transform: scale(0.98);
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  }
}

.btn-secondary {
  background: rgba(226, 232, 240, 0.1);
  color: #94a3b8;
  border: 1px solid rgba(226, 232, 240, 0.2);
}

.btn-secondary:hover:not(:disabled) {
  background: rgba(226, 232, 240, 0.2);
  color: #e2e8f0;
  transform: translateY(-1px);
}

.btn-secondary:active:not(:disabled) {
  transform: translateY(0);
}

/* 移动端触摸优化 */
@media (hover: none) and (pointer: coarse) {
  .btn-secondary:active:not(:disabled) {
    transform: scale(0.98);
    background: rgba(226, 232, 240, 0.25);
    color: #f1f5f9;
  }
}

/* 响应式调整 */
@media (max-width: 768px) {
  .modal-overlay {
    padding: 12px;
    background: rgba(15, 23, 42, 0.9);
  }

  .modal {
    max-height: 95vh;
    border-radius: 16px;
  }

  .modal-header {
    padding: 20px 20px 16px;
  }

  .modal-header h3 {
    font-size: 18px;
  }

  .modal-body {
    padding: 20px;
  }

  .modal-footer {
    padding: 16px 20px;
    flex-direction: column;
    gap: 10px;
  }

  .btn {
    flex: 1;
    padding: 14px 20px;
    border-radius: 12px;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.3px;
  }

  .btn-primary {
    background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
    order: -1;
  }

  .btn-primary:active:not(:disabled) {
    transform: scale(0.98);
  }

  .btn-secondary {
    background: rgba(226, 232, 240, 0.15);
    border: 1.5px solid rgba(226, 232, 240, 0.3);
  }

  .btn-secondary:active:not(:disabled) {
    transform: scale(0.98);
    background: rgba(226, 232, 240, 0.25);
  }
}

/* 暗黑模式适配 */
@media (prefers-color-scheme: dark) {
  .modal {
    border: 1px solid rgba(226, 232, 240, 0.15);
  }
}
</style>