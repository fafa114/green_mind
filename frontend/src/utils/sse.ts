// SSE 订阅封装（统一约定：event:alarm，data 为 JSON 字符串）。
// mock 模式用本地定时推送；真实模式用 EventSource，断线自动重连。
import { isMockEnabled } from '@/api/mock'
import type { AlarmStreamEvent, AlarmLevel, PollutantCode } from '@/api/types'
import mockAlarm from '@/api/mock/alarm.json'

type Handler = (event: AlarmStreamEvent) => void

interface MockAlarmRow {
  id: number
  level: AlarmLevel
  device_id: string
  pollutant: PollutantCode
  value: number
  reason: string
}

export function subscribeAlarms(handler: Handler): () => void {
  if (isMockEnabled('alarm')) {
    const rows = mockAlarm.alarms as MockAlarmRow[]
    let index = 0
    let seq = 9000
    let interval: number | undefined

    const emit = (): void => {
      const row = rows[index % rows.length]
      index += 1
      seq += 1
      handler({
        id: seq,
        level: row.level,
        device_id: row.device_id,
        pollutant: row.pollutant,
        value: row.value,
        summary: row.reason,
      })
    }

    // 首条 2.5 秒后出现（验收：5 秒内横幅），随后每 9 秒一条
    const first = window.setTimeout(() => {
      emit()
      interval = window.setInterval(emit, 9000)
    }, 2500)

    return () => {
      window.clearTimeout(first)
      if (interval !== undefined) window.clearInterval(interval)
    }
  }

  // 真实模式：EventSource + 断线重连
  let es: EventSource | null = null
  let retry: number | undefined
  let closed = false

  const open = (): void => {
    if (closed) return
    es = new EventSource('/api/alarms/stream')
    es.addEventListener('alarm', (ev: MessageEvent) => {
      try {
        handler(JSON.parse(ev.data) as AlarmStreamEvent)
      } catch {
        // 忽略非法 JSON
      }
    })
    es.onerror = () => {
      es?.close()
      es = null
      if (!closed) retry = window.setTimeout(open, 3000)
    }
  }
  open()

  return () => {
    closed = true
    if (retry !== undefined) window.clearTimeout(retry)
    es?.close()
    es = null
  }
}