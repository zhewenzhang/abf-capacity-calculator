/**
 * ABF 产能计算器 - 类型定义
 */

// 产品
export interface Product {
  id: number;
  sku: string;
  customer?: string;
  size_category: string;
  layer_count: number;
  monthly_forecast: Record<string, number>;
  price?: Record<string, number>;
}

// 良率矩阵
export interface YieldMatrixEntry {
  size_category: string;
  layer_range_start: number;
  layer_range_end: number;
  yield_rate: number;
}

// 产能规划
export interface CapacityPlan {
  id: number;
  period: string;
  core_capacity: number;
  bu_capacity: number;
}

// 计算结果
export interface CalculationResult {
  sku: string;
  size_category: string;
  layer_count: number;
  yield_rate: number;
  core_consumption: number;
  bu_consumption: number;
  monthly_results: MonthlyResult[];
  total_revenue: number;
  capacity_utilization: CapacityUtilization;
}

export interface MonthlyResult {
  month: string;
  output_pcs: number;
  core_panels: number;
  bu_panels: number;
  daily_core_demand: number;
  daily_bu_demand: number;
  yield_rate: number;
  revenue: number;
}

export interface CapacityUtilization {
  core_utilization: number;
  bu_utilization: number;
  total_utilization: number;
  core_capacity: number;
  bu_capacity: number;
}

// 生产参数
export interface ProductionParameter {
  id: number;
  parameter_key: string;
  parameter_value: Record<string, any>;
  version: number;
  description?: string;
}

// 计算请求
export interface CalculationRequest {
  products: Array<{
    sku: string;
    size_category: string;
    layer_count: number;
    monthly_forecast: Record<string, number>;
    prices?: Record<string, number>;
  }>;
  period: string;
}
