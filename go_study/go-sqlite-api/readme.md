**运行步骤**
```
# 1) 初始化模块
mkdir go-sqlite-api && cd go-sqlite-api
go mod init example.com/go-sqlite-api

# 2) 把下面 main.go 保存到当前目录
# 3) 拉取依赖
go get github.com/go-chi/chi/v5 github.com/go-chi/cors modernc.org/sqlite

# 4) 运行
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
