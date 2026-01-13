import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

function CustomerList() {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
    });

    useEffect(() => {
        loadCustomers();
    }, []);

    const loadCustomers = async () => {
        try {
            const data = await invoke('get_customers');
            setCustomers(data);
        } catch (error) {
            console.error('加载客户失败:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            await invoke('create_customer', { customer: formData });
            console.log('客户创建成功!');
            setFormData({ name: '', email: '', phone: '', address: '' });
            setShowForm(false);
            await loadCustomers();
        } catch (error) {
            console.error('创建客户失败:', error);
            console.error('创建客户失败: ' + error);
        }
    };

    const handleDelete = async (customerId) => {
        if (!confirm('确定要删除这个客户吗?')) return;

        try {
            await invoke('delete_customer', { id: customerId });
            alert('客户删除成功');
            await loadCustomers();
        } catch (error) {
            console.error('删除客户失败:', error);
            alert('删除客户失败: ' + error);
        }
    };

    if (loading) {
        return <div className="loading">加载中...</div>;
    }

    return (
        <div className="customer-list">
            <div className="page-header">
                <h2>客户管理</h2>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowForm(!showForm)}
                >
                    {showForm ? '取消' : '+ 添加客户'}
                </button>
            </div>

            {showForm && (
                <div className="form-card">
                    <h3>新建客户</h3>
                    <form onSubmit={handleSubmit} className="form">
                        <div className="form-row">
                            <div className="form-group">
                                <label>客户名称 *</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>邮箱 *</label>
                                <input
                                    type="email"
                                    className="form-control"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>电话 *</label>
                                <input
                                    type="tel"
                                    className="form-control"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>地址 *</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-actions">
                            <button type="submit" className="btn btn-primary">
                                创建客户
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>姓名</th>
                            <th>邮箱</th>
                            <th>电话</th>
                            <th>地址</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {customers.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="text-center">暂无客户数据</td>
                            </tr>
                        ) : (
                            customers.map((customer) => (
                                <tr key={customer.id}>
                                    <td>{customer.id}</td>
                                    <td>{customer.name}</td>
                                    <td>{customer.email}</td>
                                    <td>{customer.phone}</td>
                                    <td>{customer.address}</td>
                                    <td>
                                        <button
                                            className="btn btn-sm btn-danger"
                                            onClick={() => handleDelete(customer.id)}
                                        >
                                            删除
                                        </button>
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

export default CustomerList;