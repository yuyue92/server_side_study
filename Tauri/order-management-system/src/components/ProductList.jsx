import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

function ProductList() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        stock: '',
    });

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        try {
            const data = await invoke('get_products');
            setProducts(data);
        } catch (error) {
            console.error('加载产品失败:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const product = {
            name: formData.name,
            description: formData.description,
            price: parseFloat(formData.price),
            stock: parseInt(formData.stock),
        };

        try {
            await invoke('create_product', { product });
            alert('产品创建成功!');
            setFormData({ name: '', description: '', price: '', stock: '' });
            setShowForm(false);
            await loadProducts();
        } catch (error) {
            console.error('创建产品失败:', error);
            alert('创建产品失败: ' + error);
        }
    };

    const handleDelete = async (productId) => {
        if (!confirm('确定要删除这个产品吗?')) return;

        try {
            await invoke('delete_product', { id: productId });
            alert('产品删除成功');
            await loadProducts();
        } catch (error) {
            console.error('删除产品失败:', error);
            alert('删除产品失败: ' + error);
        }
    };

    const getStockBadge = (stock) => {
        if (stock > 50) return 'badge-success';
        if (stock > 10) return 'badge-warning';
        return 'badge-danger';
    };

    if (loading) {
        return <div className="loading">加载中...</div>;
    }

    return (
        <div className="product-list">
            <div className="page-header">
                <h2>产品管理</h2>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowForm(!showForm)}
                >
                    {showForm ? '取消' : '+ 添加产品'}
                </button>
            </div>

            {showForm && (
                <div className="form-card">
                    <h3>新建产品</h3>
                    <form onSubmit={handleSubmit} className="form">
                        <div className="form-row">
                            <div className="form-group">
                                <label>产品名称 *</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>价格 *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="form-control"
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>描述 *</label>
                                <textarea
                                    className="form-control"
                                    rows="3"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>库存数量 *</label>
                                <input
                                    type="number"
                                    className="form-control"
                                    value={formData.stock}
                                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-actions">
                            <button type="submit" className="btn btn-primary">
                                创建产品
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="products-grid">
                {products.length === 0 ? (
                    <div className="empty-state">暂无产品数据</div>
                ) : (
                    products.map((product) => (
                        <div key={product.id} className="product-card">
                            <div className="product-card-header">
                                <h3>{product.name}</h3>
                                <span className={`badge ${getStockBadge(product.stock)}`}>
                                    库存: {product.stock}
                                </span>
                            </div>
                            <div className="product-card-body">
                                <p className="product-description">{product.description}</p>
                                <div className="product-price">¥{product.price.toFixed(2)}</div>
                            </div>
                            <div className="product-card-footer">
                                <button
                                    className="btn btn-sm btn-danger"
                                    onClick={() => handleDelete(product.id)}
                                >
                                    删除
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default ProductList;