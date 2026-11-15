# Feature Specification: 设备资产（006）

**Feature Branch**: `006-device-assets`（批次分支 `p3-p4-remaining-features`）
**Created**: 2026-11-14 | **Status**: Draft
**Input**: "按执行版模块 5 实现设备资产：表格 + 健康分进度条 + admin CRUD + 详情仪表盘（分数仪表 + factors + suggestion + 刷新）。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 设备台账与健康度 (Priority: P1)
工程师查看设备表格（编号/名称/类型/状态/健康分进度条/安装日期），点击设备打开详情抽屉：
健康分仪表盘（0—100）、影响因素列表、维护建议、刷新按钮。
**Why this priority**: 模块 5 核心，健康度可视化是主体。
**Independent Test**: 演示模式核对表格健康分进度条；打开详情仪表盘分数/factors/suggestion 渲染；刷新产生新分。
**Acceptance Scenarios**:
1. **Given** 设备列表，**When** 加载，**Then** 显示编号/名称/类型/状态/健康分进度条/安装日期。
2. **Given** 点击设备，**When** 打开详情，**Then** 显示 0—100 分仪表盘 + factors 列表 + suggestion。
3. **Given** 详情，**When** 点击刷新，**Then** 重新统计 + 评分，仪表盘更新为 0—100 新分。

---

### User Story 2 - 设备 CRUD (Priority: P2)
admin 可新增/编辑/删除设备；viewer/engineer 无写入口；越权后端 403。
**Why this priority**: 模块 5 要求 CRUD 仅 admin。
**Independent Test**: admin 新增/编辑/删除设备成功；viewer 无按钮；非 admin 调接口 403。
**Acceptance Scenarios**:
1. **Given** admin，**When** 新增设备（编号/名称/类型/安装日期等），**Then** 列表出现新设备。
2. **Given** admin，**When** 编辑/删除，**Then** 生效。
3. **Given** viewer，**When** 查看，**Then** 无新增/编辑/删除入口。

---

### Edge Cases
- 设备无健康分：进度条显示"未评分"，不虚构分数。
- 删除运行中设备：前端二次确认。
- 校准逾期：详情显示逾期天数提示。
- 刷新失败：可读提示，保留旧分。

## Requirements *(mandatory)*
### Functional Requirements
- **FR-001**: 必须提供设备分页表格（编号/名称/类型/状态/健康分进度条/安装日期）。
- **FR-002**: 详情必须显示健康分仪表盘（0—100）+ factors 列表 + suggestion。
- **FR-003**: 必须能刷新健康分（POST health/refresh，返回新分）。
- **FR-004**: admin 必须能新增/编辑/删除设备；viewer/engineer 无写入口。
- **FR-005**: 删除必须二次确认；越权操作正确处理 403。
- **FR-006**: 接口错误可读提示；演示模式可独立运行，device 模块可切真实。

### Key Entities
- **设备**: id/code/name/type/install_date/design_life_years/last_calibration_date/calibration_cycle_days/status。
- **健康度**: score(0—100)、factors[{name,impact}]、suggestion（执行版 5.3）。

## Success Criteria *(mandatory)*
- **SC-001**: 表格字段与健康分进度条正确率 100%；详情仪表盘/factors/suggestion 完整。
- **SC-002**: 刷新产生 0—100 分；admin CRUD 可用；viewer 写入口 0。
- **SC-003**: 生产构建通过；桌面/移动无重叠溢出；控制台报错 0。

## Assumptions
- 基准执行版模块 5 + 5.3；接口（D）：GET/POST/PUT/DELETE /api/devices、GET /{id}/health、POST /{id}/health/refresh。
- mock 设备含运行/停运/维护状态与已评分/未评分样本。