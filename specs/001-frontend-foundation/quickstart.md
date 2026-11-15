# Quickstart: 前端地基独立演示与验收（001-frontend-foundation）

**目的**: 在后端完全未就绪的情况下，端到端验证本 feature 四个用户故事与 SC-001…SC-006。
契约细节见 [contracts/](./contracts/)，数据结构见 [data-model.md](./data-model.md)。

## 前置条件

- Node.js ≥ 18、npm
- 无需后端、无需数据库（默认演示模式）

## 启动

```bash
cd frontend
npm install
npm run dev          # .env.development 默认 VITE_USE_MOCK=true
```

打开 http://localhost:5173 。

## 演示账号（密码均 123456）

| 账号 | 角色 | 顶栏姓名 |
|---|---|---|
| admin | admin | 系统管理员 |
| engineer1 | engineer | 张工程师 |
| engineer2 | engineer | 李工程师 |
| viewer | viewer | 王查看 |

## 验证场景

### US1 登录与会话保持（SC-001 / SC-002）

1. 四个账号分别登录：≤10 秒进入工作台，顶栏显示对应真实姓名。
2. 登录后刷新浏览器：仍保持登录，无需重输密码。
3. 点击退出：回到登录页；再直接访问 `/dashboard` 被要求登录。
4. 错误密码 / 不存在用户名：统一提示"用户名或密码错误"，停留登录页。
5. 手动清除 localStorage 的 `gm_session` 后发起任一业务请求（或切真实模式制造 401）：
   统一清空会话并跳登录页，无半登录态。
6. 已登录直接访问 `/login`：进入工作台，不重复登录。

### US2 角色导航与访问控制（SC-003）

1. viewer 登录：菜单仅只读入口；全站写操作入口（新建/编辑/删除/确认/审批）数量为 0。
2. engineer1 登录：手动输入 `/admin/users` → 被重定向到有权限页面。
3. 未登录直接访问任一受保护路由 → 跳登录页；登录成功后回到原目标页。
4. admin 登录：可见全部入口，含用户管理。
5. 同一浏览器退出 viewer 改登 admin：菜单与写入口立即按新角色刷新，无残留。

### US3 应用壳与页面骨架（SC-004）

1. 任一角色逐一访问九个业务路由（监控大屏/告警/预测/工单/设备/巡检/报表/助手/用户管理）：
   全部可达、无死链；未实现页显示"建设中"占位，无虚构业务数值。
2. 大屏骨架切换设备（CEMS-01 ↔ CEMS-02）：指标卡与 24h 趋势图联动刷新。
3. CEMS-01 存在超标污染物：对应指标卡超标态高亮；CEMS-02 全部正常态。
4. 手机视口访问 `/inspection`：无侧边栏空白布局。

### US4 无后端独立演示与逐模块切换（SC-005）

1. 后端完全停机 + 演示模式：完整走通"登录 → 导航 → 大屏骨架"，无报错、无空白页。
2. 演示模式下刷新：会话与演示模式状态保持。
3. 单模块切换：启动后端桩（或任一能响应 `/api/auth/login` 的服务）于 :8000，
   设置 `VITE_REAL_MODULES=auth` 重启 dev server：登录走真实接口，
   大屏及其余模块仍用演示数据，互不影响。
4. 真实模式下停掉后端再操作：可读错误提示，页面不崩溃。

### 总验收（SC-006）

```bash
npm run build        # vue-tsc --noEmit && vite build，须一次通过
npm run preview      # 复跑上述演示流程
```

- 生产构建一次通过；完整演示流程浏览器控制台报错数为 0。

## 环境变量

| 变量 | 默认 | 说明 |
|---|---|---|
| VITE_USE_MOCK | true（.env.development） | 全局演示数据开关 |
| VITE_REAL_MODULES | 空 | 逗号分隔强制走真实接口的模块名（如 `auth,data`），覆盖全局 mock |

## 通过标准

上述全部场景通过 = 本 feature 验收完成（对应 spec.md Success Criteria 逐条）。
任何 mock 与 Swagger 不一致：以契约为准修正 mock，不改页面适配错误结构。