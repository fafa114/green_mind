# Implementation Plan: AI 助手（008）

**Branch**: `p3-p4-remaining-features` | **Date**: 2026-11-14 | **Spec**: [spec.md](./spec.md)

## Summary
实现执行版模块 8：会话列表（新建/删除/切换，按用户隔离）+ 消息区（用户右/助手左，Markdown）+
流式打字机（SSE token/done）+ Enter 发送/Shift+Enter 换行 + 自动滚底 + 工具数据问答 + 刷新保持。
新增 MarkdownView（markdown-it），009 复用。mock 助手模拟工具查库流式输出。

## Technical Context
TS5 + Vue3；锁定栈（markdown-it/element-plus/axios）无新增；mock 会话内存+localStorage 持久；
测试=无头+build+零报错；桌面+移动；仅 frontend/。

## Constitution Check
I（模块8+5.5）PASS；II（markdown-it 锁定）PASS；III PASS；IV PASS；V PASS；VI PASS；VII PASS。Post-design PASS。

## Project Structure
```
frontend/src/
├── api/assistant.ts            # sessions CRUD/messages/chat(SSE)
├── components/MarkdownView.vue # markdown-it 渲染
└── views/assistant/AssistantView.vue  # 会话列表+消息区+流式输入
```
**Structure Decision**: 复用 sse 思路但 chat 用 fetch+ReadableStream/mock 定时吐字；MarkdownView 通用。

## Complexity Tracking
无违规。