package generator

import (
	"fmt"
	"strings"
)

// generateDatabase 生成数据库层代码
func (g *Generator) generateDatabase() error {
	// 生成数据库初始化文件
	if err := g.writeFile("database/database.go", g.buildDatabaseInit()); err != nil {
		return err
	}

	// 为每个模型生成 repository
	for _, model := range g.Models {
		code := g.buildRepository(model)
		filename := fmt.Sprintf("database/%s_repo.go", strings.ToLower(model.TableName))
		if err := g.writeFile(filename, code); err != nil {
			return fmt.Errorf("写入仓库文件失败 %s: %w", model.Name, err)
		}
	}

	return nil
}

// buildDatabaseInit 构建数据库初始化代码
func (g *Generator) buildDatabaseInit() string {
	var sb strings.Builder

	sb.WriteString(`package database

import (
	"fmt"
	"log"
	"os"
	"time"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
`)
	sb.WriteString(fmt.Sprintf("\t\"%s/models\"\n", g.ModName))
	sb.WriteString(`)

var DB *gorm.DB

// InitDB 初始化数据库连接
func InitDB(dbPath string) error {
	newLogger := logger.New(
		log.New(os.Stdout, "\r\n", log.LstdFlags),
		logger.Config{
			SlowThreshold:             time.Second,
			LogLevel:                  logger.Info,
			IgnoreRecordNotFoundError: true,
			Colorful:                  true,
		},
	)

	var err error
	DB, err = gorm.Open(sqlite.Open(dbPath), &gorm.Config{
		Logger: newLogger,
	})
	if err != nil {
		return fmt.Errorf("连接数据库失败: %w", err)
	}

	// 自动迁移
	if err := autoMigrate(); err != nil {
		return fmt.Errorf("数据库迁移失败: %w", err)
	}

	log.Println("✅ 数据库初始化成功")
	return nil
}

// autoMigrate 自动迁移所有模型
func autoMigrate() error {
	return DB.AutoMigrate(
`)

	for _, model := range g.Models {
		sb.WriteString(fmt.Sprintf("\t\t&models.%s{},\n", model.Name))
	}

	sb.WriteString(`	)
}

// GetDB 获取数据库实例
func GetDB() *gorm.DB {
	return DB
}
`)

	return sb.String()
}

// buildRepository 构建单个模型的 Repository 代码
func (g *Generator) buildRepository(model GoModelWrapper) string {
	var sb strings.Builder

	sb.WriteString(`package database

import (
	"fmt"
`)
	sb.WriteString(fmt.Sprintf("\t\"%s/models\"\n", g.ModName))
	sb.WriteString(`
	"gorm.io/gorm"
)

`)

	// Repository struct
	sb.WriteString(fmt.Sprintf("// %sRepository %s数据访问层\n", model.Name, model.Description))
	sb.WriteString(fmt.Sprintf("type %sRepository struct {\n", model.Name))
	sb.WriteString("\tdb *gorm.DB\n")
	sb.WriteString("}\n\n")

	// Constructor
	sb.WriteString(fmt.Sprintf("// New%sRepository 创建仓库实例\n", model.Name))
	sb.WriteString(fmt.Sprintf("func New%sRepository() *%sRepository {\n", model.Name, model.Name))
	sb.WriteString(fmt.Sprintf("\treturn &%sRepository{db: GetDB()}\n", model.Name))
	sb.WriteString("}\n\n")

	// Create
	sb.WriteString(fmt.Sprintf("// Create 创建%s\n", model.Description))
	sb.WriteString(fmt.Sprintf("func (r *%sRepository) Create(entity *models.%s) error {\n", model.Name, model.Name))
	sb.WriteString("\tresult := r.db.Create(entity)\n")
	sb.WriteString("\tif result.Error != nil {\n")
	sb.WriteString(fmt.Sprintf("\t\treturn fmt.Errorf(\"创建%s失败: %%w\", result.Error)\n", model.Description))
	sb.WriteString("\t}\n")
	sb.WriteString("\treturn nil\n")
	sb.WriteString("}\n\n")

	// GetByID
	sb.WriteString(fmt.Sprintf("// GetByID 根据ID查询%s\n", model.Description))
	sb.WriteString(fmt.Sprintf("func (r *%sRepository) GetByID(id int64) (*models.%s, error) {\n", model.Name, model.Name))
	sb.WriteString(fmt.Sprintf("\tvar entity models.%s\n", model.Name))
	sb.WriteString("\tresult := r.db.First(&entity, id)\n")
	sb.WriteString("\tif result.Error != nil {\n")
	sb.WriteString("\t\tif result.Error == gorm.ErrRecordNotFound {\n")
	sb.WriteString("\t\t\treturn nil, nil\n")
	sb.WriteString("\t\t}\n")
	sb.WriteString(fmt.Sprintf("\t\treturn nil, fmt.Errorf(\"查询%s失败: %%w\", result.Error)\n", model.Description))
	sb.WriteString("\t}\n")
	sb.WriteString("\treturn &entity, nil\n")
	sb.WriteString("}\n\n")

	// List with pagination
	sb.WriteString(fmt.Sprintf("// List 分页查询%s列表\n", model.Description))
	sb.WriteString(fmt.Sprintf("func (r *%sRepository) List(params models.Query%sParams) ([]models.%s, int64, error) {\n",
		model.Name, model.Name, model.Name))
	sb.WriteString(fmt.Sprintf("\tvar entities []models.%s\n", model.Name))
	sb.WriteString("\tvar total int64\n\n")
	sb.WriteString("\tquery := r.db.Model(&models." + model.Name + "{})\n\n")

	// 关键字搜索 - 搜索所有 string 类型字段
	stringFields := []string{}
	for _, f := range model.Fields {
		if f.GoType == "string" && f.GoName != "CreatedAt" && f.GoName != "UpdatedAt" {
			stringFields = append(stringFields, f.JsonName)
		}
	}
	if len(stringFields) > 0 {
		sb.WriteString("\t// 关键字搜索\n")
		sb.WriteString("\tif params.Keyword != \"\" {\n")
		sb.WriteString("\t\tkeyword := \"%\" + params.Keyword + \"%\"\n")
		conditions := make([]string, len(stringFields))
		args := make([]string, len(stringFields))
		for i, f := range stringFields {
			conditions[i] = fmt.Sprintf("%s LIKE ?", f)
			args[i] = "keyword"
		}
		sb.WriteString(fmt.Sprintf("\t\tquery = query.Where(\"%s\", %s)\n",
			strings.Join(conditions, " OR "),
			strings.Join(args, ", ")))
		sb.WriteString("\t}\n\n")
	}

	sb.WriteString("\t// 统计总数\n")
	sb.WriteString("\tquery.Count(&total)\n\n")
	sb.WriteString("\t// 排序\n")
	sb.WriteString("\tif params.OrderBy != \"\" {\n")
	sb.WriteString("\t\torder := params.OrderBy\n")
	sb.WriteString("\t\tif params.Order == \"desc\" {\n")
	sb.WriteString("\t\t\torder += \" DESC\"\n")
	sb.WriteString("\t\t}\n")
	sb.WriteString("\t\tquery = query.Order(order)\n")
	sb.WriteString("\t} else {\n")
	sb.WriteString("\t\tquery = query.Order(\"id DESC\")\n")
	sb.WriteString("\t}\n\n")
	sb.WriteString("\t// 分页\n")
	sb.WriteString("\tif params.Page <= 0 {\n")
	sb.WriteString("\t\tparams.Page = 1\n")
	sb.WriteString("\t}\n")
	sb.WriteString("\tif params.PageSize <= 0 {\n")
	sb.WriteString("\t\tparams.PageSize = 20\n")
	sb.WriteString("\t}\n")
	sb.WriteString("\tif params.PageSize > 100 {\n")
	sb.WriteString("\t\tparams.PageSize = 100\n")
	sb.WriteString("\t}\n")
	sb.WriteString("\toffset := (params.Page - 1) * params.PageSize\n")
	sb.WriteString("\tresult := query.Offset(offset).Limit(params.PageSize).Find(&entities)\n")
	sb.WriteString("\tif result.Error != nil {\n")
	sb.WriteString(fmt.Sprintf("\t\treturn nil, 0, fmt.Errorf(\"查询%s列表失败: %%w\", result.Error)\n", model.Description))
	sb.WriteString("\t}\n\n")
	sb.WriteString("\treturn entities, total, nil\n")
	sb.WriteString("}\n\n")

	// Update
	sb.WriteString(fmt.Sprintf("// Update 更新%s\n", model.Description))
	sb.WriteString(fmt.Sprintf("func (r *%sRepository) Update(id int64, updates map[string]interface{}) error {\n", model.Name))
	sb.WriteString(fmt.Sprintf("\tresult := r.db.Model(&models.%s{}).Where(\"id = ?\", id).Updates(updates)\n", model.Name))
	sb.WriteString("\tif result.Error != nil {\n")
	sb.WriteString(fmt.Sprintf("\t\treturn fmt.Errorf(\"更新%s失败: %%w\", result.Error)\n", model.Description))
	sb.WriteString("\t}\n")
	sb.WriteString("\tif result.RowsAffected == 0 {\n")
	sb.WriteString(fmt.Sprintf("\t\treturn fmt.Errorf(\"%s不存在\")\n", model.Description))
	sb.WriteString("\t}\n")
	sb.WriteString("\treturn nil\n")
	sb.WriteString("}\n\n")

	// Delete
	sb.WriteString(fmt.Sprintf("// Delete 删除%s\n", model.Description))
	sb.WriteString(fmt.Sprintf("func (r *%sRepository) Delete(id int64) error {\n", model.Name))
	sb.WriteString(fmt.Sprintf("\tresult := r.db.Delete(&models.%s{}, id)\n", model.Name))
	sb.WriteString("\tif result.Error != nil {\n")
	sb.WriteString(fmt.Sprintf("\t\treturn fmt.Errorf(\"删除%s失败: %%w\", result.Error)\n", model.Description))
	sb.WriteString("\t}\n")
	sb.WriteString("\tif result.RowsAffected == 0 {\n")
	sb.WriteString(fmt.Sprintf("\t\treturn fmt.Errorf(\"%s不存在\")\n", model.Description))
	sb.WriteString("\t}\n")
	sb.WriteString("\treturn nil\n")
	sb.WriteString("}\n\n")

	// BatchDelete
	sb.WriteString(fmt.Sprintf("// BatchDelete 批量删除%s\n", model.Description))
	sb.WriteString(fmt.Sprintf("func (r *%sRepository) BatchDelete(ids []int64) error {\n", model.Name))
	sb.WriteString(fmt.Sprintf("\tresult := r.db.Delete(&models.%s{}, ids)\n", model.Name))
	sb.WriteString("\tif result.Error != nil {\n")
	sb.WriteString(fmt.Sprintf("\t\treturn fmt.Errorf(\"批量删除%s失败: %%w\", result.Error)\n", model.Description))
	sb.WriteString("\t}\n")
	sb.WriteString("\treturn nil\n")
	sb.WriteString("}\n")

	return sb.String()
}
