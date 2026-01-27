import React from "react";
import { useAppStore } from "./stores/appStore";
import { RequestBuilder } from "./components/RequestBuilder/RequestBuilder";
import { ResponseViewer } from "./components/ResponseViewer/ResponseViewer";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { MenuIcon, XIcon } from "./components/common/Icons";

const App: React.FC = () => {
  const { sidebarOpen, setSidebarOpen, activeEnvironmentId, environments } =
    useAppStore();

  const activeEnv = environments.find((e) => e.id === activeEnvironmentId);

  return (
    <div className="flex h-screen bg-bg-primary overflow-hidden">
      {/* 侧边栏 */}
      <Sidebar />

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 顶部栏 */}
        <header className="flex items-center justify-between px-4 py-3 bg-bg-secondary border-b border-border-primary">
          <div className="flex items-center gap-4">
            {/* 侧边栏切换按钮 */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-hover 
                         rounded-lg transition-all"
              title={sidebarOpen ? "收起侧边栏" : "展开侧边栏"}
            >
              {sidebarOpen ? <XIcon size={18} /> : <MenuIcon size={18} />}
            </button>

            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-blue to-accent-cyan 
                                flex items-center justify-center shadow-glow">
                  <span className="text-bg-primary font-bold text-sm">A</span>
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full 
                                bg-accent-green border-2 border-bg-secondary" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-text-primary">
                  API Debugger
                </h1>
                <p className="text-xs text-text-muted">企业级接口调试工具</p>
              </div>
            </div>
          </div>

          {/* 右侧状态 */}
          <div className="flex items-center gap-4">
            {/* 当前环境 */}
            {activeEnv && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-accent-green/10 
                              border border-accent-green/30 rounded-full">
                <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
                <span className="text-xs text-accent-green font-medium">
                  {activeEnv.name}
                </span>
              </div>
            )}

            {/* 版本信息 */}
            <span className="text-xs text-text-muted">v1.0.0</span>
          </div>
        </header>

        {/* 主工作区 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 请求构建区 */}
          <div className="flex-1 flex flex-col min-w-0 border-r border-border-primary">
            <RequestBuilder />
          </div>

          {/* 响应查看区 */}
          <div className="flex-1 flex flex-col min-w-0">
            <ResponseViewer />
          </div>
        </div>

        {/* 底部状态栏 */}
        <footer className="flex items-center justify-between px-4 py-2 bg-bg-secondary 
                           border-t border-border-primary text-xs text-text-muted">
          <div className="flex items-center gap-4">
            <span>按 Ctrl+Enter 发送请求</span>
            <span>|</span>
            <span>Ctrl+S 保存到集合</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Tauri v2 + React + Tailwind</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default App;
