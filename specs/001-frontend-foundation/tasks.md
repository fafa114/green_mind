# Tasks: 前端地基（登录、角色化应用壳与独立演示能力）

**Input**: Design documents from `/specs/001-frontend-foundation/`

**Prerequisites**: plan.md、spec.md、research.md、data-model.md、contracts/、quickstart.md

**Tests**: 规格未要求自动化测试，本清单不含测试任务；验收采用 quickstart.md 手动场景 +
`npm run build` + 控制台零报错核查（spec SC-001…SC-006）。

**Organization**: 按用户故事分组，每个故事可独立实现与验收。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行（不同文件、无未完成依赖）
- **[Story]**: 所属用户故事（US1…US4 对应 spec.md）
- 每个任务含确切文件路径

## Path Conventions

- Web app：前端代码位于 `frontend/`（本 feature 只触碰 frontend/，宪法 III）
- 下文路径均相对仓库根目录

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 工程初始化与基础结构

- [x] T001 初始化 frontend/ Vite+Vue3+TS 工程：创建 frontend/package.json（scripts: dev/build/preview，build=`vue-tsc --noEmit && vite build`；dependencies 按宪法 II 锁定清单：vue、vue-router、pinia、element-plus、echarts、axios、markdown-it、html5-qrcode；devDependencies：vite、@vitejs/plugin-vue、typescript、vue-tsc）、frontend/index.html、frontend/tsconfig.json（strict: true），并执行 npm install
- [x] T002 [P] 配置 frontend/vite.config.ts（@ → src 别名；dev 代理 /api → http://localhost:8000）与 frontend/.env.example、frontend/.env.development（VITE_USE_MOCK=true、VITE_REAL_MODULES=空，含义见 research.md R1）
- [x] T003 [P] 创建 frontend/src/main.ts、frontend/src/App.vue、frontend/src/styles/（全局样式与主题变量）；main.ts 全量注册 ElementPlus（含样式）、Pinia、Router（research.md R7）
- [x] T004 [P] 定义契约类型 frontend/src/api/types.ts：UserSession{token,user{id,username,real_name,role}}、Role 枚举 `admin|engineer|viewer`、DeviceOption{device_id,name,last_ts}、LatestObservation（cems_raw 整行，condition_flag 枚举 `normal|startup|shutdown|fault`，标记位 0/1）、HistoryPoint、HistoryPage{items,total}、ApiError{detail}、Page{items,total,page,page_size}（字段约束逐条见 data-model.md）

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 所有用户故事共用的阻塞性基础设施

**⚠️ CRITICAL**: 本阶段完成前不得开始任何用户故事

- [x] T005 实现 frontend/src/utils/request.ts：axios 实例 baseURL=/api；请求拦截器加 `Authorization: Bearer <token>`；响应拦截器 401 → 清空会话并跳 `/login?redirect=当前路径`（会话清理用动态 import user store 避免循环依赖，接线在 T013 完成）；非 401 错误读取 body `{"detail"}` 用 ElMessage 可读提示；分页参数约定 page 默认 1、page_size 默认 20 最大 100
- [x] T006 [P] 实现 frontend/src/api/mock/index.ts：isMockEnabled(module) —— VITE_USE_MOCK=false 一律真实；true 时模块名在 VITE_REAL_MODULES（逗号分隔）中则真实，否则 mock（research.md R1）
- [x] T007 [P] 实现 frontend/src/utils/format.ts：ISO 8601（YYYY-MM-DDTHH:mm:ss）时间显示格式化、数值与单位格式化
- [x] T008 创建 frontend/src/router/routes.ts 与 frontend/src/router/index.ts：路由表为菜单/守卫单一数据源（meta: public/roles/title）；/login 为 public；九业务路由（/dashboard /alarms /predictions /workorders /devices /inspection /reports /assistant /admin/users）懒加载，/admin/users 配 roles:['admin']；router 实例预留全局守卫挂载点（登录守卫 T013、角色守卫 T015 补全）

**Checkpoint**: 基础设施就绪，用户故事可开始

---

## Phase 3: User Story 1 - 登录与会话保持 (Priority: P1) 🎯 MVP

**Goal**: 四演示账号可登录、刷新保持、退出清空、失败统一提示、过期统一登出

**Independent Test**: 后端停机 + 演示模式，用 admin/engineer1/engineer2/viewer 分别登录、刷新、退出、输错密码，全程不依赖任何业务页面（quickstart.md US1）

### Implementation for User Story 1

- [x] T009 [P] [US1] 创建 frontend/src/api/mock/auth.json：4 个演示账号 admin/engineer1/engineer2/viewer，密码均 123456，real_name 分别为 系统管理员/张工程师/李工程师/王查看，role 对应 admin/engineer/engineer/viewer（data-model.md §3）
- [x] T010 [US1] 实现 frontend/src/api/auth.ts：login(username,password) 按 isMockEnabled('auth') 分流；真实 POST /api/auth/login；mock 命中返回同构 {token,user}，未命中抛 {detail:"用户名或密码错误"}（契约 contracts/auth.md，不区分用户不存在/密码错误）
- [x] T011 [US1] 实现 frontend/src/stores/user.ts：state {token,user}；localStorage 键 gm_session 持久化，store 初始化同步恢复；login 成功写入、logout 清空存储与状态（FR-002/FR-004）
- [x] T012 [US1] 实现 frontend/src/views/login/LoginView.vue：用户名/密码表单与校验；成功进入工作台或按 redirect 查询参数回跳（仅允许站内路径）；失败显示统一可读提示并停留；已登录访问 /login 直接进工作台
- [x] T013 [US1] 在 frontend/src/router/index.ts 补全登录守卫（未登录访问非 public → /login?redirect=fullPath），并完成 T005 的 401 会话清理接线：任何业务请求 401 → 清会话跳登录，无半登录态

**Checkpoint**: US1 可独立验收（SC-001/SC-002）——此时即为可演示 MVP

---

## Phase 4: User Story 2 - 按角色导航与访问控制 (Priority: P1)

**Goal**: 三角色菜单过滤、越权重定向、viewer 零写入口、角色切换无残留

**Independent Test**: 三角色账号分别登录核对菜单与写入口数量，手动输入 /admin/users 验证重定向（quickstart.md US2）

### Implementation for User Story 2

- [x] T014 [P] [US2] 实现 frontend/src/utils/permission.ts：usePermission() 提供 canWrite（role!=='viewer'）、hasRole(...roles)、isAdmin（research.md R5）
- [x] T015 [US2] 在 frontend/src/router/index.ts 补全角色守卫：meta.roles 存在且不含当前角色 → 重定向 /dashboard；/admin/users 仅 admin 可达（FR-006）
- [x] T016 [US2] 实现 frontend/src/components/AppLayout.vue：左侧菜单由 routes 按当前角色过滤生成（单一数据源，research.md R4）+ 顶栏显示 real_name 与退出按钮（调 store.logout）+ 内容区 router-view
- [x] T017 [US2] 写入口显隐机制落地：AppLayout 与现有全部视图接入 usePermission，viewer 不渲染任何新建/编辑/删除/确认/审批入口（FR-007 数量为 0）；角色切换后菜单与写入口立即按新角色重算，无上一角色残留

**Checkpoint**: US1+US2 可独立验收（SC-003）

---

## Phase 5: User Story 3 - 应用壳与页面骨架 (Priority: P2)

**Goal**: 九路由全可达、未实现页"建设中"占位、大屏骨架用演示数据渲染并随设备切换刷新

**Independent Test**: 逐一访问九路由验证可达与占位；演示模式下验证大屏设备切换、超标高亮、趋势图渲染（quickstart.md US3）

### Implementation for User Story 3

- [x] T018 [P] [US3] 实现 frontend/src/components/MetricCard.vue：props 名称/当前值/标准值/单位；当前值（折算 *_std）≥ 标准值（*_limit）时超标红色高亮（FR-010）
- [x] T019 [P] [US3] 实现 frontend/src/components/TrendChart.vue：echarts 按需引入（core+LineChart+Grid/Tooltip/Legend+CanvasRenderer）；props series/limits，标准值虚线；ResizeObserver 自适应；onBeforeUnmount dispose（research.md R6）
- [x] T020 [P] [US3] 实现 frontend/src/components/PageTable.vue：el-table + 统一分页封装（page 默认 1、page_size 默认 20 最大 100；FR-013 统一分页交互，端到端验证留待 003 告警）
- [x] T021 [P] [US3] 创建 frontend/src/views/placeholders/UnderConstruction.vue 及 8 个占位视图（alarms/predictions/workorders/devices/inspection/reports/assistant/admin）：显示页面标题+"建设中"说明，不渲染任何虚构业务数值（FR-009）
- [x] T022 [P] [US3] 创建 frontend/src/api/mock/data.json：devices（CEMS-01/CEMS-02）、latest（按 device_id 键控 cems_raw 整行）、history（每设备 24 个逐时点）；CEMS-01 含 pm_std>pm_limit 超标样本、CEMS-02 全正常；时间 ISO 8601；结构与 contracts/data.md 逐字段一致（data-model.md §4-6）
- [x] T023 [US3] 实现 frontend/src/api/data.ts：devices()、latest(deviceId, asOf?)、history(deviceId, start, end, interval) 按 isMockEnabled('data') 分流（契约 contracts/data.md；本期大屏用 interval=hour 近 24h）
- [x] T024 [US3] 实现 frontend/src/views/dashboard/DashboardView.vue：设备选择器 + 5 污染物 MetricCard（折算值对比标准值、超标高亮）+ TrendChart 24h 五污染物折线+标准值虚线；切换设备时指标卡与趋势图联动刷新（FR-010）
- [x] T025 [US3] 空白布局与可达性收尾：/login 与 /inspection 使用无侧边栏空白布局（FR-008）；逐一核对九业务路由可达、无死链，占位页标识正确

**Checkpoint**: US1—US3 可独立验收（SC-004）

---

## Phase 6: User Story 4 - 无后端独立演示与逐模块切换 (Priority: P2)

**Goal**: 后端停机全流程可演示；单模块切真实接口不影响其余模块；失败可读提示

**Independent Test**: 后端完全停机走通登录→导航→大屏；仅 auth 指向 :8000 桩验证其余模块仍 mock（quickstart.md US4）

### Implementation for User Story 4

- [x] T026 [US4] 演示模式端到端核查与修正：后端停机 + VITE_USE_MOCK=true 走通"登录→导航→大屏骨架"全流程无报错无空白页；将 mock JSON 与 contracts/ 逐字段核对，不一致以契约为准修正 mock（不改页面适配错误结构）
- [x] T027 [US4] 单模块真实切换验证：VITE_REAL_MODULES=auth 指向 :8000 后端桩，登录走真实接口、大屏及其余模块仍用演示数据互不影响；真实模式下后端不可用时展示可读错误提示、页面不崩溃（FR-012/FR-013）
- [x] T028 [US4] 状态保持核查：演示模式下刷新页面会话与演示模式状态保持；同一浏览器切换不同角色账号菜单与写入口立即刷新无残留（Edge Cases）

**Checkpoint**: 四个用户故事全部可独立验收（SC-005）

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: 跨故事收尾与总验收

- [x] T029 [P] 在 frontend/ 执行 npm run build（vue-tsc --noEmit && vite build）须一次通过；npm run preview 复跑完整演示流程，浏览器控制台报错数为 0（SC-006/FR-014）
- [x] T030 [P] 按 specs/001-frontend-foundation/quickstart.md 执行全部验证场景并逐条记录结果（SC-001…SC-006）
- [x] T031 更新根目录 README.md：前端启动说明（npm install → npm run dev）、演示账号表（admin/engineer1/engineer2/viewer，密码 123456）、演示模式与逐模块切换说明

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 无依赖，T001 先行，T002/T003/T004 随后并行
- **Foundational (Phase 2)**: 依赖 Setup；阻塞所有用户故事
- **US1 (Phase 3)**: 依赖 Foundational；不依赖其他故事
- **US2 (Phase 4)**: 依赖 Foundational + US1 的会话/守卫基础（菜单与越权验证需登录态）
- **US3 (Phase 5)**: 依赖 Foundational + US2 的 AppLayout（页面挂壳）
- **US4 (Phase 6)**: 依赖 US1—US3 全部完成（端到端核查对象）
- **Polish (Phase 7)**: 依赖全部故事完成

### Within Each User Story

- mock 数据/类型 → api 封装 → store/组件 → 视图 → 守卫/集成
- 故事完成并独立验收后再进入下一优先级

### Parallel Opportunities

- Setup：T002/T003/T004 并行（T001 完成后）
- Foundational：T006/T007 与 T005/T008 并行
- US3：T018—T022 五个组件/数据任务并行（不同文件），T023/T024 顺序集成
- 本 feature 为单人（A）交付，并行标记主要用于 agent 批量执行；跨故事不建议并行（存在壳依赖）

---

## Parallel Example: User Story 3

```text
# T022 就绪后，以下组件任务可同时执行（不同文件、无相互依赖）：
Task: "MetricCard.vue in frontend/src/components/MetricCard.vue"      (T018)
Task: "TrendChart.vue in frontend/src/components/TrendChart.vue"      (T019)
Task: "PageTable.vue in frontend/src/components/PageTable.vue"        (T020)
Task: "占位视图 in frontend/src/views/placeholders/"                   (T021)
# 随后顺序集成：
Task: "api/data.ts" (T023) → "DashboardView.vue" (T024) → "布局与可达性收尾" (T025)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 Setup → Phase 2 Foundational
2. Phase 3 US1（登录与会话）
3. **停下验证**：四账号登录/刷新/退出/错误/过期全通过（quickstart.md US1）
4. 此时已有可演示增量

### Incremental Delivery

1. Setup + Foundational → 地基就绪
2. US1 登录会话 → 独立验收（MVP）
3. US2 角色控制 → 独立验收（权限硬性验收项就位）
4. US3 应用壳 + 大屏骨架 → 独立验收（P1 阶段末可演示雏形）
5. US4 演示/切换机制核查 → 独立验收
6. Polish：build + 全场景验证 + README
7. 每步不破坏已验收故事；对应规格书 P1（第 1—2 周）交付"登录 + 布局 + 大屏骨架（mock）"

### 与后端并行

- 全程默认 VITE_USE_MOCK=true，不等后端实现（宪法 IV）
- D 的 Swagger 桩交付后：核对 contracts/ 与 Swagger，差异以 Swagger 为准修正 mock，
  再用 VITE_REAL_MODULES 逐模块切换（先 auth，后 data）

---

## Notes

- [P] = 不同文件、无未完成依赖；[USx] 映射 spec.md 用户故事
- 每个故事独立可验收；在 Checkpoint 处可停下演示
- 每任务或逻辑组完成后提交 git（分支 001-frontend-foundation）
- 避免：模糊任务、同文件冲突、破坏故事独立性的跨故事依赖
- 范围纪律（宪法 VII）：回放滑块、SSE 告警横幅、业务页面完整实现不在本清单，属 002+ feature