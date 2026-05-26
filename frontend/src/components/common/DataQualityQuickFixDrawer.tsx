/**
 * Data Quality Quick Fix Drawer for Products (SKU)
 *
 * v1.36.0 MVP - Quick Fix Entry Point for Products page
 *
 * This drawer allows users to quickly fix missing or invalid SKU attributes
 * directly from the Products page without navigating away.
 *
 * Features:
 * - Shows fields with DQ issues highlighted
 * - Validates input before saving
 * - Blocks Viewer role from editing
 * - Uses existing saveSku API
 * - Updates local state without page refresh
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Drawer,
  Form,
  InputNumber,
  Select,
  Button,
  Space,
  Alert,
  message,
  Typography,
  Divider,
  Tag,
} from 'antd';
import { SaveOutlined, WarningOutlined } from '@ant-design/icons';
import type { SKU, SizeCategory, CurrencyCode, ProjectScope } from '../../types';
import { canEdit } from '../../services/projectScope';
import { saveSKU } from '../../services/skuService';
import { useI18n } from '../../i18n';
import {
  validateUnitPrice,
  validateCurrency,
  validateLayerCount,
  validateSizeCategory,
  validateChipDimension,
} from '../../core/dataQualityRemediation';
import type { DataQualityIssue } from '../../core/dataQuality';

const { Text } = Typography;

interface SkuQuickFixDrawerProps {
  /** Whether the drawer is open */
  open: boolean;
  /** Callback when drawer is closed */
  onClose: () => void;
  /** The SKU being edited */
  sku: SKU | null;
  /** DQ issues affecting this SKU */
  issues: DataQualityIssue[];
  /** Project scope for API calls */
  scope: ProjectScope;
  /** Callback when SKU is successfully updated */
  onSuccess: (updatedSku: SKU) => void;
}

const SIZE_OPTIONS: { label: string; value: SizeCategory }[] = [
  { label: 'Small', value: 'small' },
  { label: 'Medium', value: 'medium' },
  { label: 'Large', value: 'large' },
  { label: 'XLarge', value: 'xlarge' },
];

const CURRENCY_OPTIONS: { label: string; value: CurrencyCode }[] = [
  { label: 'USD', value: 'USD' },
  { label: 'TWD (NTD)', value: 'TWD' },
  { label: 'CNY (RMB)', value: 'CNY' },
];

const APP_OPTIONS = [
  'Mobile', 'Server', 'AI/ML', 'GPU', 'Automotive', 'IoT', '5G', 'Consumer', 'Networking', 'Other',
].map(a => ({ label: a, value: a }));

/**
 * Determine which fields have issues based on DQ issues.
 */
function getFieldsWithIssues(issues: DataQualityIssue[]): Set<string> {
  const fields = new Set<string>();

  for (const issue of issues) {
    if (issue.id.startsWith('sku-missing-attr-')) {
      // Parse evidence to find missing attrs
      const attrs = issue.evidence?.missingAttrs;
      if (typeof attrs === 'string') {
        const attrList = attrs.split(',').map(a => a.trim());
        for (const attr of attrList) {
          fields.add(attr);
        }
      }
    }
    if (issue.id.startsWith('sku-zero-price-')) {
      fields.add('unitPrice');
    }
    if (issue.id.startsWith('sku-unsupported-currency-')) {
      fields.add('unitPriceCurrency');
    }
  }

  return fields;
}

export const SkuQuickFixDrawer: React.FC<SkuQuickFixDrawerProps> = ({
  open,
  onClose,
  sku,
  issues,
  scope,
  onSuccess,
}) => {
  const { t } = useI18n();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const writable = canEdit(scope.role);
  const fieldsWithIssues = useMemo(() => getFieldsWithIssues(issues), [issues]);

  // Initialize form when SKU changes
  useEffect(() => {
    if (sku && open) {
      form.setFieldsValue({
        unitPrice: sku.unitPrice,
        unitPriceCurrency: sku.unitPriceCurrency ?? 'USD',
        sizeCategory: sku.sizeCategory,
        layerCount: sku.layerCount,
        chipLengthMm: sku.chipLengthMm,
        chipWidthMm: sku.chipWidthMm,
        application: sku.application,
      });
      setValidationErrors({});
    }
  }, [sku, open, form]);

  // Focus first field with issue
  useEffect(() => {
    if (open && fieldsWithIssues.size > 0) {
      const firstField = Array.from(fieldsWithIssues)[0];
      setTimeout(() => {
        form.getFieldInstance(firstField)?.focus();
      }, 100);
    }
  }, [open, fieldsWithIssues, form]);

  const handleSave = async () => {
    if (!sku || !writable) return;

    try {
      const values = await form.validateFields();
      setValidationErrors({});

      // Custom validation
      const errors: Record<string, string> = {};

      const unitPriceResult = validateUnitPrice(values.unitPrice);
      if (!unitPriceResult.valid) errors.unitPrice = unitPriceResult.error!;

      const currencyResult = validateCurrency(values.unitPriceCurrency);
      if (!currencyResult.valid) errors.unitPriceCurrency = currencyResult.error!;

      const layerCountResult = validateLayerCount(values.layerCount);
      if (!layerCountResult.valid) errors.layerCount = layerCountResult.error!;

      const sizeCategoryResult = validateSizeCategory(values.sizeCategory);
      if (!sizeCategoryResult.valid) errors.sizeCategory = sizeCategoryResult.error!;

      if (values.chipLengthMm) {
        const chipLengthResult = validateChipDimension(values.chipLengthMm);
        if (!chipLengthResult.valid) errors.chipLengthMm = chipLengthResult.error!;
      }

      if (values.chipWidthMm) {
        const chipWidthResult = validateChipDimension(values.chipWidthMm);
        if (!chipWidthResult.valid) errors.chipWidthMm = chipWidthResult.error!;
      }

      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        return;
      }

      setSaving(true);

      // Calculate UPP if dimensions changed
      const chipLengthMm = values.chipLengthMm ?? sku.chipLengthMm;
      const chipWidthMm = values.chipWidthMm ?? sku.chipWidthMm;
      const PL = 244.1, PW = 246.2, ML = 10, MW = 5.3, T = 0.3;
      const nL1 = Math.floor((PL - ML + T) / (chipLengthMm + T));
      const nW1 = Math.floor((PW - MW + T) / (chipWidthMm + T));
      const nL2 = Math.floor((PL - ML + T) / (chipWidthMm + T));
      const nW2 = Math.floor((PW - MW + T) / (chipLengthMm + T));
      const upp = Math.max(nL1 * nW1 * 4, nL2 * nW2 * 4, 0);

      const updatedSku: SKU = {
        ...sku,
        unitPrice: values.unitPrice,
        unitPriceCurrency: values.unitPriceCurrency ?? 'USD',
        sizeCategory: values.sizeCategory,
        layerCount: values.layerCount,
        chipLengthMm: values.chipLengthMm ?? sku.chipLengthMm,
        chipWidthMm: values.chipWidthMm ?? sku.chipWidthMm,
        application: values.application ?? sku.application,
        upp,
      };

      await saveSKU(scope, updatedSku);
      message.success(t('remediation.sku.saved'));
      onSuccess(updatedSku);
      onClose();
    } catch (e: any) {
      message.error(e.message || t('remediation.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (saving) return;
    form.resetFields();
    setValidationErrors({});
    onClose();
  };

  if (!sku) return null;

  const title = (
    <Space>
      <span>{t('remediation.sku.title')}</span>
      <Tag color="blue">{sku.skuCode}</Tag>
    </Space>
  );

  return (
    <Drawer
      title={title}
      placement="right"
      width={400}
      open={open}
      onClose={handleClose}
      closable={!saving}
      maskClosable={!saving}
      footer={
        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
          <Button onClick={handleClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={saving}
            disabled={!writable}
          >
            {t('remediation.confirmFix')}
          </Button>
        </Space>
      }
    >
      {/* Viewer warning */}
      {!writable && (
        <Alert
          message={t('common.readOnlyMode')}
          description={t('remediation.viewerBlocked')}
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Issue summary */}
      {issues.length > 0 && (
        <Alert
          message={t('remediation.issuesFound', { count: issues.length })}
          description={
            <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
              {issues.slice(0, 3).map(issue => (
                <li key={issue.id}>
                  {t(issue.detailMessage.key, issue.detailMessage.params as Record<string, string | number>)}
                </li>
              ))}
            </ul>
          }
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Form form={form} layout="vertical" disabled={!writable || saving}>
        {/* Unit Price */}
        <Form.Item
          name="unitPrice"
          label={
            <Space>
              {t('products.unitPrice')}
              {fieldsWithIssues.has('unitPrice') && (
                <WarningOutlined style={{ color: '#ff4d4f' }} />
              )}
            </Space>
          }
          validateStatus={validationErrors.unitPrice ? 'error' : undefined}
          help={validationErrors.unitPrice ? t(validationErrors.unitPrice) : undefined}
        >
          <InputNumber
            min={0}
            step={0.01}
            precision={4}
            style={{ width: '100%' }}
            placeholder="0.00"
          />
        </Form.Item>

        {/* Currency */}
        <Form.Item
          name="unitPriceCurrency"
          label={
            <Space>
              {t('products.unitPriceCurrency')}
              {fieldsWithIssues.has('unitPriceCurrency') && (
                <WarningOutlined style={{ color: '#ff4d4f' }} />
              )}
            </Space>
          }
          validateStatus={validationErrors.unitPriceCurrency ? 'error' : undefined}
          help={validationErrors.unitPriceCurrency ? t(validationErrors.unitPriceCurrency) : undefined}
        >
          <Select options={CURRENCY_OPTIONS} placeholder="USD" />
        </Form.Item>

        {/* Size Category */}
        <Form.Item
          name="sizeCategory"
          label={
            <Space>
              {t('products.sizeCategory')}
              {fieldsWithIssues.has('sizeCategory') && (
                <WarningOutlined style={{ color: '#ff4d4f' }} />
              )}
            </Space>
          }
          validateStatus={validationErrors.sizeCategory ? 'error' : undefined}
          help={validationErrors.sizeCategory ? t(validationErrors.sizeCategory) : undefined}
        >
          <Select options={SIZE_OPTIONS} placeholder={t('products.sizeCategory')} />
        </Form.Item>

        {/* Layer Count */}
        <Form.Item
          name="layerCount"
          label={
            <Space>
              {t('products.layerCount')}
              {fieldsWithIssues.has('layerCount') && (
                <WarningOutlined style={{ color: '#ff4d4f' }} />
              )}
            </Space>
          }
          validateStatus={validationErrors.layerCount ? 'error' : undefined}
          help={validationErrors.layerCount ? t(validationErrors.layerCount) : undefined}
        >
          <InputNumber min={2} step={2} style={{ width: '100%' }} placeholder="10" />
        </Form.Item>

        {/* Chip Dimensions */}
        <Form.Item label={t('products.chipLength').replace(' (mm)', '')}>
          <Space.Compact style={{ width: '100%' }}>
            <Form.Item
              name="chipLengthMm"
              noStyle
              validateStatus={validationErrors.chipLengthMm ? 'error' : undefined}
              help={validationErrors.chipLengthMm ? t(validationErrors.chipLengthMm) : undefined}
            >
              <InputNumber
                min={0.01}
                step={0.1}
                precision={2}
                style={{ width: '50%' }}
                placeholder="L (mm)"
              />
            </Form.Item>
            <Form.Item
              name="chipWidthMm"
              noStyle
              validateStatus={validationErrors.chipWidthMm ? 'error' : undefined}
              help={validationErrors.chipWidthMm ? t(validationErrors.chipWidthMm) : undefined}
            >
              <InputNumber
                min={0.01}
                step={0.1}
                precision={2}
                style={{ width: '50%' }}
                placeholder="W (mm)"
              />
            </Form.Item>
          </Space.Compact>
        </Form.Item>

        {/* Application */}
        <Form.Item name="application" label={t('products.application')}>
          <Select options={APP_OPTIONS} allowClear placeholder={t('products.application')} />
        </Form.Item>
      </Form>

      <Divider />

      <Text type="secondary" style={{ fontSize: 12 }}>
        {t('remediation.sku.note')}
      </Text>
    </Drawer>
  );
};

export default SkuQuickFixDrawer;
