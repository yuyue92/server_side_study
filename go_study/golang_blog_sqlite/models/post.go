package models

type Post struct {
	BaseModel
	Title   string `gorm:"size:200;not null" json:"title"`
	Content string `gorm:"type:text;not null" json:"content"`

	UserID uint `gorm:"not null;index" json:"user_id"`
	User   User `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"user"`

	Comments []Comment `json:"-"`
}
