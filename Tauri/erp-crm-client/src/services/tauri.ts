import { invoke } from '@tauri-apps/api/core';
import type {
  Customer,
  Product,
  Order,
  User,
  ApiResponse,
  PaginatedResponse,
  SearchParams,
  SyncStatus,
  DashboardStats,
  ScannerConfig,
  ScanResult,
  StockRecord,
  StockCheckItem,
} from '@/types';

// ==================== Tauri 命令调用封装 ====================

/**
 * 调用 Tauri 后端命令
 */
async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(cmd, args);
  } catch (error) {
    console.error(`Tauri command error [${cmd}]:`, error);
    throw error;
  }
}

// ==================== 认证服务 ====================

export const authService = {
  /**
   * 用户登录
   */
  async login(username: string, password: string): Promise<ApiResponse<User>> {
    return tauriInvoke('auth_login', { username, password });
  },

  /**
   * 用户登出
   */
  async logout(): Promise<ApiResponse<void>> {
    return tauriInvoke('auth_logout');
  },

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(): Promise<ApiResponse<User>> {
    return tauriInvoke('auth_get_current_user');
  },

  /**
   * 修改密码
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<ApiResponse<void>> {
    return tauriInvoke('auth_change_password', { oldPassword, newPassword });
  },
};

// ==================== 客户管理服务 ====================

export const customerService = {
  async list(params: SearchParams): Promise<ApiResponse<PaginatedResponse<Customer>>> {
    return tauriInvoke('customer_list', { params });
  },
  async get(id: string): Promise<ApiResponse<Customer>> {
    return tauriInvoke('customer_get', { id });
  },
  async create(data: Record<string, unknown>): Promise<ApiResponse<Customer>> {
    return tauriInvoke('customer_create', { data });
  },
  async update(id: string, data: Record<string, unknown>): Promise<ApiResponse<Customer>> {
    return tauriInvoke('customer_update', { id, data });
  },
  async delete(id: string): Promise<ApiResponse<void>> {
    return tauriInvoke('customer_delete', { id });
  },
  // 兼容旧 API
  async getCustomers(params: SearchParams): Promise<ApiResponse<PaginatedResponse<Customer>>> {
    return this.list(params);
  },
  async getCustomer(id: string): Promise<ApiResponse<Customer>> {
    return this.get(id);
  },
  async createCustomer(data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Customer>> {
    return this.create(data as Record<string, unknown>);
  },
  async updateCustomer(id: string, data: Partial<Customer>): Promise<ApiResponse<Customer>> {
    return this.update(id, data as Record<string, unknown>);
  },
  async deleteCustomer(id: string): Promise<ApiResponse<void>> {
    return this.delete(id);
  },
  async searchCustomers(keyword: string): Promise<ApiResponse<Customer[]>> {
    return tauriInvoke('customer_search', { keyword });
  },
  async exportCustomers(format: 'xlsx' | 'csv'): Promise<ApiResponse<string>> {
    return tauriInvoke('customer_export', { format });
  },
};

// ==================== 库存管理服务 ====================

export const inventoryService = {
  async list(params: SearchParams): Promise<ApiResponse<PaginatedResponse<Product>>> {
    return tauriInvoke('product_list', { params });
  },
  async get(id: string): Promise<ApiResponse<Product>> {
    return tauriInvoke('product_get', { id });
  },
  async getByBarcode(barcode: string): Promise<ApiResponse<Product>> {
    return tauriInvoke('product_get_by_barcode', { barcode });
  },
  async create(data: Record<string, unknown>): Promise<ApiResponse<Product>> {
    return tauriInvoke('product_create', { data });
  },
  async update(id: string, data: Record<string, unknown>): Promise<ApiResponse<Product>> {
    return tauriInvoke('product_update', { id, data });
  },
  async delete(id: string): Promise<ApiResponse<void>> {
    return tauriInvoke('product_delete', { id });
  },
  async stockIn(productId: string, quantity: number, unitPrice: number, remark?: string): Promise<ApiResponse<StockRecord>> {
    return tauriInvoke('stock_in', { productId, quantity, unitPrice, remark });
  },
  async stockOut(productId: string, quantity: number, unitPrice: number, remark?: string): Promise<ApiResponse<StockRecord>> {
    return tauriInvoke('stock_out', { productId, quantity, unitPrice, remark });
  },
  async stockAdjust(productId: string, actualQuantity: number, remark?: string): Promise<ApiResponse<StockRecord>> {
    return tauriInvoke('stock_adjust', { productId, actualQuantity, remark });
  },
  // 兼容旧 API
  async getProducts(params: SearchParams): Promise<ApiResponse<PaginatedResponse<Product>>> {
    return this.list(params);
  },
  async getProduct(id: string): Promise<ApiResponse<Product>> {
    return this.get(id);
  },
  async getProductByBarcode(barcode: string): Promise<ApiResponse<Product>> {
    return this.getByBarcode(barcode);
  },
  async createProduct(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Product>> {
    return this.create(data as Record<string, unknown>);
  },
  async updateProduct(id: string, data: Partial<Product>): Promise<ApiResponse<Product>> {
    return this.update(id, data as Record<string, unknown>);
  },
  async deleteProduct(id: string): Promise<ApiResponse<void>> {
    return this.delete(id);
  },

  /**
   * 获取库存记录
   */
  async getStockRecords(productId: string, params: SearchParams): Promise<ApiResponse<PaginatedResponse<StockRecord>>> {
    return tauriInvoke('stock_records', { productId, params });
  },

  /**
   * 创建盘点单
   */
  async createStockCheck(warehouseId: string): Promise<ApiResponse<{ id: string; code: string }>> {
    return tauriInvoke('stock_check_create', { warehouseId });
  },

  /**
   * 提交盘点结果
   */
  async submitStockCheck(id: string, items: StockCheckItem[]): Promise<ApiResponse<void>> {
    return tauriInvoke('stock_check_submit', { id, items });
  },

  /**
   * 获取库存预警列表
   */
  async getLowStockProducts(): Promise<ApiResponse<Product[]>> {
    return tauriInvoke('product_low_stock');
  },
};

// ==================== 订单管理服务 ====================

export const orderService = {
  async list(params: SearchParams): Promise<ApiResponse<PaginatedResponse<Order>>> {
    return tauriInvoke('order_list', { params });
  },
  async get(id: string): Promise<ApiResponse<Order>> {
    return tauriInvoke('order_get', { id });
  },
  async create(data: Record<string, unknown>): Promise<ApiResponse<Order>> {
    return tauriInvoke('order_create', { data });
  },
  async update(id: string, data: Record<string, unknown>): Promise<ApiResponse<Order>> {
    return tauriInvoke('order_update', { id, data });
  },
  async delete(id: string): Promise<ApiResponse<void>> {
    return tauriInvoke('order_delete', { id });
  },
  async confirm(id: string): Promise<ApiResponse<Order>> {
    return tauriInvoke('order_confirm', { id });
  },
  async cancel(id: string, reason: string): Promise<ApiResponse<Order>> {
    return tauriInvoke('order_cancel', { id, reason });
  },
  async complete(id: string): Promise<ApiResponse<Order>> {
    return tauriInvoke('order_complete', { id });
  },
  // 兼容旧 API
  async getOrders(params: SearchParams): Promise<ApiResponse<PaginatedResponse<Order>>> {
    return this.list(params);
  },
  async getOrder(id: string): Promise<ApiResponse<Order>> {
    return this.get(id);
  },
  async createOrder(data: Omit<Order, 'id' | 'code' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Order>> {
    return this.create(data as Record<string, unknown>);
  },
  async updateOrder(id: string, data: Partial<Order>): Promise<ApiResponse<Order>> {
    return this.update(id, data as Record<string, unknown>);
  },
  async deleteOrder(id: string): Promise<ApiResponse<void>> {
    return this.delete(id);
  },
  async confirmOrder(id: string): Promise<ApiResponse<Order>> {
    return this.confirm(id);
  },
  async cancelOrder(id: string, reason: string): Promise<ApiResponse<Order>> {
    return this.cancel(id, reason);
  },
  async completeOrder(id: string): Promise<ApiResponse<Order>> {
    return this.complete(id);
  },
};

// ==================== 数据同步服务 ====================

export const syncService = {
  /**
   * 获取同步状态
   */
  async getSyncStatus(): Promise<ApiResponse<SyncStatus>> {
    return tauriInvoke('sync_status');
  },

  /**
   * 开始同步
   */
  async startSync(): Promise<ApiResponse<void>> {
    return tauriInvoke('sync_start');
  },

  /**
   * 停止同步
   */
  async stopSync(): Promise<ApiResponse<void>> {
    return tauriInvoke('sync_stop');
  },

  /**
   * 强制全量同步
   */
  async forceFullSync(): Promise<ApiResponse<void>> {
    return tauriInvoke('sync_force_full');
  },

  /**
   * 重试失败的同步
   */
  async retrySyncErrors(): Promise<ApiResponse<void>> {
    return tauriInvoke('sync_retry_errors');
  },

  /**
   * 清除同步错误
   */
  async clearSyncErrors(): Promise<ApiResponse<void>> {
    return tauriInvoke('sync_clear_errors');
  },
};

// ==================== 扫码枪服务 ====================

export const scannerService = {
  /**
   * 获取可用串口列表
   */
  async getAvailablePorts(): Promise<ApiResponse<string[]>> {
    return tauriInvoke('scanner_list_ports');
  },

  /**
   * 连接扫码枪
   */
  async connect(config: ScannerConfig): Promise<ApiResponse<void>> {
    return tauriInvoke('scanner_connect', { config });
  },

  /**
   * 断开扫码枪
   */
  async disconnect(): Promise<ApiResponse<void>> {
    return tauriInvoke('scanner_disconnect');
  },

  /**
   * 获取扫码枪状态
   */
  async getStatus(): Promise<ApiResponse<{ connected: boolean; port?: string }>> {
    return tauriInvoke('scanner_status');
  },

  /**
   * 处理扫码结果
   */
  async handleScan(barcode: string): Promise<ApiResponse<ScanResult>> {
    return tauriInvoke('scanner_handle_scan', { barcode });
  },
};

// ==================== 加密存储服务 ====================

export const storageService = {
  /**
   * 存储加密数据
   */
  async setSecure(key: string, value: string): Promise<ApiResponse<void>> {
    return tauriInvoke('storage_set_secure', { key, value });
  },

  /**
   * 获取加密数据
   */
  async getSecure(key: string): Promise<ApiResponse<string | null>> {
    return tauriInvoke('storage_get_secure', { key });
  },

  /**
   * 删除加密数据
   */
  async deleteSecure(key: string): Promise<ApiResponse<void>> {
    return tauriInvoke('storage_delete_secure', { key });
  },

  /**
   * 清除所有加密数据
   */
  async clearSecure(): Promise<ApiResponse<void>> {
    return tauriInvoke('storage_clear_secure');
  },

  /**
   * 导出本地数据
   */
  async exportData(password: string): Promise<ApiResponse<string>> {
    return tauriInvoke('storage_export', { password });
  },

  /**
   * 导入本地数据
   */
  async importData(filePath: string, password: string): Promise<ApiResponse<void>> {
    return tauriInvoke('storage_import', { filePath, password });
  },
};

// ==================== 报表服务 ====================

export const reportService = {
  /**
   * 获取 Dashboard 统计数据
   */
  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    return tauriInvoke('report_dashboard_stats');
  },

  /**
   * 获取销售报表
   */
  async getSalesReport(startDate: string, endDate: string): Promise<ApiResponse<unknown>> {
    return tauriInvoke('report_sales', { startDate, endDate });
  },

  /**
   * 获取库存报表
   */
  async getInventoryReport(): Promise<ApiResponse<unknown>> {
    return tauriInvoke('report_inventory');
  },

  /**
   * 获取客户分析报表
   */
  async getCustomerReport(): Promise<ApiResponse<unknown>> {
    return tauriInvoke('report_customer');
  },

  /**
   * 导出报表
   */
  async exportReport(reportType: string, format: 'xlsx' | 'pdf'): Promise<ApiResponse<string>> {
    return tauriInvoke('report_export', { reportType, format });
  },
};

// ==================== 系统服务 ====================

export const systemService = {
  /**
   * 获取系统信息
   */
  async getSystemInfo(): Promise<ApiResponse<{
    version: string;
    os: string;
    arch: string;
    dataDir: string;
  }>> {
    return tauriInvoke('system_info');
  },

  /**
   * 检查更新
   */
  async checkUpdate(): Promise<ApiResponse<{
    hasUpdate: boolean;
    version?: string;
    releaseNotes?: string;
  }>> {
    return tauriInvoke('system_check_update');
  },

  /**
   * 清除缓存
   */
  async clearCache(): Promise<ApiResponse<void>> {
    return tauriInvoke('system_clear_cache');
  },

  /**
   * 获取日志
   */
  async getLogs(level: 'error' | 'warn' | 'info' | 'debug', limit: number): Promise<ApiResponse<string[]>> {
    return tauriInvoke('system_get_logs', { level, limit });
  },
};
