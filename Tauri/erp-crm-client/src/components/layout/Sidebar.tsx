import { NavLink, useLocation } from 'react-router-dom';
import { useAppStore } from '@/store';
import { cn } from '@/utils';
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Building2,
  RefreshCw,
  Wifi,
  WifiOff,
} from 'lucide-react';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: '仪表盘' },
  { path: '/customers', icon: Users, label: '客户管理' },
  { path: '/inventory', icon: Package, label: '库存管理' },
  { path: '/orders', icon: ShoppingCart, label: '订单管理' },
  { path: '/reports', icon: BarChart3, label: '报表中心' },
  { path: '/settings', icon: Settings, label: '系统设置' },
];

export function Sidebar() {
  const location = useLocation();
  const { config, sidebarCollapsed, toggleSidebar, syncStatus, isOffline } = useAppStore();

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen bg-white border-r border-surface-200 flex flex-col transition-all duration-300 z-40',
        sidebarCollapsed ? 'w-[72px]' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-surface-100">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-primary-500 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <h1 className="font-bold text-surface-900 truncate">{config.companyName}</h1>
              <p className="text-xs text-surface-500">ERP/CRM 系统</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path !== '/' && location.pathname.startsWith(item.path));

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-surface-600 hover:bg-surface-50 hover:text-surface-900'
              )}
            >
              <item.icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-primary-600')} />
              {!sidebarCollapsed && (
                <span className="font-medium truncate">{item.label}</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Status & Collapse */}
      <div className="p-3 border-t border-surface-100 space-y-2">
        {/* Sync Status */}
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg text-xs',
            syncStatus.isSyncing
              ? 'bg-primary-50 text-primary-700'
              : isOffline
              ? 'bg-warning-50 text-warning-600'
              : 'bg-success-50 text-success-600'
          )}
        >
          {syncStatus.isSyncing ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              {!sidebarCollapsed && <span>同步中...</span>}
            </>
          ) : isOffline ? (
            <>
              <WifiOff className="h-4 w-4" />
              {!sidebarCollapsed && <span>离线模式</span>}
            </>
          ) : (
            <>
              <Wifi className="h-4 w-4" />
              {!sidebarCollapsed && <span>已连接</span>}
            </>
          )}
        </div>

        {/* Collapse Button */}
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-surface-500 hover:bg-surface-100 hover:text-surface-700 transition-colors"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span className="text-sm">收起菜单</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
