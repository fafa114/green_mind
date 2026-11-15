# Implementation Plan: 监控大屏（002）

**Branch**: `p2-monitoring-alerts-workorders` | **Date**: 2026-11-14 | **Spec**: [spec.md](./spec.md)

## Summary

在 001 大屏骨架基础上补齐执行版模块 1 完整能力：7 指标卡（5 污染物 + 炉温 + 流量）、时间回放滑块
（as_of + 播放/倍速）、双轴 24h 趋势、工况徽标、SSE 告警横幅（队列≤3、断线重连）。新增 alarm store 与
sse 工具，TrendChart props 对齐文档 series/limits。全程 mock 可独立演示，data/alarm 可逐模块切真实。

## Technical Context

**Language/Version**: TypeScript 5.x + Vue 3 `<script setup>`；Node ≥ 18
**Primary Dependencies**: 宪法锁定清单（vue/pinia/vue-router/element-plus/echarts/axios）；无新增依赖
**Storage**: localStorage（会话）；mock JSON + mock SSE（本地定时推送）
**Testing**: quickstart 手动场景 + 无头浏览器（Edge+Playwright）+ npm run build + 控制台零报错
**Target Platform**: 桌面浏览器 + 移动自适应
**Project Type**: web-app（frontend/ 子项目）
**Performance Goals**: 告警 5 秒内横幅出现；回放刷新节流避免请求风暴
**Constraints**: 技术栈锁定；统一约定（SSE event:alarm、ISO 8601、错误 {detail}）；viewer 只读；历史回放明确标注
**Scale/Scope**: 1 大屏页；新增 AlarmBanner/ReplayControls 组件 + alarm store + sse 工具

## Constitution Check

| 原则 | 结论 |
|---|---|
| I 规格书唯一输入 | PASS（追溯执行版模块 1 + 第七节） |
| II 技术栈锁定 | PASS（无新增依赖，SSE 用原生 EventSource/fetch） |
| III 代码归属 | PASS（仅 frontend/） |
| IV 契约先行 Mock 并行 | PASS（contracts/data.md + alarm SSE；VITE_REAL_MODULES 逐模块） |
| V 权限双层 | PASS（viewer 横幅只读，无写入口） |
| VI 验收驱动 | PASS（SC 映射 quickstart + 无头实测） |
| VII 范围纪律 | PASS（仅大屏；告警页/工单属 003/004） |

**Post-Design Re-check**: PASS。

## Project Structure

```text
frontend/src/
├── stores/alarm.ts            # 新增：SSE 连接 + 断线重连 + 横幅队列≤3 + 告警列表缓存
├── utils/sse.ts               # 新增：SSE 订阅封装（真实 EventSource / mock 定时推送）
├── components/
│   ├── AlarmBanner.vue        # 新增：顶部告警横幅队列
│   ├── ReplayControls.vue     # 新增：回放滑块 + 播放/暂停 + 倍速
│   ├── MetricCard.vue         # 扩展：limit 可选（炉温/流量无超标判定）
│   └── TrendChart.vue         # 扩展：props series/limits + 炉温/流量右轴
├── api/alarm.ts               # 新增：stream 订阅 + 列表（003 复用）
└── views/dashboard/DashboardView.vue  # 重写：7 卡 + 回放 + 双轴 + 徽标 + 横幅
```

**Structure Decision**: 复用 001 设计系统与路由；alarm store/sse 为 002/003 共享底座。

## Complexity Tracking

无宪法违规项。