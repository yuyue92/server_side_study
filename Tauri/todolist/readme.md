创建项目：
```
# 任选其一（npm/pnpm/yarn/bun 都行）
npm create tauri-app@latest
# 然后按提示选择：项目名、包管理器、前端框架（比如 React + TS）
进入目录后启动开发：
cd your-app
npm install
npm run tauri dev
```

一套 Windows 开发环境 + Tauri v2 + React（纯 JS，非 TS） 的「能直接跑起来」示例：
- Todo + 简易用户管理（CRUD），并且把数据持久化到本机 AppData（用 Tauri v2 的 plugin-fs），全流程从创建到打包都覆盖。

前端react纯JavaScript，目录结构：
- 4.1 数据层：读写 AppData 下的 JSON：src/storage.js
- 4.2 UI：App 入口 + Tabs：src/App.jsx
- 4.3 Todo 组件（新增/完成/删除/筛选）：src/components/Todos.jsx
- 4.4 Users 组件（新增/编辑/删除）：src/components/Users.jsx
- 4.5 React 入口 & 样式：src/main.jsx
- src/styles.css

开发运行：npm run tauri dev

打包：npm run tauri build
