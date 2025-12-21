package controllers

import (
	"golang_blog/config"
	"golang_blog/models"
	"golang_blog/utils"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type CreateCommentInput struct {
	Content string `json:"content" binding:"required"`
}

func GetComments(c *gin.Context) {
	postID := c.Param("post_id")
	var comments []models.Comment
	// 查找指定文章下的所有评论，并加载评论者信息
	config.DB.Where("post_id = ?", postID).Preload("User").Find(&comments)
	utils.ResponseSuccess(c, comments)
}

func CreateComment(c *gin.Context) {
	postIDStr := c.Param("post_id")
	postID, _ := strconv.Atoi(postIDStr) // 简单转换，实际应处理错误

	var input CreateCommentInput
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ResponseError(c, http.StatusBadRequest, err.Error())
		return
	}

	// 检查文章是否存在
	var post models.Post
	if err := config.DB.First(&post, postID).Error; err != nil {
		utils.ResponseError(c, http.StatusNotFound, "Post not found")
		return
	}

	userID, _ := c.Get("userID")
	comment := models.Comment{
		Content: input.Content,
		PostID:  uint(postID),
		UserID:  userID.(uint),
	}

	config.DB.Create(&comment)
	utils.ResponseSuccess(c, comment)
}
