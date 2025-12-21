// models/comment.go
package models

import "gorm.io/gorm"

type Comment struct {
	gorm.Model
	Content string
	UserID  uint
	PostID  uint
}
