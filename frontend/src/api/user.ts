import { request } from '@/utils/request'
import { isMockEnabled, delay } from '@/api/mock'
import { toISO8601 } from '@/utils/format'
import type { AdminUser, Role } from '@/api/types'
import mockUsers from '@/api/mock/users.json'

const users = mockUsers.users as AdminUser[]
const passwords: Record<number, string> = { 1: '123456', 2: '123456', 3: '123456', 4: '123456' }
let nextId = 100

export interface Actor {
  id: number
  role: Role
}

function httpError(status: number, detail: string): never {
  throw Object.assign(new Error(detail), { response: { status, data: { detail } } })
}
function requireAdmin(actor: Actor): void {
  if (actor.role !== 'admin') httpError(403, '仅管理员可管理用户')
}

export async function fetchUsers(actor: Actor): Promise<AdminUser[]> {
  if (isMockEnabled('user')) {
    await delay()
    requireAdmin(actor)
    return users.map((u) => ({ ...u }))
  }
  const { data } = await request.get<AdminUser[]>('/users')
  return data
}

export interface UserPayload {
  username: string
  real_name: string
  role: Role
  password?: string
}

export async function createUser(payload: UserPayload, actor: Actor): Promise<AdminUser> {
  if (isMockEnabled('user')) {
    await delay()
    requireAdmin(actor)
    if (!payload.username.trim()) httpError(400, '用户名必填')
    if (users.some((u) => u.username === payload.username)) httpError(400, '用户名已存在')
    if (!payload.password) httpError(400, '密码必填')
    const u: AdminUser = { id: nextId++, username: payload.username, real_name: payload.real_name, role: payload.role, created_at: toISO8601(new Date()) }
    users.push(u)
    passwords[u.id] = payload.password
    return { ...u }
  }
  const { data } = await request.post<AdminUser>('/users', payload)
  return data
}

export async function updateUser(id: number, payload: Partial<UserPayload>, actor: Actor): Promise<AdminUser> {
  if (isMockEnabled('user')) {
    await delay()
    requireAdmin(actor)
    const u = users.find((x) => x.id === id)
    if (!u) httpError(404, '用户不存在')
    if (payload.real_name != null) u.real_name = payload.real_name
    if (payload.role != null) u.role = payload.role
    if (payload.password) passwords[id] = payload.password
    return { ...u }
  }
  const { data } = await request.put<AdminUser>(`/users/${id}`, payload)
  return data
}

export async function removeUser(id: number, actor: Actor): Promise<void> {
  if (isMockEnabled('user')) {
    await delay()
    requireAdmin(actor)
    if (id === actor.id) httpError(400, '不能删除自己')
    const idx = users.findIndex((x) => x.id === id)
    if (idx < 0) httpError(404, '用户不存在')
    users.splice(idx, 1)
    delete passwords[id]
    return
  }
  await request.delete(`/users/${id}`)
}