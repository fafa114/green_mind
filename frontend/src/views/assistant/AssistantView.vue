<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppIcon from '@/components/AppIcon.vue'
import MarkdownView from '@/components/MarkdownView.vue'
import { fetchSessions, createSession, deleteSession, fetchMessages, chatStream } from '@/api/assistant'
import { useUserStore } from '@/stores/user'
import type { ChatSession, ChatMessage } from '@/api/types'
import { formatDateTime } from '@/utils/format'

const user = useUserStore()
const userId = computed(() => user.user?.id ?? 0)

const sessions = ref<ChatSession[]>([])
const activeId = ref<number | null>(null)
const messages = ref<ChatMessage[]>([])
const input = ref('')
const streaming = ref(false)
const streamText = ref('')
const loadingMsgs = ref(false)
const showSessions = ref(false)
const msgEl = ref<HTMLDivElement | null>(null)
let cancelStream: (() => void) | null = null
let localMsgId = -1

const activeSession = computed(() => sessions.value.find((s) => s.id === activeId.value))
const suggestions = ['上月 SO₂ 最大值是多少？', '近 30 天告警数量', 'CEMS-01 设备健康度', '月度报告摘要']

function scrollBottom(): void {
  nextTick(() => {
    if (msgEl.value) msgEl.value.scrollTop = msgEl.value.scrollHeight
  })
}

async function loadSessions(selectFirst = true): Promise<void> {
  sessions.value = await fetchSessions(userId.value)
  if (selectFirst && sessions.value.length && activeId.value == null) {
    await selectSession(sessions.value[0].id)
  }
}

async function selectSession(id: number): Promise<void> {
  cancelStream?.()
  streaming.value = false
  streamText.value = ''
  activeId.value = id
  showSessions.value = false
  loadingMsgs.value = true
  try {
    messages.value = await fetchMessages(userId.value, id)
  } finally {
    loadingMsgs.value = false
    scrollBottom()
  }
}

async function newSession(): Promise<void> {
  const { id } = await createSession(userId.value)
  await loadSessions(false)
  await selectSession(id)
}

async function removeSession(id: number): Promise<void> {
  try {
    await ElMessageBox.confirm('确认删除该会话及其消息？', '删除会话', { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' })
  } catch {
    return
  }
  await deleteSession(userId.value, id)
  if (activeId.value === id) {
    activeId.value = null
    messages.value = []
  }
  await loadSessions()
}

async function ensureSession(): Promise<number> {
  if (activeId.value != null) return activeId.value
  const { id } = await createSession(userId.value)
  await loadSessions(false)
  activeId.value = id
  return id
}

async function send(text?: string): Promise<void> {
  const content = (text ?? input.value).trim()
  if (!content || streaming.value) return
  const sid = await ensureSession()
  input.value = ''
  messages.value.push({ id: localMsgId--, session_id: sid, role: 'user', content, created_at: new Date().toISOString() })
  scrollBottom()
  streaming.value = true
  streamText.value = ''
  cancelStream = chatStream({
    userId: userId.value,
    sessionId: sid,
    message: content,
    onToken: (t) => {
      streamText.value += t
      scrollBottom()
    },
    onDone: () => {
      streaming.value = false
      messages.value.push({ id: localMsgId--, session_id: sid, role: 'assistant', content: streamText.value, created_at: new Date().toISOString() })
      streamText.value = ''
      cancelStream = null
      void loadSessions(false)
      scrollBottom()
    },
    onError: () => {
      streaming.value = false
      ElMessage.error('助手暂不可用，请稍后重试')
    },
  })
}

function onKey(e: KeyboardEvent): void {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    void send()
  }
}

onMounted(() => {
  void loadSessions()
})
onBeforeUnmount(() => cancelStream?.())
</script>

<template>
  <div class="assistant-page">
    <!-- 会话列表 -->
    <aside class="sess-panel" :class="{ open: showSessions }">
      <div class="sess-head">
        <span class="sess-title">会话</span>
        <el-button type="primary" size="small" class="new-btn" @click="newSession">
          <AppIcon name="spark" :size="15" /><span style="margin-left: 5px">新建</span>
        </el-button>
      </div>
      <div class="sess-list">
        <div
          v-for="s in sessions"
          :key="s.id"
          class="sess-item"
          :class="{ active: s.id === activeId }"
          @click="selectSession(s.id)"
        >
          <AppIcon name="assistant" :size="16" />
          <div class="sess-text">
            <strong>{{ s.title }}</strong>
            <small>{{ formatDateTime(s.created_at) }}</small>
          </div>
          <button class="sess-del" aria-label="删除会话" @click.stop="removeSession(s.id)">
            <AppIcon name="close" :size="14" />
          </button>
        </div>
        <el-empty v-if="sessions.length === 0" description="暂无会话" :image-size="60" />
      </div>
    </aside>
    <div v-if="showSessions" class="sess-overlay" @click="showSessions = false"></div>

    <!-- 聊天区 -->
    <section class="chat-panel">
      <header class="chat-head">
        <button class="sess-toggle" @click="showSessions = !showSessions"><AppIcon name="menu" :size="20" /></button>
        <div class="chat-title">
          <span class="ai-dot"><AppIcon name="spark" :size="18" /></span>
          <div><strong>GreenMind 助手</strong><small>{{ activeSession?.title || '基于系统数据的只读问答' }}</small></div>
        </div>
        <span class="ro-tag">只读 · 数据问答</span>
      </header>

      <div ref="msgEl" v-loading="loadingMsgs" class="msg-area">
        <div v-if="messages.length === 0 && !streaming" class="chat-empty">
          <span class="empty-ico"><AppIcon name="assistant" :size="34" /></span>
          <h3>开始一段数据问答</h3>
          <p>助手只依据系统数据作答，无依据时会如实说明。</p>
          <div class="suggestions">
            <button v-for="s in suggestions" :key="s" class="sugg" @click="send(s)">{{ s }}</button>
          </div>
        </div>

        <div v-for="m in messages" :key="m.id" class="msg" :class="m.role">
          <div class="bubble" :class="m.role">
            <MarkdownView v-if="m.role === 'assistant'" :source="m.content" />
            <span v-else>{{ m.content }}</span>
          </div>
        </div>

        <div v-if="streaming" class="msg assistant">
          <div class="bubble assistant">
            <MarkdownView v-if="streamText" :source="streamText" />
            <span v-else class="thinking">思考中…</span>
            <span class="cursor"></span>
          </div>
        </div>
      </div>

      <footer class="input-area">
        <el-input
          v-model="input"
          type="textarea"
          :rows="2"
          :autosize="{ minRows: 1, maxRows: 4 }"
          placeholder="输入问题，Enter 发送，Shift+Enter 换行"
          resize="none"
          @keydown="onKey"
        />
        <el-button type="primary" class="send-btn" :disabled="streaming || !input.trim()" @click="send()">
          <AppIcon name="chevronRight" :size="18" :stroke-width="2.4" />
        </el-button>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.assistant-page { display: grid; grid-template-columns: 264px 1fr; gap: 16px; height: calc(100vh - 118px); min-height: 480px; }
.sess-panel { display: flex; flex-direction: column; background: var(--gm-surface); border: 1px solid var(--gm-line-soft); border-radius: 16px; overflow: hidden; }
.sess-head { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-bottom: 1px solid var(--gm-line-soft); }
.sess-title { font-size: 14px; font-weight: 700; color: var(--gm-ink); }
.new-btn { border-radius: 9px; }
.sess-list { flex: 1; overflow-y: auto; padding: 10px; display: grid; gap: 6px; align-content: start; }
.sess-item { display: flex; align-items: center; gap: 10px; padding: 11px 12px; border-radius: 11px; cursor: pointer; color: var(--gm-ink-faint); transition: background 0.15s ease; }
.sess-item:hover { background: var(--gm-surface-2); }
.sess-item.active { background: var(--gm-primary-soft); color: var(--gm-primary); }
.sess-text { flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.3; }
.sess-text strong { font-size: 13.5px; color: var(--gm-ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sess-item.active .sess-text strong { color: var(--gm-primary-strong); }
.sess-text small { font-size: 11px; color: var(--gm-ink-faint); }
.sess-del { border: none; background: none; cursor: pointer; color: var(--gm-ink-faint); opacity: 0; padding: 3px; }
.sess-item:hover .sess-del { opacity: 1; }
.sess-del:hover { color: var(--gm-red); }
.chat-panel { display: flex; flex-direction: column; background: var(--gm-surface); border: 1px solid var(--gm-line-soft); border-radius: 16px; overflow: hidden; min-width: 0; }
.chat-head { display: flex; align-items: center; gap: 12px; padding: 13px 18px; border-bottom: 1px solid var(--gm-line-soft); }
.sess-toggle { display: none; border: none; background: none; cursor: pointer; color: var(--gm-ink-soft); }
.chat-title { display: flex; align-items: center; gap: 11px; }
.ai-dot { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; color: #fff; background: linear-gradient(140deg, var(--gm-primary), var(--gm-primary-bright)); }
.chat-title strong { display: block; font-size: 15px; color: var(--gm-ink); }
.chat-title small { font-size: 12px; color: var(--gm-ink-faint); }
.ro-tag { margin-left: auto; font-size: 11.5px; font-weight: 600; color: var(--gm-primary); background: var(--gm-primary-soft); padding: 4px 11px; border-radius: 999px; }
.msg-area { flex: 1; overflow-y: auto; padding: 22px; display: flex; flex-direction: column; gap: 16px; background: var(--gm-surface-2); }
.chat-empty { margin: auto; text-align: center; display: grid; place-items: center; gap: 10px; max-width: 420px; }
.empty-ico { display: grid; place-items: center; width: 72px; height: 72px; border-radius: 50%; color: var(--gm-primary); background: var(--gm-primary-soft); }
.chat-empty h3 { margin: 0; font-size: 18px; color: var(--gm-ink); }
.chat-empty p { margin: 0; font-size: 13px; color: var(--gm-ink-faint); }
.suggestions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 8px; }
.sugg { border: 1px solid var(--gm-line); background: var(--gm-surface); cursor: pointer; font-size: 12.5px; color: var(--gm-ink-soft); padding: 8px 14px; border-radius: 999px; transition: all 0.15s ease; }
.sugg:hover { border-color: var(--gm-primary); color: var(--gm-primary); background: var(--gm-primary-soft); }
.msg { display: flex; }
.msg.user { justify-content: flex-end; }
.msg.assistant { justify-content: flex-start; }
.bubble { max-width: 78%; padding: 12px 16px; border-radius: 14px; font-size: 14px; line-height: 1.6; }
.bubble.user { background: linear-gradient(120deg, var(--gm-primary), var(--gm-primary-bright)); color: #fff; border-bottom-right-radius: 4px; }
.bubble.assistant { background: var(--gm-surface); border: 1px solid var(--gm-line-soft); border-bottom-left-radius: 4px; box-shadow: var(--gm-shadow-sm); }
.thinking { color: var(--gm-ink-faint); font-size: 13px; }
.cursor { display: inline-block; width: 7px; height: 15px; background: var(--gm-primary); margin-left: 3px; vertical-align: middle; animation: blink 1s steps(2) infinite; }
@keyframes blink { 50% { opacity: 0; } }
.input-area { display: flex; gap: 10px; align-items: flex-end; padding: 14px 18px; border-top: 1px solid var(--gm-line-soft); background: var(--gm-surface); }
.input-area .el-textarea { flex: 1; }
.input-area :deep(.el-textarea__inner) { border-radius: 12px; box-shadow: 0 0 0 1px var(--gm-line) inset; }
.send-btn { width: 46px; height: 46px; border-radius: 12px; flex: none; }
.sess-overlay { display: none; }
@media (max-width: 900px) {
  .assistant-page { grid-template-columns: 1fr; height: calc(100vh - 100px); }
  .sess-panel { position: fixed; left: 0; top: 0; bottom: 0; z-index: 60; width: 280px; border-radius: 0; transform: translateX(-100%); transition: transform 0.24s ease; }
  .sess-panel.open { transform: translateX(0); }
  .sess-overlay { display: block; position: fixed; inset: 0; z-index: 50; background: rgba(8, 47, 43, 0.4); }
  .sess-toggle { display: grid; place-items: center; }
  .bubble { max-width: 88%; }
}
</style>