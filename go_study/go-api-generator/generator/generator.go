package generator

import (
	"fmt"
	"go-api-generator/models"
	"os"
	"path/filepath"
	"strings"
	"unicode"
)

// Generator 代码生成器
type Generator struct {
	Config    *models.SchemaConfig
	OutputDir string
	ModName   string // 生成项目的 Go module 名称
	Models    []models.GoModel
	Relations []models.GoRelation
}

// NewGenerator 创建代码生成器
func NewGenerator(config *models.SchemaConfig, outputDir, modName string) *Generator {
	return &Generator{
		Config:    config,
		OutputDir: outputDir,
		ModName:   modName,
	}
}

// Generate 执行完整的代码生成流程
func (g *Generator) Generate() error {
	fmt.Println("🚀 开始生成项目代码...")

	// 第1步: 转换数据模型
	fmt.Println("  [1/7] 转换数据模型...")
	g.transformModels()

	// 第2步: 创建目录结构
	fmt.Println("  [2/7] 创建目录结构...")
	if err := g.createDirectories(); err != nil {
		return fmt.Errorf("创建目录失败: %w", err)
	}

	// 第3步: 生成 go.mod
	fmt.Println("  [3/7] 生成 go.mod...")
	if err := g.generateGoMod(); err != nil {
		return fmt.Errorf("生成 go.mod 失败: %w", err)
	}

	// 第4步: 生成模型层代码
	fmt.Println("  [4/7] 生成模型层代码...")
	if err := g.generateModels(); err != nil {
		return fmt.Errorf("生成模型层失败: %w", err)
	}

	// 第5步: 生成数据库层代码
	fmt.Println("  [5/7] 生成数据库层代码...")
	if err := g.generateDatabase(); err != nil {
		return fmt.Errorf("生成数据库层失败: %w", err)
	}

	// 第6步: 生成处理器层代码
	fmt.Println("  [6/7] 生成处理器层代码...")
	if err := g.generateHandlers(); err != nil {
		return fmt.Errorf("生成处理器层失败: %w", err)
	}

	// 第7步: 生成路由和主入口
	fmt.Println("  [7/7] 生成路由和主入口...")
	if err := g.generateRouter(); err != nil {
		return fmt.Errorf("生成路由失败: %w", err)
	}
	if err := g.generateMain(); err != nil {
		return fmt.Errorf("生成主入口失败: %w", err)
	}

	fmt.Println("✅ 代码生成完成！")
	fmt.Printf("   输出目录: %s\n", g.OutputDir)
	fmt.Println("   启动方式:")
	fmt.Printf("     cd %s\n", g.OutputDir)
	fmt.Println("     go mod tidy")
	fmt.Println("     go run main.go")
	return nil
}

// transformModels 将配置转换为 Go 中间模型
func (g *Generator) transformModels() {
	for _, table := range g.Config.Tables {
		goModel := models.GoModel{
			Name:        ToPascalCase(table.Name),
			TableName:   table.Name,
			Description: table.Description,
			PrimaryKey:  ToPascalCase(table.PrimaryKey),
		}

		for _, field := range table.Fields {
			goField := models.GoField{
				GoName:   ToPascalCase(field.Name),
				JsonName: field.Name,
				GoType:   mapGoType(field),
				GormTag:  buildGormTag(field, table.PrimaryKey),
				JsonTag:  field.Name,
				Comment:  field.Comment,
			}

			if goField.GoType == "time.Time" {
				goModel.HasTime = true
			}

			// 构建验证标签
			goField.ValidateTag = buildValidateTag(field)

			goModel.Fields = append(goModel.Fields, goField)
		}

		// 添加公共字段: created_at, updated_at
		goModel.Fields = append(goModel.Fields,
			models.GoField{
				GoName:  "CreatedAt",
				JsonName: "created_at",
				GoType:  "time.Time",
				GormTag: "autoCreateTime",
				JsonTag: "created_at",
				Comment: "创建时间",
			},
			models.GoField{
				GoName:  "UpdatedAt",
				JsonName: "updated_at",
				GoType:  "time.Time",
				GormTag: "autoUpdateTime",
				JsonTag: "updated_at",
				Comment: "更新时间",
			},
		)
		goModel.HasTime = true

		g.Models = append(g.Models, goModel)
	}

	// 转换关系
	for _, rel := range g.Config.Relations {
		g.Relations = append(g.Relations, models.GoRelation{
			FromModel:    ToPascalCase(rel.From),
			ToModel:      ToPascalCase(rel.To),
			Type:         rel.Type,
			ForeignKey:   ToPascalCase(rel.ForeignKey),
			ReferenceKey: ToPascalCase(rel.ReferenceKey),
		})
	}
}

// createDirectories 创建输出目录结构
func (g *Generator) createDirectories() error {
	dirs := []string{
		filepath.Join(g.OutputDir, "models"),
		filepath.Join(g.OutputDir, "database"),
		filepath.Join(g.OutputDir, "handlers"),
		filepath.Join(g.OutputDir, "router"),
		filepath.Join(g.OutputDir, "middleware"),
		filepath.Join(g.OutputDir, "utils"),
	}
	for _, dir := range dirs {
		if err := os.MkdirAll(dir, 0755); err != nil {
			return err
		}
	}
	return nil
}

// writeFile 辅助方法: 写入文件
func (g *Generator) writeFile(relPath, content string) error {
	fullPath := filepath.Join(g.OutputDir, relPath)
	dir := filepath.Dir(fullPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}
	return os.WriteFile(fullPath, []byte(content), 0644)
}

// ===================== 工具函数 =====================

// ToPascalCase 将 snake_case 转换为 PascalCase
func ToPascalCase(s string) string {
	parts := strings.FieldsFunc(s, func(r rune) bool {
		return r == '_' || r == '-' || r == ' '
	})
	var result strings.Builder
	for _, part := range parts {
		if len(part) == 0 {
			continue
		}
		// 处理常见缩写
		upper := strings.ToUpper(part)
		commonAbbrs := map[string]bool{
			"ID": true, "UUID": true, "URL": true, "API": true,
			"HTTP": true, "JSON": true, "XML": true, "SQL": true,
			"IP": true, "HTML": true, "CSS": true,
		}
		if commonAbbrs[upper] {
			result.WriteString(upper)
		} else {
			runes := []rune(part)
			runes[0] = unicode.ToUpper(runes[0])
			result.WriteString(string(runes))
		}
	}
	return result.String()
}

// ToCamelCase 将 snake_case 转换为 camelCase
func ToCamelCase(s string) string {
	pascal := ToPascalCase(s)
	if len(pascal) == 0 {
		return pascal
	}
	// 处理开头连续大写的缩写
	runes := []rune(pascal)
	if len(runes) > 1 && unicode.IsUpper(runes[1]) {
		// 类似 ID, UUID 这样的, 全部小写开头
		i := 0
		for i < len(runes) && unicode.IsUpper(runes[i]) {
			i++
		}
		if i == len(runes) {
			return strings.ToLower(pascal)
		}
		for j := 0; j < i-1; j++ {
			runes[j] = unicode.ToLower(runes[j])
		}
		return string(runes)
	}
	runes[0] = unicode.ToLower(runes[0])
	return string(runes)
}

// mapGoType 将配置中的类型映射为 Go 类型
func mapGoType(field models.Field) string {
	switch field.Type {
	case "number":
		return "int64"
	case "float":
		return "float64"
	case "string":
		return "string"
	case "text":
		return "string"
	case "boolean":
		return "bool"
	case "date":
		return "time.Time"
	default:
		return "string"
	}
}

// buildGormTag 构建 GORM 标签
func buildGormTag(field models.Field, primaryKey string) string {
	var parts []string

	if field.Name == primaryKey {
		parts = append(parts, "primaryKey")
	}
	parts = append(parts, fmt.Sprintf("column:%s", field.Name))

	if field.Type == "string" && field.Length > 0 {
		parts = append(parts, fmt.Sprintf("type:varchar(%d)", field.Length))
	} else if field.Type == "text" {
		parts = append(parts, "type:text")
	} else if field.Type == "number" {
		parts = append(parts, "type:integer")
	} else if field.Type == "float" {
		parts = append(parts, "type:real")
	} else if field.Type == "boolean" {
		parts = append(parts, "type:boolean")
	} else if field.Type == "date" {
		parts = append(parts, "type:datetime")
	}

	if field.AutoIncrement {
		parts = append(parts, "autoIncrement")
	}
	if field.Unique {
		parts = append(parts, "uniqueIndex")
	}
	if field.Required {
		parts = append(parts, "not null")
	}
	if field.Comment != "" {
		parts = append(parts, fmt.Sprintf("comment:%s", field.Comment))
	}

	return strings.Join(parts, ";")
}

// buildValidateTag 构建验证标签
func buildValidateTag(field models.Field) string {
	var parts []string

	if field.Required && !field.AutoIncrement {
		parts = append(parts, "required")
	}
	if field.Format == "email" {
		parts = append(parts, "email")
	}
	if field.Format == "url" {
		parts = append(parts, "url")
	}
	if field.Format == "uuid" {
		parts = append(parts, "uuid")
	}
	if field.Length > 0 && field.Type == "string" {
		parts = append(parts, fmt.Sprintf("max=%d", field.Length))
	}

	if len(parts) == 0 {
		return ""
	}
	return strings.Join(parts, ",")
}


