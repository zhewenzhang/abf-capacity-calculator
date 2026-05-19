import React, { useState, useEffect } from 'react';
import { Card, Table, Space } from 'antd';
import { getParameters } from '../api';

function Parameters() {
  const [params, setParams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchParams() {
      try {
        const res = await getParameters();
        setParams(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchParams();
  }, []);

  const columns = [
    { title: 'Type', dataIndex: 'paramType', key: 'paramType' },
    { title: 'Key', dataIndex: 'paramKey', key: 'paramKey' },
    { title: 'Value', dataIndex: 'paramValue', key: 'paramValue' },
    { title: 'Effective From', dataIndex: 'effectiveFrom', key: 'effectiveFrom' },
  ];

  return (
    <div>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card title="Production Parameters">
          <Table dataSource={params} columns={columns} pagination={false} loading={loading} />
        </Card>
      </Space>
    </div>
  );
}

export default Parameters;
