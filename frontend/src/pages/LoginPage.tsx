import React, { useState } from 'react';
import { Button, Card, Typography, Alert } from 'antd';
import { GoogleOutlined } from '@ant-design/icons';
import { signInWithGoogle } from '../firebase/auth';

const { Title } = Typography;

const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (e: any) {
      setError(e.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f2f5' }}>
      <Card style={{ width: 400, textAlign: 'center' }}>
        <Title level={3}>ABF Capacity Calculator</Title>
        <p style={{ color: '#666', marginBottom: 24 }}>Sign in to manage your capacity calculations</p>
        {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}
        <Button
          type="primary"
          size="large"
          icon={<GoogleOutlined />}
          onClick={handleGoogleLogin}
          loading={loading}
          block
        >
          Sign in with Google
        </Button>
      </Card>
    </div>
  );
};

export default LoginPage;
