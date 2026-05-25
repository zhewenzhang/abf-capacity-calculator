import React, { useState } from 'react';
import { Button, Card, Typography, Alert } from 'antd';
import { GoogleOutlined } from '@ant-design/icons';
import { signInWithGoogle } from '../firebase/auth';
import { useI18n } from '../i18n';

const { Title } = Typography;

const LoginPage: React.FC = () => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (e: any) {
      setError(e.message || t('login.loading'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="abf-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f2f5' }}>
      <Card style={{ width: 400, textAlign: 'center' }}>
        <Title level={3}>{t('app.title')}</Title>
        <p style={{ color: '#666', marginBottom: 24 }}>{t('login.subtitle')}</p>
        {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}
        <Button
          type="primary"
          size="large"
          icon={<GoogleOutlined />}
          onClick={handleGoogleLogin}
          loading={loading}
          block
        >
          {t('login.google')}
        </Button>
      </Card>
    </div>
  );
};

export default LoginPage;
