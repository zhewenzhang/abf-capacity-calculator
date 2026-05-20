import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ConfigProvider, Layout, Menu, Spin, Button, Typography, Space } from 'antd';
import {
  DashboardOutlined,
  InboxOutlined,
  BarChartOutlined,
  SettingOutlined,
  LogoutOutlined,
  CloudOutlined,
  CalculatorOutlined,
} from '@ant-design/icons';
import type { User } from 'firebase/auth';
import { isConfigured } from './firebase/config';
import { onAuthChange, signOutUser } from './firebase/auth';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/Dashboard';
import ProductsPage from './pages/Products';
import ForecastsPage from './pages/Forecasts';
import CapacityPlanPage from './pages/CapacityPlan';
import ParametersPage from './pages/Parameters';
import CalculationResultsPage from './pages/CalculationResults';
import SetupPage from './pages/SetupPage';

const { Sider, Content } = Layout;
const { Title } = Typography;

const APP_VERSION = 'v1.2.6';

const AppContent: React.FC<{ user: User }> = ({ user }) => {
  const navigate = useNavigate();
  const [current, setCurrent] = useState('dashboard');

  const menuItems = [
    { key: 'dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: 'products', icon: <InboxOutlined />, label: 'Products' },
    { key: 'forecasts', icon: <BarChartOutlined />, label: 'Forecasts' },
    { key: 'capacity', icon: <CloudOutlined />, label: 'Capacity Plan' },
    { key: 'parameters', icon: <SettingOutlined />, label: 'Parameters' },
    { key: 'results', icon: <CalculatorOutlined />, label: 'Results' },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    setCurrent(key);
    navigate(`/${key}`);
  };

  const handleLogout = async () => {
    await signOutUser();
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        breakpoint="lg"
        collapsedWidth="80"
        width={200}
        style={{
          overflow: 'hidden',
          height: '100vh',
          position: 'sticky',
          top: 0,
          left: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ padding: '16px 12px', textAlign: 'center' }}>
          <Title level={4} style={{ color: '#fff', margin: 0, fontSize: 18 }}>
            ABF Calc
          </Title>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[current]}
            items={menuItems}
            onClick={handleMenuClick}
            style={{ borderRight: 'none' }}
          />
        </div>
        <div style={{ padding: '12px 16px', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>{APP_VERSION}</span>
        </div>
      </Sider>
      <Layout>
        <Content
          className="site-layout-content"
          style={{ margin: '0 16px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <Title level={3} style={{ margin: 0 }}>
              {menuItems.find((i) => i.key === current)?.label}
            </Title>
            <Space>
              <span>{user.email}</span>
              <Button icon={<LogoutOutlined />} onClick={handleLogout}>
                Logout
              </Button>
            </Space>
          </div>
          <Routes>
            <Route path="/dashboard" element={<DashboardPage userId={user.uid} projectId="default" />} />
            <Route path="/products" element={<ProductsPage userId={user.uid} projectId="default" />} />
            <Route path="/forecasts" element={<ForecastsPage userId={user.uid} projectId="default" />} />
            <Route path="/capacity" element={<CapacityPlanPage userId={user.uid} projectId="default" />} />
            <Route path="/parameters" element={<ParametersPage userId={user.uid} projectId="default" />} />
            <Route path="/results" element={<CalculationResultsPage userId={user.uid} projectId="default" />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
};

const AuthRouter: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange((u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="Loading..." />
      </div>
    );
  }

  if (!user) {
    if (!isConfigured) {
      return <SetupPage />;
    }
    return <LoginPage />;
  }

  return (
    <BrowserRouter>
      <AppContent user={user} />
    </BrowserRouter>
  );
};

const App: React.FC = () => {
  return (
    <ConfigProvider>
      <AuthRouter />
    </ConfigProvider>
  );
};

export default App;
