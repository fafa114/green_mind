import http from '../utils/request'
import type { Report, ReportListItem } from '../types'

export function listReports(params: { page?: number; page_size?: number } = {}) {
  return http.get<any, { items: ReportListItem[]; total: number; page: number; page_size: number }>('/reports', { params })
}

export function getReport(id: number) {
  return http.get<any, Report>(`/reports/${id}`)
}

export function generateReport(period: string) {
  return http.post<any, Report>('/reports/generate', { period }, { timeout: 90000 })
}

export function reportExportUrl(id: number, format: 'pdf' | 'excel'): string {
  return `/api/reports/${id}/export?format=${format}`
}
