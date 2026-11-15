# Contract: 数据监控 + 告警 SSE（002 消费侧）

维护者：后端 C。基准：执行版模块 1/2 + 第四节。需 Bearer token。

## GET /api/data/devices
→ `[{device_id, name, last_ts}]`

## GET /api/data/latest?device_id=&as_of=（as_of 可选，ISO 8601）
→ cems_raw 整行（见 001 data-model §5）：ts/device_id/furnace_temp/flow/o2/flue_temp/flue_pressure/
flue_velocity/flue_humidity/{pm,so2,nox,co,hcl}_{real,std,limit}/condition_flag/report_flag/comm_flag/exceed_flag/zero_flag。
回放：as_of 指定历史时刻，返回该时刻最新行。

## GET /api/data/history?device_id=&start=&end=&interval=hour
→ `{items:[{ts,furnace_temp,flow,pm_std,so2_std,nox_std,co_std,hcl_std,condition_flag}], total}`

## GET /api/data/overview?device_id=&date=
→ `{pollutants:{pm:{max,avg,exceed_count},...}, alarm_count}`（大屏概览可选用）

## GET /api/alarms/stream（SSE）
- Content-Type: text/event-stream；事件名 `alarm`；data 为 JSON 字符串：
  `{id, level, device_id, pollutant, value, summary}`
- level ∈ yellow|orange|red。断线由前端重连。

## Mock 行为
- data：mock/data.json（001 已有，含 CEMS-01 超标样本）。
- alarm SSE：mock 模式下 utils/sse.ts 用本地定时器按间隔推送 mock 告警（结构同上），
  驱动横幅与列表；VITE_REAL_MODULES=alarm 时改用真实 EventSource('/api/alarms/stream')。