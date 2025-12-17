package controllers

import (
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"golang_blog/middleware"
	"golang_blog/models"
	"golang_blog/utils"
	"gorm.io/gorm"
)

type CreatePostReq struct {
	Title   string `json:"title" binding:"required,min=1,max=200"`
	Content string `json:"content" binding:"required,min=1"`
}

type UpdatePostReq struct {
	Title   *string `json:"title" binding:"omitempty,min=1,max=200"`
	Content *string `json:"content" binding:"omitempty,min=1"`
}

func ListPosts(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var posts []models.Post
		if err := db.Preload("User").Order("created_at desc").Find(&posts).Error; err != nil {
			utils.Fail(c, 500, err.Error())
			return
		}

		resp := make([]gin.H, 0, len(posts))
		for _, p := range posts {
			resp = append(resp, gin.H{
				"id": p.ID,
				"title": p.Title,
				"content": p.Content,
				"user": gin.H{"id": p.User.ID, "username": p.User.Username},
				"created_at": p.CreatedAt,
				"updated_at": p.UpdatedAt,
			})
		}
		utils.OK(c, resp)
	}
}

func GetPost(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := strconv.ParseUint(c.Param("id"), 10, 64)
		if err != nil || id == 0 {
			utils.Fail(c, 400, "invalid id")
			return
		}
		var post models.Post
		if err := db.Preload("User").First(&post, uint(id)).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				utils.Fail(c, 404, "post not found")
				return
			}
			utils.Fail(c, 500, err.Error())
			return
		}

		utils.OK(c, gin.H{
			"id": post.ID,
			"title": post.Title,
			"content": post.Content,
			"user": gin.H{"id": post.User.ID, "username": post.User.Username},
			"created_at": post.CreatedAt,
			"updated_at": post.UpdatedAt,
		})
	}
}

func CreatePost(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		uid, ok := middleware.GetUserID(c)
		if !ok || uid == 0 {
			utils.Fail(c, 401, "unauthorized")
			return
		}

		var req CreatePostReq
		if err := c.ShouldBindJSON(&req); err != nil {
			utils.Fail(c, 400, err.Error())
			return
		}
		req.Title = strings.TrimSpace(req.Title)
		req.Content = strings.TrimSpace(req.Content)
		if req.Title == "" || req.Content == "" {
			utils.Fail(c, 400, "title/content cannot be empty")
			return
		}

		post := models.Post{Title: req.Title, Content: req.Content, UserID: uid}
		if err := db.Create(&post).Error; err != nil {
			utils.Fail(c, 500, err.Error())
			return
		}
		_ = db.Preload("User").First(&post, post.ID).Error

		utils.OK(c, gin.H{
			"id": post.ID,
			"title": post.Title,
			"content": post.Content,
			"user": gin.H{"id": post.User.ID, "username": post.User.Username},
			"created_at": post.CreatedAt,
		})
	}
}

func UpdatePost(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		uid, ok := middleware.GetUserID(c)
		if !ok || uid == 0 {
			utils.Fail(c, 401, "unauthorized")
			return
		}

		id, err := strconv.ParseUint(c.Param("id"), 10, 64)
		if err != nil || id == 0 {
			utils.Fail(c, 400, "invalid id")
			return
		}

		var post models.Post
		if err := db.First(&post, uint(id)).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				utils.Fail(c, 404, "post not found")
				return
			}
			utils.Fail(c, 500, err.Error())
			return
		}

		if post.UserID != uid {
			utils.Fail(c, 403, "forbidden: only author can update")
			return
		}

		var req UpdatePostReq
		if err := c.ShouldBindJSON(&req); err != nil {
			utils.Fail(c, 400, err.Error())
			return
		}

		updates := map[string]interface{}{}
		if req.Title != nil {
			t := strings.TrimSpace(*req.Title)
			if t == "" {
				utils.Fail(c, 400, "title cannot be empty")
				return
			}
			updates["title"] = t
		}
		if req.Content != nil {
			ct := strings.TrimSpace(*req.Content)
			if ct == "" {
				utils.Fail(c, 400, "content cannot be empty")
				return
			}
			updates["content"] = ct
		}

		if len(updates) == 0 {
			utils.Fail(c, 400, "no fields to update")
			return
		}

		if err := db.Model(&post).Updates(updates).Error; err != nil {
			utils.Fail(c, 500, err.Error())
			return
		}

		_ = db.Preload("User").First(&post, post.ID).Error
		utils.OK(c, gin.H{
			"id": post.ID,
			"title": post.Title,
			"content": post.Content,
			"user": gin.H{"id": post.User.ID, "username": post.User.Username},
			"updated_at": post.UpdatedAt,
		})
	}
}

func DeletePost(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		uid, ok := middleware.GetUserID(c)
		if !ok || uid == 0 {
			utils.Fail(c, 401, "unauthorized")
			return
		}

		id, err := strconv.ParseUint(c.Param("id"), 10, 64)
		if err != nil || id == 0 {
			utils.Fail(c, 400, "invalid id")
			return
		}

		var post models.Post
		if err := db.First(&post, uint(id)).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				utils.Fail(c, 404, "post not found")
				return
			}
			utils.Fail(c, 500, err.Error())
			return
		}

		if post.UserID != uid {
			utils.Fail(c, 403, "forbidden: only author can delete")
			return
		}

		if err := db.Delete(&post).Error; err != nil {
			utils.Fail(c, 500, err.Error())
			return
		}

		utils.OK(c, gin.H{"deleted": true})
	}
}
