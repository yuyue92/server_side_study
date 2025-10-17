一套可直接运行的「库存/仓储管理」服务，基于 Fastify + sqlite3（本地 SQLite），包含：
- 实体：仓库（warehouses）、产品（products）、库存（inventory）、出入库/调拨记录（stock_movements）
- 完整 CRUD 与分页检索
- 事务化的入库、出库、调拨、调整（自动增减库存）
- 软删除（deleted_at）
- 一整套 curl 测试命令

如果还没有这些包：
`npm i fastify fastify-sensible sqlite3`

接口列表
| 方法        | 路径                                   | 说明                                  |
| --------- | ------------------------------------ | ----------------------------------- |
| GET       | `/health`                            | 健康检查                                |
| POST      | `/warehouses`                        | 新建仓库（name, code, address?）          |
| GET       | `/warehouses`                        | 仓库列表（q/limit/offset/includeDeleted） |
| GET       | `/warehouses/:id`                    | 仓库详情（includeDeleted）                |
| PUT/PATCH | `/warehouses/:id`                    | 更新仓库                                |
| DELETE    | `/warehouses/:id?[hard=true]`        | 删除仓库（软/硬）                           |
| POST      | `/products`                          | 新建产品（sku, name, unit?, price?）      |
| GET       | `/products`                          | 产品列表（q/limit/offset/includeDeleted） |
| GET       | `/products/:id`                      | 产品详情（includeDeleted）                |
| PUT/PATCH | `/products/:id`                      | 更新产品                                |
| DELETE    | `/products/:id?[hard=true]`          | 删除产品（软/硬）                           |
| GET       | `/inventory`                         | 库存列表（按仓/品过滤 + 分页，含 join 信息）         |
| GET       | `/inventory/:warehouseId/:productId` | 某仓某品现存量                             |
| POST      | `/stock-movements`                   | 出入库/调拨/调整（IN/OUT/TRANSFER/ADJUST）   |
| GET       | `/stock-movements`                   | 出入库记录查询（按仓、品、类型、ref 过滤）             |

测试命令

# 健康
curl -s http://127.0.0.1:3000/health

# 1) 新建仓库
curl -s -X POST http://127.0.0.1:3000/warehouses -H "Content-Type: application/json" \
  -d '{"name":"上海仓","code":"SH01","address":"浦东新区"}'

curl -s -X POST http://127.0.0.1:3000/warehouses -H "Content-Type: application/json" \
  -d '{"name":"北京仓","code":"BJ01"}'

# 2) 新建产品
curl -s -X POST http://127.0.0.1:3000/products -H "Content-Type: application/json" \
  -d '{"sku":"IPHONE15-BLK-128","name":"iPhone 15 128G 黑","unit":"pcs","price":5999}'

curl -s -X POST http://127.0.0.1:3000/products -H "Content-Type: application/json" \
  -d '{"sku":"AIRPODS3","name":"AirPods 3","unit":"pcs","price":1299}'

# 3) 入库（IN）：向上海仓入 100 台 iPhone
curl -s -X POST http://127.0.0.1:3000/stock-movements -H "Content-Type: application/json" \
  -d '{"movement_type":"IN","warehouse_id":1,"product_id":1,"qty":100,"reason":"采购入库","ref_no":"PO2025-0001"}'

# 4) 出库（OUT）：上海仓出 3 台 iPhone
curl -s -X POST http://127.0.0.1:3000/stock-movements -H "Content-Type: application/json" \
  -d '{"movement_type":"OUT","warehouse_id":1,"product_id":1,"qty":3,"reason":"销售出库","ref_no":"SO2025-0009"}'

# 5) 调拨（TRANSFER）：从上海仓调 10 台 iPhone 到北京仓
curl -s -X POST http://127.0.0.1:3000/stock-movements -H "Content-Type: application/json" \
  -d '{"movement_type":"TRANSFER","warehouse_id":1,"warehouse_to_id":2,"product_id":1,"qty":10,"reason":"区域调拨","ref_no":"TF-001"}'

# 6) 查询库存（全局）
curl -s "http://127.0.0.1:3000/inventory?limit=50"

# 7) 查询指定仓/品库存
curl -s http://127.0.0.1:3000/inventory/1/1
curl -s http://127.0.0.1:3000/inventory/2/1

# 8) 查询出入库记录（按产品/类型过滤）
curl -s "http://127.0.0.1:3000/stock-movements?productId=1&type=TRANSFER&limit=50"

# 9) 列表/检索仓库与产品
curl -s "http://127.0.0.1:3000/warehouses?q=上&limit=10"
curl -s "http://127.0.0.1:3000/products?q=iphone&limit=10"

# 10) 软删产品（禁止误删）
curl -i -X DELETE http://127.0.0.1:3000/products/2

# 11) 查看产品（默认不含软删）
curl -i http://127.0.0.1:3000/products/2

# 12) 查看库存明细与记录
curl -s "http://127.0.0.1:3000/inventory?warehouseId=1"
curl -s "http://127.0.0.1:3000/stock-movements?warehouseId=1&limit=100"
