# Feature Specification: AI 助手（008）

**Feature Branch**: `008-ai-assistant`（批次分支 `p3-p4-remaining-features`）
**Created**: 2026-11-14 | **Status**: Draft
**Input**: "按执行版模块 8 实现 AI 助手：会话列表（新建/删除/切换）+ 流式打字机问答 + Markdown 渲染 + 工具数据问答 + 刷新会话保持。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 流式对话 (Priority: P1)
用户进入助手页，左侧会话列表（新建/删除/切换），右侧消息区（用户右/助手左，Markdown 渲染）。
输入消息 Enter 发送（Shift+Enter 换行），助手回答以流式打字机逐字呈现，自动滚底。
**Why this priority**: 模块 8 核心交互，流式对话是主体。
**Independent Test**: 演示模式新建会话→发送消息→助手流式输出 Markdown→自动滚底；切换/删除会话生效。
**Acceptance Scenarios**:
1. **Given** 助手页，**When** 新建会话并发送消息，**Then** 助手流式逐字输出，Markdown 正确渲染。
2. **Given** 输入框，**When** Enter 发送 / Shift+Enter 换行，**Then** 行为正确。
3. **Given** 多会话，**When** 切换/删除，**Then** 消息区对应更新。
4. **Given** 长回答，**When** 流式输出，**Then** 自动滚动到底部。

---

### User Story 2 - 工具数据问答 (Priority: P2)
助手通过工具查库回答数据问题（如"上月 SO₂ 最大值"），返回正确数字与依据；刷新后会话与历史仍在。
**Why this priority**: 模块 8 验收"问上月 SO₂ 最大值触发工具返回正确数字"。
**Independent Test**: 问"上月 SO₂ 最大值"→回答含来自数据的正确数值；刷新后会话保留。
**Acceptance Scenarios**:
1. **Given** 数据问答，**When** 问"上月 SO₂ 最大值"，**Then** 回答含正确数值（来自查询工具）。
2. **Given** 已有会话，**When** 刷新页面，**Then** 会话与历史消息仍在。
3. **Given** 无依据问题，**When** 提问，**Then** 助手说明不确定/缺数据，不编造。

---

### Edge Cases
- 流式中切换会话：中断当前流，不串话。
- 空消息：阻止发送。
- 模型不可用：显示"助手暂不可用"，不阻塞其他页面。
- 删除当前会话：自动切到下一会话或空态。

## Requirements *(mandatory)*
### Functional Requirements
- **FR-001**: 必须提供会话列表（新建/删除/切换），按用户隔离。
- **FR-002**: 消息区必须用户右/助手左布局，助手消息 Markdown 渲染。
- **FR-003**: 必须流式打字机输出（SSE event:token 追加，event:done 结束），自动滚底。
- **FR-004**: 输入必须 Enter 发送、Shift+Enter 换行；空消息阻止。
- **FR-005**: 必须支持工具数据问答，返回基于数据的正确数值与依据。
- **FR-006**: 刷新后会话与历史必须保持。
- **FR-007**: 无依据/模型不可用必须如实说明，不编造。
- **FR-008**: 接口错误可读提示；演示模式可独立运行，assistant 模块可切真实。

### Key Entities
- **会话**: id/user_id/title/created_at；**消息**: id/session_id/role(user|assistant|tool)/content/created_at。

## Success Criteria *(mandatory)*
- **SC-001**: 流式渲染流畅不卡顿；Markdown 正确；Enter/Shift+Enter 行为正确。
- **SC-002**: "上月 SO₂ 最大值"返回正确数字；刷新会话保持 100%。
- **SC-003**: 生产构建通过；桌面/移动无重叠溢出；控制台报错 0。

## Assumptions
- 基准执行版模块 8 + 5.5；接口（C）：sessions CRUD、GET messages、POST chat（SSE token/done）。
- mock 助手模拟工具查库（query_pollutant_max 等）并流式输出含真实 mock 数值的 Markdown。
- MarkdownView 用 markdown-it（锁定栈），009 报表复用。