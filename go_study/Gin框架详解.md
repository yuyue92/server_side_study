## Gin框架详解
**Gin基础概念**

Gin是一个用Go编写的高性能web框架，有以下特点：
- 快速：基于 httprouter，性能优秀；
- 中间件支持；
- 崩溃恢复
- json验证
- 路由分组

**Gin核心功能代码示例**
```
// gin_basics.go
package main

import (
    "github.com/gin-gonic/gin"
    "net/http"
    "time"
)

// ===== 1. 基础路由 =====
func basicRouting() {
    r := gin.Default()
    
    // GET请求
    r.GET("/hello", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{
            "message": "Hello World",
        })
    })
    
    // POST请求
    r.POST("/create", func(c *gin.Context) {
        c.JSON(http.StatusCreated, gin.H{
            "message": "Created",
        })
    })
    
    // PUT请求
    r.PUT("/update/:id", func(c *gin.Context) {
        id := c.Param("id")
        c.JSON(http.StatusOK, gin.H{
            "message": "Updated",
            "id":      id,
        })
    })
    
    // DELETE请求
    r.DELETE("/delete/:id", func(c *gin.Context) {
        id := c.Param("id")
        c.JSON(http.StatusOK, gin.H{
            "message": "Deleted",
            "id":      id,
        })
    })
    
    r.Run(":8080")
}

// ===== 2. 参数获取 =====
func parameterHandling() {
    r := gin.Default()
    
    // 路径参数
    r.GET("/users/:id/posts/:postId", func(c *gin.Context) {
        userID := c.Param("id")
        postID := c.Param("postId")
        
        c.JSON(http.StatusOK, gin.H{
            "user_id": userID,
            "post_id": postID,
        })
    })
    
    // 查询参数
    r.GET("/search", func(c *gin.Context) {
        // 单个查询参数
        keyword := c.Query("keyword")
        // 带默认值
        page := c.DefaultQuery("page", "1")
        // 检查是否存在
        sort, exists := c.GetQuery("sort")
        
        c.JSON(http.StatusOK, gin.H{
            "keyword": keyword,
            "page":    page,
            "sort":    sort,
            "exists":  exists,
        })
    })
    
    // 表单参数
    r.POST("/form", func(c *gin.Context) {
        username := c.PostForm("username")
        password := c.PostForm("password")
        
        c.JSON(http.StatusOK, gin.H{
            "username": username,
            "password": password,
        })
    })
    
    r.Run(":8080")
}

// ===== 3. 数据绑定与验证 =====
type LoginInput struct {
    Email    string `json:"email" binding:"required,email"`
    Password string `json:"password" binding:"required,min=6"`
}

type RegisterInput struct {
    Username string `json:"username" binding:"required,min=3,max=20"`
    Email    string `json:"email" binding:"required,email"`
    Password string `json:"password" binding:"required,min=6"`
    Age      int    `json:"age" binding:"required,gte=18,lte=120"`
}

func dataBinding() {
    r := gin.Default()
    
    // JSON绑定
    r.POST("/login", func(c *gin.Context) {
        var input LoginInput
        
        if err := c.ShouldBindJSON(&input); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{
                "error": err.Error(),
            })
            return
        }
        
        c.JSON(http.StatusOK, gin.H{
            "message": "Login successful",
            "email":   input.Email,
        })
    })
    
    // 完整的注册示例
    r.POST("/register", func(c *gin.Context) {
        var input RegisterInput
        
        if err := c.ShouldBindJSON(&input); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{
                "error": err.Error(),
            })
            return
        }
        
        c.JSON(http.StatusCreated, gin.H{
            "message":  "Registration successful",
            "username": input.Username,
        })
    })
    
    r.Run(":8080")
}

// ===== 4. 中间件 =====

// 日志中间件
func LoggerMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        start := time.Now()
        
        // 执行请求
        c.Next()
        
        // 请求后处理
        latency := time.Since(start)
        status := c.Writer.Status()
        
        println("[GIN]", c.Request.Method, c.Request.URL.Path, status, latency)
    }
}

// 认证中间件
func AuthMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        token := c.GetHeader("Authorization")
        
        if token == "" {
            c.JSON(http.StatusUnauthorized, gin.H{
                "error": "No authorization header",
            })
            c.Abort() // 中止请求
            return
        }
        
        // 验证token（这里简化处理）
        if token != "Bearer valid-token" {
            c.JSON(http.StatusUnauthorized, gin.H{
                "error": "Invalid token",
            })
            c.Abort()
            return
        }
        
        // 设置用户信息到context
        c.Set("user_id", 123)
        c.Set("username", "john")
        
        c.Next()
    }
}

// CORS中间件
func CORSMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
        c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
        c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Authorization, X-Requested-With")
        c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE, UPDATE")
        
        if c.Request.Method == "OPTIONS" {
            c.AbortWithStatus(204)
            return
        }
        
        c.Next()
    }
}

func middlewareExample() {
    r := gin.New() // 不使用默认中间件
    
    // 全局中间件
    r.Use(gin.Recovery())
    r.Use(LoggerMiddleware())
    r.Use(CORSMiddleware())
    
    // 公开路由
    r.GET("/public", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{
            "message": "Public endpoint",
        })
    })
    
    // 需要认证的路由
    authorized := r.Group("/")
    authorized.Use(AuthMiddleware())
    {
        authorized.GET("/profile", func(c *gin.Context) {
            userID, _ := c.Get("user_id")
            username, _ := c.Get("username")
            
            c.JSON(http.StatusOK, gin.H{
                "user_id":  userID,
                "username": username,
            })
        })
    }
    
    r.Run(":8080")
}

// ===== 5. 路由分组 =====
func routeGroups() {
    r := gin.Default()
    
    // API v1 路由组
    v1 := r.Group("/api/v1")
    {
        // 用户相关
        users := v1.Group("/users")
        {
            users.GET("", func(c *gin.Context) {
                c.JSON(http.StatusOK, gin.H{"data": "get all users"})
            })
            users.GET("/:id", func(c *gin.Context) {
                c.JSON(http.StatusOK, gin.H{"data": "get user by id"})
            })
            users.POST("", func(c *gin.Context) {
                c.JSON(http.StatusCreated, gin.H{"data": "create user"})
            })
            users.PUT("/:id", func(c *gin.Context) {
                c.JSON(http.StatusOK, gin.H{"data": "update user"})
            })
            users.DELETE("/:id", func(c *gin.Context) {
                c.JSON(http.StatusOK, gin.H{"data": "delete user"})
            })
        }
        
        // 产品相关
        products := v1.Group("/products")
        {
            products.GET("", func(c *gin.Context) {
                c.JSON(http.StatusOK, gin.H{"data": "get all products"})
            })
            products.POST("", func(c *gin.Context) {
                c.JSON(http.StatusCreated, gin.H{"data": "create product"})
            })
        }
    }
    
    // API v2 路由组
    v2 := r.Group("/api/v2")
    {
        v2.GET("/info", func(c *gin.Context) {
            c.JSON(http.StatusOK, gin.H{"version": "2.0"})
        })
    }
    
    r.Run(":8080")
}

// ===== 6. 文件上传 =====
func fileUpload() {
    r := gin.Default()
    
    // 单文件上传
    r.POST("/upload", func(c *gin.Context) {
        file, err := c.FormFile("file")
        if err != nil {
            c.JSON(http.StatusBadRequest, gin.H{
                "error": err.Error(),
            })
            return
        }
        
        // 保存文件
        dst := "./uploads/" + file.Filename
        if err := c.SaveUploadedFile(file, dst); err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{
                "error": err.Error(),
            })
            return
        }
        
        c.JSON(http.StatusOK, gin.H{
            "message":  "File uploaded successfully",
            "filename": file.Filename,
            "size":     file.Size,
        })
    })
    
    // 多文件上传
    r.POST("/upload-multiple", func(c *gin.Context) {
        form, _ := c.MultipartForm()
        files := form.File["files"]
        
        for _, file := range files {
            dst := "./uploads/" + file.Filename
            c.SaveUploadedFile(file, dst)
        }
        
        c.JSON(http.StatusOK, gin.H{
            "message": "Files uploaded successfully",
            "count":   len(files),
        })
    })
    
    r.Run(":8080")
}
```
