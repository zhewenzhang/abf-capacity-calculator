import React, { lazy, Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ConfigProvider, Spin, Space, Radio, Dropdown, Avatar } from 'antd';
import {
  InboxOutlined,
  BarChartOutlined,
  SettingOutlined,
  LogoutOutlined,
  CloudOutlined,
  CalculatorOutlined,
  ExperimentOutlined,
  DollarOutlined,
  RobotOutlined,
  CalendarOutlined,
  MoreOutlined,
  UserOutlined,
  CopyOutlined,
  CheckOutlined,
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

const APP_VERSION = 'v1.56.8';

// --- High-frequency nav items (always visible) ---
// Note: /dashboard redirects to /operations (consolidated in v1.56)
const PRIMARY_NAV = [
  { key: 'operations', icon: <CalendarOutlined /> },
  { key: 'products', icon: <InboxOutlined /> },
  { key: 'forecasts', icon: <BarChartOutlined /> },
  { key: 'capacity', icon: <CloudOutlined /> },
  { key: 'results', icon: <CalculatorOutlined /> },
  { key: 'copilot', icon: <RobotOutlined /> },
];

// --- Low-frequency nav items (in "More" dropdown) ---
const MORE_NAV = [
  { key: 'parameters', icon: <SettingOutlined /> },
  { key: 'bp-targets', icon: <DollarOutlined /> },
  { key: 'scenario', icon: <ExperimentOutlined /> },
  { key: 'products-sheet-lab', icon: <ExperimentOutlined /> },
  { key: 'forecasts-lab', icon: <ExperimentOutlined /> },
  { key: 'capacity-lab', icon: <ExperimentOutlined /> },
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
  const scope = useActiveScope();
  const [copied, setCopied] = useState(false);

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

  // "More" dropdown items
  const moreMenuItems = MORE_NAV.map(item => ({
    key: item.key,
    icon: item.icon,
    label: pageTitles[item.key] || item.key,
    onClick: () => onNavClick(item.key),
  }));

  // Copy UID to clipboard
  const handleCopyUid = useCallback(() => {
    navigator.clipboard.writeText(user.uid).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  }, [user.uid]);

  // Check if a "More" item is currently active
  const moreActive = MORE_NAV.some(item => item.key === current);

  // User menu items
  const userMenuItems = [
    {
      key: 'email',
      label: <span style={{ fontSize: 12, color: '#6b6b6b' }}>{user.email}</span>,
      disabled: true,
    },
    {
      key: 'workspace',
      label: <WorkspaceSwitcher />,
    },
    {
      key: 'role',
      label: (
        <Space size={8}>
          <span style={{ fontSize: 12, color: '#6b6b6b' }}>Role</span>
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            padding: '1px 8px',
            borderRadius: 999,
            background: scope.role === 'owner' ? '#f0fdf4' : scope.role === 'editor' ? '#eff6ff' : '#f7f7f7',
            color: scope.role === 'owner' ? '#15803d' : scope.role === 'editor' ? '#1d4ed8' : '#6b6b6b',
          }}>
            {scope.role}
          </span>
        </Space>
      ),
      disabled: true,
    },
    {
      key: 'uid',
      label: (
        <Space size={8} style={{ cursor: 'pointer' }} onClick={handleCopyUid}>
          <span style={{ fontSize: 12, color: '#6b6b6b' }}>UID</span>
          <span style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: '#a3a3a3' }}>
            {user.uid.slice(0, 8)}…
          </span>
          {copied ? <CheckOutlined style={{ fontSize: 11, color: '#4ade80' }} /> : <CopyOutlined style={{ fontSize: 11, color: '#a3a3a3' }} />}
        </Space>
      ),
    },
    { type: 'divider' as const },
    {
      key: 'logout',
      icon: <LogoutOutlined style={{ fontSize: 12 }} />,
      label: t('header.logout'),
      danger: true,
      onClick: onLogout,
    },
  ];

  return (
    <div className="twk-topbar">
      {/* Brand */}
      <div className="twk-brand">
        <span className="twk-brand-logo">ABF CSS</span>
        <span className="twk-brand-tag">{APP_VERSION}</span>
      </div>

      {/* Desktop Nav Tabs */}
      <nav className="twk-nav-tabs">
        {PRIMARY_NAV.map(item => (
          <button
            key={item.key}
            className={`twk-nav-item ${current === item.key ? 'twk-nav-item-active' : ''}`}
            onClick={() => onNavClick(item.key)}
          >
            {item.icon}
            <span>{pageTitles[item.key] || item.key}</span>
          </button>
        ))}
        {/* "More" dropdown for low-frequency items */}
        <Dropdown menu={{ items: moreMenuItems }} trigger={['click']}>
          <button className={`twk-nav-item ${moreActive ? 'twk-nav-item-active' : ''}`}>
            <MoreOutlined />
            <span>{t('common.more') || 'More'}</span>
          </button>
        </Dropdown>
      </nav>

      {/* Right side: compact controls + user menu */}
      <div className="twk-userbar">
        {/* Language — compact */}
        <Radio.Group
          value={lang}
          onChange={(e) => setLang(e.target.value as Language)}
          size="small"
          buttonStyle="solid"
        >
          <Radio.Button value="en" style={{ fontSize: 10, padding: '0 6px' }}>EN</Radio.Button>
          <Radio.Button value="zh-TW" style={{ fontSize: 10, padding: '0 6px' }}>繁</Radio.Button>
        </Radio.Group>

        {/* Currency — compact */}
        <Radio.Group
          value={prefs.displayCurrency}
          onChange={(e) => setCurrency(e.target.value as DisplayCurrency)}
          size="small"
          buttonStyle="solid"
        >
          <Radio.Button value="USD" style={{ fontSize: 10, padding: '0 6px' }}>$</Radio.Button>
          <Radio.Button value="TWD" style={{ fontSize: 10, padding: '0 6px' }}>NT</Radio.Button>
          <Radio.Button value="CNY" style={{ fontSize: 10, padding: '0 6px' }}>¥</Radio.Button>
        </Radio.Group>

        {/* User Menu */}
        <Dropdown menu={{ items: userMenuItems }} trigger={['click']} placement="bottomRight">
          <button style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 8px',
            borderRadius: 999,
            border: '1px solid var(--twk-border)',
            background: 'transparent',
            cursor: 'pointer',
            transition: 'all 0.15s',
            fontFamily: 'var(--font-sans)',
          }}>
            <Avatar size={22} icon={<UserOutlined />} style={{ background: '#f0fdf4', color: '#15803d' }} />
            <span style={{
              fontSize: 11,
              color: '#6b6b6b',
              maxWidth: 100,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {user.email?.split('@')[0]}
            </span>
          </button>
        </Dropdown>
      </div>
    </div>
  );
};

// --- Main App Content ---
const AppContent: React.FC<{ user: User }> = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();
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
        color: '#a3a3a3',
        fontSize: 11,
        borderTop: '1px solid var(--twk-border)',
        background: 'var(--twk-card)',
      }}>
        ABF CSS · {APP_VERSION}
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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#fcfcfc' }}>
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
