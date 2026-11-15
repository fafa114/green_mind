// 时间统一 ISO 8601（YYYY-MM-DDTHH:mm:ss）；显示层格式化。

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function toDate(iso?: string | null): Date | null {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

/** 完整日期时间：2026-11-14 08:00:00 */
export function formatDateTime(iso?: string | null): string {
  const d = toDate(iso)
  if (!d) return '--'
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** 月日时分：11-14 08:00 */
export function formatShort(iso?: string | null): string {
  const d = toDate(iso)
  if (!d) return '--'
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 仅时分：08:00（趋势图横轴） */
export function formatClock(iso?: string | null): string {
  const d = toDate(iso)
  if (!d) return '--'
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 数值格式化；null/NaN 显示占位符，不虚构 0 */
export function formatNumber(value?: number | null, digits = 1): string {
  if (value == null || Number.isNaN(value)) return '--'
  return value.toFixed(digits)
}

/** 百分比（0—1 → 0%—100%） */
export function formatPercent(ratio?: number | null, digits = 0): string {
  if (ratio == null || Number.isNaN(ratio)) return '--'
  return `${(ratio * 100).toFixed(digits)}%`
}

/** Date → ISO 8601 本地时间（YYYY-MM-DDTHH:mm:ss），用于接口时间参数 */
export function toISO8601(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}