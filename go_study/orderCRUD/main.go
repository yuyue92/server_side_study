package main

import (
	"errors"
	"log"
	"net/http"
	"os/exec"
	"runtime"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	_ "modernc.org/sqlite"
)

type StringList []string
type StringMap map[string]string

type User struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	Name      string    `json:"name"`
	Age       int       `json:"age"`
	Email     string    `json:"email" gorm:"uniqueIndex"`
	CreatedAt time.Time `json:"createdAt" gorm:"autoCreateTime"`
	UserInfo  *UserInfo `json:"userInfo,omitempty" gorm:"constraint:OnUpdate:CASCADE,OnDelete:SET NULL;foreignKey:UID;references:ID"`
}

type UserInfo struct {
	ID     uint       `json:"id" gorm:"primaryKey"`
	UID    uint       `json:"uid" gorm:"uniqueIndex"`
	UList1 StringList `json:"ulist1" gorm:"serializer:json"`
	UMap1  StringMap  `json:"umap1" gorm:"serializer:json"`
}

type Order struct {
	ID        uint          `json:"id" gorm:"primaryKey"`
	Name      string        `json:"name"`
	Price     float64       `json:"price"`
	CreatedAt time.Time     `json:"createdAt" gorm:"autoCreateTime"`
	Details   []OrderDetail `json:"details" gorm:"foreignKey:OID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`
}

type OrderDetail struct {
	ID      uint       `json:"id" gorm:"primaryKey"`
	OID     uint       `json:"oid" index:"idx_oid"`
	Detail1 string     `json:"detail1"`
	OList1  StringList `json:"olist1" gorm:"serializer:json"`
}

var db *gorm.DB

func mustInitDB() *gorm.DB {
	// database, err := gorm.Open(sqlite.Open("app.db"), &gorm.Config{
	// 	Logger: logger.Default.LogMode(logger.Info),
	// })
	database, err := gorm.Open(sqlite.Dialector{
		DSN:        "app.db",
		DriverName: "sqlite", // 使用 modernc 的实现
	}, &gorm.Config{})

	if err != nil {
		log.Fatalf("open db: %v", err)
	}
	if err := database.AutoMigrate(&User{}, &UserInfo{}, &Order{}, &OrderDetail{}); err != nil {
		log.Fatalf("auto migrate: %v", err)
	}
	database = database.Session(&gorm.Session{FullSaveAssociations: true})
	return database
}

func notFound(c *gin.Context, what string) {
	c.JSON(http.StatusNotFound, gin.H{"error": what + " not found"})
}

func badReq(c *gin.Context, err error) {
	c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
}

func main() {
	db = mustInitDB()

	r := gin.New()
	r.Use(gin.Recovery())

	corsCfg := cors.Config{
		AllowAllOrigins: true,
		AllowMethods:    []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:    []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:   []string{"Content-Length"},
	}
	r.Use(cors.New(corsCfg))

	r.GET("/health", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"ok": true}) })

	// 静态文件路由
	r.Static("/static", "./static")

	// 提供调试页面 tester.html
	r.GET("/tester.html", func(c *gin.Context) {
		c.File("./static/tester.html")
	})

	// ===== Users group =====
	users := r.Group("/users")
	{
		users.POST("", func(c *gin.Context) {
			var u User
			if err := c.ShouldBindJSON(&u); err != nil {
				badReq(c, err)
				return
			}
			if err := db.Create(&u).Error; err != nil {
				badReq(c, err)
				return
			}
			c.JSON(http.StatusCreated, u)
		})

		users.GET("", func(c *gin.Context) {
			withInfo := c.Query("withInfo") == "1"
			var list []User
			q := db
			if withInfo {
				q = q.Preload("UserInfo")
			}
			if err := q.Find(&list).Error; err != nil {
				badReq(c, err)
				return
			}
			c.JSON(http.StatusOK, list)
		})

		users.GET(":id", func(c *gin.Context) {
			var u User
			id := c.Param("id")
			if err := db.Preload("UserInfo").First(&u, id).Error; err != nil {
				notFound(c, "user")
				return
			}
			c.JSON(http.StatusOK, u)
		})

		users.PUT(":id", func(c *gin.Context) {
			var body User
			if err := c.ShouldBindJSON(&body); err != nil {
				badReq(c, err)
				return
			}
			var u User
			id := c.Param("id")
			if err := db.Preload("UserInfo").First(&u, id).Error; err != nil {
				notFound(c, "user")
				return
			}
			u.Name = body.Name
			u.Age = body.Age
			u.Email = body.Email
			if body.UserInfo != nil {
				if u.UserInfo == nil {
					info := *body.UserInfo
					info.UID = u.ID
					u.UserInfo = &info
				} else {
					u.UserInfo.UList1 = body.UserInfo.UList1
					u.UserInfo.UMap1 = body.UserInfo.UMap1
				}
			} else {
				u.UserInfo = nil
			}
			if err := db.Save(&u).Error; err != nil {
				badReq(c, err)
				return
			}
			c.JSON(http.StatusOK, u)
		})

		users.DELETE(":id", func(c *gin.Context) {
			id := c.Param("id")
			if err := db.Delete(&User{}, id).Error; err != nil {
				badReq(c, err)
				return
			}
			c.Status(http.StatusNoContent)
		})
	}

	// ===== Orders group =====
	orders := r.Group("/orders")
	{
		orders.POST("", func(c *gin.Context) {
			var o Order
			if err := c.ShouldBindJSON(&o); err != nil {
				badReq(c, err)
				return
			}
			if err := db.Create(&o).Error; err != nil {
				badReq(c, err)
				return
			}
			c.JSON(http.StatusCreated, o)
		})

		orders.GET("", func(c *gin.Context) {
			withDetails := c.Query("withDetails") == "1"
			var list []Order
			q := db
			if withDetails {
				q = q.Preload("Details")
			}
			if err := q.Find(&list).Error; err != nil {
				badReq(c, err)
				return
			}
			c.JSON(http.StatusOK, list)
		})

		orders.GET(":id", func(c *gin.Context) {
			var o Order
			id := c.Param("id")
			if err := db.Preload("Details").First(&o, id).Error; err != nil {
				notFound(c, "order")
				return
			}
			c.JSON(http.StatusOK, o)
		})

		orders.PUT(":id", func(c *gin.Context) {
			var body Order
			if err := c.ShouldBindJSON(&body); err != nil {
				badReq(c, err)
				return
			}
			var o Order
			id := c.Param("id")
			if err := db.Preload("Details").First(&o, id).Error; err != nil {
				notFound(c, "order")
				return
			}
			o.Name = body.Name
			o.Price = body.Price
			if err := db.Where("o_id = ?", o.ID).Delete(&OrderDetail{}).Error; err != nil {
				badReq(c, err)
				return
			}
			for i := range body.Details {
				body.Details[i].OID = o.ID
			}
			o.Details = body.Details
			if err := db.Save(&o).Error; err != nil {
				badReq(c, err)
				return
			}
			c.JSON(http.StatusOK, o)
		})

		orders.DELETE(":id", func(c *gin.Context) {
			id := c.Param("id")
			if err := db.Delete(&Order{}, id).Error; err != nil {
				badReq(c, err)
				return
			}
			c.Status(http.StatusNoContent)
		})

		orders.POST(":id/details", func(c *gin.Context) {
			var payload []OrderDetail
			if err := c.ShouldBindJSON(&payload); err != nil {
				badReq(c, err)
				return
			}
			var o Order
			id := c.Param("id")
			if err := db.First(&o, id).Error; err != nil {
				notFound(c, "order")
				return
			}
			for i := range payload {
				payload[i].OID = o.ID
			}
			if err := db.Create(&payload).Error; err != nil {
				badReq(c, err)
				return
			}
			if err := db.Preload("Details").First(&o, o.ID).Error; err != nil {
				badReq(c, err)
				return
			}
			c.JSON(http.StatusOK, o)
		})
	}

	r.GET("/users/by-email/:email", func(c *gin.Context) {
		email := c.Param("email")
		var u User
		if err := db.Preload("UserInfo").Where("email = ?", email).First(&u).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				notFound(c, "user")
				return
			}
			badReq(c, err)
			return
		}
		c.JSON(http.StatusOK, u)
	})

	r.POST("/seed", func(c *gin.Context) {
		u := User{Name: "Alice", Age: 28, Email: "alice@example.com", UserInfo: &UserInfo{
			UList1: StringList{"tag1", "tag2"},
			UMap1:  StringMap{"k1": "v1", "k2": "v2"},
		}}
		if err := db.Create(&u).Error; err != nil {
			badReq(c, err)
			return
		}
		o := Order{Name: "OrderA", Price: 99.5, Details: []OrderDetail{
			{Detail1: "A-1", OList1: StringList{"x", "y"}},
			{Detail1: "A-2", OList1: StringList{"m", "n"}},
		}}
		if err := db.Create(&o).Error; err != nil {
			badReq(c, err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"user": u, "order": o})
	})

	log.Println("server listening on :8080")

	time.Sleep(500 * time.Millisecond) // 等待服务启动
	openBrowser("http://localhost:8080/tester.html")

	if err := r.Run(":8080"); err != nil {
		log.Fatal(err)
	}
}

func openBrowser(url string) {
	var cmd string
	var args []string

	switch runtime.GOOS {
	case "windows":
		cmd = "rundll32"
		args = []string{"url.dll,FileProtocolHandler", url}
	case "darwin":
		cmd = "open"
		args = []string{url}
	default: // Linux or others
		cmd = "xdg-open"
		args = []string{url}
	}

	exec.Command(cmd, args...).Start()
}
