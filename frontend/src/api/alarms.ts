import http from '../utils/request'
import { useReal } from '../utils/sse'
import type { Alarm, Page } from '../types'
import { mockAckAlarm, mockGetAlarm, mockListAlarms } from './mock/alarms'

export interface AlarmQuery {
  level?: string
  status?: string
  device_id?: string
  start?: string
  end?: string
  page?: number
  page_size?: number
}

export function listAlarms(params: AlarmQuery = {}): Promise<Page<Alarm>> {
  if (!useReal('alarms')) return mockListAlarms(params as any)
  return http.get('/alarms', { params })
}

export function getAlarm(id: number): Promise<Alarm> {
  if (!useReal('alarms')) return mockGetAlarm(id)
  return http.get(`/alarms/${id}`)
}

export function ackAlarm(id: number): Promise<Alarm> {
  if (!useReal('alarms')) return mockAckAlarm(id)
  return http.post(`/alarms/${id}/ack`)
}
