package main

import (
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

// User 用户模型
type User struct {
	ID        int       `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	Age       int       `json:"age"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// ===== 2) 数据库初始化 =====
func initDB() *gorm.DB {
	db, err := gorm.Open(sqlite.Open("user.db"), &gorm.Config{})
	if err != nil {
		log.Fatal("open sqlite err: ", err)
	}
	// 自动建表/迁移
	err = db.AutoMigrate(&User{})
	if err != nil {
		log.Fatal("auto migrate err: ", err)
	}
	return db
}

// ===== 3) DTO（入参结构） =====
// 创建用户的请求体
type CreateUserReq struct {
	Name  string
	Email string
	Age   int
}

// 局部更新（PATCH）的请求体：使用指针表示“可选字段”
type UpdateUserReq struct {
	Name  string
	Email string
	Age   int
}

// ===== 4) 错误帮助函数 =====
func jsonErr(c *gin.Context, code int, msg string) {
	c.AbortWithStatusJSON(code, gin.H{"code": 500, "error": msg})
}

// ===== 5) 主程序（路由 + 处理器） =====
func main() {
	db := initDB()
	var count int64
	db.Model(&User{}).Count(&count)
	if count > 0 {
		fmt.Println("=====gorm batabase, already has users_data, count: ===", count)
	} else {
		// 插入测试数据
		userlist := []User{
			{Name: "zhangsna", Email: "zhangsna@163.com", Age: 33},
			{Name: "yuyue3", Email: "yuyue3@163.com", Age: 44},
			{Name: "wangwu", Email: "wangwu@163.com", Age: 35},
		}
		res := db.Create(&userlist)
		if res.Error != nil {
			fmt.Println("❌ Failed to seed data:", res.Error)
			return
		}
		fmt.Printf("✅ Seeded %d users successfully\n", res.RowsAffected)
	}
	r := gin.Default()
	r.Use(cors.New(cors.Config{
		// 开发期先放开；生产建议改成你前端的白名单
		AllowOrigins:  []string{"*"},
		AllowMethods:  []string{"GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:  []string{"Origin", "Content-Type", "Authorization", "Accept"},
		ExposeHeaders: []string{"Content-Length"},
		// 如果你要带 cookie/凭证，请改为具体域名，且设为 true
		AllowCredentials: false,
		MaxAge:           12 * time.Hour,
	}))
	r.GET("/", func(ctx *gin.Context) {
		ctx.JSON(200, gin.H{"ok": true, "code": 200})
	})
	// ---- Read (list): GET /users ----
	r.GET("/users", func(ctx *gin.Context) {
		var users []User
		err := db.Order("id desc").Find(&users).Error
		if err != nil {
			jsonErr(ctx, http.StatusInternalServerError, err.Error())
			return
		}
		ctx.JSON(http.StatusOK, gin.H{"code": 200, "data": users})
	})
	r.POST("/users", func(ctx *gin.Context) {
		var req CreateUserReq
		err := ctx.ShouldBindJSON(&req)
		if err != nil {
			jsonErr(ctx, http.StatusBadRequest, err.Error())
			return
		}
		u := User{Name: req.Name, Email: req.Email, Age: req.Age}
		err = db.Create(&u).Error
		if err != nil {
			jsonErr(ctx, http.StatusInternalServerError, err.Error())
			return
		}
		ctx.JSON(http.StatusCreated, gin.H{"code": 200, "data": u})
	})
	// ---- Update (partial): PATCH /users/:id ----
	r.PUT("/users/:id", func(ctx *gin.Context) {
		id, err := strconv.Atoi(ctx.Param("id"))
		if err != nil {
			jsonErr(ctx, http.StatusBadRequest, "invalid id")
			return
		}
		var req UpdateUserReq
		err = ctx.ShouldBindJSON(&req)
		if err != nil {
			jsonErr(ctx, http.StatusBadRequest, err.Error())
			return
		}
		var u User
		err = db.First(&u, id).Error
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				jsonErr(ctx, http.StatusNotFound, "user not found")
			}
			jsonErr(ctx, http.StatusInternalServerError, err.Error())
			return
		}
		err = db.Model(&u).Updates(map[string]any{
			"name":  req.Name,
			"email": req.Email,
			"age":   req.Age,
		}).Error
		if err != nil {
			jsonErr(ctx, http.StatusInternalServerError, err.Error())
			return
		}
		ctx.JSON(http.StatusOK, gin.H{"code": 200, "data": u})
	})
	// ---- Delete: DELETE /users/:id ----
	r.DELETE("/users/:id", func(ctx *gin.Context) {
		id, err := strconv.Atoi(ctx.Param("id"))
		if err != nil {
			jsonErr(ctx, http.StatusBadRequest, "invalid id")
			return
		}
		res := db.Delete(&User{}, id)
		if res.Error != nil {
			jsonErr(ctx, http.StatusInternalServerError, res.Error.Error())
			return
		}
		if res.RowsAffected == 0 {
			jsonErr(ctx, http.StatusNotFound, "user not found")
		}
		ctx.JSON(http.StatusOK, gin.H{"code": 200})
	})
	log.Println("listening on :8080 (SQLite file: users.db)")
	runErr := r.Run(":8080")
	if runErr != nil {
		log.Fatal(runErr)
	}
}
