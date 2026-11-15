# Feature Specification: 台账报表 + 用户管理（009）

**Feature Branch**: `009-reports-users`（批次分支 `p3-p4-remaining-features`）
**Created**: 2026-11-14 | **Status**: Draft
**Input**: "按执行版模块 7 + 第八节用户管理实现：报表列表/Markdown 预览/PDF·Excel 导出/admin 生成；用户管理 CRUD（admin，不能删自己）。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 报表预览与导出 (Priority: P1)
用户查看报表列表（期号/生成时间），点击预览 Markdown 正文（四章节），可导出 PDF/Excel。
**Why this priority**: 模块 7 核心，预览与导出是主体。
**Independent Test**: 演示模式打开报表→Markdown 四章节渲染→导出 PDF/Excel 得到可打开文件。
**Acceptance Scenarios**:
1. **Given** 报表列表，**When** 点击某期，**Then** 预览区渲染 Markdown（数据概述/超标事件/设备运行/改进建议）。
2. **Given** 预览，**When** 导出 PDF/Excel，**Then** 下载可打开的文件，数字与 stats 一致。

---

### User Story 2 - 生成报表 (Priority: P2)
admin 选择月份生成报表（同步，可能耗时），生成后出现在列表。
**Why this priority**: 模块 7 要求 admin 按月生成。
**Independent Test**: admin 选月份生成→列表新增该期；viewer 无生成入口。
**Acceptance Scenarios**:
1. **Given** admin，**When** 选月份生成，**Then** 生成四章节报表并入列表。
2. **Given** viewer，**When** 查看，**Then** 无生成按钮。

---

### User Story 3 - 用户管理 (Priority: P1)
admin 在用户管理页 CRUD 用户（用户名/真实姓名/角色/密码），不能删除自己；非 admin 路由重定向。
**Why this priority**: 第八节用户管理仅 admin，权限验收硬性项。
**Independent Test**: admin 新增/编辑/删除用户；删自己被拒；非 admin 访问 /admin/users 重定向。
**Acceptance Scenarios**:
1. **Given** admin，**When** 新增用户（用户名/姓名/角色/密码），**Then** 列表出现新用户。
2. **Given** admin，**When** 编辑角色/重置密码/删除他人，**Then** 生效。
3. **Given** admin，**When** 删除自己，**Then** 被拒绝并提示。
4. **Given** 非 admin，**When** 访问 /admin/users，**Then** 重定向。

---

### Edge Cases
- 报表 stats 与正文数字不一致：以 stats 为准（mock 保证一致）。
- 生成耗时：显示 loading，不重复提交。
- 导出失败：可读提示。
- 用户名重复：后端 400，前端提示。
- 删除自己：前端禁用 + 后端拒绝双保险。

## Requirements *(mandatory)*
### Functional Requirements
- **FR-001**: 必须提供报表分页列表（期号/生成时间）。
- **FR-002**: 必须 Markdown 预览报表正文（固定四章节）。
- **FR-003**: 必须导出 PDF/Excel，文件可打开，数字与 stats 一致。
- **FR-004**: admin 必须能按月生成报表（同步，loading）；viewer 无入口。
- **FR-005**: 用户管理必须 CRUD（用户名/真实姓名/角色/密码），仅 admin。
- **FR-006**: 不能删除自己（前端禁用 + 后端拒绝）。
- **FR-007**: 非 admin 访问 /admin/users 必须重定向。
- **FR-008**: 接口错误可读提示；演示模式可独立运行，report/user 模块可切真实。

### Key Entities
- **报表**: id/period/stats/content_md/generated_at；stats{pollutants,alarm_by_level,workorder,inspection_count,avg_health}。
- **用户**: id/username/real_name/role/created_at（密码 bcrypt，不回显）。

## Success Criteria *(mandatory)*
- **SC-001**: 报表四章节 Markdown 渲染；PDF/Excel 导出可打开；数字与 stats 一致。
- **SC-002**: admin 生成入列表；用户 CRUD 可用；删自己被拒；非 admin 重定向。
- **SC-003**: 生产构建通过；桌面/移动无重叠溢出；控制台报错 0。

## Assumptions
- 基准执行版模块 7 + 5.4 + 第八节；接口（D）：reports 列表/详情/generate/export、users CRUD。
- mock 导出：Excel 生成可打开 .xls（HTML 表格），PDF 走打印视图另存；真实模式直接下载后端文件。
- MarkdownView 复用 008。