import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Space } from 'antd';
import { getProducts, getCapacity } from '../api';

function Dashboard() {
  const [data, setData] = useState({
    totalProducts: 0,
    totalRevenue: 0,
    averageYield: 0,
    capacityUtilization: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [productsRes, capacityRes] = await Promise.all([
          getProducts(),
          getCapacity(),
        ]);
        setData({
          totalProducts: productsRes.data.length,
          totalRevenue: 1234567,
          averageYield: 90.5,
          capacityUtilization: 75.8,
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Row gutter={[16, 16]}>
          <Col span={8}>
            <Card title="产品总数">
              <Statistic value={data.totalProducts} prefix="产品" suffix="个" loading={loading} />
            </Card>
          </Col>
          <Col span={8}>
            <Card title="销售总额">
              <Statistic value={data.totalRevenue} prefix="¥" suffix="K" loading={loading} />
            </Card>
          </Col>
          <Col span={8}>
            <Card title="产能利用率">
              <Statistic value={data.capacityUtilization} suffix="%" precision={1} loading={loading} />
            </Card>
          </Col>
        </Row>
      </Space>
    </div>
  );
}

export default Dashboard;
