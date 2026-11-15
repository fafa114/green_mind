import { request } from '@/utils/request'
import { isMockEnabled, delay } from '@/api/mock'
import { toISO8601 } from '@/utils/format'
import type { PredictionResult, PredictionRecord, PollutantCode, Page } from '@/api/types'
import mockPrediction from '@/api/mock/prediction.json'

interface PredEntry {
  latest: { base_ts: string; result: PredictionResult }
  history: PredictionRecord[]
}
const db = mockPrediction as unknown as Record<string, PredEntry>

function key(deviceId: string, pollutant: PollutantCode): string {
  return `${deviceId}:${pollutant}`
}

export async function fetchLatestPrediction(
  deviceId: string,
  pollutant: PollutantCode,
): Promise<{ base_ts: string; result: PredictionResult } | null> {
  if (isMockEnabled('prediction')) {
    await delay()
    const e = db[key(deviceId, pollutant)]
    return e ? { base_ts: e.latest.base_ts, result: { ...e.latest.result } } : null
  }
  const { data } = await request.get<{ base_ts: string; result: PredictionResult }>('/predictions/latest', {
    params: { device_id: deviceId, pollutant },
  })
  return data
}

export async function fetchPredictionHistory(
  deviceId: string,
  pollutant: PollutantCode,
  page = 1,
  page_size = 10,
): Promise<Page<PredictionRecord>> {
  if (isMockEnabled('prediction')) {
    await delay()
    const rows = db[key(deviceId, pollutant)]?.history ?? []
    const total = rows.length
    return { items: rows.slice((page - 1) * page_size, page * page_size).map((r) => ({ ...r })), total, page, page_size }
  }
  const { data } = await request.get<Page<PredictionRecord>>('/predictions', {
    params: { device_id: deviceId, pollutant, page, page_size },
  })
  return data
}

export async function refreshPrediction(
  deviceId: string,
  pollutant: PollutantCode,
): Promise<{ base_ts: string; result: PredictionResult }> {
  if (isMockEnabled('prediction')) {
    await delay(600)
    const e = db[key(deviceId, pollutant)]
    const base = e?.latest.result ?? { hours: [], drivers: [], confidence: 0.7 }
    const result: PredictionResult = {
      hours: base.hours.map((h) => ({ ...h, value: Number(Math.max(0, h.value * (0.92 + Math.random() * 0.16)).toFixed(1)) })),
      drivers: base.drivers,
      confidence: Number((0.6 + Math.random() * 0.3).toFixed(2)),
    }
    const base_ts = toISO8601(new Date())
    if (e) e.latest = { base_ts, result }
    return { base_ts, result: { ...result } }
  }
  const { data } = await request.post<{ base_ts: string; result: PredictionResult }>('/predictions/refresh', { device_id: deviceId })
  return data
}