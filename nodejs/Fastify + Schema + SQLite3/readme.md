## Fastify + Schema + SQLite3 高性能 API 完整实现

🚀 性能优化要点
1. SQLite 优化
- WAL 模式：Write-Ahead Logging，允许读写并发
- 内存缓存：64MB 缓存减少磁盘 I/O
- 内存映射：使用 mmap 加速数据访问
- 预编译语句：prepared statements 避免重复解析 SQL

2. Schema 优化
- 所有端点都定义了完整的 response schema
- 使用 $ref 复用 schema 定义
- 明确的数据验证减少运行时错误

3. 数据库索引
为高频查询字段创建索引：
- email, username（用户查找）
- user_id, post_id（关联查询）
- created_at（时间排序）

4. 事务处理
- 批量插入使用事务，性能提升 10-100 倍

## 安装和运行

# 1. 安装依赖
npm install

# 2. 启动服务器
npm start

# 3. 访问文档
浏览器打开：http://localhost:3000/docs
