import React, { useState, useEffect } from 'react';
import { Card, Table, Space } from 'antd';
import { getCapacity } from '../api';

function CapacityPlan() {
  const [capacity, setCapacity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCapacity() {
      try {
        const res = await getCapacity();
        setCapacity(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchCapacity();
  }, []);

  const columns = [
    { title: 'Month', dataIndex: 'month', key: 'month' },
    { title: 'Core Capacity', dataIndex: 'corePanelperDay', key: 'corePanelperDay' },
    { title: 'BU Capacity', dataIndex: 'buPanelPerDay', key: 'buPanelPerDay' },
  ];

  return (
    <div>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card title="Capacity Plan (2026-2028)">
          <Table dataSource={capacity} columns={columns} pagination={false} loading={loading} />
        </Card>
      </Space>
    </div>
  );
}

export default CapacityPlan;
