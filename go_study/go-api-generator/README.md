# Go API Generator

基于 JSON 配置文件自动生成 Go 语言后端服务接口的代码生成器。

## 技术栈

- **Web 框架**: Gin
- **数据库**: SQLite3
- **ORM**: GORM
- **语言**: Go 1.21+

## 项目架构

```
go-api-generator/          # 生成器项目
├── main.go                # 生成器入口
├── config/
│   └── parser.go          # JSON配置解析器（含验证）
├── models/
│   └── schema.go          # 核心数据结构定义
├── generator/
│   ├── generator.go       # 生成器编排 + 工具函数
│   ├── model_gen.go       # 模型层代码生成
│   ├── database_gen.go    # 数据库层代码生成（Repository模式）
│   ├── handler_gen.go     # HTTP处理器层代码生成
│   ├── router_gen.go      # 路由+中间件代码生成
│   └── main_gen.go        # 入口文件+go.mod生成
├── examples/
│   └── schema.json        # 示例配置（用户/文章/评论三表）
└── README.md
```

## 快速开始

### 1. 运行生成器

```bash
cd go-api-generator
go run main.go -config examples/schema.json -output my-api -mod my-api
```

### 2. 启动生成的服务

```bash
cd my-api
go mod tidy
go run main.go
```

### 3. 测试接口

```bash
# 健康检查
curl http://localhost:8080/health

# 创建用户
curl -X POST http://localhost:8080/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"uuid":"550e8400-e29b-41d4-a716-446655440000","username":"zhangsan","email":"zhangsan@example.com","password":"123456","nickname":"张三","status":1}'

# 查询用户列表
curl http://localhost:8080/api/v1/users?page=1&page_size=10

# 查询单个用户
curl http://localhost:8080/api/v1/users/1

# 更新用户
curl -X PUT http://localhost:8080/api/v1/users/1 \
  -H "Content-Type: application/json" \
  -d '{"nickname":"张三丰"}'

# 删除用户
curl -X DELETE http://localhost:8080/api/v1/users/1

# 批量删除
curl -X POST http://localhost:8080/api/v1/users/batch-delete \
  -H "Content-Type: application/json" \
  -d '{"ids":[1,2,3]}'
```

## 命令行参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `-config` | `examples/schema.json` | JSON配置文件路径 |
| `-output` | `output` | 代码输出目录 |
| `-mod` | `generated-api` | 生成项目的Go Module名称 |

## JSON 配置文件格式

### 支持的字段类型

| 类型 | Go类型 | SQLite类型 | 说明 |
|------|--------|-----------|------|
| `number` | `int64` | `INTEGER` | 整数 |
| `float` | `float64` | `REAL` | 浮点数 |
| `string` | `string` | `VARCHAR(n)` | 字符串 |
| `text` | `string` | `TEXT` | 长文本 |
| `boolean` | `bool` | `BOOLEAN` | 布尔值 |
| `date` | `time.Time` | `DATETIME` | 日期时间 |

### 字段属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `name` | string | 字段名（snake_case） |
| `type` | string | 字段类型 |
| `length` | number | 字段长度（仅string） |
| `format` | string | 格式验证: uuid/email/url |
| `required` | boolean | 是否必填 |
| `unique` | boolean | 是否唯一 |
| `autoIncrement` | boolean | 是否自增 |
| `default` | any | 默认值 |
| `comment` | string | 字段注释 |
| `enum` | array | 枚举值 |

### 关系类型

| 类型 | 说明 |
|------|------|
| `one-to-one` | 一对一 |
| `one-to-many` | 一对多 |
| `many-to-many` | 多对多 |

## 生成的 API 接口

对于配置文件中的每个表，自动生成以下 RESTful 接口：

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/v1/{表名}s` | 创建 |
| `GET` | `/api/v1/{表名}s` | 分页列表 |
| `GET` | `/api/v1/{表名}s/:id` | 按ID查询 |
| `PUT` | `/api/v1/{表名}s/:id` | 更新 |
| `DELETE` | `/api/v1/{表名}s/:id` | 删除 |
| `POST` | `/api/v1/{表名}s/batch-delete` | 批量删除 |

### 分页查询参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `page` | 1 | 页码 |
| `page_size` | 20 | 每页条数(最大100) |
| `order_by` | id | 排序字段 |
| `order` | desc | 排序方向 |
| `keyword` | - | 关键字搜索 |

## 生成的项目结构

```
output/
├── main.go            # 入口文件
├── go.mod             # 依赖管理
├── models/            # 数据模型 + DTO
├── database/          # 数据库初始化 + Repository
├── handlers/          # HTTP 处理器
├── router/            # 路由配置
├── middleware/        # 中间件（CORS、Logger）
└── utils/             # 工具函数
```

## 设计原则

1. **Repository 模式** - 数据访问层与业务逻辑分离
2. **DTO 模式** - 请求/响应使用独立的数据传输对象
3. **统一响应** - 所有接口返回统一的 JSON 格式
4. **分页查询** - 内置分页、排序、关键字搜索
5. **参数验证** - 基于 gin binding 标签自动验证
6. **中间件** - 内置 CORS 和请求日志中间件
