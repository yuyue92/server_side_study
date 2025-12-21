package routes

import (
	"golang_blog/controllers"
	"golang_blog/middleware"
	"net/http"

	"github.com/gin-gonic/gin"
)

func SetupRouter() *gin.Engine {
	r := gin.Default()

	// 注册全局中间件
	r.Use(middleware.Logger())
	r.Use(middleware.CORSMiddleware()) // <--- 新增这一行

	// 健康检查
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	api := r.Group("/api/v1")
	{
		// 认证路由
		auth := api.Group("/auth")
		{
			auth.POST("/register", controllers.Register)
			auth.POST("/login", controllers.Login)
		}

		// 公开的文章路由
		api.GET("/posts", controllers.GetPosts)
		api.GET("/posts/:id", controllers.GetPostDetail)
		api.GET("/comments/post/:post_id", controllers.GetComments)

		// 需要认证的路由
		protected := api.Group("/")
		protected.Use(middleware.AuthMiddleware())
		{
			protected.GET("/profile", controllers.GetProfile)

			// 文章操作
			protected.POST("/posts", controllers.CreatePost)
			protected.PUT("/posts/:id", controllers.UpdatePost)
			protected.DELETE("/posts/:id", controllers.DeletePost)

			// 评论操作
			protected.POST("/posts/:post_id/comments", controllers.CreateComment)
		}
	}

	return r
}
