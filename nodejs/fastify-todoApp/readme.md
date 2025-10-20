todoApp，使用 Fastify + SQLite 实现 Todo 应用的完整代码：
```
mkdir todo-app
cd todo-app
npm init -y
npm install fastify @fastify/sensible fastify-plugin better-sqlite3
npm install -D nodemon
```

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
