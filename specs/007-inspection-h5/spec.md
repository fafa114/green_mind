# Feature Specification: 智能巡检 H5（007）

**Feature Branch**: `007-inspection-h5`（批次分支 `p3-p4-remaining-features`）
**Created**: 2026-11-14 | **Status**: Draft
**Input**: "按执行版模块 6 实现移动端巡检 H5：扫码识别设备 + 6 项清单 + 拍照≤5 + canvas 签名 + 提交（异常自动转工单）+ 历史记录。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 巡检提交闭环 (Priority: P1)
工程师在手机打开巡检页（无侧边栏空白布局），扫码（或手动选设备）识别 device_code 显示设备名，
填写 6 项检查清单（每项 正常/异常 + 备注），拍照上传（≤5 张），canvas 手写签名（清空/确认），
提交后进入成功页；任一异常时自动建工单并显示工单号。
**Why this priority**: 模块 6 核心闭环，移动端主流程。
**Independent Test**: 移动视口走通 选设备→填清单（含 1 异常）→拍照→签名→提交→成功页显示工单号。
**Acceptance Scenarios**:
1. **Given** 巡检页，**When** 扫码/选择设备，**Then** 解析 device_code 并显示设备名。
2. **Given** 6 项清单，**When** 标记某项异常并填备注，**Then** 该项异常态可见。
3. **Given** 照片≤5、签名必填，**When** 未签名提交，**Then** 阻止并提示。
4. **Given** 含异常项，**When** 提交，**Then** 成功页显示自动生成的工单号。
5. **Given** 全正常，**When** 提交，**Then** 成功页不显示工单号。

---

### User Story 2 - 历史记录 (Priority: P2)
巡检页提供历史 tab，分页查看本人/全部巡检记录，点击查看详情（清单结果、照片、签名、关联工单）。
**Why this priority**: 模块 6 要求历史可查、照片签名详情可查看。
**Independent Test**: 历史 tab 列表分页；详情显示照片与签名图。
**Acceptance Scenarios**:
1. **Given** 历史 tab，**When** 加载，**Then** 分页显示巡检记录。
2. **Given** 点击记录，**When** 查看详情，**Then** 显示清单结果、照片、签名、关联工单号。

---

### Edge Cases
- 扫码识别失败/非设备码：提示并允许手动选择设备。
- 照片超 5 张：阻止并提示。
- 签名空白：提交校验阻止。
- 相机/扫码不可用（桌面演示）：提供手动选设备降级路径。
- 上传失败：可读提示，可重试。

## Requirements *(mandatory)*
### Functional Requirements
- **FR-001**: 巡检页必须使用无侧边栏空白布局，适配移动端。
- **FR-002**: 必须支持扫码（html5-qrcode）识别 device_code，并提供手动选设备降级。
- **FR-003**: 必须提供固定 6 项清单（燃烧系统/烟气净化/CEMS分析仪/校准状态/数据上报/现场环境），每项 正常/异常 + 备注。
- **FR-004**: 必须支持拍照上传≤5 张（jpg/png）。
- **FR-005**: 必须提供 canvas 签名（清空/确认），签名必填。
- **FR-006**: 提交必须校验清单/签名；任一异常自动建工单（priority medium）并返回工单号。
- **FR-007**: 提交成功必须显示成功页（异常显示工单号）。
- **FR-008**: 必须提供历史记录分页与详情（清单/照片/签名/工单）。
- **FR-009**: 接口错误可读提示；演示模式可独立运行，inspection 模块可切真实。

### Key Entities
- **巡检**: id/device_id/inspector_id/checkin_time/checklist[{item,ok,note}]/photos[路径]/signature_path/abnormal_desc/workorder_id。

## Success Criteria *(mandatory)*
- **SC-001**: 移动端 选设备→清单→拍照→签名→提交 全流程走通；异常自动转单显示工单号。
- **SC-002**: 照片/签名保存且详情可查看；签名必填校验生效。
- **SC-003**: 生产构建通过；移动布局无溢出；控制台报错 0。

## Assumptions
- 基准执行版模块 6；接口（D）：POST /api/upload、POST /api/inspections、GET /api/inspections、GET /{id}。
- 二维码内容=device.code；mock 上传返回可回显路径；签名 dataURL 经上传接口保存。