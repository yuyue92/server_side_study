# 🚀 API Debugger 快速启动指南

## 📥 下载项目

下载 `api-debugger.zip` 并解压到任意目录。

## 🛠️ 环境准备

### 1. 安装 Node.js (>= 18)
```bash
# 检查版本
node -v
npm -v
```

### 2. 安装 Rust (>= 1.70)
```bash
# macOS/Linux
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Windows: 下载 https://rustup.rs

# 检查版本
rustc --version
cargo --version
```

### 3. 安装 Tauri CLI
```bash
# 推荐使用 pnpm
npm install -g pnpm

# 或者使用 cargo 安装
cargo install tauri-cli
```

## ⚡ 启动项目

```bash
# 1. 进入项目目录
cd api-debugger

# 2. 安装依赖
pnpm install
# 或
npm install

# 3. 开发模式运行
pnpm tauri dev
# 或
npm run tauri dev
```

首次运行会自动编译 Rust 代码，需要等待几分钟。

## 📦 打包发布

```bash
# 构建生产版本
pnpm tauri build
# 或
npm run tauri build
```

构建产物位置：
- **Windows**: `src-tauri/target/release/bundle/msi/`
- **macOS**: `src-tauri/target/release/bundle/dmg/`
- **Linux**: `src-tauri/target/release/bundle/appimage/`

## 🔧 常见问题

### Q1: `tauri` 命令找不到
```bash
# 确保 @tauri-apps/cli 已安装
npm install -D @tauri-apps/cli
```

### Q2: Rust 编译错误
```bash
# 更新 Rust 工具链
rustup update
```

### Q3: 依赖安装失败
```bash
# 清理缓存重试
rm -rf node_modules
rm package-lock.json
npm install
```

### Q4: Windows 需要额外依赖
安装 [Microsoft Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)

### Q5: macOS 需要 Xcode
```bash
xcode-select --install
```

## 📁 项目文件清单

```
api-debugger/
├── package.json              # 前端依赖配置
├── vite.config.ts            # Vite 构建配置  
├── tailwind.config.js        # Tailwind 主题配置
├── tsconfig.json             # TypeScript 配置
├── index.html                # HTML 入口
│
├── src/                      # 前端源码
│   ├── main.tsx              # React 入口
│   ├── App.tsx               # 主应用组件
│   ├── index.css             # 全局样式
│   ├── types/index.ts        # 类型定义
│   ├── stores/appStore.ts    # Zustand 状态
│   ├── hooks/useRequest.ts   # 请求 Hook
│   ├── utils/helpers.ts      # 工具函数
│   └── components/           # UI 组件
│       ├── RequestBuilder/   # 请求构建器
│       ├── ResponseViewer/   # 响应查看器
│       ├── Sidebar/          # 侧边栏
│       └── common/           # 通用组件
│
└── src-tauri/                # Rust 后端
    ├── Cargo.toml            # Rust 依赖
    ├── tauri.conf.json       # Tauri 配置
    ├── build.rs              # 构建脚本
    ├── capabilities/         # 权限配置
    └── src/
        ├── main.rs           # 入口
        ├── lib.rs            # 库入口
        ├── commands/         # Tauri 命令
        │   ├── http.rs       # HTTP 请求
        │   ├── storage.rs    # 存储操作
        │   └── export.rs     # 导出功能
        └── utils/
            └── crypto.rs     # 加密工具
```

## ✨ 功能特性

- ✅ **HTTP 请求**: GET/POST/PUT/DELETE/PATCH 等全方法支持
- ✅ **参数配置**: Query、Headers、Body 可视化编辑
- ✅ **响应解析**: JSON 语法高亮、Headers 展示
- ✅ **SSE 支持**: Server-Sent Events 长连接
- ✅ **历史记录**: 自动保存，快速重放
- ✅ **集合管理**: 接口分组收藏
- ✅ **环境变量**: {{变量}} 替换
- ✅ **结果导出**: cURL、JSON、Postman 格式

---

🎉 **开始愉快地调试 API 吧！**
