import { request } from '@/utils/request'
import { isMockEnabled, delay } from '@/api/mock'
import type { Alarm, AlarmFilters, Page } from '@/api/types'
import mockAlarm from '@/api/mock/alarm.json'

// 内存单例（mock 模式下可被 ack 修改）
const db = mockAlarm.alarms as Alarm[]

function notFound(): never {
  throw Object.assign(new Error('告警不存在'), {
    response: { status: 404, data: { detail: '告警不存在' } },
  })
}

function mockPage(filters: AlarmFilters): Page<Alarm> {
  let rows = [...db]
  if (filters.level) rows = rows.filter((a) => a.level === filters.level)
  if (filters.status) rows = rows.filter((a) => a.status === filters.status)
  if (filters.device_id) rows = rows.filter((a) => a.device_id === filters.device_id)
  if (filters.start) rows = rows.filter((a) => a.ts >= filters.start!)
  if (filters.end) rows = rows.filter((a) => a.ts < filters.end!)
  rows.sort((a, b) => b.ts.localeCompare(a.ts))
  const total = rows.length
  const page = filters.page ?? 1
  const page_size = filters.page_size ?? 20
  const items = rows.slice((page - 1) * page_size, page * page_size).map((r) => ({ ...r }))
  return { items, total, page, page_size }
}

/** GET /api/alarms（筛选 + 分页） */
export async function fetchAlarms(filters: AlarmFilters = {}): Promise<Page<Alarm>> {
  if (isMockEnabled('alarm')) {
    await delay()
    return mockPage(filters)
  }
  const { data } = await request.get<Page<Alarm>>('/alarms', { params: filters })
  return data
}

/** GET /api/alarms/{id} */
export async function fetchAlarm(id: number): Promise<Alarm> {
  if (isMockEnabled('alarm')) {
    await delay()
    const row = db.find((a) => a.id === id)
    if (!row) notFound()
    return { ...row }
  }
  const { data } = await request.get<Alarm>(`/alarms/${id}`)
  return data
}

/** POST /api/alarms/{id}/ack（engineer+；viewer 由后端 403） */
export async function ackAlarm(id: number): Promise<Alarm> {
  if (isMockEnabled('alarm')) {
    await delay()
    const row = db.find((a) => a.id === id)
    if (!row) notFound()
    row.status = 'acked'
    return { ...row }
  }
  const { data } = await request.post<Alarm>(`/alarms/${id}/ack`)
  return data
}