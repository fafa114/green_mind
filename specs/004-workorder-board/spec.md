# Feature Specification: 智能工单（看板/表格 + SLA 倒计时 + 状态机 + 统计）

**Feature Branch**: `004-workorder-board`（P2 批次分支 `p2-monitoring-alerts-workorders`）

**Created**: 2026-11-14

**Status**: Draft

**Input**: User description: "按《GreenMind 开发规格书（执行版）》模块 4 实现工单：四列看板/表格切换 + SLA 倒计时 + 状态机操作 + 统计条 + 手动建单。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 看板与表格视图 (Priority: P1)

工程师进入工单页，默认四列看板（pending/processing/accepting/closed），卡片显示标题/设备/负责人/
SLA 倒计时（超时红色）；可切换表格视图；顶部统计条显示各状态数量与工程师负载。

**Why this priority**: 看板是工单运维主视图；SLA 倒计时是执行版模块 4 的硬性要求。

**Independent Test**: 演示模式下核对四列分布、卡片字段、SLA 倒计时每秒刷新与超时变红、看板/表格切换、统计条数值。

**Acceptance Scenarios**:

1. **Given** 工单页，**When** 加载，**Then** 四列按 status 分布，卡片显示标题/设备/负责人/SLA 倒计时。
2. **Given** 某工单 SLA 已超时且未关闭，**When** 查看卡片，**Then** 倒计时红色显示超时。
3. **Given** 看板视图，**When** 切换表格视图，**Then** 以表格展示同一批工单，可切回。
4. **Given** 顶部统计条，**When** 加载，**Then** 显示各状态数量与工程师负载（open_count）。

---

### User Story 2 - 状态机操作 (Priority: P1)

点击工单打开详情弹窗，按当前状态与角色显示操作按钮：pending→接单（assignee/admin）、
processing→完成（assignee，填 finish_note）、accepting→审批通过/驳回（admin，填 accept_note）。
closed 终态无操作。越权操作后端 403。

**Why this priority**: 状态机流转是工单闭环核心；执行版模块 4 验收"pending→closed 全流程可走通"。

**Independent Test**: 用 admin/engineer 走通 pending→accept→complete→approve→closed；驳回回到 processing；越权按钮不可见或 403。

**Acceptance Scenarios**:

1. **Given** pending 工单且当前用户为 assignee/admin，**When** 点击接单，**Then** 状态变 processing。
2. **Given** processing 工单且为 assignee，**When** 填写 finish_note 并完成，**Then** 状态变 accepting。
3. **Given** accepting 工单且为 admin，**When** 审批通过，**Then** 状态变 closed；驳回则回 processing。
4. **Given** closed 工单，**When** 打开详情，**Then** 无操作按钮（终态）。
5. **Given** viewer，**When** 查看任意工单，**Then** 无操作按钮。

---

### User Story 3 - 手动建单 (Priority: P2)

engineer/admin 可手动新建工单（设备/标题/描述/优先级），提交后出现在看板 pending 列；
viewer 无新建入口。

**Why this priority**: 补充告警自动派单之外的人工建单能力。

**Independent Test**: engineer 新建一条工单→看板 pending 列出现；viewer 无新建按钮。

**Acceptance Scenarios**:

1. **Given** engineer，**When** 填写设备/标题/描述/优先级并提交，**Then** 新工单出现在 pending 列。
2. **Given** viewer，**When** 查看工单页，**Then** 无新建入口。

---

### Edge Cases

- SLA 倒计时跨天：正确显示剩余/超时时长，每秒刷新，组件卸载清除定时器。
- 非 assignee 的 engineer 查看他人工单：接单/完成按钮不可见（仅 admin 可代操作）。
- 状态并发变更：操作后以接口返回状态为准刷新。
- 完成/审批必填备注为空：前端校验阻止提交。
- 统计条与看板数据一致性：同源刷新。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 必须提供四列看板（按 status）与表格视图切换。
- **FR-002**: 卡片必须显示标题/设备/负责人/SLA 倒计时；超时红色。
- **FR-003**: SLA 倒计时必须每秒刷新，组件卸载清除定时器。
- **FR-004**: 顶部统计条必须显示各状态数量与工程师负载。
- **FR-005**: 详情弹窗必须按状态与角色显示操作按钮（接单/完成/审批通过/驳回）。
- **FR-006**: 状态机必须遵循 pending→processing→accepting→closed，驳回 accepting→processing，closed 终态。
- **FR-007**: 完成必须填 finish_note，审批必须填 accept_note；前端校验必填。
- **FR-008**: engineer/admin 必须能手动建单（设备/标题/描述/优先级）；viewer 无入口。
- **FR-009**: 越权操作必须正确处理 403；接口错误可读提示。
- **FR-010**: 演示模式可独立运行；workorder 模块可切换真实接口。

### Key Entities

- **工单**: id、alarm_id、device_id、title、description、priority、status、assignee_id、sla_deadline、各时间戳、finish_note、accept_note。
- **统计**: by_status{pending,processing,accepting,closed}、engineer_load[{user_id,real_name,open_count}]。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 四列分布与卡片字段正确率 100%；SLA 倒计时每秒刷新、超时变红。
- **SC-002**: pending→closed 全流程可走通；驳回回 processing；越权操作被拒。
- **SC-003**: 手动建单成功出现在 pending；viewer 写入口数 0。
- **SC-004**: 生产构建通过；桌面/移动无重叠溢出；控制台报错数 0。

## Assumptions

- 基准为执行版模块 4 + 第四节统一约定；遵循宪法。
- 接口（D）：GET /api/workorders（筛选+分页）、GET/{id}、POST 建单、POST accept/complete/approve、GET stats。
- SlaCountdown 为本期新增公共组件；优先级→SLA 时长（urgent 2h/high 8h/medium 24h/low 72h）由后端计算 deadline，前端仅倒计时。
- 演示模式 mock 工单覆盖四状态、超时/未超时、不同 assignee，含告警关联单。