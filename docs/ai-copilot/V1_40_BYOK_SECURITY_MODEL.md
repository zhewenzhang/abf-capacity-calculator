# V1.40 BYOK Security Model

## Security Principles

The Bring-Your-Own-Key (BYOK) model follows these non-negotiable principles:

1. **Ephemeral keys only.** API keys exist only in React component state during an active session.
2. **Zero persistence.** Keys are never written to any persistent store.
3. **No exfiltration vectors.** Keys are never included in exports, URLs, logs, or error reports.
4. **Defense in depth.** Even if a key were somehow leaked, the Output Validation Layer prevents the provider from causing data corruption.
5. **Fail closed.** If any security check fails, the provider is not invoked.

## Key Lifecycle

```
[User types key] --> [React state (useState)]
                          |
                    [active session]
                          |
              [component unmount / session end]
                          |
                    [state garbage collected]
                          |
                      [key gone]
```

### Detailed Lifecycle

| Phase | Key Location | Duration |
|-------|-------------|----------|
| Input | `<input type="password">` in Provider Settings UI | User is typing |
| Active | `useState` in ProviderSettings component | Component mounted |
| In-use | Passed as argument to `runCompletion()` | Single function call |
| Cleared | React garbage collection on unmount | Immediate |

## No Persistence Guarantee

The following storage mechanisms are explicitly NOT used for API keys:

| Storage Type | Used? | Notes |
|-------------|-------|-------|
| `localStorage` | NO | Never accessed for key storage |
| `sessionStorage` | NO | Never accessed for key storage |
| Firestore | NO | No document or field for API keys |
| URL parameters | NO | Key never appears in URL |
| Git repository | NO | No key in any committed file |
| Cookie | NO | No cookies set for key data |
| React Context (global) | NO | Key is local component state only |
| Browser history | NO | Key not in navigation state |

### Verification Commands

```bash
# Verify no localStorage/sessionStorage usage for keys
grep -rn "localStorage\|sessionStorage" frontend/src/ai-copilot/ | grep -i "key\|api\|secret\|token"

# Verify no Firestore write for keys
grep -rn "setDoc\|updateDoc\|addDoc" frontend/src/ai-copilot/ | grep -i "key\|api\|secret\|token"

# Verify no URL manipulation with keys
grep -rn "searchParams\|hash\|pathname" frontend/src/ai-copilot/ | grep -i "key\|api\|secret\|token"
```

All three commands should return zero results.

## Key Input UI

### Password Input

- The API key input uses `type="password"` to prevent shoulder surfing.
- A toggle button allows the user to reveal/hide the key for verification.
- The input has `autoComplete="off"` and `spellCheck={false}`.

### Warning Messages

When the user opens the Provider Settings UI, the following warnings are displayed:

1. **Session-only warning**: "Your API key is stored only in this browser session. It will be cleared when you close the page or navigate away."
2. **No-server warning**: "Your key is never sent to our servers. It is used only for direct API calls from your browser to the provider."
3. **Own-risk warning**: "You are responsible for the security of your API key and any usage charges incurred."

### Clear Button

A "Clear Key" button is always visible when a key is configured. Clicking it:

1. Sets the key state to `null`.
2. The key is immediately garbage-collectable.
3. The provider is deactivated.
4. A confirmation toast is shown.

## Viewer Restrictions

Workspace users with the `viewer` role have the following restrictions:

| Action | Viewer Allowed? |
|--------|----------------|
| Open Provider Settings | NO (button disabled + tooltip) |
| Configure a provider | NO |
| Enter an API key | NO |
| Clear an API key | NO |
| See provider-enhanced responses | YES (read-only) |
| Export AI Brief | YES (read-only) |

The viewer restriction is enforced at three layers:

1. **UI layer**: Settings button is disabled with a tooltip explaining the restriction.
2. **Component layer**: Provider settings component renders a read-only message for viewers.
3. **Service layer**: `validateConfig` is never called for viewer sessions.

## Output Validation Layer

All provider output passes through the Output Validation Layer before being shown to the user. This layer applies the same safety checks used for deterministic responses.

### Validation Steps

1. **Structural validation**: Response must conform to `CopilotResponse` shape.
2. **Content sanitization**: Strip any HTML/script tags from response text.
3. **Blocked pattern check**: Scan response text against the blocked patterns list.
4. **F-A-I-R classification**: Tag each statement as Fact / Assumption / Inference / Recommendation.
5. **Source reference check**: Data points must include source references.
6. **Confidence assignment**: Assign confidence level based on data completeness.

### Blocked Patterns

The Output Validation Layer blocks any response that contains:

| Pattern | Reason |
|---------|--------|
| Save/write instructions | Provider must not suggest modifying data |
| Missing data guessing | Provider must not fabricate data points |
| Causality claims on attribution | Attribution is proportional, not causal |
| Currency confusion (USD/TWD/BP) | Units must be explicit and correct |
| Formula modification suggestions | Core formulas are deterministic and immutable |
| External link injection | No URLs to unverified external resources |
| Prompt injection payloads | Neutralize any embedded instructions |

If a blocked pattern is detected:

1. The response is NOT shown to the user.
2. A fallback message is displayed: "The AI provider response contained content that violates safety rules. Falling back to deterministic analysis."
3. The incident is logged (without the key or full response) for review.

## Fallback Mechanism

If the provider fails for any reason, the system falls back to deterministic tools:

| Failure Mode | Fallback Behavior |
|-------------|-------------------|
| Network error | Deterministic response + "Provider unavailable" caveat |
| Timeout (30s) | Deterministic response + "Provider timeout" caveat |
| Invalid response format | Deterministic response + "Provider error" caveat |
| Blocked pattern detected | Deterministic response + "Safety filter" caveat |
| Rate limited | Deterministic response + "Provider rate limited" caveat |
| Key invalid/expired | Deterministic response + "Provider authentication failed" caveat |

The fallback is transparent to the user: they always get a response, and the caveat explains why the provider-enhanced response was not available.

## Red Line Summary

These are absolute boundaries that cannot be crossed under any circumstances:

1. **No persistent key storage.** Keys in React state only. No exceptions.
2. **No server-side key handling.** All provider calls are browser-to-provider only.
3. **No data mutation from provider responses.** Provider output is display-only.
4. **No formula modification.** Core calculation formulas are deterministic and immutable.
5. **No currency confusion.** USD/TWD/BP units must be explicit in all responses.
6. **No causality claims.** Attribution is always proportional, never causal.
7. **No data fabrication.** Provider must not generate or guess missing data points.
8. **No bypassing viewer restrictions.** Viewers cannot configure providers.
9. **No export of keys.** Keys never appear in AI Brief exports, JSON downloads, or clipboard copies.
10. **No silent failures.** Every provider failure produces a user-visible fallback message.
