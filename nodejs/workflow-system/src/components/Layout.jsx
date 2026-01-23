import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  ListTodo, 
  PlusCircle, 
  CheckSquare, 
  GitBranch,
  LogOut,
  Menu,
  X,
  Bell,
  User
} from 'lucide-react';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: '工作台' },
  { path: '/tasks', icon: ListTodo, label: '任务列表' },
  { path: '/create', icon: PlusCircle, label: '发起审批' },
  { path: '/approvals', icon: CheckSquare, label: '待我审批' },
  { path: '/workflows', icon: GitBranch, label: '流程管理' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* 移动端遮罩 */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 侧边栏 */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-72 
        bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900
        transform transition-transform duration-300 ease-out
        lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="h-20 flex items-center px-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/30">
              <GitBranch className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-white">WorkFlow</h1>
              <p className="text-xs text-slate-400">审批流程管理系统</p>
            </div>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden ml-auto p-2 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 导航菜单 */}
        <nav className="p-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-xl
                transition-all duration-200
                ${isActive 
                  ? 'bg-gradient-to-r from-primary-500/20 to-accent-500/20 text-white shadow-lg shadow-primary-500/10' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
                }
              `}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* 用户信息 */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center text-xl">
              {user?.avatar || '👤'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-slate-400">{user?.department}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-rose-400 transition-colors"
              title="退出登录"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* 主内容区 */}
      <div className="lg:pl-72">
        {/* 顶部栏 */}
        <header className="sticky top-0 z-30 h-20 glass border-b border-white/20">
          <div className="h-full flex items-center justify-between px-4 lg:px-8">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-white/50 transition-colors"
            >
              <Menu className="w-6 h-6 text-slate-600" />
            </button>

            <div className="flex-1 lg:flex-none" />

            <div className="flex items-center gap-4">
              <button className="relative p-2 rounded-lg hover:bg-white/50 transition-colors">
                <Bell className="w-5 h-5 text-slate-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full" />
              </button>
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-white/50">
                <User className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-700">{user?.name}</span>
              </div>
            </div>
          </div>
        </header>

        {/* 页面内容 */}
        <main className="p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
