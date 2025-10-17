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
