package main

import (
	"golang_blog/config"
	"golang_blog/routes"
)

func main() {
	// 1. 初始化数据库
	config.InitDB()

	// 2. 设置路由
	r := routes.SetupRouter()

	// 3. 启动服务器 (默认 8080 端口)
	r.Run(":8080")
}
