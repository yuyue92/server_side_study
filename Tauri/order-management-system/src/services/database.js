import { invoke } from '@tauri-apps/api/tauri';

// 订单相关
export const createOrder = async (order) => {
    return await invoke('create_order', { order });
};

export const getOrders = async () => {
    return await invoke('get_orders');
};

export const updateOrderStatus = async (id, status) => {
    return await invoke('update_order_status', { id, status });
};

export const deleteOrder = async (id) => {
    return await invoke('delete_order', { id });
};

// 客户相关
export const createCustomer = async (customer) => {
    return await invoke('create_customer', { customer });
};

export const getCustomers = async () => {
    return await invoke('get_customers');
};

export const deleteCustomer = async (id) => {
    return await invoke('delete_customer', { id });
};

// 产品相关
export const createProduct = async (product) => {
    return await invoke('create_product', { product });
};

export const getProducts = async () => {
    return await invoke('get_products');
};

export const deleteProduct = async (id) => {
    return await invoke('delete_product', { id });
};

// 统计相关
export const getStatistics = async () => {
    return await invoke('get_statistics');
};

// 导出所有方法
export default {
    createOrder,
    getOrders,
    updateOrderStatus,
    deleteOrder,
    createCustomer,
    getCustomers,
    deleteCustomer,
    createProduct,
    getProducts,
    deleteProduct,
    getStatistics,
};