package routes

import (
	"golang_blog/controllers"
	"golang_blog/middleware"
	"io/fs"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// SetupRoutes 设置路由（embed 版：接收一个 fs.FS 作为前端文件系统）
func SetupRoutes(r *gin.Engine, webFS fs.FS) {
	// 使用日志中间件
	r.Use(middleware.LoggerMiddleware())

	// 首页：返回内嵌的 blogIndex.html
	r.GET("/", func(c *gin.Context) {
		c.FileFromFS("blogIndex.html", http.FS(webFS))
	})

	// 健康检查
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"message": "服务运行正常",
		})
	})

	// API v1 路由组
	v1 := r.Group("/api/v1")
	{
		// 认证路由（公开）
		auth := v1.Group("/auth")
		{
			auth.POST("/register", controllers.Register)
			auth.POST("/login", controllers.Login)
		}

		// 需要认证的路由
		authenticated := v1.Group("")
		authenticated.Use(middleware.AuthMiddleware())
		{
			// 用户信息
			authenticated.GET("/profile", controllers.GetProfile)

			// 文章管理（需要认证）
			authenticated.POST("/posts", controllers.CreatePost)
			authenticated.PUT("/posts/:id", controllers.UpdatePost)
			authenticated.DELETE("/posts/:id", controllers.DeletePost)

			// 评论管理（需要认证）
			authenticated.POST("/posts/:post_id/comments", controllers.CreateComment)
		}

		// 文章路由（公开）
		posts := v1.Group("/posts")
		{
			posts.GET("", controllers.GetPosts)
			posts.GET("/:id", controllers.GetPostByID)
		}

		// 评论路由（公开）
		comments := v1.Group("/comments")
		{
			comments.GET("/post/:post_id", controllers.GetCommentsByPostID)
		}
	}

	// 静态资源兜底：
	// - 如果访问 /app.js /style.css /images/...，就从 embed 里找对应文件返回
	// - 如果找不到文件（例如前端路由刷新 /posts/123），就回退到 blogIndex.html（SPA 友好）
	r.NoRoute(func(c *gin.Context) {
		path := strings.TrimPrefix(c.Request.URL.Path, "/")
		if path == "" {
			path = "blogIndex.html"
		}

		// 尝试从 webFS 打开该文件
		if f, err := webFS.Open(path); err == nil {
			_ = f.Close()
			c.FileFromFS(path, http.FS(webFS))
			return
		}

		// 找不到就回到首页（适配前端路由）
		c.FileFromFS("blogIndex.html", http.FS(webFS))
	})
}
