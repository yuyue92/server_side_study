package controllers

import (
	"github.com/gin-gonic/gin"
	"golang_blog/utils"
)

func Health(c *gin.Context) {
	utils.OK(c, gin.H{"status": "ok"})
}
