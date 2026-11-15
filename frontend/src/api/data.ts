import { request } from '@/utils/request'
import { isMockEnabled, delay } from '@/api/mock'
import type {
  DeviceOption,
  LatestObservation,
  HistoryPoint,
  HistoryPage,
  HistoryInterval,
} from '@/api/types'
import mockData from '@/api/mock/data.json'

const mock = mockData as unknown as {
  devices: DeviceOption[]
  latest: Record<string, LatestObservation>
  history: Record<string, HistoryPoint[]>
}

function notFound(): never {
  throw Object.assign(new Error('设备不存在'), {
    response: { status: 404, data: { detail: '设备不存在' } },
  })
}

const LIMITS = { pm: 20, so2: 80, nox: 250, co: 80, hcl: 50 }

/** 由历史点构造 latest 行（mock 回放：as_of 取最近历史点，使回放可见变化） */
function latestFromPoint(deviceId: string, p: HistoryPoint): LatestObservation {
  const exceed =
    p.pm_std >= LIMITS.pm || p.so2_std >= LIMITS.so2 || p.nox_std >= LIMITS.nox ||
    p.co_std >= LIMITS.co || p.hcl_std >= LIMITS.hcl
  return {
    ts: p.ts,
    device_id: deviceId,
    furnace_temp: p.furnace_temp,
    flow: p.flow,
    o2: 8.1,
    flue_temp: 150,
    flue_pressure: -120,
    flue_velocity: 12.4,
    flue_humidity: 18,
    pm_real: Number((p.pm_std * 0.82).toFixed(1)),
    pm_std: p.pm_std,
    pm_limit: LIMITS.pm,
    so2_real: Number((p.so2_std * 0.85).toFixed(1)),
    so2_std: p.so2_std,
    so2_limit: LIMITS.so2,
    nox_real: Number((p.nox_std * 0.88).toFixed(1)),
    nox_std: p.nox_std,
    nox_limit: LIMITS.nox,
    co_real: Number((p.co_std * 0.8).toFixed(1)),
    co_std: p.co_std,
    co_limit: LIMITS.co,
    hcl_real: Number((p.hcl_std * 0.83).toFixed(1)),
    hcl_std: p.hcl_std,
    hcl_limit: LIMITS.hcl,
    condition_flag: p.condition_flag,
    report_flag: 1,
    comm_flag: 0,
    exceed_flag: exceed ? 1 : 0,
    zero_flag: 0,
  }
}

/** GET /api/data/devices */
export async function fetchDevices(): Promise<DeviceOption[]> {
  if (isMockEnabled('data')) {
    await delay()
    return mock.devices
  }
  const { data } = await request.get<DeviceOption[]>('/data/devices')
  return data
}

/** GET /api/data/latest（as_of 回放：mock 取最近历史点，真实透传参数） */
export async function fetchLatest(deviceId: string, asOf?: string): Promise<LatestObservation> {
  if (isMockEnabled('data')) {
    await delay(120)
    const points = mock.history[deviceId]
    const base = mock.latest[deviceId]
    if (!base) notFound()
    if (asOf && points && points.length > 0) {
      const target = new Date(asOf).getTime()
      let nearest = points[0]
      let best = Infinity
      for (const p of points) {
        const diff = Math.abs(new Date(p.ts).getTime() - target)
        if (diff < best) {
          best = diff
          nearest = p
        }
      }
      return latestFromPoint(deviceId, nearest)
    }
    return base
  }
  const { data } = await request.get<LatestObservation>('/data/latest', {
    params: { device_id: deviceId, as_of: asOf },
  })
  return data
}

/** GET /api/data/history（本期大屏用 interval=hour 近 24h） */
export async function fetchHistory(
  deviceId: string,
  start: string,
  end: string,
  interval: HistoryInterval = 'hour',
): Promise<HistoryPage> {
  if (isMockEnabled('data')) {
    await delay()
    const items = mock.history[deviceId]
    if (!items) notFound()
    return { items, total: items.length }
  }
  const { data } = await request.get<HistoryPage>('/data/history', {
    params: { device_id: deviceId, start, end, interval },
  })
  return data
}