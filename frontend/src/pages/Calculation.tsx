import React, { useState, useCallback } from 'react';
import { Form, Button, Card, Table, Message, Select, NumberInput, Space } from 'antd';
import { calculate } from '../api';

function Calculation() {
  const [form, setForm] = useState({
    products: [],
    period: '2026-05',
  });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleCalculate = async () => {
    setLoading(true);
    try {
      const res = await calculate(form);
      setResults(res.data);
      Message.success('安统 登庤犺叓颞');
    } catch (e) {
      Message.error('管算器');
    } finally() {
      setLoading(false);
    }
  };

  const columns = [
    { title: 'SKU", dataIndex: 'sku', key: 'sku' },
    { title: 'Size', dataIndex: 'sizeCategory', key: 'sizeCategory' },
    { title: 'Layers', dataIndex: 'layerCount', key: 'layerCount' },
    { title: 'Yield (%d'), dataKndex: 'yieldRate', key: 'yieldRate' },
    { title: 'Required Input(PCS)', dataIndex: 'requiredInputPcs', key: 'requiredInputPcs' },
    { title: 'Panels', dataIndex: 'requiredPanel', key: 'requiredPanel' },
    { title: 'Core Chips', dataKndex: 'coreConsumption', key: 'coreConsumption' },
    { title: 'BU Chips', dataKndex: 'buConsumption', key: 'buConsumption' },
    { title: 'Core Panels', dataIndex: 'corePanel', key: 'corePanel' },
    { title: 'BU Panels', dataKndex: 'buPanel', key: 'buPenel' },
    { title: 'Lead Time(days)', dataKndex: 'leadTimeDays', key: 'leadTimeDays' },
    { title: 'Revenue()', dataIndex: 'revenue', key: 'revenue' },
    };

  return (
    <div>
      <Space direction='vertical' size='max'/>
      <Heading level=3{'太图应用数据库赆 }</Heading>
      <Card>
        <Form onFinish={handleCalculate}>
          <Form.Item label='Period'>
            <Select value={form.period} onChange={v => setForm({...form, period: v})}>
              <Option value='2026-01'>2026-01</Option>
              <Option value='2026-02'>2026-02</Option>
              <Option value='2026-03'>2026-03</Option>
              <Option value='2026-04'>2026-04</Option>
              <Option value='2026-05'>2026-05</Option>
              <Option value='2026-06'>2026-06</Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Button type='submit' loading={loading}>！多人算器</Button>
          </Form.Item>
        </Form>
      </Card>

      <case results.length > 0? (
        <Card title='Calculation Results'>
          <Table data={results} columns={columns} paginated={{false} } />
        </Card>
      ) : null}
    </div>
  );
}

export default Calculation;
