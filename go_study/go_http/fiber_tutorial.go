package main

import (
	"log"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	recov "github.com/gofiber/fiber/v2/middleware/recover"
)

// User 结构体 - 用于演示 JSON 绑定
type User struct {
	ID    int    `json:"id"`
	Name  string `json:"username" validate:"required,min=3"`
	Email string `json:"email" validate:"required,email"`
	Age   int    `json:"age" validate:"gte=0,lte=130"`
}

// 模拟数据库
var users = []User{
	{ID: 1, Name: "alice", Email: "alice@example.com", Age: 25},
	{ID: 2, Name: "bob", Email: "bob@example.com", Age: 30},
}

// 自定义错误处理器
func customErrorHandler(c *fiber.Ctx, err error) error {
	// 默认状态码
	code := fiber.StatusInternalServerError
	// 返回错误响应
	return c.Status(code).JSON(fiber.Map{
		"error":     err.Error(),
		"timestamp": time.Now().Unix(),
	})
}

func main() {
	// 1. 创建 Fiber 应用实例
	app := fiber.New(fiber.Config{
		// 应用名称
		AppName: "Fiber 入门教程 v1.0",
		// 服务器头
		ServerHeader: "Fiber",
		// 错误处理
		ErrorHandler: customErrorHandler,
	})
	// 2. 全局中间件
	// 恢复中间件 - 防止 panic 导致程序崩溃
	app.Use(recov.New())
	// 日志中间件
	app.Use(logger.New(logger.Config{
		Format:     "[${time}], ${status} - ${method}, ${path} (${latency})\n",
		TimeFormat: "15:04:05",
	}))
	// CORS 中间件
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowMethods: "GET,POST,PUT,DELETE",
	}))

	app.Get("/", handleHome) // 3. 基础路由
	// 设置 Cookie--	// 12. Cookie 操作
	app.Get("/cookie/set", func(c *fiber.Ctx) error {
		c.Cookie(&fiber.Cookie{
			Name:     "session_id",
			Value:    "abcqwert",
			Expires:  time.Now().Add(24 * time.Hour),
			HTTPOnly: true,
			Secure:   true,
		})
		return c.SendString("Cookie 已设置")
	})
	app.Get("/cookie/get", func(c *fiber.Ctx) error {
		session_id := c.Cookies("session_id", "未找到cookie")
		return c.JSON(fiber.Map{
			"sessionID": session_id,
		})
	})
	// 11. 重定向---	// 重定向到首页
	app.Get("/redirect", func(c *fiber.Ctx) error {
		return c.Redirect("/")
	})
	// 13. 错误处理示例
	app.Get("/error", func(c *fiber.Ctx) error {
		return fiber.NewError(fiber.StatusInternalServerError, "这是一个自定义错误")
	})
	// 14. 超时处理
	app.Get("/timeout", func(c *fiber.Ctx) error {
		time.Sleep(3 * time.Second)
		return c.SendString("处理完成")
	})

	// 启动服务器
	log.Fatal(app.Listen(":3000"))
}

func handleHome(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"message": "欢迎使用 Fiber 框架",
		"version": "v2",
		"time":    time.Now().Format("2006-01-02 15:04:05"),
		"data":    users,
		"count":   len(users),
	})
}
