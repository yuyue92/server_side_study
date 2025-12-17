package controllers

import (
	"strings"

	"github.com/gin-gonic/gin"
	"golang_blog/middleware"
	"golang_blog/models"
	"golang_blog/utils"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type RegisterReq struct {
	Username string `json:"username" binding:"required,min=3,max=50"`
	Email    string `json:"email" binding:"required,email,max=100"`
	Password string `json:"password" binding:"required,min=6,max=72"`
}

type LoginReq struct {
	Identifier string `json:"identifier" binding:"required"` // username or email
	Password   string `json:"password" binding:"required"`
}

func Register(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req RegisterReq
		if err := c.ShouldBindJSON(&req); err != nil {
			utils.Fail(c, 400, err.Error())
			return
		}
		req.Username = strings.TrimSpace(req.Username)
		req.Email = strings.TrimSpace(req.Email)
		if req.Username == "" || req.Email == "" {
			utils.Fail(c, 400, "username/email cannot be empty")
			return
		}

		// uniqueness check
		var cnt int64
		db.Model(&models.User{}).Where("username = ?", req.Username).Count(&cnt)
		if cnt > 0 {
			utils.Fail(c, 409, "username already exists")
			return
		}
		db.Model(&models.User{}).Where("email = ?", req.Email).Count(&cnt)
		if cnt > 0 {
			utils.Fail(c, 409, "email already exists")
			return
		}

		hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			utils.Fail(c, 500, "hash password failed")
			return
		}

		user := models.User{
			Username: req.Username,
			Email:    req.Email,
			Password: string(hash),
		}
		if err := db.Create(&user).Error; err != nil {
			utils.Fail(c, 500, err.Error())
			return
		}

		token, err := utils.GenerateToken(user.ID)
		if err != nil {
			utils.Fail(c, 500, "generate token failed")
			return
		}

		utils.OK(c, gin.H{
			"user": gin.H{"id": user.ID, "username": user.Username, "email": user.Email},
			"token": token,
		})
	}
}

func Login(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req LoginReq
		if err := c.ShouldBindJSON(&req); err != nil {
			utils.Fail(c, 400, err.Error())
			return
		}
		id := strings.TrimSpace(req.Identifier)
		if id == "" {
			utils.Fail(c, 400, "identifier cannot be empty")
			return
		}

		var user models.User
		if err := db.Where("username = ? OR email = ?", id, id).First(&user).Error; err != nil {
			utils.Fail(c, 401, "invalid credentials")
			return
		}

		if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
			utils.Fail(c, 401, "invalid credentials")
			return
		}

		token, err := utils.GenerateToken(user.ID)
		if err != nil {
			utils.Fail(c, 500, "generate token failed")
			return
		}

		utils.OK(c, gin.H{
			"user":  gin.H{"id": user.ID, "username": user.Username, "email": user.Email},
			"token": token,
		})
	}
}

func Profile(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		uid, ok := middleware.GetUserID(c)
		if !ok || uid == 0 {
			utils.Fail(c, 401, "unauthorized")
			return
		}

		var user models.User
		if err := db.First(&user, uid).Error; err != nil {
			utils.Fail(c, 404, "user not found")
			return
		}

		utils.OK(c, gin.H{
			"id":       user.ID,
			"username": user.Username,
			"email":    user.Email,
			"created_at": user.CreatedAt,
		})
	}
}
