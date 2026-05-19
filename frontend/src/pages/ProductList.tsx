import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Card, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { getProducts } from '../api';

function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await getProducts();
        setProducts(res.data);
      } catch (e) {
        message.error('获取产品列表失败');
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  const columns = [
    { title: 'SKU', dataIndex: 'skuCode', key: 'skuCode' },
    { title: 'Customer', dataIndex: 'customer', key: 'customer' },
    { title: 'Device', dataIndex: 'deviceName', key: 'deviceName' },
    { title: 'Osat', dataIndex: 'osat', key: 'osat' },
    { title: 'Application', dataIndex: 'application', key: 'application' },
    { title: 'Grade', dataIndex: 'productGrade', key: 'productGrade' },
    { title: 'Unit Price()', dataIndex: 'unitPrice', key: 'unitPrice' },
  ];

  return (
    <div>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card
          title="Product List"
          extra={
            <Button type="primary" onClick={() => navigate('/products/new')}>
              新建产品
            </Button>
          }
        >
          <Table dataSource={products} columns={columns} pagination={false} loading={loading} />
        </Card>
      </Space>
    </div>
  );
}

export default ProductList;
