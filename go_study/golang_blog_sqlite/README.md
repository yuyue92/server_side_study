# golang_blog (Gin + GORM + SQLite)

本项目是一个用于学习 Go / Gin / GORM 的个人博客系统后端 API，使用本地 SQLite 更轻便（无需 MySQL）。

## 目录结构
```
golang_blog/
├── cmd/main.go
├── config/database.go
├── controllers/{auth,post,comment,health}.go
├── middleware/{auth,logger}.go
├── models/{base,user,post,comment}.go
├── routes/routes.go
├── utils/{jwt,response}.go
├── go.mod
└── README.md
```

## 启动
1) 复制环境变量：
```bash
cp .env.example .env
```

2) 安装依赖并运行：
```bash
go mod tidy
go run ./cmd
```

默认会在 `./data/blog.db` 生成 SQLite 数据库文件，并自动建表（AutoMigrate）。

## API
- GET /health

### 认证
- POST /api/v1/auth/register
- POST /api/v1/auth/login
- GET  /api/v1/profile (需要 JWT)

### 文章
- GET    /api/v1/posts
- GET    /api/v1/posts/:id
- POST   /api/v1/posts (需要 JWT)
- PUT    /api/v1/posts/:id (需要 JWT，仅作者)
- DELETE /api/v1/posts/:id (需要 JWT，仅作者)

### 评论
- GET  /api/v1/comments/post/:post_id
- POST /api/v1/posts/:post_id/comments (需要 JWT)

## Token 使用
请求头：
```
Authorization: Bearer <token>
```
