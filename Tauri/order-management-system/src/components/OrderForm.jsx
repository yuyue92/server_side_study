import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

function OrderForm({ onSuccess }) {
    const [customers, setCustomers] = useState([]);
    const [products, setProducts] = useState([]);
    const [formData, setFormData] = useState({
        order_number: '',
        customer_id: '',
        product_id: '',
        quantity: 1,
        status: '待处理',
        notes: '',
    });
    const [selectedProduct, setSelectedProduct] = useState(null);

    useEffect(() => {
        loadCustomers();
        loadProducts();
        generateOrderNumber();
    }, []);

    const generateOrderNumber = () => {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        setFormData(prev => ({
            ...prev,
            order_number: `ORD${timestamp}${random}`,
        }));
    };

    const loadCustomers = async () => {
        try {
            const data = await invoke('get_customers');
            setCustomers(data);
        } catch (error) {
            console.error('加载客户失败:', error);
        }
    };

    const loadProducts = async () => {
        try {
            const data = await invoke('get_products');
            setProducts(data);
        } catch (error) {
            console.error('加载产品失败:', error);
        }
    };

    const handleProductChange = (productId) => {
        const product = products.find(p => p.id === parseInt(productId));
        setSelectedProduct(product);
        setFormData(prev => ({
            ...prev,
            product_id: productId,
        }));
    };

    const calculateTotal = () => {
        if (selectedProduct && formData.quantity) {
            return (selectedProduct.price * formData.quantity).toFixed(2);
        }
        return '0.00';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.customer_id || !formData.product_id) {
            alert('请选择客户和产品');
            return;
        }

        const order = {
            order_number: formData.order_number,
            customer_id: parseInt(formData.customer_id),
            product_id: parseInt(formData.product_id),
            quantity: parseInt(formData.quantity),
            total_amount: parseFloat(calculateTotal()),
            status: formData.status,
            order_date: new Date().toISOString().split('T')[0],
            notes: formData.notes,
        };

        try {
            await invoke('create_order', { order });
            alert('订单创建成功!');
            onSuccess();
        } catch (error) {
            console.error('创建订单失败:', error);
            alert('创建订单失败: ' + error);
        }
    };

    return (
        <div className="order-form">
            <div className="page-header">
                <h2>新建订单</h2>
            </div>

            <form onSubmit={handleSubmit} className="form">
                <div className="form-row">
                    <div className="form-group">
                        <label>订单号</label>
                        <input
                            type="text"
                            className="form-control"
                            value={formData.order_number}
                            readOnly
                        />
                    </div>

                    <div className="form-group">
                        <label>订单状态</label>
                        <select
                            className="form-control"
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        >
                            <option value="待处理">待处理</option>
                            <option value="处理中">处理中</option>
                            <option value="已完成">已完成</option>
                            <option value="已取消">已取消</option>
                        </select>
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>选择客户 *</label>
                        <select
                            className="form-control"
                            value={formData.customer_id}
                            onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                            required
                        >
                            <option value="">-- 请选择客户 --</option>
                            {customers.map((customer) => (
                                <option key={customer.id} value={customer.id}>
                                    {customer.name} - {customer.email}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>选择产品 *</label>
                        <select
                            className="form-control"
                            value={formData.product_id}
                            onChange={(e) => handleProductChange(e.target.value)}
                            required
                        >
                            <option value="">-- 请选择产品 --</option>
                            {products.map((product) => (
                                <option key={product.id} value={product.id}>
                                    {product.name} - ¥{product.price} (库存: {product.stock})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>数量 *</label>
                        <input
                            type="number"
                            className="form-control"
                            min="1"
                            value={formData.quantity}
                            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>总金额</label>
                        <div className="form-control-static">
                            ¥{calculateTotal()}
                        </div>
                    </div>
                </div>

                <div className="form-group">
                    <label>备注</label>
                    <textarea
                        className="form-control"
                        rows="3"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="请输入订单备注信息..."
                    />
                </div>

                {selectedProduct && (
                    <div className="product-info">
                        <h4>产品详情</h4>
                        <p><strong>名称:</strong> {selectedProduct.name}</p>
                        <p><strong>描述:</strong> {selectedProduct.description}</p>
                        <p><strong>单价:</strong> ¥{selectedProduct.price}</p>
                        <p><strong>库存:</strong> {selectedProduct.stock}</p>
                    </div>
                )}

                <div className="form-actions">
                    <button type="submit" className="btn btn-primary">
                        创建订单
                    </button>
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={onSuccess}
                    >
                        取消
                    </button>
                </div>
            </form>
        </div>
    );
}

export default OrderForm;