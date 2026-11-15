# Implementation Plan: 告警中心（003）

**Branch**: `p2-monitoring-alerts-workorders` | **Date**: 2026-11-14 | **Spec**: [spec.md](./spec.md)

## Summary

实现执行版模块 2 告警中心：分页筛选表格（级别/状态/设备/时间）+ LevelTag + SSE 实时刷新去重 +
诊断详情抽屉（根因/置信度进度条/措施/摘要/恢复时间）+ 确认（engineer+）+ 查看工单链接。复用 002 的
alarm store/sse/LevelTag。mock 含已诊断/待诊断、含/不含工单关联样本。

## Technical Context

**Language/Version**: TypeScript 5.x + Vue 3；Node ≥ 18
**Primary Dependencies**: 宪法锁定清单；无新增
**Storage**: mock JSON（alarm.json）；真实 GET /api/alarms
**Testing**: 无头浏览器 + npm run build + 控制台零报错
**Target Platform**: 桌面 + 移动自适应
**Project Type**: web-app（frontend/）
**Performance Goals**: SSE 新告警实时插入去重；筛选响应即时
**Constraints**: 统一约定（分页 {items,total,page,page_size}、错误 {detail}、403）；viewer 无写入口；诊断结构按 5.1
**Scale/Scope**: 1 告警页 + AlarmDetail 抽屉组件 + alarm api

## Constitution Check

| 原则 | 结论 |
|---|---|
| I 规格书唯一输入 | PASS（执行版模块 2 + 5.1） |
| II 技术栈锁定 | PASS |
| III 代码归属 | PASS（仅 frontend/） |
| IV 契约先行 Mock | PASS（contracts/alarm.md；alarm 模块可切真实） |
| V 权限双层 | PASS（viewer 无确认；后端 403） |
| VI 验收驱动 | PASS |
| VII 范围纪律 | PASS（仅告警页） |

**Post-Design Re-check**: PASS。

## Project Structure

```text
frontend/src/
├── api/alarm.ts                 # 扩展：fetchAlarms(筛选)/fetchAlarm(id)/ackAlarm(id)
├── api/mock/alarm.json          # 新增：告警样本（四级别/三状态/含诊断/含工单）
├── components/AlarmDetail.vue   # 新增：诊断详情抽屉
└── views/alarms/AlarmsView.vue  # 新增：筛选表格 + 抽屉 + 确认 + SSE 刷新
```

**Structure Decision**: 复用 PageTable/LevelTag/alarm store；路由 /alarms 由占位替换为 AlarmsView。

## Complexity Tracking

无宪法违规项。