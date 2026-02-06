import { createRouter, createWebHashHistory } from 'vue-router'
import App from '../App.vue'
import MobileApp from '../MobileApp.vue'
import TestPage from '../views/TestPage.vue'

// 基于屏幕尺寸检测是否为移动设备
function isMobileScreen() {
  // 在服务器端渲染或预渲染时，默认返回 false
  if (typeof window === 'undefined') {
    return false
  }
  const screenWidth = window.innerWidth
  // 768px 是常见的移动端和桌面端分界点
  return screenWidth <= 768
}

const routes = [
  {
    path: '/',
    component: App,
    name: 'Home'
  },
  {
    path: '/desktop',
    component: App,
    name: 'Desktop'
  },
  {
    path: '/mobile',
    component: MobileApp,
    name: 'Mobile'
  },
  {
    path: '/test',
    component: TestPage,
    name: 'Test'
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 路由守卫 - 根据屏幕尺寸自动重定向
router.beforeEach((to, from, next) => {
  // 如果是根路径，根据屏幕尺寸自动重定向
  if (to.path === '/') {
    if (isMobileScreen()) {
      next('/mobile')
    } else {
      next('/desktop')
    }
  } else {
    next()
  }
})

export default router