// middleware/cors.go (new file)
package middleware

import "github.com/gin-contrib/cors"

func CORS() cors.Config {
	config := cors.DefaultConfig()
	config.AllowOrigins = []string{"*"} // Allow all origins for simplicity; restrict in production
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Authorization", "Content-Type"}
	return config
}
