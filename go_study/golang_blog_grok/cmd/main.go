// cmd/main.go
package main

import (
	"golang_blog/config"
	"golang_blog/routes"

	"github.com/gin-gonic/gin"
)

func main() {
	db := config.InitDB()
	r := gin.Default()
	routes.SetupRoutes(r, db)
	r.Run(":8080")
}
