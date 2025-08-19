**介绍Go：（1）Gin（轻量高性能）、（2）Fiber（Express 风格，学习快）；**

Gin 和 Fiber 都是 Go 语言中非常流行的 Web 框架，它们都主打 高性能、轻量化，但是设计理念、上手体验有一些差别。

一、Gin：定位：轻量、高性能的 HTTP Web 框架，Go 里最火的框架之一。

特点：
- 高性能：基于 httprouter，路由性能非常快。
- 简洁 API：封装了常用功能（路由、中间件、JSON 处理、表单绑定、验证等）。
- 中间件机制：支持链式中间件，方便扩展。
- 生态活跃：社区成熟，资料多，适合生产环境。

代码示例：
```
package main

import (
    "github.com/gin-gonic/gin"
)

func main() {
    r := gin.Default()

    r.GET("/ping", func(c *gin.Context) {
        c.JSON(200, gin.H{
            "message": "pong",
        })
    })

    r.Run(":8080") // 启动服务
}
```
👉 打开浏览器访问 http://localhost:8080/ping，返回 {"message":"pong"}

适用场景：有 Web 开发经验，想要高性能、功能全的框架。适合中大型项目、生产环境。

二、Fiber：定位：受 Node.js Express.js 启发的 Go Web 框架，语法非常简洁，上手快。

特点：
- 语法类似 Express：对前端/Node.js 开发者很友好。
- 高性能：基于 fasthttp（比 Go 内置 net/http 更快）。
- 学习成本低：API 设计简洁，像写 Node.js Express。
- 内置丰富功能：路由分组、静态文件服务、模板渲染、WebSocket 等。

代码示例：
```
package main

import "github.com/gofiber/fiber/v2"

func main() {
    app := fiber.New()

    app.Get("/ping", func(c *fiber.Ctx) error {
        return c.JSON(fiber.Map{
            "message": "pong",
        })
    })

    app.Listen(":8080")
}
```
👉 一样可以访问 http://localhost:8080/ping，效果与 Gin 类似。


