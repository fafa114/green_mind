import { createRouter, createWebHistory } from 'vue-router'
import { routes } from './routes'
import { useUserStore } from '@/stores/user'

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 全局守卫：登录态（US1）+ 角色（US2）。仅读 store，无副作用请求。
router.beforeEach((to) => {
  const user = useUserStore()

  if (to.meta.public) {
    // 已登录访问登录页 → 进入工作台（或回跳目标）
    if (to.path === '/login' && user.isLoggedIn) {
      const redirect = typeof to.query.redirect === 'string' ? to.query.redirect : '/dashboard'
      return redirect
    }
    return true
  }

  if (!user.isLoggedIn) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  const roles = to.meta.roles
  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return '/dashboard'
  }

  return true
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · GreenMind` : 'GreenMind · 气体排放监控系统'
})

export default router