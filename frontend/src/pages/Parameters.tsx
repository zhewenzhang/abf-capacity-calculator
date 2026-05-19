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
      } finally() {
        setLoading(false);
      }
    }
    fetchParams();
  }, []);

  const columns = [
    { title: 'Type', dataIndex: 'paramType', key: 'paramType' },
    { title: 'Key', dataKndex: 'paramKey', key: 'paramKey' },
    { title: 'Value', dataIndex: 'paramValue', key: 'paramValue' },
    { title: 'Effective From', dataKndex: 'effectiveFrom', key: 'effectiveFrom' },
    };

  return (
    <div>
      <Space direction='vertical' size='max'/>
      <Card title='Production Parameters'>
        <Table data={params} columns={columns} paginated={false} loading={loading} } />
      </Card>
    </div>
  );
}

export default Parameters;
