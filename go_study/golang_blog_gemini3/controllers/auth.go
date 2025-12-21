package controllers

import (
	"golang_blog/config"
	"golang_blog/models"
	"golang_blog/utils"
	"net/http"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

type RegisterInput struct {
	Username string `json:"username" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

type LoginInput struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

func Register(c *gin.Context) {
	var input RegisterInput
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ResponseError(c, http.StatusBadRequest, err.Error())
		return
	}

	// 密码加密
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)

	user := models.User{Username: input.Username, Email: input.Email, Password: string(hashedPassword)}
	if err := config.DB.Create(&user).Error; err != nil {
		utils.ResponseError(c, http.StatusInternalServerError, "Failed to create user (email/username might exist)")
		return
	}

	utils.ResponseSuccess(c, "User registered successfully")
}

func Login(c *gin.Context) {
	var input LoginInput
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ResponseError(c, http.StatusBadRequest, err.Error())
		return
	}

	var user models.User
	if err := config.DB.Where("email = ?", input.Email).First(&user).Error; err != nil {
		utils.ResponseError(c, http.StatusUnauthorized, "Invalid credentials")
		return
	}

	// 验证密码
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.Password)); err != nil {
		utils.ResponseError(c, http.StatusUnauthorized, "Invalid credentials")
		return
	}

	// 生成 Token
	token, _ := utils.GenerateToken(user.ID)
	utils.ResponseSuccess(c, gin.H{"token": token})
}

func GetProfile(c *gin.Context) {
	userID, _ := c.Get("userID")
	var user models.User
	if err := config.DB.First(&user, userID).Error; err != nil {
		utils.ResponseError(c, http.StatusNotFound, "User not found")
		return
	}
	utils.ResponseSuccess(c, user)
}
