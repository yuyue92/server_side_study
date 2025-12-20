package config

import (
	"golang_blog/models"
	"log"
	"os"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

// InitDB 初始化数据库连接
func InitDB() error {
	// 使用 SQLite 数据库，数据文件保存在当前目录
	dbPath := "./blog.db"

	var err error
	DB, err = gorm.Open(sqlite.Open(dbPath), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})

	if err != nil {
		return err
	}

	log.Printf("SQLite 数据库连接成功，数据库文件：%s", dbPath)

	// 自动迁移数据库表
	err = DB.AutoMigrate(
		&models.User{},
		&models.Post{},
		&models.Comment{},
	)

	if err != nil {
		return err
	}

	log.Println("数据库表迁移成功")

	// 输出数据库文件位置提示
	absPath, _ := os.Getwd()
	log.Printf("数据库文件完整路径：%s/blog.db", absPath)
	log.Println("提示：如需重置数据库，请删除 blog.db 文件后重新启动程序")

	return nil
}

// GetDB 获取数据库实例
func GetDB() *gorm.DB {
	return DB
}
