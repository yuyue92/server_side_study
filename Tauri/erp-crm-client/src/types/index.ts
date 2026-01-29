// ==================== 基础类型 ====================

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

// ==================== 客户管理类型 ====================

export interface Customer extends BaseEntity {
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  category: CustomerCategory;
  tags: string[];
  status: CustomerStatus;
  source: string;
  remark: string;
  contactPerson: string;
  creditLimit: number;
  balance: number;
}

export type CustomerCategory = 'vip' | 'regular' | 'potential' | 'inactive';
export type CustomerStatus = 'active' | 'inactive' | 'blocked';

export interface CustomerContact extends BaseEntity {
  customerId: string;
  name: string;
  position: string;
  phone: string;
  email: string;
  isPrimary: boolean;
}

export interface CustomerFollowUp extends BaseEntity {
  customerId: string;
  type: FollowUpType;
  content: string;
  nextFollowUpDate?: string;
  operatorId: string;
  operatorName: string;
}

export type FollowUpType = 'call' | 'visit' | 'email' | 'meeting' | 'other';

// ==================== 库存管理类型 ====================

export interface Product extends BaseEntity {
  code: string;
  barcode: string;
  name: string;
  category: string;
  unit: string;
  specification: string;
  brand: string;
  costPrice: number;
  sellPrice: number;
  minStock: number;
  maxStock: number;
  currentStock: number;
  warehouseId: string;
  location: string;
  status: ProductStatus;
  imageUrl?: string;
  description: string;
}

export type ProductStatus = 'active' | 'discontinued' | 'out_of_stock';

export interface Warehouse extends BaseEntity {
  name: string;
  code: string;
  address: string;
  manager: string;
  phone: string;
  status: 'active' | 'inactive';
}

export interface StockRecord extends BaseEntity {
  productId: string;
  productName: string;
  productCode: string;
  type: StockRecordType;
  quantity: number;
  beforeQuantity: number;
  afterQuantity: number;
  unitPrice: number;
  totalAmount: number;
  relatedOrderId?: string;
  warehouseId: string;
  operatorId: string;
  operatorName: string;
  remark: string;
}

export type StockRecordType = 'in' | 'out' | 'adjust' | 'transfer' | 'return';

export interface StockCheck extends BaseEntity {
  code: string;
  warehouseId: string;
  warehouseName: string;
  status: StockCheckStatus;
  items: StockCheckItem[];
  operatorId: string;
  operatorName: string;
  checkedAt?: string;
  remark: string;
}

export type StockCheckStatus = 'draft' | 'checking' | 'completed' | 'cancelled';

export interface StockCheckItem {
  productId: string;
  productName: string;
  productCode: string;
  systemQuantity: number;
  actualQuantity: number;
  difference: number;
  remark: string;
}

// ==================== 订单管理类型 ====================

export interface Order extends BaseEntity {
  code: string;
  type: OrderType;
  customerId: string;
  customerName: string;
  status: OrderStatus;
  items: OrderItem[];
  totalQuantity: number;
  totalAmount: number;
  discountAmount: number;
  payableAmount: number;
  paidAmount: number;
  deliveryAddress: string;
  deliveryDate?: string;
  remark: string;
  operatorId: string;
  operatorName: string;
}

export type OrderType = 'sale' | 'purchase' | 'return';
export type OrderStatus = 'draft' | 'pending' | 'confirmed' | 'shipped' | 'completed' | 'cancelled';

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  amount: number;
  remark: string;
}

// ==================== 用户和权限类型 ====================

export interface User extends BaseEntity {
  username: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  role: UserRole;
  department: string;
  status: 'active' | 'inactive';
  lastLoginAt?: string;
}

export type UserRole = 'admin' | 'manager' | 'staff' | 'viewer';

// ==================== 系统配置类型 ====================

export interface SystemConfig {
  companyName: string;
  companyLogo?: string;
  apiBaseUrl: string;
  syncInterval: number; // 同步间隔（分钟）
  offlineMode: boolean;
  theme: 'light' | 'dark' | 'system';
  language: 'zh-CN' | 'en-US';
}

// ==================== API 响应类型 ====================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ==================== 搜索和筛选类型 ====================

export interface SearchParams extends PaginationParams {
  keyword?: string;
  filters?: Record<string, unknown>;
  dateRange?: {
    start: string;
    end: string;
  };
}

// ==================== 报表类型 ====================

export interface SalesReport {
  period: string;
  totalOrders: number;
  totalAmount: number;
  averageOrderValue: number;
  topProducts: {
    productId: string;
    productName: string;
    quantity: number;
    amount: number;
  }[];
  topCustomers: {
    customerId: string;
    customerName: string;
    orderCount: number;
    amount: number;
  }[];
}

export interface InventoryReport {
  totalProducts: number;
  totalValue: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  categoryBreakdown: {
    category: string;
    productCount: number;
    totalValue: number;
  }[];
  stockMovement: {
    date: string;
    inQuantity: number;
    outQuantity: number;
  }[];
}

// ==================== 扫码枪类型 ====================

export interface ScannerConfig {
  enabled: boolean;
  port: string;
  baudRate: number;
  dataBits: number;
  stopBits: number;
  parity: 'none' | 'even' | 'odd';
}

export interface ScanResult {
  barcode: string;
  timestamp: string;
  product?: Product;
}

// ==================== 同步状态类型 ====================

export interface SyncStatus {
  lastSyncAt?: string;
  isSyncing: boolean;
  pendingChanges: number;
  syncErrors: SyncError[];
}

export interface SyncError {
  id: string;
  entity: string;
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  error: string;
  timestamp: string;
  retryCount: number;
}

// ==================== 通知类型 ====================

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  link?: string;
}

// ==================== Dashboard 类型 ====================

export interface DashboardStats {
  totalCustomers: number;
  activeCustomers: number;
  totalProducts: number;
  lowStockProducts: number;
  todayOrders: number;
  todayRevenue: number;
  monthlyRevenue: number;
  monthlyGrowth: number;
}

export interface DashboardChartData {
  revenueChart: {
    date: string;
    revenue: number;
    orders: number;
  }[];
  categoryChart: {
    name: string;
    value: number;
  }[];
  topProductsChart: {
    name: string;
    sales: number;
  }[];
}
