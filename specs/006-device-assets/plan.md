# Implementation Plan: 设备资产（006）

**Branch**: `p3-p4-remaining-features` | **Date**: 2026-11-14 | **Spec**: [spec.md](./spec.md)

## Summary
实现执行版模块 5：设备分页表格（健康分进度条）+ admin CRUD + 详情抽屉（健康分仪表盘 + factors +
suggestion + 刷新）。mock 含多状态/已评分样本。

## Technical Context
TS5 + Vue3；锁定栈无新增；mock device.json；测试=无头+build+零报错；桌面+移动；仅 frontend/。

## Constitution Check
I（模块5+5.3）PASS；II PASS；III PASS；IV PASS；V（CRUD 仅 admin）PASS；VI PASS；VII PASS。Post-design PASS。

## Project Structure
```
frontend/src/
├── api/device.ts               # list/create/update/remove/health/refreshHealth
├── api/mock/device.json        # 设备+健康分样本
├── components/HealthGauge.vue  # 0—100 仪表盘（ECharts gauge）
└── views/devices/DevicesView.vue  # 表格+CRUD弹窗+详情抽屉
```
**Structure Decision**: 复用 PageTable/AppIcon/usePermission；HealthGauge 用 echarts gauge。

## Complexity Tracking
无违规。