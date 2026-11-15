import { request } from '@/utils/request'
import { isMockEnabled, delay } from '@/api/mock'
import { toISO8601 } from '@/utils/format'
import type { Inspection, ChecklistItem, Page, Role } from '@/api/types'
import { createWorkOrder } from '@/api/workorder'
import mockInspection from '@/api/mock/inspection.json'

const db = mockInspection.inspections as Inspection[]
let nextId = 100

export interface Actor {
  id: number
  role: Role
}

function httpError(status: number, detail: string): never {
  throw Object.assign(new Error(detail), { response: { status, data: { detail } } })
}

/** POST /api/upload（mock 返回可回显 objectURL） */
export async function uploadFile(file: Blob): Promise<{ path: string }> {
  if (isMockEnabled('inspection')) {
    await delay(200)
    return { path: URL.createObjectURL(file) }
  }
  const form = new FormData()
  form.append('file', file)
  const { data } = await request.post<{ path: string }>('/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export interface InspectionPayload {
  device_code: string
  checklist: ChecklistItem[]
  photos: string[]
  signature_path: string
  abnormal_desc: string | null
}

/** POST /api/inspections（任一异常自动建 medium 工单） */
export async function submitInspection(
  payload: InspectionPayload,
  actor: Actor,
): Promise<{ id: number; workorder_id: number | null }> {
  if (isMockEnabled('inspection')) {
    await delay(500)
    if (actor.role === 'viewer') httpError(403, '查看者不可提交巡检')
    if (!payload.signature_path) httpError(400, '签名必填')
    const abnormal = payload.checklist.some((c) => !c.ok)
    let workorder_id: number | null = null
    if (abnormal) {
      const order = await createWorkOrder(
        {
          device_id: payload.device_code,
          title: `巡检异常：${payload.device_code}`,
          description: payload.abnormal_desc || '巡检发现异常项，请核查处置。',
          priority: 'medium',
        },
        actor,
      )
      workorder_id = order.id
    }
    const now = toISO8601(new Date())
    const rec: Inspection = {
      id: nextId++,
      device_id: payload.device_code,
      inspector_id: actor.id,
      checkin_time: now,
      checklist: payload.checklist,
      photos: payload.photos,
      signature_path: payload.signature_path,
      abnormal_desc: payload.abnormal_desc,
      workorder_id,
      created_at: now,
    }
    db.unshift(rec)
    return { id: rec.id, workorder_id }
  }
  const { data } = await request.post<{ id: number; workorder_id: number | null }>('/inspections', payload)
  return data
}

export async function fetchInspections(deviceId?: string, page = 1, page_size = 10): Promise<Page<Inspection>> {
  if (isMockEnabled('inspection')) {
    await delay()
    let rows = [...db]
    if (deviceId) rows = rows.filter((i) => i.device_id === deviceId)
    rows.sort((a, b) => b.checkin_time.localeCompare(a.checkin_time))
    const total = rows.length
    return { items: rows.slice((page - 1) * page_size, page * page_size).map((r) => ({ ...r })), total, page, page_size }
  }
  const { data } = await request.get<Page<Inspection>>('/inspections', { params: { device_id: deviceId, page, page_size } })
  return data
}

export async function fetchInspection(id: number): Promise<Inspection> {
  if (isMockEnabled('inspection')) {
    await delay()
    const r = db.find((x) => x.id === id)
    if (!r) httpError(404, '巡检记录不存在')
    return { ...r }
  }
  const { data } = await request.get<Inspection>(`/inspections/${id}`)
  return data
}