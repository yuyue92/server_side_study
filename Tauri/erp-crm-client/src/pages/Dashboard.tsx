import { useState, useEffect, useCallback } from 'react';
import { Card, StatCard, Loading } from '@/components/common';
import { formatCurrency, formatNumber } from '@/utils';
import { reportService, customerService, inventoryService, orderService } from '@/services/tauri';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Users, Package, ShoppingCart, TrendingUp, AlertTriangle, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'];

export function DashboardPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalProducts: 0,
    lowStockProducts: 0,
    todayOrders: 0,
    todayRevenue: 0,
    monthlyRevenue: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);

    // 兼容不同命名：dashboardStats / dashboard_stats / getDashboardStats ...
  const getDashboardStats = useCallback(() => {
    const svc: any = reportService as any;
    const fn =
      svc?.dashboardStats ??
      svc?.dashboard_stats ??
      svc?.getDashboardStats ??
      svc?.get_dashboard_stats;
    if (typeof fn !== 'function') throw new TypeError('reportService dashboard stats function not found');
    return fn.call(svc);
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 加载统计数据
      // const statsResult = await reportService.dashboardStats();
      const statsResult = await getDashboardStats();
      if (statsResult.success && statsResult.data) {
        setStats({
          totalCustomers: statsResult.data.totalCustomers || 0,
          totalProducts: statsResult.data.totalProducts || 0,
          lowStockProducts: statsResult.data.lowStockProducts || 0,
          todayOrders: statsResult.data.todayOrders || 0,
          todayRevenue: statsResult.data.todayRevenue || 0,
          monthlyRevenue: statsResult.data.monthlyRevenue || 0,
        });
      }

      // 加载最近订单
      const ordersResult = await orderService.list({});
      if (ordersResult.success && ordersResult.data) {
        setRecentOrders((ordersResult.data.items || []).slice(0, 5));
      }

      // 加载产品分类统计
      const productsResult = await inventoryService.list({});
      if (productsResult.success && productsResult.data) {
        const products = productsResult.data.items || [];
        const categoryMap: Record<string, number> = {};
        products.forEach((p: any) => {
          const cat = p.category || '未分类';
          categoryMap[cat] = (categoryMap[cat] || 0) + 1;
        });
        setCategoryData(
          Object.entries(categoryMap)
            .map(([name, value]) => ({ name, value }))
            .slice(0, 5)
        );
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, [getDashboardStats]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loading size="lg" />
      </div>
    );
  }

  const hasData = stats.totalCustomers > 0 || stats.totalProducts > 0 || recentOrders.length > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">仪表盘</h1>
        <p className="text-surface-500 mt-1">欢迎回来，这是您的业务概览</p>
      </div>

      {!hasData && (
        <Card className="bg-primary-50 border-primary-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary-100 rounded-xl">
              <Plus className="h-6 w-6 text-primary-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-primary-800">开始使用</h4>
              <p className="text-sm text-primary-700">系统中暂无数据，请先添加客户、产品或创建订单</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => navigate('/customers')} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700">添加客户</button>
              <button onClick={() => navigate('/inventory')} className="px-4 py-2 bg-white text-primary-600 rounded-lg text-sm font-medium hover:bg-primary-50 border border-primary-200">添加产品</button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="客户总数"
          value={formatNumber(stats.totalCustomers)}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          label="产品数量"
          value={formatNumber(stats.totalProducts)}
          icon={<Package className="h-5 w-5" />}
        />
        <StatCard
          label="今日订单"
          value={stats.todayOrders}
          icon={<ShoppingCart className="h-5 w-5" />}
        />
        <StatCard
          label="今日营收"
          value={formatCurrency(stats.todayRevenue)}
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {categoryData.length > 0 && (
          <Card>
            <h3 className="font-semibold text-surface-900 mb-6">产品分类分布</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                    {categoryData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-4">
              {categoryData.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-surface-600">{item.name}</span>
                  </div>
                  <span className="font-medium text-surface-900">{item.value} 个</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card>
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-surface-900">最近订单</h3>
            <button onClick={() => navigate('/orders')} className="text-sm text-primary-600 hover:text-primary-700 font-medium">查看全部</button>
          </div>
          {recentOrders.length === 0 ? (
            <div className="text-center py-12 text-surface-500">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-surface-300" />
              <p>暂无订单</p>
              <button onClick={() => navigate('/orders')} className="mt-4 text-primary-600 hover:underline">创建订单</button>
            </div>
          ) : (
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between py-3 border-b border-surface-100 last:border-0">
                  <div>
                    <p className="font-medium text-surface-900">{order.code}</p>
                    <p className="text-sm text-surface-500">{order.customer_name || order.customerName || '-'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-surface-900">{formatCurrency(order.payable_amount || order.payableAmount || 0)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      order.status === 'completed' ? 'bg-success-50 text-success-600' :
                      order.status === 'shipped' ? 'bg-primary-50 text-primary-600' :
                      order.status === 'pending' || order.status === 'draft' ? 'bg-warning-50 text-warning-600' :
                      order.status === 'cancelled' ? 'bg-danger-50 text-danger-600' : 'bg-surface-100 text-surface-600'
                    }`}>
                      {order.status === 'completed' ? '已完成' : 
                       order.status === 'shipped' ? '已发货' : 
                       order.status === 'confirmed' ? '已确认' :
                       order.status === 'pending' ? '待确认' : 
                       order.status === 'draft' ? '草稿' :
                       order.status === 'cancelled' ? '已取消' : order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {stats.lowStockProducts > 0 && (
        <Card className="bg-warning-50 border-warning-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-warning-100 rounded-xl">
              <AlertTriangle className="h-6 w-6 text-warning-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-warning-800">库存预警</h4>
              <p className="text-sm text-warning-700">有 {stats.lowStockProducts} 个产品库存不足，请及时补货</p>
            </div>
            <button onClick={() => navigate('/inventory')} className="px-4 py-2 bg-warning-600 text-white rounded-lg text-sm font-medium hover:bg-warning-700">查看详情</button>
          </div>
        </Card>
      )}
    </div>
  );
}
