## GORM详解
**GORM基础概念**

GORM是Go语言的 ORM库，有以下特点：
- 全功能 ORM
- 关联（Has One, Has Many, Belongs To, Many To Many）
- 钩子（Before/After Create/Save/Update/Delete/Find）
- 预加载（Eager loading）
- 事务复合主键
- SQL Builder
- 自动迁移

**GORM核心功能代码示例**
```
// gorm_basics.go
package main

import (
    "fmt"
    "log"
    "time"
    
    "gorm.io/driver/postgres"
    "gorm.io/gorm"
    "gorm.io/gorm/logger"
)

// ===== 1. 模型定义 =====

// 基础模型
type User struct {
    ID        uint           `gorm:"primaryKey" json:"id"`
    Username  string         `gorm:"size:50;not null;unique" json:"username"`
    Email     string         `gorm:"size:100;not null;unique" json:"email"`
    Password  string         `gorm:"size:255;not null" json:"-"` // json:"-" 不序列化
    Age       int            `gorm:"default:0" json:"age"`
    IsActive  bool           `gorm:"default:true" json:"is_active"`
    CreatedAt time.Time      `json:"created_at"`
    UpdatedAt time.Time      `json:"updated_at"`
    DeletedAt gorm.DeletedAt `gorm:"index" json:"-"` // 软删除
}

// 自定义表名
func (User) TableName() string {
    return "users"
}

// 产品模型
type Product struct {
    ID          uint      `gorm:"primaryKey" json:"id"`
    Name        string    `gorm:"size:100;not null" json:"name"`
    Description string    `gorm:"type:text" json:"description"`
    Price       float64   `gorm:"type:decimal(10,2);not null" json:"price"`
    Stock       int       `gorm:"default:0" json:"stock"`
    CategoryID  uint      `json:"category_id"`
    Category    Category  `gorm:"foreignKey:CategoryID" json:"category,omitempty"`
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
}

// 分类模型
type Category struct {
    ID       uint      `gorm:"primaryKey" json:"id"`
    Name     string    `gorm:"size:50;not null;unique" json:"name"`
    Products []Product `gorm:"foreignKey:CategoryID" json:"products,omitempty"`
}

// 订单模型
type Order struct {
    ID         uint        `gorm:"primaryKey" json:"id"`
    OrderNo    string      `gorm:"size:50;not null;unique" json:"order_no"`
    UserID     uint        `json:"user_id"`
    User       User        `gorm:"foreignKey:UserID" json:"user,omitempty"`
    TotalPrice float64     `gorm:"type:decimal(10,2)" json:"total_price"`
    Status     string      `gorm:"size:20;default:'pending'" json:"status"`
    OrderItems []OrderItem `gorm:"foreignKey:OrderID" json:"order_items,omitempty"`
    CreatedAt  time.Time   `json:"created_at"`
    UpdatedAt  time.Time   `json:"updated_at"`
}

// 订单项模型（多对多关系）
type OrderItem struct {
    ID        uint    `gorm:"primaryKey" json:"id"`
    OrderID   uint    `json:"order_id"`
    ProductID uint    `json:"product_id"`
    Product   Product `gorm:"foreignKey:ProductID" json:"product,omitempty"`
    Quantity  int     `gorm:"not null" json:"quantity"`
    Price     float64 `gorm:"type:decimal(10,2)" json:"price"`
}

// ===== 2. 数据库连接 =====

func connectDB() (*gorm.DB, error) {
    // PostgreSQL连接字符串
    dsn := "host=localhost user=postgres password=yourpassword dbname=testdb port=5432 sslmode=disable TimeZone=Asia/Shanghai"
    
    db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
        Logger: logger.Default.LogMode(logger.Info), // 显示SQL日志
        NowFunc: func() time.Time {
            return time.Now().Local()
        },
    })
    
    if err != nil {
        return nil, err
    }
    
    // 获取底层sql.DB进行连接池设置
    sqlDB, err := db.DB()
    if err != nil {
        return nil, err
    }
    
    sqlDB.SetMaxIdleConns(10)
    sqlDB.SetMaxOpenConns(100)
    sqlDB.SetConnMaxLifetime(time.Hour)
    
    return db, nil
}

// ===== 3. 自动迁移 =====

func autoMigrate(db *gorm.DB) error {
    return db.AutoMigrate(
        &User{},
        &Category{},
        &Product{},
        &Order{},
        &OrderItem{},
    )
}

// ===== 4. CRUD操作 =====

// Create - 创建
func createExamples(db *gorm.DB) {
    // 创建单条记录
    user := User{
        Username: "john_doe",
        Email:    "john@example.com",
        Password: "hashed_password",
        Age:      25,
    }
    
    result := db.Create(&user)
    if result.Error != nil {
        log.Fatal(result.Error)
    }
    fmt.Printf("Created user with ID: %d\n", user.ID)
    
    // 批量创建
    users := []User{
        {Username: "alice", Email: "alice@example.com", Password: "pass123", Age: 28},
        {Username: "bob", Email: "bob@example.com", Password: "pass123", Age: 30},
    }
    db.Create(&users)
    
    // 创建并选择字段
    db.Select("Username", "Email", "Password").Create(&User{
        Username: "selected",
        Email:    "selected@example.com",
        Password: "pass123",
        Age:      20, // 这个字段不会被插入
    })
}

// Read - 查询
func readExamples(db *gorm.DB) {
    var user User
    var users []User
    
    // 1. 根据主键查询
    db.First(&user, 1) // SELECT * FROM users WHERE id = 1
    fmt.Printf("User: %+v\n", user)
    
    // 2. 根据条件查询第一条
    db.Where("email = ?", "john@example.com").First(&user)
    
    // 3. 查询所有
    db.Find(&users)
    
    // 4. 条件查询
    db.Where("age > ?", 25).Find(&users)
    db.Where("age >= ? AND age <= ?", 25, 30).Find(&users)
    db.Where("username IN ?", []string{"john_doe", "alice"}).Find(&users)
    db.Where("username LIKE ?", "%john%").Find(&users)
    
    // 5. 使用结构体条件
    db.Where(&User{Age: 25, IsActive: true}).Find(&users)
    
    // 6. 使用Map条件
    db.Where(map[string]interface{}{"age": 25, "is_active": true}).Find(&users)
    
    // 7. Not条件
    db.Not("age > ?", 30).Find(&users)
    
    // 8. Or条件
    db.Where("age < ?", 25).Or("age > ?", 30).Find(&users)
    
    // 9. 选择特定字段
    db.Select("username", "email").Find(&users)
    
    // 10. 排序
    db.Order("age desc").Find(&users)
    db.Order("age desc, username asc").Find(&users)
    
    // 11. 限制和偏移（分页）
    db.Limit(10).Offset(0).Find(&users) // 第一页
    db.Limit(10).Offset(10).Find(&users) // 第二页
    
    // 12. 分组
    type Result struct {
        Age   int
        Count int
    }
    var results []Result
    db.Model(&User{}).Select("age, count(*) as count").Group("age").Scan(&results)
    
    // 13. 统计
    var count int64
    db.Model(&User{}).Where("age > ?", 25).Count(&count)
    fmt.Printf("Count: %d\n", count)
    
    // 14. 去重
    db.Distinct("age").Find(&users)
}

// Update - 更新
func updateExamples(db *gorm.DB) {
    // 1. 更新单个字段
    db.Model(&User{}).Where("id = ?", 1).Update("age", 26)
    
    // 2. 更新多个字段（使用结构体）
    db.Model(&User{}).Where("id = ?", 1).Updates(User{
        Username: "john_updated",
        Age:      27,
    })
    
    // 3. 更新多个字段（使用Map）
    db.Model(&User{}).Where("id = ?", 1).Updates(map[string]interface{}{
        "username": "john_map",
        "age":      28,
    })
    
    // 4. 更新选中的字段
    db.Model(&User{}).Where("id = ?", 1).Select("age").Updates(User{
        Username: "ignored", // 这个字段会被忽略
        Age:      29,        // 只更新这个字段
    })
    
    // 5. 批量更新
    db.Model(&User{}).Where("age < ?", 25).Update("is_active", false)
    
    // 6. 使用表达式更新
    db.Model(&User{}).Where("id = ?", 1).Update("age", gorm.Expr("age + ?", 1))
    
    // 7. 更新或创建
    var user User
    db.Where(User{Email: "new@example.com"}).Assign(User{Age: 30}).FirstOrCreate(&user)
}

// Delete - 删除
func deleteExamples(db *gorm.DB) {
    // 1. 根据主键删除
    db.Delete(&User{}, 1)
    
    // 2. 根据条件删除
    db.Where("age < ?", 20).Delete(&User{})
    
    // 3. 批量删除
    db.Delete(&User{}, []int{1, 2, 3})
    
    // 4. 软删除（如果模型有DeletedAt字段）
    db.Delete(&User{}, 1) // UPDATE users SET deleted_at = NOW() WHERE id = 1
    
    // 5. 查找软删除的记录
    var users []User
    db.Unscoped().Where("username = ?", "john").Find(&users)
    
    // 6. 永久删除
    db.Unscoped().Delete(&User{}, 1) // DELETE FROM users WHERE id = 1
}

// ===== 5. 关联查询 =====

func associationExamples(db *gorm.DB) {
    // 预加载（Eager Loading）
    var products []Product
    
    // 1. Preload - 预加载关联
    db.Preload("Category").Find(&products)
    
    // 2. 预加载多个关联
    var orders []Order
    db.Preload("User").Preload("OrderItems").Find(&orders)
    
    // 3. 嵌套预加载
    db.Preload("OrderItems.Product").Find(&orders)
    
    // 4. 条件预加载
    db.Preload("OrderItems", "quantity > ?", 1).Find(&orders)
    
    // 5. Joins - 使用JOIN查询
    db.Joins("Category").Find(&products)
    
    // 6. 关联创建
    category := Category{
        Name: "Electronics",
        Products: []Product{
            {Name: "Laptop", Price: 999.99, Stock: 10},
            {Name: "Mouse", Price: 29.99, Stock: 50},
        },
    }
    db.Create(&category)
    
    // 7. 关联查询
    var cat Category
    db.First(&cat, 1)
    var prods []Product
    db.Model(&cat).Association("Products").Find(&prods)
    
    // 8. 添加关联
    db.Model(&cat).Association("Products").Append(&Product{
        Name:  "Keyboard",
        Price: 79.99,
        Stock: 30,
    })
    
    // 9. 替换关联
    db.Model(&cat).Association("Products").Replace(&Product{
        Name:  "Monitor",
        Price: 299.99,
        Stock: 15,
    })
    
    // 10. 删除关联
    db.Model(&cat).Association("Products").Delete(&prods[0])
    
    // 11. 清空关联
    db.Model(&cat).Association("Products").Clear()
    
    // 12. 统计关联
    count := db.Model(&cat).Association("Products").Count()
    fmt.Printf("Products count: %d\n", count)
}

// ===== 6. 事务 =====

func transactionExamples(db *gorm.DB) {
    // 方法1: 自动事务
    err := db.Transaction(func(tx *gorm.DB) error {
        // 创建用户
        user := User{
            Username: "tx_user",
            Email:    "tx@example.com",
            Password: "pass123",
        }
        if err := tx.Create(&user).Error; err != nil {
            return err // 返回错误会自动回滚
        }
        
        // 创建订单
        order := Order{
            OrderNo:    "ORD001",
            UserID:     user.ID,
            TotalPrice: 100.00,
            Status:     "pending",
        }
        if err := tx.Create(&order).Error; err != nil {
            return err
        }
        
        return nil // 返回nil会自动提交
    })
    
    if err != nil {
        log.Printf("Transaction failed: %v", err)
    }
    
    // 方法2: 手动事务
    tx := db.Begin()
    defer func() {
        if r := recover(); r != nil {
            tx.Rollback()
        }
    }()
    
    if err := tx.Error; err != nil {
        log.Fatal(err)
    }
    
    user := User{Username: "manual_tx", Email: "manual@example.com", Password: "pass123"}
    if err := tx.Create(&user).Error; err != nil {
        tx.Rollback()
        log.Fatal(err)
    }
    
    if err := tx.Commit().Error; err != nil {
        log.Fatal(err)
    }
}

// ===== 7. 钩子（Hooks） =====

// BeforeCreate 创建前
func (u *User) BeforeCreate(tx *gorm.DB) error {
    fmt.Println("Before creating user:", u.Username)
    // 这里可以做数据验证、加密等操作
    return nil
}

// AfterCreate 创建后
func (u *User) AfterCreate(tx *gorm.DB) error {
    fmt.Println("After creating user:", u.Username)
    // 这里可以做日志记录、发送通知等操作
    return nil
}

// BeforeUpdate 更新前
func (u *User) BeforeUpdate(tx *gorm.DB) error {
    fmt.Println("Before updating user:", u.Username)
    return nil
}

// AfterUpdate 更新后
func (u *User) AfterUpdate(tx *gorm.DB) error {
    fmt.Println("After updating user:", u.Username)
    return nil
}

// BeforeDelete 删除前
func (u *User) BeforeDelete(tx *gorm.DB) error {
    fmt.Println("Before deleting user:", u.Username)
    return nil
}

// AfterDelete 删除后
func (u *User) AfterDelete(tx *gorm.DB) error {
    fmt.Println("After deleting user:", u.Username)
    return nil
}

// ===== 8. 原始SQL查询 =====

func rawSQLExamples(db *gorm.DB) {
    // 1. Raw SQL查询
    var users []User
    db.Raw("SELECT * FROM users WHERE age > ?", 25).Scan(&users)
    
    // 2. Exec执行原始SQL
    db.Exec("UPDATE users SET age = age + 1 WHERE age < ?", 30)
    
    // 3. 命名参数
    db.Raw("SELECT * FROM users WHERE username = @username AND age > @age",
        map[string]interface{}{
            "username": "john",
            "age":      20,
        }).Scan(&users)
    
    // 4. Row
    row := db.Raw("SELECT username, email FROM users WHERE id = ?", 1).Row()
    var username, email string
    row.Scan(&username, &email)
    
    // 5. Rows
    rows, err := db.Raw("SELECT username, age FROM users").Rows()
    if err != nil {
        log.Fatal(err)
    }
    defer rows.Close()
    
    for rows.Next() {
        var username string
        var age int
        rows.Scan(&username, &age)
        fmt.Printf("%s: %d\n", username, age)
    }
}

func main() {
    db, err := connectDB()
    if err != nil {
        log.Fatal("Failed to connect to database:", err)
    }
    
    fmt.Println("Database connected successfully!")
    
    // 自动迁移
    if err := autoMigrate(db); err != nil {
        log.Fatal("Failed to migrate:", err)
    }
    
    // 运行示例
    createExamples(db)
    readExamples(db)
    updateExamples(db)
    // deleteExamples(db)
    // associationExamples(db)
    // transactionExamples(db)
    // rawSQLExamples(db)
}
```
