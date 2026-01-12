Tauri（Rust + Web）桌面应用

认识项目结构（最重要就这几块）
- src/（或 app/ 等）：你的前端代码
- src-tauri/：Rust 后端与 Tauri 配置
- src-tauri/src/main.rs：入口，注册命令、插件
- src-tauri/Cargo.toml：Rust 依赖
- src-tauri/tauri.conf.json（或 Tauri.toml）：核心配置
