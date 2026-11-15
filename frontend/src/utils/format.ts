export function fmtTime(iso?: string | null): string {
  if (!iso) return '--'
  return iso.replace('T', ' ').slice(0, 19)
}

export function fmtDate(iso?: string | null): string {
  if (!iso) return '--'
  return iso.slice(0, 10)
}

export function levelName(level: string): string {
  return { yellow: '黄色', orange: '橙色', red: '红色' }[level] || level
}

export function alarmStatusName(status: string): string {
  return { pending: '待确认', acked: '已确认', closed: '已关闭' }[status] || status
}

export function woStatusName(status: string): string {
  return { pending: '待接单', processing: '处理中', accepting: '待验收', closed: '已关闭' }[status] || status
}

export function priorityName(priority: string): string {
  return { low: '低', medium: '中', high: '高', urgent: '紧急' }[priority] || priority
}

export function conditionName(flag?: string): string {
  return { normal: '正常', startup: '启动', shutdown: '停运', fault: '故障' }[flag || ''] || flag || '--'
}

export function roleName(role: string): string {
  return { admin: '管理员', engineer: '工程师', viewer: '查看者' }[role] || role
}

export function pollutantName(key: string): string {
  return { pm: '颗粒物', so2: 'SO₂', nox: 'NOₓ', co: 'CO', hcl: 'HCl' }[key] || key
}

export function formatNumber(v?: number | null, digits = 2): string {
  if (v === null || v === undefined) return '--'
  return Number(v).toFixed(digits)
}
