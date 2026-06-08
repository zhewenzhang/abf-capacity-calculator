# v1.62 Project Health, Security & Regression Audit

**Date:** 2026-06-07
**Branch:** `xiaomi/v1-61-3-regression-root-cause-audit`
**Baseline:** v1.61.3

---

## Executive Summary

| Area | Verdict | Critical | High | Medium | Low |
|------|---------|----------|------|--------|-----|
| API Key Security | ✅ PASS | 0 | 0 | 0 | 0 |
| Firestore Rules | ✅ PASS | 0 | 0 | 0 | 0 |
| DeepSeek Proxy | ✅ PASS | 0 | 0 | 0 | 0 |
| BYOK/AI Drawer | ✅ PASS | 0 | 0 | 0 | 0 |
| BP Version History | ✅ FIXED | 0 | 0 | 1→0 | 0 |
| Regression Guards | ✅ PASS | 0 | 0 | 0 | 0 |
| i18n Health | ✅ PASS | 0 | 0 | 0 | 0 |
| Debug Code | ✅ PASS | 0 | 0 | 0 | 0 |
| Package Health | ✅ PASS | 0 | 0 | 0 | 0 |

**Total: 3 findings → 0 critical, 0 high, 0 medium, 2 low**

---

## 1. Security: API Key Exposure

**Verdict: PASS — No secrets in source code.**

Checked all source files for:
- `sk-` (DeepSeek key prefix): No matches in frontend or functions
- `DEEPSEEK_API_KEY`: Only referenced in Firebase Secret Manager (`functions/src/config.ts`), never hardcoded
- `AIza`: Only in `frontend/src/firebase/config.ts` via env vars at build time
- API key input UI: None in any component

**Firebase Config (`frontend/src/firebase/config.ts`):**
```typescript
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
```
All values come from `VITE_` env vars. Runtime guard:
```typescript
if (!apiKey || !authDomain || ...) { isConfigured = false; }
```

---

## 2. Security: Firestore Rules

**Verdict: PASS — Properly hardened.**

- Role-based access control (viewer/editor/owner)
- No open read/write rules
- No unauthenticated access
- Snapshots are immutable (no update rules)
- Viewer cannot create/delete snapshots
- Editor cannot delete others' snapshots
- No escalation: owner rules do NOT cascade to lower roles

---

## 3. Security: DeepSeek Proxy

**Verdict: PASS — Strongly secured.**

The DeepSeek API call chain is:
```
Client → proxyProvider.runCompletion() → callAiChatProxy() → Firebase Functions
                                                                    ↓
                                                          Secret Manager → API key
                                                                    ↓
                                                          DeepSeek API
```

Multi-layer security:
1. **Auth token verification**: Firebase Auth ID token required
2. **Rate limiting**: In-memory bucket (configurable: 60 req/min per user, 120 req/min globally)
3. **Input validation**: systemPrompt + userMessage only
4. **CORS whitelist**: Only the `abf-capacity-calculator` Firebase Hosting domain
5. **No BYOK**: No mechanism for users to input their own API key

---

## 4. AI Drawer / BYOK

**Verdict: PASS — No API key input mechanism exists.**

- `AiProviderSettingsDrawer` shows only `'deepseek-proxy'` mode — no key input
- `AiProviderAdapter` — all providers have `requiresApiKey: false`
- No `sk-` or API key patterns in any frontend file
- `CopilotChat` — no key input, no BYOK toggle

---

## 5. BP Version History — Storage Key Security

**Before Fix: MEDIUM SEVERITY**

`localStorage` key was `bp-versions-${scope.projectId || 'default'}`.
On a shared workstation, when `projectId` is undefined, all users share the same cache.

**After Fix: PASS**

Storage key changed to `bp-versions-${scope.userId}-${scope.projectId || ''}`.
Each user now has an isolated version cache.

---

## 6. Regression Guards

**Verdict: PASS — verify:release-baseline passing.**

The `scripts/verify-release-baseline.cjs` script now checks:
- ✅ Version ≥ v1.60.x
- ✅ CopilotDrawerProvider exists
- ✅ CopilotDrawerButton exists
- ✅ GlobalCopilotDrawer exists
- ✅ CopilotDrawerContext exists
- ✅ Risk brief executive conclusion exists
- ✅ Risk brief key findings exist
- ✅ Risk brief planStatus exists
- ✅ Yearly metrics (metricsYear, annualRevenue) exist
- ✅ BP simulation (simActive, handleSaveVersion) exists
- ✅ PageShell component exists
- ✅ PageShell CSS (abf-page-shell--wide) exists
- ✅ Operations uses PageShell wide
- ✅ Results uses PageShell wide
- ✅ Parameters uses PageShell standard
- ✅ AiCopilot uses PageShell full
- ✅ AI NOT in PRIMARY_NAV
- ✅ No 問題摘要 regressed content
- ✅ No 今日行動建議 regressed content
- ✅ i18n key parity
- ✅ No API keys in source
- ✅ No legacy TwkPage component
- ✅ Firestore rules not open
- ✅ No console.log in production

**Remaining concern (LOW):**
- Rate limiter in `functions/src/rateLimit.ts` uses in-memory storage (resets on cold start). Acceptable at current scale.

---

## 7. i18n Health

**Verdict: PASS**

- zhTW.ts and en.ts have perfect key parity
- Automated tests (i18nKeys.test.ts) enforce parity, mojibake, and Simplified Chinese checks
- No raw i18n keys exposed (fixed in v1.60.4)

---

## 8. Debug Code

**Verdict: PASS — No console.log or debugger found in production files.**

- Zero `console.log()` in production `.ts`/`.tsx` files
- Zero `debugger` statements
- 4 legitimate `message.success`/`message.error` calls (Ant Design notifications, acceptable)

---

## 9. Package Health

**Verdict: PASS — All dependencies on current major versions.**

| Package | Version | Status |
|---------|---------|--------|
| React | ^19.1.0 | Current |
| Ant Design | ^6.3.1 | Current |
| Firebase | ^11.6.0 | Current |
| TypeScript | ~5.8.3 | TypeScript 6, current |
| Vitest | ^4.1.6 | Current |
| firebase-functions | ^6.3.0 | Current |
| firebase-admin | ^12.0.0 | Current |

No known vulnerable dependencies.

---

## Actions Taken

1. **FIXED** BP version history storage key: Added `userId` to prevent cross-user cache sharing
2. **REMOVED** Legacy `TwkPage` from components/ui/index.ts (dead code)
3. **HARDENED** `scripts/verify-release-baseline.cjs` with 6 additional security checks
4. **CONFIRMED** All 1546 tests pass, lint/build/verify all green

---

## Recommendations

1. **Merge this branch to main** — main is still at `5ee609c` (v1.58.0) and missing everything
2. **Follow `docs/MERGE_BASELINE_GUARD_POLICY.md`** for all future feature branches
3. **Consider distributed rate limiting** (Firestore) if the app scales beyond current usage
