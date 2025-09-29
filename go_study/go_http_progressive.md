# Go HTTP服务从入门到实战 - 循序渐进完整教程

## 📋 学习路线图

```
第1步: 最基础的HTTP服务
第2步: 返回JSON数据
第3步: 处理不同HTTP方法
第4步: 路由参数和查询参数
第5步: 请求体解析
第6步: 中间件实现
第7步: 完整的RESTful API
第8步: SQLite数据库集成
第9步: 完整的CRUD应用
```

---

## 第1步: 最基础的HTTP服务

### 📖 概念说明
这是最简单的HTTP服务器，只返回纯文本。理解HTTP服务的基本结构。

### 💻 代码实现

```go
// step1_basic_http.go
package main

import (
    "fmt"
    "log"
    "net/http"
)

// 处理器函数 - 处理HTTP请求
func helloHandler(w http.ResponseWriter, r *http.Request) {
    // w: ResponseWriter - 用于写入响应
    // r: Request - 包含请求信息
    
    fmt.Fprintf(w, "Hello, World! 这是你的第一个Go HTTP服务")
}

func main() {
    // 注册路由和处理器
    // "/" 表示根路径
    http.HandleFunc("/", helloHandler)
    
    fmt.Println("服务器启动在: http://localhost:8080")
    
    // 启动服务器，监听8080端口
    // 如果启动失败，log.Fatal会打印错误并退出程序
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

### 🎯 运行和测试

```bash
# 运行程序
go run step1_basic_http.go

# 在浏览器访问: http://localhost:8080
# 或使用curl测试:
curl http://localhost:8080
```

### 📝 知识点
- `http.HandleFunc()`: 注册路由和处理函数
- `http.ResponseWriter`: 用于写入HTTP响应
- `http.Request`: 包含请求的所有信息
- `http.ListenAndServe()`: 启动HTTP服务器

---

## 第2步: 返回JSON数据

### 📖 概念说明
实际应用中，API通常返回JSON格式数据。学习如何序列化Go结构体为JSON。

### 💻 代码实现

```go
// step2_json_response.go
package main

import (
    "encoding/json"
    "fmt"
    "log"
    "net/http"
    "time"
)

// 定义响应的数据结构
type Response struct {
    Message   string    `json:"message"`   // json标签指定JSON字段名
    Status    int       `json:"status"`
    Timestamp time.Time `json:"timestamp"`
}

type User struct {
    ID       int    `json:"id"`
    Name     string `json:"name"`
    Email    string `json:"email"`
    Age      int    `json:"age"`
}

// 返回简单JSON
func jsonHandler(w http.ResponseWriter, r *http.Request) {
    // 设置响应头，告诉客户端返回的是JSON
    w.Header().Set("Content-Type", "application/json")
    
    // 创建响应数据
    response := Response{
        Message:   "这是一个JSON响应",
        Status:    200,
        Timestamp: time.Now(),
    }
    
    // 将结构体编码为JSON并写入响应
    json.NewEncoder(w).Encode(response)
}

// 返回用户信息
func userHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    
    // 模拟用户数据
    user := User{
        ID:    1,
        Name:  "张三",
        Email: "zhangsan@example.com",
        Age:   25,
    }
    
    json.NewEncoder(w).Encode(user)
}

// 返回用户列表
func usersHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    
    // 模拟用户列表
    users := []User{
        {ID: 1, Name: "张三", Email: "zhangsan@example.com", Age: 25},
        {ID: 2, Name: "李四", Email: "lisi@example.com", Age: 30},
        {ID: 3, Name: "王五", Email: "wangwu@example.com", Age: 28},
    }
    
    // 方式1: 使用Encoder
    json.NewEncoder(w).Encode(users)
    
    // 方式2: 使用Marshal (备选)
    // data, _ := json.Marshal(users)
    // w.Write(data)
}

// 返回格式化的JSON (带缩进，便于阅读)
func prettyJsonHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    
    user := User{
        ID:    1,
        Name:  "张三",
        Email: "zhangsan@example.com",
        Age:   25,
    }
    
    // MarshalIndent 生成格式化的JSON
    data, err := json.MarshalIndent(user, "", "  ")
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    
    w.Write(data)
}

func main() {
    http.HandleFunc("/json", jsonHandler)
    http.HandleFunc("/user", userHandler)
    http.HandleFunc("/users", usersHandler)
    http.HandleFunc("/pretty", prettyJsonHandler)
    
    fmt.Println("服务器启动在: http://localhost:8080")
    fmt.Println("访问路径:")
    fmt.Println("  http://localhost:8080/json   - 简单JSON响应")
    fmt.Println("  http://localhost:8080/user   - 单个用户")
    fmt.Println("  http://localhost:8080/users  - 用户列表")
    fmt.Println("  http://localhost:8080/pretty - 格式化JSON")
    
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

### 🎯 测试命令

```bash
# 测试JSON响应
curl http://localhost:8080/json

# 测试用户列表
curl http://localhost:8080/users

# 格式化显示JSON
curl http://localhost:8080/pretty | jq
```

### 📝 知识点
- `json.NewEncoder().Encode()`: 将数据编码为JSON并写入
- `json.Marshal()`: 将数据序列化为JSON字节数组
- `json.MarshalIndent()`: 生成格式化的JSON
- 结构体标签 `json:"field_name"`: 指定JSON字段名

---

## 第3步: 处理不同HTTP方法

### 📖 概念说明
HTTP有多种方法(GET, POST, PUT, DELETE等)，学习如何根据方法执行不同逻辑。

### 💻 代码实现

```go
// step3_http_methods.go
package main

import (
    "encoding/json"
    "fmt"
    "log"
    "net/http"
)

type Response struct {
    Method  string `json:"method"`
    Message string `json:"message"`
}

// 统一的处理器，根据HTTP方法分发
func methodHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    
    var response Response
    
    // 根据HTTP方法执行不同的逻辑
    switch r.Method {
    case http.MethodGet:
        response = Response{
            Method:  "GET",
            Message: "这是GET请求，用于获取数据",
        }
        
    case http.MethodPost:
        response = Response{
            Method:  "POST",
            Message: "这是POST请求，用于创建数据",
        }
        
    case http.MethodPut:
        response = Response{
            Method:  "PUT",
            Message: "这是PUT请求，用于更新数据",
        }
        
    case http.MethodDelete:
        response = Response{
            Method:  "DELETE",
            Message: "这是DELETE请求，用于删除数据",
        }
        
    case http.MethodPatch:
        response = Response{
            Method:  "PATCH",
            Message: "这是PATCH请求，用于部分更新数据",
        }
        
    default:
        // 不支持的方法
        w.WriteHeader(http.StatusMethodNotAllowed)
        response = Response{
            Method:  r.Method,
            Message: "不支持的HTTP方法",
        }
    }
    
    json.NewEncoder(w).Encode(response)
}

// 只接受GET请求的处理器
func getOnlyHandler(w http.ResponseWriter, r *http.Request) {
    // 检查HTTP方法
    if r.Method != http.MethodGet {
        http.Error(w, "只支持GET方法", http.StatusMethodNotAllowed)
        return
    }
    
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]string{
        "message": "这个端点只接受GET请求",
    })
}

// 只接受POST请求的处理器
func postOnlyHandler(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost {
        http.Error(w, "只支持POST方法", http.StatusMethodNotAllowed)
        return
    }
    
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]string{
        "message": "这个端点只接受POST请求",
    })
}

func main() {
    http.HandleFunc("/api/resource", methodHandler)
    http.HandleFunc("/api/get-only", getOnlyHandler)
    http.HandleFunc("/api/post-only", postOnlyHandler)
    
    fmt.Println("服务器启动在: http://localhost:8080")
    fmt.Println("\n测试命令:")
    fmt.Println("curl -X GET http://localhost:8080/api/resource")
    fmt.Println("curl -X POST http://localhost:8080/api/resource")
    fmt.Println("curl -X PUT http://localhost:8080/api/resource")
    fmt.Println("curl -X DELETE http://localhost:8080/api/resource")
    
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

### 🎯 测试命令

```bash
# 测试不同的HTTP方法
curl -X GET http://localhost:8080/api/resource
curl -X POST http://localhost:8080/api/resource
curl -X PUT http://localhost:8080/api/resource
curl -X DELETE http://localhost:8080/api/resource

# 测试方法限制
curl -X GET http://localhost:8080/api/get-only
curl -X POST http://localhost:8080/api/get-only  # 会返回错误
```

### 📝 知识点
- `r.Method`: 获取HTTP请求方法
- `http.MethodGet`, `http.MethodPost` 等常量
- `http.Error()`: 返回错误响应
- `w.WriteHeader()`: 设置HTTP状态码

---

## 第4步: 路由参数和查询参数

### 📖 概念说明
学习如何从URL中提取参数，包括路径参数和查询参数。

### 💻 代码实现

```go
// step4_url_parameters.go
package main

import (
    "encoding/json"
    "fmt"
    "log"
    "net/http"
    "strconv"
    "strings"
)

type User struct {
    ID   int    `json:"id"`
    Name string `json:"name"`
}

// 模拟用户数据库
var users = map[int]User{
    1: {ID: 1, Name: "张三"},
    2: {ID: 2, Name: "李四"},
    3: {ID: 3, Name: "王五"},
}

// 处理路径参数: /user/123
func userByIDHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    
    // 从URL中提取ID
    // 例如: /user/123 -> 提取 "123"
    path := r.URL.Path
    parts := strings.Split(path, "/")
    
    // parts = ["", "user", "123"]
    if len(parts) != 3 {
        http.Error(w, "无效的URL格式", http.StatusBadRequest)
        return
    }
    
    // 将字符串ID转换为整数
    idStr := parts[2]
    id, err := strconv.Atoi(idStr)
    if err != nil {
        http.Error(w, "无效的用户ID", http.StatusBadRequest)
        return
    }
    
    // 查找用户
    user, exists := users[id]
    if !exists {
        http.Error(w, "用户不存在", http.StatusNotFound)
        return
    }
    
    json.NewEncoder(w).Encode(user)
}

// 处理查询参数: /search?name=张三&age=25
func searchHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    
    // 获取查询参数
    query := r.URL.Query()
    
    // 单个参数
    name := query.Get("name")
    ageStr := query.Get("age")
    
    // 参数可能不存在，需要检查
    response := map[string]interface{}{
        "name": name,
    }
    
    if ageStr != "" {
        age, err := strconv.Atoi(ageStr)
        if err == nil {
            response["age"] = age
        }
    }
    
    // 多个相同名称的参数: /tags?tag=go&tag=web
    tags := query["tag"] // 返回字符串切片
    if len(tags) > 0 {
        response["tags"] = tags
    }
    
    json.NewEncoder(w).Encode(response)
}

// 处理分页参数
func listUsersHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    
    query := r.URL.Query()
    
    // 获取分页参数，提供默认值
    pageStr := query.Get("page")
    limitStr := query.Get("limit")
    
    page := 1
    limit := 10
    
    if pageStr != "" {
        if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
            page = p
        }
    }
    
    if limitStr != "" {
        if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
            limit = l
        }
    }
    
    // 准备用户列表
    var userList []User
    for _, user := range users {
        userList = append(userList, user)
    }
    
    response := map[string]interface{}{
        "page":  page,
        "limit": limit,
        "total": len(userList),
        "data":  userList,
    }
    
    json.NewEncoder(w).Encode(response)
}

// 组合使用：路径参数 + 查询参数
func userDetailHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    
    // 提取路径中的ID
    path := r.URL.Path // /user/123/detail
    parts := strings.Split(path, "/")
    
    if len(parts) < 3 {
        http.Error(w, "无效的URL", http.StatusBadRequest)
        return
    }
    
    id, err := strconv.Atoi(parts[2])
    if err != nil {
        http.Error(w, "无效的用户ID", http.StatusBadRequest)
        return
    }
    
    user, exists := users[id]
    if !exists {
        http.Error(w, "用户不存在", http.StatusNotFound)
        return
    }
    
    // 获取查询参数决定返回什么详细信息
    query := r.URL.Query()
    includeExtra := query.Get("extra") == "true"
    
    response := map[string]interface{}{
        "id":   user.ID,
        "name": user.Name,
    }
    
    if includeExtra {
        response["created_at"] = "2024-01-01"
        response["updated_at"] = "2024-01-15"
    }
    
    json.NewEncoder(w).Encode(response)
}

func main() {
    http.HandleFunc("/user/", userByIDHandler)
    http.HandleFunc("/search", searchHandler)
    http.HandleFunc("/users", listUsersHandler)
    http.HandleFunc("/user/", userDetailHandler)
    
    fmt.Println("服务器启动在: http://localhost:8080")
    fmt.Println("\n测试命令:")
    fmt.Println("# 路径参数:")
    fmt.Println("curl http://localhost:8080/user/1")
    fmt.Println("curl http://localhost:8080/user/2")
    fmt.Println("\n# 查询参数:")
    fmt.Println("curl 'http://localhost:8080/search?name=张三&age=25'")
    fmt.Println("curl 'http://localhost:8080/search?tag=go&tag=web'")
    fmt.Println("\n# 分页参数:")
    fmt.Println("curl 'http://localhost:8080/users?page=1&limit=10'")
    fmt.Println("\n# 组合使用:")
    fmt.Println("curl 'http://localhost:8080/user/1/detail?extra=true'")
    
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

### 🎯 测试命令

```bash
# 路径参数
curl http://localhost:8080/user/1
curl http://localhost:8080/user/999  # 不存在的用户

# 查询参数
curl 'http://localhost:8080/search?name=张三&age=25'
curl 'http://localhost:8080/search?tag=go&tag=web&tag=api'

# 分页
curl 'http://localhost:8080/users?page=1&limit=5'

# 组合参数
curl 'http://localhost:8080/user/1/detail?extra=true'
```

### 📝 知识点
- `r.URL.Path`: 获取请求路径
- `r.URL.Query()`: 获取查询参数
- `query.Get("key")`: 获取单个参数值
- `query["key"]`: 获取参数值数组（多个相同key）
- `strings.Split()`: 分割字符串提取路径参数
- `strconv.Atoi()`: 字符串转整数

---

## 第5步: 请求体解析

### 📖 概念说明
学习如何解析POST/PUT请求的JSON请求体，这是构建API的核心技能。

### 💻 代码实现

```go
// step5_request_body.go
package main

import (
    "encoding/json"
    "fmt"
    "io/ioutil"
    "log"
    "net/http"
)

// 用户创建请求
type CreateUserRequest struct {
    Name  string `json:"name"`
    Email string `json:"email"`
    Age   int    `json:"age"`
}

// 用户更新请求
type UpdateUserRequest struct {
    Name  *string `json:"name,omitempty"`  // 指针类型，可以为nil
    Email *string `json:"email,omitempty"`
    Age   *int    `json:"age,omitempty"`
}

// 响应结构
type APIResponse struct {
    Success bool        `json:"success"`
    Message string      `json:"message"`
    Data    interface{} `json:"data,omitempty"`
}

// 方式1: 使用json.Decoder解析请求体
func createUserV1(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    
    // 检查Content-Type
    if r.Header.Get("Content-Type") != "application/json" {
        json.NewEncoder(w).Encode(APIResponse{
            Success: false,
            Message: "Content-Type必须是application/json",
        })
        w.WriteHeader(http.StatusBadRequest)
        return
    }
    
    var req CreateUserRequest
    
    // 使用Decoder解析JSON
    err := json.NewDecoder(r.Body).Decode(&req)
    if err != nil {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(APIResponse{
            Success: false,
            Message: "无效的JSON格式: " + err.Error(),
        })
        return
    }
    
    // 简单验证
    if req.Name == "" {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(APIResponse{
            Success: false,
            Message: "name字段不能为空",
        })
        return
    }
    
    if req.Email == "" {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(APIResponse{
            Success: false,
            Message: "email字段不能为空",
        })
        return
    }
    
    // 模拟创建用户
    user := map[string]interface{}{
        "id":    1,
        "name":  req.Name,
        "email": req.Email,
        "age":   req.Age,
    }
    
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(APIResponse{
        Success: true,
        Message: "用户创建成功",
        Data:    user,
    })
}

// 方式2: 使用json.Unmarshal解析请求体
func createUserV2(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    
    // 读取整个请求体
    body, err := ioutil.ReadAll(r.Body)
    if err != nil {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(APIResponse{
            Success: false,
            Message: "读取请求体失败",
        })
        return
    }
    defer r.Body.Close()
    
    var req CreateUserRequest
    
    // 解析JSON
    err = json.Unmarshal(body, &req)
    if err != nil {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(APIResponse{
            Success: false,
            Message: "无效的JSON格式",
        })
        return
    }
    
    // 返回成功响应
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(APIResponse{
        Success: true,
        Message: "用户创建成功（方式2）",
        Data:    req,
    })
}

// 处理部分更新（PATCH）
func updateUserHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    
    var req UpdateUserRequest
    
    err := json.NewDecoder(r.Body).Decode(&req)
    if err != nil {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(APIResponse{
            Success: false,
            Message: "无效的JSON格式",
        })
        return
    }
    
    // 构建更新信息
    updates := make(map[string]interface{})
    
    if req.Name != nil {
        updates["name"] = *req.Name
    }
    if req.Email != nil {
        updates["email"] = *req.Email
    }
    if req.Age != nil {
        updates["age"] = *req.Age
    }
    
    if len(updates) == 0 {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(APIResponse{
            Success: false,
            Message: "没有提供任何更新字段",
        })
        return
    }
    
    json.NewEncoder(w).Encode(APIResponse{
        Success: true,
        Message: "用户更新成功",
        Data:    updates,
    })
}

// 处理嵌套JSON
type Address struct {
    Street  string `json:"street"`
    City    string `json:"city"`
    ZipCode string `json:"zip_code"`
}

type UserWithAddress struct {
    Name    string  `json:"name"`
    Email   string  `json:"email"`
    Address Address `json:"address"`
}

func createUserWithAddressHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    
    var req UserWithAddress
    
    err := json.NewDecoder(r.Body).Decode(&req)
    if err != nil {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(APIResponse{
            Success: false,
            Message: "无效的JSON格式",
        })
        return
    }
    
    // 验证嵌套字段
    if req.Address.City == "" {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(APIResponse{
            Success: false,
            Message: "城市不能为空",
        })
        return
    }
    
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(APIResponse{
        Success: true,
        Message: "用户和地址创建成功",
        Data:    req,
    })
}

// 处理数组数据
type BatchCreateRequest struct {
    Users []CreateUserRequest `json:"users"`
}

func batchCreateHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    
    var req BatchCreateRequest
    
    err := json.NewDecoder(r.Body).Decode(&req)
    if err != nil {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(APIResponse{
            Success: false,
            Message: "无效的JSON格式",
        })
        return
    }
    
    if len(req.Users) == 0 {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(APIResponse{
            Success: false,
            Message: "用户列表不能为空",
        })
        return
    }
    
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(APIResponse{
        Success: true,
        Message: fmt.Sprintf("成功创建%d个用户", len(req.Users)),
        Data:    req.Users,
    })
}

func main() {
    http.HandleFunc("/api/v1/user", createUserV1)
    http.HandleFunc("/api/v2/user", createUserV2)
    http.HandleFunc("/api/user/update", updateUserHandler)
    http.HandleFunc("/api/user/address", createUserWithAddressHandler)
    http.HandleFunc("/api/users/batch", batchCreateHandler)
    
    fmt.Println("服务器启动在: http://localhost:8080")
    fmt.Println("\n测试命令:")
    fmt.Println("\n# 创建用户（方式1）:")
    fmt.Println(`curl -X POST http://localhost:8080/api/v1/user \
  -H "Content-Type: application/json" \
  -d '{"name":"张三","email":"zhangsan@example.com","age":25}'`)
    
    fmt.Println("\n# 部分更新:")
    fmt.Println(`curl -X PATCH http://localhost:8080/api/user/update \
  -H "Content-Type: application/json" \
  -d '{"name":"李四"}'`)
    
    fmt.Println("\n# 嵌套JSON:")
    fmt.Println(`curl -X POST http://localhost:8080/api/user/address \
  -H "Content-Type: application/json" \
  -d '{"name":"王五","email":"wangwu@example.com","address":{"street":"中山路1号","city":"北京","zip_code":"100000"}}'`)
    
    fmt.Println("\n# 批量创建:")
    fmt.Println(`curl -X POST http://localhost:8080/api/users/batch \
  -H "Content-Type: application/json" \
  -d '{"users":[{"name":"用户1","email":"user1@example.com","age":20},{"name":"用户2","email":"user2@example.com","age":22}]}'`)
    
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

### 🎯 测试命令

```bash
# 创建用户
curl -X POST http://localhost:8080/api/v1/user \
  -H "Content-Type: application/json" \
  -d '{"name":"张三","email":"zhangsan@example.com","age":25}'

# 测试验证
curl -X POST http://localhost:8080/api/v1/user \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'  # 缺少name

# 部分更新
curl -X PATCH http://localhost:8080/api/user/update \
  -H "Content-Type: application/json" \
  -d '{"name":"新名字"}'

# 嵌套JSON
curl -X POST http://localhost:8080/api/user/address \
  -H "Content-Type: application/json" \
  -d '{"name":"王五","email":"wangwu@example.com","address":{"street":"中山路1号","city":"北京","zip_code":"100000"}}'

# 批量创建
curl -X POST http://localhost:8080/api/users/batch \
  -H "Content-Type: application/json" \
  -d '{"users":[{"name":"用户1","email":"user1@example.com","age":20},{"name":"用户2","email":"user2@example.com","age":22}]}'
```

### 📝 知识点
- `json.NewDecoder(r.Body).Decode()`: 流式解析JSON（推荐）
- `json.Unmarshal()`: 一次性解析JSON
- `ioutil.ReadAll(r.Body)`: 读取请求体
- 指针字段: 区分"未提供"和"零值"
- `defer r.Body.Close()`: 确保关闭请求体
- Content-Type检查: 确保客户端发送正确格式

---

## 第6步: 中间件实现

### 📖 概念说明
中间件是在请求处理前后执行的函数，用于日志、认证、CORS等功能。

### 💻 代码实现

```go
// step6_middleware.go
package main

import (
    "encoding/json"
    "fmt"
    "log"
    "net/http"
    "time"
)

// 日志中间件
func loggingMiddleware(next http.HandlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        
        // 打印请求信息
        log.Printf("开始处理: %s %s", r.Method, r.URL.Path)
        
        // 调用下一个处理器
        next(w, r)
        
        // 打印耗时
        duration := time.Since(start)
        log.Printf("完成处理: %s %s (耗时: %v)", r.Method, r.URL.Path, duration)
    }
}

// 认证中间件
func authMiddleware(next http.HandlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        // 获取Authorization头
        token := r.Header.Get("Authorization")
        
        // 简单的token验证（实际应用中应该验证JWT等）
        if token != "Bearer secret-token" {
            w.Header().Set("Content-Type", "application/json")
            w.WriteHeader(http.StatusUnauthorized)
            json.NewEncoder(w).Encode(map[string]string{
                "error": "未授权：无效或缺失的token",
            })
            return
        }
        
        // token有效，继续处理
        next(w, r)
    }
}

// CORS中间件
func corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        // 设置CORS头
        w.Header().Set("Access-Control-Allow-Origin", "*")
        w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
        
        // 处理预检请求
        if r.Method == "OPTIONS" {
            w.WriteHeader(http.StatusOK)
            return
        }
        
        next(w, r)
    }
}

// 限流中间件（简单版本）
func rateLimitMiddleware(next http.HandlerFunc) http.HandlerFunc {
    // 记录每个IP的请求时间
    requests := make(map[string][]time.Time)
    
    return func(w http.ResponseWriter, r *http.Request) {
        ip := r.RemoteAddr
        now := time.Now()
        
        // 清理过期记录（1分钟前）
        if times, exists := requests[ip]; exists {
            var validTimes []time.Time
            for _, t := range times {
                if now.Sub(t) < time.Minute {
                    validTimes = append(validTimes, t)
                }
            }
            requests[ip] = validTimes
        }
        
        // 检查请求数量（每分钟最多10次）
        if len(requests[ip]) >= 10 {
            w.Header().Set("Content-Type", "application/json")
            w.WriteHeader(http.StatusTooManyRequests)
            json.NewEncoder(w).Encode(map[string]string{
                "error": "请求过于频繁，请稍后再试",
            })
            return
        }
        
        // 记录本次请求
        requests[ip] = append(requests[ip], now)
        
        next(w, r)
    }
}

// 恢复中间件（panic恢复）
func recoveryMiddleware(next http.HandlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        defer func() {
            if err := recover(); err != nil {
                log.Printf("Panic恢复: %v", err)
                w.Header().Set("Content-Type", "application/json")
                w.WriteHeader(http.StatusInternalServerError)
                json.NewEncoder(w).Encode(map[string]string{
                    "error": "服务器内部错误",
                })
            }
        }()
        
        next(w, r)
    }
}

// 中间件链式调用工具函数
func chainMiddleware(handler http.HandlerFunc, middlewares ...func(http.HandlerFunc) http.HandlerFunc) http.HandlerFunc {
    // 从后往前包装
    for i := len(middlewares) - 1; i >= 0; i-- {
        handler = middlewares[i](handler)
    }
    return handler
}

// 业务处理器
func publicHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]string{
        "message": "这是公开API，不需要认证",
    })
}

func protectedHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]string{
        "message": "这是受保护的API，需要认证",
        "data":    "敏感数据",
    })
}

func panicHandler(w http.ResponseWriter, r *http.Request) {
    // 故意触发panic，测试恢复中间件
    panic("测试panic恢复")
}

func slowHandler(w http.ResponseWriter, r *http.Request) {
    // 模拟慢请求
    time.Sleep(2 * time.Second)
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]string{
        "message": "这是一个慢请求",
    })
}

func main() {
    // 公开API：只使用日志和CORS中间件
    http.HandleFunc("/api/public", 
        chainMiddleware(publicHandler, 
            recoveryMiddleware,
            loggingMiddleware,
            corsMiddleware,
        ),
    )
    
    // 受保护API：使用认证中间件
    http.HandleFunc("/api/protected", 
        chainMiddleware(protectedHandler,
            recoveryMiddleware,
            loggingMiddleware,
            corsMiddleware,
            authMiddleware,
        ),
    )
    
    // 限流API
    http.HandleFunc("/api/limited", 
        chainMiddleware(publicHandler,
            recoveryMiddleware,
            loggingMiddleware,
            rateLimitMiddleware,
        ),
    )
    
    // 测试panic恢复
    http.HandleFunc("/api/panic", 
        chainMiddleware(panicHandler,
            recoveryMiddleware,
            loggingMiddleware,
        ),
    )
    
    // 测试慢请求日志
    http.HandleFunc("/api/slow", 
        chainMiddleware(slowHandler,
            loggingMiddleware,
        ),
    )
    
    fmt.Println("服务器启动在: http://localhost:8080")
    fmt.Println("\n测试命令:")
    fmt.Println("# 公开API:")
    fmt.Println("curl http://localhost:8080/api/public")
    fmt.Println("\n# 受保护API（无token）:")
    fmt.Println("curl http://localhost:8080/api/protected")
    fmt.Println("\n# 受保护API（有效token）:")
    fmt.Println("curl -H 'Authorization: Bearer secret-token' http://localhost:8080/api/protected")
    fmt.Println("\n# 限流测试（快速请求11次）:")
    fmt.Println("for i in {1..11}; do curl http://localhost:8080/api/limited; echo; done")
    fmt.Println("\n# Panic恢复:")
    fmt.Println("curl http://localhost:8080/api/panic")
    fmt.Println("\n# 慢请求（查看日志）:")
    fmt.Println("curl http://localhost:8080/api/slow")
    
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

### 🎯 测试命令

```bash
# 公开API
curl http://localhost:8080/api/public

# 受保护API（未授权）
curl http://localhost:8080/api/protected

# 受保护API（已授权）
curl -H "Authorization: Bearer secret-token" http://localhost:8080/api/protected

# 限流测试
for i in {1..11}; do 
  curl http://localhost:8080/api/limited
  echo ""
done

# Panic恢复测试
curl http://localhost:8080/api/panic

# 慢请求测试（观察日志）
curl http://localhost:8080/api/slow
```

### 📝 知识点
- 中间件模式: 函数包装函数
- 中间件链: 多个中间件的组合
- `next(w, r)`: 调用下一个处理器
- `defer`: 确保代码执行（恢复panic）
- `recover()`: 捕获panic
- 执行顺序: 外层中间件先执行

---

## 第7步: 完整的RESTful API

### 📖 概念说明
整合前面所学，构建符合RESTful规范的完整API。

### 💻 代码实现

```go
// step7_restful_api.go
package main

import (
    "encoding/json"
    "fmt"
    "log"
    "net/http"
    "strconv"
    "strings"
    "sync"
    "time"
)

// 数据模型
type User struct {
    ID        int       `json:"id"`
    Name      string    `json:"name"`
    Email     string    `json:"email"`
    Age       int       `json:"age"`
    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
}

// 请求模型
type CreateUserRequest struct {
    Name  string `json:"name"`
    Email string `json:"email"`
    Age   int    `json:"age"`
}

type UpdateUserRequest struct {
    Name  *string `json:"name,omitempty"`
    Email *string `json:"email,omitempty"`
    Age   *int    `json:"age,omitempty"`
}

// 响应模型
type APIResponse struct {
    Success bool        `json:"success"`
    Message string      `json:"message"`
    Data    interface{} `json:"data,omitempty"`
    Error   string      `json:"error,omitempty"`
}

type ListResponse struct {
    Success bool        `json:"success"`
    Data    interface{} `json:"data"`
    Total   int         `json:"total"`
    Page    int         `json:"page"`
    Limit   int         `json:"limit"`
}

// 内存数据存储
type UserStore struct {
    users  map[int]*User
    nextID int
    mu     sync.RWMutex
}

func NewUserStore() *UserStore {
    return &UserStore{
        users:  make(map[int]*User),
        nextID: 1,
    }
}

func (s *UserStore) Create(req CreateUserRequest) (*User, error) {
    s.mu.Lock()
    defer s.mu.Unlock()
    
    // 检查邮箱是否已存在
    for _, user := range s.users {
        if user.Email == req.Email {
            return nil, fmt.Errorf("邮箱已存在")
        }
    }
    
    user := &User{
        ID:        s.nextID,
        Name:      req.Name,
        Email:     req.Email,
        Age:       req.Age,
        CreatedAt: time.Now(),
        UpdatedAt: time.Now(),
    }
    
    s.users[s.nextID] = user
    s.nextID++
    
    return user, nil
}

func (s *UserStore) GetByID(id int) (*User, error) {
    s.mu.RLock()
    defer s.mu.RUnlock()
    
    user, exists := s.users[id]
    if !exists {
        return nil, fmt.Errorf("用户不存在")
    }
    
    return user, nil
}

func (s *UserStore) List(page, limit int) ([]*User, int) {
    s.mu.RLock()
    defer s.mu.RUnlock()
    
    // 转换为切片
    var users []*User
    for _, user := range s.users {
        users = append(users, user)
    }
    
    // 简单分页
    total := len(users)
    start := (page - 1) * limit
    end := start + limit
    
    if start >= total {
        return []*User{}, total
    }
    
    if end > total {
        end = total
    }
    
    return users[start:end], total
}

func (s *UserStore) Update(id int, req UpdateUserRequest) (*User, error) {
    s.mu.Lock()
    defer s.mu.Unlock()
    
    user, exists := s.users[id]
    if !exists {
        return nil, fmt.Errorf("用户不存在")
    }
    
    // 检查邮箱冲突
    if req.Email != nil {
        for uid, u := range s.users {
            if uid != id && u.Email == *req.Email {
                return nil, fmt.Errorf("邮箱已被使用")
            }
        }
    }
    
    // 更新字段
    if req.Name != nil {
        user.Name = *req.Name
    }
    if req.Email != nil {
        user.Email = *req.Email
    }
    if req.Age != nil {
        user.Age = *req.Age
    }
    
    user.UpdatedAt = time.Now()
    
    return user, nil
}

func (s *UserStore) Delete(id int) error {
    s.mu.Lock()
    defer s.mu.Unlock()
    
    if _, exists := s.users[id]; !exists {
        return fmt.Errorf("用户不存在")
    }
    
    delete(s.users, id)
    return nil
}

// HTTP处理器
type UserHandler struct {
    store *UserStore
}

func NewUserHandler(store *UserStore) *UserHandler {
    return &UserHandler{store: store}
}

// POST /api/users - 创建用户
func (h *UserHandler) Create(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost {
        respondError(w, http.StatusMethodNotAllowed, "只支持POST方法")
        return
    }
    
    var req CreateUserRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        respondError(w, http.StatusBadRequest, "无效的请求数据")
        return
    }
    
    // 验证
    if req.Name == "" {
        respondError(w, http.StatusBadRequest, "name不能为空")
        return
    }
    if req.Email == "" {
        respondError(w, http.StatusBadRequest, "email不能为空")
        return
    }
    if req.Age < 0 || req.Age > 150 {
        respondError(w, http.StatusBadRequest, "age必须在0-150之间")
        return
    }
    
    user, err := h.store.Create(req)
    if err != nil {
        respondError(w, http.StatusConflict, err.Error())
        return
    }
    
    respondJSON(w, http.StatusCreated, APIResponse{
        Success: true,
        Message: "用户创建成功",
        Data:    user,
    })
}

// GET /api/users/{id} - 获取单个用户
func (h *UserHandler) GetByID(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodGet {
        respondError(w, http.StatusMethodNotAllowed, "只支持GET方法")
        return
    }
    
    id, err := extractID(r.URL.Path)
    if err != nil {
        respondError(w, http.StatusBadRequest, "无效的用户ID")
        return
    }
    
    user, err := h.store.GetByID(id)
    if err != nil {
        respondError(w, http.StatusNotFound, err.Error())
        return
    }
    
    respondJSON(w, http.StatusOK, APIResponse{
        Success: true,
        Data:    user,
    })
}

// GET /api/users - 获取用户列表
func (h *UserHandler) List(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodGet {
        respondError(w, http.StatusMethodNotAllowed, "只支持GET方法")
        return
    }
    
    // 解析分页参数
    query := r.URL.Query()
    page, _ := strconv.Atoi(query.Get("page"))
    limit, _ := strconv.Atoi(query.Get("limit"))
    
    if page < 1 {
        page = 1
    }
    if limit < 1 {
        limit = 10
    }
    
    users, total := h.store.List(page, limit)
    
    respondJSON(w, http.StatusOK, ListResponse{
        Success: true,
        Data:    users,
        Total:   total,
        Page:    page,
        Limit:   limit,
    })
}

// PUT /api/users/{id} - 更新用户
func (h *UserHandler) Update(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPut {
        respondError(w, http.StatusMethodNotAllowed, "只支持PUT方法")
        return
    }
    
    id, err := extractID(r.URL.Path)
    if err != nil {
        respondError(w, http.StatusBadRequest, "无效的用户ID")
        return
    }
    
    var req UpdateUserRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        respondError(w, http.StatusBadRequest, "无效的请求数据")
        return
    }
    
    // 验证
    if req.Age != nil && (*req.Age < 0 || *req.Age > 150) {
        respondError(w, http.StatusBadRequest, "age必须在0-150之间")
        return
    }
    
    user, err := h.store.Update(id, req)
    if err != nil {
        if err.Error() == "用户不存在" {
            respondError(w, http.StatusNotFound, err.Error())
        } else {
            respondError(w, http.StatusConflict, err.Error())
        }
        return
    }
    
    respondJSON(w, http.StatusOK, APIResponse{
        Success: true,
        Message: "用户更新成功",
        Data:    user,
    })
}

// DELETE /api/users/{id} - 删除用户
func (h *UserHandler) Delete(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodDelete {
        respondError(w, http.StatusMethodNotAllowed, "只支持DELETE方法")
        return
    }
    
    id, err := extractID(r.URL.Path)
    if err != nil {
        respondError(w, http.StatusBadRequest, "无效的用户ID")
        return
    }
    
    err = h.store.Delete(id)
    if err != nil {
        respondError(w, http.StatusNotFound, err.Error())
        return
    }
    
    respondJSON(w, http.StatusOK, APIResponse{
        Success: true,
        Message: "用户删除成功",
    })
}

// 工具函数
func extractID(path string) (int, error) {
    parts := strings.Split(path, "/")
    if len(parts) < 4 {
        return 0, fmt.Errorf("invalid path")
    }
    return strconv.Atoi(parts[3])
}

func respondJSON(w http.ResponseWriter, status int, data interface{}) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(status)
    json.NewEncoder(w).Encode(data)
}

func respondError(w http.ResponseWriter, status int, message string) {
    respondJSON(w, status, APIResponse{
        Success: false,
        Error:   message,
    })
}

// 路由处理
func (h *UserHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    path := r.URL.Path
    
    // /api/users
    if path == "/api/users" {
        switch r.Method {
        case http.MethodGet:
            h.List(w, r)
        case http.MethodPost:
            h.Create(w, r)
        default:
            respondError(w, http.StatusMethodNotAllowed, "方法不允许")
        }
        return
    }
    
    // /api/users/{id}
    if strings.HasPrefix(path, "/api/users/") {
        switch r.Method {
        case http.MethodGet:
            h.GetByID(w, r)
        case http.MethodPut:
            h.Update(w, r)
        case http.MethodDelete:
            h.Delete(w, r)
        default:
            respondError(w, http.StatusMethodNotAllowed, "方法不允许")
        }
        return
    }
    
    respondError(w, http.StatusNotFound, "路径不存在")
}

func main() {
    store := NewUserStore()
    handler := NewUserHandler(store)
    
    http.Handle("/api/users", handler)
    http.Handle("/api/users/", handler)
    
    fmt.Println("RESTful API服务器启动在: http://localhost:8080")
    fmt.Println("\nAPI端点:")
    fmt.Println("  POST   /api/users        - 创建用户")
    fmt.Println("  GET    /api/users        - 获取用户列表")
    fmt.Println("  GET    /api/users/{id}   - 获取单个用户")
    fmt.Println("  PUT    /api/users/{id}   - 更新用户")
    fmt.Println("  DELETE /api/users/{id}   - 删除用户")
    
    fmt.Println("\n测试命令:")
    fmt.Println("# 创建用户")
    fmt.Println(`curl -X POST http://localhost:8080/api/users -H "Content-Type: application/json" -d '{"name":"张三","email":"zhangsan@example.com","age":25}'`)
    fmt.Println("\n# 获取用户列表")
    fmt.Println("curl http://localhost:8080/api/users")
    fmt.Println("\n# 获取单个用户")
    fmt.Println("curl http://localhost:8080/api/users/1")
    fmt.Println("\n# 更新用户")
    fmt.Println(`curl -X PUT http://localhost:8080/api/users/1 -H "Content-Type: application/json" -d '{"name":"李四"}'`)
    fmt.Println("\n# 删除用户")
    fmt.Println("curl -X DELETE http://localhost:8080/api/users/1")
    
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

### 🎯 完整测试流程

```bash
# 1. 创建几个用户
curl -X POST http://localhost:8080/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"张三","email":"zhangsan@example.com","age":25}'

curl -X POST http://localhost:8080/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"李四","email":"lisi@example.com","age":30}'

# 2. 获取用户列表
curl http://localhost:8080/api/users

# 3. 获取单个用户
curl http://localhost:8080/api/users/1

# 4. 更新用户
curl -X PUT http://localhost:8080/api/users/1 \
  -H "Content-Type: application/json" \
  -d '{"name":"张三（已更新）","age":26}'

# 5. 删除用户
curl -X DELETE http://localhost:8080/api/users/2

# 6. 分页查询
curl "http://localhost:8080/api/users?page=1&limit=5"
```

### 📝 知识点
- RESTful设计原则
- CRUD操作完整实现
- 并发安全（sync.RWMutex）
- 统一的响应格式
- 错误处理
- 数据验证

---

## 第8步: SQLite数据库集成

### 📖 概念说明
将数据持久化到SQLite数据库，学习database/sql包的使用。

### 💻 准备工作

```bash
# 安装SQLite驱动
go get github.com/mattn/go-sqlite3
```

### 💻 代码实现

```go
// step8_sqlite_basic.go
package main

import (
    "database/sql"
    "encoding/json"
    "fmt"
    "log"
    "net/http"
    "time"
    
    _ "github.com/mattn/go-sqlite3"
)

// 数据库管理
type Database struct {
    db *sql.DB
}

func NewDatabase(dbPath string) (*Database, error) {
    db, err := sql.Open("sqlite3", dbPath)
    if err != nil {
        return nil, err
    }
    
    // 测试连接
    if err := db.Ping(); err != nil {
        return nil, err
    }
    
    // 设置连接池参数
    db.SetMaxOpenConns(25)
    db.SetMaxIdleConns(5)
    db.SetConnMaxLifetime(5 * time.Minute)
    
    return &Database{db: db}, nil
}

func (d *Database) Close() error {
    return d.db.Close()
}

// 初始化数据表
func (d *Database) InitTables() error {
    query := `
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        age INTEGER NOT NULL CHECK(age >= 0 AND age <= 150),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `
    
    _, err := d.db.Exec(query)
    return err
}

// User模型
type User struct {
    ID        int       `json:"id"`
    Name      string    `json:"name"`
    Email     string    `json:"email"`
    Age       int       `json:"age"`
    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
}

// 数据库操作
func (d *Database) CreateUser(name, email string, age int) (*User, error) {
    query := `
    INSERT INTO users (name, email, age, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
    `
    
    now := time.Now()
    result, err := d.db.Exec(query, name, email, age, now, now)
    if err != nil {
        return nil, err
    }
    
    id, err := result.LastInsertId()
    if err != nil {
        return nil, err
    }
    
    return &User{
        ID:        int(id),
        Name:      name,
        Email:     email,
        Age:       age,
        CreatedAt: