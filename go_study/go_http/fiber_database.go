package main

import (
	"errors"
	"fmt"
	"log"
	"strconv"
	"strings"
	"time"

	"github.com/glebarez/sqlite"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"gorm.io/gorm"
	// "modernc.org/sqlite"
)

type User struct {
	ID        uint
	Name      string
	Email     string
	Age       int
	CreatedAt time.Time
	UpdatedAt time.Time
}

func main() {
	fmt.Println("======go fiber database======")
	app := fiber.New()
	app.Get("/", func(c *fiber.Ctx) error {
		return c.SendString("hello, go fiber!")
	})
	// 2) 路由与参数（Path、Query、Body）
	app.Get("/hello/:name", func(c *fiber.Ctx) error {
		name := c.Params("name")
		lang := c.Query("lang", "zh-CN")
		fmt.Println("nnn: ", name)
		return c.JSON(fiber.Map{
			"msg":  "hi, my name is " + name,
			"lang": lang,
		})
	})
	// 1) 打开数据库 & 自动迁移
	db, err := gorm.Open(sqlite.Open("user.db"), &gorm.Config{})
	if err != nil {
		log.Fatal("open sqlite failed: ", err)
	}
	err = db.AutoMigrate(&User{})
	if err != nil {
		log.Fatal("auto_migrate failed: ", err)
	}
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
	// 2) Fiber 应用（带统一错误处理）
	app = fiber.New(fiber.Config{
		ErrorHandler: func(c *fiber.Ctx, e error) error {
			code := fiber.StatusInternalServerError
			var fe *fiber.Error
			if errors.As(e, &fe) {
				code = fe.Code
			}
			return c.Status(code).JSON(fiber.Map{
				"error": true,
				"msg":   e.Error(),
			})
		},
	})
	app.Use(logger.New())
	// app.Use(recover())
	// app.Use(recover.New())
	// 路由：/users
	app.Get("/users", func(c *fiber.Ctx) error {
		// 过滤：name/email 模糊；演示用
		name := strings.TrimSpace(c.Query("name"))
		email := strings.TrimSpace(c.Query("email"))
		// 分页
		page, _ := strconv.Atoi(c.Query("page", "1"))
		if page < 1 {
			page = 1
		}
		size, _ := strconv.Atoi(c.Query("pagesize", "10"))
		if size < 1 || size > 100 {
			size = 10
		}

		var list []User
		q := db.Model(&User{})
		if name != "" {
			q = q.Where("name LIKE ?", "%"+name+"%")
		}
		if email != "" {
			q = q.Where("email LIKE ?", "%"+email+"%")
		}

		var total int64
		q.Count(&total)

		if err := q.Order("id desc").Limit(size).Offset((page - 1) * size).Find(&list).Error; err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, err.Error())
		}

		return c.JSON(fiber.Map{
			"list":      list,
			"page":      page,
			"pagesize":  size,
			"total":     total,
			"totalPage": (total + int64(size) - 1) / int64(size),
		})
	})

	log.Fatal(app.Listen(":8080"))
}
