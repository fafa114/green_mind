import { request } from '@/utils/request'
import { isMockEnabled, delay } from '@/api/mock'
import { toISO8601 } from '@/utils/format'
import type { Device, DeviceWithHealth, HealthScore, Page, Role } from '@/api/types'
import mockDevice from '@/api/mock/device.json'

const devices = mockDevice.devices as Device[]
const health = mockDevice.health as unknown as Record<number, HealthScore>
let nextId = 100

export interface Actor {
  id: number
  role: Role
}

function httpError(status: number, detail: string): never {
  throw Object.assign(new Error(detail), { response: { status, data: { detail } } })
}
function requireAdmin(actor: Actor): void {
  if (actor.role !== 'admin') httpError(403, '仅管理员可操作设备')
}
function find(id: number): Device {
  const d = devices.find((x) => x.id === id)
  if (!d) httpError(404, '设备不存在')
  return d
}

export async function fetchDevices(page = 1, page_size = 20): Promise<Page<DeviceWithHealth>> {
  if (isMockEnabled('device')) {
    await delay()
    const rows = devices.map((d) => ({ ...d, health_score: health[d.id]?.score ?? null }))
    const total = rows.length
    return { items: rows.slice((page - 1) * page_size, page * page_size), total, page, page_size }
  }
  const { data } = await request.get<Page<DeviceWithHealth>>('/devices', { params: { page, page_size } })
  return data
}

export async function createDevice(payload: Omit<Device, 'id' | 'created_at'>, actor: Actor): Promise<Device> {
  if (isMockEnabled('device')) {
    await delay()
    requireAdmin(actor)
    if (devices.some((d) => d.code === payload.code)) httpError(400, '设备编号已存在')
    const d: Device = { ...payload, id: nextId++, created_at: toISO8601(new Date()) }
    devices.push(d)
    return { ...d }
  }
  const { data } = await request.post<Device>('/devices', payload)
  return data
}

export async function updateDevice(id: number, payload: Partial<Device>, actor: Actor): Promise<Device> {
  if (isMockEnabled('device')) {
    await delay()
    requireAdmin(actor)
    const d = find(id)
    Object.assign(d, payload, { id: d.id })
    return { ...d }
  }
  const { data } = await request.put<Device>(`/devices/${id}`, payload)
  return data
}

export async function removeDevice(id: number, actor: Actor): Promise<void> {
  if (isMockEnabled('device')) {
    await delay()
    requireAdmin(actor)
    const idx = devices.findIndex((x) => x.id === id)
    if (idx < 0) httpError(404, '设备不存在')
    devices.splice(idx, 1)
    delete health[id]
    return
  }
  await request.delete(`/devices/${id}`)
}

export async function fetchHealth(id: number): Promise<HealthScore | null> {
  if (isMockEnabled('device')) {
    await delay()
    find(id)
    return health[id] ? { ...health[id] } : null
  }
  const { data } = await request.get<HealthScore>(`/devices/${id}/health`)
  return data
}

export async function refreshHealth(id: number): Promise<HealthScore> {
  if (isMockEnabled('device')) {
    await delay(700)
    find(id)
    const score = Math.floor(60 + Math.random() * 38)
    const hs: HealthScore = {
      score,
      factors: [
        { name: '通讯中断次数', impact: `近30天 ${Math.floor(Math.random() * 3)} 次` },
        { name: '异常数据占比', impact: `${(Math.random() * 5).toFixed(1)}%` },
        { name: '告警次数', impact: `近30天 ${Math.floor(Math.random() * 8)} 次` },
        { name: '校准状态', impact: Math.random() > 0.5 ? '未逾期' : '临近校准周期' },
      ],
      suggestion: score >= 80 ? '设备运行良好，保持当前维护策略，按期校准。' : '建议加强巡检与校准，关注告警偏高指标，排查异常工况。',
      scored_at: toISO8601(new Date()),
    }
    health[id] = hs
    return { ...hs }
  }
  const { data } = await request.post<HealthScore>(`/devices/${id}/health/refresh`)
  return data
}