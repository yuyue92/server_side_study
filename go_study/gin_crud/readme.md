**从零开始用 Gin 搭建用户表 CRUD（增删查改）服务的完整流程，**

一、🖥 后端（Go + Gin + SQLite）

目录结构：
```
go-users-crud/
├── main.go
├── go.mod
└── users.db (运行后自动生成)
```

安装依赖：  go mod tidy

运行：  go run main.go

二、🌐 前端（HTML + JS + Bootstrap）

✅ 使用步骤：
- 后端 go run main.go
- 前端直接用浏览器打开 index.html
- 可以正常做 新增 / 编辑 / 删除 / 列表展示
