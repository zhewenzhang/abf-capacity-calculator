/**
 * DeepSeek API Client
 *
 * 封装 DeepSeek API 调用
 * - 超时控制 (45 秒)
 * - 错误处理
 * - 响应解析
 */

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com';
const DEEPSEEK_MODEL = 'deepseek-v4-flash';
const TIMEOUT_MS = 45_000;

// 请求接口
interface ChatRequest {
  systemPrompt: string;
  userMessage: string;
  maxTokens: number;
  temperature: number;
}

// 响应接口
interface ChatResult {
  content: string;
  tokensUsed: number;
}

/**
 * DeepSeek API Client
 *
 * 使用方式:
 * ```typescript
 * const client = new DeepSeekClient(apiKey);
 * const result = await client.chat({
 *   systemPrompt: 'You are a helpful assistant',
 *   userMessage: 'Hello',
 *   maxTokens: 4000,
 *   temperature: 0.3,
 * });
 * ```
 */
export class DeepSeekClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * 调用 DeepSeek Chat Completion API
   *
   * @param request - 请求参数
   * @returns 包含 content 和 tokensUsed 的结果
   * @throws Error 当 API 调用失败时
   */
  async chat(request: ChatRequest): Promise<ChatResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(`${DEEPSEEK_BASE_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: DEEPSEEK_MODEL,
          messages: [
            { role: 'system', content: request.systemPrompt },
            { role: 'user', content: request.userMessage },
          ],
          max_tokens: request.maxTokens,
          temperature: request.temperature,
          stream: false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // 处理 HTTP 错误
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`DeepSeek API error ${response.status}: ${errorText}`);
      }

      // 解析响应
      const data = await response.json();
      const message = data.choices?.[0]?.message;

      return {
        content: typeof message?.content === 'string' ? message.content : '',
        tokensUsed: data.usage?.total_tokens ?? 0,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      // 处理超时
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('DeepSeek API request timeout (45s)');
      }

      // 重新抛出其他错误
      throw error;
    }
  }
}
