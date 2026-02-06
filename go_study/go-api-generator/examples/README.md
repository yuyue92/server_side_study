# 示例配置合集

共 14 个场景，按关系复杂度从简到繁排列。

---

## 一、单表（无关系）

| # | 文件 | 场景 | 表数 | 说明 |
|---|------|------|------|------|
| 01 | `01_single_todo.json` | 待办事项 | 1 | 最简 CRUD，含布尔和枚举字段 |
| 02 | `02_single_product.json` | 商品目录 | 1 | 展示全字段类型：string/text/number/float/boolean/url |
| 03 | `03_single_config.json` | 系统配置 | 1 | 键值对存储，适用于后台设置页 |

**适合**：快速验证生成器是否正常工作。

---

## 二、一对一

| # | 文件 | 场景 | 表数 | 关系 |
|---|------|------|------|------|
| 04 | `04_one2one_user_profile.json` | 用户 + 档案 | 2 | user ←1:1→ user_profile |
| 05 | `05_one2one_employee_card.json` | 员工 + 工牌 | 2 | employee ←1:1→ id_card |

**特点**：外键字段带 `unique: true`，保证一对一约束。

---

## 三、一对多

| # | 文件 | 场景 | 表数 | 关系 |
|---|------|------|------|------|
| 06 | `06_one2many_blog.json` | 博客系统 | 3 | author →1:N→ post →1:N→ comment（三层嵌套） |
| 07 | `07_one2many_shop_order.json` | 网店订单 | 3 | customer →1:N→ order →1:N→ order_item（电商经典） |
| 08 | `08_one2many_school.json` | 学校管理 | 3 | school →1:N→ classroom →1:N→ student（层级结构） |

**特点**：多层级父子关系，演示链式一对多。

---

## 四、多对多

| # | 文件 | 场景 | 表数 | 关系 |
|---|------|------|------|------|
| 09 | `09_many2many_course.json` | 学生选课 | 3 | student ⟷M:N⟷ course（中间表 enrollment 带额外字段） |
| 10 | `10_many2many_rbac.json` | RBAC 权限 | 5 | user ⟷M:N⟷ role ⟷M:N⟷ permission（双层多对多） |
| 11 | `11_many2many_article_tag.json` | 文章标签 | 4 | article ⟷M:N⟷ tag + article →1:N→ category（混合关系） |

**特点**：通过中间表拆解多对多，中间表可携带额外业务字段（如成绩、学期）。

---

## 五、全关系综合

| # | 文件 | 场景 | 表数 | 覆盖关系 |
|---|------|------|------|----------|
| 12 | `12_complex_project_mgmt.json` | 项目管理 | 7 | 1:1 + 1:N + M:N（成员设置、项目成员、任务、评论、日志） |
| 13 | `13_complex_hospital.json` | 医院预约挂号 | 6 | 1:1 + 1:N（科室→医生→排班→预约，医生详情一对一） |
| 14 | `14_complex_ecommerce.json` | 电商平台 | 10 | 1:1 + 1:N + M:N 全覆盖（用户钱包、商品收藏、订单明细、评价） |

**特点**：贴近真实业务，表数多、关系交叉复杂，可做压力测试。

---

## 使用方式

```bash
# 用任意配置生成对应项目
go run main.go -config examples/09_many2many_course.json -output course-api -mod course-api

cd course-api
go mod tidy
go run main.go
```

## 关系数量统计

| 场景 | 表 | 关系 | 1:1 | 1:N | M:N |
|------|----|------|-----|-----|-----|
| 01-03 | 1 | 0 | - | - | - |
| 04-05 | 2 | 1 | 1 | - | - |
| 06-08 | 3 | 2 | - | 2 | - |
| 09 | 3 | 2 | - | - | 2 |
| 10 | 5 | 4 | - | - | 4 |
| 11 | 4 | 3 | - | 1 | 2 |
| 12 | 7 | 11 | 1 | 8 | 2 |
| 13 | 6 | 5 | 1 | 4 | - |
| 14 | 10 | 12 | 2 | 8 | 2 |
