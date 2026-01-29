import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button, SearchInput, Select, Card, Table, Modal, StatusBadge, Pagination, ConfirmDialog, Tabs, Loading, Input } from '@/components/common';
import { useOrderStore } from '@/store';
import { useModal, usePagination, useForm } from '@/hooks';
import { formatDate, formatCurrency, getStatusText } from '@/utils';
import { orderService, customerService } from '@/services/tauri';
import { Plus, Download, Eye, Trash2, CheckCircle, XCircle, Truck } from 'lucide-react';
import type { Order, OrderType, Customer } from '@/types';

const typeOptions = [
  { value: '', label: '全部类型' },
  { value: 'sale', label: '销售订单' },
  { value: 'purchase', label: '采购订单' },
  { value: 'return', label: '退货订单' },
];

const statusOptions = [
  { value: '', label: '全部状态' },
  { value: 'draft', label: '草稿' },
  { value: 'pending', label: '待确认' },
  { value: 'confirmed', label: '已确认' },
  { value: 'shipped', label: '已发货' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
];

const tabs = [
  { id: 'all', label: '全部订单' },
  { id: 'pending', label: '待处理' },
  { id: 'processing', label: '进行中' },
  { id: 'completed', label: '已完成' },
];

export function OrdersPage() {
  const { searchKeyword, setSearchKeyword, filters, setFilters } = useOrderStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const createModal = useModal();
  const detailModal = useModal();
  const deleteModal = useModal();

  const form = useForm({
    type: 'sale' as OrderType,
    customerId: '',
    customerName: '',
    totalQuantity: 1,
    totalAmount: 0,
    discountAmount: 0,
    payableAmount: 0,
    deliveryAddress: '',
    remark: '',
  });

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await orderService.list({});
      if (result.success && result.data) {
        setOrders(result.data.items || []);
      }
    } catch (error) {
      console.error('加载订单列表失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadCustomers = useCallback(async () => {
    try {
      const result = await customerService.list({});
      if (result.success && result.data) {
        setCustomers(result.data.items || []);
      }
    } catch (error) {
      console.error('加载客户列表失败:', error);
    }
  }, []);

  useEffect(() => {
    loadOrders();
    loadCustomers();
  }, [loadOrders, loadCustomers]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesSearch = !searchKeyword || 
        o.code.toLowerCase().includes(searchKeyword.toLowerCase()) || 
        (o.customer_name || o.customerName || '').toLowerCase().includes(searchKeyword.toLowerCase());
      const orderType = o.order_type || o.type;
      const matchesType = !filters.type || orderType === filters.type;
      const matchesStatus = !filters.status || o.status === filters.status;
      let matchesTab = true;
      if (activeTab === 'pending') matchesTab = ['draft', 'pending'].includes(o.status);
      if (activeTab === 'processing') matchesTab = ['confirmed', 'shipped'].includes(o.status);
      if (activeTab === 'completed') matchesTab = ['completed', 'cancelled'].includes(o.status);
      return matchesSearch && matchesType && matchesStatus && matchesTab;
    });
  }, [orders, searchKeyword, filters, activeTab]);

  const { paginatedItems, currentPage, totalPages, goToPage, totalItems } = usePagination(filteredOrders, 10);

  const handleCreateOrder = async () => {
    if (!form.values.customerName.trim()) {
      alert('请输入客户名称');
      return;
    }

    setIsSaving(true);
    try {
      const data = {
        type: form.values.type,
        customerId: form.values.customerId,
        customerName: form.values.customerName,
        totalQuantity: form.values.totalQuantity,
        totalAmount: form.values.totalAmount,
        discountAmount: form.values.discountAmount,
        payableAmount: form.values.payableAmount || form.values.totalAmount - form.values.discountAmount,
        deliveryAddress: form.values.deliveryAddress,
        remark: form.values.remark,
      };

      const result = await orderService.create(data);
      if (result.success) {
        createModal.close();
        form.reset();
        loadOrders();
      } else {
        alert(result.error || '创建失败');
      }
    } catch (error) {
      console.error('创建订单失败:', error);
      alert('创建失败');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirm = async (order: Order) => {
    try {
      const result = await orderService.confirm(order.id);
      if (result.success) {
        loadOrders();
      } else {
        alert(result.error || '确认失败');
      }
    } catch (error) {
      console.error('确认订单失败:', error);
    }
  };

  const handleCancel = async (order: Order) => {
    if (!confirm('确定要取消此订单吗？')) return;
    try {
      const result = await orderService.cancel(order.id, '用户取消');
      if (result.success) {
        loadOrders();
      } else {
        alert(result.error || '取消失败');
      }
    } catch (error) {
      console.error('取消订单失败:', error);
    }
  };

  const handleComplete = async (order: Order) => {
    try {
      const result = await orderService.complete(order.id);
      if (result.success) {
        loadOrders();
      } else {
        alert(result.error || '完成失败');
      }
    } catch (error) {
      console.error('完成订单失败:', error);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedOrder) return;
    try {
      const result = await orderService.delete(selectedOrder.id);
      if (result.success) {
        deleteModal.close();
        setSelectedOrder(null);
        loadOrders();
      } else {
        alert(result.error || '删除失败');
      }
    } catch (error) {
      console.error('删除订单失败:', error);
    }
  };

  const getStatusActions = (order: Order) => {
    switch (order.status) {
      case 'draft':
      case 'pending':
        return (
          <>
            <button onClick={() => handleConfirm(order)} className="p-1.5 hover:bg-success-50 rounded-lg" title="确认">
              <CheckCircle className="h-4 w-4 text-success-600" />
            </button>
            <button onClick={() => handleCancel(order)} className="p-1.5 hover:bg-danger-50 rounded-lg" title="取消">
              <XCircle className="h-4 w-4 text-danger-500" />
            </button>
          </>
        );
      case 'confirmed':
        return (
          <button onClick={() => handleComplete(order)} className="p-1.5 hover:bg-primary-50 rounded-lg" title="完成">
            <Truck className="h-4 w-4 text-primary-600" />
          </button>
        );
      default:
        return null;
    }
  };

  const columns = [
    {
      key: 'code',
      title: '订单编号',
      render: (item: Order) => (
        <div>
          <p className="font-mono font-medium text-surface-900">{item.code}</p>
          <p className="text-xs text-surface-500">{formatDate(item.created_at || item.createdAt, 'datetime')}</p>
        </div>
      ),
    },
    {
      key: 'customer',
      title: '客户',
      render: (item: Order) => <span className="font-medium">{item.customer_name || item.customerName || '-'}</span>,
    },
    {
      key: 'type',
      title: '类型',
      render: (item: Order) => {
        const orderType = item.order_type || item.type;
        return (
          <span className={`text-xs px-2 py-1 rounded-full ${
            orderType === 'sale' ? 'bg-primary-50 text-primary-600' :
            orderType === 'purchase' ? 'bg-success-50 text-success-600' : 'bg-warning-50 text-warning-600'
          }`}>
            {getStatusText(orderType || '')}
          </span>
        );
      },
    },
    {
      key: 'amount',
      title: '金额',
      render: (item: Order) => (
        <div>
          <p className="font-medium text-surface-900">{formatCurrency(item.payable_amount || item.payableAmount || 0)}</p>
          <p className="text-xs text-surface-500">{item.total_quantity || item.totalQuantity || 0} 件商品</p>
        </div>
      ),
    },
    {
      key: 'status',
      title: '状态',
      render: (item: Order) => <StatusBadge status={item.status} />,
    },
    {
      key: 'actions',
      title: '操作',
      width: '160px',
      render: (item: Order) => (
        <div className="flex items-center gap-1">
          {getStatusActions(item)}
          <button onClick={() => { setSelectedOrder(item); detailModal.open(); }} className="p-1.5 hover:bg-surface-100 rounded-lg">
            <Eye className="h-4 w-4 text-surface-500" />
          </button>
          <button onClick={() => { setSelectedOrder(item); deleteModal.open(); }} className="p-1.5 hover:bg-danger-50 rounded-lg">
            <Trash2 className="h-4 w-4 text-danger-500" />
          </button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return <div className="flex items-center justify-center h-96"><Loading size="lg" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">订单管理</h1>
          <p className="text-surface-500 mt-1">管理销售订单、采购订单和退货订单</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" leftIcon={<Download className="h-4 w-4" />}>导出</Button>
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => { form.reset(); createModal.open(); }}>新建订单</Button>
        </div>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[240px]">
            <SearchInput placeholder="搜索订单号、客户名称..." value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} onClear={() => setSearchKeyword('')} />
          </div>
          <div className="w-40">
            <Select options={typeOptions} value={filters.type} onChange={(v) => setFilters({ type: v })} placeholder="订单类型" />
          </div>
          <div className="w-40">
            <Select options={statusOptions} value={filters.status} onChange={(v) => setFilters({ status: v })} placeholder="订单状态" />
          </div>
        </div>
      </Card>

      <Card padding={false}>
        <Table columns={columns} data={paginatedItems} rowKey="id" emptyText="暂无订单数据，点击「新建订单」添加" />
        {totalPages > 1 && (
          <div className="p-4 border-t border-surface-100 flex items-center justify-between">
            <span className="text-sm text-surface-500">共 {totalItems} 条记录</span>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} />
          </div>
        )}
      </Card>

      <Modal isOpen={createModal.isOpen} onClose={createModal.close} title="新建订单" size="lg">
        <div className="grid grid-cols-2 gap-4">
          <Select 
            label="订单类型" 
            options={[
              { value: 'sale', label: '销售订单' },
              { value: 'purchase', label: '采购订单' },
              { value: 'return', label: '退货订单' },
            ]} 
            value={form.values.type} 
            onChange={(v) => form.handleChange('type', v)} 
          />
          <Select 
            label="选择客户" 
            options={[
              { value: '', label: '请选择客户' },
              ...customers.map(c => ({ value: c.id, label: c.name }))
            ]} 
            value={form.values.customerId} 
            onChange={(v) => {
              form.handleChange('customerId', v);
              const customer = customers.find(c => c.id === v);
              if (customer) {
                form.handleChange('customerName', customer.name);
              }
            }} 
          />
          <Input label="客户名称" value={form.values.customerName} onChange={(e) => form.handleChange('customerName', e.target.value)} placeholder="或直接输入客户名称" />
          <Input label="商品数量" type="number" value={form.values.totalQuantity} onChange={(e) => form.handleChange('totalQuantity', Number(e.target.value))} />
          <Input label="订单金额" type="number" value={form.values.totalAmount} onChange={(e) => {
            const amount = Number(e.target.value);
            form.handleChange('totalAmount', amount);
            form.handleChange('payableAmount', amount - form.values.discountAmount);
          }} />
          <Input label="优惠金额" type="number" value={form.values.discountAmount} onChange={(e) => {
            const discount = Number(e.target.value);
            form.handleChange('discountAmount', discount);
            form.handleChange('payableAmount', form.values.totalAmount - discount);
          }} />
          <div className="col-span-2">
            <Input label="收货地址" value={form.values.deliveryAddress} onChange={(e) => form.handleChange('deliveryAddress', e.target.value)} />
          </div>
          <div className="col-span-2">
            <Input label="备注" value={form.values.remark} onChange={(e) => form.handleChange('remark', e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={createModal.close}>取消</Button>
          <Button onClick={handleCreateOrder} isLoading={isSaving}>创建</Button>
        </div>
      </Modal>

      <Modal isOpen={detailModal.isOpen} onClose={detailModal.close} title="订单详情" size="lg">
        {selectedOrder && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-surface-50 rounded-xl">
              <div>
                <p className="font-mono text-lg font-semibold">{selectedOrder.code}</p>
                <p className="text-sm text-surface-500">{formatDate(selectedOrder.created_at || selectedOrder.createdAt, 'datetime')}</p>
              </div>
              <StatusBadge status={selectedOrder.status} />
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-surface-500">客户:</span> {selectedOrder.customer_name || selectedOrder.customerName || '-'}</div>
              <div><span className="text-surface-500">类型:</span> {getStatusText(selectedOrder.order_type || selectedOrder.type || '')}</div>
              <div><span className="text-surface-500">商品数量:</span> {selectedOrder.total_quantity || selectedOrder.totalQuantity || 0} 件</div>
              <div><span className="text-surface-500">订单金额:</span> {formatCurrency(selectedOrder.total_amount || selectedOrder.totalAmount || 0)}</div>
              <div><span className="text-surface-500">优惠金额:</span> {formatCurrency(selectedOrder.discount_amount || selectedOrder.discountAmount || 0)}</div>
              <div><span className="text-surface-500">应付金额:</span> <span className="font-semibold text-primary-600">{formatCurrency(selectedOrder.payable_amount || selectedOrder.payableAmount || 0)}</span></div>
              <div className="col-span-2"><span className="text-surface-500">收货地址:</span> {selectedOrder.delivery_address || selectedOrder.deliveryAddress || '-'}</div>
              <div className="col-span-2"><span className="text-surface-500">备注:</span> {selectedOrder.remark || '无'}</div>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog isOpen={deleteModal.isOpen} onClose={deleteModal.close} onConfirm={handleConfirmDelete} title="删除订单" message={`确定要删除订单 "${selectedOrder?.code}" 吗？`} variant="danger" confirmText="删除" />
    </div>
  );
}
