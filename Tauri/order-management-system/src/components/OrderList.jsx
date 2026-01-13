import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

function OrderList() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');

    useEffect(() => {
        loadOrders();
    }, []);

    const loadOrders = async () => {
        try {
            const data = await invoke('get_orders');
            setOrders(data);
        } catch (error) {
            console.error('加载订单失败:', error);
            alert('加载订单失败: ' + error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (orderId, newStatus) => {
        try {
            await invoke('update_order_status', { id: orderId, status: newStatus });
            await loadOrders();
            alert('订单状态更新成功');
        } catch (error) {
            console.error('更新状态失败:', error);
            alert('更新状态失败: ' + error);
        }
    };

    const handleDelete = async (orderId) => {
        if (!confirm('确定要删除这个订单吗?')) return;

        try {
            await invoke('delete_order', { id: orderId });
            await loadOrders();
            alert('订单删除成功');
        } catch (error) {
            console.error('删除订单失败:', error);
            alert('删除订单失败: ' + error);
        }
    };

    const getStatusBadge = (status) => {
        const statusMap = {
            '待处理': 'badge-warning',
            '处理中': 'badge-info',
            '已完成': 'badge-success',
            '已取消': 'badge-danger',
        };
        return statusMap[status] || 'badge-secondary';
    };

    const filteredOrders = filterStatus === 'all'
        ? orders
        : orders.filter(order => order.status === filterStatus);

    if (loading) {
        return <div className="loading">加载中...</div>;
    }

    return (
        <div className="order-list">
            <div className="page-header">
                <h2>订单列表</h2>
                <button className="btn btn-primary" onClick={loadOrders}>
                    🔄 刷新
                </button>
            </div>

            <div className="filter-bar">
                <label>状态筛选:</label>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="form-select"
                >
                    <option value="all">全部</option>
                    <option value="待处理">待处理</option>
                    <option value="处理中">处理中</option>
                    <option value="已完成">已完成</option>
                    <option value="已取消">已取消</option>
                </select>
                <span className="filter-count">共 {filteredOrders.length} 条订单</span>
            </div>

            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th>订单号</th>
                            <th>客户</th>
                            <th>产品</th>
                            <th>数量</th>
                            <th>金额</th>
                            <th>状态</th>
                            <th>日期</th>
                            <th>备注</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredOrders.length === 0 ? (
                            <tr>
                                <td colSpan="9" className="text-center">暂无订单数据</td>
                            </tr>
                        ) : (
                            filteredOrders.map((order) => (
                                <tr key={order.id}>
                                    <td>{order.order_number}</td>
                                    <td>{order.customer_name}</td>
                                    <td>{order.product_name}</td>
                                    <td>{order.quantity}</td>
                                    <td>¥{order.total_amount.toFixed(2)}</td>
                                    <td>
                                        <span className={`badge ${getStatusBadge(order.status)}`}>
                                            {order.status}
                                        </span>
                                    </td>
                                    <td>{order.order_date}</td>
                                    <td className="notes-cell">{order.notes}</td>
                                    <td>
                                        <div className="action-buttons">
                                            <select
                                                value={order.status}
                                                onChange={(e) => handleStatusChange(order.id, e.target.value)}
                                                className="form-select-sm"
                                            >
                                                <option value="待处理">待处理</option>
                                                <option value="处理中">处理中</option>
                                                <option value="已完成">已完成</option>
                                                <option value="已取消">已取消</option>
                                            </select>
                                            <button
                                                className="btn btn-sm btn-danger"
                                                onClick={() => handleDelete(order.id)}
                                            >
                                                删除
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default OrderList;