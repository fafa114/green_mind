# Contract: 数据监控（消费侧，本期骨架所用子集）

**维护者**: 后端 C（data router）；前端 A 消费。基准：规格书模块 1 + 第四节统一约定。
本期（001）仅消费 devices / latest / history 三个只读接口；overview、回放 as_of 交互、
SSE 告警横幅属 002 监控大屏 feature。所有接口需 `Authorization: Bearer <token>`。

## GET /api/data/devices

设备列表（大屏设备选择器数据源）。

**Response 200**:

```json
[
  { "device_id": "CEMS-01", "name": "1#焚烧炉排放口", "last_ts": "2026-11-14T08:00:00" },
  { "device_id": "CEMS-02", "name": "2#焚烧炉排放口", "last_ts": "2026-11-14T08:00:00" }
]
```

## GET /api/data/latest

单设备最新观测（cems_raw 整行字段，见 data-model.md §5）。

**Query**: `device_id`（必填）；`as_of`（可选，ISO 8601，回放用——本期不实现回放交互，仅保留参数透传能力）。

**Response 200**（示例，字段全集见 data-model.md）:

```json
{
  "ts": "2026-11-14T08:00:00", "device_id": "CEMS-01",
  "furnace_temp": 920.5, "flow": 31000.0, "o2": 8.2,
  "flue_temp": 150.0, "flue_pressure": -120.0, "flue_velocity": 12.5, "flue_humidity": 18.0,
  "pm_real": 12.1, "pm_std": 25.3, "pm_limit": 20.0,
  "so2_real": 30.0, "so2_std": 42.0, "so2_limit": 80.0,
  "nox_real": 90.0, "nox_std": 120.0, "nox_limit": 250.0,
  "co_real": 20.0, "co_std": 28.0, "co_limit": 80.0,
  "hcl_real": 8.0, "hcl_std": 11.0, "hcl_limit": 50.0,
  "condition_flag": "normal", "report_flag": 1, "comm_flag": 0, "exceed_flag": 1, "zero_flag": 0
}
```

**错误**: 400 缺 device_id；404 设备不存在；body 均为 `{"detail": "消息"}`。

## GET /api/data/history

时间窗趋势（本期大屏用 `interval=hour` 近 24h）。

**Query**: `device_id`（必填）、`start`/`end`（必填，ISO 8601）、`interval`（`raw | hour | day`，默认 raw；hour/day 取均值，污染物取 std 列）。

**Response 200**:

```json
{
  "items": [
    { "ts": "2026-11-13T09:00:00", "furnace_temp": 915.0, "flow": 30500.0,
      "pm_std": 18.2, "so2_std": 40.1, "nox_std": 118.0, "co_std": 26.0, "hcl_std": 10.5,
      "condition_flag": "normal" }
  ],
  "total": 24
}
```

**错误**: 400 参数错（时间格式/区间非法）；404 设备不存在。

## Mock 行为（VITE_USE_MOCK=true 且 data 未被 VITE_REAL_MODULES 覆盖）

- 数据源 `src/api/mock/data.json`：devices / latest（按 device_id 键控）/ history（按
  device_id 键控的 24 点逐时序列），结构与上述响应逐字段一致。
- CEMS-01 的 latest 与 history 含超标样本（pm_std > pm_limit），CEMS-02 全正常。
- 切换设备时前端以 device_id 重新取数（mock 与真实路径一致）。
- 真实模式下后端不可用：请求失败展示可读错误提示（ElMessage），页面不崩溃（FR-013/US4）。