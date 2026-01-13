import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import OrderList from './components/OrderList';
import OrderForm from './components/OrderForm';
import CustomerList from './components/CustomerList';
import ProductList from './components/ProductList';
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'orders':
        return <OrderList />;
      case 'new-order':
        return <OrderForm onSuccess={() => setCurrentView('orders')} />;
      case 'customers':
        return <CustomerList />;
      case 'products':
        return <ProductList />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout currentView={currentView} onNavigate={setCurrentView}>
      {renderContent()}
    </Layout>
  );
}

export default App;