# Tasks: 告警中心（003）

**Input**: specs/003-alarm-center/
**Tests**: 无头浏览器 + npm run build + 控制台零报错。

## Phase 1: Setup
- [x] T001 [P] 创建 frontend/src/api/mock/alarm.json：≥8 条样本覆盖级别/状态/含诊断/含工单（结构见 contracts/alarm.md）

## Phase 2: Foundational
- [x] T002 扩展 frontend/src/api/alarm.ts：fetchAlarms(filters)、fetchAlarm(id)、ackAlarm(id)，按 isMockEnabled('alarm') 分流，mock 层过滤/分页/ack

## Phase 3: US1 列表筛选 (P1)
- [x] T003 [US1] 实现 frontend/src/views/alarms/AlarmsView.vue：筛选条（级别/状态/设备/时间）+ PageTable + LevelTag + 分页
- [x] T004 [US1] 列表接入 alarm store SSE 实时刷新并按 id 去重；viewer 无写入口

## Phase 4: US2 诊断抽屉 (P1)
- [x] T005 [P] [US2] 实现 frontend/src/components/AlarmDetail.vue：告警值/标准/原因 + 根因列表 + 置信度进度条 + 措施 + 摘要 + 恢复时间；diagnosis 空显示"诊断生成中"
- [x] T006 [US2] 列表点击打开抽屉，加载详情；诊断字段缺失降级不崩溃

## Phase 5: US3 确认与工单 (P2)
- [x] T007 [US3] 抽屉确认按钮（canWrite 显隐）调 ackAlarm 刷新状态；含 workorder_id 显示"查看工单"跳 /workorders?focus=id

## Phase 6: Polish
- [x] T008 [P] npm run build；无头实测筛选/诊断/确认/越权/移动，控制台零报错
- [x] T009 勾选 tasks；记录验证

## Dependencies
Setup → Foundational → US1 → US2 → US3 → Polish。T001/T005 可并行。MVP = US1。