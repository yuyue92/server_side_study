**一套可直接跑的「Go + SQLite」预订系统 API**

包含以下：
- 完整的房间 rooms、预订 bookings REST 接口（增删改查、筛选、分页）。
- 关键的“同一房间时间段不重叠（[start, end) 区间语义）”校验：在**事务（BEGIN IMMEDIATE）**内做重叠查询并写入，避免并发竞态。
- SQLite 本地存储（纯 Go 驱动 modernc.org/sqlite，无 CGO），外加索引与 CHECK 约束。
- CORS 跨域支持（默认 *），前端可直接 fetch 调用。
- 错误码语义化（400/404/409/500）与统一 JSON 返回。

界面功能：
- 房间管理：列表、选择当前房间、创建、删除（删除房间会级联删除该房间的预订）。
- 预订管理：列表、状态筛选、创建/编辑预订、快速更新状态（确认/完成/取消）、删除。
- 友好的时间处理：datetime-local 与后端 RFC3339（UTC）互转，半开区间 [start, end) 逻辑由后端保证。
- 轻量对话框（<dialog>）+ Toast 提示。

运行方式:
```
# 1) 初始化模块（任选目录执行）
go mod init example.com/bookingapi

# 2) 拉取依赖
go get modernc.org/sqlite github.com/go-chi/chi/v5 github.com/google/uuid

# 3) 启动（默认 :8080，DB=./app.db）：后端启动后 3 秒 自动在系统默认浏览器里打开前端页面。
go run .
# 可选环境变量：
#   PORT=8080
#   DB_PATH=app.db
#   CORS_ALLOW_ORIGIN=*
```
