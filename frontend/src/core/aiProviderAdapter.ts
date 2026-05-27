/**
 * AI Provider Adapter Architecture (v1.40.0)
 *
 * Defines a pluggable provider adapter interface for AI completions.
 *
 * Key constraints:
 * - No firebase/firestore imports
 * - No fetch() or network API calls
 * - No localStorage or sessionStorage
 * - API keys are session-only and never persisted
 * - All functions are pure or have controlled side effects only
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
  readonly apiKey?: string; // session-only, never persisted
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

export const PROVIDER_IDS = ['mock', 'external-byok'] as const;

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
// ExternalByokPlaceholder
// ============================================================

const externalByokPlaceholder: AiProviderAdapter = {
  providerId: 'external-byok',
  displayName: 'External AI Provider (BYOK) — Not Enabled',
  capabilities: {
    supportsStreaming: true,
    supportsFunctionCalling: true,
    maxTokens: 4000,
    requiresApiKey: true,
  },

  validateConfig(config: ProviderConfig): ValidationResult {
    void config;
    return {
      valid: false,
      errors: ['External provider is not enabled in this build'],
    };
  },

  buildRequest(
    config: ProviderConfig,
    systemPrompt: string,
    userMessage: string,
    context: Record<string, unknown>,
  ): ProviderRequest {
    void config;
    void systemPrompt;
    void userMessage;
    void context;
    throw new Error('Not implemented');
  },

  parseResponse(raw: unknown): ProviderResponse {
    void raw;
    throw new Error('Not implemented');
  },

  async runCompletion(
    config: ProviderConfig,
    request: ProviderRequest,
  ): Promise<ProviderResponse> {
    void config;
    void request;
    return {
      providerId: 'external-byok',
      content:
        'External provider is not enabled in this build. ' +
        'Please use local deterministic tools.',
      confidence: 'blocked',
      tokensUsed: 0,
      isFallback: true,
    };
  },
};

// ============================================================
// Registry
// ============================================================

const providers: AiProviderAdapter[] = [mockProvider, externalByokPlaceholder];

export function getAvailableProviders(): AiProviderAdapter[] {
  return providers;
}

export function getProviderById(id: string): AiProviderAdapter | null {
  return providers.find((p) => p.providerId === id) ?? null;
}
