# zwx 前端（feature/frontend）整改施工单

**文档性质**: 整改施工单（可直接按条目派工）
**比对对象**: `origin/feature/frontend` @ `0c18d85`（作者 zwx <503186026@qq.com>，2026-11-15 10:57）
**规范依据**: `.specify/memory/constitution.md`、`docs/前后端开发约定.md`、`specs/001–009`
**结论**: 该套前端**不符合项目规范**，不应作为主实现；如需启用，必须完成下列 P0 项后才能进入联调。

---

## 0. 这套代码现在在哪里

- 自合并提交 `711167d`（merge: adopt main frontend (A) into master）起，**`master` 的 `frontend/` 已整体替换为 main 上的 A 套**；zwx 前端已从 `master` 移除。
- zwx 的原始实现**未被删除、未被改写**，完整保留在远端分支 `origin/feature/frontend`（`0c18d85`）。
- 取回方式（只读参考，不要直接在 master 上恢复）：

```bash
git fetch origin
# 方式一：临时 worktree
git worktree add ../greenmind-zwx origin/feature/frontend --detach
# 方式二：导出 frontend 目录
git archive origin/feature/frontend frontend | tar -x -C /tmp/zwx-frontend
```

- 注意：`origin/feature/frontend` 是从 `origin/feature/backend-foundation` 拉出的，树里还带着当时的 `backend/`；**只有 `frontend/` 属于本文整改范围**。

---

## 1. 优先级定义

| 优先级 | 含义 |
|---|---|
| P0 | 阻塞规范合规或无法独立演示，未完成不得合并/联调 |
| P1 | 违反强制契约或验收标准，会导致联调返工 |
| P2 | 工程一致性/可维护性问题，可在联调前补齐 |

---

## 2. 整改项

### P0-1 补齐 spec-kit 流程产物与文档

- **规范条款**: 宪法 I「规格书唯一输入」（`.specify/memory/constitution.md` L15–20）、「开发工作流与质量门」（L87–94）。
- **现状**: 分支树中只有 `frontend/`、`backend/`、`README.md`、`.gitignore`；没有 `.specify/`、`specs/`、`docs/`，需求/计划/任务与代码无法互相追溯。
- **目标**: 建立与 main 同构的 `.specify/memory/constitution.md` 与 `specs/001-frontend-foundation` 至 `specs/009-reports-users`（spec / plan / tasks / contracts / checklists），每个 plan 带 Constitution Check；补充 `docs/前后端开发约定.md`。
- **改哪里**:
  - 新增 `.specify/`（constitution、templates、workflows）；
  - 新增 `specs/001-frontend-foundation/` … `specs/009-reports-users/`；
  - 新增 `docs/前后端开发约定.md`；
  - 每份 plan/contracts 必须按 zwx 实际代码核对后书写，不能照抄 main 而不改路径/模块名。

### P0-2 重建 mock/真实逐模块切换机制

- **规范条款**: 宪法 IV「契约先行、Mock 并行」（L40–44）；`specs/001-frontend-foundation/research.md` R1、`tasks.md` T002/T006；`specs/002–009` 各自的 `VITE_REAL_MODULES=<module>` 切换要求。
- **现状**:
  - 没有 `frontend/src/api/mock/index.ts`，开关写在 `frontend/src/utils/sse.ts` 的 `useReal()` 里；
  - mock 仅覆盖 `auth`、`data`、`alarms`、`predictions`、`assistant`；
  - `workorders`、`devices`、`inspections`、`reports`、`users` 的 api 文件**完全没有 mock 分支**，直接请求真实后端；
  - `frontend/.env.development` 默认 `VITE_REAL_MODULES=auth,users,workorders,devices,inspections,reports`，无后端时登录即失败，不能独立演示；
  - 模块名用复数（`alarms`、`predictions`、`users`），按规格设置 `VITE_REAL_MODULES=alarm` 不会生效。
- **目标**:
  - 新增 `api/mock/index.ts`，导出 `isMockEnabled(module)`：`VITE_USE_MOCK=false` 全部真实；`true` 时仅 `VITE_REAL_MODULES` 中的模块真实；
  - 10 个模块全部具备 mock，可无后端端到端演示；
  - 模块名统一为单数：`auth,data,alarm,prediction,workorder,device,inspection,report,assistant,user`；
  - `.env.development` 默认 `VITE_USE_MOCK=true`、`VITE_REAL_MODULES=`（空）。
- **改哪里**:
  - 新增 `frontend/src/api/mock/index.ts`；
  - 改 `frontend/src/utils/sse.ts`（移除内部开关，改为从 `api/mock` 导入）；
  - 改 `frontend/src/api/alarms.ts`、`devices.ts`、`inspections.ts`、`reports.ts`、`users.ts`、`predictions.ts`、`workorders.ts`，统一按 `isMockEnabled('<单数模块名>')` 分流；
  - 新增 `frontend/src/api/mock/workorder.json`、`device.json`、`inspection.json`、`report.json`、`users.json`（结构照 `specs/*/contracts/*.md`）；
  - 改 `frontend/.env.development`，新增 `frontend/.env.example`。

### P0-3 目录与命名对齐既定 plan

- **规范条款**: `specs/001-frontend-foundation/data-model.md` L5（类型必须落 `frontend/src/api/types.ts`）、`plan.md` L89–120 的目录结构、`tasks.md` T004/T006/T009/T010/T022/T023，以及 002–009 各 plan 的 `api/*.ts` 路径。
- **现状**:
  - 类型在 `frontend/src/types.ts`（顶层），不在 `api/types.ts`；
  - api 文件为复数：`alarms.ts`、`devices.ts`、`inspections.ts`、`predictions.ts`、`reports.ts`、`users.ts`（规格为 `alarm.ts`、`device.ts`、`inspection.ts`、`prediction.ts`、`report.ts`、`user.ts`）；
  - 视图命名 `views/login/Login.vue`、`views/alarms/Alarms.vue` 等（规格为 `<Module>View.vue`）；
  - 路由直接内联在 `router/index.ts`，没有 `router/routes.ts` 单一数据源。
- **目标**:
  - 类型迁到 `api/types.ts`；
  - api 文件改为单数并与 spec 的 tasks 路径一一对应；
  - 视图改为 `views/<module>/<Module>View.vue`（如 `LoginView.vue`、`AlarmsView.vue`、`WorkOrdersView.vue`）；
  - 新增 `router/routes.ts`，菜单与守卫都从它派生。
- **改哪里**: `frontend/src/types.ts` → `frontend/src/api/types.ts`；`frontend/src/api/{alarms,devices,inspections,predictions,reports,users}.ts` 重命名并更新 import；`frontend/src/views/**` 重命名；新增 `frontend/src/router/routes.ts` 并改 `router/index.ts`、`components/AppLayout.vue`。

### P0-4 补齐 README 与 `.env.example`

- **规范条款**: 宪法「技术约束与统一约定」L68（`docker-compose.yml`、`.env.example`）、「开发工作流」L94（README 含三步启动、演示账号、演示流程）；`specs/001-frontend-foundation/plan.md` L89 与 `tasks.md` T002。
- **现状**: 根 `README.md` 只有一行 `# green_mind`；`frontend/` 下没有 `.env.example`；`frontend/.env.production` 存在但未说明用途。
- **目标**: README 写清环境要求、`npm install/dev/build/preview`、四个演示账号与密码、演示模式与逐模块切换示例、演示流程；`.env.example` 列出 `VITE_USE_MOCK` / `VITE_REAL_MODULES` 并注明默认值；不提交任何密钥。
- **改哪里**: `README.md`、新增 `frontend/.env.example`、`frontend/.env.production`（保留但加注释，说明生产构建走真实接口）。

### P1-1 告警 mock 契约与 5 秒验收

- **规范条款**: `docs/前后端开发约定.md` 1.6（事件名 `alarm`、5 秒内横幅，L63–71）；`specs/003-alarm-center/contracts/alarm.md`；`specs/003-alarm-center/spec.md` 验收。
- **现状**: `frontend/src/api/mock/alarms.ts` 与 `utils/sse.ts` 的 mock 事件只有 `id/level/device_id/pollutant/value`，**缺 `summary`**；mock 首条 15 秒、之后每 30 秒，达不到“5 秒内”；`AlarmEvent.summary` 被定义为可选。
- **目标**: mock 首条 ≤5 秒（建议 2–3 秒），事件字段固定为 `{id, level, device_id, pollutant, value, summary}`；列表/详情结构照 `contracts/alarm.md`；真实模式断线可重连。
- **改哪里**: `frontend/src/utils/sse.ts`（mock 定时）、`frontend/src/api/mock/alarms.ts`、`frontend/src/types.ts`（`AlarmEvent.summary` 必填）。

### P1-2 报表导出必须带鉴权

- **规范条款**: `docs/前后端开发约定.md` 1.2（除登录外均带 `Authorization: Bearer`，L26–28）、3.1 报表接口。
- **现状**: `frontend/src/api/reports.ts` 的 `reportExportUrl()` 直接返回 `/api/reports/{id}/export?format=...`，页面用链接/`href` 打开，**不会携带 token**，真实模式会 401。
- **目标**: 用 axios `responseType: 'blob'` 携带 Bearer 下载文件并处理错误；或后端提供短期签名 URL（需在约定中写明）。
- **改哪里**: `frontend/src/api/reports.ts`、`frontend/src/views/reports/Reports.vue`。

### P1-3 助手 mock 持久化与工具问答

- **规范条款**: `specs/008-ai-assistant/spec.md` FR-001、FR-006、SC-002（L41、L46、L55）。
- **现状**: `frontend/src/api/mock/assistant.ts` 每次返回固定会话/消息，新建会话不进入列表，刷新即丢失，无按用户隔离；回答是固定文本，不是从 mock 数据计算。
- **目标**: 会话与消息按用户持久化（`localStorage["gm_assistant_<userId>"]`）；新建/删除/切换真实生效；回答通过 mock 数据计算最大值、告警数、健康度等；流式逐字输出。
- **改哪里**: `frontend/src/api/mock/assistant.ts`、`frontend/src/api/assistant.ts`、`frontend/src/views/assistant/Assistant.vue`。

### P1-4 构建质量门加入类型检查

- **规范条款**: 宪法 VI（`npm run build` 通过，L54）；`specs/001-frontend-foundation/plan.md` Testing（`vue-tsc --noEmit` + `vite build`，L26–28）。
- **现状**: `frontend/package.json` 的 `build` 只有 `vite build`，`typecheck` 是独立脚本，提交前不会拦截类型错误。
- **目标**: `"build": "vue-tsc --noEmit && vite build"`，并保证一次通过。
- **改哪里**: `frontend/package.json`。

### P2-1 viewer 写入口（巡检）

- **规范条款**: 宪法 V（前端按角色隐藏写入口，L46–49）；`specs/007-inspection-h5/spec.md`；`specs/006-device-assets/spec.md` SC-002 的“viewer 写入口 0”口径。
- **现状**: `frontend/src/views/inspection/Inspection.vue` 的“提交巡检”按钮对所有角色可见，viewer 可进入提交流程（依赖后端 403 兜底）。设备健康分刷新在 B 套已按 admin 隐藏，此项仅巡检。
- **目标**: viewer 不渲染“提交巡检”按钮（或用 `canWrite` 禁用并说明），后端仍保持 403 双层校验。
- **改哪里**: `frontend/src/views/inspection/Inspection.vue`；如引入统一判断，复用 `usePermission().canWrite`。

### P2-2 告警 SSE 鉴权方式统一

- **规范条款**: `docs/前后端开发约定.md` 1.2/1.6（Bearer 与 SSE 事件约定）。
- **现状**: B 套用 `EventSource('/api/alarms/stream?token=...')` 传 token，能工作但 token 出现在 URL/日志；A 套则未带 token。两套都不完全符合“其余接口带 Bearer”。
- **目标**: 与后端确定一种 SSE 鉴权（HttpOnly cookie 或短期一次性 query token），写入 `docs/前后端开发约定.md`，前端按约定实现并在失败时给出可读提示。
- **改哪里**: `frontend/src/utils/sse.ts`、`docs/前后端开发约定.md`、后端 alarms stream 路由（联调确认）。

### P2-3 路由/菜单单一数据源

- **规范条款**: `specs/001-frontend-foundation/plan.md` L114–116（`router/routes.ts` 作为菜单/守卫单一来源）。
- **现状**: `frontend/src/router/index.ts` 内联全部路由；`components/AppLayout.vue` 另维护 `allMenus`，两处可能漂移。
- **目标**: 路由表集中在 `router/routes.ts`（含 `meta.title/roles/hidden`），菜单从路由表过滤生成。
- **改哪里**: 新增 `frontend/src/router/routes.ts`，改 `frontend/src/router/index.ts`、`frontend/src/components/AppLayout.vue`。

---

## 3. 共性问题（A 套也存在，整改时一并处理）

- **viewer 可见巡检提交入口**：A 套 `frontend/src/views/inspection/InspectionView.vue` L231 同样未按角色隐藏，建议两套统一修。
- **“手动建告警”未实现**：宪法 V 提到 engineer 可“手动建告警/工单”，但 `specs/003-alarm-center` 未列该需求，A/B 两套都只实现手动建工单。需先补规格或修订宪法措辞，不能只改代码。
- **告警 SSE 鉴权**：见 P2-2，A 套当前未带 token，B 套用 query token，均需按最终约定统一。

---

## 4. 建议施工顺序与验收

1. P0-1、P0-3（先立规范与目录骨架）→ P0-2、P0-4（mock 与文档）→ P1-1…P1-4 → P2-1…P2-3。
2. 每完成一项，按对应 spec 的 Independent Test 验证；全部完成后执行：
   - `cd frontend && npm run build`（含 `vue-tsc`）通过；
   - 断开后端，仅用 mock 走通登录 → 大屏 → 告警 → 工单 → 巡检 → 报表 → 助手；
   - 逐模块设置 `VITE_REAL_MODULES` 验证切换互不影响；
   - viewer 登录检查全站写入口为 0（巡检提交、设备 CRUD/刷新、告警确认、工单操作、报表生成、用户管理）。
3. 整改完成前，`origin/feature/frontend` 仅作为参考实现保留，不合并回 `master`。
