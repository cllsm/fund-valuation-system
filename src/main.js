import { createApp } from 'vue'
import router from './router/index.js'
import AppRouter from './AppRouter.vue'

const app = createApp(AppRouter)

app.use(router)

app.mount('#app')