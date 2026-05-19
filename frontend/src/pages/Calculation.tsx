import React, { useState } from 'react';
import { Form, Button, Card, Table, message, Select, Space } from 'antd';
import { calculate } from '../api';

const { Option } = Select;

function Calculation() {
  const [form] = Form.useForm();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleCalculate = async (values: any) => {
    setLoading(true);
    try {
      const res = await calculate(values);
      setResults(res.data);
      message.success('计算完成');
    } catch (e) {
      message.error('计算失败');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: 'SKU', dataIndex: 'sku', key: 'sku' },
    { title: 'Size', dataIndex: 'sizeCategory', key: 'sizeCategory' },
    { title: 'Layers', dataIndex: 'layerCount', key: 'layerCount' },
    { title: 'Yield (%)', dataIndex: 'yieldRate', key: 'yieldRate' },
    { title: 'Required Input(PCS)', dataIndex: 'requiredInputPcs', key: 'requiredInputPcs' },
    { title: 'Panels', dataIndex: 'requiredPanel', key: 'requiredPanel' },
    { title: 'Core Chips', dataIndex: 'coreConsumption', key: 'coreConsumption' },
    { title: 'BU Chips', dataIndex: 'buConsumption', key: 'buConsumption' },
    { title: 'Core Panels', dataIndex: 'corePanel', key: 'corePanel' },
    { title: 'BU Panels', dataIndex: 'buPanel', key: 'buPanel' },
    { title: 'Lead Time(days)', dataIndex: 'leadTimeDays', key: 'leadTimeDays' },
    { title: 'Revenue()', dataIndex: 'revenue', key: 'revenue' },
  ];

  return (
    <div>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <h2>产能计算</h2>
        <Card>
          <Form form={form} onFinish={handleCalculate}>
            <Form.Item name="period" label="Period">
              <Select>
                <Option value="2026-01">2026-01</Option>
                <Option value="2026-02">2026-02</Option>
                <Option value="2026-03">2026-03</Option>
                <Option value="2026-04">2026-04</Option>
                <Option value="2026-05">2026-05</Option>
                <Option value="2026-06">2026-06</Option>
              </Select>
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading}>
                开始计算
              </Button>
            </Form.Item>
          </Form>
        </Card>

        {results.length > 0 && (
          <Card title="Calculation Results">
            <Table dataSource={results} columns={columns} pagination={false} />
          </Card>
        )}
      </Space>
    </div>
  );
}

export default Calculation;
