# Data Model: 前端地基（001-frontend-foundation）

**Date**: 2026-11-14 | **Scope**: 前端视图模型与演示数据结构（非数据库模型；后端表结构由 D 负责，见规格书第三节）

所有类型定义落在 `frontend/src/api/types.ts`；mock JSON 必须与下列结构逐字段一致（FR-012）。

## 1. UserSession（用户会话）

| 字段 | 类型 | 约束 |
|---|---|---|
| token | string | JWT HS256，24h 过期（后端签发；演示模式为同构 mock token） |
| user.id | number | 必填 |
| user.username | string | 必填，登录名 |
| user.real_name | string | 必填，顶栏显示真实姓名（FR-001） |
| user.role | Role | 必填，枚举 `admin \| engineer \| viewer` |

- 持久化：localStorage 键 `gm_session`，JSON 序列化整体 `{token, user}`；退出或 401 时清空（FR-002/FR-004）。
- 状态迁移：`未登录 → 已登录`（登录成功）；`已登录 → 未登录`（退出 / 会话过期 401）。无中间半登录态。

## 2. Role（角色）

枚举：`admin`（全部权限，含用户管理）/ `engineer`（业务写操作）/ `viewer`（只读，写入口数量为 0）。
前端仅控制显隐与路由可达；后端强制校验由 D 实现（宪法 V）。

## 3. DemoAccount（演示账号，mock/auth.json）

| username | password | real_name | role |
|---|---|---|---|
| admin | 123456 | 系统管理员 | admin |
| engineer1 | 123456 | 张工程师 | engineer |
| engineer2 | 123456 | 李工程师 | engineer |
| viewer | 123456 | 王查看 | viewer |

约束：密码均 123456（规格书第九节）；登录失败统一提示，不区分"用户不存在/密码错误"（FR-001）。

## 4. DeviceOption（设备选项，GET /api/data/devices 元素）

| 字段 | 类型 | 约束 |
|---|---|---|
| device_id | string | 监测点编号，如 `CEMS-01` |
| name | string | 设备名称（联 device 表） |
| last_ts | string | ISO 8601（YYYY-MM-DDTHH:mm:ss），该设备最新数据时间 |

演示数据：CEMS-01（1#焚烧炉排放口）、CEMS-02（2#焚烧炉排放口）。

## 5. LatestObservation（最新观测，GET /api/data/latest 响应 = cems_raw 整行）

| 字段组 | 字段 | 类型/单位 |
|---|---|---|
| 标识 | ts, device_id | string ISO 8601 / string |
| 工况参数 | furnace_temp, flow, o2, flue_temp, flue_pressure, flue_velocity, flue_humidity | number；℃ / m³/h / % / ℃ / Pa / m/s / % |
| 颗粒物 | pm_real, pm_std, pm_limit | number，mg/m³（实测/折算/标准） |
| SO₂ | so2_real, so2_std, so2_limit | number，mg/m³ |
| NOₓ | nox_real, nox_std, nox_limit | number，mg/m³ |
| CO | co_real, co_std, co_limit | number，mg/m³ |
| HCl | hcl_real, hcl_std, hcl_limit | number，mg/m³ |
| 标记 | condition_flag | string 枚举 `normal \| startup \| shutdown \| fault` |
| 标记 | report_flag, comm_flag, exceed_flag, zero_flag | number（0/1） |

- 指标卡显示用 `*_std`（折算值）对比 `*_limit`（标准值）；`*_std >= *_limit` 时超标高亮（FR-010）。
- 演示数据约束：CEMS-01 至少 1 项污染物 `*_std > *_limit`（超标高亮可演示）；CEMS-02 全部正常。
- 本期不做监管合规判定，仅"来源数值对比标准值"的运维展示（规格书边界）。

## 6. HistoryPoint / HistoryPage（趋势，GET /api/data/history）

HistoryPoint：`{ ts, furnace_temp, flow, pm_std, so2_std, nox_std, co_std, hcl_std, condition_flag }`
（ts 为 ISO 8601；interval=hour/day 时污染物取 std 列均值——规格书模块 1）。

HistoryPage：`{ items: HistoryPoint[], total: number }`。

- 本期大屏骨架请求 `interval=hour`、近 24h，渲染 5 污染物折线 + 各自标准值虚线。
- 演示数据：每设备 24 个逐时点；CEMS-01 含 1 段超标准值区间。

## 7. ApiError / Page（统一约定）

- ApiError：`{ detail: string }`；状态码 400 参数错 / 401 未登录 / 403 无权限 / 404 不存在。
- Page（分页响应，本期仅 PageTable 封装使用）：`{ items: T[], total: number, page: number, page_size: number }`；
  请求参数 page 默认 1，page_size 默认 20 最大 100。

## 8. NavItem（导航项，派生实体）

由 `router/routes.ts` 派生：`{ path, title, roles? }`；AppLayout 按当前角色过滤后渲染。
不单独持久化；角色切换后必须立即重算（Edge Case：无上一角色残留）。

## 实体 → User Story 映射

| 实体 | 服务的故事 |
|---|---|
| UserSession / Role / DemoAccount | US1（登录会话）、US2（角色控制） |
| NavItem | US2（角色导航）、US3（应用壳） |
| DeviceOption / LatestObservation / HistoryPoint | US3（大屏骨架）、US4（演示数据） |
| ApiError / Page | US1（错误提示）、US3（PageTable）、US4（失败可读提示） |