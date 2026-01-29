import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button, Input, SearchInput, Select, Card, Table, Modal, StatusBadge, Pagination, ConfirmDialog, Alert, Loading } from '@/components/common';
import { useInventoryStore } from '@/store';
import { useModal, usePagination, useForm } from '@/hooks';
import { formatCurrency, cn } from '@/utils';
import { inventoryService } from '@/services/tauri';
import { Plus, Download, Edit, Trash2, Eye, AlertTriangle, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import type { Product } from '@/types';

const categoryOptions = [
  { value: '', label: '全部类型' },
  { value: '电子产品', label: '电子产品' },
  { value: '办公设备', label: '办公设备' },
  { value: '办公家具', label: '办公家具' },
  { value: '耗材', label: '耗材' },
];

const statusOptions = [
  { value: '', label: '全部状态' },
  { value: 'active', label: '正常' },
  { value: 'discontinued', label: '已停产' },
  { value: 'out_of_stock', label: '缺货' },
];

export function InventoryPage() {
  const { searchKeyword, setSearchKeyword, filters, setFilters } = useInventoryStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stockOperation, setStockOperation] = useState<'in' | 'out' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const createModal = useModal();
  const detailModal = useModal();
  const deleteModal = useModal();
  const stockModal = useModal();

  const form = useForm({
    name: '', code: '', barcode: '', category: '', unit: '个',
    specification: '', brand: '', costPrice: 0, sellPrice: 0,
    minStock: 10, maxStock: 1000, currentStock: 0, location: '', description: '',
  });

  const stockForm = useForm({ quantity: 0, unitPrice: 0, remark: '' });

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await inventoryService.list({});
      if (result.success && result.data) {
        setProducts(result.data.items || []);
      }
    } catch (error) {
      console.error('加载产品列表失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = !searchKeyword || 
        p.name.toLowerCase().includes(searchKeyword.toLowerCase()) || 
        p.code.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        (p.barcode && p.barcode.includes(searchKeyword));
      const matchesCategory = !filters.category || p.category === filters.category;
      const matchesStatus = !filters.status || p.status === filters.status;
      const matchesLowStock = !filters.lowStock || (p.current_stock || p.currentStock || 0) < (p.min_stock || p.minStock || 10);
      return matchesSearch && matchesCategory && matchesStatus && matchesLowStock;
    });
  }, [products, searchKeyword, filters]);

  const lowStockCount = products.filter(p => (p.current_stock || p.currentStock || 0) < (p.min_stock || p.minStock || 10)).length;
  const { paginatedItems, currentPage, totalPages, goToPage, totalItems } = usePagination(filteredProducts, 10);

  const handleStockIn = (product: Product) => {
    setSelectedProduct(product);
    setStockOperation('in');
    stockForm.reset();
    stockModal.open();
  };

  const handleStockOut = (product: Product) => {
    setSelectedProduct(product);
    setStockOperation('out');
    stockForm.reset();
    stockModal.open();
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    form.setValues({
      name: product.name,
      code: product.code,
      barcode: product.barcode || '',
      category: product.category || '',
      unit: product.unit || '个',
      specification: product.specification || '',
      brand: product.brand || '',
      costPrice: product.cost_price || product.costPrice || 0,
      sellPrice: product.sell_price || product.sellPrice || 0,
      minStock: product.min_stock || product.minStock || 10,
      maxStock: product.max_stock || product.maxStock || 1000,
      currentStock: product.current_stock || product.currentStock || 0,
      location: product.location || '',
      description: product.description || '',
    });
    createModal.open();
  };

  const handleSave = async () => {
    if (!form.values.name.trim()) {
      alert('请输入产品名称');
      return;
    }

    setIsSaving(true);
    try {
      const data = {
        name: form.values.name,
        code: form.values.code,
        barcode: form.values.barcode,
        category: form.values.category,
        unit: form.values.unit,
        specification: form.values.specification,
        brand: form.values.brand,
        costPrice: form.values.costPrice,
        sellPrice: form.values.sellPrice,
        minStock: form.values.minStock,
        maxStock: form.values.maxStock,
        currentStock: form.values.currentStock,
        location: form.values.location,
        description: form.values.description,
        status: 'active',
      };

      let result;
      if (selectedProduct) {
        result = await inventoryService.update(selectedProduct.id, data);
      } else {
        result = await inventoryService.create(data);
      }

      if (result.success) {
        createModal.close();
        form.reset();
        setSelectedProduct(null);
        loadProducts();
      } else {
        alert(result.error || '保存失败');
      }
    } catch (error) {
      console.error('保存产品失败:', error);
      alert('保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStockSave = async () => {
    if (!selectedProduct || stockForm.values.quantity <= 0) {
      alert('请输入有效的数量');
      return;
    }

    setIsSaving(true);
    try {
      let result;
      if (stockOperation === 'in') {
        result = await inventoryService.stockIn(
          selectedProduct.id,
          stockForm.values.quantity,
          stockForm.values.unitPrice,
          stockForm.values.remark
        );
      } else {
        result = await inventoryService.stockOut(
          selectedProduct.id,
          stockForm.values.quantity,
          stockForm.values.unitPrice,
          stockForm.values.remark
        );
      }

      if (result.success) {
        stockModal.close();
        stockForm.reset();
        loadProducts();
      } else {
        alert(result.error || '操作失败');
      }
    } catch (error) {
      console.error('库存操作失败:', error);
      alert('操作失败');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedProduct) return;
    
    try {
      const result = await inventoryService.delete(selectedProduct.id);
      if (result.success) {
        deleteModal.close();
        setSelectedProduct(null);
        loadProducts();
      } else {
        alert(result.error || '删除失败');
      }
    } catch (error) {
      console.error('删除产品失败:', error);
      alert('删除失败');
    }
  };

  const columns = [
    {
      key: 'code',
      title: '产品编码',
      render: (item: Product) => (
        <div>
          <p className="font-mono text-sm font-medium text-surface-900">{item.code}</p>
          <p className="text-xs text-surface-400 font-mono">{item.barcode || '-'}</p>
        </div>
      ),
    },
    {
      key: 'name',
      title: '产品名称',
      render: (item: Product) => (
        <div>
          <p className="font-medium text-surface-900">{item.name}</p>
          <p className="text-xs text-surface-500">{item.brand || '-'} | {item.specification || '-'}</p>
        </div>
      ),
    },
    { key: 'category', title: '类别' },
    {
      key: 'stock',
      title: '库存',
      render: (item: Product) => {
        const stock = item.current_stock ?? item.currentStock ?? 0;
        const minStock = item.min_stock ?? item.minStock ?? 10;
        return (
          <div className="flex items-center gap-2">
            <span className={cn('font-medium', stock < minStock ? 'text-danger-600' : 'text-surface-900')}>
              {stock}
            </span>
            <span className="text-surface-400">{item.unit}</span>
            {stock < minStock && <AlertTriangle className="h-4 w-4 text-warning-500" />}
          </div>
        );
      },
    },
    {
      key: 'price',
      title: '售价',
      render: (item: Product) => <span className="font-medium">{formatCurrency(item.sell_price || item.sellPrice || 0)}</span>,
    },
    { key: 'location', title: '库位' },
    {
      key: 'status',
      title: '状态',
      render: (item: Product) => <StatusBadge status={item.status} />,
    },
    {
      key: 'actions',
      title: '操作',
      width: '160px',
      render: (item: Product) => (
        <div className="flex items-center gap-1">
          <button onClick={() => handleStockIn(item)} className="p-1.5 hover:bg-success-50 rounded-lg" title="入库">
            <ArrowDownToLine className="h-4 w-4 text-success-600" />
          </button>
          <button onClick={() => handleStockOut(item)} className="p-1.5 hover:bg-primary-50 rounded-lg" title="出库">
            <ArrowUpFromLine className="h-4 w-4 text-primary-600" />
          </button>
          <button onClick={() => { setSelectedProduct(item); detailModal.open(); }} className="p-1.5 hover:bg-surface-100 rounded-lg" title="查看">
            <Eye className="h-4 w-4 text-surface-500" />
          </button>
          <button onClick={() => handleEdit(item)} className="p-1.5 hover:bg-surface-100 rounded-lg" title="编辑">
            <Edit className="h-4 w-4 text-surface-500" />
          </button>
          <button onClick={() => { setSelectedProduct(item); deleteModal.open(); }} className="p-1.5 hover:bg-danger-50 rounded-lg" title="删除">
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
          <h1 className="text-2xl font-bold text-surface-900">库存管理</h1>
          <p className="text-surface-500 mt-1">管理产品库存、入库出库操作</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" leftIcon={<Download className="h-4 w-4" />}>导出</Button>
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => { form.reset(); setSelectedProduct(null); createModal.open(); }}>
            新建产品
          </Button>
        </div>
      </div>

      {lowStockCount > 0 && (
        <Alert type="warning" title="库存预警" message={`有 ${lowStockCount} 个产品库存低于安全库存，请及时补货`} />
      )}

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[240px]">
            <SearchInput placeholder="搜索产品名称、编码、条码..." value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} onClear={() => setSearchKeyword('')} />
          </div>
          <div className="w-40">
            <Select options={categoryOptions} value={filters.category} onChange={(v) => setFilters({ category: v })} placeholder="产品类别" />
          </div>
          <div className="w-40">
            <Select options={statusOptions} value={filters.status} onChange={(v) => setFilters({ status: v })} placeholder="产品状态" />
          </div>
          <Button variant={filters.lowStock ? 'primary' : 'outline'} size="sm" leftIcon={<AlertTriangle className="h-4 w-4" />} onClick={() => setFilters({ lowStock: !filters.lowStock })}>
            库存预警 ({lowStockCount})
          </Button>
        </div>
      </Card>

      <Card padding={false}>
        <Table columns={columns} data={paginatedItems} rowKey="id" emptyText="暂无产品数据，点击「新建产品」添加" />
        {totalPages > 1 && (
          <div className="p-4 border-t border-surface-100 flex items-center justify-between">
            <span className="text-sm text-surface-500">共 {totalItems} 条记录</span>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} />
          </div>
        )}
      </Card>

      <Modal isOpen={createModal.isOpen} onClose={createModal.close} title={selectedProduct ? '编辑产品' : '新建产品'} size="lg">
        <div className="grid grid-cols-2 gap-4">
          <Input label="产品名称 *" value={form.values.name} onChange={(e) => form.handleChange('name', e.target.value)} />
          <Input label="产品编码" value={form.values.code} onChange={(e) => form.handleChange('code', e.target.value)} placeholder="留空自动生成" />
          <Input label="条形码" value={form.values.barcode} onChange={(e) => form.handleChange('barcode', e.target.value)} />
          <Select label="产品类别" options={categoryOptions.slice(1)} value={form.values.category} onChange={(v) => form.handleChange('category', v)} />
          <Input label="品牌" value={form.values.brand} onChange={(e) => form.handleChange('brand', e.target.value)} />
          <Input label="规格" value={form.values.specification} onChange={(e) => form.handleChange('specification', e.target.value)} />
          <Input label="单位" value={form.values.unit} onChange={(e) => form.handleChange('unit', e.target.value)} />
          <Input label="库位" value={form.values.location} onChange={(e) => form.handleChange('location', e.target.value)} />
          <Input label="成本价" type="number" value={form.values.costPrice} onChange={(e) => form.handleChange('costPrice', Number(e.target.value))} />
          <Input label="售价" type="number" value={form.values.sellPrice} onChange={(e) => form.handleChange('sellPrice', Number(e.target.value))} />
          <Input label="最小库存" type="number" value={form.values.minStock} onChange={(e) => form.handleChange('minStock', Number(e.target.value))} />
          <Input label="初始库存" type="number" value={form.values.currentStock} onChange={(e) => form.handleChange('currentStock', Number(e.target.value))} />
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={createModal.close}>取消</Button>
          <Button onClick={handleSave} isLoading={isSaving}>{selectedProduct ? '保存' : '创建'}</Button>
        </div>
      </Modal>

      <Modal isOpen={stockModal.isOpen} onClose={stockModal.close} title={stockOperation === 'in' ? '入库操作' : '出库操作'}>
        {selectedProduct && (
          <div className="space-y-4">
            <div className="p-4 bg-surface-50 rounded-xl">
              <p className="font-medium text-surface-900">{selectedProduct.name}</p>
              <p className="text-sm text-surface-500">{selectedProduct.code} | 当前库存: {selectedProduct.current_stock ?? selectedProduct.currentStock ?? 0} {selectedProduct.unit}</p>
            </div>
            <Input label="数量 *" type="number" value={stockForm.values.quantity} onChange={(e) => stockForm.handleChange('quantity', Number(e.target.value))} />
            <Input label="单价" type="number" value={stockForm.values.unitPrice} onChange={(e) => stockForm.handleChange('unitPrice', Number(e.target.value))} />
            <Input label="备注" value={stockForm.values.remark} onChange={(e) => stockForm.handleChange('remark', e.target.value)} />
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={stockModal.close}>取消</Button>
              <Button variant={stockOperation === 'in' ? 'success' : 'primary'} onClick={handleStockSave} isLoading={isSaving}>
                确认{stockOperation === 'in' ? '入库' : '出库'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={detailModal.isOpen} onClose={detailModal.close} title="产品详情" size="lg">
        {selectedProduct && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-surface-500">产品名称:</span> {selectedProduct.name}</div>
              <div><span className="text-surface-500">产品编码:</span> {selectedProduct.code}</div>
              <div><span className="text-surface-500">条形码:</span> {selectedProduct.barcode || '-'}</div>
              <div><span className="text-surface-500">品牌:</span> {selectedProduct.brand || '-'}</div>
              <div><span className="text-surface-500">类别:</span> {selectedProduct.category || '-'}</div>
              <div><span className="text-surface-500">规格:</span> {selectedProduct.specification || '-'}</div>
              <div><span className="text-surface-500">当前库存:</span> {selectedProduct.current_stock ?? selectedProduct.currentStock ?? 0} {selectedProduct.unit}</div>
              <div><span className="text-surface-500">库位:</span> {selectedProduct.location || '-'}</div>
              <div><span className="text-surface-500">成本价:</span> {formatCurrency(selectedProduct.cost_price || selectedProduct.costPrice || 0)}</div>
              <div><span className="text-surface-500">售价:</span> {formatCurrency(selectedProduct.sell_price || selectedProduct.sellPrice || 0)}</div>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog isOpen={deleteModal.isOpen} onClose={deleteModal.close} onConfirm={handleConfirmDelete} title="删除产品" message={`确定要删除产品 "${selectedProduct?.name}" 吗？`} variant="danger" confirmText="删除" />
    </div>
  );
}
