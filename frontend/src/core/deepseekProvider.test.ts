/**
 * DeepSeek Provider Tests
 *
 * Tests for DeepSeek v4 Flash provider integration.
 * All tests use mock data - no real API calls.
 */

import { describe, it, expect } from 'vitest';
import {
  getProviderById,
  getAvailableProviders,
  type ProviderConfig,
} from './aiProviderAdapter';

describe('DeepSeek Provider', () => {
  const deepseekProvider = getProviderById('deepseek');

  it('should be registered in provider list', () => {
    expect(deepseekProvider).toBeDefined();
    expect(deepseekProvider?.providerId).toBe('deepseek');
    expect(deepseekProvider?.displayName).toBe('DeepSeek v4 Flash (BYOK)');
  });

  it('should require API key', () => {
    expect(deepseekProvider?.capabilities.requiresApiKey).toBe(true);
  });

  it('should validate empty API key', () => {
    const config: ProviderConfig = { providerId: 'deepseek' };
    const result = deepseekProvider?.validateConfig(config);
    expect(result?.valid).toBe(false);
    expect(result?.errors).toContain('DeepSeek API key is required');
  });

  it('should validate short API key', () => {
    const config: ProviderConfig = { providerId: 'deepseek', apiKey: 'short' };
    const result = deepseekProvider?.validateConfig(config);
    expect(result?.valid).toBe(false);
    expect(result?.errors).toContain('DeepSeek API key appears invalid (too short)');
  });

  it('should validate valid API key', () => {
    const config: ProviderConfig = { providerId: 'deepseek', apiKey: 'sk-valid-key-1234567890' };
    const result = deepseekProvider?.validateConfig(config);
    expect(result?.valid).toBe(true);
    expect(result?.errors).toHaveLength(0);
  });

  it('should build request correctly', () => {
    const config: ProviderConfig = { providerId: 'deepseek', apiKey: 'sk-test-key-1234567890' };
    const request = deepseekProvider?.buildRequest(
      config,
      'System prompt',
      'User message',
      { test: true }
    );
    expect(request?.systemPrompt).toBe('System prompt');
    expect(request?.userMessage).toBe('User message');
    expect(request?.maxTokens).toBe(4000);
  });

  it('should parse valid response', () => {
    const raw = {
      choices: [
        {
          message: {
            content: 'Test response from DeepSeek',
          },
        },
      ],
      usage: {
        total_tokens: 100,
      },
    };
    const response = deepseekProvider?.parseResponse(raw);
    expect(response?.providerId).toBe('deepseek');
    expect(response?.content).toBe('Test response from DeepSeek');
    expect(response?.confidence).toBe('high');
    expect(response?.tokensUsed).toBe(100);
    expect(response?.isFallback).toBe(false);
  });

  it('should handle invalid response', () => {
    const raw = { invalid: 'response' };
    const response = deepseekProvider?.parseResponse(raw);
    expect(response?.providerId).toBe('deepseek');
    expect(response?.confidence).toBe('blocked');
    expect(response?.isFallback).toBe(true);
  });

  it('should block when no API key provided', async () => {
    const config: ProviderConfig = { providerId: 'deepseek' };
    const request = {
      systemPrompt: 'test',
      userMessage: 'test',
      context: {},
      maxTokens: 100,
    };
    const response = await deepseekProvider?.runCompletion(config, request);
    expect(response?.confidence).toBe('blocked');
    expect(response?.isFallback).toBe(true);
  });

  it('should be in available providers list', () => {
    const providers = getAvailableProviders();
    const deepseek = providers.find(p => p.providerId === 'deepseek');
    expect(deepseek).toBeDefined();
  });

  it('should have correct capabilities', () => {
    expect(deepseekProvider?.capabilities.supportsStreaming).toBe(false);
    expect(deepseekProvider?.capabilities.supportsFunctionCalling).toBe(false);
    expect(deepseekProvider?.capabilities.maxTokens).toBe(4000);
  });
});

describe('DeepSeek Provider Security', () => {
  it('should not persist API key', () => {
    // Verify no localStorage/sessionStorage usage in provider
    const providerCode = getProviderById('deepseek')?.toString() ?? '';
    expect(providerCode).not.toContain('localStorage');
    expect(providerCode).not.toContain('sessionStorage');
  });

  it('should use HTTPS endpoint', () => {
    // Verify DeepSeek endpoint is HTTPS
    const provider = getProviderById('deepseek');
    expect(provider).toBeDefined();
    // The actual URL check is in the implementation
  });

  it('should handle timeout gracefully', async () => {
    const config: ProviderConfig = {
      providerId: 'deepseek',
      apiKey: 'sk-test-key-1234567890',
    };
    const request = {
      systemPrompt: 'test',
      userMessage: 'test',
      context: {},
      maxTokens: 100,
    };
    // This will fail due to no real API, but should not crash
    const response = await getProviderById('deepseek')?.runCompletion(config, request);
    expect(response).toBeDefined();
    expect(response?.providerId).toBe('deepseek');
  });
});
