import React from 'react';
import { Result, Typography, Alert } from 'antd';
import { WarningOutlined } from '@ant-design/icons';
import { useI18n } from '../i18n';

const { Paragraph, Text } = Typography;

const SetupPage: React.FC = () => {
  const { t } = useI18n();

  return (
    <div style={{ maxWidth: 800, margin: '80px auto', padding: 24 }}>
      <Result
        icon={<WarningOutlined />}
        title={t('setup.title')}
        subTitle={t('setup.subTitle')}
      />
      <Alert
        type="info"
        message={t('setup.steps')}
        description={
          <div>
            <Paragraph>
              <Text strong>{t('setup.step1')}</Text>
            </Paragraph>
            <Paragraph>
              <Text strong>{t('setup.step2')}</Text>
            </Paragraph>
            <Paragraph>
              <Text strong>{t('setup.step3')}</Text>
            </Paragraph>
            <Paragraph>
              <Text strong>{t('setup.step4')}</Text>
            </Paragraph>
            <Paragraph>
              <Text strong>{t('setup.step5')}</Text>
            </Paragraph>
            <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 4 }}>
              {`VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id`}
            </pre>
            <Paragraph>
              <Text strong>{t('setup.step6')}</Text>
            </Paragraph>
          </div>
        }
        showIcon
      />
    </div>
  );
};

export default SetupPage;
