# 产品管理 API 完整测试指南

## 🚀 快速开始

### 1. 启动服务器
```bash
go run main.go
```

服务器将在 `http://localhost:8080` 启动，并自动插入 14 条测试数据。

---

## 📝 API 端点列表

### 基础 CRUD

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/products` | 获取所有产品（分页） |
| GET | `/products/:id` | 获取单个产品 |
| POST | `/products` | 创建产品 |
| PUT | `/products/:id` | 更新产品 |
| DELETE | `/products/:id` | 软删除产品 |
| DELETE | `/products/:id/hard` | 硬删除产品 |

### 额外功能

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/products/category/:category` | 按分类查询 |
| GET | `/products/search?q=keyword` | 搜索产品 |
| GET | `/stats` | 获取统计信息 |

---

## 🧪 详细测试用例

### 1️⃣ 获取所有产品（分页）

**请求:**
```bash
GET http://localhost:8080/products?page=1&page_size=10
```

**查询参数:**
- `page`: 页码（默认: 1）
- `page_size`: 每页数量（默认: 10，最大: 100）
- `category`: 分类筛选（可选）
- `sort_by`: 排序字段（id, name, price, created_at）
- `sort_order`: 排序方向（asc, desc）

**示例:**
```bash
# 基础查询
curl "http://localhost:8080/products"

# 分页
curl "http://localhost:8080/products?page=2&page_size=5"

# 按分类筛选
curl "http://localhost:8080/products?category=Electronics"

# 按价格排序
curl "http://localhost:8080/products?sort_by=price&sort_order=desc"

# 组合查询
curl "http://localhost:8080/products?category=Books&sort_by=price&sort_order=asc&page=1&page_size=5"
```

**响应:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "created_at": "2024-01-01T12:00:00Z",
      "updated_at": "2024-01-01T12:00:00Z",
      "name": "iPhone 15 Pro",
      "price": 999.99,
      "stock": 50,
      "category": "Electronics",
      "description": "Latest Apple smartphone"
    }
  ],
  "total": 14,
  "page": 1,
  "page_size": 10,
  "total_pages": 2
}
```

---

### 2️⃣ 获取单个产品

**请求:**
```bash
GET http://localhost:8080/products/1
```

**示例:**
```bash
curl "http://localhost:8080/products/1"
```

**响应:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "iPhone 15 Pro",
    "price": 999.99,
    "stock": 50,
    "category": "Electronics",
    "description": "Latest Apple smartphone"
  }
}
```

**错误响应 (404):**
```json
{
  "success": false,
  "error": "Product not found"
}
```

---

### 3️⃣ 创建产品

**请求:**
```bash
POST http://localhost:8080/products
Content-Type: application/json
```

**请求体:**
```json
{
  "name": "Sony WH-1000XM5",
  "price": 399.99,
  "stock": 85,
  "category": "Electronics",
  "description": "Premium noise-cancelling headphones"
}
```

**示例:**
```bash
curl -X POST "http://localhost:8080/products" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sony WH-1000XM5",
    "price": 399.99,
    "stock": 85,
    "category": "Electronics",
    "description": "Premium noise-cancelling headphones"
  }'
```

**字段验证:**
- `name`: 必填，至少 2 个字符
- `price`: 必填，必须大于 0
- `stock`: 必填，必须 >= 0
- `category`: 必填
- `description`: 可选

**响应 (201):**
```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "id": 15,
    "created_at": "2024-01-01T12:00:00Z",
    "updated_at": "2024-01-01T12:00:00Z",
    "name": "Sony WH-1000XM5",
    "price": 399.99,
    "stock": 85,
    "category": "Electronics",
    "description": "Premium noise-cancelling headphones"
  }
}
```

**错误响应 (400):**
```json
{
  "success": false,
  "error": "Key: 'CreateProductRequest.Name' Error:Field validation for 'Name' failed on the 'required' tag"
}
```

---

### 4️⃣ 更新产品

**请求:**
```bash
PUT http://localhost:8080/products/1
Content-Type: application/json
```

**请求体（所有字段可选）:**
```json
{
  "price": 949.99,
  "stock": 45
}
```

**示例:**
```bash
# 更新价格和库存
curl -X PUT "http://localhost:8080/products/1" \
  -H "Content-Type: application/json" \
  -d '{
    "price": 949.99,
    "stock": 45
  }'

# 只更新名称
curl -X PUT "http://localhost:8080/products/1" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "iPhone 15 Pro Max"
  }'

# 更新多个字段
curl -X PUT "http://localhost:8080/products/1" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "iPhone 15 Pro Max",
    "price": 1099.99,
    "stock": 40,
    "description": "Updated description"
  }'
```

**响应:**
```json
{
  "success": true,
  "message": "Product updated successfully",
  "data": {
    "id": 1,
    "name": "iPhone 15 Pro Max",
    "price": 949.99,
    "stock": 45,
    "category": "Electronics"
  }
}
```

---

### 5️⃣ 删除产品（软删除）

**请求:**
```bash
DELETE http://localhost:8080/products/1
```

**示例:**
```bash
curl -X DELETE "http://localhost:8080/products/1"
```

**响应:**
```json
{
  "success": true,
  "message": "Product deleted successfully (soft delete)"
}
```

**说明:**
- 软删除后，产品不会从数据库真正删除
- `deleted_at` 字段会被设置为当前时间
- 后续查询将不会返回已软删除的产品
- 可以通过数据库直接恢复

---

### 6️⃣ 硬删除产品

**请求:**
```bash
DELETE http://localhost:8080/products/1/hard
```

**示例:**
```bash
curl -X DELETE "http://localhost:8080/products/1/hard"
```

**响应:**
```json
{
  "success": true,
  "message": "Product permanently deleted"
}
```

**⚠️ 警告:** 硬删除会永久删除数据，无法恢复！

---

### 7️⃣ 按分类查询

**请求:**
```bash
GET http://localhost:8080/products/category/Electronics
```

**示例:**
```bash
curl "http://localhost:8080/products/category/Electronics"
curl "http://localhost:8080/products/category/Books"
curl "http://localhost:8080/products/category/Shoes"
```

**响应:**
```json
{
  "success": true,
  "category": "Electronics",
  "count": 5,
  "data": [...]
}
```

---

### 8️⃣ 搜索产品

**请求:**
```bash
GET http://localhost:8080/products/search?q=phone
```

**示例:**
```bash
# 搜索包含 "phone" 的产品
curl "http://localhost:8080/products/search?q=phone"

# 搜索包含 "book" 的产品
curl "http://localhost:8080/products/search?q=book"

# 