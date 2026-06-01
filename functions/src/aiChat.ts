/**
 * AI Chat Handler
 *
 * 处理 AI Chat 请求的核心逻辑
 * - 验证 Firebase Auth token
 * - 限流检查
 * - 调用 DeepSeek API
 * - 返回结果
 */

import { Request } from 'firebase-functions/v2/https';
import { Response } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { DeepSeekClient } from './deepseekClient';
import { rateLimitCheck } from './rateLimit';

// 请求接口
interface ChatRequest {
  systemPrompt: string;
  userMessage: string;
  maxTokens?: number;
  temperature?: number;
}

// 响应接口
interface ChatResponse {
  content: string;
  tokensUsed: number;
  providerId: string;
  model: string;
}

/**
 * AI Chat Handler
 *
 * 处理流程:
 * 1. 验证 Authorization header
 * 2. 验证 Firebase Auth ID Token
 * 3. 限流检查 (10 req/min/user)
 * 4. 验证请求体
 * 5. 调用 DeepSeek API
 * 6. 返回结果
 */
export async function aiChatHandler(req: Request, res: Response): Promise<void> {
  try {
    // 1. 验证 Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Missing or invalid Authorization header',
        },
      });
      return;
    }

    // 2. 验证 Firebase Auth ID Token
    const idToken = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await getAuth().verifyIdToken(idToken);
    } catch (error) {
      console.error('Token verification failed:', error);
      res.status(401).json({
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Invalid or expired token',
        },
      });
      return;
    }

    const uid = decodedToken.uid;

    // 3. 限流检查 (每用户每分钟 10 次)
    if (!rateLimitCheck(uid, 10, 60_000)) {
      res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please try again later.',
        },
      });
      return;
    }

    // 4. 验证请求体
    const body = req.body as ChatRequest;

    if (!body.systemPrompt || !body.userMessage) {
      res.status(400).json({
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Missing required fields: systemPrompt, userMessage',
        },
      });
      return;
    }

    // 检查输入大小限制 (50KB)
    const totalSize = (body.systemPrompt?.length || 0) + (body.userMessage?.length || 0);
    if (totalSize > 50_000) {
      res.status(400).json({
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Input too large. Maximum 50,000 characters.',
        },
      });
      return;
    }

    // 5. 获取 DeepSeek API Key
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      console.error('DEEPSEEK_API_KEY not configured');
      res.status(500).json({
        error: {
          code: 'INTERNAL',
          message: 'AI service not configured',
        },
      });
      return;
    }

    // 6. 调用 DeepSeek API
    const client = new DeepSeekClient(apiKey);
    const result = await client.chat({
      systemPrompt: body.systemPrompt,
      userMessage: body.userMessage,
      maxTokens: body.maxTokens ?? 4000,
      temperature: body.temperature ?? 0.3,
    });

    // 7. 返回结果
    const response: ChatResponse = {
      content: result.content,
      tokensUsed: result.tokensUsed,
      providerId: 'deepseek-proxy',
      model: 'deepseek-v4-flash',
    };

    res.json(response);
  } catch (error) {
    console.error('ai-chat error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL',
        message: 'Internal server error',
      },
    });
  }
}
