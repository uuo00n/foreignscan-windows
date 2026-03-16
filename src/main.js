// 引入 Vue 创建应用
import { createApp } from 'vue'
// 根组件
import App from './App.vue'
// 路由与状态管理
import router from './router'
import store from './store'
// 引入 TDesign 组件库与样式（Vue3 版本）
// 关键：注册 TDesign 插件即可在全局使用 t- 前缀的组件
import TDesign from 'tdesign-vue-next'
import 'tdesign-vue-next/es/style/index.css'

// 创建并挂载应用，同时注册 TDesign 插件
createApp(App)
  .use(store) // 注册 Vuex
  .use(router) // 注册路由
  .use(TDesign) // 注册 TDesign（腾讯开源 UI 组件库）
  .mount('#app')