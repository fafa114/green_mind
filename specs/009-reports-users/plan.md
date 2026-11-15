# Implementation Plan: 台账报表 + 用户管理（009）

**Branch**: `p3-p4-remaining-features` | **Date**: 2026-11-14 | **Spec**: [spec.md](./spec.md)

## Summary
实现执行版模块 7 + 第八节：报表列表/Markdown 预览（四章节）/PDF·Excel 导出/admin 按月生成；
用户管理 CRUD（admin，不能删自己，非 admin 重定向）。复用 MarkdownView。mock 导出客户端生成可打开文件。

## Technical Context
TS5 + Vue3；锁定栈（markdown-it/element-plus/axios）无新增；mock report.json/users.json；
测试=无头+build+零报错；桌面+移动；仅 frontend/。

## Constitution Check
I（模块7+5.4+第八节）PASS；II PASS；III PASS；IV PASS；V（用户管理仅admin/删自己拒绝）PASS；VI PASS；VII PASS。Post-design PASS。

## Project Structure
```
frontend/src/
├── api/report.ts               # list/detail/generate/export
├── api/user.ts                 # users CRUD
├── api/mock/report.json        # 报表样本（stats+content_md）
├── api/mock/users.json         # 用户样本
├── views/reports/ReportsView.vue   # 列表+预览+导出+生成
└── views/admin/UsersView.vue       # 用户 CRUD
```
**Structure Decision**: 复用 MarkdownView/PageTable；mock 导出 Excel(.xls HTML 表格)/PDF(打印视图)。

## Complexity Tracking
无违规。