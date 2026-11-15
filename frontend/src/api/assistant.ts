import http from '../utils/request'
import type { ChatMessage, ChatSession } from '../types'

export function listSessions(): Promise<ChatSession[]> {
  return http.get('/assistant/sessions')
}

export function createSession(title?: string): Promise<{ id: number }> {
  return http.post('/assistant/sessions', { title })
}

export function listMessages(sessionId: number): Promise<ChatMessage[]> {
  return http.get(`/assistant/sessions/${sessionId}/messages`)
}

export function deleteSession(sessionId: number): Promise<void> {
  return http.delete(`/assistant/sessions/${sessionId}`)
}
