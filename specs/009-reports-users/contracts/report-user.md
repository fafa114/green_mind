# Contract: 报表 + 用户（009 消费侧）
维护者 D。基准执行版模块 7 + 5.4 + 第八节。需 Bearer。

## GET /api/reports?page= → `{items:[{id,period,generated_at}], total, page, page_size}`
## GET /api/reports/{id} → `{period, stats, content_md}`
stats: `{pollutants:{pm:{max,avg,exceed_hours},...}, alarm_by_level:{yellow,orange,red}, workorder:{total,completed,on_time_rate}, inspection_count, avg_health}`
## POST /api/reports/generate {period}（admin，同步，可能30s）→ Report
## GET /api/reports/{id}/export?format=pdf|excel → 文件下载
## GET/POST/PUT/DELETE /api/users（仅 admin；密码 bcrypt；不能删自己）
User: `{id,username,real_name,role,created_at}`；POST/PUT 含 password。
## Mock
report.json 含 stats+四章节 content_md（数字与 stats 一致）；generate 内存追加；export 客户端生成 .xls/打印 PDF；
users.json CRUD 内存生效，删自己 400，用户名重复 400；VITE_REAL_MODULES=report,user 切真实。