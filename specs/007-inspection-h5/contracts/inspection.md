# Contract: 巡检（007 消费侧）
维护者 D。基准执行版模块 6。需 Bearer。

## POST /api/upload（multipart 字段 file）→ `{path:"/uploads/..."}`（≤5MB jpg/png）
## POST /api/inspections `{device_code, checklist:[{item,ok,note}], photos:[path], signature_path, abnormal_desc}`
→ `{id, workorder_id}`（任一 ok=false 自动建 medium 工单，否则 workorder_id=null）
## GET /api/inspections?device_id=&page=&page_size= → `{items:[Inspection], total, page, page_size}`
## GET /api/inspections/{id} → Inspection
Inspection: `{id,device_id,inspector_id,checkin_time,checklist,photos,signature_path,abnormal_desc,workorder_id,created_at}`
## 固定6项清单
燃烧系统 / 烟气净化 / CEMS 分析仪 / 校准状态 / 数据上报 / 现场环境。
## Mock
upload 返回可回显路径（保留 dataURL/objectURL）；submit 内存追加并按异常建单（联动 workorder mock）；
VITE_REAL_MODULES=inspection 切真实。