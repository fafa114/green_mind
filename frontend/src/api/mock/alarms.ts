import type { Alarm, Page } from '../../types'

let nextId = 100

const BASE: Omit<Alarm, 'id' | 'ts' | 'value' | 'level' | 'status'>[] = []

function gen(): Alarm {
  const levels = ['yellow', 'orange', 'red'] as const
  const pollutants = ['pm', 'so2', 'nox', 'co', 'hcl']
  const level = levels[Math.floor(Math.random() * 3)]
  const pollutant = pollutants[Math.floor(Math.random() * 5)]
  const limit = { pm: 20, so2: 80, nox: 250, co: 100, hcl: 10 }[pollutant]!
  const factor = level === 'red' ? 1.6 : level === 'orange' ? 1.15 : 0.85
  return {
    id: nextId++,
    device_id: Math.random() > 0.5 ? 'CEMS-01' : 'CEMS-02',
    ts: new Date(Date.now() - Math.random() * 3 * 86400000).toISOString().slice(0, 19),
    level,
    pollutant,
    value: Math.round(limit * factor * 100) / 100,
    limit_val: limit,
    reason: `${pollutant} 折算浓度超阈值`,
    status: Math.random() < 0.4 ? 'acked' : 'pending',
    diagnosis: {
      root_causes: [
        { cause: '布袋除尘器破损，过滤效率下降', confidence: 0.72 },
        { cause: '燃烧工况波动，炉温偏低', confidence: 0.41 },
        { cause: '采样管路堵塞导致数据偏高', confidence: 0.18 },
      ],
      measures: ['检查布袋压差并排查破损滤袋', '确认炉温是否低于 850℃', '吹扫采样管路后复测'],
      estimated_recovery_minutes: 45,
      summary: '布袋破损可能性较高，建议先查压差再安排检修。',
    },
    workorder_id: Math.random() < 0.5 ? 1 + Math.floor(Math.random() * 3) : null,
    created_at: new Date().toISOString().slice(0, 19),
  }
}

const LIST: Alarm[] = Array.from({ length: 23 }, gen)

export function mockListAlarms(params: { level?: string; status?: string; device_id?: string; page?: number; page_size?: number }): Promise<Page<Alarm>> {
  return new Promise((r) => setTimeout(() => {
    let items = LIST
    if (params.level) items = items.filter((a) => a.level === params.level)
    if (params.status) items = items.filter((a) => a.status === params.status)
    if (params.device_id) items = items.filter((a) => a.device_id === params.device_id)
    const page = params.page || 1
    const pageSize = params.page_size || 20
    r({ items: items.slice((page - 1) * pageSize, page * pageSize), total: items.length, page, page_size: pageSize })
  }, 200))
}

export function mockGetAlarm(id: number): Promise<Alarm> {
  const found = LIST.find((a) => a.id === id)
  return new Promise((r, rej) => setTimeout(() => found ? r(found) : rej(new Error('not found')), 150))
}

export function mockAckAlarm(id: number): Promise<Alarm> {
  const found = LIST.find((a) => a.id === id)
  if (found) found.status = 'acked'
  return new Promise((r) => setTimeout(() => r(found!), 150))
}
