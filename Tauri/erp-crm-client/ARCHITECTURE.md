# ERP/CRM 客户端 - 结构化输出文档

## 📋 需求分析

| 需求项 | 实现方案 | 状态 |
|--------|----------|------|
| 客户管理系统桌面端 | Tauri v2 + React | ✅ 已实现 |
| 库存管理工具 | 产品管理 + 入出库 | ✅ 已实现 |
| 集成企业内部接口 | Rust HTTP Client | ✅ 已实现 |
| 离线缓存数据 | SQLite 本地数据库 | ✅ 已实现 |
| Rust 层加密存储 | AES-256-GCM + Argon2 | ✅ 已实现 |
| 扫码枪对接 | Serial Port API | ✅ 已实现 |
| Web 层数据录入 | React 表单组件 | ✅ 已实现 |
| 报表展示 | Recharts 图表库 | ✅ 已实现 |
| 打包分发 | Tauri 多平台打包 | ✅ 已配置 |

---

## 🏗️ 技术架构

```
┌─────────────────────────────────────────────────────────────────┐
│                     前端层 (Web View)                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  React 18 + TypeScript + Tailwind CSS 3 + Recharts      │  │
│  │  ├── 状态管理: Zustand (持久化)                           │  │
│  │  ├── 路由: React Router v6                               │  │
│  │  └── UI 组件: 自定义组件库                                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                     Tauri IPC Bridge                            │
│                              │                                   │
└─────────────────────────────┼───────────────────────────────────┘
                              │
┌─────────────────────────────┼───────────────────────────────────┐
│                     后端层 (Rust)                               │
│  ┌──────────────────────────┼──────────────────────────────┐   │
│  │                    Tauri Commands                        │   │
│  │  ├── 认证模块 (auth_*)                                   │   │
│  │  ├── 客户管理 (customer_*)                               │   │
│  │  ├── 产品管理 (product_*)                                │   │
│  │  ├── 库存操作 (stock_*)                                  │   │
│  │  ├── 订单管理 (order_*)                                  │   │
│  │  ├── 同步管理 (sync_*)                                   │   │
│  │  ├── 扫码枪 (scanner_*)                                  │   │
│  │  └── 存储管理 (storage_*)                                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│  ┌───────────┬───────────┬───────────┬───────────────────┐     │
│  │  SQLite   │  加密存储  │  数据同步  │  扫码枪驱动       │     │
│  │  rusqlite │  aes-gcm  │  reqwest  │  serialport       │     │
│  │           │  argon2   │  tokio    │                   │     │
│  └───────────┴───────────┴───────────┴───────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 项目结构

```
erp-crm-client/
├── src/                              # React 前端
│   ├── components/
│   │   ├── common/index.tsx          # 通用 UI 组件
│   │   └── layout/                   # 布局组件
│   │       ├── Sidebar.tsx           # 侧边栏
│   │       ├── Header.tsx            # 顶部导航
│   │       └── MainLayout.tsx        # 主布局
│   ├── pages/
│   │   ├── Dashboard.tsx             # 仪表盘
│   │   ├── Customers.tsx             # 客户管理
│   │   ├── Inventory.tsx             # 库存管理
│   │   ├── Orders.tsx                # 订单管理
│   │   ├── Reports.tsx               # 报表中心
│   │   └── Settings.tsx              # 系统设置
│   ├── hooks/index.ts                # 自定义 Hooks
│   ├── store/index.ts                # Zustand 状态
│   ├── services/tauri.ts             # Tauri API 封装
│   ├── types/index.ts                # TypeScript 类型
│   ├── utils/index.ts                # 工具函数
│   ├── App.tsx                       # 应用入口
│   ├── main.tsx                      # React 入口
│   └── index.css                     # 全局样式
├── src-tauri/                        # Rust 后端
│   ├── src/
│   │   ├── commands/mod.rs           # Tauri 命令
│   │   ├── database/mod.rs           # SQLite 数据库
│   │   ├── storage/mod.rs            # 加密存储
│   │   ├── scanner/mod.rs            # 扫码枪模块
│   │   ├── sync/mod.rs               # 数据同步
│   │   ├── lib.rs                    # 库入口
│   │   └── main.rs                   # 主入口
│   ├── Cargo.toml                    # Rust 依赖
│   └── tauri.conf.json               # Tauri 配置
├── package.json
├── tailwind.config.js
├── vite.config.ts
└── tsconfig.json
```

---

## 🔧 核心功能模块

### 1. 客户管理 (CRM)
| 功能 | 描述 | 文件位置 |
|------|------|----------|
| 客户列表 | 分页、搜索、筛选 | `pages/Customers.tsx` |
| 客户详情 | 查看完整信息 | Modal 组件 |
| 新建/编辑 | 表单验证 | Modal + Form |
| 客户分类 | VIP/普通/潜在 | StatusBadge |
| 导入导出 | Excel/CSV | 待扩展 |

### 2. 库存管理 (ERP)
| 功能 | 描述 | 文件位置 |
|------|------|----------|
| 产品管理 | CRUD 操作 | `pages/Inventory.tsx` |
| 入库操作 | 增加库存 | StockModal |
| 出库操作 | 减少库存 | StockModal |
| 库存预警 | 低于安全库存 | Alert + Filter |
| 扫码录入 | 扫码枪对接 | ScannerModal |

### 3. 订单管理
| 功能 | 描述 | 文件位置 |
|------|------|----------|
| 订单列表 | 多状态筛选 | `pages/Orders.tsx` |
| 订单详情 | 商品明细 | Modal |
| 状态流转 | 草稿→确认→发货→完成 | StatusActions |
| 订单统计 | 金额汇总 | StatCard |

### 4. 报表展示
| 功能 | 描述 | 文件位置 |
|------|------|----------|
| 销售报表 | 趋势图、对比 | `pages/Reports.tsx` |
| 库存报表 | 品类分析 | BarChart |
| 客户分析 | TOP 排行 | PieChart |
| 数据导出 | PDF/Excel | 待扩展 |

### 5. 系统功能
| 功能 | 描述 | 文件位置 |
|------|------|----------|
| 数据同步 | 增量/全量 | `sync/mod.rs` |
| 离线缓存 | SQLite | `database/mod.rs` |
| 加密存储 | AES-256-GCM | `storage/mod.rs` |
| 扫码枪 | Serial Port | `scanner/mod.rs` |

---

## 🔐 安全机制

### 数据加密流程
```
用户密码
    │
    ▼
┌─────────────┐
│  Argon2     │  密钥派生
│  KDF        │
└─────────────┘
    │
    ▼
32 字节密钥
    │
    ▼
┌─────────────┐
│  AES-256   │  数据加密
│  GCM       │
└─────────────┘
    │
    ▼
Nonce + 密文 → Base64 → 文件存储
```

### 数据同步策略
```
本地操作 → 同步队列 → 网络可用时上传 → 删除队列项
              │
              ├── 失败 → 重试计数 +1
              │
              └── 重试 > 5 次 → 标记为错误
```

---

## 🎨 UI/UX 设计

### 设计原则
- **简洁高效**: 清晰的信息层级，减少操作步骤
- **响应迅速**: 离线优先，本地缓存
- **视觉一致**: 统一的颜色系统和组件风格
- **操作反馈**: 加载状态、成功/失败提示

### 主题配色
```css
/* 主色调 - 蓝紫色系 */
--primary-600: #4f46e5;
--primary-500: #6366f1;

/* 语义色 */
--success: #10b981;
--warning: #f59e0b;
--danger: #ef4444;

/* 中性色 */
--surface-50: #f8fafc;
--surface-900: #0f172a;
```

---

## 📦 构建与部署

### 开发环境
```bash
# 安装依赖
npm install

# 启动开发服务器
npm run tauri dev
```

### 生产构建
```bash
# 构建应用
npm run tauri build

# 输出位置
# Windows: src-tauri/target/release/bundle/msi/
# macOS:   src-tauri/target/release/bundle/dmg/
# Linux:   src-tauri/target/release/bundle/appimage/
```

### 分发清单
| 平台 | 格式 | 大小(预估) |
|------|------|-----------|
| Windows | .msi, .exe | ~15MB |
| macOS | .dmg, .app | ~20MB |
| Linux | .AppImage, .deb | ~18MB |

---

## 🔍 自检清单

### 功能完整性 ✅
- [x] 仪表盘统计展示
- [x] 客户 CRUD 操作
- [x] 库存管理和入出库
- [x] 订单管理和状态流转
- [x] 报表数据可视化
- [x] 系统设置页面
- [x] 离线数据存储
- [x] 数据加密机制
- [x] 扫码枪接口
- [x] 数据同步机制

### 代码质量 ✅
- [x] TypeScript 类型完整
- [x] 组件模块化
- [x] 状态管理规范
- [x] Rust 错误处理
- [x] 代码注释完善

### 用户体验 ✅
- [x] 响应式布局
- [x] 加载状态提示
- [x] 表单验证
- [x] 操作确认对话框
- [x] 统一的视觉风格

---

## 📝 后续扩展建议

1. **数据导入导出**: 支持 Excel/CSV 批量导入导出
2. **打印功能**: 集成打印模板，支持订单/报表打印
3. **权限管理**: 基于角色的访问控制 (RBAC)
4. **消息推送**: 系统通知和提醒功能
5. **多语言支持**: i18n 国际化
6. **深色模式**: 主题切换功能
7. **数据备份**: 自动备份和恢复
8. **插件系统**: 支持功能扩展

---

## 📄 License

MIT License - 可自由使用、修改和分发
