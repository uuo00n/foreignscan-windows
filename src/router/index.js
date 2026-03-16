import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import DateListView from '../views/DateListView.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView
  },
  {
    path: '/by-date',
    name: 'dateList',
    component: DateListView
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router