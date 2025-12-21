// models/post.go
package models

import "gorm.io/gorm"

type Post struct {
	gorm.Model
	Title   string
	Content string
	UserID  uint
}
