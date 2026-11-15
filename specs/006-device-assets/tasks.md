# Tasks: 设备资产（006）
**Tests**: 无头浏览器 + build + 控制台零报错。

## Phase 1 Setup
- [x] T001 扩展 types.ts：Device/DeviceStatus/HealthScore 类型与枚举
- [x] T002 [P] 生成 api/mock/device.json：多状态+健康分样本

## Phase 2 Foundational
- [x] T003 实现 api/device.ts：list/create/update/remove/fetchHealth/refreshHealth，isMockEnabled('device') 分流，越权403
- [x] T004 [P] 实现 components/HealthGauge.vue：ECharts gauge 0—100

## Phase 3 US1 台账与健康度 (P1)
- [x] T005 [US1] 实现 views/devices/DevicesView.vue：分页表格+健康分进度条+状态标签
- [x] T006 [US1] 详情抽屉：HealthGauge+factors+suggestion+刷新按钮+校准逾期提示

## Phase 4 US2 CRUD (P2)
- [x] T007 [US2] admin 新增/编辑弹窗 + 删除二次确认（canWrite+isAdmin 显隐）

## Phase 5 Polish
- [x] T008 [P] build + 无头实测（表格/仪表盘/CRUD/越权/移动）零报错
- [x] T009 勾选 tasks

## Dependencies
Setup→Foundational→US1→US2→Polish。T002/T004 可并行。MVP=US1。