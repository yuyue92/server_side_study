**Go REST 服务示例，包含主从表，数组，map字段，支持Cors**

- 完整可运行的 Go 代码「Go REST 服务示例（含主从表、数组/Map 字段、支持 CORS）」，开箱即用;
- 支持 users↔userInfo（一对一，含 ulist1、umap1 JSON 字段）和 orders↔orderDetail（一对多，含 olist1），并已开启 CORS，前端可直接调用。

追加：
✔ 静态文件服务（把 tester.html 放在 static/ 目录）
✔ 启动后 自动打开浏览器 访问 http://localhost:8080/tester.html
✔ 保持原来的 API 路由不变

**【用户和订单管理】前端界面**

✅ 用户管理（Users + UserInfo）
- 列表显示：id、name、age、email
- 详情弹框：显示用户信息及关联的 UserInfo
- 新增 / 编辑 / 删除
- 自动加载后端 /users 接口

✅ 订单管理（Orders + OrderDetails）
- 列表显示：id、name、price
- 详情弹框：显示订单及关联 OrderDetails
- 新增 / 编辑 / 删除
- 自动加载后端 /orders 接口

✅ 美观设计
- 使用 纯 CSS Flex + Grid，简洁风格
- 弹框（Modal） 用 CSS + JS 实现
- 按钮悬停效果、表格 hover 高亮
- 自适应布局

✅ 后端兼容
- API URL 默认 http://localhost:8080
- AJAX 用 fetch
- JSON 格式传输
