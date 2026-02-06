package models

// SchemaConfig 顶层配置结构
type SchemaConfig struct {
	Version   string     `json:"version"`
	Tables    []Table    `json:"tables"`
	Relations []Relation `json:"relations"`
}

// Table 表定义
type Table struct {
	Name        string  `json:"name"`
	Description string  `json:"description"`
	PrimaryKey  string  `json:"primaryKey"`
	Fields      []Field `json:"fields"`
}

// Field 字段定义
type Field struct {
	Name          string `json:"name"`
	Type          string `json:"type"`          // number, string, boolean, text, date, float
	Length        int    `json:"length"`         // 字段长度
	Format        string `json:"format"`         // uuid, email, url, date, datetime 等
	Required      bool   `json:"required"`       // 是否必填
	Unique        bool   `json:"unique"`         // 是否唯一
	AutoIncrement bool   `json:"autoIncrement"`  // 是否自增
	Default       any    `json:"default"`        // 默认值
	Comment       string `json:"comment"`        // 字段注释
	Enum          []any  `json:"enum"`           // 枚举值
}

// Relation 表关系定义
type Relation struct {
	From         string `json:"from"`         // 源表
	To           string `json:"to"`           // 目标表
	Type         string `json:"type"`         // one-to-one, one-to-many, many-to-many
	ForeignKey   string `json:"foreignKey"`   // 外键字段
	ReferenceKey string `json:"referenceKey"` // 引用字段
}

// ---- 以下为代码生成过程中使用的中间结构 ----

// GoField Go结构体字段的中间表示
type GoField struct {
	GoName     string // Go 命名（PascalCase）
	JsonName   string // JSON 命名（原始名称）
	GoType     string // Go 类型
	GormTag    string // GORM 标签
	JsonTag    string // JSON 标签
	ValidateTag string // 验证标签
	Comment    string // 注释
}

// GoModel Go模型的中间表示
type GoModel struct {
	Name        string    // 模型名称（PascalCase）
	TableName   string    // 数据库表名
	Description string    // 描述
	Fields      []GoField // 字段列表
	PrimaryKey  string    // 主键字段名（Go命名）
	HasTime     bool      // 是否包含 time.Time 类型
}

// GoRelation Go关系的中间表示
type GoRelation struct {
	FromModel    string // 源模型（PascalCase）
	ToModel      string // 目标模型（PascalCase）
	Type         string // 关系类型
	ForeignKey   string // 外键字段（Go命名）
	ReferenceKey string // 引用字段（Go命名）
}
