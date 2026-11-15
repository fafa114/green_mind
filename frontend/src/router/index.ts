import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/user'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: () => import('../views/login/Login.vue'), meta: { blank: true } },
    { path: '/', redirect: '/dashboard' },
    {
      path: '/',
      component: () => import('../components/AppLayout.vue'),
      children: [
        { path: 'dashboard', name: 'dashboard', component: () => import('../views/dashboard/Dashboard.vue'), meta: { title: '数据大屏' } },
        { path: 'alarms', name: 'alarms', component: () => import('../views/alarms/Alarms.vue'), meta: { title: '智能告警' } },
        { path: 'predictions', name: 'predictions', component: () => import('../views/predictions/Predictions.vue'), meta: { title: '趋势预测' } },
        { path: 'workorders', name: 'workorders', component: () => import('../views/workorders/Workorders.vue'), meta: { title: '工单看板' } },
        { path: 'devices', name: 'devices', component: () => import('../views/devices/Devices.vue'), meta: { title: '设备资产' } },
        { path: 'reports', name: 'reports', component: () => import('../views/reports/Reports.vue'), meta: { title: '台账报表' } },
        { path: 'assistant', name: 'assistant', component: () => import('../views/assistant/Assistant.vue'), meta: { title: 'AI 助手' } },
        { path: 'inspection', name: 'inspection', component: () => import('../views/inspection/Inspection.vue'), meta: { title: '智能巡检', mobile: true } },
        { path: 'admin/users', name: 'admin-users', component: () => import('../views/admin/Users.vue'), meta: { title: '用户管理', roles: ['admin'] } },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
  ],
})

router.beforeEach((to) => {
  const userStore = useUserStore()
  if (to.name !== 'login' && !userStore.token) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.name === 'login' && userStore.token) {
    return { path: '/dashboard' }
  }
  const roles = to.meta.roles as string[] | undefined
  if (roles && !roles.includes(userStore.role)) {
    return { path: '/dashboard' }
  }
  document.title = to.meta.title ? `${to.meta.title} · GreenMind` : 'GreenMind'
})

export default router
