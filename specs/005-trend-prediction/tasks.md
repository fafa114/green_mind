# Tasks: 趋势预测（005）
**Tests**: 无头浏览器 + build + 控制台零报错。

## Phase 1 Setup
- [x] T001 扩展 types.ts：PredictionResult/PredictionRecord/PredictionHour 类型
- [x] T002 [P] 生成 api/mock/prediction.json：设备×污染物 latest+history（6点+drivers+confidence）

## Phase 2 Foundational
- [x] T003 实现 api/prediction.ts：fetchLatestPrediction/fetchPredictionHistory/refreshPrediction，isMockEnabled('prediction') 分流

## Phase 3 US1 预测可视化 (P1)
- [x] T004 [US1] 实现 views/predictions/PredictionsView.vue：设备/污染物选择 + 历史实线 + 预测虚线6点 + 置信区间面积
- [x] T005 [US1] 超标概率柱状图 + 驱动因素列表 + base_ts/confidence + 实验性预测标注

## Phase 4 US2 刷新与历史 (P2)
- [x] T006 [US2] admin 手动刷新（canWrite+isAdmin 显隐）+ 历史预测分页列表

## Phase 5 Polish
- [x] T007 [P] build + 无头实测（预测图/概率/刷新/移动）控制台零报错
- [x] T008 勾选 tasks

## Dependencies
Setup→Foundational→US1→US2→Polish。MVP=US1。