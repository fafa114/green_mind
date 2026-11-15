# Contract: 告警（003 消费侧）

维护者：后端 C。基准：执行版模块 2 + 第四节 + 5.1。需 Bearer token。

## GET /api/alarms?level=&status=&device_id=&start=&end=&page=&page_size=
→ `{items:[Alarm], total, page, page_size}`
Alarm: `{id, device_id, ts, level(yellow|orange|red), pollutant, value, limit_val, reason,
status(pending|acked|closed), diagnosis(JSON|null), workorder_id(int|null), created_at}`

## GET /api/alarms/{id}
→ Alarm（含 diagnosis、workorder_id）

## POST /api/alarms/{id}/ack
→ 更新后的 Alarm（status=acked）。engineer+；viewer 403。

## diagnosis 结构（5.1）
`{root_causes:[{cause:string, confidence:0—1}]（≤3）, measures:string[],
estimated_recovery_minutes:number, summary:string（≤200字）}`

## GET /api/alarms/stream（SSE，与 002 共享）
event:alarm data:`{id, level, device_id, pollutant, value, summary}`

## Mock 行为
- alarm.json：≥8 条样本，覆盖 yellow/orange/red、pending/acked/closed、含/不含 diagnosis、含/不含 workorder_id。
- 筛选/分页在 mock 层按参数过滤切片；ack 在 mock 层更新状态。
- VITE_REAL_MODULES=alarm 时走真实接口。