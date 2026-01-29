package main

import (
	"fmt"
	"log"
	"net/http"
	"os/exec"
	"runtime"
	"task-management-system/database"
	"task-management-system/handlers"
	"task-management-system/middleware"

	"github.com/gin-gonic/gin"
)

func main() {
	// 初始化数据库
	if err := database.InitDB("tasks.db"); err != nil {
		log.Fatalf("数据库初始化失败: %v", err)
	}

	// 设置Gin模式
	gin.SetMode(gin.ReleaseMode)

	// 创建路由
	r := gin.New()

	// 使用中间件
	r.Use(middleware.Logger())
	r.Use(middleware.Recovery())
	r.Use(middleware.CORS())

	// 静态文件服务
	r.Static("/static", "./static")
	r.StaticFile("/", "./static/index.html")
	r.StaticFile("/favicon.ico", "./static/favicon.ico")

	// API路由组
	api := r.Group("/api")
	{
		// 仪表盘
		api.GET("/dashboard", handlers.GetDashboardStats)

		// 用户管理
		api.POST("/users", handlers.CreateUser)
		api.GET("/users", handlers.GetUsers)
		api.GET("/users/:id", handlers.GetUser)

		// 项目管理
		api.POST("/projects", handlers.CreateProject)
		api.GET("/projects", handlers.GetProjects)
		api.GET("/projects/:id", handlers.GetProject)
		api.PUT("/projects/:id", handlers.UpdateProject)
		api.DELETE("/projects/:id", handlers.DeleteProject)
		api.GET("/projects/:id/tasks", handlers.GetProjectTasks)
		api.POST("/projects/:id/tasks", handlers.AddTaskToProject)

		// 任务管理
		api.POST("/tasks", handlers.CreateTask)
		api.GET("/tasks", handlers.GetTasks)
		api.GET("/tasks/:id", handlers.GetTask)
		api.PUT("/tasks/:id", handlers.UpdateTask)
		api.DELETE("/tasks/:id", handlers.DeleteTask)
		api.PUT("/tasks/:id/assign", handlers.AssignTask)
		api.PUT("/tasks/:id/progress", handlers.UpdateTaskProgress)
		api.GET("/tasks/:id/progress", handlers.GetTaskProgress)
	}

	// 健康检查
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "message": "服务运行正常"})
	})

	// 启动服务器
	port := ":8080"
	fmt.Println("╔════════════════════════════════════════════════════════════╗")
	fmt.Println("║                    任务管理系统                            ║")
	fmt.Println("╠════════════════════════════════════════════════════════════╣")
	fmt.Printf("║  服务地址: http://localhost%s                          ║\n", port)
	fmt.Println("║  API文档: http://localhost:8080/api                        ║")
	fmt.Println("╠════════════════════════════════════════════════════════════╣")
	fmt.Println("║  按 Ctrl+C 停止服务                                        ║")
	fmt.Println("╚════════════════════════════════════════════════════════════╝")

	// 自动打开浏览器
	go openBrowser("http://localhost" + port)

	if err := r.Run(port); err != nil {
		log.Fatalf("服务启动失败: %v", err)
	}
}

// openBrowser 打开默认浏览器
func openBrowser(url string) {
	var err error

	switch runtime.GOOS {
	case "linux":
		err = exec.Command("xdg-open", url).Start()
	case "windows":
		err = exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
	case "darwin":
		err = exec.Command("open", url).Start()
	default:
		err = fmt.Errorf("不支持的操作系统: %s", runtime.GOOS)
	}

	if err != nil {
		log.Printf("无法自动打开浏览器: %v", err)
		log.Printf("请手动访问: %s", url)
	}
}
