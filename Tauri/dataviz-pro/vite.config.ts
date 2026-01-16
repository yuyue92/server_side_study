import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,              // 设置为 1420
    strictPort: true,        // 端口被占用时报错而不是换端口
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
});