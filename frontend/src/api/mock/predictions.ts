import type { Page, Prediction, PredictionResult } from '../../types'

function genPrediction(deviceId: string, pollutant: string): Prediction {
  const now = new Date()
  now.setMinutes(0, 0, 0)
  const base = { pm: 8, so2: 34, nox: 105, co: 42, hcl: 4 }[pollutant] ?? 10
  const limit = { pm: 20, so2: 80, nox: 250, co: 100, hcl: 10 }[pollutant] ?? 100
  const hours = Array.from({ length: 6 }, (_, i) => {
    const ts = new Date(now.getTime() + (i + 1) * 3600000)
    const trend = base * (1 + i * 0.035 * (Math.random() > 0.3 ? 1 : -1))
    return {
      ts: ts.toISOString().slice(0, 19),
      value: Math.round(trend * 100) / 100,
      exceed_prob: Math.round(Math.min(0.9, Math.max(0.02, (trend / limit) * 0.6)) * 100) / 100,
    }
  })
  const result: PredictionResult = {
    hours,
    drivers: ['炉温缓慢回落', '烟气流量上升', '氧含量波动'],
    confidence: 0.68,
  }
  return { id: 1, device_id: deviceId, pollutant, base_ts: now.toISOString().slice(0, 19), result, created_at: now.toISOString().slice(0, 19) }
}

export function mockLatestPrediction(deviceId: string, pollutant: string): Promise<Prediction> {
  return new Promise((r) => setTimeout(() => r(genPrediction(deviceId, pollutant)), 250))
}

export function mockRefreshPredictions(deviceId: string): Promise<void> {
  return new Promise((r) => setTimeout(r, 800))
}

export function mockPredictionHistory(deviceId: string, pollutant: string): Promise<Page<Prediction>> {
  return new Promise((r) => setTimeout(() => r({ items: [genPrediction(deviceId, pollutant)], total: 1, page: 1, page_size: 20 }), 200))
}
