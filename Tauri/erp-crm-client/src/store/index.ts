import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Customer,
  Product,
  Order,
  User,
  SystemConfig,
  SyncStatus,
  Notification,
  DashboardStats,
  ScanResult,
} from '@/types';

// ==================== 应用全局状态 ====================

interface AppState {
  // 用户状态
  currentUser: User | null;
  isAuthenticated: boolean;
  
  // 系统配置
  config: SystemConfig;
  
  // 同步状态
  syncStatus: SyncStatus;
  
  // 离线模式
  isOffline: boolean;
  
  // 侧边栏
  sidebarCollapsed: boolean;
  
  // 通知
  notifications: Notification[];
  unreadNotificationCount: number;
  
  // Actions
  setCurrentUser: (user: User | null) => void;
  setConfig: (config: Partial<SystemConfig>) => void;
  setSyncStatus: (status: Partial<SyncStatus>) => void;
  setIsOffline: (isOffline: boolean) => void;
  toggleSidebar: () => void;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  logout: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentUser: null,
      isAuthenticated: false,
      config: {
        companyName: '企业管理系统',
        apiBaseUrl: 'http://localhost:8080/api',
        syncInterval: 5,
        offlineMode: false,
        theme: 'light',
        language: 'zh-CN',
      },
      syncStatus: {
        isSyncing: false,
        pendingChanges: 0,
        syncErrors: [],
      },
      isOffline: false,
      sidebarCollapsed: false,
      notifications: [],
      unreadNotificationCount: 0,
      
      setCurrentUser: (user) => set({ 
        currentUser: user, 
        isAuthenticated: !!user 
      }),
      
      setConfig: (config) => set((state) => ({ 
        config: { ...state.config, ...config } 
      })),
      
      setSyncStatus: (status) => set((state) => ({ 
        syncStatus: { ...state.syncStatus, ...status } 
      })),
      
      setIsOffline: (isOffline) => set({ isOffline }),
      
      toggleSidebar: () => set((state) => ({ 
        sidebarCollapsed: !state.sidebarCollapsed 
      })),
      
      addNotification: (notification) => set((state) => {
        const newNotification: Notification = {
          ...notification,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          read: false,
        };
        return {
          notifications: [newNotification, ...state.notifications].slice(0, 50),
          unreadNotificationCount: state.unreadNotificationCount + 1,
        };
      }),
      
      markNotificationRead: (id) => set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n
        ),
        unreadNotificationCount: Math.max(0, state.unreadNotificationCount - 1),
      })),
      
      clearNotifications: () => set({ 
        notifications: [], 
        unreadNotificationCount: 0 
      }),
      
      logout: () => set({ 
        currentUser: null, 
        isAuthenticated: false 
      }),
    }),
    {
      name: 'erp-crm-app-storage',
      partialize: (state) => ({
        config: state.config,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);

// ==================== 客户管理状态 ====================

interface CustomerState {
  customers: Customer[];
  selectedCustomer: Customer | null;
  isLoading: boolean;
  searchKeyword: string;
  filters: {
    category: string;
    status: string;
  };
  
  setCustomers: (customers: Customer[]) => void;
  addCustomer: (customer: Customer) => void;
  updateCustomer: (id: string, data: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  setSelectedCustomer: (customer: Customer | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setSearchKeyword: (keyword: string) => void;
  setFilters: (filters: Partial<CustomerState['filters']>) => void;
}

export const useCustomerStore = create<CustomerState>((set) => ({
  customers: [],
  selectedCustomer: null,
  isLoading: false,
  searchKeyword: '',
  filters: {
    category: '',
    status: '',
  },
  
  setCustomers: (customers) => set({ customers }),
  
  addCustomer: (customer) => set((state) => ({ 
    customers: [customer, ...state.customers] 
  })),
  
  updateCustomer: (id, data) => set((state) => ({
    customers: state.customers.map((c) =>
      c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c
    ),
    selectedCustomer: state.selectedCustomer?.id === id 
      ? { ...state.selectedCustomer, ...data } 
      : state.selectedCustomer,
  })),
  
  deleteCustomer: (id) => set((state) => ({
    customers: state.customers.filter((c) => c.id !== id),
    selectedCustomer: state.selectedCustomer?.id === id ? null : state.selectedCustomer,
  })),
  
  setSelectedCustomer: (customer) => set({ selectedCustomer: customer }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setSearchKeyword: (keyword) => set({ searchKeyword: keyword }),
  setFilters: (filters) => set((state) => ({ 
    filters: { ...state.filters, ...filters } 
  })),
}));

// ==================== 库存管理状态 ====================

interface InventoryState {
  products: Product[];
  selectedProduct: Product | null;
  isLoading: boolean;
  searchKeyword: string;
  filters: {
    category: string;
    status: string;
    lowStock: boolean;
  };
  
  // 扫码枪相关
  lastScanResult: ScanResult | null;
  scannerConnected: boolean;
  
  setProducts: (products: Product[]) => void;
  addProduct: (product: Product) => void;
  updateProduct: (id: string, data: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  updateStock: (id: string, quantity: number) => void;
  setSelectedProduct: (product: Product | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setSearchKeyword: (keyword: string) => void;
  setFilters: (filters: Partial<InventoryState['filters']>) => void;
  setLastScanResult: (result: ScanResult | null) => void;
  setScannerConnected: (connected: boolean) => void;
}

export const useInventoryStore = create<InventoryState>((set) => ({
  products: [],
  selectedProduct: null,
  isLoading: false,
  searchKeyword: '',
  filters: {
    category: '',
    status: '',
    lowStock: false,
  },
  lastScanResult: null,
  scannerConnected: false,
  
  setProducts: (products) => set({ products }),
  
  addProduct: (product) => set((state) => ({ 
    products: [product, ...state.products] 
  })),
  
  updateProduct: (id, data) => set((state) => ({
    products: state.products.map((p) =>
      p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p
    ),
    selectedProduct: state.selectedProduct?.id === id 
      ? { ...state.selectedProduct, ...data } 
      : state.selectedProduct,
  })),
  
  deleteProduct: (id) => set((state) => ({
    products: state.products.filter((p) => p.id !== id),
    selectedProduct: state.selectedProduct?.id === id ? null : state.selectedProduct,
  })),
  
  updateStock: (id, quantity) => set((state) => ({
    products: state.products.map((p) =>
      p.id === id ? { ...p, currentStock: p.currentStock + quantity } : p
    ),
  })),
  
  setSelectedProduct: (product) => set({ selectedProduct: product }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setSearchKeyword: (keyword) => set({ searchKeyword: keyword }),
  setFilters: (filters) => set((state) => ({ 
    filters: { ...state.filters, ...filters } 
  })),
  setLastScanResult: (result) => set({ lastScanResult: result }),
  setScannerConnected: (connected) => set({ scannerConnected: connected }),
}));

// ==================== 订单管理状态 ====================

interface OrderState {
  orders: Order[];
  selectedOrder: Order | null;
  isLoading: boolean;
  searchKeyword: string;
  filters: {
    type: string;
    status: string;
    dateRange: { start: string; end: string } | null;
  };
  
  setOrders: (orders: Order[]) => void;
  addOrder: (order: Order) => void;
  updateOrder: (id: string, data: Partial<Order>) => void;
  deleteOrder: (id: string) => void;
  setSelectedOrder: (order: Order | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setSearchKeyword: (keyword: string) => void;
  setFilters: (filters: Partial<OrderState['filters']>) => void;
}

export const useOrderStore = create<OrderState>((set) => ({
  orders: [],
  selectedOrder: null,
  isLoading: false,
  searchKeyword: '',
  filters: {
    type: '',
    status: '',
    dateRange: null,
  },
  
  setOrders: (orders) => set({ orders }),
  
  addOrder: (order) => set((state) => ({ 
    orders: [order, ...state.orders] 
  })),
  
  updateOrder: (id, data) => set((state) => ({
    orders: state.orders.map((o) =>
      o.id === id ? { ...o, ...data, updatedAt: new Date().toISOString() } : o
    ),
    selectedOrder: state.selectedOrder?.id === id 
      ? { ...state.selectedOrder, ...data } 
      : state.selectedOrder,
  })),
  
  deleteOrder: (id) => set((state) => ({
    orders: state.orders.filter((o) => o.id !== id),
    selectedOrder: state.selectedOrder?.id === id ? null : state.selectedOrder,
  })),
  
  setSelectedOrder: (order) => set({ selectedOrder: order }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setSearchKeyword: (keyword) => set({ searchKeyword: keyword }),
  setFilters: (filters) => set((state) => ({ 
    filters: { ...state.filters, ...filters } 
  })),
}));

// ==================== Dashboard 状态 ====================

interface DashboardState {
  stats: DashboardStats | null;
  isLoading: boolean;
  
  setStats: (stats: DashboardStats) => void;
  setIsLoading: (isLoading: boolean) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  stats: null,
  isLoading: false,
  
  setStats: (stats) => set({ stats }),
  setIsLoading: (isLoading) => set({ isLoading }),
}));
