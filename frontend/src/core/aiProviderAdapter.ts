/**
 * AI Provider Adapter Architecture (v1.52.0)
 *
 * Defines a pluggable provider adapter interface for AI completions.
 *
 * Key constraints:
 * - No firebase/firestore imports
 * - External AI providers use Firebase Functions proxy
 * - No localStorage or sessionStorage
 * - API keys are never exposed to frontend
 * - All functions are pure or have controlled side effects only
 * - DeepSeek provider uses server-side proxy (no BYOK)
 */

// ============================================================
// Types
// ============================================================

export interface ProviderCapabilities {
  readonly supportsStreaming: boolean;
  readonly supportsFunctionCalling: boolean;
  readonly maxTokens: number;
  readonly requiresApiKey: boolean;
}

export interface ProviderConfig {
  readonly providerId: string;
  readonly apiKey?: string; // deprecated - not used in proxy mode
  readonly model?: string;
  readonly temperature?: number;
  readonly maxTokens?: number;
}

export interface ProviderRequest {
  readonly systemPrompt: string;
  readonly userMessage: string;
  readonly context: Record<string, unknown>;
  readonly maxTokens: number;
}

export interface ProviderResponse {
  readonly providerId: string;
  readonly content: string;
  readonly confidence: 'high' | 'medium' | 'low' | 'blocked';
  readonly tokensUsed: number;
  readonly isFallback: boolean;
  readonly rawResponse?: Record<string, unknown>;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: string[];
}

export interface AiProviderAdapter {
  readonly providerId: string;
  readonly displayName: string;
  readonly capabilities: ProviderCapabilities;
  validateConfig(config: ProviderConfig): ValidationResult;
  buildRequest(
    config: ProviderConfig,
    systemPrompt: string,
    userMessage: string,
    context: Record<string, unknown>,
  ): ProviderRequest;
  parseResponse(raw: unknown): ProviderResponse;
  runCompletion(
    config: ProviderConfig,
    request: ProviderRequest,
  ): Promise<ProviderResponse>;
}

// ============================================================
// Constants
// ============================================================

export const PROVIDER_IDS = ['mock', 'deepseek-proxy'] as const;

export type ProviderMode = 'local' | 'deepseek-proxy' | 'mock';

// ============================================================
// MockProvider
// ============================================================

const mockProvider: AiProviderAdapter = {
  providerId: 'mock',
  displayName: 'Mock Provider (Testing)',
  capabilities: {
    supportsStreaming: false,
    supportsFunctionCalling: false,
    maxTokens: 2000,
    requiresApiKey: false,
  },

  validateConfig(config: ProviderConfig): ValidationResult {
    void config;
    return { valid: true, errors: [] };
  },

  buildRequest(
    config: ProviderConfig,
    systemPrompt: string,
    userMessage: string,
    context: Record<string, unknown>,
  ): ProviderRequest {
    void config;
    return {
      systemPrompt,
      userMessage,
      context,
      maxTokens: 2000,
    };
  },

  parseResponse(raw: unknown): ProviderResponse {
    if (
      raw !== null &&
      typeof raw === 'object' &&
      'content' in raw &&
      typeof (raw as Record<string, unknown>).content === 'string'
    ) {
      const obj = raw as Record<string, unknown>;
      return {
        providerId: 'mock',
        content: obj.content as string,
        confidence: 'medium',
        tokensUsed: typeof obj.tokensUsed === 'number' ? (obj.tokensUsed as number) : 0,
        isFallback: false,
        rawResponse: raw as Record<string, unknown>,
      };
    }

    return {
      providerId: 'mock',
      content: 'Malformed response input',
      confidence: 'low',
      tokensUsed: 0,
      isFallback: false,
    };
  },

  async runCompletion(
    config: ProviderConfig,
    request: ProviderRequest,
  ): Promise<ProviderResponse> {
    void config;
    void request;
    return {
      providerId: 'mock',
      content:
        'This is a mock data deterministic response. Structured analysis: ' +
        'The input has been processed using local deterministic tools. ' +
        'No external API call was made. mock data analysis complete.',
      confidence: 'medium',
      tokensUsed: 42,
      isFallback: false,
    };
  },
};

// ============================================================
// Proxy Provider (DeepSeek via Firebase Functions)
// ============================================================

const proxyProvider: AiProviderAdapter = {
  providerId: 'deepseek-proxy',
  displayName: 'DeepSeek AI (Managed)',
  capabilities: {
    supportsStreaming: false,
    supportsFunctionCalling: false,
    maxTokens: 4000,
    requiresApiKey: false, // 关键：不需要用户 API Key
  },

  validateConfig(config: ProviderConfig): ValidationResult {
    void config;
    // Proxy 模式不需要 API Key，始终有效
    return { valid: true, errors: [] };
  },

  buildRequest(
    config: ProviderConfig,
    systemPrompt: string,
    userMessage: string,
    context: Record<string, unknown>,
  ): ProviderRequest {
    void config;
    return {
      systemPrompt,
      userMessage,
      context,
      maxTokens: config.maxTokens ?? 4000,
    };
  },

  parseResponse(raw: unknown): ProviderResponse {
    if (
      raw !== null &&
      typeof raw === 'object' &&
      'content' in raw
    ) {
      const obj = raw as Record<string, unknown>;
      return {
        providerId: 'deepseek-proxy',
        content: typeof obj.content === 'string' ? obj.content : '',
        confidence: 'high',
        tokensUsed: typeof obj.tokensUsed === 'number' ? obj.tokensUsed : 0,
        isFallback: false,
        rawResponse: raw as Record<string, unknown>,
      };
    }

    return {
      providerId: 'deepseek-proxy',
      content: 'Failed to parse AI response',
      confidence: 'blocked',
      tokensUsed: 0,
      isFallback: true,
    };
  },

  async runCompletion(
    config: ProviderConfig,
    request: ProviderRequest,
  ): Promise<ProviderResponse> {
    void config;

    try {
      // 动态导入 aiChatService 避免循环依赖
      const { callAiChatProxy } = await import('../services/aiChatService');

      const result = await callAiChatProxy({
        systemPrompt: request.systemPrompt,
        userMessage: request.userMessage,
        maxTokens: request.maxTokens,
      });

      return proxyProvider.parseResponse(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return {
        providerId: 'deepseek-proxy',
        content: `AI service error: ${errorMessage}`,
        confidence: 'blocked',
        tokensUsed: 0,
        isFallback: true,
      };
    }
  },
};

// ============================================================
// Registry
// ============================================================

const providers: AiProviderAdapter[] = [mockProvider, proxyProvider];

export function getAvailableProviders(): AiProviderAdapter[] {
  return providers;
}

export function getProviderById(id: string): AiProviderAdapter | null {
  return providers.find((p) => p.providerId === id) ?? null;
}

/**
 * 获取默认 Provider
 *
 * 默认使用 deepseek-proxy，如果不可用则降级到 mock
 */
export function getDefaultProvider(): AiProviderAdapter {
  return proxyProvider;
}
