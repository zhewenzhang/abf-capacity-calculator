/** ABF 产能计算器 - API Client with mock data fallback */

import axios from 'axios';

const api = axios.create({
  baseURL: '/abf-capacity-calculator/',
  timeout: 15000,
});

// Mock data for static deployment
const mockData = {
  products: [
    { skuCode: 'ABF-001', customer: 'NVIDIA', deviceName: 'GH200', osat: 'ASE', application: 'AI/ML', productGrade: 'Advanced', unitPrice: 1250 },
    { skuCode: 'ABF-002', customer: 'AMD', deviceName: 'MI300X', osat: 'SPIL', application: 'AI/ML', productGrade: 'Advanced', unitPrice: 1180 },
    { skuCode: 'ABF-003', customer: 'Intel', deviceName: 'Gaudi3', osat: 'JCET', application: 'AI/ML', productGrade: 'Standard', unitPrice: 950 },
    { skuCode: 'ABF-004', customer: 'Broadcom', deviceName: 'Tomahawk5', osat: 'ASE', application: 'Networking', productGrade: 'Advanced', unitPrice: 820 },
    { skuCode: 'ABF-005', customer: 'Marvell', deviceName: 'Puma7', osat: 'SPIL', application: 'Networking', productGrade: 'Standard', unitPrice: 680 },
  ],
  capacity: [
    { month: '2026-01', corePanelperDay: 1200, buPanelPerDay: 800 },
    { month: '2026-02', corePanelperDay: 1350, buPanelPerDay: 900 },
    { month: '2026-03', corePanelperDay: 1500, buPanelPerDay: 1000 },
    { month: '2026-04', corePanelperDay: 1650, buPanelPerDay: 1100 },
    { month: '2026-05', corePanelperDay: 1800, buPanelPerDay: 1200 },
    { month: '2026-06', corePanelperDay: 2000, buPanelPerDay: 1350 },
    { month: '2026-07', corePanelperDay: 2200, buPanelPerDay: 1500 },
    { month: '2026-08', corePanelperDay: 2400, buPanelPerDay: 1650 },
    { month: '2026-09', corePanelperDay: 2600, buPanelPerDay: 1800 },
    { month: '2026-10', corePanelperDay: 2800, buPanelPerDay: 2000 },
    { month: '2026-11', corePanelperDay: 3000, buPanelPerDay: 2200 },
    { month: '2026-12', corePanelperDay: 3200, buPanelPerDay: 2400 },
  ],
  parameters: [
    { paramType: 'yield', paramKey: 'small_2_4_layers', paramValue: 0.96, effectiveFrom: '2026-01' },
    { paramType: 'yield', paramKey: 'medium_4_8_layers', paramValue: 0.92, effectiveFrom: '2026-01' },
    { paramType: 'yield', paramKey: 'large_8_12_layers', paramValue: 0.88, effectiveFrom: '2026-01' },
    { paramType: 'lead_time', paramKey: 'base_days', paramValue: 30, effectiveFrom: '2026-01' },
    { paramType: 'lead_time', paramKey: 'increase_per_step', paramValue: 5, effectiveFrom: '2026-01' },
    { paramType: 'consumption', paramKey: 'core_ratio', paramValue: 0.5, effectiveFrom: '2026-01' },
    { paramType: 'consumption', paramKey: 'bu_ratio', paramValue: 0.2, effectiveFrom: '2026-01' },
  ],
};

// Helper: try API first, fall back to mock data
async function fetchWithMock<T>(endpoint: string, mock: T): Promise<T> {
  try {
    const res = await api.get(endpoint);
    return res.data;
  } catch {
    return mock;
  }
}

// 产品管理
export const getProducts = () => {
  return fetchWithMock('/products', mockData.products).then(data => ({ data }));
};
export const createProduct = (data: any) => {
  mockData.products.push({ ...data, skuCode: data.skuCode || `ABF-${String(mockData.products.length + 1).padStart(3, '0')}` });
  return Promise.resolve({ data });
};

// 产能计算
export const calculate = (data: any) => {
  const results = mockData.products.map((p) => ({
    sku: p.skuCode,
    sizeCategory: p.application,
    layerCount: Math.floor(Math.random() * 10) + 2,
    yieldRate: 85 + Math.random() * 10,
    requiredInputPcs: Math.floor(Math.random() * 5000) + 1000,
    requiredPanel: Math.floor(Math.random() * 500) + 100,
    coreConsumption: Math.floor(Math.random() * 2000) + 500,
    buConsumption: Math.floor(Math.random() * 500) + 100,
    corePanel: Math.floor(Math.random() * 300) + 50,
    buPanel: Math.floor(Math.random() * 200) + 30,
    leadTimeDays: 30 + Math.floor(Math.random() * 30),
    revenue: p.unitPrice * (Math.random() * 1000 + 500),
  }));
  return Promise.resolve({ data: results });
};

// 产能规划
export const getCapacity = () => {
  return fetchWithMock('/capacity', mockData.capacity).then(data => ({ data }));
};

// 参数配置
export const getParameters = () => {
  return fetchWithMock('/parameters', mockData.parameters).then(data => ({ data }));
};

export default api;
