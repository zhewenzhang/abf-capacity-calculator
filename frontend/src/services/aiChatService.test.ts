/**
 * AI Chat Service Tests
 *
 * 测试 AI Chat Proxy 服务
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { callAiChatProxy, checkAiProxyHealth, AiChatError } from './aiChatService';

// Mock firebase/auth
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({
    currentUser: {
      getIdToken: vi.fn(() => Promise.resolve('mock-id-token')),
    },
  })),
}));

// Mock global fetch
const mockFetch = vi.fn();
globalThis.fetch = mockFetch as typeof globalThis.fetch;

describe('aiChatService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('callAiChatProxy', () => {
    it('should call proxy with correct parameters', async () => {
      const mockResponse = {
        content: 'Test response',
        tokensUsed: 100,
        providerId: 'deepseek-proxy',
        model: 'deepseek-v4-flash',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await callAiChatProxy({
        systemPrompt: 'Test system prompt',
        userMessage: 'Test user message',
        maxTokens: 4000,
      });

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/ai-chat'),
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-id-token',
          },
          body: JSON.stringify({
            systemPrompt: 'Test system prompt',
            userMessage: 'Test user message',
            maxTokens: 4000,
          }),
        })
      );
    });

    it('should throw AiChatError on 401 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({
          error: { code: 'UNAUTHENTICATED', message: 'Invalid token' },
        }),
      });

      await expect(
        callAiChatProxy({
          systemPrompt: 'Test',
          userMessage: 'Test',
        })
      ).rejects.toThrow(AiChatError);
    });

    it('should throw AiChatError on 429 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () => Promise.resolve({
          error: { code: 'RATE_LIMITED', message: 'Too many requests' },
        }),
      });

      await expect(
        callAiChatProxy({
          systemPrompt: 'Test',
          userMessage: 'Test',
        })
      ).rejects.toThrow(AiChatError);
    });

    it('should throw error when user is not authenticated', async () => {
      const { getAuth } = await import('firebase/auth');
      vi.mocked(getAuth).mockReturnValueOnce({
        currentUser: null,
      } as any);

      await expect(
        callAiChatProxy({
          systemPrompt: 'Test',
          userMessage: 'Test',
        })
      ).rejects.toThrow('User not authenticated');
    });
  });

  describe('checkAiProxyHealth', () => {
    it('should return true when health check succeeds', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'ok', version: '1.52.0' }),
      });

      const result = await checkAiProxyHealth();
      expect(result).toBe(true);
    });

    it('should return false when health check fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      const result = await checkAiProxyHealth();
      expect(result).toBe(false);
    });

    it('should return false when fetch throws error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await checkAiProxyHealth();
      expect(result).toBe(false);
    });
  });

  describe('AiChatError', () => {
    it('should identify auth errors', () => {
      const error = new AiChatError('UNAUTHENTICATED', 'Invalid token');
      expect(error.isAuthError()).toBe(true);
      expect(error.isRateLimited()).toBe(false);
    });

    it('should identify rate limit errors', () => {
      const error = new AiChatError('RATE_LIMITED', 'Too many requests');
      expect(error.isRateLimited()).toBe(true);
      expect(error.isAuthError()).toBe(false);
    });

    it('should identify input errors', () => {
      const error = new AiChatError('INVALID_ARGUMENT', 'Missing field');
      expect(error.isInputError()).toBe(true);
    });

    it('should identify server errors', () => {
      const error = new AiChatError('INTERNAL', 'Server error');
      expect(error.isServerError()).toBe(true);
    });
  });
});
