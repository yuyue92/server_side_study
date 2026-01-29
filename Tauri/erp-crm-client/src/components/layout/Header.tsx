import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/store';
import { Avatar, Badge } from '@/components/common';
import { formatRelativeTime } from '@/utils';
import {
  Bell,
  Search,
  Settings,
  LogOut,
  User,
  ScanBarcode,
  RefreshCw,
} from 'lucide-react';

export function Header() {
  const {
    currentUser,
    notifications,
    unreadNotificationCount,
    markNotificationRead,
    logout,
    syncStatus,
  } = useAppStore();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-surface-200 flex items-center justify-between px-6">
      {/* Search */}
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
          <input
            type="text"
            placeholder="搜索客户、产品、订单..."
            className="w-full pl-10 pr-4 py-2 bg-surface-50 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 text-xs text-surface-400 bg-surface-100 rounded">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2">
        {/* Scanner Status */}
        <button className="p-2.5 rounded-xl hover:bg-surface-100 transition-colors text-surface-500 hover:text-surface-700">
          <ScanBarcode className="h-5 w-5" />
        </button>

        {/* Sync Button */}
        <button 
          className="p-2.5 rounded-xl hover:bg-surface-100 transition-colors text-surface-500 hover:text-surface-700"
          disabled={syncStatus.isSyncing}
        >
          <RefreshCw className={`h-5 w-5 ${syncStatus.isSyncing ? 'animate-spin' : ''}`} />
        </button>

        {/* Notifications */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2.5 rounded-xl hover:bg-surface-100 transition-colors text-surface-500 hover:text-surface-700 relative"
          >
            <Bell className="h-5 w-5" />
            {unreadNotificationCount > 0 && (
              <span className="absolute top-1 right-1 h-4 w-4 bg-danger-500 text-white text-[10px] font-medium rounded-full flex items-center justify-center">
                {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-elevated border border-surface-100 overflow-hidden z-50">
              <div className="p-4 border-b border-surface-100">
                <h3 className="font-semibold text-surface-900">通知</h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-surface-500 text-sm">
                    暂无通知
                  </div>
                ) : (
                  notifications.slice(0, 10).map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => markNotificationRead(notification.id)}
                      className={`p-4 border-b border-surface-50 hover:bg-surface-50 cursor-pointer transition-colors ${
                        !notification.read ? 'bg-primary-50/50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-2 h-2 rounded-full mt-2 ${
                            notification.type === 'success'
                              ? 'bg-success-500'
                              : notification.type === 'error'
                              ? 'bg-danger-500'
                              : notification.type === 'warning'
                              ? 'bg-warning-500'
                              : 'bg-primary-500'
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-surface-900">
                            {notification.title}
                          </p>
                          <p className="text-xs text-surface-500 mt-0.5 truncate">
                            {notification.message}
                          </p>
                          <p className="text-xs text-surface-400 mt-1">
                            {formatRelativeTime(notification.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative ml-2" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 p-1.5 pr-3 rounded-xl hover:bg-surface-100 transition-colors"
          >
            <Avatar name={currentUser?.name || '用户'} size="sm" />
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-surface-900">
                {currentUser?.name || '用户'}
              </p>
              <p className="text-xs text-surface-500">
                {currentUser?.role === 'admin' ? '管理员' : '员工'}
              </p>
            </div>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-elevated border border-surface-100 overflow-hidden z-50">
              <div className="p-4 border-b border-surface-100">
                <p className="font-semibold text-surface-900">{currentUser?.name}</p>
                <p className="text-sm text-surface-500">{currentUser?.email}</p>
              </div>
              <div className="p-2">
                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-surface-600 hover:bg-surface-100 transition-colors">
                  <User className="h-4 w-4" />
                  <span className="text-sm">个人信息</span>
                </button>
                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-surface-600 hover:bg-surface-100 transition-colors">
                  <Settings className="h-4 w-4" />
                  <span className="text-sm">账号设置</span>
                </button>
                <div className="my-2 border-t border-surface-100" />
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-danger-600 hover:bg-danger-50 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="text-sm">退出登录</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
