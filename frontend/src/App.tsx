import React, { lazy, Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ConfigProvider, Spin, Button, Space, Radio, Dropdown } from 'antd';
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
  RobotOutlined,
  CalendarOutlined,
  MenuOutlined,
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
import { tweakcnAntdTheme } from './theme/tweakcnAntdTheme';
import enUS from 'antd/locale/en_US';
import zhTW from 'antd/locale/zh_TW';

const DashboardPage = lazy(() => import('./pages/Dashboard'));
const ProductsPage = lazy(() => import('./pages/Products'));
const ProductsSpreadsheetLab = lazy(() => import('./pages/ProductsSpreadsheetLab'));
const ForecastsPage = lazy(() => import('./pages/Forecasts'));
const ForecastsSpreadsheetLab = lazy(() => import('./pages/ForecastsSpreadsheetLab'));
const CapacityPlanPage = lazy(() => import('./pages/CapacityPlan'));
const CapacitySpreadsheetPage = lazy(() => import('./pages/CapacitySpreadsheet'));
const ParametersPage = lazy(() => import('./pages/Parameters'));
const CalculationResultsPage = lazy(() => import('./pages/CalculationResults'));
const BpTargetsPage = lazy(() => import('./pages/BpTargets'));
const ScenarioPlanningPage = lazy(() => import('./pages/ScenarioPlanning'));
const AiCopilotPage = lazy(() => import('./pages/AiCopilot'));
const DailyOperationsWorkbench = lazy(() => import('./pages/DailyOperationsWorkbench'));

const APP_VERSION = 'v1.54.0';

// --- Navigation items ---
const NAV_ITEMS = [
  { key: 'operations', icon: <CalendarOutlined /> },
  { key: 'dashboard', icon: <DashboardOutlined /> },
  { key: 'products', icon: <InboxOutlined /> },
  { key: 'forecasts', icon: <BarChartOutlined /> },
  { key: 'capacity', icon: <CloudOutlined /> },
  { key: 'parameters', icon: <SettingOutlined /> },
  { key: 'bp-targets', icon: <DollarOutlined /> },
  { key: 'results', icon: <CalculatorOutlined /> },
  { key: 'scenario', icon: <ExperimentOutlined /> },
  { key: 'copilot', icon: <RobotOutlined /> },
];

// --- Top Navigation Bar ---
const TopNav: React.FC<{
  current: string;
  onNavClick: (key: string) => void;
  user: User;
  onLogout: () => void;
}> = ({ current, onNavClick, user, onLogout }) => {
  const { t, lang, setLang } = useI18n();
  const { prefs, setCurrency } = useAppPrefs();

  const pageTitles: Record<string, string> = useMemo(() => ({
    operations: t('menu.operations'),
    dashboard: t('menu.dashboard'),
    products: t('menu.products'),
    'products-sheet-lab': t('menu.productsSheet'),
    forecasts: t('menu.forecasts'),
    'forecasts-lab': t('menu.forecastsLab'),
    capacity: t('menu.capacity'),
    'capacity-lab': t('menu.capacityLab'),
    parameters: t('menu.parameters'),
    'bp-targets': t('menu.bpTargets'),
    results: t('menu.results'),
    scenario: t('menu.scenario'),
    copilot: t('menu.copilot'),
  }), [t]);

  // Mobile menu items for dropdown
  const mobileMenuItems = NAV_ITEMS.map(item => ({
    key: item.key,
    icon: item.icon,
    label: pageTitles[item.key] || item.key,
    onClick: () => onNavClick(item.key),
  }));

  return (
    <div className="twk-topbar">
      {/* Brand */}
      <div className="twk-brand">
        <span className="twk-brand-logo">{t('app.abbrev')}</span>
        <span className="twk-brand-tag">{APP_VERSION}</span>
      </div>

      {/* Desktop Nav Tabs */}
      <nav className="twk-nav-tabs">
        {NAV_ITEMS.map(item => (
          <button
            key={item.key}
            className={`twk-nav-item ${current === item.key ? 'twk-nav-item-active' : ''}`}
            onClick={() => onNavClick(item.key)}
          >
            {item.icon}
            <span>{pageTitles[item.key] || item.key}</span>
          </button>
        ))}
      </nav>

      {/* Mobile hamburger */}
      <div className="twk-mobile-menu" style={{ display: 'none' }}>
        <Dropdown menu={{ items: mobileMenuItems }} trigger={['click']}>
          <Button type="text" icon={<MenuOutlined />} />
        </Dropdown>
      </div>

      {/* User bar */}
      <div className="twk-userbar">
        <WorkspaceSwitcher />
        <Space size={4}>
          <GlobalOutlined style={{ fontSize: 12, color: '#71717a' }} />
          <Radio.Group
            value={lang}
            onChange={(e) => setLang(e.target.value as Language)}
            size="small"
            buttonStyle="solid"
          >
            <Radio.Button value="en" style={{ fontSize: 11 }}>EN</Radio.Button>
            <Radio.Button value="zh-TW" style={{ fontSize: 11 }}>繁中</Radio.Button>
          </Radio.Group>
        </Space>
        <Space size={4}>
          <DollarOutlined style={{ fontSize: 12, color: '#71717a' }} />
          <Radio.Group
            value={prefs.displayCurrency}
            onChange={(e) => setCurrency(e.target.value as DisplayCurrency)}
            size="small"
            buttonStyle="solid"
          >
            <Radio.Button value="USD" style={{ fontSize: 11 }}>USD</Radio.Button>
            <Radio.Button value="TWD" style={{ fontSize: 11 }}>TWD</Radio.Button>
            <Radio.Button value="CNY" style={{ fontSize: 11 }}>CNY</Radio.Button>
          </Radio.Group>
        </Space>
        <span className="twk-userbar-email">{user.email}</span>
        <button className="twk-userbar-logout" onClick={onLogout}>
          <LogoutOutlined style={{ fontSize: 11 }} />
          {t('header.logout')}
        </button>
      </div>
    </div>
  );
};

// --- Main App Content ---
const AppContent: React.FC<{ user: User }> = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  const scope = useActiveScope();

  const current = useMemo(() => {
    const path = location.pathname.replace(/^\//, '');
    const validKeys = ['operations', 'dashboard', 'products', 'products-sheet-lab', 'forecasts', 'forecasts-lab', 'capacity', 'capacity-lab', 'parameters', 'bp-targets', 'results', 'scenario', 'copilot'];
    return validKeys.includes(path) ? path : 'dashboard';
  }, [location.pathname]);

  const handleNavClick = useCallback((key: string) => {
    navigate(`/${key}`);
  }, [navigate]);

  const handleLogout = useCallback(async () => {
    await signOutUser();
  }, []);

  const routeKey = scope.mode === 'workspace' ? `ws:${scope.workspaceId}` : `user:${scope.userId}`;

  return (
    <div className="twk-shell">
      <TopNav
        current={current}
        onNavClick={handleNavClick}
        user={user}
        onLogout={handleLogout}
      />
      <main className="twk-main">
        <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/operations" element={<DailyOperationsWorkbench key={routeKey} scope={scope} />} />
            <Route path="/dashboard" element={<DashboardPage key={routeKey} scope={scope} />} />
            <Route path="/products" element={<ProductsPage key={routeKey} scope={scope} />} />
            <Route path="/products-sheet-lab" element={<ProductsSpreadsheetLab key={routeKey} scope={scope} />} />
            <Route path="/forecasts" element={<ForecastsPage key={routeKey} scope={scope} />} />
            <Route path="/forecasts-lab" element={<ForecastsSpreadsheetLab key={routeKey} scope={scope} />} />
            <Route path="/capacity" element={<CapacityPlanPage key={routeKey} scope={scope} />} />
            <Route path="/capacity-lab" element={<CapacitySpreadsheetPage key={routeKey} scope={scope} />} />
            <Route path="/parameters" element={<ParametersPage key={routeKey} scope={scope} />} />
            <Route path="/bp-targets" element={<BpTargetsPage key={routeKey} scope={scope} />} />
            <Route path="/results" element={<CalculationResultsPage key={routeKey} scope={scope} />} />
            <Route path="/scenario" element={<ScenarioPlanningPage key={routeKey} scope={scope} />} />
            <Route path="/copilot" element={<AiCopilotPage key={routeKey} scope={scope} />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </main>
      <footer style={{
        textAlign: 'center',
        padding: '12px 16px',
        color: '#a1a1aa',
        fontSize: 11,
        borderTop: '1px solid #eeeeee',
        background: '#ffffff',
      }}>
        {t('app.title')} · {APP_VERSION}
      </footer>
    </div>
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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#fafafa' }}>
        <Spin size="large" />
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
    <ConfigProvider theme={tweakcnAntdTheme}>
      <AppPrefsProvider>
        <I18nProvider>
          <LocaleBridge />
        </I18nProvider>
      </AppPrefsProvider>
    </ConfigProvider>
  );
};

const LocaleBridge: React.FC = () => {
  const { lang } = useI18n();
  const antdLocale = useMemo(() => (lang === 'zh-TW' ? zhTW : enUS), [lang]);
  return (
    <ConfigProvider theme={tweakcnAntdTheme} locale={antdLocale}>
      <AuthRouter />
    </ConfigProvider>
  );
};

export default App;
