// controllers/post.go
package controllers

import (
	"golang_blog/models"
	"golang_blog/utils"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type PostInput struct {
	Title   string `json:"title" binding:"required"`
	Content string `json:"content" binding:"required"`
}

func GetPosts(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var posts []models.Post
		if err := db.Find(&posts).Error; err != nil {
			utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve posts")
			return
		}
		utils.SuccessResponse(c, http.StatusOK, posts)
	}
}

func GetPost(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := strconv.ParseUint(c.Param("id"), 10, 32)
		if err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, "Invalid post ID")
			return
		}

		var post models.Post
		if err := db.First(&post, id).Error; err != nil {
			utils.ErrorResponse(c, http.StatusNotFound, "Post not found")
			return
		}
		utils.SuccessResponse(c, http.StatusOK, post)
	}
}

func CreatePost(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetUint("userID")
		var input PostInput
		if err := c.ShouldBindJSON(&input); err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, "Invalid input")
			return
		}

		post := models.Post{
			Title:   input.Title,
			Content: input.Content,
			UserID:  userID,
		}

		if err := db.Create(&post).Error; err != nil {
			utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to create post")
			return
		}

		utils.SuccessResponse(c, http.StatusCreated, post)
	}
}

func UpdatePost(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetUint("userID")
		id, err := strconv.ParseUint(c.Param("id"), 10, 32)
		if err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, "Invalid post ID")
			return
		}

		var post models.Post
		if err := db.First(&post, id).Error; err != nil {
			utils.ErrorResponse(c, http.StatusNotFound, "Post not found")
			return
		}

		if post.UserID != userID {
			utils.ErrorResponse(c, http.StatusForbidden, "You are not authorized to update this post")
			return
		}

		var input PostInput
		if err := c.ShouldBindJSON(&input); err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, "Invalid input")
			return
		}

		post.Title = input.Title
		post.Content = input.Content

		if err := db.Save(&post).Error; err != nil {
			utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to update post")
			return
		}

		utils.SuccessResponse(c, http.StatusOK, post)
	}
}

func DeletePost(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetUint("userID")
		id, err := strconv.ParseUint(c.Param("id"), 10, 32)
		if err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, "Invalid post ID")
			return
		}

		var post models.Post
		if err := db.First(&post, id).Error; err != nil {
			utils.ErrorResponse(c, http.StatusNotFound, "Post not found")
			return
		}

		if post.UserID != userID {
			utils.ErrorResponse(c, http.StatusForbidden, "You are not authorized to delete this post")
			return
		}

		if err := db.Delete(&post).Error; err != nil {
			utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to delete post")
			return
		}

		utils.SuccessResponse(c, http.StatusOK, gin.H{"message": "Post deleted successfully"})
	}
}
