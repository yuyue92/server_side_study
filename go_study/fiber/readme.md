# Fiber + SQLite 用户管理系统使用指南

## 📋 项目概述

这是一个完整的用户管理系统，使用 Go Fiber 框架和 SQLite 数据库实现。系统采用主从表设计，包含用户基本信息和详细资料两个表。

### 数据库设计

#### 主表：users (用户基本信息)
- `id` - 主键，自增
- `name` - 姓名
- `age` - 年龄
- `email` - 邮箱（唯一）
- `status` - 状态（active/inactive/suspended）
- `created_at` - 创建时间
- `updated_at` - 更新时间

#### 从表：user_profiles (用户详细资料)
- `id` - 主键，自增
- `user_id` - 外键，关联 users.id
- `phone` - 电话
- `address` - 地址
- `city` - 城市
- `country` - 国家
- `postal_code` - 邮编
- `bio` - 个人简介
- `avatar` - 头像URL
- `gender` - 性别
- `birthday` - 生日
- `occupation` - 职业
- `company` - 公司
- `website` - 个人网站
- `github` - GitHub账号
- `linkedin` - LinkedIn账号
- `skills` - 技能标签
- `interests` - 兴趣爱好
- `created_at` - 创建时间
- `updated_at` - 更新时间

### 关系说明
- 一对一关系：一个用户对应一份详细资料
- 级联删除：删除用户时自动删除对应的详细资料
- 外键约束：确保数据一致性

## 🚀 快速开始

### 1. 安装依赖

```bash
# 创建项目
mkdir user-management
cd user-management
go mod init user-management

# 安装依赖包
go get github.com/gofiber/fiber/v2
go get github.com/gofiber/fiber/v2/middleware/cors
go get github.com/gofiber/fiber/v2/middleware/logger
go get github.com/gofiber/fiber/v2/middleware/recover
go get github.com/mattn/go-sqlite3
```

### 2. 运行项目

```bash
go run main.go
```

服务器将在 `http://localhost:3000` 启动，数据库文件 `users.db` 将自动创建。

## 📚 API 文档

### 基础信息

**Base URL:** `http://localhost:3000`

**响应格式:** JSON

### 端点列表

#### 1. 获取所有用户 (支持分页和过滤)

```http
GET /api/users
```

**查询参数:**
- `page` (int, 可选) - 页码，默认 1
- `page_size` (int, 可选) - 每页数量，默认 10
- `status` (string, 可选) - 过滤状态：active/inactive/suspended
- `include_profile` (bool, 可选) - 是否包含详细资料，默认 false

**示例请求:**
```bash
# 获取第一页，每页10条
curl http://localhost:3000/api/users

# 获取第二页，包含详细资料
curl "http://localhost:3000/api/users?page=2&page_size=5&include_profile=true"

# 只获取激活用户
curl "http://localhost:3000/api/users?status=active"
```

**响应示例:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "张三",
      "age": 25,
      "email": "zhangsan@example.com",
      "status": "active",
      "created_at": "2025-10-08T10:30:00Z",
      "updated_at": "2025-10-08T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 10,
    "total": 100,
    "total_page": 10
  }
}
```

---

#### 2. 获取单个用户

```http
GET /api/users/:id
```

**路径参数:**
- `id` (int) - 用户ID

**查询参数:**
- `include_profile` (bool, 可选) - 是否包含详细资料，默认 true

**示例请求:**
```bash
curl http://localhost:3000/api/users/1
```

**响应示例:**
```json
{
  "data": {
    "id": 1,
    "name": "张三",
    "age": 25,
    "email": "zhangsan@example.com",
    "status": "active",
    "created_at": "2025-10-08T10:30:00Z",
    "updated_at": "2025-10-08T10:30:00Z",
    "profile": {
      "id": 1,
      "user_id": 1,
      "phone": "13800138000",
      "address": "北京市朝阳区",
      "city": "北京",
      "country": "中国",
      "postal_code": "100000",
      "bio": "全栈开发工程师",
      "avatar": "https://example.com/avatar.jpg",
      "gender": "male",
      "birthday": "1998-05-20",
      "occupation": "软件工程师",
      "company": "科技公司",
      "website": "https://zhangsan.dev",
      "github": "zhangsan",
      "linkedin": "zhangsan-dev",
      "skills": "Go,Python,JavaScript,React",
      "interests": "编程,阅读,旅行",
      "created_at": "2025-10-08T10:30:00Z",
      "updated_at": "2025-10-08T10:30:00Z"
    }
  }
}
```

---

#### 3. 创建用户

```http
POST /api/users
```

**请求体:**
```json
{
  "name": "李四",
  "age": 28,
  "email": "lisi@example.com",
  "profile": {
    "phone": "13900139000",
    "address": "上海市浦东新区",
    "city": "上海",
    "country": "中国",
    "postal_code": "200000",
    "bio": "前端开发专家",
    "avatar": "https://example.com/lisi.jpg",
    "gender": "female",
    "birthday": "1995-08-15",
    "occupation": "前端工程师",
    "company": "互联网公司",
    "website": "https://lisi.com",
    "github": "lisi-dev",
    "linkedin": "lisi-frontend",
    "skills": "JavaScript,Vue,TypeScript,CSS",
    "interests": "设计,音乐,运动"
  }
}
```

**示例请求:**
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "李四",
    "age": 28,
    "email": "lisi@example.com",
    "profile": {
      "phone": "13900139000",
      "city": "上海",
      "country": "中国",
      "occupation": "前端工程师"
    }
  }'
```

**响应示例:**
```json
{
  "message": "用户创建成功",
  "user_id": 2
}
```

---

#### 4. 更新用户基本信息

```http
PUT /api/users/:id
```

**请求体:** (所有字段可选)
```json
{
  "name": "张三更新",
  "age": 26,
  "email": "zhangsan_new@example.com",
  "status": "inactive"
}
```

**示例请求:**
```bash
curl -X PUT http://localhost:3000/api/users/1 \
  -H "Content-Type: application/json" \
  -d '{"age": 26, "status": "inactive"}'
```

**响应示例:**
```json
{
  "message": "用户更新成功"
}
```

---

#### 5. 删除用户

```http
DELETE /api/users/:id
```

**说明:** 会级联删除用户的详细资料

**示例请求:**
```bash
curl -X DELETE http://localhost:3000/api/users/1
```

**响应示例:**
```json
{
  "message": "用户删除成功"
}
```

---

#### 6. 获取用户详细资料

```http
GET /api/users/:id/profile
```

**示例请求:**
```bash
curl http://localhost:3000/api/users/1/profile
```

**响应示例:**
```json
{
  "data": {
    "id": 1,
    "user_id": 1,
    "phone": "13800138000",
    "address": "北京市朝阳区",
    "city": "北京",
    "country": "中国",
    "postal_code": "100000",
    "bio": "全栈开发工程师",
    "avatar": "https://example.com/avatar.jpg",
    "gender": "male",
    "birthday": "1998-05-20",
    "occupation": "软件工程师",
    "company": "科技公司",
    "website": "https://zhangsan.dev",
    "github": "zhangsan",
    "linkedin": "zhangsan-dev",
    "skills": "Go,Python,JavaScript,React",
    "interests": "编程,阅读,旅行",
    "created_at": "2025-10-08T10:30:00Z",
    "updated_at": "2025-10-08T10:30:00Z"
  }
}
```

---

#### 7. 更新/创建用户详细资料

```http
PUT /api/users/:id/profile
```

**说明:** 如果资料不存在则创建，存在则更新

**请求体:**
```json
{
  "phone": "13800138000",
  "address": "北京市朝阳区望京SOHO",
  "city": "北京",
  "country": "中国",
  "postal_code": "100000",
  "bio": "热爱编程的全栈开发者，专注于 Go 和前端技术",
  "avatar": "https://example.com/avatar.jpg",
  "gender": "male",
  "birthday": "1998-05-20",
  "occupation": "高级软件工程师",
  "company": "字节跳动",
  "website": "https://zhangsan.dev",
  "github": "zhangsan",
  "linkedin": "zhangsan-dev",
  "skills": "Go,Python,JavaScript,React,Docker,Kubernetes",
  "interests": "编程,开源,阅读技术书籍,跑步,旅行"
}
```

**示例请求:**
```bash
curl -X PUT http://localhost:3000/api/users/1/profile \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "13800138000",
    "city": "北京",
    "occupation": "高级软件工程师",
    "skills": "Go,Python,JavaScript"
  }'
```

**响应示例:**
```json
{
  "message": "用户资料更新成功"
}
```

---

#### 8. 删除用户详细资料

```http
DELETE /api/users/:id/profile
```

**说明:** 只删除详细资料，不删除用户主信息

**示例请求:**
```bash
curl -X DELETE http://localhost:3000/api/users/1/profile
```

**响应示例:**
```json
{
  "message": "用户资料删除成功"
}
```

---

#### 9. 搜索用户

```http
GET /api/search
```

**查询参数:**
- `q` (string, 必需) - 搜索关键词（搜索姓名和邮箱）

**示例请求:**
```bash
# 搜索包含"张"的用户
curl "http://localhost:3000/api/search?q=张"

# 搜索邮箱包含"example"的用户
curl "http://localhost:3000/api/search?q=example"
```

**响应示例:**
```json
{
  "keyword": "张",
  "count": 5,
  "data": [
    {
      "id": 1,
      "name": "张三",
      "age": 25,
      "email": "zhangsan@example.com",
      "status": "active",
      "created_at": "2025-10-08T10:30:00Z",
      "updated_at": "2025-10-08T10:30:00Z"
    }
  ]
}
```

---

#### 10. 获取统计信息

```http
GET /api/stats
```

**示例请求:**
```bash
curl http://localhost:3000/api/stats
```

**响应示例:**
```json
{
  "data": {
    "total_users": 100,
    "active_users": 85,
    "users_with_profile": 75,
    "today_new_users": 5,
    "by_status": {
      "active": 85,
      "inactive": 10,
      "suspended": 5
    }
  }
}
```

---

## 🧪 完整测试流程

### 测试脚本

保存为 `test.sh`，然后运行 `bash test.sh`：

```bash
#!/bin/bash

BASE_URL="http://localhost:3000"

echo "=========================================="
echo "测试 1: 创建用户（带详细资料）"
echo "=========================================="
curl -X POST $BASE_URL/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "王小明",
    "age": 25,
    "email": "wangxiaoming@example.com",
    "profile": {
      "phone": "13800138000",
      "address": "北京市海淀区中关村",
      "city": "北京",
      "country": "中国",
      "postal_code": "100080",
      "bio": "热爱技术的程序员",
      "gender": "male",
      "birthday": "1998-03-15",
      "occupation": "软件工程师",
      "company": "阿里巴巴",
      "website": "https://wangxiaoming.dev",
      "github": "wangxiaoming",
      "linkedin": "wang-xiaoming",
      "skills": "Java,Spring,MySQL,Redis",
      "interests": "编程,篮球,电影"
    }
  }'
echo -e "\n"

echo "=========================================="
echo "测试 2: 创建用户（不带详细资料）"
echo "=========================================="
curl -X POST $BASE_URL/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "李华",
    "age": 30,
    "email": "lihua@example.com"
  }'
echo -e "\n"

echo "=========================================="
echo "测试 3: 获取所有用户"
echo "=========================================="
curl "$BASE_URL/api/users"
echo -e "\n"

echo "=========================================="
echo "测试 4: 获取单个用户（包含详细资料）"
echo "=========================================="
curl "$BASE_URL/api/users/1?include_profile=true"
echo -e "\n"

echo "=========================================="
echo "测试 5: 更新用户基本信息"
echo "=========================================="
curl -X PUT $BASE_URL/api/users/1 \
  -H "Content-Type: application/json" \
  -d '{
    "age": 26,
    "status": "active"
  }'
echo -e "\n"

echo "=========================================="
echo "测试 6: 更新用户详细资料"
echo "=========================================="
curl -X PUT $BASE_URL/api/users/1/profile \
  -H "Content-Type: application/json" \
  -d '{
    "bio": "更新后的个人简介",
    "skills": "Go,Python,Docker,Kubernetes",
    "company": "腾讯"
  }'
echo -e "\n"

echo "=========================================="
echo "测试 7: 搜索用户"
echo "=========================================="
curl "$BASE_URL/api/search?q=王"
echo -e "\n"

echo "=========================================="
echo "测试 8: 获取统计信息"
echo "=========================================="
curl "$BASE_URL/api/stats"
echo -e "\n"

echo "=========================================="
echo "测试 9: 分页获取用户"
echo "=========================================="
curl "$BASE_URL/api/users?page=1&page_size=5"
echo -e "\n"

echo "=========================================="
echo "测试 10: 获取特定状态的用户"
echo "=========================================="
curl "$BASE_URL/api/users?status=active"
echo -e "\n"

echo "所有测试完成！"
```

### Python 测试脚本

保存为 `test.py`：

```python
import requests
import json

BASE_URL = "http://localhost:3000"

def test_create_user():
    """测试创建用户"""
    print("\n" + "="*50)
    print("创建用户测试")
    print("="*50)
    
    user_data = {
        "name": "测试用户",
        "age": 28,
        "email": f"test{int(time.time())}@example.com",
        "profile": {
            "phone": "13900139000",
            "city": "深圳",
            "country": "中国",
            "occupation": "测试工程师",
            "skills": "Python,Selenium,Jest",
            "interests": "自动化测试,性能优化"
        }
    }
    
    response = requests.post(f"{BASE_URL}/api/users", json=user_data)
    print(f"状态码: {response.status_code}")
    print(f"响应: {json.dumps(response.json(), ensure_ascii=False, indent=2)}")
    return response.json().get("user_id")

def test_get_user(user_id):
    """测试获取用户"""
    print("\n" + "="*50)
    print(f"获取用户 {user_id} 测试")
    print("="*50)
    
    response = requests.get(f"{BASE_URL}/api/users/{user_id}?include_profile=true")
    print(f"状态码: {response.status_code}")
    print(f"响应: {json.dumps(response.json(), ensure_ascii=False, indent=2)}")

def test_update_user(user_id):
    """测试更新用户"""
    print("\n" + "="*50)
    print(f"更新用户 {user_id} 测试")
    print("="*50)
    
    update_data = {
        "age": 29,
        "status": "active"
    }
    
    response = requests.put(f"{BASE_URL}/api/users/{user_id}", json=update_data)
    print(f"状态码: {response.status_code}")
    print(f"响应: {json.dumps(response.json(), ensure_ascii=False, indent=2)}")

def test_search():
    """测试搜索"""
    print("\n" + "="*50)
    print("搜索测试")
    print("="*50)
    
    response = requests.get(f"{BASE_URL}/api/search?q=测试")
    print(f"状态码: {response.status_code}")
    print(f"响应: {json.dumps(response.json(), ensure_ascii=False, indent=2)}")

def test_stats():
    """测试统计"""
    print("\n" + "="*50)
    print("统计信息测试")
    print("="*50)
    
    response = requests.get(f"{BASE_URL}/api/stats")
    print(f"状态码: {response.status_code}")
    print(f"响应: {json.dumps(response.json(), ensure_ascii=False, indent=2)}")

if __name__ == "__main__":
    import time
    
    # 执行测试
    user_id = test_create_user()
    if user_id:
        time.sleep(0.5)
        test_get_user(user_id)
        time.sleep(0.5)
        test_update_user(user_id)
    
    time.sleep(0.5)
    test_search()
    time.sleep(0.5)
    test_stats()
    
    print("\n" + "="*50)
    print("所有测试完成！")
    print("="*50)
```

---

## 🎯 功能特性

### ✨ 核心功能

1. **完整的 CRUD 操作**
   - 创建、读取、更新、删除用户
   - 支持批量查询和单个查询

2. **主从表关联**
   - 一对一关系设计
   - 级联删除保证数据一致性
   - 外键约束确保引用完整性

3. **灵活的查询**
   - 支持分页查询
   - 支持状态过滤
   - 可选择是否包含详细资料

4. **搜索功能**
   - 支持姓名搜索
   - 支持邮箱搜索
   - 模糊匹配

5. **统计分析**
   - 用户总数统计
   - 状态分组统计
   - 新增用户统计

### 🔒 数据完整性

- **外键约束**: 确保从表数据必须关联有效的主表记录
- **唯一约束**: 邮箱字段唯一，防止重复注册
- **级联删除**: 删除用户时自动删除关联的详细资料
- **事务处理**: 创建用户和资料使用事务，保证原子性

### 🚀 性能优化

- **索引优化**: 
  - 邮箱字段索引（常用查询）
  - 状态字段索引（过滤查询）
  - 外键字段索引（关联查询）
  
- **连接池**: SQLite 自动管理连接
- **查询优化**: 使用参数化查询防止 SQL 注入

### 📊 API 设计亮点

1. **RESTful 风格**: 遵循 REST 架构规范
2. **统一响应格式**: JSON 格式统一规范
3. **错误处理**: 完善的错误提示和状态码
4. **参数验证**: 必填字段和格式校验
5. **灵活查询**: 支持多种查询参数组合

---

## 💡 使用场景

### 1. 用户注册系统
创建用户时同时填写基本信息和详细资料

### 2. 用户档案管理
管理员可以查看和编辑用户的完整档案信息

### 3. 人才库系统
HR 系统存储求职者的详细信息（技能、经验等）

### 4. 社交平台
用户个人主页展示详细的个人信息

### 5. CRM 系统
客户关系管理系统的联系人管理

---

## 🔧 扩展建议

1. **添加认证授权**: 集成 JWT 实现用户登录
2. **图片上传**: 实现头像上传功能
3. **数据验证**: 使用 validator 库进行更严格的验证
4. **日志系统**: 记录操作日志
5. **缓存层**: 使用 Redis 缓存热点数据
6. **全文搜索**: 集成 Elasticsearch 提升搜索体验
7. **导出功能**: 支持导出用户数据为 Excel/CSV
8. **批量操作**: 支持批量导入、批量更新

---

## ⚠️ 注意事项

1. **生产环境**: 需要更换为 PostgreSQL/MySQL 等生产级数据库
2. **安全性**: 添加 API 认证和权限控制
3. **数据备份**: 定期备份 SQLite 数据库文件
4. **并发控制**: SQLite 并发性能有限，高并发场景需考虑其他方案
5. **敏感信息**: 生产环境应加密存储敏感信息（如电话）

---

## 📖 学习要点

通过这个项目，你将学会：

✅ Fiber 框架的基本使用  
✅ SQLite 数据库操作  
✅ 主从表设计和关联查询  
✅ RESTful API 设计规范  
✅ 事务处理  
✅ 错误处理和中间件  
✅ 数据库索引优化  
✅ 分页和搜索实现  

祝你学习愉快！🎉
