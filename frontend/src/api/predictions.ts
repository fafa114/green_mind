import http from '../utils/request'
import { useReal } from '../utils/sse'
import type { Page, Prediction } from '../types'
import { mockLatestPrediction, mockPredictionHistory, mockRefreshPredictions } from './mock/predictions'

export function getLatestPrediction(deviceId: string, pollutant: string): Promise<Prediction> {
  if (!useReal('predictions')) return mockLatestPrediction(deviceId, pollutant)
  return http.get('/predictions/latest', { params: { device_id: deviceId, pollutant } })
}

export function listPredictions(deviceId: string, pollutant: string, page = 1, pageSize = 20): Promise<Page<Prediction>> {
  if (!useReal('predictions')) return mockPredictionHistory(deviceId, pollutant)
  return http.get('/predictions', { params: { device_id: deviceId, pollutant, page, page_size: pageSize } })
}

export function refreshPredictions(deviceId: string): Promise<void> {
  if (!useReal('predictions')) return mockRefreshPredictions(deviceId)
  return http.post('/predictions/refresh', { device_id: deviceId }, { timeout: 90000 })
}
