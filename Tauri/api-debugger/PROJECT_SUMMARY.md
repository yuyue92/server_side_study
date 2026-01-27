# API Debugger - 企业级 API 调试工具

## 📋 项目概览

基于 **Tauri v2 + React + Tailwind v3** 的轻量级企业 API 调试工具，类似 Postman 的简化版，专注于内部微服务接口调试。

---

## 🎯 需求拆解与实现

### 核心功能模块

| 模块 | 功能 | 实现状态 | 技术方案 |
|------|------|---------|---------|
| **请求构建** | HTTP 方法选择、URL 输入 | ✅ 完成 | React 组件 + Zustand |
| **参数配置** | Query 参数、Headers、Body | ✅ 完成 | KeyValueEditor 组件 |
| **请求发送** | 普通请求、超时控制 | ✅ 完成 | Rust reqwest |
| **SSE 支持** | 长连接、实时事件 | ✅ 完成 | EventSource API |
| **响应解析** | JSON 美化、Headers 展示 | ✅ 完成 | 自定义 JSON 高亮 |
| **结果导出** | cURL、JSON、Postman 格式 | ✅ 完成 | Rust 命令 |
| **历史记录** | 保存、重放、删除 | ✅ 完成 | Zustand persist |
| **集合管理** | 分组、收藏请求 | ✅ 完成 | 本地存储 |
| **环境变量** | 变量定义、替换 | ✅ 完成 | {{变量}} 语法 |
| **加密支持** | AES-256-GCM | ✅ 完成 | Rust crypto |

---

## 📁 项目结构

```
api-debugger/
├── src/                           # React 前端
│   ├── components/
│   │   ├── RequestBuilder/        # 请求构建器
│   │   │   └── RequestBuilder.tsx # HTTP 方法、URL、参数、Body 配置
│   │   ├── ResponseViewer/        # 响应查看器
│   │   │   └── ResponseViewer.tsx # JSON 高亮、Headers、SSE 事件
│   │   ├── Sidebar/               # 侧边栏
│   │   │   └── Sidebar.tsx        # 历史、集合、环境管理
│   │   └── common/                # 通用组件
│   │       ├── Icons.tsx          # SVG 图标库
│   │       ├── KeyValueEditor.tsx # 键值对编辑器
│   │       └── Tabs.tsx           # Tab 切换组件
│   ├── hooks/
│   │   └── useRequest.ts          # 请求发送 Hook
│   ├── stores/
│   │   └── appStore.ts            # Zustand 全局状态
│   ├── types/
│   │   └── index.ts               # TypeScript 类型定义
│   ├── utils/
│   │   └── helpers.ts             # 工具函数
│   ├── App.tsx                    # 主应用组件
│   ├── main.tsx                   # 入口文件
│   └── index.css                  # 全局样式
│
├── src-tauri/                     # Rust 后端
│   ├── src/
│   │   ├── commands/              # Tauri 命令
│   │   │   ├── http.rs            # HTTP 请求处理
│   │   │   ├── storage.rs         # 本地存储
│   │   │   ├── export.rs          # 导出功能
│   │   │   └── mod.rs
│   │   ├── utils/
│   │   │   ├── crypto.rs          # 加密工具
│   │   │   └── mod.rs
│   │   ├── lib.rs                 # 库入口
│   │   └── main.rs                # 应用入口
│   ├── capabilities/
│   │   └── default.json           # 权限配置
│   ├── Cargo.toml                 # Rust 依赖
│   ├── tauri.conf.json            # Tauri 配置
│   └── build.rs
│
├── package.json                   # NPM 配置
├── vite.config.ts                 # Vite 配置
├── tailwind.config.js             # Tailwind 配置
├── tsconfig.json                  # TypeScript 配置
└── README.md                      # 项目文档
```

---

## 🔧 技术架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                         用户界面层 (React + Tailwind)                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────────────┐ │
│  │  RequestBuilder │  │  ResponseViewer │  │      Sidebar         │ │
│  │  ─────────────  │  │  ─────────────  │  │  ────────────────    │ │
│  │  • URL 输入     │  │  • JSON 高亮    │  │  • 历史记录          │ │
│  │  • 方法选择     │  │  • Headers 表格 │  │  • 集合管理          │ │
│  │  • 参数配置     │  │  • SSE 事件流   │  │  • 环境变量          │ │
│  │  • Body 编辑    │  │  • 状态统计     │  │                      │ │
│  └─────────────────┘  └─────────────────┘  └──────────────────────┘ │
│                                ▲                                     │
│                                │ Props / Zustand                     │
│                                ▼                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                      状态管理 (Zustand)                        │  │
│  │  currentRequest | currentResponse | history | collections      │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                ▲
                                │ Tauri IPC (invoke)
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         后端服务层 (Rust)                           │
│  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────┐   │
│  │   HTTP Client    │  │     Storage      │  │     Export      │   │
│  │   ────────────   │  │   ────────────   │  │   ──────────    │   │
│  │   • reqwest      │  │   • 文件存储     │  │   • cURL        │   │
│  │   • 异步请求     │  │   • JSON 持久化  │  │   • JSON        │   │
│  │   • SSL/TLS      │  │                  │  │   • Postman     │   │
│  └──────────────────┘  └──────────────────┘  └─────────────────┘   │
│  ┌──────────────────┐                                               │
│  │     Crypto       │                                               │
│  │   ────────────   │                                               │
│  │   • AES-256-GCM  │                                               │
│  │   • SHA256       │                                               │
│  └──────────────────┘                                               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 使用指南

### 环境要求

- Node.js >= 18
- Rust >= 1.70
- pnpm >= 8.0 (推荐) 或 npm

### 安装与运行

```bash
# 1. 进入项目目录
cd api-debugger

# 2. 安装前端依赖
pnpm install
# 或
npm install

# 3. 开发模式运行
pnpm tauri dev
# 或
npm run tauri dev

# 4. 构建生产版本
pnpm tauri build
# 或
npm run tauri build
```

### 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl + Enter` | 发送请求 |
| `Ctrl + S` | 保存到集合 |

---

## 🎨 界面设计

采用 **科技感深色主题**：

- **主色调**: 深蓝黑 (#0a0e14)
- **强调色**: 青蓝渐变 (#4fc3f7 → #26c6da)
- **字体**: JetBrains Mono (等宽编程字体)
- **特色**: 
  - HTTP 方法颜色编码 (GET=绿, POST=橙, DELETE=红...)
  - 状态码颜色区分 (2xx=绿, 4xx=橙, 5xx=红)
  - 响应时间可视化
  - JSON 语法高亮

---

## ✅ 功能自检清单

| 功能点 | 状态 | 说明 |
|--------|------|------|
| HTTP 方法选择 | ✅ | GET/POST/PUT/DELETE/PATCH/HEAD/OPTIONS |
| URL 输入 | ✅ | 支持变量替换 {{var}} |
| Query 参数 | ✅ | 可视化键值对编辑 |
| Headers 配置 | ✅ | 可启用/禁用单个 header |
| Body 类型 | ✅ | none/json/form/raw |
| JSON 编辑器 | ✅ | 多行文本输入 |
| 请求发送 | ✅ | 异步发送，显示加载状态 |
| 响应状态 | ✅ | 状态码、耗时、大小 |
| 响应 Headers | ✅ | 表格展示 |
| JSON 美化 | ✅ | 语法高亮 + 格式化 |
| SSE 模式 | ✅ | 实时事件流展示 |
| 复制响应 | ✅ | 一键复制 |
| 导出 cURL | ✅ | 生成完整命令 |
| 导出 JSON | ✅ | 下载文件 |
| 历史记录 | ✅ | 自动保存，可重放 |
| 集合管理 | ✅ | 创建/删除/保存请求 |
| 环境变量 | ✅ | 定义变量，URL 中引用 |
| 数据持久化 | ✅ | localStorage + Rust 文件 |
| 响应式布局 | ✅ | 侧边栏可收起 |
| 深色主题 | ✅ | 科技感 UI |

---

## 📝 后续可扩展功能

1. **WebSocket 支持** - 实时双向通信调试
2. **GraphQL 支持** - GraphQL 查询构建器
3. **Mock Server** - 本地模拟接口
4. **团队协作** - 云端同步集合
5. **脚本支持** - Pre-request/Test 脚本
6. **批量测试** - 自动化接口测试
7. **性能分析** - 请求耗时分析图表

---

## 📄 许可证

MIT License

---

**开发完成** ✨

项目已包含完整的前端 UI 和后端逻辑，可直接运行使用。
