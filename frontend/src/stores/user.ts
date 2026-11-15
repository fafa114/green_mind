import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Role, UserInfo, UserSession } from '@/api/types'
import { SESSION_KEY } from '@/utils/request'
import { login as loginApi } from '@/api/auth'

function readSession(): UserSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as UserSession
    if (session?.token && session?.user) return session
  } catch {
    // 损坏的会话按未登录处理
  }
  return null
}

export const useUserStore = defineStore('user', () => {
  const initial = readSession()
  const token = ref<string>(initial?.token ?? '')
  const user = ref<UserInfo | null>(initial?.user ?? null)

  const isLoggedIn = computed(() => Boolean(token.value) && Boolean(user.value))
  const role = computed<Role>(() => user.value?.role ?? 'viewer')
  const realName = computed(() => user.value?.real_name ?? '')

  function persist(): void {
    if (token.value && user.value) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ token: token.value, user: user.value }))
    } else {
      localStorage.removeItem(SESSION_KEY)
    }
  }

  async function login(username: string, password: string): Promise<UserSession> {
    const session = await loginApi({ username, password })
    token.value = session.token
    user.value = session.user
    persist()
    return session
  }

  function logout(): void {
    token.value = ''
    user.value = null
    localStorage.removeItem(SESSION_KEY)
  }

  return { token, user, isLoggedIn, role, realName, login, logout }
})