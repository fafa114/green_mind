# Contract: 助手（008 消费侧）
维护者 C。基准执行版模块 8 + 5.5。需 Bearer。

## GET /api/assistant/sessions → `[{id,title,created_at}]`（按用户隔离）
## POST /api/assistant/sessions {title?} → `{id}`
## GET /api/assistant/sessions/{id}/messages → `[{id,session_id,role(user|assistant|tool),content,created_at}]`
## DELETE /api/assistant/sessions/{id}
## POST /api/assistant/chat {session_id, message} → SSE
- event:token data:`{text}`（逐段追加）；event:done data:`{message_id}`
## 工具（5.5，C 实现查库）
query_pollutant_max / query_alarm_count / query_device_health / generate_monthly_report。
## Mock
会话/消息内存 + localStorage 持久（刷新保持）；chat 模拟工具查 mock 数据（如 SO₂ max）并定时吐字流式输出 Markdown；
VITE_REAL_MODULES=assistant 切真实（fetch SSE）。