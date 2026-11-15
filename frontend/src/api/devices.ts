import http from '../utils/request'
import type { Device, HealthScore } from '../types'

export function listDevices(params: { page?: number; page_size?: number; status?: string } = {}) {
  return http.get<any, { items: Device[]; total: number; page: number; page_size: number }>('/devices', { params })
}

export function getDevice(id: number) {
  return http.get<any, Device>(`/devices/${id}`)
}

export function createDevice(body: Record<string, any>) {
  return http.post<any, Device>('/devices', body)
}

export function updateDevice(id: number, body: Record<string, any>) {
  return http.put<any, Device>(`/devices/${id}`, body)
}

export function deleteDevice(id: number) {
  return http.delete(`/devices/${id}`)
}

export function getDeviceHealth(id: number) {
  return http.get<any, HealthScore>(`/devices/${id}/health`)
}

export function refreshDeviceHealth(id: number) {
  return http.post<any, HealthScore>(`/devices/${id}/health/refresh`, {}, { timeout: 90000 })
}
