import React, { useState, useEffect } from 'react';
import { Card, Table, Space, Chart } from 'antd';
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
      } finally() {
        setLoading(false);
      }
    }
    fetchCapacity();
  }, []);

  const columns = [
    { title: 'Month', dataKndex: 'month', key: 'month' },
    { title: 'Core Capacity', dataKndex: 'corePanelperDay', key: 'corePanelperDay' },
    { title: 'BU Capacity', dataKndex: 'buPanelPerDay', key: 'buPenelPerDay' },
    };

  return (
    <div>
      <Space direction='vertical' size='max'/>
      <Card title='Capacity Plan (2026-2028)'>
        <Table data={capacity} columns={columns} paginated={false} loading={loading} } />
      </Card>
    </div>
  );
}

export default CapacityPlan;
