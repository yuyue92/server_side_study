package main

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
)

func main() {
	// 创建一个默认的路由引擎（包含Logger和Recovery中间件）
	r := gin.Default()
	// 基础路由 - GET 请求
	r.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"ok": true,
		})
	})
	r.GET("/ping", func(c *gin.Context) {
		// c.JSON() 自动设置 Content-Type 为 application/json
		c.JSON(http.StatusOK, gin.H{
			"message": "pong",
		})
	})
	// 启动服务器，默认在 8080 端口
	r.GET("/user/:id", func(ctx *gin.Context) {
		// 获取路径参数
		id := ctx.Param("id")
		ctx.JSON(200, gin.H{
			"user_id": id,
		})
	})

	fmt.Println("====gin basic routing ==")
	// 启动服务器，默认在 8080 端口
	r.Run(":8080")
}
