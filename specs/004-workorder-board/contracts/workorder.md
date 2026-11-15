# Contract: 工单（004 消费侧）

维护者：后端 D。基准：执行版模块 4 + 第四节。需 Bearer token。

## GET /api/workorders?status=&assignee_id=&device_id=&page=&page_size=
→ `{items:[WorkOrder], total, page, page_size}`
WorkOrder: `{id, alarm_id(int|null), device_id, title, description, priority(low|medium|high|urgent),
status(pending|processing|accepting|closed), assignee_id(int|null), sla_deadline(ISO),
created_at, accepted_at, finished_at, closed_at, finish_note, accept_note}`

## GET /api/workorders/{id} → WorkOrder
## POST /api/workorders {device_id, title, description, priority} → WorkOrder（engineer+）
## POST /api/workorders/{id}/accept → WorkOrder（assignee/admin）
## POST /api/workorders/{id}/complete {finish_note} → WorkOrder（assignee）
## POST /api/workorders/{id}/approve {pass:boolean, accept_note} → WorkOrder（admin；pass=false 回 processing）
## GET /api/workorders/stats → `{by_status:{pending,processing,accepting,closed}, engineer_load:[{user_id,real_name,open_count}]}`

## 状态机
pending→(accept)→processing→(complete)→accepting→(approve pass)→closed；accepting→(approve 驳回)→processing；closed 终态。
SLA：urgent 2h/high 8h/medium 24h/low 72h（后端算 deadline，前端倒计时）。

## Mock 行为
- workorder.json：覆盖四状态、超时/未超时、不同 assignee、含 alarm_id。
- mock 层实现状态机流转与 stats 计算；越权（非 assignee/admin）返回 403 同构错误。
- VITE_REAL_MODULES=workorder 时走真实接口。