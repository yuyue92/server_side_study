// routes/routes.go
package routes

import (
	"golang_blog/controllers"
	"golang_blog/middleware"
	"net/http" // Add this import

	"github.com/gin-contrib/cors" // Add this import
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func SetupRoutes(r *gin.Engine, db *gorm.DB) {
	r.Use(middleware.Logger())
	r.Use(cors.New(middleware.CORS())) // Add this line for CORS

	v1 := r.Group("/api/v1")
	{
		auth := v1.Group("/auth")
		{
			auth.POST("/register", controllers.Register(db))
			auth.POST("/login", controllers.Login(db))
		}

		v1.GET("/profile", middleware.Auth(), controllers.GetProfile(db))

		posts := v1.Group("/posts")
		{
			posts.GET("", controllers.GetPosts(db))
			posts.GET("/:id", controllers.GetPost(db))
			posts.POST("", middleware.Auth(), controllers.CreatePost(db))
			posts.PUT("/:id", middleware.Auth(), controllers.UpdatePost(db))
			posts.DELETE("/:id", middleware.Auth(), controllers.DeletePost(db))
			posts.POST("/:post_id/comments", middleware.Auth(), controllers.CreateComment(db))
		}

		comments := v1.Group("/comments")
		{
			comments.GET("/post/:post_id", controllers.GetComments(db))
		}
	}

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})
}
