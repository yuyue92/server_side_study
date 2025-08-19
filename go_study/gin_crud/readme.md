**从零开始用 Gin 搭建用户表 CRUD（增删查改）服务的完整流程，**

一、🖥 后端（Go + Gin + SQLite）； 🌐 前端（HTML + JS + Bootstrap）

目录结构：
```
go-users-crud/
├── main.go
├── go.mod
├── index.html
└── users.db (运行后自动生成)
```

安装依赖：  go mod tidy

运行：  go run main.go   (自动启动后端服务:比如 http://localhost:8080/users，三秒后自动打开同级目录下的index.html)

二、✅ 使用步骤：
- 后端 go run main.go
- 前端直接用浏览器打开 index.html
- 可以正常做 新增 / 编辑 / 删除 / 列表展示
