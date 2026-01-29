import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button, Input, SearchInput, Select, Card, Table, Modal, Avatar, StatusBadge, Pagination, ConfirmDialog, Loading } from '@/components/common';
import { useCustomerStore } from '@/store';
import { useModal, usePagination, useForm } from '@/hooks';
import { formatDate, formatCurrency } from '@/utils';
import { customerService } from '@/services/tauri';
import { Plus, Download, Upload, Edit, Trash2, Eye, Phone, Mail } from 'lucide-react';
import type { Customer, CustomerCategory } from '@/types';

const categoryOptions = [
  { value: '', label: '全部类型' },
  { value: 'vip', label: 'VIP客户' },
  { value: 'regular', label: '普通客户' },
  { value: 'potential', label: '潜在客户' },
  { value: 'inactive', label: '休眠客户' },
];

const statusOptions = [
  { value: '', label: '全部状态' },
  { value: 'active', label: '活跃' },
  { value: 'inactive', label: '停用' },
  { value: 'blocked', label: '黑名单' },
];

export function CustomersPage() {
  const { searchKeyword, setSearchKeyword, filters, setFilters } = useCustomerStore();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const createModal = useModal();
  const detailModal = useModal();
  const deleteModal = useModal();
  
  const form = useForm({
    name: '', company: '', email: '', phone: '', address: '',
    category: 'regular' as CustomerCategory, contactPerson: '', remark: '',
  });

  // 加载客户列表
  const loadCustomers = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await customerService.list({});
      if (result.success && result.data) {
        setCustomers(result.data.items || []);
      }
    } catch (error) {
      console.error('加载客户列表失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  // 筛选数据
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchesSearch = !searchKeyword || 
        c.name.toLowerCase().includes(searchKeyword.toLowerCase()) || 
        c.company.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        c.phone.includes(searchKeyword);
      const matchesCategory = !filters.category || c.category === filters.category;
      const matchesStatus = !filters.status || c.status === filters.status;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [customers, searchKeyword, filters]);

  const { paginatedItems, currentPage, totalPages, goToPage, totalItems } = usePagination(filteredCustomers, 10);

  const handleView = (customer: Customer) => {
    setSelectedCustomer(customer);
    detailModal.open();
  };

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    form.setValues({
      name: customer.name,
      company: customer.company,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      category: customer.category,
      contactPerson: customer.contact_person || customer.contactPerson || '',
      remark: customer.remark,
    });
    createModal.open();
  };

  const handleDelete = (customer: Customer) => {
    setSelectedCustomer(customer);
    deleteModal.open();
  };

  const handleSave = async () => {
    if (!form.values.name.trim()) {
      alert('请输入客户名称');
      return;
    }
    
    setIsSaving(true);
    try {
      const data = {
        name: form.values.name,
        company: form.values.company,
        email: form.values.email,
        phone: form.values.phone,
        address: form.values.address,
        category: form.values.category,
        contactPerson: form.values.contactPerson,
        remark: form.values.remark,
        status: 'active',
      };

      let result;
      if (selectedCustomer) {
        result = await customerService.update(selectedCustomer.id, data);
      } else {
        result = await customerService.create(data);
      }

      if (result.success) {
        createModal.close();
        form.reset();
        setSelectedCustomer(null);
        loadCustomers();
      } else {
        alert(result.error || '保存失败');
      }
    } catch (error) {
      console.error('保存客户失败:', error);
      alert('保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedCustomer) return;
    
    try {
      const result = await customerService.delete(selectedCustomer.id);
      if (result.success) {
        deleteModal.close();
        setSelectedCustomer(null);
        loadCustomers();
      } else {
        alert(result.error || '删除失败');
      }
    } catch (error) {
      console.error('删除客户失败:', error);
      alert('删除失败');
    }
  };

  const columns = [
    {
      key: 'name',
      title: '客户名称',
      render: (item: Customer) => (
        <div className="flex items-center gap-3">
          <Avatar name={item.name} size="sm" />
          <div>
            <p className="font-medium text-surface-900">{item.name}</p>
            <p className="text-xs text-surface-500">{item.company}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      title: '联系方式',
      render: (item: Customer) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-sm text-surface-600">
            <Phone className="h-3 w-3" />
            {item.phone || '-'}
          </div>
          <div className="flex items-center gap-1 text-sm text-surface-500">
            <Mail className="h-3 w-3" />
            {item.email || '-'}
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      title: '类型',
      render: (item: Customer) => <StatusBadge status={item.category} />,
    },
    {
      key: 'status',
      title: '状态',
      render: (item: Customer) => <StatusBadge status={item.status} />,
    },
    {
      key: 'balance',
      title: '余额',
      render: (item: Customer) => (
        <span className="font-medium">{formatCurrency(item.balance || 0)}</span>
      ),
    },
    {
      key: 'createdAt',
      title: '创建时间',
      render: (item: Customer) => (
        <span className="text-surface-500">{formatDate(item.created_at || item.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      title: '操作',
      width: '120px',
      render: (item: Customer) => (
        <div className="flex items-center gap-1">
          <button onClick={() => handleView(item)} className="p-1.5 hover:bg-surface-100 rounded-lg" title="查看">
            <Eye className="h-4 w-4 text-surface-500" />
          </button>
          <button onClick={() => handleEdit(item)} className="p-1.5 hover:bg-surface-100 rounded-lg" title="编辑">
            <Edit className="h-4 w-4 text-surface-500" />
          </button>
          <button onClick={() => handleDelete(item)} className="p-1.5 hover:bg-danger-50 rounded-lg" title="删除">
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
          <h1 className="text-2xl font-bold text-surface-900">客户管理</h1>
          <p className="text-surface-500 mt-1">管理您的客户信息和关系</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" leftIcon={<Download className="h-4 w-4" />}>导出</Button>
          <Button variant="outline" leftIcon={<Upload className="h-4 w-4" />}>导入</Button>
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => { form.reset(); setSelectedCustomer(null); createModal.open(); }}>
            新建客户
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[240px]">
            <SearchInput
              placeholder="搜索客户名称、公司、电话..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onClear={() => setSearchKeyword('')}
            />
          </div>
          <div className="w-40">
            <Select options={categoryOptions} value={filters.category} onChange={(v) => setFilters({ category: v })} placeholder="客户类型" />
          </div>
          <div className="w-40">
            <Select options={statusOptions} value={filters.status} onChange={(v) => setFilters({ status: v })} placeholder="客户状态" />
          </div>
        </div>
      </Card>

      <Card padding={false}>
        <Table columns={columns} data={paginatedItems} rowKey="id" emptyText="暂无客户数据，点击「新建客户」添加" />
        {totalPages > 1 && (
          <div className="p-4 border-t border-surface-100 flex items-center justify-between">
            <span className="text-sm text-surface-500">共 {totalItems} 条记录</span>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} />
          </div>
        )}
      </Card>

      <Modal isOpen={createModal.isOpen} onClose={createModal.close} title={selectedCustomer ? '编辑客户' : '新建客户'} size="lg">
        <div className="grid grid-cols-2 gap-4">
          <Input label="客户名称 *" value={form.values.name} onChange={(e) => form.handleChange('name', e.target.value)} placeholder="请输入客户名称" />
          <Input label="公司名称" value={form.values.company} onChange={(e) => form.handleChange('company', e.target.value)} placeholder="请输入公司名称" />
          <Input label="联系人" value={form.values.contactPerson} onChange={(e) => form.handleChange('contactPerson', e.target.value)} placeholder="请输入联系人" />
          <Input label="电话" value={form.values.phone} onChange={(e) => form.handleChange('phone', e.target.value)} placeholder="请输入电话" />
          <Input label="邮箱" value={form.values.email} onChange={(e) => form.handleChange('email', e.target.value)} placeholder="请输入邮箱" />
          <Select label="客户类型" options={categoryOptions.slice(1)} value={form.values.category} onChange={(v) => form.handleChange('category', v)} />
          <div className="col-span-2">
            <Input label="地址" value={form.values.address} onChange={(e) => form.handleChange('address', e.target.value)} placeholder="请输入地址" />
          </div>
          <div className="col-span-2">
            <Input label="备注" value={form.values.remark} onChange={(e) => form.handleChange('remark', e.target.value)} placeholder="请输入备注" />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={createModal.close}>取消</Button>
          <Button onClick={handleSave} isLoading={isSaving}>{selectedCustomer ? '保存' : '创建'}</Button>
        </div>
      </Modal>

      <Modal isOpen={detailModal.isOpen} onClose={detailModal.close} title="客户详情" size="lg">
        {selectedCustomer && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar name={selectedCustomer.name} size="lg" />
              <div>
                <h3 className="text-xl font-semibold text-surface-900">{selectedCustomer.name}</h3>
                <p className="text-surface-500">{selectedCustomer.company}</p>
                <div className="flex gap-2 mt-2">
                  <StatusBadge status={selectedCustomer.category} />
                  <StatusBadge status={selectedCustomer.status} />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-surface-500">联系人:</span> {selectedCustomer.contact_person || selectedCustomer.contactPerson || '-'}</div>
              <div><span className="text-surface-500">电话:</span> {selectedCustomer.phone || '-'}</div>
              <div><span className="text-surface-500">邮箱:</span> {selectedCustomer.email || '-'}</div>
              <div><span className="text-surface-500">来源:</span> {selectedCustomer.source || '-'}</div>
              <div className="col-span-2"><span className="text-surface-500">地址:</span> {selectedCustomer.address || '-'}</div>
              <div><span className="text-surface-500">信用额度:</span> {formatCurrency(selectedCustomer.credit_limit || selectedCustomer.creditLimit || 0)}</div>
              <div><span className="text-surface-500">账户余额:</span> {formatCurrency(selectedCustomer.balance || 0)}</div>
              <div className="col-span-2"><span className="text-surface-500">备注:</span> {selectedCustomer.remark || '无'}</div>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={deleteModal.isOpen}
        onClose={deleteModal.close}
        onConfirm={handleConfirmDelete}
        title="删除客户"
        message={`确定要删除客户 "${selectedCustomer?.name}" 吗？此操作不可撤销。`}
        variant="danger"
        confirmText="删除"
      />
    </div>
  );
}
