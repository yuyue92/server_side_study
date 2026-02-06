package generator

import (
	"fmt"
)

// generateGoMod 生成 go.mod 文件
// 策略：只声明三个直接依赖，间接依赖交给 go mod tidy 自动解析
// 这样可以彻底避免 pseudo-version 锁定失效的问题（如 chenzhuoyu/base64x）
func (g *Generator) generateGoMod() error {
	content := fmt.Sprintf(`module %s

go 1.22

require (
	github.com/gin-gonic/gin v1.10.0
	github.com/glebarez/sqlite v1.11.0
	gorm.io/gorm v1.25.12
)
`, g.ModName)

	return g.writeFile("go.mod", content)
}

// generateMain 生成主入口文件
func (g *Generator) generateMain() error {
	content := fmt.Sprintf(`package main

import (
	"flag"
	"fmt"
	"log"

	"%s/database"
	"%s/router"
)

func main() {
	// 命令行参数
	port := flag.String("port", "8080", "服务端口")
	dbPath := flag.String("db", "data.db", "SQLite数据库文件路径")
	flag.Parse()

	// 初始化数据库
	if err := database.InitDB(*dbPath); err != nil {
		log.Fatalf("数据库初始化失败: %%v", err)
	}

	// 配置路由
	r := router.SetupRouter()

	// 启动服务
	addr := fmt.Sprintf(":%%s", *port)
	log.Printf("🚀 服务启动成功，监听地址: http://localhost:%%s", *port)
	log.Printf("📋 健康检查: http://localhost:%%s/health", *port)
	log.Printf("📖 API基础路径: http://localhost:%%s/api/v1", *port)
	log.Println("========================================")
`, g.ModName, g.ModName)

	// 打印路由信息
	for _, model := range g.Models {
		content += fmt.Sprintf("\tlog.Println(\"  📁 %s: /api/v1/%ss\")\n",
			model.Description, model.TableName)
	}

	content += fmt.Sprintf(`
	log.Println("========================================")

	if err := r.Run(addr); err != nil {
		log.Fatalf("服务启动失败: %%v", err)
	}
}
`)

	// 生成 utils
	utilsCode := `package utils

import (
	"crypto/rand"
	"fmt"
)

// GenerateUUID 生成简单的UUID v4
func GenerateUUID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
		b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}
`
	_ = g.writeFile("utils/utils.go", utilsCode)

	return g.writeFile("main.go", content)
}
