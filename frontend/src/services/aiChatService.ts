/**
 * AI Chat Service (v1.52.0)
 *
 * 前端调用 Firebase Functions AI Chat Proxy
 * - 附带 Firebase Auth ID Token
 * - 错误处理和降级
 * - 健康检查
 *
 * 安全特性:
 * - 前端永远不接触 DeepSeek API Key
 * - 所有请求通过 Firebase Functions 代理
 * - Auth token 验证
 */

import { getAuth } from 'firebase/auth';

// ============================================================
// Types
// ============================================================

export interface ChatRequest {
  readonly systemPrompt: string;
  readonly userMessage: string;
  readonly maxTokens?: number;
  readonly temperature?: number;
}

export interface ChatResponse {
  readonly content: string;
  readonly tokensUsed: number;
  readonly providerId: string;
  readonly model: string;
}

export interface ChatError {
  readonly code: string;
  readonly message: string;
}

// ============================================================
// Constants
// ============================================================

const REGION = 'asia-east1';
const PROJECT_ID = 'abf-capacity-calculator';
const BASE_URL = `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/api`;

// ============================================================
// API Functions
// ============================================================

/**
 * 调用 AI Chat Proxy
 *
 * @param request - 请求参数
 * @returns AI 响应
 * @throws Error 当请求失败时
 */
export async function callAiChatProxy(request: ChatRequest): Promise<ChatResponse> {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    throw new Error('User not authenticated');
  }

  // 获取 ID Token
  const idToken = await user.getIdToken();

  // 调用 proxy
  const response = await fetch(`${BASE_URL}/ai-chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      systemPrompt: request.systemPrompt,
      userMessage: request.userMessage,
      maxTokens: request.maxTokens,
      temperature: request.temperature,
    }),
  });

  // 处理错误响应
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      error: { message: `HTTP ${response.status}` },
    }));

    const error: ChatError = errorData.error || {
      code: 'UNKNOWN',
      message: `Request failed: ${response.status}`,
    };

    throw new AiChatError(error.code, error.message);
  }

  // 解析成功响应
  const data = await response.json();

  return {
    content: data.content || '',
    tokensUsed: data.tokensUsed || 0,
    providerId: data.providerId || 'deepseek-proxy',
    model: data.model || 'deepseek-v4-flash',
  };
}

/**
 * 检查 AI Proxy 健康状态
 *
 * @returns true 如果服务健康，false 如果不可用
 */
export async function checkAiProxyHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000), // 5 秒超时
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * 获取 Proxy 服务状态
 *
 * @returns 服务状态信息
 */
export async function getAiProxyStatus(): Promise<{
  healthy: boolean;
  version?: string;
  timestamp?: string;
}> {
  try {
    const response = await fetch(`${BASE_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return { healthy: false };
    }

    const data = await response.json();
    return {
      healthy: true,
      version: data.version,
      timestamp: data.timestamp,
    };
  } catch {
    return { healthy: false };
  }
}

// ============================================================
// Custom Error Class
// ============================================================

/**
 * AI Chat Error
 *
 * 自定义错误类，包含错误代码和消息
 */
export class AiChatError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'AiChatError';
    this.code = code;
  }

  /**
   * 判断是否为认证错误
   */
  isAuthError(): boolean {
    return this.code === 'UNAUTHENTICATED';
  }

  /**
   * 判断是否为限流错误
   */
  isRateLimited(): boolean {
    return this.code === 'RATE_LIMITED';
  }

  /**
   * 判断是否为输入错误
   */
  isInputError(): boolean {
    return this.code === 'INVALID_ARGUMENT';
  }

  /**
   * 判断是否为服务端错误
   */
  isServerError(): boolean {
    return this.code === 'INTERNAL';
  }
}
