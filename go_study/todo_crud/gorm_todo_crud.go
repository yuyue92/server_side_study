package main

import (
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

// 任务优先级：1=最低, 5=最高
type Todo struct {
	ID        uint
	Title     string
	Done      bool
	Priority  int
	Duedate   *time.Time
	Notes     string
	CreatedAt time.Time
	UpdatedAt time.Time
}
type CreateTodoReq struct {
	Title    string
	Done     *bool
	Priority *int
	Duedate  *string
	Notes    string
}
type UpdateTodoReq struct {
	Title    *string
	Done     *bool
	Priority *int
	Duedate  *string
	Notes    *string
}

// ===== 辅助函数 =====
func jsonErr(c *gin.Context, code int, msg string) {
	c.AbortWithStatusJSON(code, gin.H{"error": msg})
}
func mustRFC3339(s string) *time.Time {
	t, err := time.Parse(time.RFC3339, s)
	if err != nil {
		panic(err)
	}
	return &t
}
func parseRFC3339Ptr(s *string) (*time.Time, error) {
	// s 为 nil 表示“不更新”；s 指向 "" 表示“显式设为 null”
	if s == nil {
		return nil, nil
	}
	if strings.TrimSpace(*s) == "" {
		return (*time.Time)(nil), nil // 清空
	}
	t, err := time.Parse(time.RFC3339, *s)
	if err != nil {
		return nil, err
	}
	return &t, nil
}
func parseBoolStr(s string) (bool, bool) {
	switch strings.ToLower(s) {
	case "true", "1", "t", "yes", "y":
		return true, true
	case "false", "0", "f", "no", "n":
		return false, false
	default:
		return false, false
	}
}

// ===== 入口 =====
func main() {
	fmt.Println("=== todo api===")
	// DB 初始化与迁移
	db, err := gorm.Open(sqlite.Open("todos.db"), &gorm.Config{})
	if err != nil {
		log.Fatal(err)
	}
	err = db.AutoMigrate(&Todo{})
	if err != nil {
		log.Fatal(err)
	}
	var count int64
	db.Model(&Todo{}).Count(&count)
	if count > 0 {
		fmt.Println("=====gorm batabase, already has todos_data, count: ===", count)
	} else {
		// 插入测试数据
		todolist := []Todo{
			{Title: "eat", Done: false, Priority: 2, Duedate: mustRFC3339("2025-10-02T12:00:00Z")},
			{Title: "sleep", Done: false, Priority: 1, Duedate: mustRFC3339("2025-10-02T12:10:00Z")},
			{Title: "workout", Done: false, Priority: 3, Duedate: mustRFC3339("2025-10-02T12:04:00Z")},
		}
		res := db.Create(&todolist)
		if res.Error != nil {
			fmt.Println("❌ Failed to seed data:", res.Error)
			return
		}
		fmt.Printf("✅ Seeded %d todolist successfully\n", res.RowsAffected)
	}
	r := gin.New()
	r.Use(gin.Recovery(), gin.Logger())
	// CORS（开发期先全放开；生产改白名单）
	r.Use(cors.New(cors.Config{
		AllowOrigins: []string{"*"},
		AllowMethods: []string{"GET", "POST", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders: []string{"Content-Type", "Authorization"},
		ExposeHeaders: []string{
			"Content-Length",
		},
		MaxAge: 12 * time.Hour,
	}))
	// 健康检查
	r.GET("/", func(ctx *gin.Context) {
		ctx.JSON(200, gin.H{"code": 200, "ok": true})
	})
	// ===== 路由：TODO API =====
	// 列表：支持 title/notes(搜索)、done(布尔)、排序 sort、分页 page/pageSize
	r.GET("/todos", func(c *gin.Context) {
		var (
			title       = c.Query("title")
			notes       = c.Query("notes")
			page, _     = strconv.Atoi(c.DefaultQuery("page", "1"))
			pageSize, _ = strconv.Atoi(c.DefaultQuery("pageSize", "10"))
			sort        = c.DefaultQuery("sort", "-id") // id,-id,createdAt,-createdAt,priority,-priority
			doneParam   = c.Query("done")
			doneFilter  *bool
			items       []Todo
			total       int64
			err         error
			offset      int
			order       string
		)
		if page <= 0 {
			page = 1
		}
		if pageSize <= 0 || pageSize > 100 {
			pageSize = 10
		}
		offset = (page - 1) * pageSize
		if doneParam != "" {
			v, ok := parseBoolStr(doneParam)
			if ok {
				doneFilter = &v
			} else {
				jsonErr(c, 400, "done must be true/false")
				return
			}
		}
		// 排序白名单
		order = "id desc"
		switch sort {
		case "id":
			order = "id asc"
		case "-id":
			order = "id desc"
		case "createdAt":
			order = "created_at asc"
		case "-createdAt":
			order = "created_at desc"
		case "priority":
			order = "priority asc"
		case "-priority":
			order = "priority desc"
		}

		tx := db.Model(&Todo{})

		if title != "" {
			tx = tx.Where("title LIKE ?", "%"+title+"%")
		}
		if notes != "" {
			tx = tx.Where("notes LIKE ?", "%"+notes+"%")
		}

		if doneFilter != nil {
			tx = tx.Where("done = ?", *doneFilter)
		}
		err = tx.Count(&total).Error
		if err != nil {
			jsonErr(c, 500, err.Error())
			return
		}
		err = tx.Order(order).Offset(offset).Limit(pageSize).Find(&items).Error
		if err != nil {
			jsonErr(c, 500, err.Error())
			return
		}
		c.JSON(200, gin.H{
			"data":     items,
			"total":    total,
			"page":     page,
			"pageSize": pageSize,
		})
	})
	// 详情
	r.GET("/todos/:id", func(ctx *gin.Context) {
		id, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
		if err != nil {
			jsonErr(ctx, 400, "invalid id")
			return
		}
		var td Todo
		err = db.First(&td, uint(id)).Error
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				jsonErr(ctx, 404, "not found")
			}
			jsonErr(ctx, 500, err.Error())
			return
		}
		ctx.JSON(200, gin.H{"code": 200, "data": td})
	})
	// // 更新（部分字段）
	r.PATCH("/todos/:id", func(ctx *gin.Context) {
		id, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
		if err != nil {
			jsonErr(ctx, 400, "invalid id")
			return
		}
		var td Todo
		err = db.First(&td, uint(id)).Error
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				jsonErr(ctx, 404, "not found")
			}
			jsonErr(ctx, 500, err.Error())
			return
		}
		var req UpdateTodoReq
		err = ctx.ShouldBindJSON(&req)
		if err != nil {
			jsonErr(ctx, 400, err.Error())
			return
		}
		err = db.Model(&td).Updates(map[string]any{
			"title":    req.Title,
			"done":     req.Done,
			"priority": req.Priority,
			"duedate":  req.Duedate,
			"notes":    req.Notes,
		}).Error
		if err != nil {
			jsonErr(ctx, http.StatusInternalServerError, err.Error())
			return
		}
		ctx.JSON(200, gin.H{"code": 200, "data": td})
	})
	// 创建
	r.POST("/todos", func(ctx *gin.Context) {
		var req CreateTodoReq
		err := ctx.ShouldBindJSON(&req)
		if err != nil {
			jsonErr(ctx, 400, err.Error())
			return
		}
		// 解析 DueDate（可传 null 或 "" 来不设置）
		due, err := parseRFC3339Ptr(req.Duedate)
		if err != nil {
			jsonErr(ctx, 400, "invalid dueDate, expect RFC3339")
			return
		}
		td := Todo{Title: req.Title, Notes: req.Notes, Duedate: due}
		if req.Done != nil {
			td.Done = *req.Done
		}
		if req.Priority != nil {
			td.Priority = *req.Priority
		}
		err = db.Create(&td).Error
		if err != nil {
			jsonErr(ctx, 500, err.Error())
			return
		}
		ctx.JSON(201, gin.H{"code": 200, "data": td})
	})
	//deleteOne
	r.DELETE("/todos/:id", func(ctx *gin.Context) {
		id, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
		if err != nil {
			jsonErr(ctx, 400, "invalid id")
			return
		}
		res := db.Delete(&Todo{}, uint(id))
		if res.Error != nil {
			jsonErr(ctx, 500, res.Error.Error())
			return
		}
		if res.RowsAffected == 0 {
			jsonErr(ctx, 404, "not found")
			return
		}
		ctx.JSON(200, gin.H{"code": 200, "msg": "delete success"})
	})

	runErr := r.Run(":8080")
	if runErr != nil {
		log.Fatal(runErr)
	}
}
