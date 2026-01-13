一个完整的 Tauri + React.js + SQLite 订单管理系统。

📋 项目特点

功能模块
- 仪表盘 - 显示统计数据(订单数、客户数、产品数、总收入)
- 订单管理 - 创建、查看、更新状态、删除订单
- 客户管理 - 添加、查看、删除客户
- 产品管理 - 添加、查看、删除产品

界面设计
- ✅ 顶部状态栏 - 显示系统标题和用户状态
- ✅ 左侧菜单 - 图标+文字导航,支持激活状态
- ✅ 右侧内容区 - 主要内容展示区域
- ✅ Bootstrap风格 - 简洁明亮的蓝紫渐变主题

技术栈
- 前端: React.js (非TypeScript)
- 后端: Tauri (Rust)
- 数据库: SQLite (本地存储)
- 构建工具: Vite

一、安装依赖： npm install

二、运行开发环境： npm run tauri dev

三、打包应用： npm run tauri build

## 📁 完整文件结构

```
order-management-system/
├── src/
│   ├── main.jsx              # 入口文件
│   ├── App.jsx               # 主应用组件
│   ├── App.css               # 全局样式
│   └── components/
│       ├── Layout.jsx        # 布局组件(顶栏+侧边栏)
│       ├── Dashboard.jsx     # 仪表盘
│       ├── OrderList.jsx     # 订单列表
│       ├── OrderForm.jsx     # 新建订单
│       ├── CustomerList.jsx  # 客户管理
│       └── ProductList.jsx   # 产品管理
├── src-tauri/
│   ├── src/
│   │   └── main.rs          # Rust后端逻辑
│   └── Cargo.toml           # Rust依赖配置
├── index.html
├── package.json
└── vite.config.js
```

🎨 界面预览
- 紫蓝渐变顶栏 配状态指示器
- 白色侧边栏 带图标和悬停效果
- 卡片式布局 数据统计卡片、表单卡片
- 表格展示 订单/客户数据列表
- 网格布局 产品卡片展示

💾 数据库说明

SQLite数据库会自动创建在应用根目录下的 orders.db 文件,包含三张表:
- customers - 客户信息
- products - 产品信息
- orders - 订单信息(关联客户和产品)

所有数据本地存储,无需配置外部数据库!
