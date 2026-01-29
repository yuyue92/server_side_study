import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from '@/components/layout';
import { DashboardPage, CustomersPage, InventoryPage, OrdersPage, ReportsPage, SettingsPage } from '@/pages';
import { useOnlineStatus } from '@/hooks';
import { useAppStore } from '@/store';
import { useEffect } from 'react';

function AppContent() {
  // 监听网络状态
  useOnlineStatus();

  // 模拟用户登录
  const setCurrentUser = useAppStore((state) => state.setCurrentUser);
  
  useEffect(() => {
    // 模拟已登录用户
    setCurrentUser({
      id: 'user-1',
      username: 'admin',
      name: '管理员',
      email: 'admin@example.com',
      phone: '13800138000',
      role: 'admin',
      department: '管理部',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }, [setCurrentUser]);

  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
