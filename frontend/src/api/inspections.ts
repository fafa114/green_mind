import http from '../utils/request'
import type { Inspection, Page, ChecklistItem } from '../types'

export function uploadFile(file: File) {
  const form = new FormData()
  form.append('file', file)
  return http.post<any, { path: string }>('/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
}

export function createInspection(body: {
  device_code: string
  checklist: ChecklistItem[]
  photos: string[]
  signature_path: string
  abnormal_desc?: string | null
}) {
  return http.post<any, { id: number; workorder_id: number | null }>('/inspections', body)
}

export function listInspections(params: { device_id?: string; page?: number; page_size?: number } = {}) {
  return http.get<any, Page<Inspection>>('/inspections', { params })
}

export function getInspection(id: number) {
  return http.get<any, Inspection>(`/inspections/${id}`)
}
