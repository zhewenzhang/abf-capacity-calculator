/** ABF 产能计算器 - API Client */

import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/',
  timeout: 15000,
});

// 产品管理
export const getProducts = () => api.get('/products');
export const createProduct = (data: any) => api.post('/products', data);

// 产能计算
export const calculate = (data: any) => api.post('/calculations', data);

// 产能规划
export const getCapacity = () => api.get('/capacity');

// 参数配置
export const getParameters = () => api.get('/parameters');

export default api;
