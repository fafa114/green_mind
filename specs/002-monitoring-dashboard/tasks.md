# Tasks: 监控大屏（002）

**Input**: specs/002-monitoring-dashboard/（spec/plan/contracts）
**Tests**: 规格未要求自动化测试；验收用无头浏览器 + npm run build + 控制台零报错。

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup
- [x] T001 扩展 frontend/src/api/types.ts：新增 AlarmLevel/AlarmStatus/Alarm/AlarmDiagnosis/AlarmStreamEvent/ReplayState 类型与级别/状态枚举常量

## Phase 2: Foundational（共享底座）
- [x] T002 实现 frontend/src/utils/sse.ts：subscribeAlarms(onEvent) 返回 unsubscribe；mock 用定时推送，真实用 EventSource('/api/alarms/stream')，按 isMockEnabled('alarm') 分流
- [x] T003 实现 frontend/src/stores/alarm.ts：横幅队列（≤3，FIFO）、连接状态、断线自动重连、告警去重（按 id）、start/stop
- [x] T004 [P] 实现 frontend/src/components/LevelTag.vue：黄/橙/红级别色标（props level）
- [x] T005 扩展 frontend/src/components/MetricCard.vue：limit 可选，无 limit 时显示参考值且不做超标判定（炉温/流量卡）
- [x] T006 扩展 frontend/src/components/TrendChart.vue：props 命名 series/limits，新增炉温/流量右轴序列

## Phase 3: US1 监控总览 (P1)
- [x] T007 [US1] 重写 frontend/src/views/dashboard/DashboardView.vue：7 指标卡（5 污染物 + 炉温 + 流量）+ 工况徽标 + 设备选择联动
- [x] T008 [US1] 大屏双轴 24h 趋势：五污染物折线 + 标准虚线 + 炉温/流量右轴

## Phase 4: US2 时间回放 (P1)
- [x] T009 [P] [US2] 实现 frontend/src/components/ReplayControls.vue：时间滑块（起止标注）+ 播放/暂停 + 倍速 1×/10×/60× + "历史回放"标识
- [x] T010 [US2] 大屏接入回放：拖动/播放以 as_of 调 fetchLatest 刷新指标卡，切换设备重置时钟，刷新节流

## Phase 5: US3 SSE 告警横幅 (P2)
- [x] T011 [P] [US3] 实现 frontend/src/components/AlarmBanner.vue：顶部横幅队列（级别色 + 设备 + 污染物 + 摘要），点击跳 /alarms
- [x] T012 [US3] 大屏挂载 AlarmBanner + 启动 alarm store；断线重连、队列≤3、viewer 只读

## Phase 6: Polish
- [x] T013 [P] npm run build 通过；无头浏览器实测桌面/移动/回放/横幅/设备切换，控制台零报错
- [x] T014 更新 specs/002 quickstart 验证记录；勾选 tasks

## Dependencies
Setup → Foundational → US1 → US2 → US3 → Polish。T004/T009/T011 可并行（不同文件）。
MVP = US1（监控总览）。