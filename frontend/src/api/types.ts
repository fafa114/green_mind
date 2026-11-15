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