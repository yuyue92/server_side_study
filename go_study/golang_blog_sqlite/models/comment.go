package models

type Comment struct {
	BaseModel
	Content string `gorm:"type:text;not null" json:"content"`

	UserID uint `gorm:"not null;index" json:"user_id"`
	User   User `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"user"`

	PostID uint `gorm:"not null;index" json:"post_id"`
	Post   Post `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"-"`
}
