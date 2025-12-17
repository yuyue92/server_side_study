package routes

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"golang_blog/controllers"
	"golang_blog/middleware"
)

func RegisterRoutes(r *gin.Engine, db *gorm.DB) {
	// r.Use(middleware.CORS())
	r.Use(middleware.Logger())
	r.GET("/health", controllers.Health)

	v1 := r.Group("/api/v1")
	{
		// auth
		auth := v1.Group("/auth")
		auth.POST("/register", controllers.Register(db))
		auth.POST("/login", controllers.Login(db))

		// profile
		v1.GET("/profile", middleware.AuthRequired(), controllers.Profile(db))

		// posts (public + protected)
		v1.GET("/posts", controllers.ListPosts(db))
		v1.GET("/posts/:id", controllers.GetPost(db))
		v1.POST("/posts", middleware.AuthRequired(), controllers.CreatePost(db))
		v1.PUT("/posts/:id", middleware.AuthRequired(), controllers.UpdatePost(db))
		v1.DELETE("/posts/:id", middleware.AuthRequired(), controllers.DeletePost(db))

		// comments (public)
		v1.GET("/comments/post/:post_id", controllers.ListCommentsByPost(db))

		// create comment under a post (protected)
		v1.POST("/posts/:post_id/comments", middleware.AuthRequired(), controllers.CreateComment(db))
	}
	// =========================
	// Frontend static serving
	// =========================
	// 首页
	r.GET("/", func(c *gin.Context) {
		c.File("./web/index.html")
	})

	// 精确映射你前端用到的静态文件（按你的文件名增减）
	r.StaticFile("/app.js", "./web/app.js")
	r.StaticFile("/styles.css", "./web/styles.css")

	// 如果你有图标/图片等资源，可以加：
	// r.StaticFile("/favicon.ico", "./web/favicon.ico")
	// r.Static("/assets", "./web/assets") // 例如 web/assets/ 下放图片等

	// SPA fallback：非 /api 和非 /health 的未知路由都回到 index.html
	r.NoRoute(func(c *gin.Context) {
		p := c.Request.URL.Path
		if strings.HasPrefix(p, "/api/") || p == "/health" {
			c.JSON(http.StatusNotFound, gin.H{"message": "not found"})
			return
		}
		c.File("./web/index.html")
	})
}
