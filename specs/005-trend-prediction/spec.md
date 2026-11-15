# Feature Specification: 趋势预测（005）

**Feature Branch**: `005-trend-prediction`（批次分支 `p3-p4-remaining-features`）
**Created**: 2026-11-14 | **Status**: Draft
**Input**: "按执行版模块 3 实现趋势预测页：设备/污染物选择 + 历史实线 + 预测虚线 6 点 + 置信区间 + 超标概率柱状 + 驱动因素 + 手动刷新。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 预测可视化 (Priority: P1)
工程师选择设备与污染物，看到近 24h 历史实线、未来 6 点预测虚线、置信区间面积（value×(1±(1-confidence))）、
各点超标概率柱状图与驱动因素列表。预测基于 LLM 对历史时序的方向性判断，明确标注"实验性预测"。
**Why this priority**: 模块 3 核心交付，预测图是页面主体。
**Independent Test**: 演示模式选 CEMS-01/颗粒物，核对历史+6 预测点+置信区间+概率柱+驱动因素渲染。
**Acceptance Scenarios**:
1. **Given** 选定设备+污染物，**When** 加载，**Then** 显示近 24h 历史实线与未来 6 点预测虚线。
2. **Given** 预测 confidence，**When** 渲染，**Then** 置信区间面积按 value×(1±(1-confidence)) 绘制。
3. **Given** 预测各点 exceed_prob，**When** 查看，**Then** 超标概率柱状图 0—100% 正确显示。
4. **Given** 预测 drivers，**When** 查看，**Then** 驱动因素列表完整显示。

---

### User Story 2 - 手动刷新与历史 (Priority: P2)
admin 可手动触发某设备预测刷新（同步），刷新后图表更新；可查看历史预测记录列表。
**Why this priority**: 模块 3 要求手动刷新与历史查询。
**Independent Test**: admin 点刷新→base_ts 更新；历史列表分页可查；viewer 无刷新按钮。
**Acceptance Scenarios**:
1. **Given** admin，**When** 点击刷新，**Then** 预测重新生成，base_ts 与图表更新。
2. **Given** viewer，**When** 查看，**Then** 无刷新按钮。
3. **Given** 历史预测，**When** 翻页，**Then** 分页正确。

---

### Edge Cases
- 无预测数据：显示空态与"暂无预测"，不虚构曲线。
- confidence 极低：置信区间很宽，如实展示。
- 刷新失败：可读提示，保留旧预测。
- 预测值≥0、exceed_prob 0—1 越界：前端按契约约束渲染。

## Requirements *(mandatory)*
### Functional Requirements
- **FR-001**: 必须提供设备与污染物选择器，联动刷新预测。
- **FR-002**: 必须绘制近 24h 历史实线 + 未来 6 点预测虚线。
- **FR-003**: 必须绘制置信区间面积（value×(1±(1-confidence))）。
- **FR-004**: 必须显示各预测点超标概率柱状图（0—100%）。
- **FR-005**: 必须显示驱动因素列表与 base_ts、confidence。
- **FR-006**: admin 必须能手动刷新预测（POST refresh，同步）；viewer 无入口。
- **FR-007**: 必须提供历史预测分页列表。
- **FR-008**: 必须标注"实验性预测"，不包装为确定结论。
- **FR-009**: 接口错误可读提示；演示模式可独立运行，prediction 模块可切真实。

### Key Entities
- **预测结果**: base_ts、result{hours[{ts,value,exceed_prob}], drivers[], confidence}（执行版 5.2）。

## Success Criteria *(mandatory)*
- **SC-001**: 预测图显示未来 6 点；置信区间/概率柱/驱动因素渲染正确率 100%。
- **SC-002**: admin 刷新后 base_ts 更新；viewer 写入口 0。
- **SC-003**: 生产构建通过；桌面/移动无重叠溢出；控制台报错 0。

## Assumptions
- 基准执行版模块 3 + 5.2；接口（C）：GET /api/predictions/latest、GET /api/predictions、POST /api/predictions/refresh。
- 历史序列复用 /api/data/history；mock 预测含 6 点与驱动因素。