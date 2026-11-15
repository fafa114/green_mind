# Feature Specification: 告警中心（列表筛选 + AI 诊断抽屉 + 确认与工单联动）

**Feature Branch**: `003-alarm-center`（P2 批次分支 `p2-monitoring-alerts-workorders`）

**Created**: 2026-11-14

**Status**: Draft

**Input**: User description: "按《GreenMind 开发规格书（执行版）》模块 2 实现告警中心：筛选表格 + LevelTag + 诊断详情抽屉 + 确认 + 查看工单 + SSE 实时刷新。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 告警列表与筛选 (Priority: P1)

工程师进入告警中心，看到分页告警表格，可按级别（黄/橙/红）、状态（待处理/已确认/已关闭）、
设备、时间范围筛选；级别用 LevelTag 色标显示，列表随 SSE 新告警实时刷新。

**Why this priority**: 告警列表是运维入口，筛选与级别可视化是执行版模块 2 的基础交付。

**Independent Test**: 演示模式下用各筛选组合查询，核对结果与分页；LevelTag 颜色正确；无需诊断/工单功能。

**Acceptance Scenarios**:

1. **Given** 告警列表，**When** 选择级别=红 + 状态=待处理，**Then** 仅显示符合条件的告警，分页正确。
2. **Given** 列表，**When** 查看级别列，**Then** 黄/橙/红分别用对应色 LevelTag 显示。
3. **Given** 列表已加载，**When** SSE 推送新告警，**Then** 列表实时插入新告警（不重复）。
4. **Given** viewer 登录，**When** 查看列表，**Then** 无任何写操作入口（确认按钮不可见）。

---

### User Story 2 - 告警详情与 AI 诊断 (Priority: P1)

点击告警打开详情抽屉，展示告警值/标准值/原因，以及 AI 诊断：根因列表（每条带置信度进度条）、
处置措施、摘要、预计恢复时间。诊断未回填时显示"诊断生成中"，不虚构内容。

**Why this priority**: 诊断是告警的核心价值；执行版模块 2 要求"诊断 JSON 正确渲染"。

**Independent Test**: 演示模式下打开含 diagnosis 的告警抽屉，核对根因/置信度/措施/摘要/恢复时间渲染；无 diagnosis 时显示生成中。

**Acceptance Scenarios**:

1. **Given** 一条含 diagnosis 的告警，**When** 打开详情抽屉，**Then** 显示根因列表（≤3）+ 置信度进度条 + 处置措施 + 摘要（≤200字）+ 预计恢复时间。
2. **Given** diagnosis 为空的告警，**When** 打开抽屉，**Then** 显示"诊断生成中"占位，不显示虚构根因。
3. **Given** 置信度 0—1，**When** 渲染进度条，**Then** 宽度与百分比正确对应。

---

### User Story 3 - 确认与工单联动 (Priority: P2)

engineer/admin 可在详情抽屉点击"确认"将告警置为 acked；告警含 workorder_id 时显示"查看工单"链接，
点击跳转工单详情。viewer 无确认按钮；越权确认后端返回 403 并可读提示。

**Why this priority**: 确认与工单衔接是告警→工单链路的关键动作。

**Independent Test**: engineer 登录确认一条 pending 告警→状态变 acked；含 workorder_id 的告警显示查看工单并可跳转；viewer 无按钮。

**Acceptance Scenarios**:

1. **Given** engineer 查看 pending 告警，**When** 点击确认，**Then** 状态变 acked，列表同步更新。
2. **Given** 告警含 workorder_id，**When** 查看抽屉，**Then** 显示"查看工单"链接，点击跳转 /workorders 并定位该单。
3. **Given** viewer，**When** 查看任意告警抽屉，**Then** 无确认按钮。

---

### Edge Cases

- 诊断 JSON 字段缺失/格式异常：抽屉降级显示已有字段，不崩溃。
- 筛选无结果：显示空态提示，不报错。
- SSE 重复推送同一告警：按 ID 去重，不重复插入。
- 确认接口失败：可读错误提示，状态不回滚误显示。
- 时间范围跨午夜：按半开区间查询，避免端点重复。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 必须提供告警分页表格，支持级别/状态/设备/时间范围筛选。
- **FR-002**: 级别必须用 LevelTag（黄/橙/红）显示；状态用标签显示。
- **FR-003**: 列表必须随 SSE 新告警实时刷新并按 ID 去重。
- **FR-004**: 点击告警必须打开详情抽屉，显示告警值/标准值/原因。
- **FR-005**: 抽屉必须渲染 AI 诊断：根因列表 + 置信度进度条 + 处置措施 + 摘要 + 预计恢复时间。
- **FR-006**: diagnosis 为空时必须显示"诊断生成中"，不虚构内容。
- **FR-007**: engineer/admin 必须能确认告警（POST ack → acked）；viewer 无确认入口。
- **FR-008**: 含 workorder_id 的告警必须显示"查看工单"链接并可跳转定位。
- **FR-009**: 接口错误必须可读提示；越权操作 403 正确处理。
- **FR-010**: 演示模式可独立运行；alarm 模块可切换真实接口。

### Key Entities

- **告警**: id、device_id、ts、level、pollutant、value、limit_val、reason、status、diagnosis、workorder_id。
- **诊断**: root_causes[{cause,confidence}]、measures[]、estimated_recovery_minutes、summary。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 各筛选组合结果正确率 100%；分页交互符合统一约定。
- **SC-002**: 含诊断告警抽屉字段渲染完整率 100%；置信度进度条数值对应正确。
- **SC-003**: engineer 确认成功率 100%（状态 acked）；viewer 写入口数 0；查看工单跳转 100% 可达。
- **SC-004**: 生产构建通过；桌面/移动无重叠溢出；控制台报错数 0。

## Assumptions

- 基准为执行版模块 2 + 第四节统一约定 + 5.1 诊断输出结构；遵循宪法。
- 接口（C）：GET /api/alarms（筛选+分页）、GET /api/alarms/{id}、POST /api/alarms/{id}/ack、GET /api/alarms/stream。
- LevelTag 为本期新增公共组件；alarm store/SSE 与 002 共享。
- 演示模式 mock 告警含已回填诊断与待诊断两类样本，含/不含 workorder_id 各覆盖。