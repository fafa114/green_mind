import http from '../utils/request'
import type { User } from '../types'

export function listUsers(params: { page?: number; page_size?: number } = {}) {
  return http.get<any, { items: User[]; total: number; page: number; page_size: number }>('/users', { params })
}

export function createUser(body: { username: string; password: string; real_name?: string; role: string }) {
  return http.post<any, User>('/users', body)
}

export function updateUser(id: number, body: { real_name?: string; role?: string; password?: string }) {
  return http.put<any, User>(`/users/${id}`, body)
}

export function deleteUser(id: number) {
  return http.delete(`/users/${id}`)
}
