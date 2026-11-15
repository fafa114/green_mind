# Implementation Plan: 智能工单（004）

**Branch**: `p2-monitoring-alerts-workorders` | **Date**: 2026-11-14 | **Spec**: [spec.md](./spec.md)

## Summary

实现执行版模块 4 工单：四列看板/表格切换 + 卡片 SLA 倒计时（每秒刷新、超时红）+ 顶部统计条
（各状态数量 + 工程师负载）+ 详情弹窗状态机操作（接单/完成/审批通过/驳回，按状态与角色显隐）+
手动建单（engineer+）。新增 SlaCountdown 公共组件与 workorder api/mock。

## Technical Context

**Language/Version**: TypeScript 5.x + Vue 3；Node ≥ 18
**Primary Dependencies**: 宪法锁定清单；无新增
**Storage**: mock JSON（workorder.json）；真实 /api/workorders
**Testing**: 无头浏览器 + npm run build + 控制台零报错
**Target Platform**: 桌面 + 移动自适应
**Project Type**: web-app（frontend/）
**Performance Goals**: SLA 倒计时每秒刷新且卸载清除定时器
**Constraints**: 统一约定；状态机 pending→processing→accepting→closed；viewer 无写入口；越权 403
**Scale/Scope**: 1 工单页 + SlaCountdown + WorkOrderDetail 弹窗 + 建单弹窗 + workorder api

## Constitution Check

| 原则 | 结论 |
|---|---|
| I 规格书唯一输入 | PASS（执行版模块 4） |
| II 技术栈锁定 | PASS |
| III 代码归属 | PASS（仅 frontend/） |
| IV 契约先行 Mock | PASS（contracts/workorder.md；workorder 可切真实） |
| V 权限双层 | PASS（按角色显隐 + 后端 403） |
| VI 验收驱动 | PASS |
| VII 范围纪律 | PASS（仅工单页） |

**Post-Design Re-check**: PASS。

## Project Structure

```text
frontend/src/
├── api/workorder.ts                 # 新增：list/get/create/accept/complete/approve/stats
├── api/mock/workorder.json          # 新增：四状态/超时/不同 assignee/告警关联样本
├── components/SlaCountdown.vue      # 新增：每秒刷新倒计时，超时红色
├── components/WorkOrderDetail.vue   # 新增：详情弹窗 + 状态机操作
└── views/workorders/WorkOrdersView.vue  # 新增：看板/表格 + 统计条 + 建单
```

**Structure Decision**: 复用 PageTable/usePermission；路由 /workorders 由占位替换；支持 ?focus=id 定位（003 查看工单跳转）。

## Complexity Tracking

无宪法违规项。