import { useState } from 'react';
import { Card, Select, Button, Tabs } from '@/components/common';
import { formatCurrency, formatNumber } from '@/utils';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Download, Calendar, TrendingUp, TrendingDown, Users, Package, ShoppingCart, DollarSign } from 'lucide-react';

const salesData = [
  { month: '1月', sales: 240000, orders: 120, profit: 48000 },
  { month: '2月', sales: 280000, orders: 145, profit: 56000 },
  { month: '3月', sales: 320000, orders: 168, profit: 64000 },
  { month: '4月', sales: 290000, orders: 152, profit: 58000 },
  { month: '5月', sales: 380000, orders: 195, profit: 76000 },
  { month: '6月', sales: 420000, orders: 218, profit: 84000 },
];

const categoryData = [
  { name: '电子产品', value: 350000, count: 156 },
  { name: '办公设备', value: 250000, count: 234 },
  { name: '办公家具', value: 200000, count: 89 },
  { name: '耗材', value: 150000, count: 412 },
  { name: '其他', value: 50000, count: 67 },
];

const customerData = [
  { name: '科技有限公司', orders: 45, amount: 450000 },
  { name: '贸易股份', orders: 38, amount: 380000 },
  { name: '信息技术', orders: 32, amount: 320000 },
  { name: '网络科技', orders: 28, amount: 280000 },
  { name: '软件开发', orders: 25, amount: 250000 },
];

const inventoryData = [
  { category: '电子产品', inStock: 156, lowStock: 12, outOfStock: 3 },
  { category: '办公设备', inStock: 234, lowStock: 8, outOfStock: 2 },
  { category: '办公家具', inStock: 89, lowStock: 5, outOfStock: 1 },
  { category: '耗材', inStock: 412, lowStock: 15, outOfStock: 5 },
];

const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'];

const tabs = [
  { id: 'sales', label: '销售报表' },
  { id: 'inventory', label: '库存报表' },
  { id: 'customer', label: '客户分析' },
];

const periodOptions = [
  { value: 'week', label: '本周' },
  { value: 'month', label: '本月' },
  { value: 'quarter', label: '本季度' },
  { value: 'year', label: '本年' },
];

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState('sales');
  const [period, setPeriod] = useState('month');

  const totalSales = salesData.reduce((sum, d) => sum + d.sales, 0);
  const totalOrders = salesData.reduce((sum, d) => sum + d.orders, 0);
  const totalProfit = salesData.reduce((sum, d) => sum + d.profit, 0);
  const avgOrderValue = totalSales / totalOrders;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">报表中心</h1>
          <p className="text-surface-500 mt-1">查看业务数据分析和报表</p>
        </div>
        <div className="flex items-center gap-3">
          <Select options={periodOptions} value={period} onChange={setPeriod} />
          <Button variant="outline" leftIcon={<Download className="h-4 w-4" />}>导出报表</Button>
        </div>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'sales' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary-100 rounded-xl"><DollarSign className="h-6 w-6 text-primary-600" /></div>
                <div>
                  <p className="text-sm text-surface-500">总销售额</p>
                  <p className="text-2xl font-bold text-surface-900">{formatCurrency(totalSales)}</p>
                  <p className="text-xs text-success-600 flex items-center gap-1"><TrendingUp className="h-3 w-3" />+12.5%</p>
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-success-50 rounded-xl"><ShoppingCart className="h-6 w-6 text-success-600" /></div>
                <div>
                  <p className="text-sm text-surface-500">订单总数</p>
                  <p className="text-2xl font-bold text-surface-900">{formatNumber(totalOrders)}</p>
                  <p className="text-xs text-success-600 flex items-center gap-1"><TrendingUp className="h-3 w-3" />+8.3%</p>
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-warning-50 rounded-xl"><TrendingUp className="h-6 w-6 text-warning-600" /></div>
                <div>
                  <p className="text-sm text-surface-500">总利润</p>
                  <p className="text-2xl font-bold text-surface-900">{formatCurrency(totalProfit)}</p>
                  <p className="text-xs text-success-600 flex items-center gap-1"><TrendingUp className="h-3 w-3" />+15.2%</p>
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-xl"><DollarSign className="h-6 w-6 text-purple-600" /></div>
                <div>
                  <p className="text-sm text-surface-500">客单价</p>
                  <p className="text-2xl font-bold text-surface-900">{formatCurrency(avgOrderValue)}</p>
                  <p className="text-xs text-danger-600 flex items-center gap-1"><TrendingDown className="h-3 w-3" />-2.1%</p>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <h3 className="font-semibold text-surface-900 mb-6">销售趋势</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesData}>
                    <defs>
                      <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="sales" name="销售额" stroke="#6366f1" fill="url(#salesGradient)" />
                    <Line type="monotone" dataKey="profit" name="利润" stroke="#10b981" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <h3 className="font-semibold text-surface-900 mb-6">品类销售占比</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {categoryData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <p className="text-sm text-surface-500">总产品数</p>
              <p className="text-2xl font-bold text-surface-900 mt-2">891</p>
            </Card>
            <Card>
              <p className="text-sm text-surface-500">正常库存</p>
              <p className="text-2xl font-bold text-success-600 mt-2">851</p>
            </Card>
            <Card>
              <p className="text-sm text-surface-500">库存预警</p>
              <p className="text-2xl font-bold text-warning-600 mt-2">40</p>
            </Card>
            <Card>
              <p className="text-sm text-surface-500">缺货产品</p>
              <p className="text-2xl font-bold text-danger-600 mt-2">11</p>
            </Card>
          </div>

          <Card>
            <h3 className="font-semibold text-surface-900 mb-6">各品类库存状态</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={inventoryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="category" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="inStock" name="正常库存" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="lowStock" name="库存预警" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="outOfStock" name="缺货" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'customer' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <p className="text-sm text-surface-500">客户总数</p>
              <p className="text-2xl font-bold text-surface-900 mt-2">1,234</p>
              <p className="text-xs text-success-600 mt-1">本月新增 45</p>
            </Card>
            <Card>
              <p className="text-sm text-surface-500">活跃客户</p>
              <p className="text-2xl font-bold text-surface-900 mt-2">892</p>
              <p className="text-xs text-surface-500 mt-1">占比 72.3%</p>
            </Card>
            <Card>
              <p className="text-sm text-surface-500">VIP客户</p>
              <p className="text-2xl font-bold text-surface-900 mt-2">156</p>
              <p className="text-xs text-surface-500 mt-1">占比 12.6%</p>
            </Card>
          </div>

          <Card>
            <h3 className="font-semibold text-surface-900 mb-6">客户销售排行 TOP 5</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={customerData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} width={120} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="amount" name="销售额" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
