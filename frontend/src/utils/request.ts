// axios 封装（统一约定 §1.1/§1.4）：
// baseURL=/api；请求拦截器加 Bearer token；401 统一清会话跳登录；错误读 {detail} 可读提示。
import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'
import type { ApiError } from '@/api/types'

export const SESSION_KEY = 'gm_session'

export const request: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

request.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const raw = localStorage.getItem(SESSION_KEY)
  if (raw) {
    try {
      const session = JSON.parse(raw) as { token?: string }
      if (session?.token) {
        config.headers.Authorization = `Bearer ${session.token}`
      }
    } catch {
      // 会话损坏：忽略，按未登录处理
    }
  }
  return config
})

let redirecting = false

request.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const status = error.response?.status
    const detail = error.response?.data?.detail

    if (status === 401) {
      const url = error.config?.url ?? ''
      // 登录接口的 401 是"凭证错误"，由登录页就地提示，不触发全局登出
      if (url.includes('/auth/login')) {
        return Promise.reject(error)
      }
      localStorage.removeItem(SESSION_KEY)
      if (!redirecting) {
        redirecting = true
        // 动态 import 打破 request → router → store → api → request 的循环依赖
        const { default: router } = await import('@/router')
        const current = router.currentRoute.value.fullPath
        ElMessage.warning('登录已过期，请重新登录')
        await router.replace({
          path: '/login',
          query: current && current !== '/login' ? { redirect: current } : {},
        })
        window.setTimeout(() => {
          redirecting = false
        }, 600)
      }
    } else if (status === 403) {
      ElMessage.error(detail || '无权限执行该操作')
    } else {
      ElMessage.error(detail || error.message || '请求失败，请稍后重试')
    }

    return Promise.reject(error)
  },
)