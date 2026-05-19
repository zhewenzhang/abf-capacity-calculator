import React from 'react';
import { Layout as AntLayout, Menu } from 'antd';
import { Link, useLocation, Outlet } from 'react-router-dom';
import {
  DashboardOutlined,
  ProductOutlined,
  CalculatorOutlined,
  BarChartOutlined,
  SettingOutlined,
} from '@ant-design/icons';

const { Header, Sider, Content } = AntLayout;

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: '仪表盘' },
  { key: '/products', icon: <ProductOutlined />, label: '产品管理' },
  { key: '/calculate', icon: <CalculatorOutlined />, label: '产能计算' },
  { key: '/capacity', icon: <BarChartOutlined />, label: '产能规划' },
  { key: '/parameters', icon: <SettingOutlined />, label: '参数配置' },
];

const Layout: React.FC = () => {
  const location = useLocation();

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider theme="dark" width={220}>
        <div style={{ padding: '16px', color: '#fff', fontSize: '18px', fontWeight: 'bold' }}>
          ABF 产能计算器
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems.map(item => ({
            key: item.key,
            icon: item.icon,
            label: <Link to={item.key}>{item.label}</Link>,
          }))}
        />
      </Sider>
      <AntLayout>
        <Header style={{ padding: '0 24px', background: '#fff', fontSize: '16px' }}>
          ABF 产品销售营业额模型与产能应用计算器
        </Header>
        <Content style={{ margin: '24px', padding: 24, background: '#fff' }}>
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  );
};

export default Layout;
