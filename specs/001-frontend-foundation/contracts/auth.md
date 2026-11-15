# Contract: 认证（消费侧）

**维护者**: 后端 D（auth router）；前端 A 消费。基准：规格书第四节统一约定。
后端 Swagger 桩交付后，本契约与其逐字段对齐；不一致时以 Swagger 为准修正 mock（spec Edge Case）。

## POST /api/auth/login

登录，公开接口（无需 token）。

**Request**（application/json）:

```json
{ "username": "admin", "password": "123456" }
```

**Response 200**:

```json
{
  "token": "<JWT HS256, 24h 过期>",
  "user": { "id": 1, "username": "admin", "real_name": "系统管理员", "role": "admin" }
}
```

- `role` 枚举：`admin | engineer | viewer`。
- 后续所有接口请求头携带 `Authorization: Bearer <token>`。

**Response 401**（用户名不存在或密码错误，统一文案，不区分原因）:

```json
{ "detail": "用户名或密码错误" }
```

**前端行为约定**:
- 成功：会话 `{token, user}` 存 localStorage，进入工作台（或 redirect 回跳目标页）。
- 失败：登录页显示 `detail` 可读提示，停留登录页。
- 任何业务接口返回 401：清空会话 → 跳 `/login`（统一登出，不出现半登录态）。

## Mock 行为（VITE_USE_MOCK=true 且 auth 未被 VITE_REAL_MODULES 覆盖）

- 数据源 `src/api/mock/auth.json`：4 个演示账号（见 data-model.md §3），密码均 123456。
- 命中账号：返回与真实接口同构的 `{token, user}`（token 为演示字符串）。
- 未命中：抛出与 401 同构的 `{detail: "用户名或密码错误"}`，前端走相同错误路径。
- mock 不校验 token 有效期；会话过期路径通过真实模式或手动清除 localStorage 验证。