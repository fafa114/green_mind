export interface User {
  id: number
  username: string
  real_name?: string | null
  role: 'admin' | 'engineer' | 'viewer'
}

export interface Page<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

export interface WorkOrder {
  id: number
  alarm_id: number | null
  device_id: string
  title: string
  description: string | null
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'processing' | 'accepting' | 'closed'
  assignee_id: number
  sla_deadline: string
  created_at: string
  accepted_at: string | null
  finished_at: string | null
  closed_at: string | null
  finish_note: string | null
  accept_note: string | null
}

export interface WorkOrderStats {
  by_status: { pending: number; processing: number; accepting: number; closed: number }
  engineer_load: { user_id: number; real_name: string; open_count: number }[]
}

export interface Diagnosis {
  root_causes: { cause: string; confidence: number }[]
  measures: string[]
  estimated_recovery_minutes: number
  summary: string
}

export interface Alarm {
  id: number
  device_id: string
  ts: string
  level: 'yellow' | 'orange' | 'red'
  pollutant: string
  value: number
  limit_val: number
  reason: string | null
  status: 'pending' | 'acked' | 'closed'
  diagnosis: Diagnosis | null
  workorder_id: number | null
  created_at: string
}

export interface AlarmEvent {
  id: number
  level: 'yellow' | 'orange' | 'red'
  device_id: string
  pollutant: string
  value: number
  summary?: string
}

export interface Device {
  id: number
  code: string
  name: string
  type?: string | null
  install_date?: string | null
  design_life_years?: number | null
  last_calibration_date?: string | null
  calibration_cycle_days: number
  status: 'running' | 'stopped' | 'maintenance'
  created_at: string
  latest_health?: number | null
}

export interface HealthScore {
  id: number
  device_id: string
  score: number
  factors: { name: string; impact: string }[] | null
  suggestion: string | null
  scored_at: string
}

export interface ChecklistItem { item: string; ok: boolean; note?: string | null }

export interface Inspection {
  id: number
  device_id: string
  inspector_id: number
  checkin_time: string
  checklist: ChecklistItem[] | null
  photos: string[] | null
  signature_path: string | null
  abnormal_desc: string | null
  workorder_id: number | null
  created_at: string
}

export interface Report {
  id: number
  period: string
  stats: Record<string, any> | null
  content_md: string | null
  generated_at: string
}

export interface ReportListItem { id: number; period: string; generated_at: string }

export interface CemsRow {
  ts: string
  furnace_temp?: number
  flow?: number
  o2?: number
  pm_std?: number
  so2_std?: number
  nox_std?: number
  co_std?: number
  hcl_std?: number
  pm_limit?: number
  so2_limit?: number
  nox_limit?: number
  co_limit?: number
  hcl_limit?: number
  condition_flag?: 'normal' | 'startup' | 'shutdown' | 'fault'
  [key: string]: any
}

export interface DeviceInfo { device_id: string; name: string; last_ts: string }

export interface PollutantStats { max: number | null; avg: number | null; exceed_count?: number; exceed_hours?: number }

export interface DataOverview {
  pollutants: Record<string, PollutantStats>
  alarm_count: number
}

export interface PredictionResult {
  hours: { ts: string; value: number; exceed_prob: number }[]
  drivers: string[]
  confidence: number
  experimental?: boolean
  notice?: string
}

export interface Prediction { id: number; device_id: string; pollutant: string; base_ts: string; result: PredictionResult; created_at: string }

export interface ChatSession { id: number; title: string | null; created_at: string }

export interface ChatMessage {
  id?: number
  session_id?: number
  role: 'user' | 'assistant' | 'tool'
  content: string
  created_at?: string
}

export const POLLUTANTS = [
  { key: 'pm', name: '颗粒物', unit: 'mg/m³', limit: 20 },
  { key: 'so2', name: 'SO₂', unit: 'mg/m³', limit: 80 },
  { key: 'nox', name: 'NOₓ', unit: 'mg/m³', limit: 250 },
  { key: 'co', name: 'CO', unit: 'mg/m³', limit: 100 },
  { key: 'hcl', name: 'HCl', unit: 'mg/m³', limit: 10 },
] as const
