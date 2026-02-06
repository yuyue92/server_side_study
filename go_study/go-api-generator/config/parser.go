package config

import (
	"encoding/json"
	"fmt"
	"go-api-generator/models"
	"os"
)

// Parser 配置解析器
type Parser struct{}

// NewParser 创建解析器
func NewParser() *Parser {
	return &Parser{}
}

// ParseFile 从文件解析配置
func (p *Parser) ParseFile(filePath string) (*models.SchemaConfig, error) {
	data, err := os.ReadFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("读取配置文件失败: %w", err)
	}
	return p.Parse(data)
}

// Parse 从字节数据解析配置
func (p *Parser) Parse(data []byte) (*models.SchemaConfig, error) {
	var config models.SchemaConfig
	if err := json.Unmarshal(data, &config); err != nil {
		return nil, fmt.Errorf("解析JSON失败: %w", err)
	}
	if err := p.Validate(&config); err != nil {
		return nil, fmt.Errorf("配置验证失败: %w", err)
	}
	return &config, nil
}

// Validate 验证配置合法性
func (p *Parser) Validate(config *models.SchemaConfig) error {
	if config.Version == "" {
		return fmt.Errorf("缺少 version 字段")
	}
	if len(config.Tables) == 0 {
		return fmt.Errorf("至少需要定义一个表")
	}

	tableNames := make(map[string]bool)
	for i, table := range config.Tables {
		if table.Name == "" {
			return fmt.Errorf("第 %d 个表缺少 name 字段", i+1)
		}
		if tableNames[table.Name] {
			return fmt.Errorf("表名重复: %s", table.Name)
		}
		tableNames[table.Name] = true

		if len(table.Fields) == 0 {
			return fmt.Errorf("表 %s 至少需要一个字段", table.Name)
		}

		// 检查主键是否存在于字段中
		if table.PrimaryKey != "" {
			found := false
			for _, f := range table.Fields {
				if f.Name == table.PrimaryKey {
					found = true
					break
				}
			}
			if !found {
				return fmt.Errorf("表 %s 的主键 %s 不在字段列表中", table.Name, table.PrimaryKey)
			}
		}

		fieldNames := make(map[string]bool)
		for j, field := range table.Fields {
			if field.Name == "" {
				return fmt.Errorf("表 %s 第 %d 个字段缺少 name", table.Name, j+1)
			}
			if fieldNames[field.Name] {
				return fmt.Errorf("表 %s 字段名重复: %s", table.Name, field.Name)
			}
			fieldNames[field.Name] = true

			if field.Type == "" {
				return fmt.Errorf("表 %s 字段 %s 缺少 type", table.Name, field.Name)
			}
			validTypes := map[string]bool{
				"number": true, "string": true, "boolean": true,
				"text": true, "date": true, "float": true,
			}
			if !validTypes[field.Type] {
				return fmt.Errorf("表 %s 字段 %s 类型无效: %s (支持: number, string, boolean, text, date, float)",
					table.Name, field.Name, field.Type)
			}
		}
	}

	// 验证关系
	for i, rel := range config.Relations {
		if rel.From == "" || rel.To == "" {
			return fmt.Errorf("第 %d 个关系缺少 from 或 to", i+1)
		}
		if !tableNames[rel.From] {
			return fmt.Errorf("关系中引用了不存在的表: %s", rel.From)
		}
		if !tableNames[rel.To] {
			return fmt.Errorf("关系中引用了不存在的表: %s", rel.To)
		}
		validRelTypes := map[string]bool{
			"one-to-one": true, "one-to-many": true, "many-to-many": true,
		}
		if !validRelTypes[rel.Type] {
			return fmt.Errorf("关系类型无效: %s", rel.Type)
		}
	}

	return nil
}
