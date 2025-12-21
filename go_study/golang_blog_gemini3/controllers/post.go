package controllers

import (
	"golang_blog/config"
	"golang_blog/models"
	"golang_blog/utils"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type CreatePostInput struct {
	Title   string `json:"title" binding:"required"`
	Content string `json:"content" binding:"required"`
}

func GetPosts(c *gin.Context) {
	// 1. 获取参数
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	size, _ := strconv.Atoi(c.DefaultQuery("size", "5"))
	keyword := c.Query("keyword")

	var posts []models.Post
	var total int64
	db := config.DB.Model(&models.Post{})

	// 2. 模糊查询过滤 (标题或内容)
	if keyword != "" {
		db = db.Where("title LIKE ? OR content LIKE ?", "%"+keyword+"%", "%"+keyword+"%")
	}

	// 3. 计算总数 (用于前端分页显示)
	db.Count(&total)

	// 4. 执行分页查询
	offset := (page - 1) * size
	err := db.Offset(offset).Limit(size).Order("created_at DESC").Preload("User").Find(&posts).Error

	if err != nil {
		utils.ResponseError(c, http.StatusInternalServerError, "查询失败")
		return
	}

	// 5. 返回数据及分页元信息
	utils.ResponseSuccess(c, gin.H{
		"list":  posts,
		"total": total,
		"page":  page,
		"size":  size,
	})
}

func GetPostDetail(c *gin.Context) {
	id := c.Param("id")
	var post models.Post
	if err := config.DB.Preload("User").First(&post, id).Error; err != nil {
		utils.ResponseError(c, http.StatusNotFound, "Post not found")
		return
	}
	utils.ResponseSuccess(c, post)
}

func CreatePost(c *gin.Context) {
	var input CreatePostInput
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ResponseError(c, http.StatusBadRequest, err.Error())
		return
	}

	userID, _ := c.Get("userID")
	post := models.Post{
		Title:   input.Title,
		Content: input.Content,
		UserID:  userID.(uint),
	}

	config.DB.Create(&post)
	utils.ResponseSuccess(c, post)
}

func UpdatePost(c *gin.Context) {
	id := c.Param("id")
	userID, _ := c.Get("userID")

	var post models.Post
	if err := config.DB.First(&post, id).Error; err != nil {
		utils.ResponseError(c, http.StatusNotFound, "Post not found")
		return
	}

	// 权限检查：只有作者可以修改
	if post.UserID != userID.(uint) {
		utils.ResponseError(c, http.StatusForbidden, "You are not allowed to update this post")
		return
	}

	var input CreatePostInput
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ResponseError(c, http.StatusBadRequest, err.Error())
		return
	}

	config.DB.Model(&post).Updates(input)
	utils.ResponseSuccess(c, post)
}

func DeletePost(c *gin.Context) {
	id := c.Param("id")
	userID, _ := c.Get("userID")

	var post models.Post
	if err := config.DB.First(&post, id).Error; err != nil {
		utils.ResponseError(c, http.StatusNotFound, "Post not found")
		return
	}

	// 权限检查
	if post.UserID != userID.(uint) {
		utils.ResponseError(c, http.StatusForbidden, "You are not allowed to delete this post")
		return
	}

	config.DB.Delete(&post)
	utils.ResponseSuccess(c, "Post deleted successfully")
}
