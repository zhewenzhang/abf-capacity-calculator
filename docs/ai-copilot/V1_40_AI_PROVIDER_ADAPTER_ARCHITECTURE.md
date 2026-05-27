# V1.40 AI Provider Adapter Architecture

## Overview

The AI Provider Adapter introduces a pluggable interface for AI providers within the ABF Capacity Calculator's AI Copilot. This architecture allows the deterministic copilot (v1.38/v1.39) to optionally delegate certain queries to an external AI provider while preserving all existing safety guarantees.

The design follows a strict adapter pattern: every provider must implement the same interface, and the system treats all providers as interchangeable black boxes. Deterministic tools remain the primary analysis engine; AI providers are an optional enhancement layer.

## Provider Interface

Every provider must implement the following interface:

```typescript
interface AiProvider {
  /** Unique identifier, e.g. 'mock', 'external-byok' */
  providerId: string;

  /** Human-readable name shown in UI */
  displayName: string;

  /** Declared capabilities for routing decisions */
  capabilities: ProviderCapabilities;

  /** Validate provider-specific configuration (e.g., API key format) */
  validateConfig(config: ProviderConfig): ValidationResult;

  /** Build the provider-specific request payload from a normalized copilot query */
  buildRequest(query: CopilotQuery, config: ProviderConfig): ProviderRequest;

  /** Parse the provider response into a normalized copilot response */
  parseResponse(raw: ProviderResponse): CopilotResponse;

  /** Execute end-to-end: buildRequest -> network call -> parseResponse */
  runCompletion(query: CopilotQuery, config: ProviderConfig): Promise<CopilotResponse>;
}
```

### ProviderCapabilities

```typescript
interface ProviderCapabilities {
  supportsStreaming: boolean;
  supportsToolUse: boolean;
  maxContextTokens: number;
  requiresApiKey: boolean;
}
```

### ValidationResult

```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[];
}
```

## Supported Providers

### 1. Mock Provider (`providerId: 'mock'`)

- **Purpose**: Deterministic testing and development.
- **Behavior**: Returns canned responses based on input keyword matching. No network calls are made.
- **Capabilities**: `requiresApiKey: false`, `supportsStreaming: false`, `supportsToolUse: false`.
- **Use cases**:
  - Unit and integration tests for the provider adapter layer.
  - UI development without needing a real API key.
  - CI pipeline verification.
- **Response format**: Always returns a `CopilotResponse` with `confidence: 'high'`, a deterministic text body, and an empty `toolCalls` array.

### 2. External BYOK Placeholder (`providerId: 'external-byok'`)

- **Purpose**: Interface skeleton for future Bring-Your-Own-Key integration with external LLM providers (e.g., OpenAI, Anthropic, Google).
- **Status**: Interface defined but NOT enabled. No real API calls are made.
- **Capabilities**: `requiresApiKey: true`, `supportsStreaming: false`, `supportsToolUse: false`.
- **Why placeholder?**: The security model (see BYOK Security Model doc) requires thorough review before any real provider is activated. The interface exists so that future integration only needs to implement `runCompletion` without changing the adapter layer.

## Request/Response Flow

```
User Query
    |
    v
[Copilot Router] -- keyword/deterministic routing
    |
    |-- (deterministic tool match?) --> [Deterministic Tool] --> Response
    |
    |-- (provider query?) --> [Provider Adapter]
                                  |
                                  v
                          [validateConfig]
                                  |
                          (valid? -- no --> error response)
                                  |
                                  v (yes)
                          [buildRequest]
                                  |
                                  v
                          [runCompletion]
                                  |
                          (success? -- no --> fallback to deterministic)
                                  |
                                  v (yes)
                          [parseResponse]
                                  |
                                  v
                          [Output Validation Layer]
                                  |
                          (passes safety checks? -- no --> blocked response)
                                  |
                                  v (yes)
                          [Copilot Response to User]
```

### Key Flow Rules

1. **Deterministic tools are always checked first.** If a query can be answered by an existing deterministic tool, the provider adapter is never invoked.
2. **Provider is opt-in.** The user must explicitly configure a provider. Default behavior is deterministic-only.
3. **All provider output passes through the Output Validation Layer.** This layer applies the same safety checks as deterministic responses: blocked patterns, F-A-I-R classification, no-write enforcement.
4. **Fallback on failure.** If `runCompletion` throws or returns an error, the system falls back to a deterministic response with an appropriate caveat message.

## Integration with Existing Deterministic Tools

The provider adapter does NOT replace the six deterministic tools introduced in v1.38:

1. Data Quality Inspection
2. Capacity Risk Explanation
3. BP Gap Analysis
4. Data Fix Suggestions
5. Scenario Impact Analysis
6. Look-Ahead Focus

These tools remain the primary analysis engine. The provider adapter is a supplementary layer that may enhance responses with natural language generation or cross-domain reasoning, but it never bypasses or overrides deterministic results.

### Routing Priority

```
Priority 1: Deterministic tool match (keyword routing)
Priority 2: Provider-assisted response (if provider configured)
Priority 3: Fallback message ("I can help with..." + tool list)
```

## Extension Points for Future Providers

To add a new provider:

1. Create a new file `providers/<name>Provider.ts` implementing the `AiProvider` interface.
2. Register it in the provider registry (`providers/registry.ts`).
3. Add the provider's `providerId` to the settings UI provider dropdown.
4. Write tests covering `validateConfig`, `buildRequest`, `parseResponse`, and error paths.
5. Ensure the Output Validation Layer is tested against the new provider's response format.

### Constraints on New Providers

- Must not store API keys in any persistent store.
- Must not make network calls during `validateConfig` (format check only).
- Must support cancellation via `AbortController`.
- Must pass all existing Output Validation Layer tests.
- Must degrade gracefully when offline or rate-limited.
