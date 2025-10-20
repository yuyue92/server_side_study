todoApp，使用 Fastify + SQLite 实现 Todo 应用的完整代码：
```
mkdir todo-app
cd todo-app
npm init -y
npm install fastify @fastify/sensible fastify-plugin better-sqlite3 @fastify/cors @fastify/static
npm install -D nodemon
```

✅ 完整 CRUD 接口：
- GET /api/todos - 获取所有
- POST /api/todos - 创建
- PUT /api/todos/:id - 更新
- DELETE /api/todos/:id - 删除
- PATCH /api/todos/:id/toggle - 切换状态

test:
```
curl http://localhost:3000/api/todos
curl http://localhost:3000/api/todos/1
curl -X POST http://localhost:3000/api/todos \
  -H "Content-Type: application/json" \
  -d '{
    "title": "学习 Fastify",
    "description": "学习如何使用 Fastify 框架",
    "completed": false
  }'

curl -X DELETE http://localhost:3000/api/todos/1
```
这个实现提供了完整的 Todo 应用功能，包括创建、读取、更新、删除操作，以及状态切换功能。

前端：public/index.html

