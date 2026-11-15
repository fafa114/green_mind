# Contract: 预测（005 消费侧）
维护者 C。基准执行版模块 3 + 5.2。需 Bearer。

## GET /api/predictions/latest?device_id=&pollutant=
→ `{base_ts, result}`；result=`{hours:[{ts,value,exceed_prob}]（固定未来6点）, drivers:[string], confidence:0—1}`；value≥0。
## GET /api/predictions?device_id=&pollutant=&page=&page_size=
→ `{items:[{id,device_id,pollutant,base_ts,result,created_at}], total, page, page_size}`
## POST /api/predictions/refresh {device_id}（admin，同步）
→ `{base_ts, result}`（重新生成）
## 历史序列
复用 GET /api/data/history（近24h，interval=hour）作历史实线。
## Mock
prediction.json 按 device_id+pollutant 键控 latest 与 history；refresh 重新生成 base_ts=now 并微调数值；
VITE_REAL_MODULES=prediction 切真实。