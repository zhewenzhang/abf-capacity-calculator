import React, { useState } from 'react';
import { Form, Input, Button, Select, Card, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { createProduct } from '../api';

const { Option } = Select;

const SizeCategory = ['small', 'medium', 'large', 'xlarge'];

function ProductCreate() {
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const submit = async (values: any) => {
    try {
      await createProduct(values);
      message.success('产品创建成功');
      navigate(-1);
    } catch (err) {
      message.error('产品创建失败');
    }
  };

  return (
    <Card title="新建 ABF 产品" style={{ maxWidth: 600 }}>
      <Form form={form} onFinish={submit} layout="vertical">
        <Form.Item name="skuCode" label="SKU Code" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="customer" label="Customer">
          <Input />
        </Form.Item>
        <Form.Item name="deviceName" label="Device">
          <Input />
        </Form.Item>
        <Form.Item name="osat" label="Osat">
          <Input />
        </Form.Item>
        <Form.Item name="application" label="Application">
          <Input />
        </Form.Item>
        <Form.Item name="productGrade" label="Grade">
          <Input />
        </Form.Item>
        <Form.Item name="sizeCategory" label="Size Category">
          <Select>
            {SizeCategory.map((cat) => (
              <Option key={cat} value={cat}>
                {cat}
              </Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item name="chipLength" label="Chip Length (mm)">
          <Input type="number" />
        </Form.Item>
        <Form.Item name="chipWidth" label="Chip Width (mm)">
          <Input type="number" />
        </Form.Item>
        <Form.Item name="layerCount" label="Layers" initialValue={2}>
          <Input type="number" />
        </Form.Item>
        <Form.Item name="unitPrice" label="Unit Price">
          <Input type="number" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit">
            创建产品
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}

export default ProductCreate;
