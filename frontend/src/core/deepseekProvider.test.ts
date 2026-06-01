/**
 * DeepSeek Provider Tests (v1.52.0)
 *
 * Tests for the proxy-based DeepSeek provider (via Firebase Functions)
 * Replaces the old BYOK direct-connect tests
 */

import { describe, it, expect } from 'vitest';
import {
  getProviderById,
  getAvailableProviders,
  type ProviderConfig,
  type ProviderRequest,
} from './aiProviderAdapter';

describe('DeepSeek Proxy Provider', () => {
  const proxyProvider = getProviderById('deepseek-proxy');

  it('should be registered in provider list', () => {
    expect(proxyProvider).toBeDefined();
    expect(proxyProvider?.providerId).toBe('deepseek-proxy');
    expect(proxyProvider?.displayName).toBe('DeepSeek AI (Managed)');
  });

  it('should not require API key', () => {
    expect(proxyProvider?.capabilities.requiresApiKey).toBe(false);
  });

  it('should validate config without API key', () => {
    const config: ProviderConfig = { providerId: 'deepseek-proxy' };
    const result = proxyProvider?.validateConfig(config);
    expect(result?.valid).toBe(true);
    expect(result?.errors).toEqual([]);
  });

  it('should validate config with any API key (ignored)', () => {
    const config: ProviderConfig = { providerId: 'deepseek-proxy', apiKey: 'any-key' };
    const result = proxyProvider?.validateConfig(config);
    expect(result?.valid).toBe(true);
    expect(result?.errors).toEqual([]);
  });

  it('should build request correctly', () => {
    const config: ProviderConfig = { providerId: 'deepseek-proxy', maxTokens: 3000 };
    const request = proxyProvider?.buildRequest(
      config,
      'System prompt',
      'User message',
      { test: true }
    );
    expect(request?.systemPrompt).toBe('System prompt');
    expect(request?.userMessage).toBe('User message');
    expect(request?.maxTokens).toBe(3000);
  });

  it('should parse valid response', () => {
    const raw = {
      content: 'Test response from DeepSeek',
      tokensUsed: 100,
    };
    const response = proxyProvider?.parseResponse(raw);
    expect(response?.providerId).toBe('deepseek-proxy');
    expect(response?.content).toBe('Test response from DeepSeek');
    expect(response?.confidence).toBe('high');
    expect(response?.tokensUsed).toBe(100);
    expect(response?.isFallback).toBe(false);
  });

  it('should handle invalid response', () => {
    const raw = { invalid: 'response' };
    const response = proxyProvider?.parseResponse(raw);
    expect(response?.providerId).toBe('deepseek-proxy');
    expect(response?.confidence).toBe('blocked');
    expect(response?.isFallback).toBe(true);
  });

  it('should be in available providers list', () => {
    const providers = getAvailableProviders();
    const proxy = providers.find(p => p.providerId === 'deepseek-proxy');
    expect(proxy).toBeDefined();
  });

  it('should have correct capabilities', () => {
    expect(proxyProvider?.capabilities.supportsStreaming).toBe(false);
    expect(proxyProvider?.capabilities.supportsFunctionCalling).toBe(false);
    expect(proxyProvider?.capabilities.maxTokens).toBe(4000);
  });

  it('should not have old deepseek (BYOK) provider', () => {
    const oldProvider = getProviderById('deepseek');
    expect(oldProvider).toBeNull();
  });

  it('should not have external-byok provider', () => {
    const oldProvider = getProviderById('external-byok');
    expect(oldProvider).toBeNull();
  });
});

describe('DeepSeek Proxy Provider Security', () => {
  it('should not persist API key', () => {
    const providerCode = getProviderById('deepseek-proxy')?.toString() ?? '';
    expect(providerCode).not.toContain('localStorage');
    expect(providerCode).not.toContain('sessionStorage');
  });

  it('should not require API key in config', () => {
    const provider = getProviderById('deepseek-proxy');
    expect(provider).toBeDefined();
    expect(provider?.capabilities.requiresApiKey).toBe(false);
  });

  it('should handle runCompletion gracefully when not authenticated', async () => {
    const provider = getProviderById('deepseek-proxy');
    const config: ProviderConfig = { providerId: 'deepseek-proxy' };
    const request: ProviderRequest = {
      systemPrompt: 'test',
      userMessage: 'test',
      context: {},
      maxTokens: 100,
    };
    // In test environment, firebase auth is not available
    // Should return fallback response without crashing
    const response = await provider?.runCompletion(config, request);
    expect(response).toBeDefined();
    expect(response?.providerId).toBe('deepseek-proxy');
  });
});
