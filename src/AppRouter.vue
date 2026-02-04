<template>
  <router-view />
</template>

<script>
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

export default {
  name: 'AppRouter',
  setup() {
    const router = useRouter()

    // 监听窗口大小变化，自动切换路由
    const handleResize = () => {
      const screenWidth = window.innerWidth
      const isMobile = screenWidth <= 768
      
      // 调试信息
      console.log('屏幕宽度:', screenWidth, 'px')
      console.log('是否为移动设备:', isMobile)
      
      // 根据当前路由和屏幕尺寸决定是否跳转
      const currentPath = router.currentRoute.value.path
      
      if (isMobile && currentPath === '/desktop') {
        console.log('切换到移动端')
        router.push('/mobile')
      } else if (!isMobile && currentPath === '/mobile') {
        console.log('切换到桌面端')
        router.push('/desktop')
      }
    }

    onMounted(() => {
      // 添加窗口大小变化监听
      window.addEventListener('resize', handleResize)
      
      // 初始加载时也检查一次
      handleResize()
    })

    onUnmounted(() => {
      // 移除监听器
      window.removeEventListener('resize', handleResize)
    })

    return {}
  }
}
</script>

<style>
/* 全局样式 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
}

#app {
  min-height: 100vh;
}
</style>