import React from 'react';
import { Card, Row, Col, Button, Space, Typography, Select, InputNumber } from 'antd';
import { ShoppingOutlined, TeamOutlined, BarChartOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { useI18n } from '../i18n';

const { Text } = Typography;

interface ScenarioTemplatesProps {
  customerList: string[];
  skuCodeList: string[];
  availableMonths: string[];
  delayStartMonth: string | undefined;
  delayMonths: number;
  delayRatio: number;
  lossCustomer: string | undefined;
  surgeTargetType: 'all' | 'customer' | 'sku';
  surgeTargetValue: string | undefined;
  surgePercent: number;
  templateLoading: string | null;
  // v1.64 — graduated churn params
  churnStartMonth: string | undefined;
  churnMonths: number;
  churnRatio: number;
  churnScope: 'all' | 'sku';
  churnSkuCode: string | undefined;
  onDelayStartMonthChange: (v: string | undefined) => void;
  onDelayMonthsChange: (v: number | null) => void;
  onDelayRatioChange: (v: number | null) => void;
  onLossCustomerChange: (v: string | undefined) => void;
  // v1.64 — churn handlers
  onChurnStartMonthChange: (v: string | undefined) => void;
  onChurnMonthsChange: (v: number | null) => void;
  onChurnRatioChange: (v: number | null) => void;
  onChurnScopeChange: (v: 'all' | 'sku') => void;
  onChurnSkuCodeChange: (v: string | undefined) => void;
  onSurgeTargetTypeChange: (v: 'all' | 'customer' | 'sku') => void;
  onSurgeTargetValueChange: (v: string | undefined) => void;
  onSurgePercentChange: (v: number | null) => void;
  onRunTemplate: (type: 'capacityDelay' | 'orderDisappearance' | 'forecastAdjustment') => void;
}

const ScenarioTemplates: React.FC<ScenarioTemplatesProps> = (p) => {
  const { t } = useI18n();

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} md={8}>
        <Card title={<Space><ShoppingOutlined /><Text strong>{t('scenario.templates.buCapacityDelay')}</Text></Space>}
          style={{ borderRadius: 16, border: '1px solid #e8e8e8', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', height: '100%' }}>
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>{t('scenario.templates.buCapacityDelay.desc')}</Text>
            <div>
              <Text style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>{t('scenario.templates.startMonth')}</Text>
              <Select size="small" style={{ width: '100%' }} placeholder={t('scenario.templates.startMonth')} allowClear
                value={p.delayStartMonth} onChange={p.onDelayStartMonthChange}
                options={p.availableMonths.map(m => ({ label: m, value: m }))} />
            </div>
            <div>
              <Text style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>{t('scenario.templates.delayMonths')}</Text>
              <InputNumber size="small" min={1} max={12} value={p.delayMonths}
                onChange={p.onDelayMonthsChange} style={{ width: '100%' }} />
            </div>
            <div>
              <Text style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>{t('scenario.templates.delayRatio')}</Text>
              <InputNumber size="small" min={0} max={100} value={p.delayRatio}
                onChange={p.onDelayRatioChange} addonAfter="%" style={{ width: '100%' }} />
            </div>
            <Button type="primary" size="small" block loading={p.templateLoading === 'capacityDelay'}
              onClick={() => p.onRunTemplate('capacityDelay')} icon={<PlayCircleOutlined />}>{t('scenario.templates.run')}</Button>
          </Space>
        </Card>
      </Col>
      <Col xs={24} md={8}>
        <Card title={<Space><TeamOutlined /><Text strong>{t('scenario.templates.customerLoss')}</Text></Space>}
          style={{ borderRadius: 16, border: '1px solid #e8e8e8', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', height: '100%' }}>
          <Space direction="vertical" size={10} style={{ width: '100%' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>{t('scenario.templates.customerLoss.desc')}</Text>
            <div>
              <Text style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>{t('scenario.templates.selectCustomer')}</Text>
              <Select size="small" style={{ width: '100%' }} placeholder={t('scenario.templates.selectCustomer')} allowClear
                value={p.lossCustomer} onChange={p.onLossCustomerChange}
                options={p.customerList.map(c => ({ label: c, value: c }))} />
            </div>
            <div>
              <Text style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>{t('scenario.templates.startMonth')}</Text>
              <Select size="small" style={{ width: '100%' }} placeholder={t('scenario.templates.startMonth')} allowClear
                value={p.churnStartMonth} onChange={p.onChurnStartMonthChange}
                options={p.availableMonths.map(m => ({ label: m, value: m }))} />
            </div>
            <div>
              <Text style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>{t('scenario.templates.churnRatio')}</Text>
              <InputNumber size="small" min={5} max={100} value={p.churnRatio}
                onChange={p.onChurnRatioChange} addonAfter="%" style={{ width: '100%' }} />
            </div>
            <div>
              <Text style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>{t('scenario.templates.churnMonths')}</Text>
              <InputNumber size="small" min={1} max={24} value={p.churnMonths}
                onChange={p.onChurnMonthsChange} style={{ width: '100%' }} />
            </div>
            <div>
              <Text style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>{t('scenario.templates.churnScope')}</Text>
              <Select size="small" style={{ width: '100%' }} value={p.churnScope}
                onChange={(v) => { p.onChurnScopeChange(v as 'all' | 'sku'); p.onChurnSkuCodeChange(undefined); }}
                options={[
                  { label: t('scenario.templates.churnScopeAll'), value: 'all' },
                  { label: t('scenario.templates.churnScopeSku'), value: 'sku' },
                ]} />
            </div>
            {p.churnScope === 'sku' && (
              <div>
                <Text style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>{t('scenario.templates.targetSku')}</Text>
                <Select size="small" style={{ width: '100%' }} placeholder={t('scenario.templates.targetSku')} allowClear
                  value={p.churnSkuCode} onChange={p.onChurnSkuCodeChange}
                  options={p.skuCodeList.map(c => ({ label: c, value: c }))} />
              </div>
            )}
            <Button type="primary" size="small" block loading={p.templateLoading === 'orderDisappearance'}
              onClick={() => p.onRunTemplate('orderDisappearance')} icon={<PlayCircleOutlined />}>{t('scenario.templates.run')}</Button>
          </Space>
        </Card>
      </Col>
      <Col xs={24} md={8}>
        <Card title={<Space><BarChartOutlined /><Text strong>{t('scenario.templates.forecastSurge')}</Text></Space>}
          style={{ borderRadius: 16, border: '1px solid #e8e8e8', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', height: '100%' }}>
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>{t('scenario.templates.forecastSurge.desc')}</Text>
            <div>
              <Text style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>{t('scenario.templates.selectTarget')}</Text>
              <Select size="small" style={{ width: '100%' }} value={p.surgeTargetType}
                onChange={(v) => { p.onSurgeTargetTypeChange(v); p.onSurgeTargetValueChange(undefined); }}
                options={[
                  { label: t('scenario.templates.targetAll'), value: 'all' },
                  { label: t('scenario.templates.targetCustomer'), value: 'customer' },
                  { label: t('scenario.templates.targetSku'), value: 'sku' },
                ]} />
            </div>
            {p.surgeTargetType === 'customer' && (
              <div>
                <Text style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>{t('scenario.templates.selectCustomer')}</Text>
                <Select size="small" style={{ width: '100%' }} placeholder={t('scenario.templates.selectCustomer')} allowClear
                  value={p.surgeTargetValue} onChange={p.onSurgeTargetValueChange}
                  options={p.customerList.map(c => ({ label: c, value: c }))} />
              </div>
            )}
            {p.surgeTargetType === 'sku' && (
              <div>
                <Text style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>{t('scenario.templates.targetSku')}</Text>
                <Select size="small" style={{ width: '100%' }} placeholder={t('scenario.templates.targetSku')} allowClear
                  value={p.surgeTargetValue} onChange={p.onSurgeTargetValueChange}
                  options={p.skuCodeList.map(c => ({ label: c, value: c }))} />
              </div>
            )}
            <div>
              <Text style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>{t('scenario.templates.surgePct')}</Text>
              <InputNumber size="small" min={5} max={100} value={p.surgePercent}
                onChange={p.onSurgePercentChange} addonAfter="%" style={{ width: '100%' }} />
            </div>
            <Button type="primary" size="small" block loading={p.templateLoading === 'forecastAdjustment'}
              onClick={() => p.onRunTemplate('forecastAdjustment')} icon={<PlayCircleOutlined />}>{t('scenario.templates.run')}</Button>
          </Space>
        </Card>
      </Col>
    </Row>
  );
};

export default ScenarioTemplates;
