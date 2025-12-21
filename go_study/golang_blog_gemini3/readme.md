自检清单：

启动项目： 运行 go run cmd/main.go。你会看到 Gin 的启动日志，并且当前目录下会生成 blog.db 文件。

测试健康检查： GET http://localhost:8080/health -> 返回 {"status": "ok"}。

用户注册： POST /api/v1/auth/register，Body: {"username":"tom", "email":"tom@test.com", "password":"password123"} -> 成功创建用户。

用户登录： POST /api/v1/auth/login，Body: {"email":"tom@test.com", "password":"password123"} -> 复制返回的 token。

发布文章 (需认证)： POST /api/v1/posts，Headers: Authorization: Bearer <token>, Body: {"title":"Go Gin GORM", "content":"Hello World"} -> 成功，返回文章信息及 user_id。

查看文章列表 (公开)： GET /api/v1/posts -> 返回包含作者信息的文章列表。

修改/删除文章：

尝试修改刚才发布的文章 -> 成功。

边界测试：注册另一个用户 "Jerry"，登录获取 Token，尝试修改 "Tom" 的文章 -> 此时应返回 403 Forbidden（逻辑在 post.go 的 UpdatePost 中实现）。

发布评论： POST /api/v1/posts/1/comments (假设文章ID为1)，Headers 带 Token，Body: {"content":"Great post!"} -> 成功。
