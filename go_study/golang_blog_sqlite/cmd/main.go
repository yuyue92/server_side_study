package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"golang_blog/config"
	"golang_blog/middleware"
	"golang_blog/routes"
)

func main() {
	_ = godotenv.Load()

	db, err := config.InitDB()
	if err != nil {
		log.Fatalf("init db failed: %v", err)
	}

	r := gin.New()
	r.Use(middleware.Logger())
	r.Use(gin.Recovery())

	routes.RegisterRoutes(r, db)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("server listening on :%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("server run failed: %v", err)
	}
}
