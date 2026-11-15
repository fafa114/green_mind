# Tasks: 台账报表 + 用户管理（009）
**Tests**: 无头浏览器 + build + 控制台零报错。

## Phase 1 Setup
- [x] T001 扩展 types.ts：Report/ReportStats/AdminUser 类型
- [x] T002 [P] 生成 api/mock/report.json（stats+四章节）与 api/mock/users.json

## Phase 2 Foundational
- [x] T003 实现 api/report.ts：list/detail/generate/export，isMockEnabled('report') 分流；mock 导出 .xls/打印 PDF
- [x] T004 [P] 实现 api/user.ts：users CRUD，isMockEnabled('user') 分流，删自己/重名 400

## Phase 3 US1 报表预览导出 (P1)
- [x] T005 [US1] 实现 views/reports/ReportsView.vue：列表 + MarkdownView 预览 + PDF/Excel 导出

## Phase 4 US3 用户管理 (P1)
- [x] T006 [US3] 实现 views/admin/UsersView.vue：用户表格 + 新增/编辑/重置密码/删除（删自己禁用）

## Phase 5 US2 生成报表 (P2)
- [x] T007 [US2] admin 月份选择生成弹窗（loading，防重复）+ 入列表

## Phase 6 Polish
- [x] T008 [P] build + 无头实测（预览/导出/生成/用户CRUD/删自己/越权/移动）零报错
- [x] T009 勾选 tasks

## Dependencies
Setup→Foundational→US1/US3→US2→Polish。T002/T004 可并行。MVP=US1+US3。