# Golang Blog 前端（纯 HTML/CSS/JS，无依赖）

这个前端页面用于**完整覆盖并测试**你后端提供的全部接口（Gin + GORM + SQLite）。

## 1. 启动后端
确保你的后端已启动，例如默认：
- `http://localhost:8080`

并能访问：
- `GET /health`

## 2. 启动前端（推荐：本地静态服务器）
> 直接用 `file://` 打开可能会触发 CORS（浏览器把 file 视为 origin=null）。

在本目录执行：

```bash
# Python 3
python3 -m http.server 8000
```

然后浏览器打开：
- `http://localhost:8000`

页面右上角的 `API Base` 填你的后端地址（默认 http://localhost:8080），点击保存。

## 3. 如果遇到 CORS 报错怎么办？
如果你用 `http://localhost:8000` 打开前端，而后端是 `http://localhost:8080`，属于跨域请求。  
后端若未返回 `Access-Control-Allow-Origin`，浏览器会拦截。

### 方案 A：给后端加一个最简 CORS 中间件（推荐）
在后端 `middleware/` 新增 `cors.go`：

```go
package middleware

import "github.com/gin-gonic/gin"

func CORS() gin.HandlerFunc {
  return func(c *gin.Context) {
    c.Header("Access-Control-Allow-Origin", "*")
    c.Header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
    c.Header("Access-Control-Allow-Headers", "Authorization, Content-Type")
    if c.Request.Method == "OPTIONS" {
      c.AbortWithStatus(204)
      return
    }
    c.Next()
  }
}
```

然后在路由注册处（例如 `routes/routes.go`）加上：
```go
r.Use(middleware.CORS())
```

### 方案 B：让 Gin 同域提供前端静态文件
把本前端目录拷贝到后端项目中，然后：
```go
r.Static("/", "./frontend")
```
这样前端和后端同域就不会有跨域问题。

## 4. 覆盖的接口清单（与题目一致）
- `GET /health`

认证：
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/profile`（Bearer Token）

文章：
- `GET /api/v1/posts`
- `GET /api/v1/posts/:id`
- `POST /api/v1/posts`（Bearer Token）
- `PUT /api/v1/posts/:id`（Bearer Token，仅作者）
- `DELETE /api/v1/posts/:id`（Bearer Token，仅作者）

评论：
- `GET /api/v1/comments/post/:post_id`
- `POST /api/v1/posts/:post_id/comments`（Bearer Token）

## 5. 推荐的“完整验证流程”（接口验证）
1) 访问页面 → 点【健康检查】，应返回 `{"status":"ok"}`（或你后端定义的 ok 响应）
2) 注册用户 A 和 B
3) 用 A 登录，token 会自动保存（右上角显示“已登录”短 token）
4) A 创建文章 → 刷新文章列表，确认出现
5) 文章详情 GET 公开访问验证
6) A 更新文章成功
7) 用 B 登录后尝试更新/删除 A 的文章，应返回 **403**（仅作者）
8) A 创建评论 → 获取评论列表（公开）确认包含该评论
9) A 删除文章成功 → 再次访问详情应 **404** 或返回空（取决于后端实现）

## 6. 页面说明
- 左侧导航：健康检查 / 认证 / 文章 / 评论 / 控制台
- 右侧“请求日志”：最近 20 次请求（用于自检）
- 控制台：可自定义 Method/Path/Body，并选择是否带认证头
