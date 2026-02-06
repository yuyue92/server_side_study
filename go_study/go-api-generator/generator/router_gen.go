package generator

import (
	"fmt"
	"strings"
)

// generateRouter 生成路由代码
func (g *Generator) generateRouter() error {
	// 生成中间件
	if err := g.writeFile("middleware/cors.go", g.buildCorsMiddleware()); err != nil {
		return err
	}
	if err := g.writeFile("middleware/logger.go", g.buildLoggerMiddleware()); err != nil {
		return err
	}

	// 生成路由
	return g.writeFile("router/router.go", g.buildRouterCode())
}

// buildRouterCode 构建路由代码
func (g *Generator) buildRouterCode() string {
	var sb strings.Builder

	sb.WriteString(`package router

import (
	"github.com/gin-gonic/gin"
`)
	sb.WriteString(fmt.Sprintf("\t\"%s/handlers\"\n", g.ModName))
	sb.WriteString(fmt.Sprintf("\t\"%s/middleware\"\n", g.ModName))
	sb.WriteString(`)

// SetupRouter 配置路由
func SetupRouter() *gin.Engine {
	r := gin.New()

	// 全局中间件
	r.Use(gin.Recovery())
	r.Use(middleware.Logger())
	r.Use(middleware.Cors())

	// API 路由组
	api := r.Group("/api/v1")
	{
`)

	for _, model := range g.Models {
		tableName := strings.ToLower(model.TableName)
		sb.WriteString(fmt.Sprintf("\t\t// %s 路由\n", model.Description))
		sb.WriteString(fmt.Sprintf("\t\t%sHandler := handlers.New%sHandler()\n", ToCamelCase(model.TableName), model.Name))
		sb.WriteString(fmt.Sprintf("\t\t%sGroup := api.Group(\"/%ss\")\n", ToCamelCase(tableName), tableName))
		sb.WriteString("\t\t{\n")
		sb.WriteString(fmt.Sprintf("\t\t\t%sGroup.POST(\"\", %sHandler.Create)\n", ToCamelCase(tableName), ToCamelCase(tableName)))
		sb.WriteString(fmt.Sprintf("\t\t\t%sGroup.GET(\"\", %sHandler.List)\n", ToCamelCase(tableName), ToCamelCase(tableName)))
		sb.WriteString(fmt.Sprintf("\t\t\t%sGroup.GET(\"/:id\", %sHandler.GetByID)\n", ToCamelCase(tableName), ToCamelCase(tableName)))
		sb.WriteString(fmt.Sprintf("\t\t\t%sGroup.PUT(\"/:id\", %sHandler.Update)\n", ToCamelCase(tableName), ToCamelCase(tableName)))
		sb.WriteString(fmt.Sprintf("\t\t\t%sGroup.DELETE(\"/:id\", %sHandler.Delete)\n", ToCamelCase(tableName), ToCamelCase(tableName)))
		sb.WriteString(fmt.Sprintf("\t\t\t%sGroup.POST(\"/batch-delete\", %sHandler.BatchDelete)\n", ToCamelCase(tableName), ToCamelCase(tableName)))
		sb.WriteString("\t\t}\n\n")
	}

	sb.WriteString(`	}

	// 健康检查
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	return r
}
`)

	return sb.String()
}

// buildCorsMiddleware 构建 CORS 中间件代码
func (g *Generator) buildCorsMiddleware() string {
	return `package middleware

import (
	"net/http"
	"github.com/gin-gonic/gin"
)

// Cors 跨域中间件
func Cors() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization")
		c.Header("Access-Control-Expose-Headers", "Content-Length")
		c.Header("Access-Control-Allow-Credentials", "true")

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}
`
}

// buildLoggerMiddleware 构建日志中间件代码
func (g *Generator) buildLoggerMiddleware() string {
	return `package middleware

import (
	"log"
	"time"
	"github.com/gin-gonic/gin"
)

// Logger 日志中间件
func Logger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path

		c.Next()

		latency := time.Since(start)
		statusCode := c.Writer.Status()
		method := c.Request.Method
		clientIP := c.ClientIP()

		log.Printf("[API] %3d | %13v | %15s | %-7s %s",
			statusCode, latency, clientIP, method, path)
	}
}
`
}
