# Contract: 设备（006 消费侧）
维护者 D。基准执行版模块 5 + 5.3。需 Bearer。

## GET /api/devices?page=&page_size=
→ `{items:[Device & {health_score:number|null}], total, page, page_size}`
Device: `{id,code,name,type,install_date,design_life_years,last_calibration_date,calibration_cycle_days,status(running|stopped|maintenance),created_at}`
## POST /api/devices（admin）/ PUT /api/devices/{id}（admin）/ DELETE /api/devices/{id}（admin）
## GET /api/devices/{id}/health → `{score,factors:[{name,impact}],suggestion,scored_at}`（5.3）
## POST /api/devices/{id}/health/refresh → 新 `{score,...}`（0—100）
## Mock
device.json 含 running/stopped/maintenance、已评分/未评分；CRUD/refresh 内存生效；越权 403；
VITE_REAL_MODULES=device 切真实。