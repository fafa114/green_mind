import http from '../utils/request'
import type { User } from '../types'
import { useReal, } from '../utils/sse'
import { mockLogin } from './mock/auth'

export async function login(username: string, password: string): Promise<{ token: string; user: User }> {
  if (!useReal('auth')) return mockLogin(username, password)
  return http.post('/auth/login', { username, password })
}
