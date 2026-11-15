<!--
Sync Impact Report
- Version change: (无) → 1.0.0（首次批准）
- Modified principles: 无（初版）
- Added sections: Core Principles I–VII、技术约束与统一约定、开发工作流与质量门、Governance
- Removed sections: 无（模板占位符全部替换）
- Follow-up TODOs: 无
- 备注: 本报告为临时审阅材料，提交 git 前可删除
-->

# GreenMind Constitution

## Core Principles

### I. 规格书唯一输入（文档先行）
《GreenMind 开发规格书（执行版）》（3 人：1 前端 + 2 后端，10 周）是唯一开发输入。
变更必须先改规格书再改代码；spec-kit 产物（constitution/spec/plan/tasks）必须可追溯到
规格书章节，不得与其冲突。仓库中《GreenMind_需求与四人并行开发方案.md》为讨论稿，
未采纳为基准；若团队决定更换基准，必须先修订本宪法并同步所有受影响的 spec。
理由：三人并行、文档锁定接口与验收，任何口头偏离都会造成联调返工。

### II. 技术栈锁定（禁止重新选型）
前端：Vue 3 + Vite + TypeScript + Element Plus + ECharts 5 + Pinia + Vue Router +
axios + markdown-it + html5-qrcode，签名用原生 canvas。
后端：Python 3.11 + FastAPI + SQLAlchemy 2 + MySQL 8 + APScheduler + httpx +
python-jose + passlib/bcrypt + openpyxl + xhtml2pdf。
LLM：DeepSeek 的 OpenAI 兼容接口，备用模型可配置；不训练模型、不做自研算法。
部署：docker-compose（mysql + backend + frontend nginx）；不用 Redis、不用消息队列。
新增依赖或更换选型必须经团队确认并先更新规格书。

### III. 代码归属与公共底座唯一
A 负责 frontend/ 全部（9 个页面 + 公共组件 + mock 数据）。
C 负责 routers：data/alarm/prediction/assistant；services：llm/prompts/alarm_engine/预测任务。
D 负责全部 models；routers：auth/workorder/device/inspection/report；
services：workorder_svc/SLA/报表任务；上传/日志。
公共底座只有一份：LLM 封装归 C，登录/权限归 D，互相复用不重复造。
两个内部调用是同进程函数而非 HTTP：C 告警引擎 → D workorder_svc.create_from_alarm(alarm)；
D 健康度/报表 → C llm.chat()。不得越界修改他人归属的代码。

### IV. 契约先行、Mock 并行
第 1 周 D 定全部 models 和路由桩（FastAPI 自动生成 Swagger）；A 照 Swagger + mock 开发，
不等后端实现。mock 数据结构必须与 Swagger 一致；VITE_USE_MOCK 控制开关，
后端每交付一个模块就切换对应模块。接口改动必须提前通知搭档；每两周阶段末联调一次。
第四节统一约定（认证、分页、错误、SSE、上传、时间格式）全员强制遵守，不得私自变更。

### V. 权限与审计双重保障
三角色：admin 全部；engineer 可接/完工人单、提交巡检、手动建告警/工单；
viewer 只读（写操作一律 403，登录和助手聊天除外）。
前端必须按角色隐藏写入口，后端必须 require_role 校验，两层缺一不可。
所有非 GET 请求由中间件写 operation_log（user_id、action、target、detail）。

### VI. 验收驱动交付
每个模块以规格书第六节对应验收标准为完成定义，逐条可演示验证。
前端总验收：npm run build 通过；所有路由可达；角色守卫生效（viewer 看不到编辑按钮，
/admin 重定向）；控制台无报错。后端总验收：uvicorn 可启动、/docs 列出全部接口、
seed_demo.py 可跑通、演示账号可登录。最终交付必须端到端走通演示流程：
超标→告警→AI 诊断→自动工单→接单/完成/关闭；月报生成+导出；助手数据问答。

### VII. 核心链路优先、范围纪律
监控→告警→预测→工单是核心链路，资源紧张时优先保住；巡检/报表/助手可顺延。
只做规格书范围内的功能（YAGNI）；不引入规格书之外的页面、字段或"增强"。
排期 P1 地基（周 1-2）→ P2 监控告警（周 3-4）→ P3 预测资产（周 5-6）→
P4 助手报表（周 7-8）→ P5 联调（周 9-10）。

## 技术约束与统一约定

目录结构：greenmind/frontend/（api/ views/ components/ stores/ router/ utils/ + vite.config.ts）、
backend/app/（models/ schemas/ routers/ services/ utils/）、docker-compose.yml、.env.example。

- 认证：POST /api/auth/login 返回 {token, user:{id, username, real_name, role}}；
  JWT HS256，24h 过期；其余接口带 Authorization: Bearer token。
- 响应：成功直接返回 JSON；分页返回 {items, total, page, page_size}；
  错误 body {"detail": "消息"}；状态码 400 参数错 / 401 未登录 / 403 无权限 / 404 不存在。
- 分页：page 默认 1，page_size 默认 20 最大 100；时间参数 ISO 8601（YYYY-MM-DDTHH:mm:ss）。
- SSE：Content-Type text/event-stream；事件名 alarm / token / done；data 为 JSON 字符串。
- 上传：POST /api/upload（multipart，字段 file）→ {"path": "/uploads/..."}；
  静态挂载 /uploads；图片 ≤5MB，仅 jpg/png。
- 前端 axios：baseURL /api；请求拦截器加 token；401 清 token 跳 /login；
  vite 代理 /api → http://localhost:8000。
- 配置 .env：DATABASE_URL、JWT_SECRET、LLM_API_KEY、LLM_BASE_URL、LLM_MODEL、
  LLM_FALLBACK_MODEL、UPLOAD_DIR；密钥不得提交仓库。
- LLM 封装行为：超时 60s；超时/5xx 重试 2 次（退避 1s/3s）；429 或重试失败切备用模型；
  提示词全部为代码常量（规格书 5.1–5.5），每次调用写 operation_log。

## 开发工作流与质量门

- spec-kit 流程：/speckit-constitution → /speckit-specify →（可选 /speckit-clarify）→
  /speckit-plan → /speckit-tasks →（可选 /speckit-analyze）→ /speckit-implement。
  feature 按可独立演示的切片拆分：前端地基一个 feature，之后每个业务页面一个 feature。
- 并行规则：第 1 周 D 出 models + Swagger 桩，A 照桩 + mock 开发，C 做数据接口 + LLM 封装；
  接口改动提前通知搭档；每两周阶段末联调一次，不得等到最后才首次集成。
- 质量门：模块验收标准逐条通过 + 前端/后端总验收（原则 VI）+ 阶段末联调演示。
- 部署与演示：docker compose up 或本地三步（mysql → uvicorn → npm run dev → seed_demo）；
  README 含三步启动、演示账号（admin/engineer1/engineer2/viewer，密码 123456）与演示流程脚本。

## Governance

本宪法优先于其他实践约定；与规格书冲突时，以规格书为准并按修订流程更新宪法。
修订流程：提出变更 → A/C/D 三人确认 → 更新版本号与日期 → 同步受影响的 spec/plan/tasks。
版本规则：MAJOR=原则移除或不兼容重定义；MINOR=新增原则/章节或实质扩展；PATCH=措辞澄清。
合规检查：每阶段末联调时核对代码归属、统一约定与验收标准；越界修改必须在评审中纠正。
日常开发指引使用 .claude/skills 中的 speckit 工作流。

**Version**: 1.0.0 | **Ratified**: 2026-11-14 | **Last Amended**: 2026-11-14