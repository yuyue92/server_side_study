import React from 'react';

function Layout({ children, currentView, onNavigate }) {
    const menuItems = [
        { id: 'dashboard', label: '仪表盘', icon: '📊' },
        { id: 'orders', label: '订单列表', icon: '📋' },
        { id: 'new-order', label: '新建订单', icon: '➕' },
        { id: 'customers', label: '客户管理', icon: '👥' },
        { id: 'products', label: '产品管理', icon: '📦' },
    ];

    return (
        <div className="app-container">
            {/* 顶部状态栏 */}
            <div className="top-bar">
                <div className="top-bar-left">
                    <h1>📦 订单管理系统</h1>
                </div>
                <div className="top-bar-right">
                    <span className="status-indicator">● 在线</span>
                    <span className="user-info">管理员</span>
                </div>
            </div>

            <div className="main-container">
                {/* 左侧菜单 */}
                <div className="sidebar">
                    <nav className="sidebar-nav">
                        {menuItems.map((item) => (
                            <button
                                key={item.id}
                                className={`nav-item ${currentView === item.id ? 'active' : ''}`}
                                onClick={() => onNavigate(item.id)}
                            >
                                <span className="nav-icon">{item.icon}</span>
                                <span className="nav-label">{item.label}</span>
                            </button>
                        ))}
                    </nav>
                </div>

                {/* 右侧内容区 */}
                <div className="content-area">
                    {children}
                </div>
            </div>
        </div>
    );
}

export default Layout;