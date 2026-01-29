package models

import (
	"time"
)

// TaskStatus 任务状态
type TaskStatus string

const (
	StatusTodo       TaskStatus = "todo"
	StatusInProgress TaskStatus = "in_progress"
	StatusCompleted  TaskStatus = "completed"
)

// Priority 优先级
type Priority string

const (
	PriorityLow    Priority = "low"
	PriorityMedium Priority = "medium"
	PriorityHigh   Priority = "high"
)

// UserRole 用户角色
type UserRole string

const (
	RoleAdmin          UserRole = "admin"
	RoleProjectManager UserRole = "project_manager"
	RoleTeamMember     UserRole = "team_member"
	RoleGuest          UserRole = "guest"
)

// ProjectStatus 项目状态
type ProjectStatus string

const (
	ProjectPlanning   ProjectStatus = "planning"
	ProjectInProgress ProjectStatus = "in_progress"
	ProjectCompleted  ProjectStatus = "completed"
)

// User 用户模型
type User struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	Username  string    `json:"username" gorm:"unique;not null"`
	Email     string    `json:"email" gorm:"unique;not null"`
	Role      UserRole  `json:"role" gorm:"default:'team_member'"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Project 项目模型
type Project struct {
	ID          uint          `json:"id" gorm:"primaryKey"`
	Name        string        `json:"name" gorm:"not null"`
	Description string        `json:"description"`
	Status      ProjectStatus `json:"status" gorm:"default:'planning'"`
	ManagerID   *uint         `json:"manager_id"`
	Manager     *User         `json:"manager,omitempty" gorm:"foreignKey:ManagerID"`
	StartDate   *time.Time    `json:"start_date"`
	EndDate     *time.Time    `json:"end_date"`
	CreatedAt   time.Time     `json:"created_at"`
	UpdatedAt   time.Time     `json:"updated_at"`
	Tasks       []Task        `json:"tasks,omitempty" gorm:"foreignKey:ProjectID"`
}

// Task 任务模型
type Task struct {
	ID          uint       `json:"id" gorm:"primaryKey"`
	Title       string     `json:"title" gorm:"not null"`
	Description string     `json:"description"`
	Status      TaskStatus `json:"status" gorm:"default:'todo'"`
	Priority    Priority   `json:"priority" gorm:"default:'medium'"`
	ProjectID   *uint      `json:"project_id"`
	Project     *Project   `json:"project,omitempty" gorm:"foreignKey:ProjectID"`
	AssigneeID  *uint      `json:"assignee_id"`
	Assignee    *User      `json:"assignee,omitempty" gorm:"foreignKey:AssigneeID"`
	CreatorID   *uint      `json:"creator_id"`
	Creator     *User      `json:"creator,omitempty" gorm:"foreignKey:CreatorID"`
	DueDate     *time.Time `json:"due_date"`
	Progress    int        `json:"progress" gorm:"default:0"` // 0-100
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

// TaskProgress 任务进度记录
type TaskProgress struct {
	ID        uint       `json:"id" gorm:"primaryKey"`
	TaskID    uint       `json:"task_id" gorm:"not null"`
	Task      *Task      `json:"task,omitempty" gorm:"foreignKey:TaskID"`
	OldStatus TaskStatus `json:"old_status"`
	NewStatus TaskStatus `json:"new_status"`
	Comment   string     `json:"comment"`
	UpdatedBy *uint      `json:"updated_by"`
	User      *User      `json:"user,omitempty" gorm:"foreignKey:UpdatedBy"`
	CreatedAt time.Time  `json:"created_at"`
}

// ========== 请求/响应结构体 ==========

// CreateUserRequest 创建用户请求
type CreateUserRequest struct {
	Username string   `json:"username" binding:"required"`
	Email    string   `json:"email" binding:"required,email"`
	Role     UserRole `json:"role"`
}

// CreateProjectRequest 创建项目请求
type CreateProjectRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
	ManagerID   *uint  `json:"manager_id"`
	StartDate   string `json:"start_date"`
	EndDate     string `json:"end_date"`
}

// UpdateProjectRequest 更新项目请求
type UpdateProjectRequest struct {
	Name        string        `json:"name"`
	Description string        `json:"description"`
	Status      ProjectStatus `json:"status"`
	ManagerID   *uint         `json:"manager_id"`
	StartDate   string        `json:"start_date"`
	EndDate     string        `json:"end_date"`
}

// CreateTaskRequest 创建任务请求
type CreateTaskRequest struct {
	Title       string   `json:"title" binding:"required"`
	Description string   `json:"description"`
	Priority    Priority `json:"priority"`
	ProjectID   *uint    `json:"project_id"`
	AssigneeID  *uint    `json:"assignee_id"`
	CreatorID   *uint    `json:"creator_id"`
	DueDate     string   `json:"due_date"`
}

// UpdateTaskRequest 更新任务请求
type UpdateTaskRequest struct {
	Title       string     `json:"title"`
	Description string     `json:"description"`
	Status      TaskStatus `json:"status"`
	Priority    Priority   `json:"priority"`
	ProjectID   *uint      `json:"project_id"`
	AssigneeID  *uint      `json:"assignee_id"`
	DueDate     string     `json:"due_date"`
	Progress    *int       `json:"progress"`
}

// AssignTaskRequest 分配任务请求
type AssignTaskRequest struct {
	AssigneeID uint `json:"assignee_id" binding:"required"`
}

// UpdateProgressRequest 更新进度请求
type UpdateProgressRequest struct {
	Status    TaskStatus `json:"status"`
	Progress  int        `json:"progress"`
	Comment   string     `json:"comment"`
	UpdatedBy *uint      `json:"updated_by"`
}

// TaskFilter 任务过滤器
type TaskFilter struct {
	Status     TaskStatus `form:"status"`
	Priority   Priority   `form:"priority"`
	ProjectID  *uint      `form:"project_id"`
	AssigneeID *uint      `form:"assignee_id"`
	Search     string     `form:"search"`
	Page       int        `form:"page"`
	PageSize   int        `form:"page_size"`
}

// PaginatedResponse 分页响应
type PaginatedResponse struct {
	Data       interface{} `json:"data"`
	Total      int64       `json:"total"`
	Page       int         `json:"page"`
	PageSize   int         `json:"page_size"`
	TotalPages int         `json:"total_pages"`
}

// APIResponse 统一API响应
type APIResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

// DashboardStats 仪表盘统计
type DashboardStats struct {
	TotalTasks       int64 `json:"total_tasks"`
	TodoTasks        int64 `json:"todo_tasks"`
	InProgressTasks  int64 `json:"in_progress_tasks"`
	CompletedTasks   int64 `json:"completed_tasks"`
	TotalProjects    int64 `json:"total_projects"`
	TotalUsers       int64 `json:"total_users"`
	OverdueTasks     int64 `json:"overdue_tasks"`
	TasksDueToday    int64 `json:"tasks_due_today"`
	RecentTasks      []Task `json:"recent_tasks"`
}
