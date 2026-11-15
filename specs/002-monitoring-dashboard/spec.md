# Feature Specification: 监控大屏（完整版：回放 + 七指标卡 + SSE 告警横幅）

**Feature Branch**: `002-monitoring-dashboard`（P2 批次分支 `p2-monitoring-alerts-workorders`）

**Created**: 2026-11-14

**Status**: Draft

**Input**: User description: "按《GreenMind 开发规格书（执行版）》模块 1 完成监控大屏：设备选择 + 时间回放滑块 + 7 个指标卡 + 24h 双轴趋势 + 工况徽标 + SSE 告警横幅。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 监控总览视图 (Priority: P1)

工程师进入监控大屏，选择排放口后看到 7 个指标卡（颗粒物/SO₂/NOₓ/CO/HCl 五项污染物折算值对比标准值，
外加炉温与烟气流量），24 小时趋势图（五污染物折线 + 标准值虚线，炉温/流量双轴），以及当前工况徽标。
任一污染物折算值达到或超过标准值时对应指标卡红色高亮。

**Why this priority**: 监控是核心链路起点，大屏是系统门面；执行版模块 1 明确要求 7 个 MetricCard 与双轴趋势。

**Independent Test**: 演示模式下选择 CEMS-01/CEMS-02，核对 7 卡数值、超标高亮、趋势图渲染与工况徽标，无需告警/工单功能。

**Acceptance Scenarios**:

1. **Given** 已登录进入大屏，**When** 切换设备，**Then** 7 个指标卡与趋势图刷新为对应设备数据。
2. **Given** 某污染物折算值 ≥ 标准值，**When** 查看对应指标卡，**Then** 卡片红色超标态高亮。
3. **Given** 大屏趋势图，**When** 渲染完成，**Then** 显示五污染物折线、各自标准值虚线，炉温/流量在独立右轴。
4. **Given** 当前工况为 normal/startup/shutdown/fault，**When** 查看徽标，**Then** 分别显示绿/蓝/灰/红。

---

### User Story 2 - 时间回放 (Priority: P1)

用户拖动时间回放滑块，大屏指标卡与趋势图随所选历史时刻刷新（调用 latest 的 as_of 参数），
滑块两端标注数据起止时间，当前所选时刻清晰可读；提供播放/暂停与倍速（1×/10×/60×）控制回放时钟推进。

**Why this priority**: 第一期是历史回放系统，回放是区别于在线监测的核心交互；执行版模块 1 要求"时间回放滑块（拖动调 latest 的 as_of）"。

**Independent Test**: 演示模式下拖动滑块到不同时刻，指标卡数值随之变化；点击播放观察时钟自动推进、暂停停止。

**Acceptance Scenarios**:

1. **Given** 大屏加载完成，**When** 拖动回放滑块到某时刻，**Then** 指标卡刷新为该时刻（as_of）的最新值。
2. **Given** 回放时钟，**When** 点击播放并选择倍速，**Then** 时钟按倍速推进、指标卡周期刷新；暂停后停止。
3. **Given** 回放界面，**When** 查看，**Then** 明确标注"历史回放"，保留原始采样时间，不伪装成当前在线监测。

---

### User Story 3 - SSE 实时告警横幅 (Priority: P2)

大屏订阅告警 SSE 流，新告警到达时顶部弹出横幅（级别色 + 设备 + 污染物 + 摘要），横幅队列最多 3 条，
点击横幅跳转告警中心；连接断线自动重连。viewer 也能看到横幅（只读）。

**Why this priority**: 执行版模块 1 验收"告警产生后 5 秒内横幅出现"；是监控→告警链路的视觉衔接。

**Independent Test**: 演示模式下由 mock SSE 推送告警，5 秒内横幅出现、最多 3 条、点击跳转 /alarms；断开后自动重连。

**Acceptance Scenarios**:

1. **Given** 大屏已订阅 SSE，**When** 新告警推送，**Then** 5 秒内顶部出现对应级别色横幅。
2. **Given** 连续多条告警，**When** 横幅累积，**Then** 同时最多显示 3 条，旧横幅被替换。
3. **Given** 一条横幅，**When** 点击，**Then** 跳转 /alarms（可定位该告警）。
4. **Given** SSE 连接中断，**When** 网络恢复，**Then** 自动重连，不重复堆叠横幅。

---

### Edge Cases

- 回放滑块拖到无数据时刻：指标卡显示占位"--"，不虚构数值。
- 倍速 60× 时时钟推进过快：刷新节流，避免请求风暴（演示模式按本地数据推进）。
- SSE 不可用（真实模式后端停机）：横幅区静默降级，大屏其余功能不受影响。
- 切换设备时回放时钟重置到新设备数据范围。
- 炉温/流量无"标准值"概念：其指标卡显示当前值与额定参考，不做超标判定。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 大屏必须提供设备选择器，切换设备联动刷新指标卡与趋势图。
- **FR-002**: 必须显示 7 个指标卡：五污染物（折算值对比标准值、超标高亮）+ 炉温 + 烟气流量。
- **FR-003**: 必须显示 24h 趋势图：五污染物折线 + 标准值虚线，炉温/流量双轴。
- **FR-004**: 必须显示当前工况徽标（normal 绿 / startup 蓝 / shutdown 灰 / fault 红）。
- **FR-005**: 必须提供时间回放滑块，拖动调用 latest 的 as_of 刷新指标卡。
- **FR-006**: 回放必须提供播放/暂停与倍速（1×/10×/60×），并明确标注"历史回放"与原始采样时间。
- **FR-007**: 必须订阅告警 SSE（event:alarm），新告警 5 秒内出现横幅。
- **FR-008**: 告警横幅队列最多 3 条，点击跳转 /alarms；SSE 断线自动重连。
- **FR-009**: 接口错误必须可读提示，页面不崩溃；SSE 不可用时大屏其余功能正常。
- **FR-010**: 演示模式下全流程可独立运行；data/alarm 模块可各自切换真实接口。

### Key Entities

- **回放时钟**: 当前 as_of 时刻、播放状态、倍速；驱动指标卡刷新。
- **告警横幅**: 级别、设备、污染物、摘要、告警 ID；队列上限 3。
- **工况徽标**: condition_flag 到颜色/文案的映射。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 切换设备后 7 卡与趋势图 100% 正确刷新；超标卡高亮准确率 100%。
- **SC-002**: 拖动回放滑块指标卡随 as_of 刷新；播放/暂停/倍速可控。
- **SC-003**: mock 告警推送后 5 秒内横幅出现；同时横幅数 ≤ 3；点击 100% 跳转告警页。
- **SC-004**: 生产构建通过；桌面与移动布局无重叠/溢出；控制台报错数 0。

## Assumptions

- 基准为《开发规格书（执行版）》模块 1 + 第七节；技术栈与统一约定遵循宪法。
- 数据接口（C）：GET /api/data/devices|latest(as_of)|history|overview；SSE（C）：GET /api/alarms/stream。
- 演示模式用 mock 数据与 mock SSE（本地定时推送）驱动，结构与契约一致。
- 001 已交付 5 污染物卡骨架；本 feature 补齐炉温/流量卡、回放、双轴趋势、SSE 横幅。
- TrendChart props 对齐文档命名 series/limits（消解 001 的 points 命名偏差）。