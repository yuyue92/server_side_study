Go + SQLite 博客系统（文章 & 评论）API 示例，涵盖文章增删改查/详情(含浏览量)/搜索筛选/状态变更、评论增删改查/树形结构/点赞/审核 等常用功能，并默认启用 CORS 供前端直接调用。

功能清单（API 一览）

文章 Articles
- POST /api/articles 新建文章
- GET /api/articles 文章列表（分页、搜索、筛选：作者/分类/状态、排序）
- GET /api/articles/:id 文章详情（自动+1 浏览量）
- PUT /api/articles/:id 更新文章
- PATCH /api/articles/:id/status 变更状态（draft|published|archived）
- DELETE /api/articles/:id 删除文章（物理删除，生产可改为软删）
- GET /api/stats/top Top 文章（按浏览量）

评论 Comments
- GET /api/articles/:id/comments 获取文章评论（树形结构，默认仅返回已审核）
- 支持 ?include_unapproved=1 返回未审核
- POST /api/articles/:id/comments 发表评论（可传 parent_comment_id）
- PATCH /api/comments/:id/like 点赞（+1）
- PATCH /api/comments/:id/approve 审核通过/撤销
- DELETE /api/comments/:id 删除评论

---

前端部分：一个纯 HTML+CSS+JavaScript 的前端页面（文件名：blogIndex.html），样式参考 Bootstrap 风格且无需任何外部依赖。它覆盖了你后端提供的文章列表/筛选/排序/分页、文章详情（自动+1 浏览量）、创建与编辑、状态变更、删除、评论树展示与回复、点赞、审核（带管理员开关）、删除评论、Top 文章等全部常用功能，并自带多 Tab 模块切换。

使用说明：
- 勾选“管理员模式”即可对评论进行审核/删除等管理动作；该模式会自动添加请求头 X-Admin: true。
- 在「文章列表」中点击“详情”会跳转到详情页并自动增加浏览量；“状态”按钮可快速切换文章状态。
- 在「详情 & 评论」页，可勾选“显示未审核评论”查看待审内容；点击评论的“↩️ 回复”会绑定父评论 ID（上方提示可取消）。
- 「统计 Top」页展示浏览量最高的文章，并可一键跳到详情页查看。
