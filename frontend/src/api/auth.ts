import { request } from '@/utils/request'
import { isMockEnabled, delay } from '@/api/mock'
import type { LoginPayload, UserSession, UserInfo, Role } from '@/api/types'
import mockAuth from '@/api/mock/auth.json'

interface MockAccount {
  id: number
  username: string
  password: string
  real_name: string
  role: Role
}

const accounts = mockAuth.accounts as MockAccount[]

/** POST /api/auth/login（契约 contracts/auth.md）。mock 与真实返回同构 {token,user}。 */
export async function login(payload: LoginPayload): Promise<UserSession> {
  if (isMockEnabled('auth')) {
    await delay()
    const acc = accounts.find(
      (a) => a.username === payload.username && a.password === payload.password,
    )
    if (!acc) {
      // 与真实 401 同构的错误；登录页据此显示统一提示，不触发全局登出
      throw Object.assign(new Error('用户名或密码错误'), {
        response: { status: 401, data: { detail: '用户名或密码错误' } },
      })
    }
    const user: UserInfo = {
      id: acc.id,
      username: acc.username,
      real_name: acc.real_name,
      role: acc.role,
    }
    return { token: `demo-token-${acc.username}-${Date.now()}`, user }
  }

  const { data } = await request.post<UserSession>('/auth/login', payload)
  return data
}