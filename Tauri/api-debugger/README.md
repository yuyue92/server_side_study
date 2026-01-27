# API Debugger - 企业级 API 调试工具

基于 Tauri v2 + React + Tailwind v3 的轻量级 API 调试工具

## 🎯 项目概述

### 需求拆解

| 模块 | 功能点 | 技术实现 |
|------|--------|----------|
| **请求配置** | HTTP 方法选择、URL 输入、Headers 配置、Body 配置 | React 表单组件 |
| **参数管理** | Query 参数、Path 参数、JSON/Form 编辑器 | 动态表单 + JSON Editor |
| **请求发送** | 普通请求、长连接(SSE)、加密请求 | Rust reqwest + tokio |
| **响应解析** | JSON 美化、响应头显示、耗时统计 | React JSON Viewer |
| **历史记录** | 请求历史保存、快速重放 | Rust SQLite/文件存储 |
| **结果导出** | 导出为 JSON/cURL | Rust 文件操作 |
| **集合管理** | 接口分组、环境变量 | 本地存储 |

### 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend Layer                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Request     │  │ Response    │  │ History/Collection  │  │
│  │ Builder     │  │ Viewer      │  │ Manager             │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│                          ▲                                   │
│                          │ Tauri IPC                        │
│                          ▼                                   │
├─────────────────────────────────────────────────────────────┤
│                    Rust Backend Layer                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ HTTP Client │  │ SSE/WS      │  │ Crypto Module       │  │
│  │ (reqwest)   │  │ Handler     │  │ (encryption)        │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐                           │
│  │ File I/O   │  │ Storage     │                           │
│  │ (export)    │  │ (history)   │                           │
│  └─────────────┘  └─────────────┘                           │
└─────────────────────────────────────────────────────────────┘
```

## 📁 项目结构

```
api-debugger/
├── src-tauri/                 # Rust 后端
│   ├── src/
│   │   ├── main.rs           # 应用入口
│   │   ├── lib.rs            # 库入口
│   │   ├── commands/         # Tauri 命令
│   │   │   ├── mod.rs
│   │   │   ├── http.rs       # HTTP 请求处理
│   │   │   ├── storage.rs    # 存储操作
│   │   │   └── export.rs     # 导出功能
│   │   └── utils/            # 工具模块
│   │       ├── mod.rs
│   │       └── crypto.rs     # 加密工具
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/                       # React 前端
│   ├── components/
│   │   ├── RequestBuilder/   # 请求构建器
│   │   ├── ResponseViewer/   # 响应查看器
│   │   ├── Sidebar/          # 侧边栏
│   │   └── common/           # 通用组件
│   ├── hooks/                # 自定义 Hooks
│   ├── stores/               # 状态管理
│   ├── types/                # TypeScript 类型
│   ├── utils/                # 工具函数
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── package.json
├── tailwind.config.js
├── vite.config.ts
└── tsconfig.json
```

## 🚀 核心功能

### 1. 请求构建
- 支持 GET/POST/PUT/DELETE/PATCH/HEAD/OPTIONS
- Query 参数可视化编辑
- Headers 键值对配置
- Body 支持 JSON/Form-data/Raw/Binary

### 2. 响应处理
- JSON 语法高亮与格式化
- 响应头完整展示
- 响应时间、大小统计
- 二进制响应预览

### 3. 高级特性
- SSE (Server-Sent Events) 长连接支持
- 请求加密/签名支持
- 环境变量与变量替换
- 请求历史与收藏

### 4. 数据管理
- 导出为 cURL 命令
- 导出为 JSON 格式
- 批量导入/导出集合

## 🛠️ 开发指南

### 环境要求
- Node.js >= 18
- Rust >= 1.70
- pnpm >= 8.0

### 安装依赖
```bash
# 前端依赖
pnpm install

# Rust 依赖会在构建时自动安装
```

### 开发模式
```bash
pnpm tauri dev
```

### 构建生产版本
```bash
pnpm tauri build
```

## 📝 设计理念

采用 **科技感工业风** 设计语言：
- 深色主题为主，减少视觉疲劳
- 等宽字体展示代码和数据
- 清晰的视觉层次和信息密度
- 流畅的交互动画和反馈
