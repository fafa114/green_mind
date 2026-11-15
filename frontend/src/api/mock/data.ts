import type { CemsRow, DataOverview, DeviceInfo } from '../../types'

const DEVICES: DeviceInfo[] = [
  { device_id: 'CEMS-01', name: '1# 焚烧线 CEMS', last_ts: new Date().toISOString().slice(0, 19) },
  { device_id: 'CEMS-02', name: '2# 焚烧线 CEMS', last_ts: new Date().toISOString().slice(0, 19) },
]

const LIMITS: Record<string, number> = { pm: 20, so2: 80, nox: 250, co: 100, hcl: 10 }

function rnd(base: number, amp: number) {
  return Math.round((base + (Math.random() - 0.5) * amp) * 100) / 100
}

function genRow(deviceId: string, ts: Date, exceed = false): CemsRow {
  const factors = exceed ? 1.6 : 1
  return {
    ts: ts.toISOString().slice(0, 19),
    device_id: deviceId,
    furnace_temp: rnd(940, 60),
    flow: rnd(62000, 6000),
    o2: rnd(8, 2.5),
    pm_std: rnd(LIMITS.pm * 0.42 * factors, LIMITS.pm * 0.12),
    so2_std: rnd(LIMITS.so2 * 0.42 * factors, LIMITS.so2 * 0.12),
    nox_std: rnd(LIMITS.nox * 0.42 * factors, LIMITS.nox * 0.12),
    co_std: rnd(LIMITS.co * 0.42 * factors, LIMITS.co * 0.12),
    hcl_std: rnd(LIMITS.hcl * 0.42 * factors, LIMITS.hcl * 0.12),
    pm_limit: LIMITS.pm,
    so2_limit: LIMITS.so2,
    nox_limit: LIMITS.nox,
    co_limit: LIMITS.co,
    hcl_limit: LIMITS.hcl,
    condition_flag: 'normal',
  }
}

export function mockDevices(): Promise<DeviceInfo[]> {
  return new Promise((r) => setTimeout(() => r(DEVICES), 150))
}

export function mockLatest(deviceId: string, asOf?: string): Promise<CemsRow> {
  return new Promise((r) => setTimeout(() => r(genRow(deviceId, asOf ? new Date(asOf) : new Date(), Math.random() < 0.08)), 200))
}

export function mockHistory(deviceId: string, start: string, end: string, interval: string): Promise<{ items: CemsRow[]; total: number }> {
  return new Promise((r) => setTimeout(() => {
    const stepMin = interval === 'day' ? 60 * 24 : interval === 'hour' ? 60 : 5
    const startTime = new Date(start).getTime()
    const endTime = new Date(end).getTime()
    const items: CemsRow[] = []
    for (let t = startTime; t <= endTime; t += stepMin * 60000) {
      items.push(genRow(deviceId, new Date(t)))
    }
    r({ items, total: items.length })
  }, 250))
}

export function mockOverview(deviceId: string): Promise<DataOverview> {
  const pollutants: DataOverview['pollutants'] = {}
  for (const [k, limit] of Object.entries(LIMITS)) {
    pollutants[k] = { max: rnd(limit * 0.9, limit * 0.2), avg: rnd(limit * 0.42, limit * 0.1), exceed_count: Math.floor(Math.random() * 3) }
  }
  return new Promise((r) => setTimeout(() => r({ pollutants, alarm_count: 18 }), 150))
}
