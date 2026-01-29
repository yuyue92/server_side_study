# TaskFlow - 任务管理系统

一个基于 Go + SQLite + 原生 HTML/CSS/JavaScript 的现代化任务管理系统。

## 功能特性

### 核心功能
- **任务管理**：创建、编辑、删除任务，支持优先级和截止日期
- **任务分配**：将任务分配给团队成员
- **任务进度**：更新任务状态（待办、进行中、已完成）
- **项目管理**：组织任务到不同项目，查看项目进度

### 界面特性
- 响应式设计，支持桌面和移动端
- 列表视图和看板视图切换
- 实时统计仪表盘
- 任务过滤和搜索功能

## 技术栈

- **后端**：Go + Gin 框架
- **数据库**：SQLite3
- **前端**：原生 HTML + CSS + JavaScript
- **UI框架**：Bootstrap 5 + Bootstrap Icons

## API 接口

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/dashboard | 获取统计数据 |
| POST | /api/users | 创建用户 |
| GET | /api/users | 获取用户列表 |
| POST | /api/projects | 创建项目 |
| GET | /api/projects | 获取项目列表 |
| GET | /api/projects/:id | 获取项目详情 |
| PUT | /api/projects/:id | 更新项目 |
| DELETE | /api/projects/:id | 删除项目 |
| POST | /api/tasks | 创建任务 |
| GET | /api/tasks | 获取任务列表（支持分页） |
| GET | /api/tasks/:id | 获取任务详情 |
| PUT | /api/tasks/:id | 更新任务 |
| DELETE | /api/tasks/:id | 删除任务 |
| PUT | /api/tasks/:id/assign | 分配任务 |
| PUT | /api/tasks/:id/progress | 更新进度 |
| POST | /api/projects/:id/tasks | 项目中创建任务 |

## 快速开始

### 环境要求
- Go 1.21+

### 安装运行

```bash
# 进入项目目录
cd task-management-system

# 下载依赖
go mod tidy

# 运行项目
go run main.go

# 或编译后运行
go build -o taskflow main.go
./taskflow
```

打开浏览器访问 `http://localhost:8080`

## 用户角色

| 角色 | 权限 |
|------|------|
| Admin | 全系统管理权限 |
| Project Manager | 管理项目和任务 |
| Team Member | 更新分配的任务 |
| Guest | 只读权限 |

## 初始数据

首次运行自动创建：5个用户、3个项目、8个任务

## License

MIT License
