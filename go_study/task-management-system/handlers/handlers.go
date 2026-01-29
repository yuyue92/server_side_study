package handlers

import (
	"math"
	"net/http"
	"strconv"
	"task-management-system/database"
	"task-management-system/models"
	"time"

	"github.com/gin-gonic/gin"
)

// ========== 用户管理 ==========

// CreateUser 创建用户
func CreateUser(c *gin.Context) {
	var req models.CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   "无效的请求参数: " + err.Error(),
		})
		return
	}

	user := models.User{
		Username: req.Username,
		Email:    req.Email,
		Role:     req.Role,
	}

	if user.Role == "" {
		user.Role = models.RoleTeamMember
	}

	if err := database.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   "创建用户失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, models.APIResponse{
		Success: true,
		Message: "用户创建成功",
		Data:    user,
	})
}

// GetUsers 获取用户列表
func GetUsers(c *gin.Context) {
	var users []models.User
	if err := database.DB.Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   "获取用户列表失败",
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    users,
	})
}

// GetUser 获取单个用户
func GetUser(c *gin.Context) {
	id := c.Param("id")
	var user models.User
	if err := database.DB.First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{
			Success: false,
			Error:   "用户不存在",
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    user,
	})
}

// ========== 项目管理 ==========

// CreateProject 创建项目
func CreateProject(c *gin.Context) {
	var req models.CreateProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   "无效的请求参数: " + err.Error(),
		})
		return
	}

	project := models.Project{
		Name:        req.Name,
		Description: req.Description,
		ManagerID:   req.ManagerID,
		Status:      models.ProjectPlanning,
	}

	if req.StartDate != "" {
		if t, err := time.Parse("2006-01-02", req.StartDate); err == nil {
			project.StartDate = &t
		}
	}

	if req.EndDate != "" {
		if t, err := time.Parse("2006-01-02", req.EndDate); err == nil {
			project.EndDate = &t
		}
	}

	if err := database.DB.Create(&project).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   "创建项目失败: " + err.Error(),
		})
		return
	}

	// 重新加载项目以获取关联数据
	database.DB.Preload("Manager").First(&project, project.ID)

	c.JSON(http.StatusCreated, models.APIResponse{
		Success: true,
		Message: "项目创建成功",
		Data:    project,
	})
}

// GetProjects 获取项目列表
func GetProjects(c *gin.Context) {
	var projects []models.Project
	query := database.DB.Preload("Manager").Preload("Tasks")

	// 状态过滤
	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	if err := query.Find(&projects).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   "获取项目列表失败",
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    projects,
	})
}

// GetProject 获取单个项目
func GetProject(c *gin.Context) {
	id := c.Param("id")
	var project models.Project
	if err := database.DB.Preload("Manager").Preload("Tasks.Assignee").First(&project, id).Error; err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{
			Success: false,
			Error:   "项目不存在",
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    project,
	})
}

// UpdateProject 更新项目
func UpdateProject(c *gin.Context) {
	id := c.Param("id")
	var project models.Project
	if err := database.DB.First(&project, id).Error; err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{
			Success: false,
			Error:   "项目不存在",
		})
		return
	}

	var req models.UpdateProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   "无效的请求参数",
		})
		return
	}

	// 更新字段
	if req.Name != "" {
		project.Name = req.Name
	}
	if req.Description != "" {
		project.Description = req.Description
	}
	if req.Status != "" {
		project.Status = req.Status
	}
	if req.ManagerID != nil {
		project.ManagerID = req.ManagerID
	}
	if req.StartDate != "" {
		if t, err := time.Parse("2006-01-02", req.StartDate); err == nil {
			project.StartDate = &t
		}
	}
	if req.EndDate != "" {
		if t, err := time.Parse("2006-01-02", req.EndDate); err == nil {
			project.EndDate = &t
		}
	}

	if err := database.DB.Save(&project).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   "更新项目失败",
		})
		return
	}

	database.DB.Preload("Manager").First(&project, project.ID)

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "项目更新成功",
		Data:    project,
	})
}

// DeleteProject 删除项目
func DeleteProject(c *gin.Context) {
	id := c.Param("id")
	var project models.Project
	if err := database.DB.First(&project, id).Error; err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{
			Success: false,
			Error:   "项目不存在",
		})
		return
	}

	// 检查是否有关联任务
	var taskCount int64
	database.DB.Model(&models.Task{}).Where("project_id = ?", id).Count(&taskCount)
	if taskCount > 0 {
		// 将任务的project_id设为null
		database.DB.Model(&models.Task{}).Where("project_id = ?", id).Update("project_id", nil)
	}

	if err := database.DB.Delete(&project).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   "删除项目失败",
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "项目删除成功",
	})
}

// ========== 任务管理 ==========

// CreateTask 创建任务
func CreateTask(c *gin.Context) {
	var req models.CreateTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   "无效的请求参数: " + err.Error(),
		})
		return
	}

	task := models.Task{
		Title:       req.Title,
		Description: req.Description,
		Priority:    req.Priority,
		ProjectID:   req.ProjectID,
		AssigneeID:  req.AssigneeID,
		CreatorID:   req.CreatorID,
		Status:      models.StatusTodo,
		Progress:    0,
	}

	if task.Priority == "" {
		task.Priority = models.PriorityMedium
	}

	if req.DueDate != "" {
		if t, err := time.Parse("2006-01-02", req.DueDate); err == nil {
			task.DueDate = &t
		}
	}

	if err := database.DB.Create(&task).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   "创建任务失败: " + err.Error(),
		})
		return
	}

	// 重新加载以获取关联数据
	database.DB.Preload("Project").Preload("Assignee").Preload("Creator").First(&task, task.ID)

	c.JSON(http.StatusCreated, models.APIResponse{
		Success: true,
		Message: "任务创建成功",
		Data:    task,
	})
}

// GetTasks 获取任务列表（支持分页和过滤）
func GetTasks(c *gin.Context) {
	var filter models.TaskFilter
	if err := c.ShouldBindQuery(&filter); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   "无效的查询参数",
		})
		return
	}

	// 设置默认分页
	if filter.Page <= 0 {
		filter.Page = 1
	}
	if filter.PageSize <= 0 {
		filter.PageSize = 10
	}
	if filter.PageSize > 100 {
		filter.PageSize = 100
	}

	query := database.DB.Model(&models.Task{}).Preload("Project").Preload("Assignee").Preload("Creator")

	// 应用过滤条件
	if filter.Status != "" {
		query = query.Where("status = ?", filter.Status)
	}
	if filter.Priority != "" {
		query = query.Where("priority = ?", filter.Priority)
	}
	if filter.ProjectID != nil && *filter.ProjectID > 0 {
		query = query.Where("project_id = ?", *filter.ProjectID)
	}
	if filter.AssigneeID != nil && *filter.AssigneeID > 0 {
		query = query.Where("assignee_id = ?", *filter.AssigneeID)
	}
	if filter.Search != "" {
		search := "%" + filter.Search + "%"
		query = query.Where("title LIKE ? OR description LIKE ?", search, search)
	}

	// 计算总数
	var total int64
	query.Count(&total)

	// 分页查询
	offset := (filter.Page - 1) * filter.PageSize
	var tasks []models.Task
	if err := query.Order("created_at DESC").Offset(offset).Limit(filter.PageSize).Find(&tasks).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   "获取任务列表失败",
		})
		return
	}

	totalPages := int(math.Ceil(float64(total) / float64(filter.PageSize)))

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data: models.PaginatedResponse{
			Data:       tasks,
			Total:      total,
			Page:       filter.Page,
			PageSize:   filter.PageSize,
			TotalPages: totalPages,
		},
	})
}

// GetTask 获取单个任务
func GetTask(c *gin.Context) {
	id := c.Param("id")
	var task models.Task
	if err := database.DB.Preload("Project").Preload("Assignee").Preload("Creator").First(&task, id).Error; err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{
			Success: false,
			Error:   "任务不存在",
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    task,
	})
}

// UpdateTask 更新任务
func UpdateTask(c *gin.Context) {
	id := c.Param("id")
	var task models.Task
	if err := database.DB.First(&task, id).Error; err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{
			Success: false,
			Error:   "任务不存在",
		})
		return
	}

	var req models.UpdateTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   "无效的请求参数",
		})
		return
	}

	// 更新字段
	if req.Title != "" {
		task.Title = req.Title
	}
	if req.Description != "" {
		task.Description = req.Description
	}
	if req.Status != "" {
		task.Status = req.Status
		// 自动更新进度
		if req.Status == models.StatusCompleted {
			task.Progress = 100
		}
	}
	if req.Priority != "" {
		task.Priority = req.Priority
	}
	if req.ProjectID != nil {
		task.ProjectID = req.ProjectID
	}
	if req.AssigneeID != nil {
		task.AssigneeID = req.AssigneeID
	}
	if req.DueDate != "" {
		if t, err := time.Parse("2006-01-02", req.DueDate); err == nil {
			task.DueDate = &t
		}
	}
	if req.Progress != nil {
		task.Progress = *req.Progress
		// 自动更新状态
		if *req.Progress >= 100 {
			task.Status = models.StatusCompleted
			task.Progress = 100
		} else if *req.Progress > 0 {
			task.Status = models.StatusInProgress
		}
	}

	if err := database.DB.Save(&task).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   "更新任务失败",
		})
		return
	}

	database.DB.Preload("Project").Preload("Assignee").Preload("Creator").First(&task, task.ID)

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "任务更新成功",
		Data:    task,
	})
}

// DeleteTask 删除任务
func DeleteTask(c *gin.Context) {
	id := c.Param("id")
	var task models.Task
	if err := database.DB.First(&task, id).Error; err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{
			Success: false,
			Error:   "任务不存在",
		})
		return
	}

	// 删除相关进度记录
	database.DB.Where("task_id = ?", id).Delete(&models.TaskProgress{})

	if err := database.DB.Delete(&task).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   "删除任务失败",
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "任务删除成功",
	})
}

// AssignTask 分配任务
func AssignTask(c *gin.Context) {
	id := c.Param("id")
	var task models.Task
	if err := database.DB.First(&task, id).Error; err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{
			Success: false,
			Error:   "任务不存在",
		})
		return
	}

	var req models.AssignTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   "无效的请求参数",
		})
		return
	}

	// 验证用户是否存在
	var user models.User
	if err := database.DB.First(&user, req.AssigneeID).Error; err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   "指定的用户不存在",
		})
		return
	}

	task.AssigneeID = &req.AssigneeID
	if err := database.DB.Save(&task).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   "分配任务失败",
		})
		return
	}

	database.DB.Preload("Project").Preload("Assignee").Preload("Creator").First(&task, task.ID)

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "任务分配成功",
		Data:    task,
	})
}

// UpdateTaskProgress 更新任务进度
func UpdateTaskProgress(c *gin.Context) {
	id := c.Param("id")
	var task models.Task
	if err := database.DB.First(&task, id).Error; err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{
			Success: false,
			Error:   "任务不存在",
		})
		return
	}

	var req models.UpdateProgressRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   "无效的请求参数",
		})
		return
	}

	oldStatus := task.Status

	// 更新进度
	if req.Progress >= 0 && req.Progress <= 100 {
		task.Progress = req.Progress
		// 自动更新状态
		if req.Progress >= 100 {
			task.Status = models.StatusCompleted
			task.Progress = 100
		} else if req.Progress > 0 {
			task.Status = models.StatusInProgress
		} else {
			task.Status = models.StatusTodo
		}
	}

	// 如果直接指定状态
	if req.Status != "" {
		task.Status = req.Status
		if req.Status == models.StatusCompleted {
			task.Progress = 100
		}
	}

	// 记录进度变更
	progressRecord := models.TaskProgress{
		TaskID:    task.ID,
		OldStatus: oldStatus,
		NewStatus: task.Status,
		Comment:   req.Comment,
		UpdatedBy: req.UpdatedBy,
	}
	database.DB.Create(&progressRecord)

	if err := database.DB.Save(&task).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   "更新进度失败",
		})
		return
	}

	database.DB.Preload("Project").Preload("Assignee").Preload("Creator").First(&task, task.ID)

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "进度更新成功",
		Data:    task,
	})
}

// GetTaskProgress 获取任务进度历史
func GetTaskProgress(c *gin.Context) {
	id := c.Param("id")
	
	var records []models.TaskProgress
	if err := database.DB.Preload("User").Where("task_id = ?", id).Order("created_at DESC").Find(&records).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   "获取进度历史失败",
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    records,
	})
}

// AddTaskToProject 将任务添加到项目
func AddTaskToProject(c *gin.Context) {
	projectID := c.Param("id")
	
	// 验证项目是否存在
	var project models.Project
	if err := database.DB.First(&project, projectID).Error; err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{
			Success: false,
			Error:   "项目不存在",
		})
		return
	}

	var req models.CreateTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   "无效的请求参数: " + err.Error(),
		})
		return
	}

	pid, _ := strconv.ParseUint(projectID, 10, 32)
	projectIDUint := uint(pid)

	task := models.Task{
		Title:       req.Title,
		Description: req.Description,
		Priority:    req.Priority,
		ProjectID:   &projectIDUint,
		AssigneeID:  req.AssigneeID,
		CreatorID:   req.CreatorID,
		Status:      models.StatusTodo,
		Progress:    0,
	}

	if task.Priority == "" {
		task.Priority = models.PriorityMedium
	}

	if req.DueDate != "" {
		if t, err := time.Parse("2006-01-02", req.DueDate); err == nil {
			task.DueDate = &t
		}
	}

	if err := database.DB.Create(&task).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   "创建任务失败",
		})
		return
	}

	database.DB.Preload("Project").Preload("Assignee").Preload("Creator").First(&task, task.ID)

	c.JSON(http.StatusCreated, models.APIResponse{
		Success: true,
		Message: "任务已添加到项目",
		Data:    task,
	})
}

// GetProjectTasks 获取项目下的所有任务
func GetProjectTasks(c *gin.Context) {
	projectID := c.Param("id")

	var tasks []models.Task
	if err := database.DB.Preload("Assignee").Preload("Creator").
		Where("project_id = ?", projectID).
		Order("priority DESC, created_at DESC").
		Find(&tasks).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   "获取任务列表失败",
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    tasks,
	})
}

// GetDashboardStats 获取仪表盘统计数据
func GetDashboardStats(c *gin.Context) {
	var stats models.DashboardStats

	// 任务统计
	database.DB.Model(&models.Task{}).Count(&stats.TotalTasks)
	database.DB.Model(&models.Task{}).Where("status = ?", models.StatusTodo).Count(&stats.TodoTasks)
	database.DB.Model(&models.Task{}).Where("status = ?", models.StatusInProgress).Count(&stats.InProgressTasks)
	database.DB.Model(&models.Task{}).Where("status = ?", models.StatusCompleted).Count(&stats.CompletedTasks)

	// 项目和用户统计
	database.DB.Model(&models.Project{}).Count(&stats.TotalProjects)
	database.DB.Model(&models.User{}).Count(&stats.TotalUsers)

	// 过期任务
	today := time.Now().Format("2006-01-02")
	database.DB.Model(&models.Task{}).
		Where("due_date < ? AND status != ?", today, models.StatusCompleted).
		Count(&stats.OverdueTasks)

	// 今日到期任务
	database.DB.Model(&models.Task{}).
		Where("DATE(due_date) = DATE(?) AND status != ?", time.Now(), models.StatusCompleted).
		Count(&stats.TasksDueToday)

	// 最近任务
	database.DB.Preload("Project").Preload("Assignee").
		Order("created_at DESC").
		Limit(5).
		Find(&stats.RecentTasks)

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    stats,
	})
}
