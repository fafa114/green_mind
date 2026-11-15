<<<<<<< HEAD
import type { AlarmEvent } from '../types'
import { useUserStore } from '../stores/user'
=======
// SSE 订阅封装（统一约定：event:alarm，data 为 JSON 字符串）。
// mock 模式用本地定时推送；真实模式用 EventSource，断线自动重连。
import { isMockEnabled } from '@/api/mock'
import type { AlarmStreamEvent, AlarmLevel, PollutantCode } from '@/api/types'
import mockAlarm from '@/api/mock/alarm.json'
>>>>>>> origin/master

type Handler = (event: AlarmStreamEvent) => void

interface MockAlarmRow {
  id: number
  level: AlarmLevel
  device_id: string
  pollutant: PollutantCode
  value: number
  reason: string
}

<<<<<<< HEAD
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
const REAL_MODULES = (import.meta.env.VITE_REAL_MODULES || '').split(',').map((s: string) => s.trim()).filter(Boolean)
=======
export function subscribeAlarms(handler: Handler): () => void {
  if (isMockEnabled('alarm')) {
    const rows = mockAlarm.alarms as MockAlarmRow[]
    let index = 0
    let seq = 9000
    let interval: number | undefined
>>>>>>> origin/master

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

<<<<<<< HEAD
/** 告警 SSE：mock 用定时器模拟，真实用 EventSource（自动重连由浏览器负责）。 */
export function connectAlarmStream(handlers: AlarmStreamHandlers): () => void {
  if (!useReal('alarms')) {
    const levels = ['yellow', 'orange', 'red'] as const
    const pollutants = ['pm', 'so2', 'nox', 'co', 'hcl']
    const timers = [setTimeout(mockTick, 15000), setInterval(mockTick, 30000)]
    handlers.onOpen?.()
    function mockTick() {
      const event: AlarmEvent = {
        id: Date.now(),
        level: levels[Math.floor(Math.random() * levels.length)],
        device_id: Math.random() > 0.5 ? 'CEMS-01' : 'CEMS-02',
        pollutant: pollutants[Math.floor(Math.random() * pollutants.length)],
        value: Math.round(Math.random() * 1000) / 10,
      }
      handlers.onAlarm(event)
    }
    return () => timers.forEach((t) => clearTimeout(t))
  }

  const token = useUserStore().token
  const es = new EventSource(`/api/alarms/stream?token=${encodeURIComponent(token)}`)
  es.addEventListener('alarm', (ev) => {
    try {
      handlers.onAlarm(JSON.parse((ev as MessageEvent).data))
    } catch { /* 忽略坏包 */ }
  })
  es.onopen = () => handlers.onOpen?.()
  es.onerror = () => handlers.onClose?.()
  return () => es.close()
}

/** 助手聊天：POST SSE，逐条解析服务端事件。 */
export async function streamChat(
  sessionId: number,
  message: string,
  onToken: (text: string) => void,
  onDone: (messageId: number) => void,
): Promise<void> {
  const res = await fetch('/api/assistant/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${useUserStore().token}`,
    },
    body: JSON.stringify({ session_id: sessionId, message }),
  })
  if (!res.ok || !res.body) {
    throw new Error(`chat failed: ${res.status}`)
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let completed = false
  const dispatch = (frame: string) => {
    const lines = frame.split('\n')
    const kind = lines.find((line) => line.startsWith('event:'))?.slice(6).trim()
    const raw = lines.filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trimStart()).join('\n')
    if (!raw) return
    const data = JSON.parse(raw)
    if (kind === 'token' && typeof data.text === 'string') onToken(data.text)
    if (kind === 'done') {
      completed = true
      onDone(data.message_id)
    }
    if (kind === 'error') throw new Error(data.detail || '助手暂不可用')
  }
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    buffer = buffer.replace(/\r\n/g, '\n')
    let boundary = buffer.indexOf('\n\n')
    while (boundary !== -1) {
      dispatch(buffer.slice(0, boundary))
      buffer = buffer.slice(boundary + 2)
      boundary = buffer.indexOf('\n\n')
    }
  }
  buffer += decoder.decode()
  if (buffer.trim()) dispatch(buffer)
  if (!completed) throw new Error('助手响应意外中断')
}
=======
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
>>>>>>> origin/master
