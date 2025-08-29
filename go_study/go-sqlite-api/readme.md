**运行步骤**
```
# 1) 初始化模块
mkdir go-sqlite-api && cd go-sqlite-api
go mod init example.com/go-sqlite-api

# 2) 把下面 main.go 保存到当前目录
# 3) 拉取依赖
go get github.com/go-chi/chi/v5 github.com/go-chi/cors modernc.org/sqlite

# 4) 运行 【 main.go 在服务起来后，自动打开浏览器并加载 admin.html（由后端按根路径 / 提供），实现“一键启动前后端”。】
go run .   # 默认 http://127.0.0.1:8080
```


**API 速览**
- 健康检查：GET /api/health
- 客户：GET/POST /api/customers；GET/PUT/DELETE /api/customers/{id}
- 产品：GET/POST /api/products；GET/PUT/DELETE /api/products/{id}
- 订单：GET/POST /api/orders；GET/PUT/DELETE /api/orders/{id}；GET /api/orders/{id}/items
- 付款：GET/POST /api/payments；GET/DELETE /api/payments/{id}
- 统计：GET /api/stats/daily-sales?from=YYYY-MM-DD&to=YYYY-MM-DD
- 通用查询参数（列表接口支持）：
- 分页：page（默认1）、size（默认20，≤100）
- 排序：sort=field:asc|desc（如 sort=created_at:desc）
- 过滤（示例）：
   - GET /api/orders?status=PAID&customer_id=1
   - GET /api/products?category=Peripherals

**后端设计说明** 设计说明（新手友好版）
- SQLite 驱动：用 modernc.org/sqlite，优点是纯 Go、跨平台，避免 gcc 依赖；如果你偏好 github.com/mattn/go-sqlite3 也可直接替换驱动导入（但需 CGO）。
- 外键与级联：开启 PRAGMA foreign_keys=ON；order_items、payments 级联随订单删除。
- 时间字段：统一用 TEXT 存 RFC3339（SQLite 没有原生 datetime 类型），查询/序列化准确且可读。
- 事务：创建订单时，主单 + 明细 + 付款放在一个事务里，要么都成功要么都回滚，避免“孤儿数据”。
- 分页排序：通用 page/size/sort，并白名单允许排序的字段，防止 SQL 注入。
- CORS：允许任意源 *，前端（如 localhost:3000）可直接调用；生产建议收紧域名。
- 索引：对常用查询列建索引（如 orders.customer_id、order_items.order_id）。
- 删除行为：删除客户/产品若被引用会报错（RESTRICT），删除订单会级联删明细与付款（CASCADE）。

## 前端部分
admin.html
- 包含页面：仪表盘、客户、产品、订单、创建订单、付款单
- 覆盖功能：分页、排序、筛选、增删改查、订单原子创建（含多明细 + 可选即时付款）、订单明细查看、统计（日销售额）

