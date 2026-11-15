import http from '../utils/request'
import { useReal } from '../utils/sse'
import type { CemsRow, DataOverview, DeviceInfo } from '../types'
import { mockDevices, mockHistory, mockLatest, mockOverview } from './mock/data'

export function listDataDevices(): Promise<DeviceInfo[]> {
  if (!useReal('data')) return mockDevices()
  return http.get('/data/devices')
}

export function getLatest(deviceId: string, asOf?: string): Promise<CemsRow> {
  if (!useReal('data')) return mockLatest(deviceId, asOf)
  return http.get('/data/latest', { params: { device_id: deviceId, as_of: asOf } })
}

export function getHistory(params: { device_id: string; start: string; end: string; interval?: string }): Promise<{ items: CemsRow[]; total: number }> {
  if (!useReal('data')) return mockHistory(params.device_id, params.start, params.end, params.interval || 'raw')
  return http.get('/data/history', { params })
}

export function getOverview(deviceId: string, date: string): Promise<DataOverview> {
  if (!useReal('data')) return mockOverview(deviceId)
  return http.get('/data/overview', { params: { device_id: deviceId, date } })
}
