package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/supabase-community/supabase-go"
)

type User struct {
	ID        int       `json:"id"`
	Email     string    `json:"email" binding:"required,email"`
	Name      string    `json:"name" binding:"required"`
	Phone     string    `json:"phone"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type CreateUserRequest struct {
	Email string `json:"email" binding:"required,email"`
	Name  string `json:"name" binding:"required"`
	Phone string `json:"phone"`
}

type UpdateUserRequest struct {
	Email string `json:"email" binding:"omitempty,email"`
	Name  string `json:"name"`
	Phone string `json:"phone"`
}

var supabaseClient *supabase.Client

func main() {
	// 加载环境变量（可选）
	godotenv.Load()

	// 初始化 Supabase 客户端
	supabaseURL := getEnv("SUPABASE_URL", "https://gpnkvmnrhnzlnphnante.supabase.co")
	supabaseKey := getEnv("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdwbmt2bW5yaG56bG5waG5hbnRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NDk4NzAsImV4cCI6MjA2ODIyNTg3MH0.ba0RLTsufIDJkK_dyq_X9mbKFj7FTqarbbEHC61x8tY")

	var err error
	supabaseClient, err = supabase.NewClient(supabaseURL, supabaseKey, &supabase.ClientOptions{})

	// supabaseClient, err = supabase.NewClient(supabaseURL, supabaseKey, &supabase.ClientOptions{
	// 	Storage: &storage_go.ClientOptions{},
	// })
	if err != nil {
		log.Fatal("无法连接到 Supabase:", err)
	}

	log.Println("成功连接到 Supabase")

	// 设置 Gin 路由
	r := gin.Default()

	// 配置 CORS
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// API 路由
	api := r.Group("/api")
	{
		users := api.Group("/users")
		{
			users.GET("", getUsers)          // 获取所有用户
			users.GET("/:id", getUserByID)   // 根据ID获取用户
			users.POST("", createUser)       // 创建用户
			users.PUT("/:id", updateUser)    // 更新用户
			users.DELETE("/:id", deleteUser) // 删除用户
		}
	}

	// 健康检查
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "message": "服务运行正常"})
	})

	// 获取端口
	port := getEnv("PORT", "8080")
	// 在启动服务器前打印信息
	fmt.Println("\n========================================")
	fmt.Println("🚀 用户管理系统后端服务")
	fmt.Println("========================================")
	fmt.Printf("✓ 服务地址: http://localhost:%s\n", port)
	fmt.Printf("✓ API 地址: http://localhost:%s/api\n", port)
	fmt.Printf("✓ 健康检查: http://localhost:%s/health\n", port)
	fmt.Println("========================================")

	// 在新协程中启动服务器
	go func() {
		if err := r.Run(":" + port); err != nil {
			log.Fatal("启动服务器失败:", err)
		}
	}()

	// 等待服务器启动
	time.Sleep(1 * time.Second)

	// 自动打开浏览器
	openBrowser(port)

	// 保持主程序运行
	select {}
}

// 自动打开浏览器
func openBrowser(port string) {
	// 获取当前执行目录
	exePath, err := os.Executable()
	if err != nil {
		log.Println("⚠ 无法获取执行路径:", err)
		printManualOpenInstructions(port)
		return
	}

	exeDir := filepath.Dir(exePath)

	// 检查 user-index.html 是否存在
	htmlPath := filepath.Join(exeDir, "user-index.html")

	// 如果编译后的路径找不到，尝试当前工作目录
	if _, err := os.Stat(htmlPath); os.IsNotExist(err) {
		workDir, _ := os.Getwd()
		htmlPath = filepath.Join(workDir, "user-index.html")
	}

	// 再次检查文件是否存在
	if _, err := os.Stat(htmlPath); os.IsNotExist(err) {
		log.Printf("⚠ 未找到 user-index.html 文件\n")
		log.Printf("   请确保 user-index.html 文件与程序在同一目录下\n")
		printManualOpenInstructions(port)
		return
	}

	// 转换为绝对路径
	absPath, err := filepath.Abs(htmlPath)
	if err != nil {
		log.Println("⚠ 无法获取绝对路径:", err)
		printManualOpenInstructions(port)
		return
	}

	// 构建文件URL
	fileURL := "file:///" + filepath.ToSlash(absPath)

	log.Printf("✓ 找到前端文件: %s\n", absPath)
	log.Println("🌐 正在打开浏览器...")

	// 根据操作系统打开浏览器
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", fileURL)
	case "darwin": // macOS
		cmd = exec.Command("open", fileURL)
	case "linux":
		// 尝试多个常见的浏览器命令
		browsers := []string{"xdg-open", "google-chrome", "firefox", "chromium"}
		for _, browser := range browsers {
			if _, err := exec.LookPath(browser); err == nil {
				cmd = exec.Command(browser, fileURL)
				break
			}
		}
		if cmd == nil {
			log.Println("⚠ 未找到可用的浏览器")
			printManualOpenInstructions(port)
			return
		}
	default:
		log.Printf("⚠ 不支持的操作系统: %s\n", runtime.GOOS)
		printManualOpenInstructions(port)
		return
	}

	// 执行命令
	if err := cmd.Start(); err != nil {
		log.Println("⚠ 无法自动打开浏览器:", err)
		printManualOpenInstructions(port)
		return
	}

	log.Println("✓ 浏览器已打开！")
	fmt.Println("\n按 Ctrl+C 停止服务")
}

// 打印手动打开说明
func printManualOpenInstructions(port string) {
	fmt.Println("\n========================================")
	fmt.Println("📝 手动打开前端页面:")
	fmt.Println("========================================")
	fmt.Println("1. 在浏览器中打开 user-index.html 文件")
	fmt.Println("   或")
	fmt.Printf("2. 访问: http://localhost:%s/api/users\n", port)
	fmt.Println("========================================")
}

// 获取所有用户
func getUsers(c *gin.Context) {
	var users []User

	// 查询所有用户
	data, _, err := supabaseClient.From("users").Select("*", "exact", false).Execute()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "查询用户失败: " + err.Error()})
		return
	}

	// 解析数据
	if err := json.Unmarshal(data, &users); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "解析数据失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    users,
		"count":   len(users),
	})
}

// 根据ID获取用户
func getUserByID(c *gin.Context) {
	id := c.Param("id")
	var users []User

	// 根据ID查询用户
	data, _, err := supabaseClient.From("users").
		Select("*", "exact", false).
		Eq("id", id).
		Execute()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "查询用户失败: " + err.Error()})
		return
	}

	// 解析数据
	if err := json.Unmarshal(data, &users); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "解析数据失败: " + err.Error()})
		return
	}

	if len(users) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "用户不存在"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    users[0],
	})
}

// 创建用户
func createUser(c *gin.Context) {
	var req CreateUserRequest

	// 验证请求数据
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求数据无效: " + err.Error()})
		return
	}

	// 插入数据
	var insertedUsers []User
	data, _, err := supabaseClient.From("users").
		Insert(req, false, "", "", "").
		Execute()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建用户失败: " + err.Error()})
		return
	}

	// 解析插入后的数据
	if err := json.Unmarshal(data, &insertedUsers); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "解析数据失败: " + err.Error()})
		return
	}

	if len(insertedUsers) == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建用户失败，未返回数据"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "用户创建成功",
		"data":    insertedUsers[0],
	})
}

// 更新用户
func updateUser(c *gin.Context) {
	id := c.Param("id")
	var req UpdateUserRequest

	// 验证请求数据
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求数据无效: " + err.Error()})
		return
	}

	// 更新数据
	var updatedUsers []User
	data, _, err := supabaseClient.From("users").
		Update(req, "", "").
		Eq("id", id).
		Execute()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "更新用户失败: " + err.Error()})
		return
	}

	// 解析更新后的数据
	if err := json.Unmarshal(data, &updatedUsers); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "解析数据失败: " + err.Error()})
		return
	}

	if len(updatedUsers) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "用户不存在或未更新"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "用户更新成功",
		"data":    updatedUsers[0],
	})
}

// 删除用户
func deleteUser(c *gin.Context) {
	id := c.Param("id")

	// 删除数据
	_, _, err := supabaseClient.From("users").
		Delete("", "").
		Eq("id", id).
		Execute()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "删除用户失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "用户删除成功",
	})
}

// 获取环境变量辅助函数
func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}
