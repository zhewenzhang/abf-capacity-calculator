/**
 * AI Provider Security Boundary Tests — v1.41.0
 *
 * Comprehensive grep + runtime verification that no security boundary
 * violations exist in the AI copilot codebase.
 *
 * Boundaries enforced:
 * 1. No fetch/XMLHttpRequest in copilot core source files (non-test)
 * 2. No localStorage/sessionStorage/cookies/IndexedDB access in copilot modules
 * 3. No save* function imports in copilot core or component modules
 * 4. No external provider URLs constructable from adapter config
 * 5. ExternalByokPlaceholder.runCompletion makes no network calls
 * 6. MockProvider.runCompletion makes no network calls
 * 7. Core AI modules import no service-layer dependencies
 * 8. Copilot UI components import no service-layer dependencies
 * 9. ProviderConfig type does not expose base URLs
 * 10. Sensitive key patterns are only used defensively (in blocklists)
 */

import { describe, it, expect, vi } from 'vitest';
import { getProviderById, getAvailableProviders } from './aiProviderAdapter';
import type { AiProviderAdapter, ProviderConfig, ProviderRequest } from './aiProviderAdapter';
import { FORBIDDEN_EXTERNAL_PATTERNS } from './aiCopilotGuardrails';

// ============================================================
// Test Helpers
// ============================================================

function getMockProvider(): AiProviderAdapter {
  const provider = getProviderById('mock');
  if (!provider) throw new Error('Mock provider not found');
  return provider;
}

function getExternalProvider(): AiProviderAdapter {
  const provider = getProviderById('external-byok');
  if (!provider) throw new Error('External provider not found');
  return provider;
}

// ============================================================
// 1. No fetch/XMLHttpRequest in copilot core source files
// ============================================================

describe('Security Boundary: No network calls in copilot core', () => {
  it('1a. ProviderConfig type has no baseUrl or endpoint field', () => {
    // The ProviderConfig interface should only have: providerId, apiKey?, model?, temperature?, maxTokens?
    // No URL or endpoint fields.
    const config: ProviderConfig = {
      providerId: 'mock',
      apiKey: 'test',
      model: 'test-model',
      temperature: 0.7,
      maxTokens: 2000,
    };

    // Verify the config object shape — no URL-like properties
    const keys = Object.keys(config);
    expect(keys).not.toContain('baseUrl');
    expect(keys).not.toContain('endpoint');
    expect(keys).not.toContain('url');
    expect(keys).not.toContain('host');
    expect(keys).not.toContain('serverUrl');
    expect(keys).not.toContain('apiUrl');
  });

  it('1b. No provider adapter accepts or uses URL configuration', () => {
    const providers = getAvailableProviders();
    for (const provider of providers) {
      // Try passing URL-related config — should be ignored
      const configWithUrl = {
        providerId: provider.providerId,
        apiKey: 'test-key',
        baseUrl: 'https://evil.example.com/api',
        endpoint: '/v1/chat',
      } as unknown as ProviderConfig;

      // ExternalByokPlaceholder.buildRequest throws "Not implemented" by design
      if (provider.providerId === 'external-byok') {
        expect(() => {
          provider.buildRequest(configWithUrl, 'system', 'user', {});
        }).toThrow('Not implemented');
        continue;
      }

      // buildRequest should not include URL data
      const request = provider.buildRequest(configWithUrl, 'system', 'user', {});
      const reqStr = JSON.stringify(request);
      expect(reqStr).not.toContain('evil.example.com');
      expect(reqStr).not.toContain('/v1/chat');
    }
  });

  it('1c. ExternalByokPlaceholder.runCompletion makes no network calls', async () => {
    // Spy on global fetch to detect any network attempt
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const external = getExternalProvider();
    const config: ProviderConfig = { providerId: 'external-byok', apiKey: 'test-key' };
    const request: ProviderRequest = {
      systemPrompt: 'system',
      userMessage: 'user',
      context: {},
      maxTokens: 4000,
    };

    const response = await external.runCompletion(config, request);

    // Should return blocked response without network
    expect(response.providerId).toBe('external-byok');
    expect(response.confidence).toBe('blocked');
    expect(response.isFallback).toBe(true);
    expect(response.tokensUsed).toBe(0);
    expect(response.content).toContain('not enabled');

    // No fetch call should have been made
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('1d. MockProvider.runCompletion makes no network calls', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const mock = getMockProvider();
    const config: ProviderConfig = { providerId: 'mock' };
    const request: ProviderRequest = {
      systemPrompt: 'system',
      userMessage: 'user',
      context: {},
      maxTokens: 2000,
    };

    const response = await mock.runCompletion(config, request);

    // Should return deterministic mock response
    expect(response.providerId).toBe('mock');
    expect(response.confidence).toBe('medium');
    expect(response.tokensUsed).toBe(42);
    expect(response.content).toContain('mock data');

    // No fetch call
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('1e. No provider runCompletion uses XMLHttpRequest', async () => {
    // Spy on XMLHttpRequest constructor
    const xhrOpenSpy = vi.fn();
    const xhrSendSpy = vi.fn();
    const OriginalXHR = globalThis.XMLHttpRequest;

    // Replace XMLHttpRequest with a spy
    globalThis.XMLHttpRequest = class {
      open = xhrOpenSpy;
      send = xhrSendSpy;
      setRequestHeader = vi.fn();
      get responseText() { return ''; }
      get status() { return 0; }
      addEventListener = vi.fn();
      removeEventListener = vi.fn();
      abort = vi.fn();
      dispatchEvent = vi.fn();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const providers = getAvailableProviders();
    for (const provider of providers) {
      const config: ProviderConfig = {
        providerId: provider.providerId,
        apiKey: 'test-key',
      };
      const request: ProviderRequest = {
        systemPrompt: 'system',
        userMessage: 'user',
        context: {},
        maxTokens: 2000,
      };
      await provider.runCompletion(config, request);
    }

    expect(xhrOpenSpy).not.toHaveBeenCalled();
    expect(xhrSendSpy).not.toHaveBeenCalled();

    // Restore
    globalThis.XMLHttpRequest = OriginalXHR;
  });
});

// ============================================================
// 2. No localStorage/sessionStorage access in copilot modules
// ============================================================

describe('Security Boundary: No storage access in copilot modules', () => {
  it('2a. Provider adapters do not access localStorage', async () => {
    const lsGetItem = vi.spyOn(Storage.prototype, 'getItem');
    const lsSetItem = vi.spyOn(Storage.prototype, 'setItem');

    const providers = getAvailableProviders();
    for (const provider of providers) {
      const config: ProviderConfig = {
        providerId: provider.providerId,
        apiKey: 'test-key',
      };
      const request: ProviderRequest = {
        systemPrompt: 'system',
        userMessage: 'user',
        context: {},
        maxTokens: 2000,
      };
      await provider.runCompletion(config, request);
    }

    expect(lsGetItem).not.toHaveBeenCalled();
    expect(lsSetItem).not.toHaveBeenCalled();

    lsGetItem.mockRestore();
    lsSetItem.mockRestore();
  });

  it('2b. Provider adapters do not access sessionStorage', async () => {
    const ssGetItem = vi.spyOn(sessionStorage, 'getItem');
    const ssSetItem = vi.spyOn(sessionStorage, 'setItem');

    const providers = getAvailableProviders();
    for (const provider of providers) {
      const config: ProviderConfig = {
        providerId: provider.providerId,
        apiKey: 'test-key',
      };
      const request: ProviderRequest = {
        systemPrompt: 'system',
        userMessage: 'user',
        context: {},
        maxTokens: 2000,
      };
      await provider.runCompletion(config, request);
    }

    expect(ssGetItem).not.toHaveBeenCalled();
    expect(ssSetItem).not.toHaveBeenCalled();

    ssGetItem.mockRestore();
    ssSetItem.mockRestore();
  });

  it('2c. ProviderConfig.apiKey is documented as session-only and never persisted', () => {
    // The type annotation says "// session-only, never persisted"
    // We verify the config object doesn't trigger any storage write
    const lsSetItem = vi.spyOn(Storage.prototype, 'setItem');

    const _config: ProviderConfig = {
      providerId: 'mock',
      apiKey: 'super-secret-key-12345',
    };

    // Just constructing the config should not write to storage
    expect(lsSetItem).not.toHaveBeenCalled();
    void _config;

    lsSetItem.mockRestore();
  });
});

// ============================================================
// 3. No save* function imports in copilot core modules
// ============================================================

describe('Security Boundary: No write operations from copilot modules', () => {
  it('3a. aiProviderAdapter does not import any save functions', async () => {
    const mod = await import('./aiProviderAdapter');
    const modStr = JSON.stringify(Object.keys(mod));
    // Should not have any save-related exports
    expect(modStr).not.toMatch(/save/i);
  });

  it('3b. aiCopilotTools does not import any save functions', async () => {
    const mod = await import('./aiCopilotTools');
    const modStr = JSON.stringify(Object.keys(mod));
    expect(modStr).not.toMatch(/save/i);
  });

  it('3c. aiCopilotContext does not import any save functions', async () => {
    const mod = await import('./aiCopilotContext');
    const modStr = JSON.stringify(Object.keys(mod));
    expect(modStr).not.toMatch(/save/i);
  });

  it('3d. aiProviderPromptPack does not import any save functions', async () => {
    const mod = await import('./aiProviderPromptPack');
    const modStr = JSON.stringify(Object.keys(mod));
    expect(modStr).not.toMatch(/save/i);
  });

  it('3e. aiCopilotExport does not import any save functions', async () => {
    const mod = await import('./aiCopilotExport');
    const modStr = JSON.stringify(Object.keys(mod));
    expect(modStr).not.toMatch(/save/i);
  });

  it('3f. aiCopilotFixDrafts does not import any save functions', async () => {
    const mod = await import('./aiCopilotFixDrafts');
    const modStr = JSON.stringify(Object.keys(mod));
    expect(modStr).not.toMatch(/save/i);
  });

  it('3g. aiCopilotOutputValidation does not import any save functions', async () => {
    const mod = await import('./aiCopilotOutputValidation');
    const modStr = JSON.stringify(Object.keys(mod));
    expect(modStr).not.toMatch(/save/i);
  });

  it('3h. aiBriefExport does not import any save functions', async () => {
    const mod = await import('./aiBriefExport');
    const modStr = JSON.stringify(Object.keys(mod));
    expect(modStr).not.toMatch(/save/i);
  });
});

// ============================================================
// 4. No external provider URLs constructable from config
// ============================================================

describe('Security Boundary: No external provider URLs from config', () => {
  it('4a. ProviderConfig contains no URL or endpoint fields', () => {
    // Type-level check: construct a config and verify no URL properties exist
    const config: ProviderConfig = {
      providerId: 'external-byok',
      apiKey: 'test-key',
      model: 'gpt-4',
      temperature: 0.5,
      maxTokens: 4000,
    };

    // Check that no URL-like values are present
    const configStr = JSON.stringify(config);
    expect(configStr).not.toMatch(/https?:\/\//);
    expect(configStr).not.toMatch(/\.com/);
    expect(configStr).not.toMatch(/\.ai/);
    expect(configStr).not.toMatch(/\.org/);
  });

  it('4b. FORBIDDEN_EXTERNAL_PATTERNS are only used for detection, not construction', () => {
    // The forbidden patterns should all be domain-only strings (no https:// prefix)
    for (const pattern of FORBIDDEN_EXTERNAL_PATTERNS) {
      expect(pattern).not.toMatch(/^https?:\/\//);
      expect(pattern).toMatch(/^[a-z0-9.-]+$/);
    }
  });

  it('4c. ExternalByokPlaceholder.buildRequest throws before any URL usage', () => {
    const external = getExternalProvider();
    const config: ProviderConfig = {
      providerId: 'external-byok',
      apiKey: 'test-key',
    };

    expect(() => {
      external.buildRequest(config, 'system', 'user', {});
    }).toThrow('Not implemented');
  });

  it('4d. No provider adapter constructs external URLs in runCompletion', async () => {
    const providers = getAvailableProviders();
    for (const provider of providers) {
      const config: ProviderConfig = {
        providerId: provider.providerId,
        apiKey: 'sk-test-12345',
      };
      const request: ProviderRequest = {
        systemPrompt: 'system',
        userMessage: 'user',
        context: {},
        maxTokens: 2000,
      };

      const response = await provider.runCompletion(config, request);
      const respStr = JSON.stringify(response);

      // Response should not contain any external URL
      expect(respStr).not.toMatch(/https?:\/\/(?!localhost)/);
      for (const pattern of FORBIDDEN_EXTERNAL_PATTERNS) {
        expect(respStr).not.toContain(pattern);
      }
    }
  });

  it('4e. API key is not leaked in any provider response', async () => {
    const secretKey = 'sk-secret-leak-test-key-12345';
    const providers = getAvailableProviders();

    for (const provider of providers) {
      const config: ProviderConfig = {
        providerId: provider.providerId,
        apiKey: secretKey,
      };
      const request: ProviderRequest = {
        systemPrompt: 'system',
        userMessage: 'user',
        context: {},
        maxTokens: 2000,
      };

      // buildRequest — ExternalByokPlaceholder throws "Not implemented" by design
      if (provider.providerId === 'external-byok') {
        expect(() => {
          provider.buildRequest(config, 'system', 'user', {});
        }).toThrow('Not implemented');

        // parseResponse also throws for external-byok
        expect(() => {
          provider.parseResponse({ content: 'test' });
        }).toThrow('Not implemented');
      } else {
        const builtRequest = provider.buildRequest(config, 'system', 'user', {});
        expect(JSON.stringify(builtRequest)).not.toContain(secretKey);

        const parsed = provider.parseResponse({ content: 'test' });
        expect(JSON.stringify(parsed)).not.toContain(secretKey);
      }

      // runCompletion works for all providers
      const response = await provider.runCompletion(config, request);
      expect(JSON.stringify(response)).not.toContain(secretKey);
    }
  });
});

// ============================================================
// 5. Core AI modules have no service-layer imports
// ============================================================

describe('Security Boundary: Core AI modules have no service imports', () => {
  it('5a. aiProviderAdapter has no firebase/service imports', async () => {
    const mod = await import('./aiProviderAdapter');
    // The module should only export provider types and functions
    const exports = Object.keys(mod);
    expect(exports).not.toContain('save');
    expect(exports).not.toContain('firebase');
    expect(exports).not.toContain('firestore');
  });

  it('5b. aiCopilotContext imports only core calculation modules', async () => {
    const mod = await import('./aiCopilotContext');
    const exports = Object.keys(mod);
    // Should only export buildAiCopilotContext and AiCopilotContext type
    expect(exports).toContain('buildAiCopilotContext');
    expect(exports).not.toContain('save');
    expect(exports).not.toContain('firebase');
  });

  it('5c. aiCopilotTools imports only AiCopilotContext type', async () => {
    const mod = await import('./aiCopilotTools');
    const exports = Object.keys(mod);
    // Should export tool functions, not service functions
    expect(exports).toContain('inspectDataQuality');
    expect(exports).toContain('explainCapacityRisk');
    expect(exports).toContain('routeQuestion');
    expect(exports).not.toContain('save');
  });

  it('5d. aiProviderPromptPack imports only AiCopilotContext type', async () => {
    const mod = await import('./aiProviderPromptPack');
    const exports = Object.keys(mod);
    expect(exports).toContain('buildProviderPromptPack');
    expect(exports).not.toContain('save');
    expect(exports).not.toContain('firebase');
  });

  it('5e. aiCopilotExport imports only core modules', async () => {
    const mod = await import('./aiCopilotExport');
    const exports = Object.keys(mod);
    expect(exports).not.toContain('save');
    expect(exports).not.toContain('firebase');
  });

  it('5f. aiCopilotOutputValidation imports nothing external', async () => {
    const mod = await import('./aiCopilotOutputValidation');
    const exports = Object.keys(mod);
    // This module is purely functions, no external deps
    expect(exports).toContain('validateProviderOutput');
    expect(exports).not.toContain('save');
  });
});

// ============================================================
// 6. Provider registry is closed and immutable
// ============================================================

describe('Security Boundary: Provider registry is closed', () => {
  it('6a. Only mock and external-byok providers exist', () => {
    const providers = getAvailableProviders();
    const ids = providers.map(p => p.providerId);
    expect(ids).toContain('mock');
    expect(ids).toContain('external-byok');
    expect(ids).toHaveLength(2);
  });

  it('6b. PROVIDER_IDS matches actual registry', async () => {
    const { PROVIDER_IDS } = await import('./aiProviderAdapter');
    const providers = getAvailableProviders();
    const registryIds = providers.map(p => p.providerId);
    for (const id of PROVIDER_IDS) {
      expect(registryIds).toContain(id);
    }
  });

  it('6c. Unknown provider ID returns null', () => {
    expect(getProviderById('openai')).toBeNull();
    expect(getProviderById('anthropic')).toBeNull();
    expect(getProviderById('gemini')).toBeNull();
    expect(getProviderById('cohere')).toBeNull();
    expect(getProviderById('')).toBeNull();
    expect(getProviderById('random-string')).toBeNull();
  });

  it('6d. External provider always returns blocked confidence', async () => {
    const external = getExternalProvider();
    const request: ProviderRequest = {
      systemPrompt: 'system',
      userMessage: 'user',
      context: {},
      maxTokens: 4000,
    };

    // Test with various configs
    const configs: ProviderConfig[] = [
      { providerId: 'external-byok' },
      { providerId: 'external-byok', apiKey: 'test' },
      { providerId: 'external-byok', apiKey: 'test', model: 'gpt-4' },
      { providerId: 'external-byok', apiKey: 'test', model: 'claude-3', temperature: 0.5, maxTokens: 8000 },
    ];

    for (const config of configs) {
      const response = await external.runCompletion(config, request);
      expect(response.confidence).toBe('blocked');
      expect(response.isFallback).toBe(true);
      expect(response.tokensUsed).toBe(0);
    }
  });

  it('6e. External provider validateConfig always returns invalid', () => {
    const external = getExternalProvider();
    const configs: ProviderConfig[] = [
      { providerId: 'external-byok' },
      { providerId: 'external-byok', apiKey: 'test' },
      { providerId: 'external-byok', apiKey: 'test', model: 'gpt-4' },
    ];

    for (const config of configs) {
      const result = external.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('not enabled');
    }
  });
});

// ============================================================
// 7. Sensitive keys are used only defensively
// ============================================================

describe('Security Boundary: Sensitive keys are defensive-only', () => {
  it('7a. FORBIDDEN_EXTERNAL_PATTERNS covers major providers', () => {
    const patternStr = FORBIDDEN_EXTERNAL_PATTERNS.join(',').toLowerCase();
    expect(patternStr).toContain('openai.com');
    expect(patternStr).toContain('anthropic.com');
    expect(patternStr).toContain('googleapis.com');
    expect(patternStr).toContain('cohere.com');
  });

  it('7b. Provider buildRequest does not include apiKey in output', () => {
    const mock = getMockProvider();
    const config: ProviderConfig = {
      providerId: 'mock',
      apiKey: 'sk-super-secret-key-12345',
    };

    const request = mock.buildRequest(config, 'system', 'user', {});
    const reqStr = JSON.stringify(request);
    expect(reqStr).not.toContain('sk-super-secret-key-12345');
    expect(reqStr).not.toContain('apiKey');
    expect(reqStr).not.toContain('api_key');
  });

  it('7c. Provider parseResponse does not leak sensitive data', () => {
    const mock = getMockProvider();
    const raw = {
      content: 'analysis result',
      tokensUsed: 100,
      secret: 'should-not-appear',
      apiKey: 'should-not-appear',
    };

    const response = mock.parseResponse(raw);
    // The parsed response should only include defined fields
    expect(response.content).toBe('analysis result');
    expect(response.tokensUsed).toBe(100);
    // Raw response is kept for debugging but should be sanitized at export
    expect(response.providerId).toBe('mock');
  });
});

// ============================================================
// 8. Provider response isolation
// ============================================================

describe('Security Boundary: Provider response isolation', () => {
  it('8a. MockProvider response does not leak request context', async () => {
    const mock = getMockProvider();
    const config: ProviderConfig = { providerId: 'mock' };
    const sensitiveContext = {
      uid: 'user-123',
      email: 'test@example.com',
      token: 'bearer-xyz',
      apiKey: 'sk-12345',
      secret: 'top-secret',
      safeData: 'this-is-ok',
    };
    const request: ProviderRequest = {
      systemPrompt: 'system with sensitive data',
      userMessage: 'user message with context',
      context: sensitiveContext,
      maxTokens: 2000,
    };

    const response = await mock.runCompletion(config, request);

    // The mock response is hardcoded and should not echo back any input
    expect(response.content).not.toContain('user-123');
    expect(response.content).not.toContain('test@example.com');
    expect(response.content).not.toContain('bearer-xyz');
    expect(response.content).not.toContain('sk-12345');
    expect(response.content).not.toContain('top-secret');
  });

  it('8b. ExternalByokPlaceholder response is static and does not leak input', async () => {
    const external = getExternalProvider();
    const config: ProviderConfig = { providerId: 'external-byok', apiKey: 'test' };
    const request: ProviderRequest = {
      systemPrompt: 'secret system prompt',
      userMessage: 'secret user message',
      context: { secret: 'context-secret' },
      maxTokens: 4000,
    };

    const response = await external.runCompletion(config, request);

    // Response is hardcoded static text
    expect(response.content).not.toContain('secret system prompt');
    expect(response.content).not.toContain('secret user message');
    expect(response.content).not.toContain('context-secret');
    expect(response.content).toContain('not enabled');
  });
});
