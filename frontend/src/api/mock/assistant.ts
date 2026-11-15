import type { ChatMessage, ChatSession } from '../../types'

let nextId = 10

export function mockSessions(): Promise<ChatSession[]> {
  return new Promise((r) => setTimeout(() => r([
    { id: 1, title: 'SO₂ 超标咨询', created_at: new Date(Date.now() - 86400000).toISOString().slice(0, 19) },
    { id: 2, title: '设备健康度查询', created_at: new Date().toISOString().slice(0, 19) },
  ]), 150))
}

export function mockCreateSession(title?: string): Promise<{ id: number }> {
  return new Promise((r) => setTimeout(() => r({ id: nextId++ }), 150))
}

export function mockMessages(sessionId: number): Promise<ChatMessage[]> {
  return new Promise((r) => setTimeout(() => r([
    { id: 1, role: 'user', content: '上月 SO₂ 最大值是多少？', created_at: new Date().toISOString().slice(0, 19) },
    { id: 2, role: 'assistant', content: '上月 SO₂ 折算浓度最大值为 **96.2 mg/m³**（标准 80 mg/m³），出现在 10 月 20 日 14:00。', created_at: new Date().toISOString().slice(0, 19) },
  ]), 150))
}

export function mockDeleteSession(id: number): Promise<void> {
  return new Promise((r) => setTimeout(r, 100))
}
