# Tasks: 智能工单（004）

**Input**: specs/004-workorder-board/
**Tests**: 无头浏览器 + npm run build + 控制台零报错。

## Phase 1: Setup
- [x] T001 扩展 frontend/src/api/types.ts：WorkOrder/Priority/WorkOrderStatus/WorkOrderStats 类型与枚举常量
- [x] T002 [P] 创建 frontend/src/api/mock/workorder.json：四状态/超时/不同 assignee/告警关联样本

## Phase 2: Foundational
- [x] T003 实现 frontend/src/api/workorder.ts：list/get/create/accept/complete/approve/stats，isMockEnabled('workorder') 分流，mock 层状态机 + 越权 403
- [x] T004 [P] 实现 frontend/src/components/SlaCountdown.vue：每秒刷新倒计时，超时红色，卸载清除定时器

## Phase 3: US1 看板/表格 (P1)
- [x] T005 [US1] 实现 frontend/src/views/workorders/WorkOrdersView.vue：四列看板 + 表格切换 + 卡片（标题/设备/负责人/SlaCountdown）
- [x] T006 [US1] 顶部统计条：各状态数量 + 工程师负载（stats）

## Phase 4: US2 状态机 (P1)
- [x] T007 [P] [US2] 实现 frontend/src/components/WorkOrderDetail.vue：详情弹窗 + 按状态/角色显隐操作按钮 + 备注必填校验
- [x] T008 [US2] 接入 accept/complete/approve（含驳回），操作后刷新；closed 终态无按钮；支持 ?focus=id 定位

## Phase 5: US3 手动建单 (P2)
- [x] T009 [US3] 建单弹窗（设备/标题/描述/优先级，canWrite 显隐），提交后刷新看板 pending

## Phase 6: Polish
- [x] T010 [P] npm run build；无头实测看板/状态机全流程/越权/SLA/移动，控制台零报错
- [x] T011 勾选 tasks；记录验证

## Dependencies
Setup → Foundational → US1 → US2 → US3 → Polish。T002/T004/T007 可并行。MVP = US1。