package generator

import (
	"fmt"
	"go-api-generator/models"
	"strings"
)

// generateModels 生成模型层代码
func (g *Generator) generateModels() error {
	for _, model := range g.Models {
		code := g.buildModelCode(model)
		filename := fmt.Sprintf("models/%s.go", strings.ToLower(model.TableName))
		if err := g.writeFile(filename, code); err != nil {
			return fmt.Errorf("写入模型文件失败 %s: %w", model.Name, err)
		}
	}
	return nil
}

// buildModelCode 构建单个模型的 Go 代码
func (g *Generator) buildModelCode(model GoModelWrapper) string {
	var sb strings.Builder

	sb.WriteString("package models\n\n")

	// imports
	if model.HasTime {
		sb.WriteString("import \"time\"\n\n")
	}

	// struct comment
	if model.Description != "" {
		sb.WriteString(fmt.Sprintf("// %s %s\n", model.Name, model.Description))
	}

	// struct definition
	sb.WriteString(fmt.Sprintf("type %s struct {\n", model.Name))

	for _, field := range model.Fields {
		// 注释
		if field.Comment != "" {
			sb.WriteString(fmt.Sprintf("\t// %s\n", field.Comment))
		}

		// 构建 tag
		tags := g.buildFieldTags(field)

		sb.WriteString(fmt.Sprintf("\t%s %s %s\n", field.GoName, field.GoType, tags))
	}

	sb.WriteString("}\n\n")

	// TableName 方法
	sb.WriteString(fmt.Sprintf("// TableName 指定表名\n"))
	sb.WriteString(fmt.Sprintf("func (%s) TableName() string {\n", model.Name))
	sb.WriteString(fmt.Sprintf("\treturn \"%s\"\n", model.TableName))
	sb.WriteString("}\n\n")

	// Create DTO (不包含自动字段)
	sb.WriteString(g.buildCreateDTO(model))
	sb.WriteString(g.buildUpdateDTO(model))
	sb.WriteString(g.buildQueryParams(model))

	return sb.String()
}

// GoModelWrapper 包装以便调用
type GoModelWrapper = models.GoModel

// buildFieldTags 构建字段标签
func (g *Generator) buildFieldTags(field models.GoField) string {
	var parts []string

	parts = append(parts, fmt.Sprintf("json:\"%s\"", field.JsonTag))

	if field.GormTag != "" {
		parts = append(parts, fmt.Sprintf("gorm:\"%s\"", field.GormTag))
	}

	if field.ValidateTag != "" {
		parts = append(parts, fmt.Sprintf("binding:\"%s\"", field.ValidateTag))
	}

	return fmt.Sprintf("`%s`", strings.Join(parts, " "))
}

// buildCreateDTO 构建创建 DTO
func (g *Generator) buildCreateDTO(model GoModelWrapper) string {
	var sb strings.Builder

	sb.WriteString(fmt.Sprintf("// Create%sRequest 创建%s请求\n", model.Name, model.Description))
	sb.WriteString(fmt.Sprintf("type Create%sRequest struct {\n", model.Name))

	for _, field := range model.Fields {
		// 跳过自动字段
		if field.GoName == "CreatedAt" || field.GoName == "UpdatedAt" {
			continue
		}
		// 跳过自增主键
		if strings.Contains(field.GormTag, "autoIncrement") {
			continue
		}

		tags := g.buildFieldTags(field)
		sb.WriteString(fmt.Sprintf("\t%s %s %s\n", field.GoName, field.GoType, tags))
	}

	sb.WriteString("}\n\n")
	return sb.String()
}

// buildUpdateDTO 构建更新 DTO
func (g *Generator) buildUpdateDTO(model GoModelWrapper) string {
	var sb strings.Builder

	sb.WriteString(fmt.Sprintf("// Update%sRequest 更新%s请求\n", model.Name, model.Description))
	sb.WriteString(fmt.Sprintf("type Update%sRequest struct {\n", model.Name))

	for _, field := range model.Fields {
		// 跳过自动字段和主键
		if field.GoName == "CreatedAt" || field.GoName == "UpdatedAt" {
			continue
		}
		if strings.Contains(field.GormTag, "primaryKey") {
			continue
		}

		// 更新 DTO 使用指针类型，允许零值
		goType := field.GoType
		if goType != "string" {
			goType = "*" + goType
		}

		jsonTag := fmt.Sprintf("`json:\"%s\"`", field.JsonTag)
		sb.WriteString(fmt.Sprintf("\t%s %s %s\n", field.GoName, goType, jsonTag))
	}

	sb.WriteString("}\n\n")
	return sb.String()
}

// buildQueryParams 构建查询参数
func (g *Generator) buildQueryParams(model GoModelWrapper) string {
	var sb strings.Builder

	sb.WriteString(fmt.Sprintf("// Query%sParams 查询%s参数\n", model.Name, model.Description))
	sb.WriteString(fmt.Sprintf("type Query%sParams struct {\n", model.Name))
	sb.WriteString("\tPage     int    `form:\"page\" json:\"page\"`\n")
	sb.WriteString("\tPageSize int    `form:\"page_size\" json:\"page_size\"`\n")
	sb.WriteString("\tOrderBy  string `form:\"order_by\" json:\"order_by\"`\n")
	sb.WriteString("\tOrder    string `form:\"order\" json:\"order\"`\n")
	sb.WriteString("\tKeyword  string `form:\"keyword\" json:\"keyword\"`\n")
	sb.WriteString("}\n\n")

	return sb.String()
}
