import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  InputNumber,
  Table,
  Button,
  Space,
  message,
  Alert,
  Popconfirm,
  Radio,
  Typography,
} from 'antd';
import { SaveOutlined, UndoOutlined } from '@ant-design/icons';
import { getParameters, saveParameters } from '../services/parameterService';
import type { ProjectParameters, SizeCategory, LayerBucket, ProjectScope } from '../types';
import { canEdit } from '../services/projectScope';
import WorkspaceSettingsPanel from '../components/workspace/WorkspaceSettingsPanel';
import { DEFAULT_YIELD_MATRIX, DEFAULT_PANEL_PARAMS, DEFAULT_WORKING_DAYS } from '../core/defaults';
import { useI18n } from '../i18n';
import { useAppPrefs } from '../context/AppPreferencesContext';
import { DEFAULT_CURRENCY_SETTINGS, type CurrencySettings, normalizeCurrencySettings } from '../core/currency';

const { Text } = Typography;

interface ParametersPageProps {
  scope: ProjectScope;
}

const SIZES: SizeCategory[] = ['small', 'medium', 'large', 'xlarge'];
const BUCKETS: LayerBucket[] = ['4-8L', '10-14L', '16-20L', '20L+'];

const ParametersPage: React.FC<ParametersPageProps> = ({ scope }) => {
  const writable = canEdit(scope.role);
  const { t } = useI18n();
  const { prefs, setCurrency } = useAppPrefs();
  const [params, setParams] = useState<ProjectParameters | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [currencySettings, setCurrencySettings] = useState<CurrencySettings>(DEFAULT_CURRENCY_SETTINGS);
  const [bpTargets, setBpTargets] = useState<Record<string, number>>({});

  const loadParams = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getParameters(scope);
      setParams(data);
      form.setFieldsValue({
        defaultWorkingDays: data.defaultWorkingDays || DEFAULT_WORKING_DAYS,
        panelLengthMm: data.panelParams.panelLengthMm,
        panelWidthMm: data.panelParams.panelWidthMm,
        marginLengthMm: data.panelParams.marginLengthMm,
        marginWidthMm: data.panelParams.marginWidthMm,
        toleranceMm: data.panelParams.toleranceMm,
      });
      const cs = data.currencySettings;
      if (cs) {
        setCurrencySettings(normalizeCurrencySettings({
          ...cs,
          displayCurrency: prefs.displayCurrency, // Use user preference
        }));
      }
      // Load BP targets
      const bp = data.bpTargets;
      if (bp?.yearlyRevenueTargetsMillionTwd) {
        setBpTargets({ ...bp.yearlyRevenueTargetsMillionTwd });
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load parameters');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadParams();
  }, [scope]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const panelValues = form.getFieldsValue();
      if (!params) return;
      const updated: ProjectParameters = {
        defaultWorkingDays: panelValues.defaultWorkingDays || DEFAULT_WORKING_DAYS,
        yieldMatrix: params.yieldMatrix,
        panelParams: {
          panelLengthMm: panelValues.panelLengthMm,
          panelWidthMm: panelValues.panelWidthMm,
          marginLengthMm: panelValues.marginLengthMm,
          marginWidthMm: panelValues.marginWidthMm,
          toleranceMm: panelValues.toleranceMm,
        },
        currencySettings,
        bpTargets: {
          mode: 'yearly' as const,
          yearlyRevenueTargetsMillionTwd: bpTargets,
        },
      };
      await saveParameters(scope, updated);
      message.success('Parameters saved');
      loadParams();
    } catch (e: any) {
      message.error(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreDefaults = async () => {
    const defaults: ProjectParameters = {
      defaultWorkingDays: DEFAULT_WORKING_DAYS,
      yieldMatrix: DEFAULT_YIELD_MATRIX,
      panelParams: DEFAULT_PANEL_PARAMS,
    };
    try {
      await saveParameters(scope, defaults);
      message.success('Defaults restored');
      loadParams();
    } catch (e: any) {
      message.error(e.message || 'Failed to restore');
    }
  };

  const handleYieldChange = (size: SizeCategory, bucket: LayerBucket, value: number | null) => {
    if (!params || value === null) return;
    const newMatrix = { ...params.yieldMatrix };
    newMatrix[size] = { ...newMatrix[size], [bucket]: value };
    setParams({ ...params, yieldMatrix: newMatrix });
  };

  const yieldColumns = [
    { title: 'Size', dataIndex: 'size', key: 'size', render: (v: string) => v.charAt(0).toUpperCase() + v.slice(1) },
    ...BUCKETS.map((bucket) => ({
      title: bucket,
      dataIndex: bucket,
      key: bucket,
      render: (value: number, record: any) => (
        <InputNumber
          min={0}
          max={1}
          step={0.01}
          precision={2}
          value={value}
          onChange={(v) => handleYieldChange(record.size as SizeCategory, bucket, v)}
          style={{ width: 80 }}
        />
      ),
    })),
  ];

  const yieldData = SIZES.map((size) => {
    const row: any = { size };
    for (const bucket of BUCKETS) {
      row[bucket] = params?.yieldMatrix[size][bucket] ?? 0;
    }
    return row;
  });

  if (loading) return <div>{t('common.loading')}</div>;

  const yearlyRateColumns = [
    {
      title: t('parameters.year'),
      dataIndex: 'year',
      key: 'year',
      width: 100,
    },
    {
      title: t('parameters.rate'),
      dataIndex: 'rate',
      key: 'rate',
      render: (value: number, record: { year: string }) => (
        <InputNumber
          min={0}
          step={0.1}
          precision={2}
          value={value}
          onChange={(v) => {
            if (v !== null) {
              setCurrencySettings((prev) => ({
                ...prev,
                yearlyUsdToTwdRates: { ...prev.yearlyUsdToTwdRates, [record.year]: v },
              }));
            }
          }}
          style={{ width: 100 }}
        />
      ),
    },
  ];

  const yearlyRateData = Object.entries(currencySettings.yearlyUsdToTwdRates)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, rate]) => ({ year, rate }));

  const yearlyCnyRateColumns = [
    {
      title: t('parameters.year'),
      dataIndex: 'year',
      key: 'year',
      width: 100,
    },
    {
      title: t('parameters.rate'),
      dataIndex: 'rate',
      key: 'rate',
      render: (value: number, record: { year: string }) => (
        <InputNumber
          min={0}
          step={0.1}
          precision={2}
          value={value}
          onChange={(v) => {
            if (v !== null) {
              setCurrencySettings((prev) => ({
                ...prev,
                yearlyUsdToCnyRates: { ...prev.yearlyUsdToCnyRates, [record.year]: v },
              }));
            }
          }}
          style={{ width: 100 }}
        />
      ),
    },
  ];

  const yearlyCnyRateData = Object.entries(currencySettings.yearlyUsdToCnyRates || {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, rate]) => ({ year, rate }));

  return (
    <div>
      {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}
      <WorkspaceSettingsPanel />
      {!writable && (
        <Alert message={t('common.readOnlyMode')} description={t('common.readOnlyDesc')} type="info" showIcon style={{ marginBottom: 16 }} />
      )}
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving} disabled={!writable}>
          {t('parameters.save')}
        </Button>
        <Popconfirm title={t('parameters.restore')} onConfirm={handleRestoreDefaults} disabled={!writable}>
          <Button icon={<UndoOutlined />} disabled={!writable}>{t('parameters.restore')}</Button>
        </Popconfirm>
      </Space>

      <Card title={t('parameters.yieldMatrix')} style={{ marginBottom: 16 }}>
        <Table
          columns={yieldColumns}
          dataSource={yieldData}
          rowKey="size"
          size="small"
          pagination={false}
        />
      </Card>

      <Card title={t('parameters.panelParams')} style={{ marginBottom: 16 }}>
        <Form form={form} layout="inline">
          <Form.Item name="defaultWorkingDays" label={t('parameters.workingDays')}>
            <InputNumber min={1} max={31} />
          </Form.Item>
          <Form.Item name="panelLengthMm" label={t('parameters.panelLength')}>
            <InputNumber min={0} step={0.1} precision={1} />
          </Form.Item>
          <Form.Item name="panelWidthMm" label={t('parameters.panelWidth')}>
            <InputNumber min={0} step={0.1} precision={1} />
          </Form.Item>
          <Form.Item name="marginLengthMm" label={t('parameters.marginLength')}>
            <InputNumber min={0} step={0.1} precision={1} />
          </Form.Item>
          <Form.Item name="marginWidthMm" label={t('parameters.marginWidth')}>
            <InputNumber min={0} step={0.1} precision={1} />
          </Form.Item>
          <Form.Item name="toleranceMm" label={t('parameters.tolerance')}>
            <InputNumber min={0} step={0.01} precision={2} />
          </Form.Item>
        </Form>
      </Card>

      <Card title={t('parameters.currencySettings')} style={{ marginBottom: 16 }}>
        <Form layout="inline">
          <Form.Item label={t('parameters.baseCurrency')}>
            <span style={{ lineHeight: '32px' }}>USD</span>
          </Form.Item>
          <Form.Item label={t('parameters.displayCurrency')}>
            <Radio.Group
              value={currencySettings.displayCurrency}
              onChange={(e) => {
                const newCurrency = e.target.value as any;
                setCurrencySettings((prev) => ({ ...prev, displayCurrency: newCurrency }));
                setCurrency(newCurrency); // Sync with app preferences
              }}
            >
              <Radio.Button value="USD">USD</Radio.Button>
              <Radio.Button value="TWD">TWD</Radio.Button>
              <Radio.Button value="CNY">CNY</Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Form.Item label={t('parameters.exchangeRateMode')}>
            <Radio.Group
              value={currencySettings.exchangeRateMode}
              onChange={(e) =>
                setCurrencySettings((prev) => ({ ...prev, exchangeRateMode: e.target.value }))
              }
            >
              <Radio.Button value="constant">{t('parameters.constantRate')}</Radio.Button>
              <Radio.Button value="yearly">{t('parameters.yearlyRate')}</Radio.Button>
            </Radio.Group>
          </Form.Item>
          {currencySettings.exchangeRateMode === 'constant' && (
            <>
              <Form.Item label={t('parameters.usdToTwd')}>
                <InputNumber
                  min={0}
                  step={0.1}
                  precision={2}
                  value={currencySettings.constantUsdToTwdRate}
                  onChange={(v) =>
                    setCurrencySettings((prev) => ({
                      ...prev,
                      constantUsdToTwdRate: v ?? prev.constantUsdToTwdRate,
                    }))
                  }
                />
              </Form.Item>
              <Form.Item label={t('parameters.usdToCny')}>
                <InputNumber
                  min={0}
                  step={0.1}
                  precision={2}
                  value={currencySettings.constantUsdToCnyRate}
                  onChange={(v) =>
                    setCurrencySettings((prev) => ({
                      ...prev,
                      constantUsdToCnyRate: v ?? prev.constantUsdToCnyRate,
                    }))
                  }
                />
              </Form.Item>
            </>
          )}
          {currencySettings.exchangeRateMode === 'yearly' && (
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', width: '100%', marginTop: 12 }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>{t('parameters.usdToTwd')}</Typography.Text>
                <Table
                  columns={yearlyRateColumns}
                  dataSource={yearlyRateData}
                  rowKey="year"
                  size="small"
                  pagination={false}
                />
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>{t('parameters.usdToCny')}</Typography.Text>
                <Table
                  columns={yearlyCnyRateColumns}
                  dataSource={yearlyCnyRateData}
                  rowKey="year"
                  size="small"
                  pagination={false}
                />
              </div>
            </div>
          )}
        </Form>
      </Card>

      {/* BP Targets Section */}
      <Card title={t('parameters.bpTargets')} style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text type="secondary">{t('parameters.bpTargetsNote')}</Text>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
            {Array.from({ length: 2041 - 2026 + 1 }, (_, i) => 2026 + i).map(year => (
              <div key={year} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Text style={{ minWidth: 40, fontSize: 13 }}>{year}</Text>
                <InputNumber
                  size="small"
                  min={0}
                  step={1}
                  precision={1}
                  style={{ width: 130 }}
                  placeholder={t('parameters.bpTargetPlaceholder')}
                  value={bpTargets[String(year)] ?? undefined}
                  onChange={(v) => {
                    setBpTargets(prev => ({
                      ...prev,
                      [String(year)]: v ?? 0,
                    }));
                  }}
                />
              </div>
            ))}
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default ParametersPage;
