package main

import (
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
)

// 自定义中间件 - 类似 Express 的 middleware
func Logger() gin.HandlerFunc {
	return func(ctx *gin.Context) {
		start := time.Now()
		// 在处理请求之前执行
		fmt.Printf("[%s] %s", ctx.Request.Method, ctx.Request.URL.Path)
		// 继续处理请求
		ctx.Next()
		// 在请求处理之后执行
		duration := time.Since(start)
		fmt.Printf("- %v\n", duration)
	}
}

func main() {
	// 不使用默认中间件
	r := gin.New()
	// 全局中间件
	r.Use(Logger())
	r.Use(gin.Recovery()) // 错误恢复

	// 公开路由
	r.GET("/public", func(ctx *gin.Context) {
		ctx.JSON(200, gin.H{"msg": "public point"})
	})
	fmt.Println("==== gin middleware groups===")
	// API v1 路由组
	v1 := r.Group("/api/v1")
	v1.GET("/posts", getPosts)
	v1.GET("/post/:id", getPost)

	r.Run(":8081")
}

// Handler 函数
func getPosts(c *gin.Context) {
	c.JSON(200, gin.H{
		"posts": []gin.H{
			{"id": 1, "title": "post 1"},
			{"id": 2, "title": "post 2"},
		},
	})
}
func getPost(c *gin.Context) {
	id := c.Param("id")
	c.JSON(200, gin.H{"id": id, "title": "post_" + id})
}
