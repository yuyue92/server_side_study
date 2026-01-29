import { Outlet } from 'react-router-dom';
import { useAppStore } from '@/store';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { cn } from '@/utils';

export function MainLayout() {
  const sidebarCollapsed = useAppStore((state) => state.sidebarCollapsed);

  return (
    <div className="min-h-screen bg-surface-50">
      <Sidebar />
      
      <div
        className={cn(
          'transition-all duration-300',
          sidebarCollapsed ? 'ml-[72px]' : 'ml-64'
        )}
      >
        <Header />
        
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
