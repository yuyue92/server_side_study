import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

function Dashboard() {
    const [stats, setStats] = useState({
        total_orders: 0,
        total_customers: 0,
        total_products: 0,
        total_revenue: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStatistics();
    }, []);

    const loadStatistics = async () => {
        try {
            const data = await invoke('get_statistics');
            setStats(data);
        } catch (error) {
            console.error('加载统计数据失败:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="loading">加载中...</div>;
    }

    return (
        <div className="dashboard">
            <h2>数据概览</h2>

            <div className="stats-grid">
                <div className="stat-card stat-card-blue">
                    <div className="stat-icon">📋</div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.total_orders}</div>
                        <div className="stat-label">总订单数</div>
                    </div>
                </div>

                <div className="stat-card stat-card-green">
                    <div className="stat-icon">👥</div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.total_customers}</div>
                        <div className="stat-label">客户总数</div>
                    </div>
                </div>

                <div className="stat-card stat-card-orange">
                    <div className="stat-icon">📦</div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.total_products}</div>
                        <div className="stat-label">产品总数</div>
                    </div>
                </div>

                <div className="stat-card stat-card-purple">
                    <div className="stat-icon">💰</div>
                    <div className="stat-content">
                        <div className="stat-value">¥{stats.total_revenue.toFixed(2)}</div>
                        <div className="stat-label">总收入</div>
                    </div>
                </div>
            </div>

            <div className="dashboard-info">
                <div className="info-card">
                    <h3>系统信息</h3>
                    <p>欢迎使用订单管理系统</p>
                    <p>当前时间: {new Date().toLocaleString('zh-CN')}</p>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;