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

/** GET /api/data/devices */
export async function fetchDevices(): Promise<DeviceOption[]> {
  if (isMockEnabled('data')) {
    await delay()
    return mock.devices
  }
  const { data } = await request.get<DeviceOption[]>('/data/devices')
  return data
}

/** GET /api/data/latest（as_of 回放参数透传，本期不实现回放交互） */
export async function fetchLatest(deviceId: string, asOf?: string): Promise<LatestObservation> {
  if (isMockEnabled('data')) {
    await delay()
    const row = mock.latest[deviceId]
    if (!row) notFound()
    return row
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