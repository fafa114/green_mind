import { request } from '@/utils/request'
import { isMockEnabled, delay } from '@/api/mock'
import { toISO8601 } from '@/utils/format'
import type { ChatSession, ChatMessage, PollutantCode } from '@/api/types'
import mockData from '@/api/mock/data.json'
import mockAlarm from '@/api/mock/alarm.json'
import mockDevice from '@/api/mock/device.json'

const POLL_LABEL: Record<string, string> = { pm: '颗粒物', so2: 'SO₂', nox: 'NOₓ', co: 'CO', hcl: 'HCl' }

interface Store {
  sessions: ChatSession[]
  messages: ChatMessage[]
  nextSession: number
  nextMsg: number
}

function storageKey(userId: number): string {
  return `gm_assistant_${userId}`
}

function seed(): Store {
  const now = toISO8601(new Date())
  return {
    sessions: [{ id: 1, title: '欢迎使用助手', created_at: now }],
    messages: [
      {
        id: 1, session_id: 1, role: 'assistant',
        content: '你好！我是 **GreenMind 智能助手**，基于系统数据回答问题。可以试着问我：\n\n- 上月 **SO₂ 最大值**是多少？\n- 近 30 天**告警数量**\n- CEMS-01 的**设备健康度**\n- 生成**月度报告**摘要\n\n我只依据系统数据作答，无依据时会如实说明。',
        created_at: now,
      },
    ],
    nextSession: 2,
    nextMsg: 2,
  }
}

function load(userId: number): Store {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (raw) return JSON.parse(raw) as Store
  } catch {
    // 损坏则重建
  }
  const s = seed()
  localStorage.setItem(storageKey(userId), JSON.stringify(s))
  return s
}
function save(userId: number, s: Store): void {
  localStorage.setItem(storageKey(userId), JSON.stringify(s))
}

export async function fetchSessions(userId: number): Promise<ChatSession[]> {
  if (isMockEnabled('assistant')) {
    await delay(150)
    return load(userId).sessions.map((s) => ({ ...s }))
  }
  const { data } = await request.get<ChatSession[]>('/assistant/sessions')
  return data
}

export async function createSession(userId: number, title?: string): Promise<{ id: number }> {
  if (isMockEnabled('assistant')) {
    await delay(150)
    const s = load(userId)
    const id = s.nextSession++
    s.sessions.unshift({ id, title: title || '新会话', created_at: toISO8601(new Date()) })
    save(userId, s)
    return { id }
  }
  const { data } = await request.post<{ id: number }>('/assistant/sessions', { title })
  return data
}

export async function deleteSession(userId: number, id: number): Promise<void> {
  if (isMockEnabled('assistant')) {
    await delay(150)
    const s = load(userId)
    s.sessions = s.sessions.filter((x) => x.id !== id)
    s.messages = s.messages.filter((m) => m.session_id !== id)
    save(userId, s)
    return
  }
  await request.delete(`/assistant/sessions/${id}`)
}

export async function fetchMessages(userId: number, sessionId: number): Promise<ChatMessage[]> {
  if (isMockEnabled('assistant')) {
    await delay(150)
    return load(userId).messages.filter((m) => m.session_id === sessionId).map((m) => ({ ...m }))
  }
  const { data } = await request.get<ChatMessage[]>(`/assistant/sessions/${sessionId}/messages`)
  return data
}

/* ---- mock 工具查库 ---- */
function pollutantMax(code: PollutantCode): { max: number; device: string; ts: string } {
  const hist = (mockData as unknown as { history: Record<string, { ts: string;[k: string]: unknown }[]> }).history
  let best = { max: -Infinity, device: '', ts: '' }
  const key = `${code}_std`
  for (const dev of Object.keys(hist)) {
    for (const p of hist[dev]) {
      const v = Number(p[key])
      if (v > best.max) best = { max: v, device: dev, ts: p.ts }
    }
  }
  return best
}

function answerFor(message: string): string {
  // 归一化下标化学式（SO₂→so2、NOₓ→nox），便于匹配
  const m = message.toLowerCase().replace(/₂/g, '2').replace(/ₓ/g, 'x')
  const pollMatch = (['so2', 'nox', 'pm', 'co', 'hcl'] as PollutantCode[]).find((p) => m.includes(p))
    || (/二氧化硫/.test(message) ? 'so2' : /氮氧化物/.test(message) ? 'nox' : /颗粒物/.test(message) ? 'pm' : /一氧化碳/.test(message) ? 'co' : /氯化氢/.test(message) ? 'hcl' : undefined)

  if (pollMatch && /最大|max|峰值/.test(message)) {
    const r = pollutantMax(pollMatch)
    const limit = { pm: 20, so2: 80, nox: 250, co: 80, hcl: 50 }[pollMatch]
    const over = r.max >= limit
    return `**${POLL_LABEL[pollMatch]} 最大折算浓度**为 **${r.max.toFixed(1)} mg/m³**。\n\n- 出现设备：${r.device}\n- 出现时间：${r.ts.replace('T', ' ')}\n- 标准值：${limit} mg/m³\n- 判定：${over ? '⚠️ 超过标准值' : '✅ 未超标'}\n\n> 数据来源：query_pollutant_max（历史观测库）。`
  }
  if (/告警/.test(message) && /数量|多少|几条|count/.test(message)) {
    const alarms = (mockAlarm as unknown as { alarms: { level: string }[] }).alarms
    const y = alarms.filter((a) => a.level === 'yellow').length
    const o = alarms.filter((a) => a.level === 'orange').length
    const r = alarms.filter((a) => a.level === 'red').length
    return `当前系统共 **${alarms.length} 条告警**：\n\n| 级别 | 数量 |\n|---|---|\n| 🔴 红色 | ${r} |\n| 🟠 橙色 | ${o} |\n| 🟡 黄色 | ${y} |\n\n> 数据来源：query_alarm_count。`
  }
  if (/健康|health/.test(message)) {
    const health = (mockDevice as unknown as { health: Record<string, { score: number; suggestion: string }> }).health
    const h = health['1']
    return h
      ? `**CEMS-01 设备健康分：${h.score} / 100**。\n\n${h.suggestion}\n\n> 数据来源：query_device_health。`
      : '暂无该设备健康评分。'
  }
  if (/月报|月度|报告|report/.test(message)) {
    return '已为你汇总月度报告要点：\n\n- **数据概述**：五项污染物折算浓度统计完整。\n- **超标事件**：以颗粒物与氮氧化物为主。\n- **设备运行**：工单按时完成率良好，CEMS-02 校准逾期已安排。\n- **改进建议**：加强除尘压差监控、优化喷氨、按期校准。\n\n可在「台账报表」页查看完整报告并导出 PDF/Excel。\n\n> 数据来源：generate_monthly_report。'
  }
  if (/最大|max|峰值/.test(message)) {
    const r = pollutantMax('pm')
    return `我检索了历史观测库，**颗粒物最大折算浓度 ${r.max.toFixed(1)} mg/m³**（${r.device}）。如果你想问其他污染物，请指明名称（如 SO₂、NOₓ）。`
  }
  return '我暂时无法从系统数据中找到该问题的确切依据，不便给出确定答案。\n\n你可以问我：\n- 某污染物**最大值**（如"上月 SO₂ 最大值"）\n- **告警数量**\n- **设备健康度**\n- **月度报告**摘要'
}

export interface ChatStreamOptions {
  userId: number
  sessionId: number
  message: string
  onToken: (text: string) => void
  onDone: (messageId: number) => void
  onError?: (e: unknown) => void
}

/** POST /api/assistant/chat（SSE token/done）。返回取消函数。 */
export function chatStream(opts: ChatStreamOptions): () => void {
  const { userId, sessionId, message, onToken, onDone, onError } = opts

  if (isMockEnabled('assistant')) {
    const s = load(userId)
    const userMsgId = s.nextMsg++
    s.messages.push({ id: userMsgId, session_id: sessionId, role: 'user', content: message, created_at: toISO8601(new Date()) })
    const sess = s.sessions.find((x) => x.id === sessionId)
    if (sess && sess.title === '新会话') sess.title = message.slice(0, 18)
    save(userId, s)

    const full = answerFor(message)
    const assistantId = s.nextMsg++
    let i = 0
    let acc = ''
    let cancelled = false
    const timer = window.setInterval(() => {
      if (cancelled) return
      const step = 2 + Math.floor(Math.random() * 3)
      const chunk = full.slice(i, i + step)
      i += step
      acc += chunk
      if (chunk) onToken(chunk)
      if (i >= full.length) {
        window.clearInterval(timer)
        const st = load(userId)
        st.messages.push({ id: assistantId, session_id: sessionId, role: 'assistant', content: full, created_at: toISO8601(new Date()) })
        save(userId, st)
        onDone(assistantId)
      }
    }, 24)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }

  // 真实模式：fetch + SSE 解析
  const controller = new AbortController()
  const token = JSON.parse(localStorage.getItem('gm_session') || '{}').token
  ;(async () => {
    try {
      const resp = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ session_id: sessionId, message }),
        signal: controller.signal,
      })
      const reader = resp.body?.getReader()
      if (!reader) return
      const decoder = new TextDecoder()
      let buf = ''
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() || ''
        for (const line of lines) {
          if (line.startsWith('data:')) {
            const payload = line.slice(5).trim()
            try {
              const obj = JSON.parse(payload)
              if (obj.text != null) onToken(obj.text)
              if (obj.message_id != null) onDone(obj.message_id)
            } catch {
              // 非 JSON 片段忽略
            }
          }
        }
      }
    } catch (e) {
      if (!controller.signal.aborted) onError?.(e)
    }
  })()
  return () => controller.abort()
}