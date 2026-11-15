# Implementation Plan: 前端地基（登录、角色化应用壳与独立演示能力）

**Branch**: `001-frontend-foundation` | **Date**: 2026-11-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-frontend-foundation/spec.md`

## Summary

按《GreenMind 开发规格书（执行版）》P1 阶段（第 1—2 周）交付前端地基：登录与会话保持、
三角色导航与访问控制、统一应用壳 + 九业务路由骨架、监控大屏骨架（mock 渲染），以及
"无后端可独立演示、按模块逐个切换真实接口"的 mock 机制。技术栈与目录结构完全采用
项目宪法（.specify/memory/constitution.md）锁定项，不做任何重新选型；接口契约以
规格书第四节统一约定与模块 1 接口为准，后端 Swagger 桩交付后逐模块对齐。

## Technical Context

**Language/Version**: TypeScript 5.x + Vue 3（`<script setup>` SFC）；Node.js ≥ 18（Vite 运行时）

**Primary Dependencies**: vue、vue-router、pinia、element-plus、echarts 5、axios、
markdown-it、html5-qrcode（以上为宪法 II 锁定清单，脚手架一次装齐；本 feature 实际用到
vue/vue-router/pinia/element-plus/echarts/axios，其余供后续 feature 复用）；
开发依赖：vite、@vitejs/plugin-vue、vue-tsc、typescript

**Storage**: 浏览器 localStorage（token + user 会话）；静态 JSON 演示数据（`src/api/mock/*.json`）；无前端数据库

**Testing**: 规格未要求自动化测试；采用 quickstart.md 手动验收场景 + `npm run build`
（vue-tsc 类型检查 + vite 生产构建）+ 浏览器控制台零报错核查

**Target Platform**: 现代桌面浏览器（Chrome/Edge 最新两个大版本）；`/inspection` 路由预留移动 H5 空白布局

**Project Type**: web-app（单仓库 `frontend/` 子项目，后端 `backend/` 由 C/D 负责，本 feature 不触碰）

**Performance Goals**: 四个演示账号登录 ≤ 10 秒（SC-001）；生产构建一次通过（SC-006）；
完整演示流程控制台报错数 0（SC-006）

**Constraints**: 技术栈锁定不得新增选型（宪法 II）；统一接口约定强制（规格书第四节：
JWT 24h、分页 {items,total,page,page_size}、错误 {"detail"}、时间 ISO 8601）；
viewer 写入口数量为 0（FR-007）；占位页不得展示虚构业务数值（FR-009）；
mock 结构必须与 Swagger 契约一致（FR-012）

**Scale/Scope**: 1 个登录页 + 9 个业务路由（本期 1 个大屏骨架 + 8 个"建设中"占位）；
公共组件本期交付 AppLayout / MetricCard / TrendChart / PageTable 四个；
LevelTag / SlaCountdown / MarkdownView 属后续业务 feature，不在本期范围

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原则 | 门禁 | 结论 |
|---|---|---|
| I 规格书唯一输入 | spec 可追溯到执行版 P1 排期与第七节前端总体规范；不与规格书冲突 | PASS |
| II 技术栈锁定 | 全部依赖在宪法锁定清单内，无新增选型、无重新选型 | PASS |
| III 代码归属唯一 | 本 feature 只创建/修改 `frontend/` 内文件，不触碰 backend/ 与他人归属 | PASS |
| IV 契约先行 Mock 并行 | contracts/ 按规格书第四节+模块 1 定义；VITE_USE_MOCK + 按模块覆盖开关；mock 与契约同构 | PASS |
| V 权限双重保障 | 前端菜单过滤 + 路由守卫 + 写入口显隐（后端 require_role 由 D 实现，不在本期） | PASS |
| VI 验收驱动交付 | SC-001…SC-006 全部映射到 quickstart.md 可执行验证场景 | PASS |
| VII 核心链路优先、范围纪律 | 只做地基；回放滑块、SSE 告警横幅、业务页面完整实现明确划归 002+ feature | PASS |

**Post-Design Re-check（Phase 1 完成后）**: PASS —— data-model/contracts/quickstart 未引入
锁定清单外依赖，未越出 frontend/ 归属，未新增规格书外页面或字段；Complexity Tracking 无违规项。

## Project Structure

### Documentation (this feature)

```text
specs/001-frontend-foundation/
├── spec.md              # 需求规格（已完成）
├── plan.md              # 本文件
├── research.md          # Phase 0：技术决策记录
├── data-model.md        # Phase 1：前端视图模型与演示数据结构
├── quickstart.md        # Phase 1：独立演示与验收指南
├── contracts/           # Phase 1：消费侧接口契约（与后端 Swagger 对齐）
│   ├── auth.md          # POST /api/auth/login
│   └── data.md          # GET /api/data/devices | latest | history
├── checklists/
│   └── requirements.md  # 规格质量检查（已通过）
└── tasks.md             # /speckit-tasks 输出
```

### Source Code (repository root)

```text
frontend/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts               # /api 代理 → http://localhost:8000；@ → src 别名
├── .env.example                 # VITE_USE_MOCK / VITE_REAL_MODULES 说明
├── .env.development             # VITE_USE_MOCK=true（默认演示模式）
└── src/
    ├── main.ts                  # 注册 ElementPlus / Pinia / Router
    ├── App.vue
    ├── styles/                  # 全局样式与主题变量
    ├── api/
    │   ├── types.ts             # 契约类型：UserSession/Role/DeviceOption/LatestObservation/HistoryPoint/分页/错误
    │   ├── auth.ts              # login()（mock/真实切换）
    │   ├── data.ts              # devices()/latest()/history()（mock/真实切换）
    │   └── mock/
    │       ├── index.ts         # isMockEnabled(module) 开关 helper
    │       ├── auth.json        # 演示账号（与登录契约同构）
    │       └── data.json        # 设备/最新值/24h 趋势演示数据
    ├── views/
    │   ├── login/LoginView.vue
    │   ├── dashboard/DashboardView.vue   # 大屏骨架（本期）
    │   └── placeholders/        # 8 个"建设中"占位视图 + UnderConstruction.vue
    ├── components/
    │   ├── AppLayout.vue        # 角色过滤菜单 + 顶栏(real_name+退出) + 内容区
    │   ├── MetricCard.vue       # 当前值 + 标准值 + 超标高亮
    │   ├── TrendChart.vue       # ECharts 封装（props: series/limits）
    │   └── PageTable.vue        # el-table + 统一分页封装
    ├── stores/
    │   └── user.ts              # token+user 存 localStorage；login/logout/会话恢复
    ├── router/
    │   ├── index.ts             # 实例 + 全局守卫（登录态/角色/redirect 回跳）
    │   └── routes.ts            # 路由表单一来源（meta: public/roles/title）
    └── utils/
        ├── request.ts           # axios：baseURL /api、token 拦截、401 统一登出、错误可读提示
        ├── permission.ts        # usePermission()：canWrite / hasRole
        └── format.ts            # 时间/数值显示格式化
```

**Structure Decision**: 采用宪法"技术约束与统一约定"规定的 `frontend/src/{api,views,
components,stores,router,utils}` 单项目结构；路由表作为菜单与守卫的单一数据来源，
避免菜单配置与路由两份漂移。`types` 并入 `api/types.ts`，不新增顶层目录。

## Complexity Tracking

无宪法违规项，本表为空。