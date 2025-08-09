**学习服务端知识**

一、 认识服务端的核心概念，目标：搞清楚服务端是干什么的，以及它与前端的交互方式。
- HTTP 协议与请求生命周期：GET / POST / PUT / DELETE， 请求头、响应头、状态码；
- 前后端通信方式：REST API、 GraphQL、WebSocket（实时通信）；
- 服务端职责：（1）接收请求 → 处理数据 → 返回结果、（2）访问数据库、文件系统、外部 API；
- 建议用浏览器 DevTools → Network 面板分析请求响应，理解实际数据流。

二、选择一门服务端编程语言：前端转后端的最佳路径之一是先用熟悉的 JavaScript/TypeScript (Node.js)，再扩展到 Go / Python / Java 等。
| 语言          | 优点                  | 适合场景       |
| ----------- | ------------------- | ---------- |
| **Node.js** | 同语言开发前后端，生态大，学习曲线平缓 | 快速原型、API服务 |
| **Go**      | 性能高、并发强、部署简单        | 高性能API、微服务 |
| **Python**  | 语法简单，库丰富            | 数据处理、脚本工具  |
| **Java**    | 企业级成熟方案，生态丰富        | 大型系统       |

三、学习服务端框架
- Node.js：（1）Express.js（轻量，入门快）、（2）NestJS（结构化，适合中大型项目）
- Go：（1）Gin（轻量高性能）、（2）Fiber（Express 风格，学习快）；
- 内容重点：
   - 路由（Route）定义；
   - 请求参数获取（Query、Body、Params）；
   - 中间件（日志、鉴权、错误处理）
   - 静态资源托管

四、数据库与数据存储：
- 关系型数据库（SQL）：MySQL / PostgreSQL / SQLite； 基本操作：增删改查（CRUD）、表结构、索引；
- 非关系型数据库（NoSQL）：MongoDB（文档型）；Redis（缓存、会话存储）；
- 重点：SQL 语句、ORM 框架（Sequelize / Prisma / GORM）、 连接池与性能优化；

五、认证与安全：
- 身份认证：Session / Cookie、 JWT（JSON Web Token）；
- 权限控制：RBAC（基于角色的访问控制）；
- 常见安全问题：XSS、CSRF、SQL 注入、 HTTPS 与证书；
