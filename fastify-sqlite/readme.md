一套可直接运行的「库存/仓储管理」服务，基于 Fastify + sqlite3（本地 SQLite），包含：

实体：仓库（warehouses）、产品（products）、库存（inventory）、出入库/调拨记录（stock_movements）

完整 CRUD 与分页检索

事务化的入库、出库、调拨、调整（自动增减库存）

软删除（deleted_at）

一整套 curl 测试命令

你已安装了 fastify 与 sqlite3 等依赖；如果还没有这些包：
`npm i fastify fastify-sensible sqlite3`
