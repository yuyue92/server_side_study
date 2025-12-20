package main

import (
	"embed"
	"golang_blog/config"
	"golang_blog/routes"
	"io/fs"
	"log"
	"net/http"
	"os/exec"
	"runtime"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// 把 web 目录下所有文件打进二进制
//
// 目录要求：项目根目录存在 web/，且至少包含 web/blogIndex.html
//
//go:embed web/*
var embeddedWeb embed.FS

func openBrowser(url string) {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
	case "darwin":
		cmd = exec.Command("open", url)
	default:
		cmd = exec.Command("xdg-open", url)
	}
	_ = cmd.Start()
}

func waitForServer(url string, timeout time.Duration) {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		resp, err := http.Get(url)
		if err == nil {
			_ = resp.Body.Close()
			return
		}
		time.Sleep(150 * time.Millisecond)
	}
}

func main() {
	// 初始化数据库连接
	if err := config.InitDB(); err != nil {
		log.Fatal("数据库连接失败:", err)
	}

	r := gin.Default()

	// CORS
	corsCfg := cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Content-Length", "Accept-Encoding", "Authorization", "X-Requested-With"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: false,
		MaxAge:           12 * 3600,
	}
	r.Use(cors.New(corsCfg))

	// 取出 embeddedWeb 里的 web/ 子目录作为静态根
	webRoot, err := fs.Sub(embeddedWeb, "web")
	if err != nil {
		log.Fatal("读取 embed web/ 失败:", err)
	}

	// 设置路由（把 webRoot 传入 routes）
	routes.SetupRoutes(r, webRoot)

	addr := ":8080"
	url := "http://localhost:8080/"

	go func() {
		log.Println("服务器启动在", url)
		if err := r.Run(addr); err != nil {
			log.Fatal("服务器启动失败:", err)
		}
	}()

	waitForServer(url, 3*time.Second)
	openBrowser(url)

	select {}
}
