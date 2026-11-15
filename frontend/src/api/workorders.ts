import http from '../utils/request'
import type { Page, WorkOrder, WorkOrderStats } from '../types'

export interface WorkOrderQuery {
  status?: string
  assignee_id?: number
  device_id?: string
  page?: number
  page_size?: number
}

export function listWorkorders(params: WorkOrderQuery = {}) {
  return http.get<any, Page<WorkOrder>>('/workorders', { params })
}

export function getWorkorder(id: number) {
  return http.get<any, WorkOrder>(`/workorders/${id}`)
}

export function createWorkorder(body: { device_id: string; title: string; description?: string; priority: string }) {
  return http.post<any, WorkOrder>('/workorders', body)
}

export function acceptWorkorder(id: number) {
  return http.post<any, WorkOrder>(`/workorders/${id}/accept`)
}

export function completeWorkorder(id: number, finish_note?: string) {
  return http.post<any, WorkOrder>(`/workorders/${id}/complete`, { finish_note })
}

export function approveWorkorder(id: number, pass: boolean, accept_note?: string) {
  return http.post<any, WorkOrder>(`/workorders/${id}/approve`, { pass, accept_note })
}

export function workorderStats() {
  return http.get<any, WorkOrderStats>('/workorders/stats')
}
