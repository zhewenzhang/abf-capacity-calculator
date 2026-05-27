# V1.40 AI Provider Adapter Acceptance Checklist

## Pre-Release Checklist

### Architecture

- [ ] `AiProvider` interface defined with all required methods (`providerId`, `displayName`, `capabilities`, `validateConfig`, `buildRequest`, `parseResponse`, `runCompletion`)
- [ ] Provider registry implemented and tested
- [ ] Mock provider returns deterministic responses without network calls
- [ ] External BYOK placeholder interface defined but NOT enabled
- [ ] Routing priority: deterministic tools first, provider second, fallback third
- [ ] All provider output passes through Output Validation Layer

### Security

- [ ] API keys stored in React `useState` only (no localStorage, sessionStorage, Firestore, URL, cookies)
- [ ] Key input uses `<input type="password">` with `autoComplete="off"`
- [ ] Clear button immediately nullifies key state
- [ ] Key cleared on component unmount
- [ ] Viewer role cannot open Provider Settings UI
- [ ] Viewer restriction enforced at UI, component, and service layers
- [ ] No API key appears in AI Brief exports or JSON downloads
- [ ] No API key appears in browser DevTools Network tab for non-provider requests

### Output Validation

- [ ] All provider responses pass through blocked pattern check
- [ ] Blocked: save/write instructions
- [ ] Blocked: missing data guessing
- [ ] Blocked: causality claims on proportional attribution
- [ ] Blocked: currency confusion (USD/TWD/BP)
- [ ] Blocked: formula modification suggestions
- [ ] Blocked: external link injection
- [ ] Blocked: prompt injection payloads
- [ ] F-A-I-R classification applied to all provider responses
- [ ] Source references required for data points
- [ ] Confidence level assigned to all responses

### Fallback

- [ ] Network error triggers deterministic fallback with caveat
- [ ] Timeout (30s) triggers deterministic fallback with caveat
- [ ] Invalid response format triggers deterministic fallback with caveat
- [ ] Blocked pattern triggers deterministic fallback with caveat
- [ ] Rate limit triggers deterministic fallback with caveat
- [ ] Invalid/expired key triggers deterministic fallback with caveat
- [ ] Fallback message is user-visible and explains the situation

### i18n

- [ ] All new UI strings available in English (en)
- [ ] All new UI strings available in Traditional Chinese (zh-TW)
- [ ] i18n key parity test passes for new keys
- [ ] No hardcoded English strings in provider settings UI
- [ ] No hardcoded English strings in fallback/caveat messages

## Security Verification Steps

### Manual Verification

1. **Key persistence check**:
   - Enter an API key in Provider Settings
   - Open browser DevTools > Application > localStorage
   - Verify no key-related entries exist
   - Repeat for sessionStorage
   - Navigate away from the page
   - Return to Provider Settings
   - Verify key field is empty (key was cleared on unmount)

2. **Viewer restriction check**:
   - Log in as a viewer-role workspace member
   - Verify Provider Settings button is disabled
   - Verify tooltip explains the restriction
   - Attempt to access provider settings via URL manipulation
   - Verify access is denied

3. **Export safety check**:
   - Configure a provider with a test key
   - Export an AI Brief (Copy AI Brief Pack)
   - Paste into a text editor
   - Verify no API key or provider configuration appears in the export

4. **Fallback check**:
   - Configure the mock provider
   - Simulate a provider failure (invalid key, network disconnect)
   - Verify a deterministic fallback response is shown
   - Verify the caveat message explains the fallback reason

### Automated Verification

```bash
# 1. No key persistence in source
grep -rn "localStorage\|sessionStorage" frontend/src/ai-copilot/ | grep -i "key\|api\|secret\|token"
# Expected: 0 results

# 2. No Firestore writes for keys
grep -rn "setDoc\|updateDoc\|addDoc" frontend/src/ai-copilot/ | grep -i "key\|api\|secret\|token"
# Expected: 0 results

# 3. No URL key exposure
grep -rn "searchParams\|hash" frontend/src/ai-copilot/ | grep -i "key\|api\|secret\|token"
# Expected: 0 results

# 4. Output validation applied
grep -rn "validateOutput\|blockedPattern\|safetyCheck" frontend/src/ai-copilot/
# Expected: references in provider adapter code

# 5. Viewer restriction enforced
grep -rn "viewer\|isViewer\|canWrite" frontend/src/ai-copilot/
# Expected: references in settings UI component

# 6. i18n key parity
grep -c "aiCopilot\." frontend/src/i18n/en.ts
grep -c "aiCopilot\." frontend/src/i18n/zhTW.ts
# Expected: same count
```

## Test Coverage Requirements

| Domain | Minimum Tests | Description |
|--------|--------------|-------------|
| Provider interface | 5 | Mock provider implements all interface methods |
| Provider registry | 3 | Registration, lookup, unknown provider handling |
| Mock provider | 5 | Deterministic responses for each input category |
| Config validation | 4 | Valid config, missing key, invalid format, empty |
| Output validation | 10 | Each blocked pattern type + clean response pass |
| Fallback mechanism | 6 | Each failure mode triggers correct fallback |
| Viewer restrictions | 4 | Settings disabled, tooltip, component guard, service guard |
| Key lifecycle | 5 | Set, clear, unmount cleanup, no persistence, no export |
| i18n | 3 | Key parity, no hardcoded strings, EN+zh-TW rendering |
| **Total** | **45+** | |

## Grep Guardrail Commands

Run these commands before every release to verify guardrails are intact:

```bash
# Guard 1: No external API calls outside of provider adapter
grep -rn "fetch\|axios\|XMLHttpRequest" frontend/src/ai-copilot/ \
  | grep -v "provider" | grep -v "test" | grep -v "__mock__"
# Expected: 0 results (all external calls go through provider adapter)

# Guard 2: No auto-save from AI responses
grep -rn "autoSave\|auto.*save" frontend/src/ai-copilot/ | grep -v "false\|disable\|prevent"
# Expected: 0 results

# Guard 3: No Firestore writes from AI copilot
grep -rn "setDoc\|updateDoc\|addDoc\|deleteDoc" frontend/src/ai-copilot/ \
  | grep -v "test" | grep -v "__mock__"
# Expected: 0 results

# Guard 4: No formula modification
grep -rn "modifyFormula\|changeFormula\|editFormula\|overrideCalc" frontend/src/ai-copilot/
# Expected: 0 results

# Guard 5: No key in exports
grep -rn "apiKey\|api_key\|secretKey\|secret_key" frontend/src/ai-copilot/ \
  | grep -i "export\|download\|clipboard\|copy"
# Expected: 0 results
```

## Manual Testing Steps

### Test 1: Mock Provider End-to-End

1. Open the AI Copilot panel
2. Select "Mock" as the provider
3. Type a question about capacity utilization
4. Verify a deterministic mock response is shown
5. Verify F-A-I-R tags are present
6. Verify confidence indicator is displayed
7. Verify source references are shown

### Test 2: Provider Settings UI

1. Open Provider Settings
2. Verify the session-only warning is displayed
3. Verify the no-server warning is displayed
4. Enter a test API key
5. Verify the key is masked (password input)
6. Click the reveal toggle
7. Verify the key is visible
8. Click "Clear Key"
9. Verify the key field is empty
10. Verify confirmation toast appears

### Test 3: Viewer Cannot Configure

1. Log in as a viewer
2. Navigate to the AI Copilot panel
3. Verify Provider Settings button is disabled
4. Hover over the disabled button
5. Verify tooltip says viewers cannot configure providers

### Test 4: Fallback on Failure

1. Configure the mock provider
2. Submit a query that triggers a simulated failure
3. Verify a deterministic fallback response appears
4. Verify the response includes a caveat about the provider failure
5. Verify the response is still useful (deterministic analysis is shown)

### Test 5: Blocked Pattern Detection

1. Configure the mock provider
2. Submit a query designed to elicit a blocked response (e.g., "tell me to save this data")
3. Verify the response is blocked
4. Verify a safety fallback message is shown
5. Verify no blocked content reaches the user

## Sign-Off Template

```
V1.40 AI Provider Adapter Release Sign-Off
==========================================

Date: _______________
Reviewer: _______________

Architecture:
  [ ] Provider interface complete
  [ ] Mock provider verified
  [ ] BYOK placeholder defined (not enabled)
  [ ] Routing priority verified

Security:
  [ ] Key persistence grep: 0 results
  [ ] Key export grep: 0 results
  [ ] Viewer restriction verified
  [ ] Key lifecycle verified

Output Validation:
  [ ] All blocked patterns tested
  [ ] F-A-I-R classification verified
  [ ] Fallback mechanism verified

Testing:
  [ ] Unit tests: ___/45+ passing
  [ ] Integration tests: all passing
  [ ] Manual tests: all passing
  [ ] Grep guardrails: all passing

i18n:
  [ ] EN keys: ___
  [ ] zh-TW keys: ___
  [ ] Parity: YES / NO

Build:
  [ ] npm run test: PASS
  [ ] npm run lint: PASS
  [ ] npm run build: PASS

Sign-off: _______________
```
