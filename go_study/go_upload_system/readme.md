## 一套 Go + SQLite3（本地）“文本 + 图片上传存储系统”方案：
- 文本存 DB
- 图片存本地磁盘（更合适），DB 只存元数据（路径/哈希/尺寸/类型等）
- 提供 HTTP API：上传、查询、图片访问、删除、分页列表
- 兼顾：大小限制、类型校验、去重（可选）、基本安全（路径穿越、MIME 校验）

自检清单（对应代码已覆盖）
- 后端：POST /api/posts 支持 multipart：title、body、files[]
- 后端：GET /api/posts?page=&pageSize= 分页列表
- 后端：GET /api/posts/{id} 返回文本 + files 元信息
- 后端：GET /files/{fileId} 返回文件内容（图片 inline；文本默认 attachment；download=0 可 inline 预览）
- 后端：DELETE /api/posts/{id} 级联删除关联表；仅在无引用时删物理文件
- CORS：全局允许跨域（含 OPTIONS 预检）
- 前端：上传/列表/查看/图片预览/文本预览/下载/删除全部具备
