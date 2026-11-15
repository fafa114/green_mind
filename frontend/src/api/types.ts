// 契约类型：与后端 Swagger / specs/001-frontend-foundation/contracts 逐字段一致。
// 数据结构定义见 specs/001-frontend-foundation/data-model.md。

export type Role = 'admin' | 'engineer' | 'viewer'

export interface UserInfo {
  id: number
  username: string
  real_name: string
  role: Role
}

export interface UserSession {
  token: string
  user: UserInfo
}

export interface LoginPayload {
  username: string
  password: string
}

export interface DeviceOption {
  device_id: string
  name: string
  last_ts: string
}

export type ConditionFlag = 'normal' | 'startup' | 'shutdown' | 'fault'

/** GET /api/data/latest 响应 = cems_raw 整行 */
export interface LatestObservation {
  ts: string
  device_id: string
  furnace_temp: number
  flow: number
  o2: number
  flue_temp: number
  flue_pressure: number
  flue_velocity: number
  flue_humidity: number
  pm_real: number
  pm_std: number
  pm_limit: number
  so2_real: number
  so2_std: number
  so2_limit: number
  nox_real: number
  nox_std: number
  nox_limit: number
  co_real: number
  co_std: number
  co_limit: number
  hcl_real: number
  hcl_std: number
  hcl_limit: number
  condition_flag: ConditionFlag
  report_flag: number
  comm_flag: number
  exceed_flag: number
  zero_flag: number
}

/** GET /api/data/history 元素（hour/day 取均值，污染物取 std 列） */
export interface HistoryPoint {
  ts: string
  furnace_temp: number
  flow: number
  pm_std: number
  so2_std: number
  nox_std: number
  co_std: number
  hcl_std: number
  condition_flag: ConditionFlag
}

export interface HistoryPage {
  items: HistoryPoint[]
  total: number
}

export type HistoryInterval = 'raw' | 'hour' | 'day'

export interface ApiError {
  detail: string
}

export interface Page<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

export type PollutantCode = 'pm' | 'so2' | 'nox' | 'co' | 'hcl'

export interface PollutantMeta {
  code: PollutantCode
  label: string
  formula: string
  unit: string
  /** 图表色板：色相 + 亮度均可区分 */
  color: string
}

export const POLLUTANTS: PollutantMeta[] = [
  { code: 'pm', label: '颗粒物', formula: 'PM', unit: 'mg/m³', color: '#f59e0b' },
  { code: 'so2', label: '二氧化硫', formula: 'SO₂', unit: 'mg/m³', color: '#38bdf8' },
  { code: 'nox', label: '氮氧化物', formula: 'NOₓ', unit: 'mg/m³', color: '#a78bfa' },
  { code: 'co', label: '一氧化碳', formula: 'CO', unit: 'mg/m³', color: '#34d399' },
  { code: 'hcl', label: '氯化氢', formula: 'HCl', unit: 'mg/m³', color: '#fb7185' },
]

export const ROLE_LABEL: Record<Role, string> = {
  admin: '管理员',
  engineer: '工程师',
  viewer: '查看者',
}

export const CONDITION_LABEL: Record<ConditionFlag, string> = {
  normal: '正常',
  startup: '启炉',
  shutdown: '停运',
  fault: '故障',
}

export const POLLUTANT_LABEL: Record<PollutantCode, string> = {
  pm: '颗粒物',
  so2: '二氧化硫',
  nox: '氮氧化物',
  co: '一氧化碳',
  hcl: '氯化氢',
}

/* ============================ 告警（003 / 002 SSE） ============================ */

export type AlarmLevel = 'yellow' | 'orange' | 'red'
export type AlarmStatus = 'pending' | 'acked' | 'closed'

export interface RootCause {
  cause: string
  confidence: number
}

/** 执行版 5.1 诊断输出 */
export interface AlarmDiagnosis {
  root_causes: RootCause[]
  measures: string[]
  estimated_recovery_minutes: number
  summary: string
}

export interface Alarm {
  id: number
  device_id: string
  ts: string
  level: AlarmLevel
  pollutant: PollutantCode
  value: number
  limit_val: number
  reason: string
  status: AlarmStatus
  diagnosis: AlarmDiagnosis | null
  workorder_id: number | null
  created_at: string
}

/** SSE event:alarm 的 data 结构 */
export interface AlarmStreamEvent {
  id: number
  level: AlarmLevel
  device_id: string
  pollutant: PollutantCode
  value: number
  summary: string
}

export interface AlarmFilters {
  level?: AlarmLevel | ''
  status?: AlarmStatus | ''
  device_id?: string
  start?: string
  end?: string
  page?: number
  page_size?: number
}

export const ALARM_LEVEL_LABEL: Record<AlarmLevel, string> = {
  yellow: '黄色',
  orange: '橙色',
  red: '红色',
}

export const ALARM_LEVEL_COLOR: Record<AlarmLevel, string> = {
  yellow: '#f59e0b',
  orange: '#fb923c',
  red: '#ef4444',
}

export const ALARM_STATUS_LABEL: Record<AlarmStatus, string> = {
  pending: '待处理',
  acked: '已确认',
  closed: '已关闭',
}

/* ============================ 工单（004） ============================ */

export type WorkOrderPriority = 'low' | 'medium' | 'high' | 'urgent'
export type WorkOrderStatus = 'pending' | 'processing' | 'accepting' | 'closed'

export interface WorkOrder {
  id: number
  alarm_id: number | null
  device_id: string
  title: string
  description: string
  priority: WorkOrderPriority
  status: WorkOrderStatus
  assignee_id: number | null
  sla_deadline: string
  created_at: string
  accepted_at: string | null
  finished_at: string | null
  closed_at: string | null
  finish_note: string | null
  accept_note: string | null
}

export interface EngineerLoad {
  user_id: number
  real_name: string
  open_count: number
}

export interface WorkOrderStats {
  by_status: Record<WorkOrderStatus, number>
  engineer_load: EngineerLoad[]
}

export interface WorkOrderFilters {
  status?: WorkOrderStatus | ''
  assignee_id?: number | ''
  device_id?: string
  page?: number
  page_size?: number
}

export const PRIORITY_LABEL: Record<WorkOrderPriority, string> = {
  low: '低',
  medium: '中',
  high: '高',
  urgent: '紧急',
}

export const PRIORITY_COLOR: Record<WorkOrderPriority, string> = {
  low: '#64748b',
  medium: '#0ea5e9',
  high: '#fb923c',
  urgent: '#ef4444',
}

export const WORKORDER_STATUS_LABEL: Record<WorkOrderStatus, string> = {
  pending: '待接单',
  processing: '处理中',
  accepting: '待验收',
  closed: '已关闭',
}

export const WORKORDER_STATUS_COLOR: Record<WorkOrderStatus, string> = {
  pending: '#f59e0b',
  processing: '#0ea5e9',
  accepting: '#8b5cf6',
  closed: '#16a34a',
}

/** 演示账号 ID → 姓名（与 mock/auth.json 一致，用于工单负责人显示） */
export const USER_NAME: Record<number, string> = {
  1: '系统管理员',
  2: '张工程师',
  3: '李工程师',
  4: '王查看',
}