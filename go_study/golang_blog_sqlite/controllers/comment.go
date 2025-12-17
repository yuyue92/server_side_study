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

type CreateCommentReq struct {
	Content string `json:"content" binding:"required,min=1"`
}

func ListCommentsByPost(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		pid, err := strconv.ParseUint(c.Param("post_id"), 10, 64)
		if err != nil || pid == 0 {
			utils.Fail(c, 400, "invalid post_id")
			return
		}

		// Ensure post exists (optional but nicer)
		var post models.Post
		if err := db.First(&post, uint(pid)).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				utils.Fail(c, 404, "post not found")
				return
			}
			utils.Fail(c, 500, err.Error())
			return
		}

		var comments []models.Comment
		if err := db.Preload("User").
			Where("post_id = ?", uint(pid)).
			Order("created_at asc").
			Find(&comments).Error; err != nil {
			utils.Fail(c, 500, err.Error())
			return
		}

		resp := make([]gin.H, 0, len(comments))
		for _, cm := range comments {
			resp = append(resp, gin.H{
				"id": cm.ID,
				"content": cm.Content,
				"user": gin.H{"id": cm.User.ID, "username": cm.User.Username},
				"post_id": cm.PostID,
				"created_at": cm.CreatedAt,
			})
		}
		utils.OK(c, resp)
	}
}

func CreateComment(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		uid, ok := middleware.GetUserID(c)
		if !ok || uid == 0 {
			utils.Fail(c, 401, "unauthorized")
			return
		}

		pid, err := strconv.ParseUint(c.Param("post_id"), 10, 64)
		if err != nil || pid == 0 {
			utils.Fail(c, 400, "invalid post_id")
			return
		}

		// Ensure post exists
		var post models.Post
		if err := db.First(&post, uint(pid)).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				utils.Fail(c, 404, "post not found")
				return
			}
			utils.Fail(c, 500, err.Error())
			return
		}

		var req CreateCommentReq
		if err := c.ShouldBindJSON(&req); err != nil {
			utils.Fail(c, 400, err.Error())
			return
		}
		req.Content = strings.TrimSpace(req.Content)
		if req.Content == "" {
			utils.Fail(c, 400, "content cannot be empty")
			return
		}

		comment := models.Comment{
			Content: req.Content,
			UserID:  uid,
			PostID:  uint(pid),
		}

		if err := db.Create(&comment).Error; err != nil {
			utils.Fail(c, 500, err.Error())
			return
		}
		_ = db.Preload("User").First(&comment, comment.ID).Error

		utils.OK(c, gin.H{
			"id": comment.ID,
			"content": comment.Content,
			"user": gin.H{"id": comment.User.ID, "username": comment.User.Username},
			"post_id": comment.PostID,
			"created_at": comment.CreatedAt,
		})
	}
}
