<template>
  <div class="assistant-page">
    <div class="sessions">
      <div class="s-head">
        <span>会话</span>
        <el-button size="small" type="primary" plain @click="newSession">新建</el-button>
      </div>
      <div
        v-for="s in sessions"
        :key="s.id"
        class="s-item"
        :class="{ active: s.id === sessionId }"
        @click="switchSession(s.id)"
      >
        <span class="s-title">{{ s.title || '新会话' }}</span>
        <el-button link type="danger" size="small" @click.stop="removeSession(s.id)">删</el-button>
      </div>
    </div>

    <div class="chat">
      <div ref="msgBox" class="messages">
        <div v-for="(m, i) in messages" :key="i" class="msg" :class="m.role">
          <div class="bubble">
            <MarkdownView v-if="m.role === 'assistant'" :content="m.content" />
            <template v-else>{{ m.content }}</template>
          </div>
        </div>
        <div v-if="streaming" class="msg assistant">
          <div class="bubble">
            <MarkdownView :content="streamText || '…'" />
          </div>
        </div>
      </div>
      <div class="input">
        <el-input
          v-model="draft"
          type="textarea"
          :autosize="{ minRows: 2, maxRows: 8 }"
          placeholder="输入问题，例如：上月 SO₂ 最大值是多少？ (Enter 发送，Shift+Enter 换行)"
          @keydown.enter.exact.prevent="send"
        />
        <el-button type="primary" :loading="streaming" @click="send">发送</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import MarkdownView from '../../components/MarkdownView.vue'
import { createSession, deleteSession, listMessages, listSessions } from '../../api/assistant'
import { streamChat } from '../../utils/sse'
import type { ChatMessage, ChatSession } from '../../types'

const sessions = ref<ChatSession[]>([])
const sessionId = ref<number>(0)
const messages = ref<ChatMessage[]>([])
const draft = ref('')
const streaming = ref(false)
const streamText = ref('')
const msgBox = ref<HTMLElement>()

async function loadSessions() {
  sessions.value = await listSessions()
  if (sessions.value.length && !sessionId.value) {
    await switchSession(sessions.value[0].id)
  }
}

async function switchSession(id: number) {
  sessionId.value = id
  messages.value = await listMessages(id)
  scrollBottom()
}

async function newSession() {
  const { id } = await createSession(`会话 ${sessions.value.length + 1}`)
  sessions.value.unshift({ id, title: `会话 ${sessions.value.length + 1}`, created_at: new Date().toISOString().slice(0, 19) })
  await switchSession(id)
}

async function removeSession(id: number) {
  await deleteSession(id)
  sessions.value = sessions.value.filter((s) => s.id !== id)
  if (sessionId.value === id) {
    sessionId.value = 0
    messages.value = []
    if (sessions.value.length) await switchSession(sessions.value[0].id)
  }
}

async function send() {
  const text = draft.value.trim()
  if (!text || streaming.value) return
  if (!sessionId.value) await newSession()
  draft.value = ''
  messages.value.push({ role: 'user', content: text })
  streaming.value = true
  streamText.value = ''
  scrollBottom()
  try {
    await streamChat(sessionId.value, text, (t) => { streamText.value += t; scrollBottom() }, () => {
      messages.value.push({ role: 'assistant', content: streamText.value })
      streamText.value = ''
    })
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '助手暂不可用')
    if (streamText.value) {
      messages.value.push({ role: 'assistant', content: streamText.value + '\n\n[回复中断]' })
      streamText.value = ''
    }
  } finally {
    streaming.value = false
    scrollBottom()
  }
}

function scrollBottom() {
  nextTick(() => {
    if (msgBox.value) msgBox.value.scrollTop = msgBox.value.scrollHeight
  })
}

onMounted(loadSessions)
</script>

<style scoped>
.assistant-page { display: flex; gap: 12px; height: 100%; min-height: 0; min-width: 0; }
.sessions { flex: 0 0 clamp(180px, 20vw, 260px); background: #fff; border-radius: 6px; padding: 10px; overflow-y: auto; }
.s-head { display: flex; justify-content: space-between; align-items: center; font-weight: 600; margin-bottom: 10px; }
.s-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; border-radius: 4px; cursor: pointer; margin-bottom: 4px; }
.s-item:hover { background: #f5f7fa; }
.s-item.active { background: #ecf5ff; color: #409eff; }
.s-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.chat { flex: 1; min-width: 0; min-height: 0; background: #fff; border-radius: 6px; display: flex; flex-direction: column; }
.messages { flex: 1; min-height: 0; overflow-y: auto; padding: 16px; }
.msg { display: flex; margin-bottom: 12px; }
.msg.user { justify-content: flex-end; }
.bubble { max-width: min(78%, 72ch); min-width: 0; overflow-wrap: anywhere; padding: 10px 14px; border-radius: 10px; background: #f4f4f5; }
.msg.user .bubble { background: #409eff; color: #fff; }
.input { display: flex; gap: 10px; padding: 12px; border-top: 1px solid #ebeef5; align-items: flex-end; }
.input :deep(.el-textarea) { flex: 1; min-width: 0; }
@media (max-width: 700px) {
  .assistant-page { flex-direction: column; }
  .sessions { flex: 0 0 auto; max-height: 130px; }
  .chat { min-height: 0; }
  .bubble { max-width: 92%; }
}
</style>
