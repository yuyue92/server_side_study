package config

import (
	"os"
	"path/filepath"

	"golang_blog/models"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func InitDB() (*gorm.DB, error) {
	path := os.Getenv("DB_PATH")
	if path == "" {
		path = "./data/blog.db"
	}

	// Ensure directory exists
	dir := filepath.Dir(path)
	if dir != "." {
		_ = os.MkdirAll(dir, 0o755)
	}

	db, err := gorm.Open(sqlite.Open(path), &gorm.Config{})
	if err != nil {
		return nil, err
	}

	// Enable foreign keys on SQLite
	_ = db.Exec("PRAGMA foreign_keys = ON").Error

	if err := db.AutoMigrate(&models.User{}, &models.Post{}, &models.Comment{}); err != nil {
		return nil, err
	}
	return db, nil
}
