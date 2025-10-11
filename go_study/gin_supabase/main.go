package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
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
	Name  string `json:"name" binding:"omitempty,min=1"`
	Phone string `json:"phone" binding:"omitempty"`
}

var supabaseClient *supabase.Client

func main() {
	// 加载环境变量（可选）
	_ = godotenv.Load()
	// 初始化 Supabase 客户端
	supabaseURL := mustGetEnv("SUPABASE_URL") // 必填
	supabaseKey := mustGetEnv("SUPABASE_KEY") // 必填
	port := getenvDefault("PORT", "8080")     // 获取端口
	if supabaseURL == "" || supabaseKey == "" {
		log.Fatal("SUPABASE_URL / SUPABASE_KEY 未设置")
	}

	var err error
	supabaseClient, err = supabase.NewClient(supabaseURL, supabaseKey, &supabase.ClientOptions{})

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
	// 在启动服务器前打印信息
	fmt.Println("\n========================================")
	fmt.Println("🚀 用户管理系统后端服务")
	fmt.Println("========================================")
	fmt.Printf("✓ 服务地址: http://localhost:%s\n", port)
	fmt.Printf("✓ API 地址: http://localhost:%s/api\n", port)
	fmt.Printf("✓ 健康检查: http://localhost:%s/health\n", port)
	fmt.Println("========================================")

	if err := r.Run(":" + port); err != nil {
		log.Fatal("启动服务器失败:", err)
	}
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
// --- 工具函数：复制到文件底部或同一文件里 ---
func mustGetEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Fatalf("%s is not set (please set it in environment or .env)", key)
	}
	return v
}

func getenvDefault(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
