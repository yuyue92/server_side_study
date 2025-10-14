package main

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type User struct {
	ID    int
	Name  string
	Email string
	Age   int
}

var userlist = []User{
	{ID: 0, Name: "zhangsan", Email: "zhangsan@163.com", Age: 33},
	{ID: 1, Name: "zhangsi", Email: "zhangsi@163.com", Age: 34},
	{ID: 2, Name: "admin1", Email: "admin1@163.com", Age: 42},
	{ID: 3, Name: "admin2", Email: "admin2@163.com", Age: 46},
}

// 查找 ID 为 N 的用户
func getUserByID(uid int, ulist []User) *User {
	for _, cuser := range ulist {
		if cuser.ID == uid {
			return &cuser
		}
	}
	return nil // 如果没有找到对应的用户
}

func main() {
	// 创建默认的Gin引擎（包含Logger和Recovery中间件）
	println("===== gin basic http ======")
	r := gin.Default()
	r.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "ok",
			"data":    "hello, yy3",
		})
	})
	// 获取用户列表
	r.GET("/users", func(ctx *gin.Context) {
		ctx.JSON(http.StatusOK, gin.H{
			"count": len(userlist),
			"data":  userlist,
		})
	})
	// 路径参数 - 单个参数
	r.GET("/users/:id", func(ctx *gin.Context) {
		idstr := ctx.Param("id")
		id, err := strconv.Atoi(idstr)
		if err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{
				"error": err.Error(),
			})
			return
		}
		cuser := getUserByID(id, userlist)
		if cuser == nil {
			ctx.JSON(http.StatusBadRequest, gin.H{
				"error": "user not exist!",
			})
			return
		}
		ctx.JSON(http.StatusOK, gin.H{
			"user_id": idstr,
			"data":    cuser,
		})
	})

	r.Run(":8080")
}
