package generator

import (
	"fmt"
	"strings"
)

// generateHandlers 生成处理器层代码
func (g *Generator) generateHandlers() error {
	// 生成公共响应结构
	if err := g.writeFile("handlers/response.go", g.buildResponseHelper()); err != nil {
		return err
	}

	// 为每个模型生成 handler
	for _, model := range g.Models {
		code := g.buildHandler(model)
		filename := fmt.Sprintf("handlers/%s_handler.go", strings.ToLower(model.TableName))
		if err := g.writeFile(filename, code); err != nil {
			return fmt.Errorf("写入处理器文件失败 %s: %w", model.Name, err)
		}
	}

	return nil
}

// buildResponseHelper 构建公共响应辅助代码
func (g *Generator) buildResponseHelper() string {
	return `package handlers

import (
	"net/http"
	"github.com/gin-gonic/gin"
)

// Response 统一响应结构
type Response struct {
	Code    int         ` + "`json:\"code\"`" + `
	Message string      ` + "`json:\"message\"`" + `
	Data    interface{} ` + "`json:\"data,omitempty\"`" + `
}

// PageData 分页数据结构
type PageData struct {
	List     interface{} ` + "`json:\"list\"`" + `
	Total    int64       ` + "`json:\"total\"`" + `
	Page     int         ` + "`json:\"page\"`" + `
	PageSize int         ` + "`json:\"page_size\"`" + `
}

// Success 成功响应
func Success(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "success",
		Data:    data,
	})
}

// SuccessMessage 成功消息响应
func SuccessMessage(c *gin.Context, message string) {
	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: message,
	})
}

// SuccessPage 分页成功响应
func SuccessPage(c *gin.Context, list interface{}, total int64, page, pageSize int) {
	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "success",
		Data: PageData{
			List:     list,
			Total:    total,
			Page:     page,
			PageSize: pageSize,
		},
	})
}

// Error 错误响应
func Error(c *gin.Context, code int, message string) {
	c.JSON(code, Response{
		Code:    -1,
		Message: message,
	})
}

// BadRequest 参数错误
func BadRequest(c *gin.Context, message string) {
	Error(c, http.StatusBadRequest, message)
}

// NotFound 资源不存在
func NotFound(c *gin.Context, message string) {
	Error(c, http.StatusNotFound, message)
}

// InternalError 内部错误
func InternalError(c *gin.Context, message string) {
	Error(c, http.StatusInternalServerError, message)
}
`
}

// buildHandler 构建单个模型的 Handler 代码
func (g *Generator) buildHandler(model GoModelWrapper) string {
	var sb strings.Builder

	sb.WriteString(`package handlers

import (
	"strconv"

	"github.com/gin-gonic/gin"
`)
	sb.WriteString(fmt.Sprintf("\t\"%s/database\"\n", g.ModName))
	sb.WriteString(fmt.Sprintf("\t\"%s/models\"\n", g.ModName))
	sb.WriteString(`)

`)

	// Handler struct
	sb.WriteString(fmt.Sprintf("// %sHandler %sHTTP处理器\n", model.Name, model.Description))
	sb.WriteString(fmt.Sprintf("type %sHandler struct {\n", model.Name))
	sb.WriteString(fmt.Sprintf("\trepo *database.%sRepository\n", model.Name))
	sb.WriteString("}\n\n")

	// Constructor
	sb.WriteString(fmt.Sprintf("// New%sHandler 创建处理器实例\n", model.Name))
	sb.WriteString(fmt.Sprintf("func New%sHandler() *%sHandler {\n", model.Name, model.Name))
	sb.WriteString(fmt.Sprintf("\treturn &%sHandler{\n", model.Name))
	sb.WriteString(fmt.Sprintf("\t\trepo: database.New%sRepository(),\n", model.Name))
	sb.WriteString("\t}\n")
	sb.WriteString("}\n\n")

	// Create handler
	sb.WriteString(fmt.Sprintf("// Create 创建%s\n", model.Description))
	sb.WriteString(fmt.Sprintf("// @Summary 创建%s\n", model.Description))
	sb.WriteString(fmt.Sprintf("// @Tags %s\n", model.Name))
	sb.WriteString(fmt.Sprintf("func (h *%sHandler) Create(c *gin.Context) {\n", model.Name))
	sb.WriteString(fmt.Sprintf("\tvar req models.Create%sRequest\n", model.Name))
	sb.WriteString("\tif err := c.ShouldBindJSON(&req); err != nil {\n")
	sb.WriteString("\t\tBadRequest(c, \"参数错误: \"+err.Error())\n")
	sb.WriteString("\t\treturn\n")
	sb.WriteString("\t}\n\n")

	// 将 DTO 转为 Model
	sb.WriteString(fmt.Sprintf("\tentity := models.%s{\n", model.Name))
	for _, field := range model.Fields {
		if field.GoName == "CreatedAt" || field.GoName == "UpdatedAt" {
			continue
		}
		if strings.Contains(field.GormTag, "autoIncrement") {
			continue
		}
		sb.WriteString(fmt.Sprintf("\t\t%s: req.%s,\n", field.GoName, field.GoName))
	}
	sb.WriteString("\t}\n\n")

	sb.WriteString("\tif err := h.repo.Create(&entity); err != nil {\n")
	sb.WriteString("\t\tInternalError(c, err.Error())\n")
	sb.WriteString("\t\treturn\n")
	sb.WriteString("\t}\n\n")
	sb.WriteString("\tSuccess(c, entity)\n")
	sb.WriteString("}\n\n")

	// GetByID handler
	sb.WriteString(fmt.Sprintf("// GetByID 根据ID获取%s\n", model.Description))
	sb.WriteString(fmt.Sprintf("func (h *%sHandler) GetByID(c *gin.Context) {\n", model.Name))
	sb.WriteString("\tid, err := strconv.ParseInt(c.Param(\"id\"), 10, 64)\n")
	sb.WriteString("\tif err != nil {\n")
	sb.WriteString("\t\tBadRequest(c, \"无效的ID\")\n")
	sb.WriteString("\t\treturn\n")
	sb.WriteString("\t}\n\n")
	sb.WriteString("\tentity, err := h.repo.GetByID(id)\n")
	sb.WriteString("\tif err != nil {\n")
	sb.WriteString("\t\tInternalError(c, err.Error())\n")
	sb.WriteString("\t\treturn\n")
	sb.WriteString("\t}\n")
	sb.WriteString("\tif entity == nil {\n")
	sb.WriteString(fmt.Sprintf("\t\tNotFound(c, \"%s不存在\")\n", model.Description))
	sb.WriteString("\t\treturn\n")
	sb.WriteString("\t}\n\n")
	sb.WriteString("\tSuccess(c, entity)\n")
	sb.WriteString("}\n\n")

	// List handler
	sb.WriteString(fmt.Sprintf("// List 获取%s列表\n", model.Description))
	sb.WriteString(fmt.Sprintf("func (h *%sHandler) List(c *gin.Context) {\n", model.Name))
	sb.WriteString(fmt.Sprintf("\tvar params models.Query%sParams\n", model.Name))
	sb.WriteString("\tif err := c.ShouldBindQuery(&params); err != nil {\n")
	sb.WriteString("\t\tBadRequest(c, \"参数错误: \"+err.Error())\n")
	sb.WriteString("\t\treturn\n")
	sb.WriteString("\t}\n\n")
	sb.WriteString("\tentities, total, err := h.repo.List(params)\n")
	sb.WriteString("\tif err != nil {\n")
	sb.WriteString("\t\tInternalError(c, err.Error())\n")
	sb.WriteString("\t\treturn\n")
	sb.WriteString("\t}\n\n")
	sb.WriteString("\tSuccessPage(c, entities, total, params.Page, params.PageSize)\n")
	sb.WriteString("}\n\n")

	// Update handler
	sb.WriteString(fmt.Sprintf("// Update 更新%s\n", model.Description))
	sb.WriteString(fmt.Sprintf("func (h *%sHandler) Update(c *gin.Context) {\n", model.Name))
	sb.WriteString("\tid, err := strconv.ParseInt(c.Param(\"id\"), 10, 64)\n")
	sb.WriteString("\tif err != nil {\n")
	sb.WriteString("\t\tBadRequest(c, \"无效的ID\")\n")
	sb.WriteString("\t\treturn\n")
	sb.WriteString("\t}\n\n")
	sb.WriteString(fmt.Sprintf("\tvar req models.Update%sRequest\n", model.Name))
	sb.WriteString("\tif err := c.ShouldBindJSON(&req); err != nil {\n")
	sb.WriteString("\t\tBadRequest(c, \"参数错误: \"+err.Error())\n")
	sb.WriteString("\t\treturn\n")
	sb.WriteString("\t}\n\n")
	sb.WriteString("\t// 构建更新字段 map\n")
	sb.WriteString("\tupdates := make(map[string]interface{})\n")

	for _, field := range model.Fields {
		if field.GoName == "CreatedAt" || field.GoName == "UpdatedAt" {
			continue
		}
		if strings.Contains(field.GormTag, "primaryKey") {
			continue
		}
		if field.GoType == "string" {
			sb.WriteString(fmt.Sprintf("\tif req.%s != \"\" {\n", field.GoName))
			sb.WriteString(fmt.Sprintf("\t\tupdates[\"%s\"] = req.%s\n", field.JsonName, field.GoName))
			sb.WriteString("\t}\n")
		} else {
			sb.WriteString(fmt.Sprintf("\tif req.%s != nil {\n", field.GoName))
			sb.WriteString(fmt.Sprintf("\t\tupdates[\"%s\"] = *req.%s\n", field.JsonName, field.GoName))
			sb.WriteString("\t}\n")
		}
	}

	sb.WriteString("\n\tif len(updates) == 0 {\n")
	sb.WriteString("\t\tBadRequest(c, \"没有需要更新的字段\")\n")
	sb.WriteString("\t\treturn\n")
	sb.WriteString("\t}\n\n")
	sb.WriteString("\tif err := h.repo.Update(id, updates); err != nil {\n")
	sb.WriteString("\t\tInternalError(c, err.Error())\n")
	sb.WriteString("\t\treturn\n")
	sb.WriteString("\t}\n\n")
	sb.WriteString("\tSuccessMessage(c, \"更新成功\")\n")
	sb.WriteString("}\n\n")

	// Delete handler
	sb.WriteString(fmt.Sprintf("// Delete 删除%s\n", model.Description))
	sb.WriteString(fmt.Sprintf("func (h *%sHandler) Delete(c *gin.Context) {\n", model.Name))
	sb.WriteString("\tid, err := strconv.ParseInt(c.Param(\"id\"), 10, 64)\n")
	sb.WriteString("\tif err != nil {\n")
	sb.WriteString("\t\tBadRequest(c, \"无效的ID\")\n")
	sb.WriteString("\t\treturn\n")
	sb.WriteString("\t}\n\n")
	sb.WriteString("\tif err := h.repo.Delete(id); err != nil {\n")
	sb.WriteString("\t\tInternalError(c, err.Error())\n")
	sb.WriteString("\t\treturn\n")
	sb.WriteString("\t}\n\n")
	sb.WriteString("\tSuccessMessage(c, \"删除成功\")\n")
	sb.WriteString("}\n\n")

	// BatchDelete handler
	sb.WriteString(fmt.Sprintf("// BatchDelete 批量删除%s\n", model.Description))
	sb.WriteString(fmt.Sprintf("func (h *%sHandler) BatchDelete(c *gin.Context) {\n", model.Name))
	sb.WriteString("\tvar req struct {\n")
	sb.WriteString("\t\tIDs []int64 `json:\"ids\" binding:\"required\"`\n")
	sb.WriteString("\t}\n")
	sb.WriteString("\tif err := c.ShouldBindJSON(&req); err != nil {\n")
	sb.WriteString("\t\tBadRequest(c, \"参数错误: \"+err.Error())\n")
	sb.WriteString("\t\treturn\n")
	sb.WriteString("\t}\n\n")
	sb.WriteString("\tif err := h.repo.BatchDelete(req.IDs); err != nil {\n")
	sb.WriteString("\t\tInternalError(c, err.Error())\n")
	sb.WriteString("\t\treturn\n")
	sb.WriteString("\t}\n\n")
	sb.WriteString("\tSuccessMessage(c, \"批量删除成功\")\n")
	sb.WriteString("}\n")

	return sb.String()
}
