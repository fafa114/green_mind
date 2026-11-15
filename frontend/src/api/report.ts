import { request } from '@/utils/request'
import { isMockEnabled, delay } from '@/api/mock'
import { toISO8601 } from '@/utils/format'
import MarkdownIt from 'markdown-it'
import type { Report, ReportListItem, ReportStats, PollutantCode, Page, Role } from '@/api/types'
import mockReport from '@/api/mock/report.json'

const reports = mockReport.reports as Report[]
let nextId = 100

export interface Actor {
  id: number
  role: Role
}

function httpError(status: number, detail: string): never {
  throw Object.assign(new Error(detail), { response: { status, data: { detail } } })
}

export async function fetchReports(page = 1, page_size = 20): Promise<Page<ReportListItem>> {
  if (isMockEnabled('report')) {
    await delay()
    const rows = [...reports].sort((a, b) => b.period.localeCompare(a.period))
    const total = rows.length
    return { items: rows.slice((page - 1) * page_size, page * page_size).map((r) => ({ id: r.id, period: r.period, generated_at: r.generated_at })), total, page, page_size }
  }
  const { data } = await request.get<Page<ReportListItem>>('/reports', { params: { page, page_size } })
  return data
}

export async function fetchReport(id: number): Promise<Report> {
  if (isMockEnabled('report')) {
    await delay()
    const r = reports.find((x) => x.id === id)
    if (!r) httpError(404, '报表不存在')
    return { ...r }
  }
  const { data } = await request.get<Report>(`/reports/${id}`)
  return data
}

const POLL_LABEL: Record<PollutantCode, string> = { pm: '颗粒物', so2: '二氧化硫', nox: '氮氧化物', co: '一氧化碳', hcl: '氯化氢' }
const POLLS: PollutantCode[] = ['pm', 'so2', 'nox', 'co', 'hcl']
const BASE: Record<PollutantCode, number> = { pm: 15, so2: 45, nox: 130, co: 28, hcl: 12 }

function buildStats(): ReportStats {
  const pollutants = {} as ReportStats['pollutants']
  for (const p of POLLS) {
    pollutants[p] = {
      max: Number((BASE[p] * (1.2 + Math.random() * 0.5)).toFixed(1)),
      avg: Number((BASE[p] * (0.8 + Math.random() * 0.2)).toFixed(1)),
      exceed_hours: Math.floor(Math.random() * 6),
    }
  }
  const total = 12 + Math.floor(Math.random() * 6)
  return {
    pollutants,
    alarm_by_level: { yellow: 8 + Math.floor(Math.random() * 5), orange: 3 + Math.floor(Math.random() * 3), red: 1 + Math.floor(Math.random() * 2) },
    workorder: { total, completed: total - Math.floor(Math.random() * 3), on_time_rate: Number((0.8 + Math.random() * 0.18).toFixed(2)) },
    inspection_count: 8 + Math.floor(Math.random() * 6),
    avg_health: Math.floor(78 + Math.random() * 15),
  }
}

function buildMarkdown(period: string, stats: ReportStats): string {
  const rows = POLLS.map((p) => `| ${POLL_LABEL[p]} | ${stats.pollutants[p].max} | ${stats.pollutants[p].avg} | ${stats.pollutants[p].exceed_hours} |`).join('\n')
  const a = stats.alarm_by_level
  return `# ${period} 月度排放监控报告

## 一、数据概述
本报告覆盖 ${period} 全月 CEMS 监测数据。五项污染物折算浓度统计如下（单位 mg/m³）：

| 污染物 | 最大值 | 平均值 | 超标小时数 |
|---|---|---|---|
${rows}

## 二、超标事件说明
本月共产生告警 ${a.yellow + a.orange + a.red} 条，其中黄色 ${a.yellow} 条、橙色 ${a.orange} 条、红色 ${a.red} 条，已按规则触发处置流程。

## 三、设备运行情况
本月工单共 ${stats.workorder.total} 单，完成 ${stats.workorder.completed} 单，按时完成率 ${(stats.workorder.on_time_rate * 100).toFixed(0)}%；巡检 ${stats.inspection_count} 次；设备平均健康分 ${stats.avg_health}。

## 四、改进建议
1. 加强除尘器压差监控，预防颗粒物超标。
2. 优化 SNCR 喷氨控制，降低氮氧化物波动。
3. 按期完成 CEMS 校准，确保数据有效性。
`
}

export async function generateReport(period: string, actor: Actor): Promise<Report> {
  if (isMockEnabled('report')) {
    await delay(900)
    if (actor.role !== 'admin') httpError(403, '仅管理员可生成报表')
    if (reports.some((r) => r.period === period)) httpError(400, '该月份报表已存在')
    const stats = buildStats()
    const r: Report = { id: nextId++, period, stats, content_md: buildMarkdown(period, stats), generated_at: toISO8601(new Date()) }
    reports.push(r)
    return { ...r }
  }
  const { data } = await request.post<Report>('/reports/generate', { period })
  return data
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function statsTableHtml(stats: ReportStats): string {
  const rows = POLLS.map((p) => `<tr><td>${POLL_LABEL[p]}</td><td>${stats.pollutants[p].max}</td><td>${stats.pollutants[p].avg}</td><td>${stats.pollutants[p].exceed_hours}</td></tr>`).join('')
  return `<table border="1" cellspacing="0" cellpadding="6"><tr><th>污染物</th><th>最大值</th><th>平均值</th><th>超标小时数</th></tr>${rows}</table>`
}

/** 导出：mock 生成可打开 .xls / 打印预览 PDF；真实下载后端文件。 */
export async function exportReport(report: Report, format: 'pdf' | 'excel'): Promise<void> {
  if (!isMockEnabled('report')) {
    const resp = await request.get(`/reports/${report.id}/export`, { params: { format }, responseType: 'blob' })
    triggerDownload(resp.data as Blob, `${report.period}.${format === 'pdf' ? 'pdf' : 'xlsx'}`)
    return
  }
  await delay(200)
  if (format === 'excel') {
    const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body><h2>${report.period} 月度排放监控报表</h2>${statsTableHtml(report.stats)}<p>告警：黄 ${report.stats.alarm_by_level.yellow} / 橙 ${report.stats.alarm_by_level.orange} / 红 ${report.stats.alarm_by_level.red}</p><p>工单总数 ${report.stats.workorder.total}，完成 ${report.stats.workorder.completed}，按时率 ${(report.stats.workorder.on_time_rate * 100).toFixed(0)}%</p></body></html>`
    triggerDownload(new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel' }), `${report.period}_report.xls`)
    return
  }
  // PDF：打开打印预览窗口（浏览器另存为 PDF）
  const md = new MarkdownIt({ html: false })
  const body = md.render(report.content_md)
  const w = window.open('', '_blank', 'width=820,height=920')
  if (!w) return
  w.document.write(`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>${report.period} 报告</title>
<style>body{font-family:'PingFang SC','Microsoft YaHei',sans-serif;color:#10312c;max-width:760px;margin:32px auto;padding:0 24px;line-height:1.7}
h1{font-size:24px;border-bottom:2px solid #d7efe9;padding-bottom:10px}h2{font-size:18px;border-left:4px solid #0f766e;padding-left:10px;margin-top:26px}
table{border-collapse:collapse;width:100%}th{background:#d7efe9}th,td{border:1px solid #d9e6e0;padding:8px 12px;text-align:left}
.toolbar{position:sticky;top:0;background:#fff;padding:12px 0;border-bottom:1px solid #eee;margin-bottom:20px}
button{background:#0f766e;color:#fff;border:none;padding:10px 20px;border-radius:8px;font-size:14px;cursor:pointer}
@media print{.toolbar{display:none}}</style></head>
<body><div class="toolbar"><button onclick="window.print()">打印 / 另存为 PDF</button></div>${body}</body></html>`)
  w.document.close()
}