# Research: 前端地基（001-frontend-foundation）

**Date**: 2026-11-14 | **Input**: spec.md + constitution.md + 《GreenMind 开发规格书（执行版）》

Technical Context 无 NEEDS CLARIFICATION：技术栈、目录、统一接口约定均由宪法与规格书锁定。
本文件记录实现层面的设计决策，全部决策不引入锁定清单外依赖。

## R1. Mock 按模块切换机制

- **Decision**: 全局开关 `VITE_USE_MOCK`（默认 `true`）+ 模块级覆盖 `VITE_REAL_MODULES`
  （逗号分隔模块名，如 `auth,data`）。`src/api/mock/index.ts` 提供
  `isMockEnabled(module: string): boolean`：全局为 false 时一律走真实接口；全局为 true 时，
  出现在 `VITE_REAL_MODULES` 中的模块走真实接口，其余走 mock。每个 api 模块文件
  （auth.ts / data.ts）在函数入口调用该 helper 分流。
- **Rationale**: 满足 FR-012"每个业务模块可独立切换、互不影响"与宪法 IV"后端每交付一个
  模块就切换对应模块"；切换只改环境变量，不改业务代码；模块名与 api 文件名一一对应，
  后续 feature 直接沿用。
- **Alternatives considered**: ① 仅单一全局开关——无法逐模块切换，违反 FR-012；
  ② 每模块一个环境变量（VITE_MOCK_AUTH…）——变量膨胀、易漏配；
  ③ 运行时 UI 开关——演示模式状态需持久化且易与真实会话混淆，超出本期范围。

## R2. 会话保持与统一登出

- **Decision**: `stores/user.ts` 将 `{token, user}` 以 JSON 存 localStorage（键
  `gm_session`），store 初始化时同步恢复；`utils/request.ts` 响应拦截器捕获 401 →
  清空 store 与 localStorage → `router.replace('/login?redirect=' + 当前 fullPath)` →
  ElMessage 提示"登录已过期，请重新登录"。演示模式下 mock 登录返回同构 token，
  走完全相同的会话路径。
- **Rationale**: 宪法统一约定（JWT 24h、401 清 token 跳 /login）；刷新保持（FR-002）
  与半登录态防护（FR-004/Edge Case）由同一条路径保证，演示/真实模式行为一致。
- **Alternatives considered**: ① sessionStorage——刷新保持但关标签即失效，且多标签
  不同步，不满足演示习惯；② cookie——后端契约为 Bearer token，无 cookie 约定；
  ③ 仅内存 + 每次刷新重登——违反 FR-002。

## R3. 路由守卫与回跳

- **Decision**: 路由 meta 约定 `{ public?: boolean, roles?: Role[], title: string }`。
  全局 `beforeEach`：未登录访问非 public → `/login?redirect=fullPath`；已登录访问
  `/login` → `/dashboard`；`meta.roles` 存在且不含当前角色 → 重定向 `/dashboard`。
  登录成功后读取 `redirect` 查询参数回跳（仅允许站内路径，防开放重定向）。
- **Rationale**: FR-003/FR-006 的直接实现；守卫只读 store，不产生副作用请求；
  `/admin/users` 配 `roles: ['admin']`。
- **Alternatives considered**: ① 每页组件内自行检查——重复且易漏；② 后端渲染菜单
  权限——本期后端未就绪，且前端层仍必须独立生效（宪法 V 双层）。

## R4. 菜单单一数据源

- **Decision**: `router/routes.ts` 为唯一来源，业务路由 meta 携带 `title`（及可选
  `hidden`）；AppLayout 菜单由 routes 过滤生成：先按登录态/角色过滤，再渲染。
  不维护独立菜单配置文件。
- **Rationale**: 菜单可见性与路由可访问性永远一致（US2 验收：菜单与越权重定向
  行为一致）；新增页面只改一处。
- **Alternatives considered**: 独立 menu.ts 配置——两份来源必然漂移，违反 DRY。

## R5. 写入口显隐机制

- **Decision**: `utils/permission.ts` 提供 `usePermission()`：`canWrite = role !== 'viewer'`、
  `hasRole(...roles)`、`isAdmin`。所有写操作入口（新建/编辑/删除/确认/审批按钮）
  用 `v-if="canWrite"` 控制；本期占位页与大屏骨架不渲染任何写入口，机制自本期建立、
  后续每个业务页面强制复用。
- **Rationale**: FR-007/SC-003（viewer 写入口数量为 0）需要可复用机制而非逐页硬编码；
  前端隐藏 + 后端 require_role 双层（宪法 V），前端层不替代后端校验。
- **Alternatives considered**: 自定义指令 v-role——指令内响应式角色切换处理繁琐，
  composable + v-if 更直观且易测试。

## R6. ECharts 封装与生命周期

- **Decision**: TrendChart 按需引入（echarts/core + LineChart + Grid/Tooltip/Legend
  组件 + CanvasRenderer），props 接收 `series`（含标准值虚线序列）与时间轴数据；
  用 ResizeObserver 自适应容器，`onBeforeUnmount` 调用 `chart.dispose()`；
  数据变化走 `setOption` 增量更新而非重建实例。
- **Rationale**: 按需引入显著减小包体；dispose 防止路由切换后内存泄漏与重复实例
  （控制台零报错要求）；封装后 002/003/005 直接复用。
- **Alternatives considered**: ① 全量引入 echarts——包体大，无必要；② vue-echarts
  第三方包装——锁定清单外依赖，违反宪法 II。

## R7. Element Plus 引入方式

- **Decision**: 全量引入（`app.use(ElementPlus)` + 完整样式），不做按需插件。
- **Rationale**: 管理台页面规模小，全量引入简单可靠；按需方案需 unplugin-vue-components /
  unplugin-auto-import，属锁定清单外新增依赖，需团队确认，本期不引入。
- **Alternatives considered**: 按需自动导入——省包体但引入两个新依赖，收益不抵成本。

## R8. 演示数据设计

- **Decision**: `mock/auth.json` 含 4 账号（admin/engineer1/engineer2/viewer，密码均
  123456，real_name 分别为 系统管理员/张工程师/李工程师/王查看），登录响应结构与
  contracts/auth.md 完全一致。`mock/data.json` 含设备 CEMS-01/CEMS-02、各设备最新值
  （cems_raw 整行字段）与 24h 逐时趋势（history interval=hour 结构）；CEMS-01 安排
  1 项污染物折算值超标准值（触发指标卡超标高亮），CEMS-02 全正常；时间一律
  ISO 8601（YYYY-MM-DDTHH:mm:ss），数值单位与规格书 3.1 一致。
- **Rationale**: FR-010/FR-012/SC-004/SC-005；超标样本保证"超标高亮"验收可演示；
  结构与 Swagger 契约同构，切换真实接口时页面零改动。
- **Alternatives considered**: ① 随机生成数据——不可复现，验收不稳定；② 复用后端
  seed_demo.py 输出——后端未就绪，且前端演示必须独立（US4）。

## R9. 占位页策略

- **Decision**: 统一 `UnderConstruction.vue` 组件（显示页面标题 + "建设中"说明 +
  返回工作台链接），8 个未实现业务路由各挂一个薄视图引用它；不渲染任何业务数值、
  图表或表格假数据。
- **Rationale**: FR-009"明确建设中占位，不得展示虚构业务数值"；统一组件保证风格
  一致，后续 feature 逐个替换。
- **Alternatives considered**: ① 空白页——验收判定为死链/未完成；② 填充假数据——
  明确违反 FR-009。

## R10. 构建与类型检查

- **Decision**: `npm run build` = `vue-tsc --noEmit && vite build`；tsconfig 开启
  strict；`npm run dev` 默认演示模式（.env.development 中 VITE_USE_MOCK=true）。
- **Rationale**: SC-006 生产构建一次通过 + 控制台零报错；类型检查在构建期拦截
  契约类型不匹配。
- **Alternatives considered**: 仅 vite build（跳过类型检查）——契约漂移无法在构建期
  发现，不满足 FR-012 的长期约束。