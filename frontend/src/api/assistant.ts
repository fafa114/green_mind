import http from '../utils/request'
import { useReal } from '../utils/sse'
import type { ChatMessage, ChatSession } from '../types'
import { mockCreateSession, mockDeleteSession, mockMessages, mockSessions } from './mock/assistant'

export function listSessions(): Promise<ChatSession[]> {
  if (!useReal('assistant')) return mockSessions()
  return http.get('/assistant/sessions')
}

export function createSession(title?: string): Promise<{ id: number }> {
  if (!useReal('assistant')) return mockCreateSession(title)
  return http.post('/assistant/sessions', { title })
}

export function listMessages(sessionId: number): Promise<ChatMessage[]> {
  if (!useReal('assistant')) return mockMessages(sessionId)
  return http.get(`/assistant/sessions/${sessionId}/messages`)
}

export function deleteSession(sessionId: number): Promise<void> {
  if (!useReal('assistant')) return mockDeleteSession(sessionId)
  return http.delete(`/assistant/sessions/${sessionId}`)
}
