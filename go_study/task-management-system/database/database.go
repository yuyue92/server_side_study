package database

import (
	"log"
	"task-management-system/models"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

// InitDB 初始化数据库连接
func InitDB(dbPath string) error {
	var err error
	DB, err = gorm.Open(sqlite.Open(dbPath), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return err
	}

	// 自动迁移
	err = DB.AutoMigrate(
		&models.User{},
		&models.Project{},
		&models.Task{},
		&models.TaskProgress{},
	)
	if err != nil {
		return err
	}

	// 初始化测试数据
	initSampleData()

	log.Println("数据库初始化成功")
	return nil
}

// initSampleData 初始化示例数据
func initSampleData() {
	var userCount int64
	DB.Model(&models.User{}).Count(&userCount)
	if userCount > 0 {
		return // 已有数据，跳过初始化
	}

	log.Println("初始化示例数据...")

	// 创建用户
	users := []models.User{
		{Username: "admin", Email: "admin@example.com", Role: models.RoleAdmin},
		{Username: "张经理", Email: "zhang@example.com", Role: models.RoleProjectManager},
		{Username: "李四", Email: "li@example.com", Role: models.RoleTeamMember},
		{Username: "王五", Email: "wang@example.com", Role: models.RoleTeamMember},
		{Username: "赵六", Email: "zhao@example.com", Role: models.RoleTeamMember},
	}
	DB.Create(&users)

	// 创建项目
	startDate := time.Now()
	endDate := time.Now().AddDate(0, 3, 0)
	projects := []models.Project{
		{
			Name:        "电商平台开发",
			Description: "开发一个全功能的电商平台，包括商品管理、订单处理、支付集成等功能",
			Status:      models.ProjectInProgress,
			ManagerID:   &users[1].ID,
			StartDate:   &startDate,
			EndDate:     &endDate,
		},
		{
			Name:        "移动端APP重构",
			Description: "对现有移动应用进行技术重构，提升性能和用户体验",
			Status:      models.ProjectPlanning,
			ManagerID:   &users[1].ID,
			StartDate:   &startDate,
			EndDate:     &endDate,
		},
		{
			Name:        "数据分析平台",
			Description: "建设企业级数据分析平台，支持多维度数据可视化",
			Status:      models.ProjectInProgress,
			ManagerID:   &users[1].ID,
			StartDate:   &startDate,
			EndDate:     &endDate,
		},
	}
	DB.Create(&projects)

	// 创建任务
	dueDate1 := time.Now().AddDate(0, 0, 7)
	dueDate2 := time.Now().AddDate(0, 0, 14)
	dueDate3 := time.Now().AddDate(0, 0, -1) // 过期任务
	dueDate4 := time.Now()                   // 今日到期

	tasks := []models.Task{
		{
			Title:       "设计数据库架构",
			Description: "根据需求文档设计电商平台的数据库表结构",
			Status:      models.StatusCompleted,
			Priority:    models.PriorityHigh,
			ProjectID:   &projects[0].ID,
			AssigneeID:  &users[2].ID,
			CreatorID:   &users[1].ID,
			DueDate:     &dueDate1,
			Progress:    100,
		},
		{
			Title:       "实现用户认证模块",
			Description: "开发用户注册、登录、权限验证等功能",
			Status:      models.StatusInProgress,
			Priority:    models.PriorityHigh,
			ProjectID:   &projects[0].ID,
			AssigneeID:  &users[3].ID,
			CreatorID:   &users[1].ID,
			DueDate:     &dueDate2,
			Progress:    60,
		},
		{
			Title:       "商品列表页面开发",
			Description: "开发商品浏览、搜索、筛选功能",
			Status:      models.StatusTodo,
			Priority:    models.PriorityMedium,
			ProjectID:   &projects[0].ID,
			AssigneeID:  &users[4].ID,
			CreatorID:   &users[1].ID,
			DueDate:     &dueDate3,
			Progress:    0,
		},
		{
			Title:       "购物车功能实现",
			Description: "实现购物车的增删改查功能",
			Status:      models.StatusTodo,
			Priority:    models.PriorityMedium,
			ProjectID:   &projects[0].ID,
			AssigneeID:  &users[2].ID,
			CreatorID:   &users[1].ID,
			DueDate:     &dueDate4,
			Progress:    0,
		},
		{
			Title:       "APP性能分析",
			Description: "分析现有APP的性能瓶颈，输出分析报告",
			Status:      models.StatusInProgress,
			Priority:    models.PriorityHigh,
			ProjectID:   &projects[1].ID,
			AssigneeID:  &users[3].ID,
			CreatorID:   &users[1].ID,
			DueDate:     &dueDate1,
			Progress:    30,
		},
		{
			Title:       "制定重构方案",
			Description: "基于性能分析结果制定详细的重构方案",
			Status:      models.StatusTodo,
			Priority:    models.PriorityHigh,
			ProjectID:   &projects[1].ID,
			AssigneeID:  &users[2].ID,
			CreatorID:   &users[1].ID,
			DueDate:     &dueDate2,
			Progress:    0,
		},
		{
			Title:       "数据源接入",
			Description: "接入多个数据源，包括MySQL、MongoDB、API等",
			Status:      models.StatusInProgress,
			Priority:    models.PriorityMedium,
			ProjectID:   &projects[2].ID,
			AssigneeID:  &users[4].ID,
			CreatorID:   &users[1].ID,
			DueDate:     &dueDate1,
			Progress:    45,
		},
		{
			Title:       "图表组件开发",
			Description: "开发可复用的数据可视化图表组件",
			Status:      models.StatusTodo,
			Priority:    models.PriorityLow,
			ProjectID:   &projects[2].ID,
			AssigneeID:  &users[3].ID,
			CreatorID:   &users[1].ID,
			DueDate:     &dueDate2,
			Progress:    0,
		},
	}
	DB.Create(&tasks)

	log.Println("示例数据初始化完成")
}

// GetDB 获取数据库实例
func GetDB() *gorm.DB {
	return DB
}
