# Tasks: AI 助手（008）
**Tests**: 无头浏览器 + build + 控制台零报错。

## Phase 1 Setup
- [x] T001 扩展 types.ts：ChatSession/ChatMessage 类型
- [x] T002 [P] 实现 components/MarkdownView.vue：markdown-it 渲染（安全转义）

## Phase 2 Foundational
- [x] T003 实现 api/assistant.ts：sessions CRUD/messages/chatStream，isMockEnabled('assistant') 分流；mock 工具查库+流式吐字+localStorage 持久

## Phase 3 US1 流式对话 (P1)
- [x] T004 [US1] 实现 views/assistant/AssistantView.vue：会话列表（新建/删除/切换）+ 消息区（用户右/助手左 Markdown）
- [x] T005 [US1] 流式打字机 + 自动滚底 + Enter 发送/Shift+Enter 换行 + 空消息阻止

## Phase 4 US2 工具问答 (P2)
- [x] T006 [US2] 工具数据问答（SO₂ 最大值返回正确数值）+ 刷新会话保持 + 无依据如实说明

## Phase 5 Polish
- [x] T007 [P] build + 无头实测（流式/会话/工具问答/移动）零报错
- [x] T008 勾选 tasks

## Dependencies
Setup→Foundational→US1→US2→Polish。T002 可并行。MVP=US1。