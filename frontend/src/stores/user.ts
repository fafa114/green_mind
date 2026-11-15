import { defineStore } from 'pinia'
import type { User } from '../types'

const TOKEN_KEY = 'gm_token'
const USER_KEY = 'gm_user'

function readUser(): User | null {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null')
  } catch {
    return null
  }
}

export const useUserStore = defineStore('user', {
  state: () => ({
    token: localStorage.getItem(TOKEN_KEY) || '',
    user: readUser(),
  }),
  getters: {
    isLogin: (s) => !!s.token,
    role: (s): string => s.user?.role || 'viewer',
    isAdmin: (s) => s.user?.role === 'admin',
    canWrite: (s) => s.user?.role === 'admin' || s.user?.role === 'engineer',
    realName: (s) => s.user?.real_name || s.user?.username || '',
  },
  actions: {
    setLogin(token: string, user: User) {
      this.token = token
      this.user = user
      localStorage.setItem(TOKEN_KEY, token)
      localStorage.setItem(USER_KEY, JSON.stringify(user))
    },
    logout() {
      this.token = ''
      this.user = null
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
    },
  },
})
