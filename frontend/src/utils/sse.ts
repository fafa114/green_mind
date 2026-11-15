import type { AlarmEvent, ChatMessage } from '../types'
import { useUserStore } from '../stores/user'

export interface AlarmStreamHandlers {
  onAlarm: (event: AlarmEvent) => void
  onOpen?: () => void
  onClose?: () => void
}

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
const REAL_MODULES = (import.meta.env.VITE_REAL_MODULES || '').split(',').map((s: string) => s.trim()).filter(Boolean)

export function useReal(module: string): boolean {
  return !USE_MOCK || REAL_MODULES.includes(module)
}

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

/** 助手聊天：POST SSE（token 事件追加，done 结束）。mock 用分段文本模拟流式。 */
export async function streamChat(
  sessionId: number,
  message: string,
  onToken: (text: string) => void,
  onDone: (messageId: number) => void,
): Promise<void> {
  if (!useReal('assistant')) {
    const replies = [
      '上月 SO₂ 折算浓度最大值为 96.2 mg/m³（标准 80 mg/m³），出现在 10 月 20 日 14:00，持续约 40 分钟后回落，建议关注布袋除尘器压差。',
      '近 30 天共产生告警 18 条：黄色 11、橙色 5、红色 2；红色告警集中在 CEMS-01 颗粒物通道，建议优先检查采样管路。',
      '当前 2 台设备健康度：CEMS-01 为 72 分（校准逾期 35 天是主要扣分项），CEMS-02 为 91 分。建议尽快安排 CEMS-01 校准。',
      '根据近 24 小时数据，各污染物浓度平稳，无超标风险。炉温均值 941℃，处于正常区间。',
    ]
    const text = message.includes('SO') || message.includes('so2') ? replies[0]
      : message.includes('告警') ? replies[1]
      : message.includes('健康') ? replies[2]
      : replies[3]
    let acc = ''
    for (const ch of text) {
      acc += ch
      onToken(ch)
      await new Promise((r) => setTimeout(r, 18))
    }
    onDone(Date.now())
    return
  }

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
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) {
      if (line.startsWith('event:token')) { (window as any).__sseKind = 'token' }
      if (line.startsWith('event:done')) { (window as any).__sseKind = 'done' }
      if (line.startsWith('data:')) {
        try {
          const data = JSON.parse(line.slice(5))
          if ((window as any).__sseKind === 'token' && data.text) onToken(data.text)
          if ((window as any).__sseKind === 'done' && data.message_id) onDone(data.message_id)
        } catch { /* 忽略坏包 */ }
      }
    }
  }
}

export type { ChatMessage }
