# GreenMind · 气体排放监控系统

垃圾焚烧烟气 CEMS 监控平台。第一期目标：基于真实历史数据格式构建可追溯的**历史回放**监控系统，
完成「导入 → 数据质量 → 监控 → 告警 → 工单 → 验收 → 报告」闭环，并提供有证据引用的智能问答与实验性趋势分析。

- **团队与排期**：3 人（A 前端 + C/D 后端）× 10 周。
- **唯一开发输入**：《GreenMind 开发规格书（执行版）》。仓库内《GreenMind_需求与四人并行开发方案.md》为讨论稿，不采纳。
- **流程**：spec-kit（constitution → specify → plan → tasks → implement），产物见 `specs/` 与 `.specify/memory/constitution.md`。

## 当前进度

| 模块 | 状态 |
|---|---|
| 前端 001 地基（登录 / 角色化应用壳 / 监控大屏骨架 / mock 机制） | ✅ 已完成并通过运行时验收 |
| 前端 002+ 业务页面（告警 / 预测 / 工单 / 设备 / 巡检 / 报表 / 助手 / 用户管理） | 🚧 占位，后续 feature |
| 后端（C 数据与 AI / D 业务与基础） | 🚧 待开发，第 1 周交付 models + Swagger 桩 |

## 技术栈（锁定，见宪法 II）

- **前端**：Vue 3 + Vite + TypeScript + Element Plus + ECharts 5 + Pinia + Vue Router + axios + markdown-it + html5-qrcode，签名用原生 canvas。
- **后端**：Python 3.11 + FastAPI + SQLAlchemy 2 + MySQL 8 + APScheduler + httpx + python-jose + passlib/bcrypt + openpyxl + xhtml2pdf。
- **LLM**：DeepSeek OpenAI 兼容接口，备用模型可配置；不训练模型。
- **部署**：docker-compose（mysql + backend + frontend nginx）。

## 快速开始（前端，可独立运行）

前端默认**演示数据模式**，后端未就绪也可完整开发与演示：

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

生产构建与预览：

```bash
npm run build        # vue-tsc 类型检查 + vite build
npm run preview      # http://localhost:4173
```

### 演示账号（密码均 123456）

| 账号 | 角色 | 姓名 | 权限 |
|---|---|---|---|
| admin | 管理员 | 系统管理员 | 全部（含用户管理） |
| engineer1 | 工程师 | 张工程师 | 业务写操作 |
| engineer2 | 工程师 | 李工程师 | 业务写操作 |
| viewer | 查看者 | 王查看 | 只读（无写入口） |

### 演示模式与逐模块切换

| 变量 | 默认 | 说明 |
|---|---|---|
| `VITE_USE_MOCK` | `true` | 全局演示数据开关 |
| `VITE_REAL_MODULES` | 空 | 逗号分隔强制走真实接口的模块名，覆盖全局 mock |

后端每交付一个模块，就把对应模块名加入 `VITE_REAL_MODULES`（如 `auth,data`），其余模块继续 mock，互不影响。
mock 数据结构与后端 Swagger 契约一致（见 `specs/001-frontend-foundation/contracts/`）。

## 全栈本地启动（待后端就绪）

```bash
docker compose up -d mysql                 # 1. 数据库
uvicorn app.main:app --reload              # 2. 后端（backend/，:8000）
cd frontend && npm run dev                 # 3. 前端（:5173）
python backend/scripts/seed_demo.py        # 4. 演示数据 + 账号
```

## 前端目录结构

```text
frontend/src/
├── api/          # axios 封装 + 每模块接口 + mock/（auth.json / data.json）
├── views/        # login / dashboard / placeholders（8 个建设中占位）
├── components/   # AppLayout / MetricCard / TrendChart / PageTable / AppIcon
├── stores/       # pinia: user.ts（会话持久化）
├── router/       # routes.ts（菜单/守卫单一数据源）+ index.ts（登录/角色守卫）
├── utils/        # request.ts / permission.ts / format.ts
└── styles/       # 设计系统（环保青绿色板 + 告警语义色）
```

## 前端总验收（宪法 VI）

- `npm run build` 通过；所有路由可达；角色守卫生效（viewer 无写入口、`/admin/users` 重定向）；控制台无报错。
- 已用无头浏览器（Edge + Playwright）验证：登录/刷新保持/退出、三角色菜单与越权、设备切换联动、
  超标高亮、趋势图渲染、移动端自适应、巡检空白布局、错误密码统一提示、逐模块真实切换。

## 文档

- 前后端约定（C/D 必读）：[`docs/前后端开发约定.md`](docs/前后端开发约定.md)
- 项目宪法：[`.specify/memory/constitution.md`](.specify/memory/constitution.md)
- 001 前端地基规格产物：[`specs/001-frontend-foundation/`](specs/001-frontend-foundation/)（spec / plan / research / data-model / contracts / quickstart / tasks）

## 代码归属

- **A**：`frontend/` 全部（9 页面 + 公共组件 + mock）。
- **C**：routers `data/alarm/prediction/assistant`；services `llm/prompts/alarm_engine/预测任务`。
- **D**：全部 models；routers `auth/workorder/device/inspection/report`；services `workorder_svc/SLA/报表任务`；上传/日志。
- 公共底座唯一：LLM 封装归 C，登录/权限归 D。不得越界修改他人归属代码。