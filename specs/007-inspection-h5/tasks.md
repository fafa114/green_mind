# Tasks: 智能巡检 H5（007）
**Tests**: 无头移动视口 + build + 控制台零报错。

## Phase 1 Setup
- [x] T001 扩展 types.ts：Inspection/ChecklistItem 类型 + INSPECTION_ITEMS 常量
- [x] T002 [P] 生成 api/mock/inspection.json：历史巡检样本（含照片/签名/工单）

## Phase 2 Foundational
- [x] T003 实现 api/inspection.ts：uploadFile/submitInspection/fetchInspections/fetchInspection，isMockEnabled('inspection') 分流
- [x] T004 [P] 实现 components/SignaturePad.vue：canvas 手写+清空+确认（导出 dataURL）

## Phase 3 US1 提交闭环 (P1)
- [x] T005 [US1] 实现 views/inspection/InspectionView.vue：扫码(html5-qrcode)/手动选设备 + 设备名显示
- [x] T006 [US1] 6 项清单（正常/异常+备注）+ 拍照≤5 + 签名必填校验
- [x] T007 [US1] 提交→成功页（异常显示工单号）；异常自动转单

## Phase 4 US2 历史 (P2)
- [x] T008 [US2] 历史 tab 分页 + 详情（清单/照片/签名/工单）

## Phase 5 Polish
- [x] T009 [P] build + 无头移动实测全流程（含异常转单/签名校验）零报错
- [x] T010 勾选 tasks

## Dependencies
Setup→Foundational→US1→US2→Polish。T002/T004 可并行。MVP=US1。