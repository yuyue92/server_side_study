# React (Vite) + Go (Gin) + SQLite3（Railway / Koyeb）提示词模板包

> 用法建议：**Opus 4.6 做设计包（方案/架构/契约）→ Codex 5.3 做落地实现（改仓库/补测试/跑命令）→ Opus 做审查验收（对照契约/风险清单）**。  
> 你只需要把「占位符」替换成你项目的真实信息，然后整段复制给对应模型即可。

---

## 0. 项目默认约束（建议每次开工都贴给模型）
- 技术栈：**React（Vite） + Go（Gin） + SQLite3**
- 部署：**Railway 或 Koyeb**
- 目标：交付可上线的全栈功能（前端 + API + DB + 测试 + 文档 + 部署说明）
- SQLite 关键点（默认要求实现）：
  - `PRAGMA journal_mode=WAL;`
  - `PRAGMA busy_timeout=5000;`
  - `PRAGMA foreign_keys=ON;`
  - 写事务尽量短；避免长时间持锁；必要时做重试策略
- 输出要求（默认）：
  - **PR 级切片**（每个 PR 可独立合并、可验证）
  - 每个 PR：变更文件清单 + 验证命令 + 风险点 + 回滚方式（如有）

---

## 1. 推荐仓库结构（单仓库）
```
/web                 # Vite React
  /src
  vite.config.ts
  package.json

/api                 # Go Gin
  /cmd/server
  /internal
    /http            # handlers/routes/middleware
    /db              # sqlite init + queries/repo
    /service         # usecases
    /domain          # types/errors
  /migrations
  go.mod

/docker
  api.Dockerfile
  web.Dockerfile     # 可选（或交给平台静态托管）

/ops
  railway.md
  koyeb.md

README.md
```

---

## 2. Opus 4.6：从需求产出「可执行设计包」

### 2.1 需求澄清 + 默认假设
**复制给 Opus：**
> 你是我的技术负责人。请基于以下资料，产出：  
> 1) 一页需求摘要（用户目标/非目标/成功指标）  
> 2) 约束清单（性能/成本/时延/兼容/上线窗口/安全）  
> 3) 必须澄清的问题（按影响排序），并给出“建议默认假设”  
> 4) 风险与反例（最可能翻车的 10 条）  
> 技术栈：React(Vite) + Go(Gin) + SQLite3；部署：Railway/Koyeb。  
> 【资料】  
> {{粘贴PRD/Issue/对话/接口说明/截图文字}}

### 2.2 方案对比与选型（至少 3 套）
**复制给 Opus：**
> 给出至少 3 套可行方案（A/B/C），每套包含：  
> - 架构图（文字版：组件/边界/数据流）  
> - DB 设计与一致性策略（SQLite 并发写、锁、WAL、busy_timeout、事务边界）  
> - API 设计（鉴权、分页、错误码、幂等）  
> - 可观测性（日志字段、指标、告警）  
> - 复杂度与风险（实现/运维/扩展/迁移到 Postgres 的路径）  
> 最后给推荐方案，并写清楚为什么不是另外两套。  
> 团队规模：{{X}}，交付周期：{{Y}}，现有代码约束：{{列出}}

### 2.3 输出「可执行设计包」（Codex 直接照着做）
**复制给 Opus：**
> 请把推荐方案落成一份“可执行设计包”，必须包含：  
> 1) 模块边界：web/api 的职责，Gin 路由分层（routes/handlers/services/repos）  
> 2) 数据模型：SQLite 表、索引、约束、迁移（up/down），并给 Postgres 兼容建议  
> 3) API 契约：endpoint、schema、错误码、鉴权、分页、幂等、速率限制（如需要）  
> 4) 关键流程时序（至少 3 个：成功/失败/重试）  
> 5) 非功能：性能预算、超时、限流/降级、观测指标（含 DB lock）  
> 6) 安全：威胁模型（>=8 条）+ 对策（CORS/JWT/CSRF/注入/越权）  
> 7) 任务拆解：按“可合并 PR 粒度”列 TODO，每条写验收标准+验证命令  
> 输出格式：清晰标题与编号，可直接变 Jira/Issues。  
> 【资料】{{同上}}

---

## 3. Codex 5.3：仓库内落地实现（Gin + SQLite）

### 3.1 启动模板（强烈建议每次开工都用）
**复制给 Codex：**
> 你将作为资深全栈工程师在此仓库工作（web: Vite React；api: Go Gin；DB: SQLite3）。  
> 规则：  
> - 先扫描仓库结构与关键配置（web: vite、测试框架；api: gin、依赖、现有DB层、Docker/CI）。  
> - 先输出计划（<=8步）与影响文件清单，再开始编码。  
> - 每完成一个阶段：汇报变更文件列表、如何验证、下一步。  
> - 默认补齐测试与最小文档（README/示例请求/环境变量说明）。  
> 任务：实现以下设计包 TODO 的第 {{N}}~{{M}} 条。  
> 【设计包摘录：API契约/表结构/任务拆解/验收标准】  
> {{粘贴 Opus 输出的相关段落}}

### 3.2 SQLite 初始化与连接策略（WAL/busy_timeout/外键）
**复制给 Codex：**
> 为 Gin API 接入 SQLite3（database/sql），要求：  
> - DB 初始化时设置：WAL、busy_timeout、foreign_keys，并解释原因  
> - 设计连接池参数（MaxOpenConns/MaxIdleConns/ConnMaxLifetime）并说明取值理由  
> - 提供本地验证命令：跑迁移、启动服务、跑测试  
> 输出：变更文件清单 + 验证步骤。  
> 约束：写事务要短；出现 SQLITE_BUSY 需要可控重试（最多 {{K}} 次，退避 {{策略}}）。

### 3.3 迁移框架（建议 goose）
**复制给 Codex：**
> 为 /api 引入迁移框架（优先 goose），要求：  
> - /api/migrations 下生成示例 up/down SQL  
> - 增加 Makefile 或 go run 命令：migrate-up / migrate-down / migrate-status  
> - README 增加：本地初始化与迁移步骤  
> 输出：文件变更清单 + 命令列表 + 示例输出（如果能运行）。  

### 3.4 Gin：统一错误码与响应格式（强制）
**复制给 Codex：**
> 在 Gin 中实现统一错误处理：  
> - 定义错误码体系（VALIDATION/UNAUTH/FORBIDDEN/NOT_FOUND/CONFLICT/RATE_LIMIT/INTERNAL）  
> - 返回 JSON 统一结构：{code,message,request_id,details}  
> - 加入 request_id 中间件（从 header 透传或生成）  
> - 日志结构化输出，至少包含 request_id、route、latency_ms、status、err_code  
> - 写单测覆盖 4 类错误  
> 输出：变更文件列表、测试列表、验证命令。  

### 3.5 实现一个 endpoint（契约 → 实现 → 测试）
**复制给 Codex：**
> 按以下 API 契约实现 endpoint：  
> {{METHOD}} {{PATH}}  
> Auth: {{JWT/None}}  
> Request: {{schema}}  
> Response: {{schema}}  
> Errors: {{error codes}}  
> 要求：  
> - 写操作说明事务边界；若有幂等，给出幂等键/去重策略  
> - 用 httptest 覆盖：成功、参数错、权限错、冲突、not found  
> - 给出 curl 示例与验证命令  
> 输出：变更文件列表、测试列表、验证步骤。  

### 3.6 幂等 + 去重（写请求必备）
**复制给 Codex：**
> 为写接口 {{PATH}} 增加幂等：  
> - 客户端通过 header: Idempotency-Key 提交  
> - 服务端在 SQLite 中存储去重记录（key + request_hash + response_body + status + expires_at）  
> - 幂等窗口 {{TTL}}，相同 key 但不同 payload 要返回 CONFLICT  
> - 测试覆盖：重复请求返回同响应、payload 不同返回冲突、过期后可重新执行  
> 输出：表结构/索引、代码变更、测试与验证命令。  

---

## 4. 前端（Vite React）落地模板

### 4.1 前端页面契约（先用 Opus 产出）
**复制给 Opus：**
> 为页面/功能 {{PAGE}} 输出“页面契约”：  
> - 状态机：loading/empty/error/success（含分页、筛选、乐观更新、重试）  
> - 组件拆分（容器/展示）与 props 契约  
> - 数据获取策略（并发、取消请求、缓存、错误重试）  
> - 表单校验与错误呈现规范  
> - 埋点事件清单（如需要）  
> 最后给实现清单（按 PR 切片）。  
> 技术栈：Vite React。API：Go Gin。  

### 4.2 前端实现 + 关键测试（Codex）
**复制给 Codex：**
> 按以下页面契约实现：  
> {{粘贴页面契约}}  
> 要求：  
> - 处理竞态（快速切换筛选/路由时避免脏数据）  
> - 错误态可恢复（retry/提示）  
> - 使用 fetch/axios +（可选）React Query；按仓库现状来  
> - 加 2~4 个关键测试（Vitest + Testing Library，或仓库现有框架）  
> - 给出验证命令：pnpm/npm/yarn dev、build、test  
> 输出：变更文件列表 + 验证步骤。  

### 4.3 API Client 规范（强制 request_id/错误码）
**复制给 Codex：**
> 在 web 侧实现 API client：  
> - 自动携带 X-Request-Id（若无则生成 uuid）  
> - 统一处理后端错误结构 {code,message,request_id,details}  
> - 对 VALIDATION/UNAUTH/FORBIDDEN/CONFLICT 做分支处理（toast/inline/redirect）  
> - 提供最小示例：在页面调用并展示 loading/error/success  
> 输出：文件变更清单 + 验证步骤。  

---

## 5. 部署（Railway / Koyeb）提示词模板

### 5.1 通用部署准备（Docker + 健康检查 + 环境变量）
**复制给 Codex：**
> 为该仓库准备 Railway 或 Koyeb 部署（优先 Docker 化），要求：  
> - /api 添加 Dockerfile（多阶段构建），监听 $PORT  
> - 增加 /healthz（返回 version/commit + db ok）  
> - 环境变量清单：PORT、DB_PATH、CORS_ORIGINS、JWT_SECRET、LOG_LEVEL 等  
> - SQLite 数据文件持久化：默认路径 /data/app.db，说明卷挂载方式；如果平台不支持持久磁盘，请写清风险与替代方案  
> - /ops 输出 railway.md 与 koyeb.md（一步步部署）  
> 输出：变更文件清单 + 部署步骤 + 验证方式。  

### 5.2 Railway 专用（提示词）
**复制给 Codex：**
> 生成 Railway 部署文档（/ops/railway.md），包含：  
> - 创建服务、设置变量、设置健康检查  
> - 持久化卷（若可用）：挂载到 /data  
> - 如何查看日志、如何回滚、如何做 DB 备份（sqlite3 .backup 或导出）  
> - 验证清单：/healthz、关键 API、前端连通性  
> 输出该 md 文件内容与引用到 README 的位置。  

### 5.3 Koyeb 专用（提示词）
**复制给 Codex：**
> 生成 Koyeb 部署文档（/ops/koyeb.md），包含：  
> - 创建服务、Docker/Buildpack 配置、变量、端口、健康检查  
> - SQLite 持久化方案（如果仅临时磁盘，明确“重启数据丢失”的风险）  
> - 验证与回滚步骤  
> 输出该 md 文件内容与引用到 README 的位置。  

---

## 6. PR 切片（建议默认）
1) 基础设施：DB 初始化（WAL/busy_timeout）+ 迁移框架 + /healthz + request_id + 日志  
2) 数据模型：核心表结构 + repo 层 + 单测  
3) 核心 API：最小 endpoints + httptest  
4) 前端页面：状态机落地 + API client + 关键交互测试  
5) 部署：Dockerfile + ops 文档 + 环境变量 + 健康检查接入  
6) 硬化：超时/限流、错误码完善、观测指标、备份策略说明

---

## 7. 最常用占位符（复制替换用）
- {{PAGE}}：页面/功能名
- {{PATH}}：/api/v1/...
- {{schema}}：字段类型、必填、枚举、示例
- {{TTL}}：幂等窗口（如 10m/24h）
- {{N}}~{{M}}：本次要实现的任务切片范围
- {{K}}：SQLITE_BUSY 重试次数（建议 3）
- {{策略}}：退避策略（如 exponential backoff 100ms/200ms/400ms）

---

## 8. 你可以直接贴给我以便“更进一步定制”的信息（可选）
- API 的路由前缀（例如 /api/v1）
- 鉴权方式（JWT / session / none）
- 前端状态管理（React Query / Zustand / Redux / none）
- 是否需要多租户/角色权限（RBAC）
