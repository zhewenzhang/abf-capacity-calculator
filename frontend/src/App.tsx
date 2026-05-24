import React, { lazy, Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ConfigProvider, Layout, Menu, Spin, Button, Typography, Space, Radio } from 'antd';
import {
  DashboardOutlined,
  InboxOutlined,
  BarChartOutlined,
  SettingOutlined,
  LogoutOutlined,
  CloudOutlined,
  CalculatorOutlined,
  ExperimentOutlined,
  GlobalOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import type { User } from 'firebase/auth';
import { isConfigured } from './firebase/config';
import { onAuthChange, signOutUser } from './firebase/auth';
import LoginPage from './pages/LoginPage';
import SetupPage from './pages/SetupPage';
import PageLoading from './components/common/PageLoading';
import { I18nProvider, useI18n, type Language } from './i18n';
import { AppPrefsProvider, useAppPrefs } from './context/AppPreferencesContext';
import { WorkspaceProvider, useActiveScope } from './context/WorkspaceContext';
import WorkspaceSwitcher from './components/workspace/WorkspaceSwitcher';
import type { DisplayCurrency } from './core/currency';
import { antdTheme } from './theme/antdTheme';
import enUS from 'antd/locale/en_US';
import zhTW from 'antd/locale/zh_TW';

const DashboardPage = lazy(() => import('./pages/Dashboard'));
const ProductsPage = lazy(() => import('./pages/Products'));
const ProductsSpreadsheetLab = lazy(() => import('./pages/ProductsSpreadsheetLab'));
const ForecastsPage = lazy(() => import('./pages/Forecasts'));
const CapacityPlanPage = lazy(() => import('./pages/CapacityPlan'));
const CapacitySpreadsheetPage = lazy(() => import('./pages/CapacitySpreadsheet'));
const ParametersPage = lazy(() => import('./pages/Parameters'));
const CalculationResultsPage = lazy(() => import('./pages/CalculationResults'));

const { Sider, Content } = Layout;
const { Title } = Typography;

const APP_VERSION = 'v1.22.1';

// --- Sidebar with i18n ---
const AppSider: React.FC<{ current: string; onMenuClick: (key: string) => void }> = ({ current, onMenuClick }) => {
  const { t } = useI18n();

  const menuItems = [
    { key: 'dashboard', icon: <DashboardOutlined />, label: t('menu.dashboard') },
    { key: 'products', icon: <InboxOutlined />, label: t('menu.products') },
    { key: 'products-sheet-lab', icon: <ExperimentOutlined />, label: t('menu.productsSheet') },
    { key: 'forecasts', icon: <BarChartOutlined />, label: t('menu.forecasts') },
    { key: 'capacity', icon: <CloudOutlined />, label: t('menu.capacity') },
    { key: 'capacity-lab', icon: <ExperimentOutlined />, label: t('menu.capacityLab') },
    { key: 'parameters', icon: <SettingOutlined />, label: t('menu.parameters') },
    { key: 'results', icon: <CalculatorOutlined />, label: t('menu.results') },
  ];

  return (
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
          {t('app.abbrev')}
        </Title>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[current]}
          items={menuItems}
          onClick={({ key }) => onMenuClick(key)}
          style={{ borderRight: 'none' }}
        />
      </div>
      <div style={{ padding: '12px 16px', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>{APP_VERSION}</span>
      </div>
    </Sider>
  );
};

// --- Header with language and currency switches ---
const AppHeader: React.FC<{
  user: User;
  onLogout: () => void;
  pageTitle: string;
}> = ({ user, onLogout, pageTitle }) => {
  const { t, lang, setLang } = useI18n();
  const { prefs, setCurrency } = useAppPrefs();

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
      <Title level={3} style={{ margin: 0 }}>{pageTitle}</Title>
      <Space wrap>
        {/* Workspace switcher */}
        <WorkspaceSwitcher />

        {/* Language switch */}
        <Space size={4}>
          <GlobalOutlined />
          <Radio.Group
            value={lang}
            onChange={(e) => setLang(e.target.value as Language)}
            size="small"
            buttonStyle="solid"
          >
            <Radio.Button value="en">EN</Radio.Button>
            <Radio.Button value="zh-TW">繁中</Radio.Button>
          </Radio.Group>
        </Space>

        {/* Currency switch */}
        <Space size={4}>
          <DollarOutlined />
          <Radio.Group
            value={prefs.displayCurrency}
            onChange={(e) => setCurrency(e.target.value as DisplayCurrency)}
            size="small"
            buttonStyle="solid"
          >
            <Radio.Button value="USD">USD</Radio.Button>
            <Radio.Button value="TWD">TWD</Radio.Button>
            <Radio.Button value="CNY">CNY</Radio.Button>
          </Radio.Group>
        </Space>

        {/* User info */}
        <span style={{ fontSize: 13, color: '#666' }}>{user.email}</span>
        <Button icon={<LogoutOutlined />} size="small" onClick={onLogout}>
          {t('header.logout')}
        </Button>
      </Space>
    </div>
  );
};

// --- Main App Content ---
const AppContent: React.FC<{ user: User }> = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  const scope = useActiveScope();

  // Derive current menu key from URL path
  const current = useMemo(() => {
    const path = location.pathname.replace(/^\//, '');
    const validKeys = ['dashboard', 'products', 'products-sheet-lab', 'forecasts', 'capacity', 'capacity-lab', 'parameters', 'results'];
    return validKeys.includes(path) ? path : 'dashboard';
  }, [location.pathname]);

  const pageTitles: Record<string, string> = useMemo(() => ({
    dashboard: t('dashboard.title'),
    products: t('products.title'),
    'products-sheet-lab': t('productsSheet.title'),
    forecasts: t('forecasts.title'),
    capacity: t('capacity.title'),
    'capacity-lab': t('capacityLab.title'),
    parameters: t('parameters.title'),
    results: t('results.title'),
  }), [t]);

  const handleMenuClick = useCallback((key: string) => {
    navigate(`/${key}`);
  }, [navigate]);

  const handleLogout = useCallback(async () => {
    await signOutUser();
  }, []);

  // Force-remount page subtrees when scope changes so per-scope loaders re-run cleanly.
  const routeKey = scope.mode === 'workspace' ? `ws:${scope.workspaceId}` : `user:${scope.userId}`;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <AppSider current={current} onMenuClick={handleMenuClick} />
      <Layout>
        <Content className="site-layout-content" style={{ margin: '0 16px' }}>
          <AppHeader
            user={user}
            onLogout={handleLogout}
            pageTitle={pageTitles[current] || current}
          />
          <Suspense fallback={<PageLoading />}>
            <Routes>
              <Route path="/dashboard" element={<DashboardPage key={routeKey} scope={scope} />} />
              <Route path="/products" element={<ProductsPage key={routeKey} scope={scope} />} />
              <Route path="/products-sheet-lab" element={<ProductsSpreadsheetLab key={routeKey} scope={scope} />} />
              <Route path="/forecasts" element={<ForecastsPage key={routeKey} scope={scope} />} />
              <Route path="/capacity" element={<CapacityPlanPage key={routeKey} scope={scope} />} />
              <Route path="/capacity-lab" element={<CapacitySpreadsheetPage key={routeKey} scope={scope} />} />
              <Route path="/parameters" element={<ParametersPage key={routeKey} scope={scope} />} />
              <Route path="/results" element={<CalculationResultsPage key={routeKey} scope={scope} />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
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
    <WorkspaceProvider user={user}>
      <BrowserRouter>
        <AppContent user={user} />
      </BrowserRouter>
    </WorkspaceProvider>
  );
};

const App: React.FC = () => {
  return (
    <ConfigProvider theme={antdTheme}>
      <AppPrefsProvider>
        <I18nProvider>
          <LocaleBridge />
        </I18nProvider>
      </AppPrefsProvider>
    </ConfigProvider>
  );
};

// Bridge component that reads i18n language and wraps with locale-aware ConfigProvider
const LocaleBridge: React.FC = () => {
  const { lang } = useI18n();
  const antdLocale = useMemo(() => (lang === 'zh-TW' ? zhTW : enUS), [lang]);
  return (
    <ConfigProvider theme={antdTheme} locale={antdLocale}>
      <AuthRouter />
    </ConfigProvider>
  );
};

export default App;
