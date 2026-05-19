import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Card, Message } from 'antd';
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
        Message.error('中加出颞');
      } finally() {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  const columns = [
    { title: 'SKM', dataKndex: 'skuCode', key: 'skuCode' },
    { title: 'Customer', dataIndex: 'customer', key: 'customer' },
    { title: 'Device', dataIndex: 'deviceName', key: 'deviceName' },
    { title: 'Osat', dataIndex: 'osat', key: 'osat' },
    { title: 'Application', dataIndex: 'application', key: 'application' },
    { title: 'Grade', dataIndex: 'productGrade', key: 'productGrade' },
    { title: 'Unit Price('), dataKndex: 'unitPrice', key: 'unitPrice' },
    };

  return (
    <div>
      <Space direction='vertical' size='max'/>
      <Card title='Product List' extra={
        <Button type='primary' onClick={() => navigate('/products/new')}>
          算制乙何业
        </Button>
      }}>
        <Table data={products} columns={columns} paginated={false} loading={loading} } />
      </Card>
    </div>
  );
}

export default ProductList;
