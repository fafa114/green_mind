# Implementation Plan: 趋势预测（005）

**Branch**: `p3-p4-remaining-features` | **Date**: 2026-11-14 | **Spec**: [spec.md](./spec.md)

## Summary
实现执行版模块 3 预测页：设备/污染物选择，ECharts 历史实线 + 未来 6 点预测虚线 + 置信区间面积 +
超标概率柱状 + 驱动因素；admin 手动刷新；历史预测分页。标注实验性预测。mock 可独立演示。

## Technical Context
TS5 + Vue3；锁定栈（echarts/element-plus/axios）无新增；mock prediction.json；
测试=无头浏览器+build+控制台零报错；桌面+移动；仅 frontend/。

## Constitution Check
I 规格书（模块3+5.2）PASS；II 栈锁定 PASS；III 仅 frontend/ PASS；IV 契约+mock 可切 PASS；
V viewer 无刷新 PASS；VI 验收映射 PASS；VII 仅预测页 PASS。Post-design PASS。

## Project Structure
```
frontend/src/
├── api/prediction.ts            # latest/history/refresh
├── api/mock/prediction.json     # 各设备×污染物预测样本
└── views/predictions/PredictionsView.vue  # 选择器+预测图+概率柱+驱动+历史
```
**Structure Decision**: 复用 TrendChart 思路但预测图独立（含置信区间/概率柱），复用 PageTable/AppIcon。

## Complexity Tracking
无违规。