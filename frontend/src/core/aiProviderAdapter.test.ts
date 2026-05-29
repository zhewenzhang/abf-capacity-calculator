import { describe, it, expect, vi } from 'vitest';
import {
  getAvailableProviders,
  getProviderById,
  PROVIDER_IDS,
} from './aiProviderAdapter';
import type {
  AiProviderAdapter,
  ProviderConfig,
  ProviderRequest,
} from './aiProviderAdapter';

// ============================================================
// Test helpers
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

const sampleConfig: ProviderConfig = {
  providerId: 'mock',
};

const sampleRequest: ProviderRequest = {
  systemPrompt: 'You are a helpful assistant.',
  userMessage: 'Analyze the data.',
  context: { planId: 'plan-1' },
  maxTokens: 2000,
};

// ============================================================
// MockProvider
// ============================================================

describe('MockProvider', () => {
  it('has correct providerId and displayName', () => {
    const mock = getMockProvider();
    expect(mock.providerId).toBe('mock');
    expect(mock.displayName).toBe('Mock Provider (Testing)');
  });

  it('capabilities are correct', () => {
    const mock = getMockProvider();
    expect(mock.capabilities).toEqual({
      supportsStreaming: false,
      supportsFunctionCalling: false,
      maxTokens: 2000,
      requiresApiKey: false,
    });
  });

  it('validateConfig returns valid for any config', () => {
    const mock = getMockProvider();
    const result = mock.validateConfig(sampleConfig);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('validateConfig returns valid even for empty config', () => {
    const mock = getMockProvider();
    const result = mock.validateConfig({ providerId: '' });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('buildRequest produces correct shape', () => {
    const mock = getMockProvider();
    const request = mock.buildRequest(
      sampleConfig,
      'system prompt',
      'user message',
      { key: 'value' },
    );
    expect(request.systemPrompt).toBe('system prompt');
    expect(request.userMessage).toBe('user message');
    expect(request.context).toEqual({ key: 'value' });
    expect(request.maxTokens).toBe(2000);
  });

  it('parseResponse handles valid response', () => {
    const mock = getMockProvider();
    const raw = { content: 'test content', tokensUsed: 100 };
    const response = mock.parseResponse(raw);
    expect(response.providerId).toBe('mock');
    expect(response.content).toBe('test content');
    expect(response.confidence).toBe('medium');
    expect(response.tokensUsed).toBe(100);
    expect(response.isFallback).toBe(false);
  });

  it('parseResponse handles malformed input', () => {
    const mock = getMockProvider();
    const response = mock.parseResponse('not an object');
    expect(response.providerId).toBe('mock');
    expect(response.content).toBe('Malformed response input');
    expect(response.confidence).toBe('low');
    expect(response.tokensUsed).toBe(0);
    expect(response.isFallback).toBe(false);
  });

  it('parseResponse handles null input', () => {
    const mock = getMockProvider();
    const response = mock.parseResponse(null);
    expect(response.content).toBe('Malformed response input');
    expect(response.confidence).toBe('low');
  });

  it('runCompletion returns deterministic response', async () => {
    const mock = getMockProvider();
    const response1 = await mock.runCompletion(sampleConfig, sampleRequest);
    const response2 = await mock.runCompletion(sampleConfig, sampleRequest);
    expect(response1).toEqual(response2);
    expect(response1.providerId).toBe('mock');
    expect(response1.confidence).toBe('medium');
    expect(response1.isFallback).toBe(false);
    expect(response1.content).toContain('mock data');
    expect(response1.content).toContain('deterministic response');
    expect(response1.tokensUsed).toBe(42);
  });

  it('runCompletion never calls fetch', async () => {
    const mock = getMockProvider();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    await mock.runCompletion(sampleConfig, sampleRequest);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

// ============================================================
// ExternalByokPlaceholder
// ============================================================

describe('ExternalByokPlaceholder', () => {
  it('validateConfig returns invalid', () => {
    const external = getExternalProvider();
    const result = external.validateConfig({
      providerId: 'external-byok',
      apiKey: 'test-key',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      'External provider is not enabled in this build',
    );
  });

  it('buildRequest throws not implemented', () => {
    const external = getExternalProvider();
    expect(() =>
      external.buildRequest(sampleConfig, 'sys', 'user', {}),
    ).toThrow('Not implemented');
  });

  it('parseResponse throws not implemented', () => {
    const external = getExternalProvider();
    expect(() => external.parseResponse({})).toThrow('Not implemented');
  });

  it('runCompletion returns blocked response', async () => {
    const external = getExternalProvider();
    const response = await external.runCompletion(sampleConfig, sampleRequest);
    expect(response.providerId).toBe('external-byok');
    expect(response.confidence).toBe('blocked');
    expect(response.isFallback).toBe(true);
    expect(response.content).toContain('not enabled in this build');
    expect(response.tokensUsed).toBe(0);
  });

  it('does not call fetch', async () => {
    const external = getExternalProvider();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    await external.runCompletion(sampleConfig, sampleRequest);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

// ============================================================
// Registry
// ============================================================

describe('Provider registry', () => {
  it('getAvailableProviders returns 2 providers', () => {
    const providers = getAvailableProviders();
    expect(providers).toHaveLength(2);
  });

  it('getProviderById returns correct provider for mock', () => {
    const provider = getProviderById('mock');
    expect(provider).not.toBeNull();
    expect(provider!.providerId).toBe('mock');
    expect(provider!.displayName).toBe('Mock Provider (Testing)');
  });

  it('getProviderById returns correct provider for external-byok', () => {
    const provider = getProviderById('external-byok');
    expect(provider).not.toBeNull();
    expect(provider!.providerId).toBe('external-byok');
  });

  it('getProviderById returns null for unknown id', () => {
    const provider = getProviderById('unknown-provider');
    expect(provider).toBeNull();
  });

  it('all provider IDs are in PROVIDER_IDS', () => {
    const providers = getAvailableProviders();
    for (const provider of providers) {
      expect(PROVIDER_IDS).toContain(provider.providerId);
    }
  });
});

// ============================================================
// Security
// ============================================================

describe('Security constraints', () => {
  it('no provider persists API key', () => {
    const configWithKey: ProviderConfig = {
      providerId: 'mock',
      apiKey: 'secret-key-12345',
    };
    const mock = getMockProvider();
    const request = mock.buildRequest(
      configWithKey,
      'system',
      'user',
      {},
    );
    const requestStr = JSON.stringify(request);
    expect(requestStr).not.toContain('secret-key-12345');

    const response = mock.parseResponse({
      content: 'test',
      tokensUsed: 10,
    });
    const responseStr = JSON.stringify(response);
    expect(responseStr).not.toContain('secret-key-12345');
  });
});
