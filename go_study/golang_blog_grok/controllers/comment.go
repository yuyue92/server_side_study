// controllers/comment.go
package controllers

import (
	"golang_blog/models"
	"golang_blog/utils"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type CommentInput struct {
	Content string `json:"content" binding:"required"`
}

func GetComments(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		postID, err := strconv.ParseUint(c.Param("post_id"), 10, 32)
		if err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, "Invalid post ID")
			return
		}

		var comments []models.Comment
		if err := db.Where("post_id = ?", postID).Find(&comments).Error; err != nil {
			utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve comments")
			return
		}
		utils.SuccessResponse(c, http.StatusOK, comments)
	}
}

func CreateComment(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetUint("userID")
		postID, err := strconv.ParseUint(c.Param("post_id"), 10, 32)
		if err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, "Invalid post ID")
			return
		}

		var input CommentInput
		if err := c.ShouldBindJSON(&input); err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, "Invalid input")
			return
		}

		comment := models.Comment{
			Content: input.Content,
			UserID:  userID,
			PostID:  uint(postID),
		}

		if err := db.Create(&comment).Error; err != nil {
			utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to create comment")
			return
		}

		utils.SuccessResponse(c, http.StatusCreated, comment)
	}
}
