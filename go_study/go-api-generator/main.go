package main

import (
	"flag"
	"fmt"
	"go-api-generator/config"
	"go-api-generator/generator"
	"log"
	"os"
)

func main() {
	// 命令行参数
	configFile := flag.String("config", "examples/schema.json", "JSON配置文件路径")
	outputDir := flag.String("output", "output", "输出目录")
	modName := flag.String("mod", "generated-api", "生成项目的Go Module名称")
	flag.Parse()

	fmt.Println("╔══════════════════════════════════════════════╗")
	fmt.Println("║       Go API Generator v1.0                 ║")
	fmt.Println("║  基于JSON配置自动生成Gin+SQLite3后端服务     ║")
	fmt.Println("╚══════════════════════════════════════════════╝")
	fmt.Println()

	// 检查配置文件是否存在
	if _, err := os.Stat(*configFile); os.IsNotExist(err) {
		log.Fatalf("❌ 配置文件不存在: %s", *configFile)
	}

	// 第1步: 解析配置文件
	fmt.Printf("📖 解析配置文件: %s\n", *configFile)
	parser := config.NewParser()
	schemaConfig, err := parser.ParseFile(*configFile)
	if err != nil {
		log.Fatalf("❌ 解析失败: %v", err)
	}
	fmt.Printf("   ✅ 成功解析 %d 个表, %d 个关系\n", len(schemaConfig.Tables), len(schemaConfig.Relations))
	for _, t := range schemaConfig.Tables {
		fmt.Printf("      - %s (%s): %d 个字段\n", t.Name, t.Description, len(t.Fields))
	}
	fmt.Println()

	// 第2步: 代码生成
	gen := generator.NewGenerator(schemaConfig, *outputDir, *modName)
	if err := gen.Generate(); err != nil {
		log.Fatalf("❌ 代码生成失败: %v", err)
	}

	fmt.Println()
	fmt.Println("╔══════════════════════════════════════════════╗")
	fmt.Println("║  生成完成! 按以下步骤启动服务:               ║")
	fmt.Println("╠══════════════════════════════════════════════╣")
	fmt.Printf("║  1. cd %s\n", *outputDir)
	fmt.Println("║  2. go mod tidy")
	fmt.Println("║  3. go run main.go")
	fmt.Println("║  4. 访问 http://localhost:8080/health")
	fmt.Println("╚══════════════════════════════════════════════╝")
}
