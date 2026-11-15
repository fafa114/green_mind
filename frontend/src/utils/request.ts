import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useUserStore } from '../stores/user'

const http = axios.create({ baseURL: '/api', timeout: 30000 })

http.interceptors.request.use((config) => {
  const userStore = useUserStore()
  if (userStore.token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${userStore.token}`
  }
  return config
})

http.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const status = err.response?.status
    const detail = err.response?.data?.detail
    if (status === 401) {
      const userStore = useUserStore()
      userStore.logout()
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    } else if (status === 403) {
      ElMessage.error(typeof detail === 'string' ? detail : '无权限')
    } else if (detail) {
      ElMessage.error(typeof detail === 'string' ? detail : JSON.stringify(detail))
    } else {
      ElMessage.error('网络异常，请稍后重试')
    }
    return Promise.reject(err)
  },
)

export default http
