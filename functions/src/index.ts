/**
 * ABF Capacity Calculator - Firebase Functions
 * v1.52.3
 *
 * AI Chat Proxy - 安全代理 DeepSeek API 调用
 */

import { onRequest } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { aiChatHandler } from './aiChat';

// 初始化 Firebase Admin
initializeApp();

/**
 * AI Chat API Function
 *
 * 路由:
 * - POST /api/ai-chat → AI Chat proxy
 * - GET /api/health → 健康检查
 *
 * 安全特性:
 * - Firebase Auth token 验证
 * - 每用户每分钟 10 次限流
 * - DEEPSEEK_API_KEY 存放在 Secret Manager
 * - CORS 白名单限制
 */
export const api = onRequest(
  {
    region: 'asia-east1',
    memory: '256MiB',
    timeoutSeconds: 60,
    secrets: ['DEEPSEEK_API_KEY'],
    invoker: 'public',
    cors: [
      'https://abf-capacity-calculator.web.app',
      'https://abf-capacity-calculator.firebaseapp.com',
      'http://localhost:5173',
      'http://localhost:3000',
    ],
  },
  async (req, res) => {
    // 路由处理
    if (req.method === 'POST' && req.path === '/ai-chat') {
      return aiChatHandler(req, res);
    }

    if (req.method === 'GET' && req.path === '/health') {
      res.json({
        status: 'ok',
        version: '1.52.3',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // 404
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `Path ${req.path} not found`,
      },
    });
  }
);
