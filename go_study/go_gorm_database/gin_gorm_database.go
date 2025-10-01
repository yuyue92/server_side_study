package main

import (
	"fmt"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// GORM 模型
type Product struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"` // 软删除
	Name        string         `gorm:"size:100;not null" json:"name"`
	Price       float64        `gorm:"not null" json:"price"`
	Stock       int            `gorm:"default:0" json:"stock"`
	Category    string         `gorm:"size:50;index" json:"category"`
	Description string         `gorm:"size:500" json:"description"`
}

// 请求结构体
type CreateProductRequest struct {
	Name        string  `json:"name" binding:"required,min=2"`
	Price       float64 `json:"price" binding:"required,gt=0"`
	Stock       int     `json:"stock" binding:"gte=0"`
	Category    string  `json:"category" binding:"required"`
	Description string  `json:"description"`
}

type UpdateProductRequest struct {
	Name        string  `json:"name" binding:"omitempty,min=2"`
	Price       float64 `json:"price" binding:"omitempty,gt=0"`
	Stock       int     `json:"stock" binding:"omitempty,gte=0"`
	Category    string  `json:"category"`
	Description string  `json:"description"`
}

var db *gorm.DB

func main() {
	// 初始化数据库
	initDB()

	// 插入测试数据
	seedData()

	r := gin.Default()

	// 产品路由
	products := r.Group("/products")
	{
		products.GET("", getAllProducts)                // 获取所有产品（带分页）
		products.GET("/:id", getProductByID)            // 获取单个产品
		products.POST("", createProduct)                // 创建产品
		products.PUT("/:id", updateProduct)             // 更新产品
		products.DELETE("/:id", deleteProduct)          // 删除产品（软删除）
		products.DELETE("/:id/hard", hardDeleteProduct) // 硬删除
	}

	// 额外的查询接口
	r.GET("/products/category/:category", getProductsByCategory)
	r.GET("/products/search", searchProducts)

	// 统计接口
	r.GET("/stats", getStats)

	fmt.Println("🚀 Server running on http://localhost:8080")
	fmt.Println("📝 Try these endpoints:")
	fmt.Println("   GET    http://localhost:8080/products")
	fmt.Println("   GET    http://localhost:8080/products/1")
	fmt.Println("   POST   http://localhost:8080/products")
	fmt.Println("   PUT    http://localhost:8080/products/1")
	fmt.Println("   DELETE http://localhost:8080/products/1")

	r.Run(":8080")
}

// 初始化数据库
func initDB() {
	var err error
	db, err = gorm.Open(sqlite.Open("products.db"), &gorm.Config{})
	if err != nil {
		panic("failed to connect database")
	}

	// 自动迁移（创建/更新表结构）
	db.AutoMigrate(&Product{})

	fmt.Println("✅ Database connected and migrated")
}

// 插入测试数据
func seedData() {
	// 检查是否已有数据
	var count int64
	db.Model(&Product{}).Count(&count)

	if count > 0 {
		fmt.Printf("📦 Database already has %d products\n", count)
		return
	}

	// 测试数据
	products := []Product{
		{Name: "iPhone 15 Pro", Price: 999.99, Stock: 50, Category: "Electronics", Description: "Latest Apple smartphone"},
		{Name: "MacBook Pro 16", Price: 2499.99, Stock: 30, Category: "Electronics", Description: "Powerful laptop for professionals"},
		{Name: "AirPods Pro", Price: 249.99, Stock: 100, Category: "Electronics", Description: "Wireless earbuds with ANC"},
		{Name: "iPad Air", Price: 599.99, Stock: 45, Category: "Electronics", Description: "Versatile tablet"},
		{Name: "Apple Watch Series 9", Price: 399.99, Stock: 60, Category: "Electronics", Description: "Advanced smartwatch"},

		{Name: "Nike Air Max", Price: 129.99, Stock: 80, Category: "Shoes", Description: "Comfortable running shoes"},
		{Name: "Adidas Ultraboost", Price: 179.99, Stock: 65, Category: "Shoes", Description: "Premium athletic shoes"},
		{Name: "Converse Chuck Taylor", Price: 59.99, Stock: 120, Category: "Shoes", Description: "Classic canvas sneakers"},

		{Name: "The Great Gatsby", Price: 14.99, Stock: 200, Category: "Books", Description: "Classic American novel"},
		{Name: "1984", Price: 13.99, Stock: 150, Category: "Books", Description: "Dystopian social science fiction"},
		{Name: "To Kill a Mockingbird", Price: 15.99, Stock: 180, Category: "Books", Description: "Coming-of-age story"},

		{Name: "Organic Coffee Beans", Price: 24.99, Stock: 300, Category: "Food", Description: "Premium arabica beans"},
		{Name: "Green Tea Box", Price: 12.99, Stock: 250, Category: "Food", Description: "100 tea bags"},
		{Name: "Dark Chocolate Bar", Price: 4.99, Stock: 400, Category: "Food", Description: "85% cocoa"},
	}

	// 批量插入
	result := db.Create(&products)
	if result.Error != nil {
		fmt.Println("❌ Failed to seed data:", result.Error)
		return
	}

	fmt.Printf("✅ Seeded %d products successfully\n", result.RowsAffected)
}

// ========== CRUD 操作 ==========

// 获取所有产品（带分页和筛选）
func getAllProducts(c *gin.Context) {
	var products []Product

	// 解析查询参数
	pageStr := c.DefaultQuery("page", "1")
	pageSizeStr := c.DefaultQuery("page_size", "10")
	category := c.Query("category")
	sortBy := c.DefaultQuery("sort_by", "id")        // id, name, price, created_at
	sortOrder := c.DefaultQuery("sort_order", "asc") // asc, desc

	// 转换参数
	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}

	pageSize, err := strconv.Atoi(pageSizeStr)
	if err != nil || pageSize < 1 {
		pageSize = 10
	}
	if pageSize > 100 {
		pageSize = 100
	}

	// 构建查询
	query := db.Model(&Product{})

	// 分类筛选
	if category != "" {
		query = query.Where("category = ?", category)
	}

	// 计算总数
	var total int64
	query.Count(&total)

	// 排序
	orderClause := sortBy + " " + sortOrder
	query = query.Order(orderClause)

	// 分页
	offset := (page - 1) * pageSize
	query.Offset(offset).Limit(pageSize).Find(&products)

	c.JSON(200, gin.H{
		"success":     true,
		"data":        products,
		"total":       total,
		"page":        page,
		"page_size":   pageSize,
		"total_pages": (total + int64(pageSize) - 1) / int64(pageSize),
	})
}

// 获取单个产品
func getProductByID(c *gin.Context) {
	id := c.Param("id")
	var product Product

	if err := db.First(&product, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(404, gin.H{
				"success": false,
				"error":   "Product not found",
			})
		} else {
			c.JSON(500, gin.H{
				"success": false,
				"error":   "Database error",
			})
		}
		return
	}

	c.JSON(200, gin.H{
		"success": true,
		"data":    product,
	})
}

// 创建产品
func createProduct(c *gin.Context) {
	var req CreateProductRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	product := Product{
		Name:        req.Name,
		Price:       req.Price,
		Stock:       req.Stock,
		Category:    req.Category,
		Description: req.Description,
	}

	if err := db.Create(&product).Error; err != nil {
		c.JSON(500, gin.H{
			"success": false,
			"error":   "Failed to create product",
		})
		return
	}

	c.JSON(201, gin.H{
		"success": true,
		"message": "Product created successfully",
		"data":    product,
	})
}

// 更新产品
func updateProduct(c *gin.Context) {
	id := c.Param("id")
	var product Product

	// 检查产品是否存在
	if err := db.First(&product, id).Error; err != nil {
		c.JSON(404, gin.H{
			"success": false,
			"error":   "Product not found",
		})
		return
	}

	var req UpdateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// 更新字段
	updates := make(map[string]interface{})
	if req.Name != "" {
		updates["name"] = req.Name
	}
	if req.Price > 0 {
		updates["price"] = req.Price
	}
	if req.Stock >= 0 {
		updates["stock"] = req.Stock
	}
	if req.Category != "" {
		updates["category"] = req.Category
	}
	if req.Description != "" {
		updates["description"] = req.Description
	}

	if err := db.Model(&product).Updates(updates).Error; err != nil {
		c.JSON(500, gin.H{
			"success": false,
			"error":   "Failed to update product",
		})
		return
	}

	// 重新获取更新后的数据
	db.First(&product, id)

	c.JSON(200, gin.H{
		"success": true,
		"message": "Product updated successfully",
		"data":    product,
	})
}

// 删除产品（软删除）
func deleteProduct(c *gin.Context) {
	id := c.Param("id")

	// 检查产品是否存在
	var product Product
	if err := db.First(&product, id).Error; err != nil {
		c.JSON(404, gin.H{
			"success": false,
			"error":   "Product not found",
		})
		return
	}

	// 软删除
	if err := db.Delete(&product).Error; err != nil {
		c.JSON(500, gin.H{
			"success": false,
			"error":   "Failed to delete product",
		})
		return
	}

	c.JSON(200, gin.H{
		"success": true,
		"message": "Product deleted successfully (soft delete)",
	})
}

// 硬删除产品
func hardDeleteProduct(c *gin.Context) {
	id := c.Param("id")

	// 硬删除（永久删除）
	if err := db.Unscoped().Delete(&Product{}, id).Error; err != nil {
		c.JSON(500, gin.H{
			"success": false,
			"error":   "Failed to delete product",
		})
		return
	}

	c.JSON(200, gin.H{
		"success": true,
		"message": "Product permanently deleted",
	})
}

// ========== 额外功能 ==========

// 按分类获取产品
func getProductsByCategory(c *gin.Context) {
	category := c.Param("category")
	var products []Product

	db.Where("category = ?", category).Find(&products)

	c.JSON(200, gin.H{
		"success":  true,
		"category": category,
		"count":    len(products),
		"data":     products,
	})
}

// 搜索产品（按名称）
func searchProducts(c *gin.Context) {
	keyword := c.Query("q")
	if keyword == "" {
		c.JSON(400, gin.H{
			"success": false,
			"error":   "Search keyword required",
		})
		return
	}

	var products []Product
	db.Where("name LIKE ?", "%"+keyword+"%").Find(&products)

	c.JSON(200, gin.H{
		"success": true,
		"keyword": keyword,
		"count":   len(products),
		"data":    products,
	})
}

// 统计信息
func getStats(c *gin.Context) {
	var totalProducts int64
	var totalValue float64
	var categories []string

	// 总产品数
	db.Model(&Product{}).Count(&totalProducts)

	// 总库存价值
	db.Model(&Product{}).Select("SUM(price * stock)").Scan(&totalValue)

	// 所有分类
	db.Model(&Product{}).Distinct("category").Pluck("category", &categories)

	// 每个分类的统计
	type CategoryStat struct {
		Category string
		Count    int64
		Total    float64
	}
	var categoryStats []CategoryStat
	db.Model(&Product{}).
		Select("category, COUNT(*) as count, SUM(price * stock) as total").
		Group("category").
		Scan(&categoryStats)

	c.JSON(200, gin.H{
		"success":        true,
		"total_products": totalProducts,
		"total_value":    totalValue,
		"categories":     categories,
		"category_stats": categoryStats,
	})
}
