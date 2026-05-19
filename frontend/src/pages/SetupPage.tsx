import React from 'react';
import { Result, Typography, Alert } from 'antd';
import { WarningOutlined } from '@ant-design/icons';

const { Paragraph, Text } = Typography;

const SetupPage: React.FC = () => {
  return (
    <div style={{ maxWidth: 800, margin: '80px auto', padding: 24 }}>
      <Result
        icon={<WarningOutlined />}
        title="Firebase Configuration Required"
        subTitle="This app requires Firebase credentials to run. Please set up your Firebase project."
      />
      <Alert
        type="info"
        message="Setup Steps"
        description={
          <div>
            <Paragraph>
              <Text strong>1.</Text> Create a Firebase project at{' '}
              <a href="https://console.firebase.google.com" target="_blank">
                console.firebase.google.com
              </a>
            </Paragraph>
            <Paragraph>
              <Text strong>2.</Text> Enable Authentication with Google sign-in
            </Paragraph>
            <Paragraph>
              <Text strong>3.</Text> Enable Firestore Database
            </Paragraph>
            <Paragraph>
              <Text strong>4.</Text> Enable Firebase Hosting
            </Paragraph>
            <Paragraph>
              <Text strong>5.</Text> Copy your web app config and create a{' '}
              <Text code>.env.local</Text> file:
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
              <Text strong>6.</Text> Run <Text code>npm install</Text> then <Text code>npm run dev</Text>
            </Paragraph>
          </div>
        }
        showIcon
      />
    </div>
  );
};

export default SetupPage;
