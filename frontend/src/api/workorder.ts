import { request } from '@/utils/request'
import { isMockEnabled, delay } from '@/api/mock'
import { toISO8601 } from '@/utils/format'
import {
  USER_NAME,
  type WorkOrder,
  type WorkOrderFilters,
  type WorkOrderStats,
  type WorkOrderStatus,
  type WorkOrderPriority,
  type Page,
  type Role,
} from '@/api/types'
import mockWorkorder from '@/api/mock/workorder.json'

const db = mockWorkorder.orders as WorkOrder[]
let nextId = 100

const SLA_HOURS: Record<WorkOrderPriority, number> = { urgent: 2, high: 8, medium: 24, low: 72 }
const ENGINEERS = [2, 3]

export interface Actor {
  id: number
  role: Role
}

function httpError(status: number, detail: string): never {
  throw Object.assign(new Error(detail), { response: { status, data: { detail } } })
}

function find(id: number): WorkOrder {
  const row = db.find((o) => o.id === id)
  if (!row) httpError(404, '工单不存在')
  return row
}

function mockPage(filters: WorkOrderFilters): Page<WorkOrder> {
  let rows = [...db]
  if (filters.status) rows = rows.filter((o) => o.status === filters.status)
  if (filters.assignee_id) rows = rows.filter((o) => o.assignee_id === filters.assignee_id)
  if (filters.device_id) rows = rows.filter((o) => o.device_id === filters.device_id)
  rows.sort((a, b) => b.created_at.localeCompare(a.created_at))
  const total = rows.length
  const page = filters.page ?? 1
  const page_size = filters.page_size ?? 20
  return { items: rows.slice((page - 1) * page_size, page * page_size).map((o) => ({ ...o })), total, page, page_size }
}

function mockStats(): WorkOrderStats {
  const by_status: Record<WorkOrderStatus, number> = { pending: 0, processing: 0, accepting: 0, closed: 0 }
  for (const o of db) by_status[o.status] += 1
  const engineer_load = ENGINEERS.map((uid) => ({
    user_id: uid,
    real_name: USER_NAME[uid] ?? `工程师${uid}`,
    open_count: db.filter((o) => o.assignee_id === uid && o.status !== 'closed').length,
  }))
  return { by_status, engineer_load }
}

export async function fetchWorkOrders(filters: WorkOrderFilters = {}): Promise<Page<WorkOrder>> {
  if (isMockEnabled('workorder')) {
    await delay()
    return mockPage(filters)
  }
  const { data } = await request.get<Page<WorkOrder>>('/workorders', { params: filters })
  return data
}

export async function fetchWorkOrder(id: number): Promise<WorkOrder> {
  if (isMockEnabled('workorder')) {
    await delay()
    return { ...find(id) }
  }
  const { data } = await request.get<WorkOrder>(`/workorders/${id}`)
  return data
}

export async function fetchWorkOrderStats(): Promise<WorkOrderStats> {
  if (isMockEnabled('workorder')) {
    await delay()
    return mockStats()
  }
  const { data } = await request.get<WorkOrderStats>('/workorders/stats')
  return data
}

export async function createWorkOrder(
  payload: { device_id: string; title: string; description: string; priority: WorkOrderPriority },
  actor: Actor,
): Promise<WorkOrder> {
  if (isMockEnabled('workorder')) {
    await delay()
    if (actor.role === 'viewer') httpError(403, '无权限执行该操作')
    // 指派给未结单最少的工程师（相同取 id 小）
    const load = ENGINEERS.map((uid) => ({
      uid,
      open: db.filter((o) => o.assignee_id === uid && o.status !== 'closed').length,
    }))
    load.sort((a, b) => a.open - b.open || a.uid - b.uid)
    const now = new Date()
    const order: WorkOrder = {
      id: nextId++,
      alarm_id: null,
      device_id: payload.device_id,
      title: payload.title,
      description: payload.description,
      priority: payload.priority,
      status: 'pending',
      assignee_id: load[0].uid,
      sla_deadline: toISO8601(new Date(now.getTime() + SLA_HOURS[payload.priority] * 3600 * 1000)),
      created_at: toISO8601(now),
      accepted_at: null,
      finished_at: null,
      closed_at: null,
      finish_note: null,
      accept_note: null,
    }
    db.unshift(order)
    return order
  }
  const { data } = await request.post<WorkOrder>('/workorders', payload)
  return data
}

export async function acceptWorkOrder(id: number, actor: Actor): Promise<WorkOrder> {
  if (isMockEnabled('workorder')) {
    await delay()
    const o = find(id)
    if (actor.role !== 'admin' && o.assignee_id !== actor.id) httpError(403, '仅负责人或管理员可接单')
    if (o.status !== 'pending') httpError(400, '当前状态不可接单')
    o.status = 'processing'
    o.accepted_at = toISO8601(new Date())
    return { ...o }
  }
  const { data } = await request.post<WorkOrder>(`/workorders/${id}/accept`)
  return data
}

export async function completeWorkOrder(id: number, finishNote: string, actor: Actor): Promise<WorkOrder> {
  if (isMockEnabled('workorder')) {
    await delay()
    const o = find(id)
    if (o.assignee_id !== actor.id) httpError(403, '仅负责人可完成')
    if (o.status !== 'processing') httpError(400, '当前状态不可完成')
    o.status = 'accepting'
    o.finished_at = toISO8601(new Date())
    o.finish_note = finishNote
    return { ...o }
  }
  const { data } = await request.post<WorkOrder>(`/workorders/${id}/complete`, { finish_note: finishNote })
  return data
}

export async function approveWorkOrder(
  id: number,
  pass: boolean,
  acceptNote: string,
  actor: Actor,
): Promise<WorkOrder> {
  if (isMockEnabled('workorder')) {
    await delay()
    const o = find(id)
    if (actor.role !== 'admin') httpError(403, '仅管理员可审批')
    if (o.status !== 'accepting') httpError(400, '当前状态不可审批')
    o.accept_note = acceptNote
    if (pass) {
      o.status = 'closed'
      o.closed_at = toISO8601(new Date())
    } else {
      o.status = 'processing'
      o.finished_at = null
    }
    return { ...o }
  }
  const { data } = await request.post<WorkOrder>(`/workorders/${id}/approve`, { pass, accept_note: acceptNote })
  return data
}