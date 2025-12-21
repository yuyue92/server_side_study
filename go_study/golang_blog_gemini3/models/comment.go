package models

import "gorm.io/gorm"

type Comment struct {
	gorm.Model
	Content string `gorm:"not null" json:"content"`
	UserID  uint   `gorm:"not null" json:"user_id"`
	PostID  uint   `gorm:"not null" json:"post_id"`
	User    User   `json:"user"`
}
