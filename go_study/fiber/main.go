package main

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	_ "github.com/mattn/go-sqlite3"
)

// ==================== 数据模型 ====================

// User 主表 - 用户基本信息
type User struct {
	ID        int       `json:"id"`
	Name      string    `json:"name" validate:"required,min=2,max=50"`
	Age       int       `json:"age" validate:"required,gte=1,lte=150"`
	Email     string    `json:"email" validate:"required,email"`
	Status    string    `json:"status"` // active, inactive, suspended
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// UserProfile 从表 - 用户详细信息
type UserProfile struct {
	ID         int       `json:"id"`
	UserID     int       `json:"user_id"`
	Phone      string    `json:"phone"`
	Address    string    `json:"address"`
	City       string    `json:"city"`
	Country    string    `json:"country"`
	PostalCode string    `json:"postal_code"`
	Bio        string    `json:"bio"`        // 个人简介
	Avatar     string    `json:"avatar"`     // 头像URL
	Gender     string    `json:"gender"`     // male, female, other
	Birthday   string    `json:"birthday"`   // YYYY-MM-DD
	Occupation string    `json:"occupation"` // 职业
	Company    string    `json:"company"`    // 公司
	Website    string    `json:"website"`    // 个人网站
	GitHub     string    `json:"github"`     // GitHub账号
	LinkedIn   string    `json:"linkedin"`   // LinkedIn账号
	Skills     string    `json:"skills"`     // 技能标签，逗号分隔
	Interests  string    `json:"interests"`  // 兴趣爱好，逗号分隔
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// UserWithProfile 用户完整信息（主表+从表）
type UserWithProfile struct {
	User
	Profile *UserProfile `json:"profile,omitempty"`
}

// CreateUserRequest 创建用户请求
type CreateUserRequest struct {
	Name    string       `json:"name" validate:"required"`
	Age     int          `json:"age" validate:"required"`
	Email   string       `json:"email" validate:"required,email"`
	Profile *UserProfile `json:"profile,omitempty"`
}

// UpdateUserRequest 更新用户请求
type UpdateUserRequest struct {
	Name   *string `json:"name,omitempty"`
	Age    *int    `json:"age,omitempty"`
	Email  *string `json:"email,omitempty"`
	Status *string `json:"status,omitempty"`
}

// ==================== 全局变量 ====================

var db *sql.DB

// ==================== 主函数 ====================

func main() {
	// 1. 初始化数据库
	initDB()
	defer db.Close()

	// 2. 创建 Fiber 应用
	app := fiber.New(fiber.Config{
		AppName:      "User Management System v1.0",
		ErrorHandler: customErrorHandler,
	})

	// 3. 中间件
	app.Use(recover.New())
	app.Use(logger.New(logger.Config{
		Format:     "[${time}] ${status} - ${method} ${path} (${latency})\n",
		TimeFormat: "15:04:05",
	}))
	app.Use(cors.New())

	// 4. 路由
	setupRoutes(app)

	// 5. 启动服务器
	log.Println("🚀 服务器启动在 http://localhost:3000")
	log.Fatal(app.Listen(":3000"))
}

// ==================== 数据库初始化 ====================

func initDB() {
	var err error
	db, err = sql.Open("sqlite3", "./users.db")
	if err != nil {
		log.Fatal("数据库连接失败:", err)
	}

	// 开启外键（SQLite 默认关闭）
	if _, err := db.Exec("PRAGMA foreign_keys = ON;"); err != nil {
		log.Fatal("开启外键失败:", err)
	}

	// 测试连接
	if err = db.Ping(); err != nil {
		log.Fatal("数据库 ping 失败:", err)
	}

	// 创建表
	createTables()

	// —— 新增：初始化一批主从表演示数据（幂等）
	if err := seedSampleData(); err != nil {
		log.Fatal("插入测试数据失败:", err)
	}

	log.Println("✅ 数据库初始化成功")
}

func createTables() {
	// 创建用户主表
	userTable := `
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		age INTEGER NOT NULL,
		email TEXT UNIQUE NOT NULL,
		status TEXT DEFAULT 'active',
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);`

	// 创建用户详情从表
	profileTable := `
	CREATE TABLE IF NOT EXISTS user_profiles (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER UNIQUE NOT NULL,
		phone TEXT,
		address TEXT,
		city TEXT,
		country TEXT,
		postal_code TEXT,
		bio TEXT,
		avatar TEXT,
		gender TEXT,
		birthday TEXT,
		occupation TEXT,
		company TEXT,
		website TEXT,
		github TEXT,
		linkedin TEXT,
		skills TEXT,
		interests TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
	);`

	// 创建索引
	indexes := []string{
		"CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);",
		"CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);",
		"CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON user_profiles(user_id);",
	}

	// 执行建表语句
	if _, err := db.Exec(userTable); err != nil {
		log.Fatal("创建 users 表失败:", err)
	}

	if _, err := db.Exec(profileTable); err != nil {
		log.Fatal("创建 user_profiles 表失败:", err)
	}

	// 创建索引
	for _, idx := range indexes {
		if _, err := db.Exec(idx); err != nil {
			log.Printf("创建索引失败: %v", err)
		}
	}
}

// ==================== 路由设置 ====================

func setupRoutes(app *fiber.App) {
	// 首页
	app.Get("/", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"message": "用户管理系统 API",
			"version": "1.0",
			"endpoints": fiber.Map{
				"GET /api/users":             "获取所有用户列表",
				"GET /api/users/:id":         "获取指定用户详情",
				"POST /api/users":            "创建新用户",
				"PUT /api/users/:id":         "更新用户信息",
				"DELETE /api/users/:id":      "删除用户",
				"GET /api/users/:id/profile": "获取用户详细资料",
				"PUT /api/users/:id/profile": "更新用户详细资料",
				"GET /api/users/search":      "搜索用户",
				"GET /api/stats":             "获取统计信息",
			},
		})
	})

	// API 路由组
	api := app.Group("/api")

	// 用户基本 CRUD
	api.Get("/users", getAllUsers)       // 获取所有用户
	api.Get("/users/:id", getUserByID)   // 获取单个用户
	api.Post("/users", createUser)       // 创建用户
	api.Put("/users/:id", updateUser)    // 更新用户
	api.Delete("/users/:id", deleteUser) // 删除用户

	// 用户详细资料
	api.Get("/users/:id/profile", getUserProfile)       // 获取用户资料
	api.Put("/users/:id/profile", updateUserProfile)    // 更新用户资料
	api.Delete("/users/:id/profile", deleteUserProfile) // 删除用户资料

	// 高级功能
	api.Get("/search", searchUsers) // 搜索用户
	api.Get("/stats", getStats)     // 统计信息
}

// ==================== 控制器函数 ====================

// 1. 获取所有用户（支持分页和过滤）
func getAllUsers(c *fiber.Ctx) error {
	// 分页参数
	page := c.QueryInt("page", 1)
	pageSize := c.QueryInt("page_size", 10)
	status := c.Query("status", "")
	includeProfile := c.QueryBool("include_profile", false)

	// 计算偏移量
	offset := (page - 1) * pageSize

	// 构建查询
	query := "SELECT id, name, age, email, status, created_at, updated_at FROM users WHERE 1=1"
	args := []interface{}{}

	if status != "" {
		query += " AND status = ?"
		args = append(args, status)
	}

	query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
	args = append(args, pageSize, offset)

	// 执行查询
	rows, err := db.Query(query, args...)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "查询失败: " + err.Error()})
	}
	defer rows.Close()

	// 解析结果
	users := []UserWithProfile{}
	for rows.Next() {
		var u UserWithProfile
		if err := rows.Scan(&u.ID, &u.Name, &u.Age, &u.Email, &u.Status, &u.CreatedAt, &u.UpdatedAt); err != nil {
			continue
		}

		// 如果需要包含详细资料
		if includeProfile {
			profile, _ := getProfileByUserID(u.ID)
			u.Profile = profile
		}

		users = append(users, u)
	}

	// 获取总数
	var total int
	countQuery := "SELECT COUNT(*) FROM users WHERE 1=1"
	countArgs := []interface{}{}
	if status != "" {
		countQuery += " AND status = ?"
		countArgs = append(countArgs, status)
	}
	db.QueryRow(countQuery, countArgs...).Scan(&total)

	return c.JSON(fiber.Map{
		"data": users,
		"pagination": fiber.Map{
			"page":       page,
			"page_size":  pageSize,
			"total":      total,
			"total_page": (total + pageSize - 1) / pageSize,
		},
	})
}

// 2. 获取单个用户
func getUserByID(c *fiber.Ctx) error {
	id, err := c.ParamsInt("id")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "无效的用户ID"})
	}

	includeProfile := c.QueryBool("include_profile", true)

	var user UserWithProfile
	query := "SELECT id, name, age, email, status, created_at, updated_at FROM users WHERE id = ?"
	err = db.QueryRow(query, id).Scan(
		&user.ID, &user.Name, &user.Age, &user.Email,
		&user.Status, &user.CreatedAt, &user.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return c.Status(404).JSON(fiber.Map{"error": "用户不存在"})
	}
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "查询失败: " + err.Error()})
	}

	// 获取详细资料
	if includeProfile {
		profile, _ := getProfileByUserID(user.ID)
		user.Profile = profile
	}

	return c.JSON(fiber.Map{
		"data": user,
	})
}

// 3. 创建用户
func createUser(c *fiber.Ctx) error {
	var req CreateUserRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "请求数据格式错误"})
	}

	// 验证必填字段
	if req.Name == "" || req.Email == "" || req.Age <= 0 {
		return c.Status(400).JSON(fiber.Map{"error": "姓名、年龄和邮箱为必填项"})
	}

	// 开启事务
	tx, err := db.Begin()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "事务开启失败"})
	}
	defer tx.Rollback()

	// 插入用户主表
	result, err := tx.Exec(
		"INSERT INTO users (name, age, email, status) VALUES (?, ?, ?, ?)",
		req.Name, req.Age, req.Email, "active",
	)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "用户创建失败，邮箱可能已存在"})
	}

	userID, _ := result.LastInsertId()

	// 如果提供了详细资料，插入从表
	if req.Profile != nil {
		_, err = tx.Exec(`
			INSERT INTO user_profiles (
				user_id, phone, address, city, country, postal_code,
				bio, avatar, gender, birthday, occupation, company,
				website, github, linkedin, skills, interests
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			userID, req.Profile.Phone, req.Profile.Address, req.Profile.City,
			req.Profile.Country, req.Profile.PostalCode, req.Profile.Bio,
			req.Profile.Avatar, req.Profile.Gender, req.Profile.Birthday,
			req.Profile.Occupation, req.Profile.Company, req.Profile.Website,
			req.Profile.GitHub, req.Profile.LinkedIn, req.Profile.Skills,
			req.Profile.Interests,
		)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "用户资料创建失败"})
		}
	}

	// 提交事务
	if err = tx.Commit(); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "事务提交失败"})
	}

	return c.Status(201).JSON(fiber.Map{
		"message": "用户创建成功",
		"user_id": userID,
	})
}

// 4. 更新用户
func updateUser(c *fiber.Ctx) error {
	id, err := c.ParamsInt("id")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "无效的用户ID"})
	}

	var req UpdateUserRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "请求数据格式错误"})
	}

	// 构建动态更新语句
	updates := []string{}
	args := []interface{}{}

	if req.Name != nil {
		updates = append(updates, "name = ?")
		args = append(args, *req.Name)
	}
	if req.Age != nil {
		updates = append(updates, "age = ?")
		args = append(args, *req.Age)
	}
	if req.Email != nil {
		updates = append(updates, "email = ?")
		args = append(args, *req.Email)
	}
	if req.Status != nil {
		updates = append(updates, "status = ?")
		args = append(args, *req.Status)
	}

	if len(updates) == 0 {
		return c.Status(400).JSON(fiber.Map{"error": "没有提供更新字段"})
	}

	updates = append(updates, "updated_at = CURRENT_TIMESTAMP")
	args = append(args, id)

	query := fmt.Sprintf("UPDATE users SET %s WHERE id = ?",
		joinStrings(updates, ", "))

	result, err := db.Exec(query, args...)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "更新失败"})
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return c.Status(404).JSON(fiber.Map{"error": "用户不存在"})
	}

	return c.JSON(fiber.Map{"message": "用户更新成功"})
}

// 5. 删除用户（级联删除详细资料）
func deleteUser(c *fiber.Ctx) error {
	id, err := c.ParamsInt("id")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "无效的用户ID"})
	}

	result, err := db.Exec("DELETE FROM users WHERE id = ?", id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "删除失败"})
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return c.Status(404).JSON(fiber.Map{"error": "用户不存在"})
	}

	return c.JSON(fiber.Map{"message": "用户删除成功"})
}

// 6. 获取用户详细资料
func getUserProfile(c *fiber.Ctx) error {
	id, err := c.ParamsInt("id")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "无效的用户ID"})
	}

	profile, err := getProfileByUserID(id)
	if err != nil {
		if err == sql.ErrNoRows {
			return c.Status(404).JSON(fiber.Map{"error": "用户资料不存在"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "查询失败"})
	}

	return c.JSON(fiber.Map{"data": profile})
}

// 7. 更新用户详细资料
func updateUserProfile(c *fiber.Ctx) error {
	id, err := c.ParamsInt("id")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "无效的用户ID"})
	}

	var profile UserProfile
	if err := c.BodyParser(&profile); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "请求数据格式错误"})
	}

	// 检查用户是否存在
	var exists bool
	db.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE id = ?)", id).Scan(&exists)
	if !exists {
		return c.Status(404).JSON(fiber.Map{"error": "用户不存在"})
	}

	// 检查是否已有资料
	var profileExists bool
	db.QueryRow("SELECT EXISTS(SELECT 1 FROM user_profiles WHERE user_id = ?)", id).Scan(&profileExists)

	if profileExists {
		// 更新
		_, err = db.Exec(`
			UPDATE user_profiles SET
				phone = ?, address = ?, city = ?, country = ?, postal_code = ?,
				bio = ?, avatar = ?, gender = ?, birthday = ?, occupation = ?,
				company = ?, website = ?, github = ?, linkedin = ?, skills = ?,
				interests = ?, updated_at = CURRENT_TIMESTAMP
			WHERE user_id = ?`,
			profile.Phone, profile.Address, profile.City, profile.Country,
			profile.PostalCode, profile.Bio, profile.Avatar, profile.Gender,
			profile.Birthday, profile.Occupation, profile.Company,
			profile.Website, profile.GitHub, profile.LinkedIn,
			profile.Skills, profile.Interests, id,
		)
	} else {
		// 插入
		_, err = db.Exec(`
			INSERT INTO user_profiles (
				user_id, phone, address, city, country, postal_code,
				bio, avatar, gender, birthday, occupation, company,
				website, github, linkedin, skills, interests
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			id, profile.Phone, profile.Address, profile.City,
			profile.Country, profile.PostalCode, profile.Bio,
			profile.Avatar, profile.Gender, profile.Birthday,
			profile.Occupation, profile.Company, profile.Website,
			profile.GitHub, profile.LinkedIn, profile.Skills,
			profile.Interests,
		)
	}

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "更新失败"})
	}

	return c.JSON(fiber.Map{"message": "用户资料更新成功"})
}

// 8. 删除用户详细资料
func deleteUserProfile(c *fiber.Ctx) error {
	id, err := c.ParamsInt("id")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "无效的用户ID"})
	}

	result, err := db.Exec("DELETE FROM user_profiles WHERE user_id = ?", id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "删除失败"})
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return c.Status(404).JSON(fiber.Map{"error": "用户资料不存在"})
	}

	return c.JSON(fiber.Map{"message": "用户资料删除成功"})
}

// 9. 搜索用户
func searchUsers(c *fiber.Ctx) error {
	keyword := c.Query("q", "")
	if keyword == "" {
		return c.Status(400).JSON(fiber.Map{"error": "请提供搜索关键词"})
	}

	query := `
		SELECT u.id, u.name, u.age, u.email, u.status, u.created_at, u.updated_at
		FROM users u
		WHERE u.name LIKE ? OR u.email LIKE ?
		ORDER BY u.created_at DESC
		LIMIT 50
	`

	pattern := "%" + keyword + "%"
	rows, err := db.Query(query, pattern, pattern)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "搜索失败"})
	}
	defer rows.Close()

	users := []User{}
	for rows.Next() {
		var u User
		if err := rows.Scan(&u.ID, &u.Name, &u.Age, &u.Email, &u.Status, &u.CreatedAt, &u.UpdatedAt); err != nil {
			continue
		}
		users = append(users, u)
	}

	return c.JSON(fiber.Map{
		"keyword": keyword,
		"count":   len(users),
		"data":    users,
	})
}

// 10. 获取统计信息
func getStats(c *fiber.Ctx) error {
	// stats := fiber.Map{}
	var totalUsers int
	var activeUsers int
	var usersWithProfile int
	var todayNewUsers int
	// 总用户数
	db.QueryRow("SELECT COUNT(*) FROM users").Scan(&totalUsers)
	// 激活用户数
	db.QueryRow("SELECT COUNT(*) FROM users WHERE status = 'active'").Scan(&activeUsers)

	// 有详细资料的用户数
	db.QueryRow("SELECT COUNT(*) FROM user_profiles").Scan(&usersWithProfile)

	// 今天新增用户
	db.QueryRow("SELECT COUNT(*) FROM users WHERE DATE(created_at) = DATE('now')").Scan(&todayNewUsers)
	stats := fiber.Map{
		"total_users":        totalUsers,
		"active_users":       activeUsers,
		"users_with_profile": usersWithProfile,
		"today_new_users":    todayNewUsers,
	}

	// 按状态分组
	rows, _ := db.Query("SELECT status, COUNT(*) FROM users GROUP BY status")
	statusMap := make(map[string]int)
	for rows.Next() {
		var status string
		var count int
		rows.Scan(&status, &count)
		statusMap[status] = count
	}
	rows.Close()
	stats["by_status"] = statusMap

	return c.JSON(fiber.Map{"data": stats})
}

// ==================== 辅助函数 ====================

func getProfileByUserID(userID int) (*UserProfile, error) {
	var p UserProfile
	query := `
		SELECT id, user_id, phone, address, city, country, postal_code,
		       bio, avatar, gender, birthday, occupation, company,
		       website, github, linkedin, skills, interests,
		       created_at, updated_at
		FROM user_profiles WHERE user_id = ?
	`
	err := db.QueryRow(query, userID).Scan(
		&p.ID, &p.UserID, &p.Phone, &p.Address, &p.City, &p.Country,
		&p.PostalCode, &p.Bio, &p.Avatar, &p.Gender, &p.Birthday,
		&p.Occupation, &p.Company, &p.Website, &p.GitHub, &p.LinkedIn,
		&p.Skills, &p.Interests, &p.CreatedAt, &p.UpdatedAt,
	)
	return &p, err
}

func joinStrings(strs []string, sep string) string {
	if len(strs) == 0 {
		return ""
	}
	result := strs[0]
	for i := 1; i < len(strs); i++ {
		result += sep + strs[i]
	}
	return result
}

func customErrorHandler(c *fiber.Ctx, err error) error {
	code := fiber.StatusInternalServerError
	if e, ok := err.(*fiber.Error); ok {
		code = e.Code
	}
	return c.Status(code).JSON(fiber.Map{
		"error":     err.Error(),
		"timestamp": time.Now().Unix(),
	})
}

// seedSampleData 在空库时插入一批演示用户及其资料（幂等）
func seedSampleData() error {
	// 若已有数据，直接跳过
	var cnt int
	if err := db.QueryRow("SELECT COUNT(*) FROM users").Scan(&cnt); err != nil {
		return err
	}
	if cnt > 0 {
		log.Printf("跳过测试数据插入：当前已有 %d 个用户\n", cnt)
		return nil
	}

	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer func() {
		_ = tx.Rollback()
	}()

	type pair struct {
		User    User
		Profile UserProfile
	}

	now := time.Now().Format("2006-01-02")
	data := []pair{
		{
			User: User{Name: "Alice Chen", Age: 26, Email: "alice@example.com", Status: "active"},
			Profile: UserProfile{
				Phone: "13800000001", Address: "虹口区东大名路 100 号", City: "Shanghai", Country: "CN",
				PostalCode: "200080", Bio: "前端工程师，热爱开源与设计系统", Avatar: "https://img.example.com/alice.png",
				Gender: "female", Birthday: "1999-03-15", Occupation: "Frontend Engineer", Company: "Acme Tech",
				Website: "https://alice.dev", GitHub: "alice", LinkedIn: "alice-chen", Skills: "JS,TS,React,Go",
				Interests: "Hiking,Reading,Photography",
			},
		},
		{
			User: User{Name: "Bob Li", Age: 32, Email: "bob@example.com", Status: "inactive"},
			Profile: UserProfile{
				Phone: "13800000002", Address: "海淀区中关村大街 1 号", City: "Beijing", Country: "CN",
				PostalCode: "100080", Bio: "后端开发，关注高并发与可观测性", Avatar: "https://img.example.com/bob.png",
				Gender: "male", Birthday: "1993-11-02", Occupation: "Backend Engineer", Company: "ServicePlus",
				Website: "https://bob.engineer", GitHub: "bob-li", LinkedIn: "bob-li",
				Skills: "Go,GRPC,Redis,PostgreSQL", Interests: "Running,BoardGames",
			},
		},
		{
			User: User{Name: "Carol Wang", Age: 29, Email: "carol@example.com", Status: "suspended"},
			Profile: UserProfile{
				Phone: "13800000003", Address: "天府大道 8 号", City: "Chengdu", Country: "CN",
				PostalCode: "610000", Bio: "全栈工程师，偏好 TypeScript & Go", Avatar: "https://img.example.com/carol.png",
				Gender: "female", Birthday: "1996-07-21", Occupation: "Fullstack Dev", Company: "NextWave",
				Website: "https://carol.codes", GitHub: "carolw", LinkedIn: "carol-wang",
				Skills: "Vue,Node,Go,SQLite", Interests: "Cooking,Travel",
			},
		},
		{
			User: User{Name: "David Zhou", Age: 35, Email: "david@example.com", Status: "active"},
			Profile: UserProfile{
				Phone: "13800000004", Address: "南山区科技园南区", City: "Shenzhen", Country: "CN",
				PostalCode: "518000", Bio: "架构师，关注服务治理与成本优化", Avatar: "https://img.example.com/david.png",
				Gender: "male", Birthday: "1990-01-05", Occupation: "Architect", Company: "CloudBridge",
				Website: "https://davidz.dev", GitHub: "davidz", LinkedIn: "david-zhou",
				Skills: "Kubernetes,Go,MySQL", Interests: "Cycling,Chess",
			},
		},
		{
			User: User{Name: "Erin Sun", Age: 23, Email: "erin@example.com", Status: "active"},
			Profile: UserProfile{
				Phone: "13800000005", Address: "西湖区文三路 88 号", City: "Hangzhou", Country: "CN",
				PostalCode: "310000", Bio: "实习生，专注数据可视化", Avatar: "https://img.example.com/erin.png",
				Gender: "other", Birthday: "2002-05-30", Occupation: "Intern", Company: "VizLab",
				Website: "https://erin.viz", GitHub: "erin-s", LinkedIn: "erin-sun",
				Skills: "D3.js,React,Go", Interests: "Movies,Sketching",
			},
		},
	}

	// 插入 users + user_profiles
	for _, p := range data {
		res, err := tx.Exec(
			`INSERT INTO users (name, age, email, status, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?)`,
			p.User.Name, p.User.Age, p.User.Email, p.User.Status, time.Now(), time.Now(),
		)
		if err != nil {
			return fmt.Errorf("插入用户 %s 失败: %w", p.User.Email, err)
		}
		uid, _ := res.LastInsertId()

		_, err = tx.Exec(`
			INSERT INTO user_profiles
			(user_id, phone, address, city, country, postal_code,
			 bio, avatar, gender, birthday, occupation, company,
			 website, github, linkedin, skills, interests, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			uid, p.Profile.Phone, p.Profile.Address, p.Profile.City, p.Profile.Country,
			p.Profile.PostalCode, p.Profile.Bio, p.Profile.Avatar, p.Profile.Gender,
			p.Profile.Birthday, p.Profile.Occupation, p.Profile.Company, p.Profile.Website,
			p.Profile.GitHub, p.Profile.LinkedIn, p.Profile.Skills, p.Profile.Interests,
			now, now,
		)
		if err != nil {
			return fmt.Errorf("为用户 %s 插入资料失败: %w", p.User.Email, err)
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	log.Printf("✅ 已插入测试数据：%d 位用户（含资料）\n", len(data))
	return nil
}
