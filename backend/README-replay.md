# Excel 监控数据与历史回放

设置 `CEMS_EXCEL_PATH` 为翔安厂 37 列 `.xls` 的绝对路径。启动后端时自动导入；重复启动不会重复插入记录，而是将回放时钟重置为第一条采样时间。`CEMS_DEVICE_ID` 默认为 `XA-3`，`REPLAY_SPEED=60` 表示真实 1 秒播放原始 1 分钟数据。前端显示“历史数据回放”和原始采样时间。

首次启动前创建账号：`GREENMIND_ADMIN_PASSWORD=<自定密码> python scripts/bootstrap_admin.py`。随后运行 `uvicorn app.main:app --host 127.0.0.1 --port 8000`。前端使用 `VITE_USE_MOCK=false`，需正常代理 `/api` 到后端。

原始表格中的“(超)”“(零)”被解析为数值及行级标记。工况映射为 normal/shutdown/startup，维护或故障标记使该行 `report_flag=0`。源流量从 m³/s 转为 m³/h，烟气压力从 kPa 转为 Pa。回放不会把历史采样时间改成今天；大屏的“实时”仅表示当前回放游标。源文件中外部通讯中断列为“-”，本导入器将其映射为未标记中断。该映射需与源系统语义核对。

当前 `cems_raw` 模型只有行级质量标记，源表逐指标的原始标记并未逐列保留。此限制影响细粒度质控追溯，后续需扩展数据库模型再导入。
