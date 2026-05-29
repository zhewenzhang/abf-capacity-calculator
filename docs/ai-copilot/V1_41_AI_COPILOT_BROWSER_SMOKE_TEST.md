# v1.41.0 AI Copilot Reliability Marathon -- Browser Smoke Test

> **Version**: v1.41.0
> **Status**: Active
> **Test Environment**: Local Dev (`npm run dev` in `frontend/`)
> **Prerequisites**: Node.js 18+, `.env.local` with Firebase credentials
> **Estimated Execution Time**: 60 minutes
> **Dev Server URL**: `http://localhost:5173/`

---

## Test Results Summary

| Phase | Test Block | Result |
|:---:|:---|:---:|
| A | Setup and Dev Server Startup | [ ] Pass [ ] Fail |
| B | Owner / Editor / Viewer Role Tests | [ ] Pass [ ] Fail |
| C | Language Tests (English / Traditional Chinese) | [ ] Pass [ ] Fail |
| D | Provider Mode Tests (Local / Mock / External BYOK) | [ ] Pass [ ] Fail |
| E | Unsafe Output Blocked | [ ] Pass [ ] Fail |
| F | Evidence Display (Source References) | [ ] Pass [ ] Fail |
| G | Export Prompt Pack | [ ] Pass [ ] Fail |
| H | Quick Action Buttons | [ ] Pass [ ] Fail |
| I | Validation Warnings (Causality Claims) | [ ] Pass [ ] Fail |
| J | Answer Status Tags | [ ] Pass [ ] Fail |
| K | "Why this answer?" Section | [ ] Pass [ ] Fail |

**Final Verdict**: [ ] All Pass -- Ready for Acceptance [ ] Failures Found -- Fix and Retest

---

## Phase A: Setup and Dev Server Startup

### A-1: Environment Setup

| Step | Action | Expected Result | Pass/Fail |
|:---:|:---|:---|:---:|
| A-1.1 | Verify `frontend/.env.local` exists with Firebase credentials | File exists with all 6 `VITE_FIREBASE_*` vars populated | [ ] |
| A-1.2 | Run `cd frontend && npm install` | Install completes without errors | [ ] |
| A-1.3 | Run `cd frontend && npm run dev` | Vite starts, prints `Local: http://localhost:5173/` | [ ] |
| A-1.4 | Open `http://localhost:5173/` in browser | App loads, shows login page or dashboard | [ ] |
| A-1.5 | Check browser console for errors | No red errors on initial load | [ ] |

### A-2: Login and Navigation

| Step | Action | Expected Result | Pass/Fail |
|:---:|:---|:---|:---:|
| A-2.1 | Sign in with Google account | Login succeeds, dashboard loads | [ ] |
| A-2.2 | Navigate to Results page | Results page renders with calculation data | [ ] |
| A-2.3 | Locate CopilotChat component | Copilot panel visible on Results page (or via AI Copilot menu) | [ ] |
| A-2.4 | Check header disclaimer banner | Shows "Deterministic local assistant -- No external AI connected" (EN) or equivalent | [ ] |

---

## Phase B: Owner / Editor / Viewer Role Tests

### B-1: Owner Role

| Step | Action | Expected Result | Pass/Fail |
|:---:|:---|:---|:---:|
| B-1.1 | Log in as workspace Owner | CopilotChat renders normally | [ ] |
| B-1.2 | Verify Provider Settings button enabled | Settings button is clickable | [ ] |
| B-1.3 | Click a quick action button (e.g., "Data Problems") | Response appears with fix recommendations visible | [ ] |
| B-1.4 | Verify no viewer warning banner | No "Fix suggestions are not available in viewer mode" banner | [ ] |
| B-1.5 | Type a free-text question and submit | Response renders with all FAIR sections (Fact/Assumption/Inference/Recommendation) | [ ] |

### B-2: Editor Role

| Step | Action | Expected Result | Pass/Fail |
|:---:|:---|:---|:---:|
| B-2.1 | Log in as workspace Editor | CopilotChat renders normally | [ ] |
| B-2.2 | Verify Provider Settings button enabled | Settings button is clickable | [ ] |
| B-2.3 | Click "Suggest Fixes" quick button | Fix recommendations visible (not blocked) | [ ] |
| B-2.4 | Verify no viewer warning banner | No "Fix suggestions are not available in viewer mode" banner | [ ] |

### B-3: Viewer Role

| Step | Action | Expected Result | Pass/Fail |
|:---:|:---|:---|:---:|
| B-3.1 | Log in as workspace Viewer | CopilotChat renders with warning banner | [ ] |
| B-3.2 | Check warning banner text | Shows "Fix suggestions are not available in viewer mode" | [ ] |
| B-3.3 | Verify Provider Settings button disabled | Settings button is grayed out / disabled | [ ] |
| B-3.4 | Click "Data Problems" quick button | Response appears, but recommendations section is empty or shows viewer notice | [ ] |
| B-3.5 | Click "Suggest Fixes" quick button | Response shows blocked confidence with viewer message | [ ] |
| B-3.6 | Verify CopilotMessage hides recommendations | `showFixes={false}` -- no green recommendation tags visible | [ ] |
| B-3.7 | Type a free-text question | Answer renders but fix/recommendation tags are hidden | [ ] |

---

## Phase C: Language Tests

### C-1: English

| Step | Action | Expected Result | Pass/Fail |
|:---:|:---|:---|:---:|
| C-1.1 | Set language to English (header dropdown) | UI switches to English | [ ] |
| C-1.2 | Check disclaimer text | "Deterministic local assistant -- No external AI connected" | [ ] |
| C-1.3 | Check quick button labels | "Data Problems", "Capacity Risk", "BP Gap", "Suggest Fixes", "Scenario Impact", "Look Ahead" | [ ] |
| C-1.4 | Click "Data Problems" | Response title, facts, assumptions, inferences, recommendations all in English | [ ] |
| C-1.5 | Check confidence tag | Shows "High Confidence" / "Medium Confidence" / "Low Confidence" / "Blocked" | [ ] |
| C-1.6 | Check FAIR label tags | Blue "Fact", orange "Assumption", purple "Inference", green "Recommendation" tags | [ ] |
| C-1.7 | Check input placeholder | "Ask about your data..." | [ ] |

### C-2: Traditional Chinese

| Step | Action | Expected Result | Pass/Fail |
|:---:|:---|:---|:---:|
| C-2.1 | Set language to Traditional Chinese | UI switches to Traditional Chinese | [ ] |
| C-2.2 | Check disclaimer text | "本地確定性分析工具 -- 未連接外部 AI" | [ ] |
| C-2.3 | Check quick button labels | "資料問題", "產能風險", "BP 差距", "建議修復", "情境影響", "前瞻分析" | [ ] |
| C-2.4 | Click "資料問題" | Response title and body in Traditional Chinese | [ ] |
| C-2.5 | Check confidence tag | Shows "高信心度" / "中信心度" / "低信心度" / "已封鎖" | [ ] |
| C-2.6 | Check FAIR label tags | "事實", "假設", "推論", "建議" | [ ] |
| C-2.7 | Check input placeholder | "詢問您的資料問題..." | [ ] |
| C-2.8 | Check provider settings drawer | All labels in Traditional Chinese: "供應商設定", "本地確定性分析", "模擬供應商（測試用）", "外部 BYOK（未啟用）" | [ ] |

---

## Phase D: Provider Mode Tests

### D-1: Local Mode (Default)

| Step | Action | Expected Result | Pass/Fail |
|:---:|:---|:---|:---:|
| D-1.1 | Open Provider Settings drawer | Drawer slides in from right | [ ] |
| D-1.2 | Verify "Local Deterministic" is selected | Radio button selected, green tag "Local Deterministic" visible in header | [ ] |
| D-1.3 | Close drawer, click any quick button | Response appears, no "Mock Response" tag | [ ] |
| D-1.4 | Type a keyword-matching question (e.g., "capacity risk") | Keyword router matches to explainCapacityRisk tool | [ ] |
| D-1.5 | Type an unrecognized question (e.g., "hello") | Returns "unknown" tool result suggesting Export Prompt Pack | [ ] |

### D-2: Mock Mode

| Step | Action | Expected Result | Pass/Fail |
|:---:|:---|:---|:---:|
| D-2.1 | Open Provider Settings, select "Mock Provider" | Radio switches, blue tag "Mock Provider" visible in header | [ ] |
| D-2.2 | Verify info alert appears | "Mock provider returns deterministic test responses. No real AI calls are made." | [ ] |
| D-2.3 | Close drawer, submit a question | Response includes "Mock Response" blue tag on the message card | [ ] |
| D-2.4 | Check caveats section | Includes "Mock provider enhanced response available" caveat | [ ] |
| D-2.5 | Verify deterministic tools still primary | Same tool result as local mode, with mock metadata appended | [ ] |

### D-3: External BYOK Mode

| Step | Action | Expected Result | Pass/Fail |
|:---:|:---|:---|:---:|
| D-3.1 | Open Provider Settings drawer | Drawer shows three radio options | [ ] |
| D-3.2 | Check "External BYOK" radio | Radio is disabled with tooltip "External provider is not enabled in this build." | [ ] |
| D-3.3 | Verify red tag in header | "External (Disabled)" red tag visible | [ ] |
| D-3.4 | If somehow selected, submit a question | Response blocked with "External provider is not enabled in this build." caveat | [ ] |
| D-3.5 | Verify BYOK key input | Input field is disabled, "Session Only" label visible | [ ] |
| D-3.6 | Verify Clear Key button | Button is disabled | [ ] |

---

## Phase E: Unsafe Output Blocked

### E-1: Forbidden Claims (Write-Action Hallucinations)

| Step | Action | Expected Result | Pass/Fail |
|:---:|:---|:---|:---:|
| E-1.1 | Trigger a tool whose output would contain "I saved the changes" | Output is blocked; summary replaced with "[Content blocked by safety validation]" | [ ] |
| E-1.2 | Check confidence tag | Shows "Blocked" (red) | [ ] |
| E-1.3 | Check blocked reason alert | Red alert with "AI cannot claim to save data" or similar | [ ] |
| E-1.4 | Verify Export Prompt Pack button appears | Button visible for blocked responses | [ ] |

**How to trigger**: The output validation layer (`aiCopilotOutputValidation.ts`) runs on ALL responses. To test blocking, you would need to mock the tool output to include forbidden text. In normal operation, the deterministic tools never produce blocked content. The validation acts as a safety net for future provider integrations.

**Automated verification**: Run `npm run test` -- the `CopilotChat.validation.test.ts` suite covers:
- "I saved the changes" -> blocked
- "I guessed missing data" -> blocked
- "USD revenue equals BP target" -> blocked
- "I estimated the value" -> blocked
- "auto-save to Firestore" -> blocked

### E-2: Missing Data Guessing

| Step | Action | Expected Result | Pass/Fail |
|:---:|:---|:---|:---:|
| E-2.1 | Verify tool output never claims to guess data | suggestDataFixes says "需用戶輸入，系統無法猜測" | [ ] |
| E-2.2 | Check caveats include "不猜測缺失數據的具體值" | Caveat present in suggestDataFixes output | [ ] |

### E-3: Formula Modification Claims

| Step | Action | Expected Result | Pass/Fail |
|:---:|:---|:---|:---:|
| E-3.1 | Verify no tool output claims formula changes | All tools are pure functions with no side effects | [ ] |
| E-3.2 | Check Network panel during copilot interaction | No Firestore write requests | [ ] |

---

## Phase F: Evidence Display (Source References)

### F-1: Source References Panel

| Step | Action | Expected Result | Pass/Fail |
|:---:|:---|:---|:---:|
| F-1.1 | Click "Data Problems" quick button | Response card appears | [ ] |
| F-1.2 | Locate collapsible "Source (N)" panel | Panel exists below the FAIR sections | [ ] |
| F-1.3 | Expand the source panel | Lists source references (e.g., "dataQuality module", "DQ issue: sku-zero-price-... [SKU]") | [ ] |
| F-1.4 | Verify reference count matches | `sourceReferences.length` matches the count shown in the collapse header | [ ] |
| F-1.5 | Click "Capacity Risk" quick button | Source panel shows capacity-specific refs (e.g., "calculationEngine + analytics", "worst month: 2026-06") | [ ] |
| F-1.6 | Click "BP Gap" quick button | Source panel shows "bpTargets module" | [ ] |

### F-2: Empty Source References

| Step | Action | Expected Result | Pass/Fail |
|:---:|:---|:---|:---:|
| F-2.1 | Trigger "unknown" tool (type unrecognized question) | No source panel rendered (sourceReferences is empty) | [ ] |
| F-2.2 | Verify confidence downgraded | Confidence should be "low" or "blocked" when sourceReferences is empty | [ ] |

---

## Phase G: Export Prompt Pack

### G-1: Export Button Visibility

| Step | Action | Expected Result | Pass/Fail |
|:---:|:---|:---|:---:|
| G-1.1 | Get a "blocked" confidence response | "Export Prompt Pack" button appears below the message | [ ] |
| G-1.2 | Get a "low" confidence response | "Export Prompt Pack" button appears below the message | [ ] |
| G-1.3 | Get a "high" or "medium" confidence response | No "Export Prompt Pack" button | [ ] |

### G-2: Export Functionality

| Step | Action | Expected Result | Pass/Fail |
|:---:|:---|:---|:---:|
| G-2.1 | Click "Export Prompt Pack" button | Prompt pack text copied to clipboard | [ ] |
| G-2.2 | Paste clipboard content | Contains structured prompt with context data, guardrails, and FAIR instructions | [ ] |
| G-2.3 | Verify no sensitive data in export | No uid, email, token, apiKey, secret, password, workspaceId, userId, ownerUid, member fields | [ ] |
| G-2.4 | Verify export metadata | Contains `_meta` with `appVersion`, `exportedAt`, `schemaVersion` | [ ] |
| G-2.5 | Verify key ordering | JSON keys are alphabetically sorted at every level | [ ] |

---

## Phase H: Quick Action Buttons

### H-1: All 6 Buttons Produce Valid Responses

| Step | Button | Tool ID | Expected Title | Pass/Fail |
|:---:|:---|:---:|:---|:---:|
| H-1.1 | Data Problems | `dataProblems` | "資料品質檢查" / "Data Quality Check" | [ ] |
| H-1.2 | Capacity Risk | `capacityRisk` | "產能風險分析" / "Capacity Risk Analysis" | [ ] |
| H-1.3 | BP Gap | `bpGap` | "BP 達成差距分析" / "BP Gap Analysis" | [ ] |
| H-1.4 | Suggest Fixes | `suggestFixes` | "數據修復建議" / "Data Fix Suggestions" | [ ] |
| H-1.5 | Scenario Impact | `scenarioImpact` | "情境影響分析" / "Scenario Impact Analysis" | [ ] |
| H-1.6 | Look Ahead | `lookAhead` | "前瞻性焦點分析" / "Look-Ahead Focus Analysis" | [ ] |

### H-2: Response Structure Validation

For each quick button response, verify:

| Step | Check | Expected | Pass/Fail |
|:---:|:---|:---|:---:|
| H-2.1 | `toolName` tag | Blue geek-colored tag with tool ID | [ ] |
| H-2.2 | `title` | Bold text next to toolName tag | [ ] |
| H-2.3 | Confidence tag | Color-coded: green (high), orange (medium), red (low/blocked) | [ ] |
| H-2.4 | Summary paragraph | Non-empty text paragraph | [ ] |
| H-2.5 | Facts section | Blue tags with fact text | [ ] |
| H-2.6 | Assumptions section | Orange tags with assumption text | [ ] |
| H-2.7 | Inferences section | Purple tags with inference text | [ ] |
| H-2.8 | Recommendations section | Green tags (hidden for viewers) | [ ] |
| H-2.9 | Caveats section | Warning alerts with caveat text | [ ] |
| H-2.10 | Source panel | Collapsible panel with reference count | [ ] |

---

## Phase I: Validation Warnings (Causality Claims)

### I-1: Causality Warning (Not Block)

| Step | Action | Expected Result | Pass/Fail |
|:---:|:---|:---|:---:|
| I-1.1 | Trigger output containing "caused by customer" pattern | Response renders (not blocked) | [ ] |
| I-1.2 | Check validation issues | Warning-level alert appears: "Causality attribution to customer detected..." | [ ] |
| I-1.3 | Verify response is NOT blocked | Confidence is not "blocked"; summary text is preserved | [ ] |
| I-1.4 | Check warning icon | Warning alert with `<WarningOutlined />` icon | [ ] |

**Automated verification**: `CopilotChat.validation.test.ts` confirms:
- "caused by customer" -> warning (not blocked)
- Original text is preserved (not sanitized)

### I-2: Other Warning-Level Validations

| Step | Action | Expected Result | Pass/Fail |
|:---:|:---|:---|:---:|
| I-2.1 | Response without FAIR labels | Warning: "Response does not contain FAIR labels..." | [ ] |
| I-2.2 | Recommendation without source reference | Warning: "Recommendation found without a source reference..." | [ ] |
| I-2.3 | USD/TWD comparison without conversion | Warning: "Direct comparison of USD to TWD/CNY without explicit conversion..." | [ ] |

---

## Phase J: Answer Status Tags

> **Implementation Status**: The i18n keys exist (`copilot.status.deterministic`, `copilot.status.mock`, `copilot.status.blocked`, `copilot.status.warning`) but are not yet wired into a dedicated UI component as of v1.40.0. The confidence tag on each message card serves a similar purpose. This section documents the expected behavior once the feature is fully implemented.

### J-1: Current Confidence Tag Behavior

| Step | Action | Expected Result | Pass/Fail |
|:---:|:---|:---|:---:|
| J-1.1 | Normal local tool response | Green tag "High Confidence" or orange "Medium Confidence" | [ ] |
| J-1.2 | Low-confidence response (no source refs) | Red tag "Low Confidence" | [ ] |
| J-1.3 | Blocked response | Red tag "Blocked" | [ ] |
| J-1.4 | Mock mode response | Blue "Mock Response" tag appears alongside confidence tag | [ ] |

### J-2: Planned Answer Status Tags (v1.41+)

| Step | Tag | Expected Behavior | Pass/Fail |
|:---:|:---|:---|:---:|
| J-2.1 | Deterministic | Shown when response comes from local tools | [ ] N/A |
| J-2.2 | Mock | Shown when mock provider is active | [ ] N/A |
| J-2.3 | Blocked | Shown when output validation blocks the response | [ ] N/A |
| J-2.4 | Warning | Shown when validation issues are warning-level | [ ] N/A |

---

## Phase K: "Why this answer?" Section

> **Implementation Status**: The i18n keys exist (`copilot.whyThisAnswer`, `copilot.why.toolUsed`, `copilot.why.dataAnalyzed`, `copilot.why.caveats`, `copilot.why.validationStatus`, `copilot.why.validationPassed`, `copilot.why.validationWarning`) but the expandable UI section is not yet implemented in `CopilotMessage.tsx` as of v1.40.0. This section documents the expected behavior once the feature is built.

### K-1: Planned "Why this answer?" Behavior

| Step | Action | Expected Result | Pass/Fail |
|:---:|:---|:---|:---:|
| K-1.1 | Locate expandable section on each message card | "Why this answer?" link/button below the main content | [ ] N/A |
| K-1.2 | Expand the section | Shows: Tool used, Data analyzed, Caveats, Validation status | [ ] N/A |
| K-1.3 | Check "Tool used" | Displays the toolName (e.g., "inspectDataQuality") | [ ] N/A |
| K-1.4 | Check "Data analyzed" | Lists the sourceReferences | [ ] N/A |
| K-1.5 | Check "Caveats" | Lists the caveats array | [ ] N/A |
| K-1.6 | Check "Validation status" | "No issues detected" or "{count} issue(s) detected" | [ ] N/A |

---

## Automated Test Verification

Before manual browser testing, run the automated test suite to confirm core logic:

```bash
cd frontend && npm run test
```

Key test files that validate the smoke test scenarios:

| Test File | Covers |
|:---|:---|
| `src/components/copilot/CopilotChat.validation.test.ts` | Output validation wiring (blocked/warning/pass) |
| `src/core/aiCopilotOutputValidation.test.ts` | All 8 validation rules in isolation |
| `src/core/aiCopilotGuardrails.test.ts` | 10 red lines, sensitive key detection |
| `src/core/aiCopilotTools.test.ts` | 6 deterministic tools, keyword router |
| `src/core/aiCopilotExport.test.ts` | Sanitization, key ordering, metadata |
| `src/core/aiCopilotContext.test.ts` | Context builder, sanitization, array caps |
| `src/core/aiCopilotViewer.test.ts` | Viewer role blocking |
| `src/core/aiProviderAdapter.test.ts` | Mock/External provider adapters |
| `src/core/aiProviderSecurity.test.ts` | BYOK security model |
| `src/core/aiCopilotProviderRedTeam.test.ts` | Red team adversarial scenarios |
| `src/i18n/i18nKeys.test.ts` | All i18n keys present in both languages |
| `src/i18n/i18nOutputs.test.ts` | Output text validation |

---

## Test Report Template

### Test Execution Info

| Field | Content |
|:---|:---|
| Test Date | 2026-__-__ |
| Tester | |
| Branch | agy/v1-40-ai-provider-adapter-review |
| Browser | |
| OS | Windows 11 |
| Node Version | |
| Dev Server | http://localhost:5173/ |

### Failure Log

| Phase | Step ID | Failure Description | Severity | Repro Steps |
|:---|:---|:---|:---|:---|
| | | | [ ] Critical [ ] High [ ] Medium | |

### Test Conclusion

- **Pass Condition**: All phases A through I pass (J and K are N/A until implemented)
- **Block Condition**: Any Critical failure or safety test (Phase E) failure
- **Final Verdict**: [ ] Pass [ ] Fail

---

## Architecture Notes

### Component Hierarchy

```
AiCopilotPage (standalone) / CalculationResults (embedded)
  -> CopilotChat
       -> AiProviderStatusTag (mode indicator)
       -> CopilotQuickButtons (6 quick actions)
       -> CopilotMessage (per-response card)
            -> Facts / Assumptions / Inferences / Recommendations (FAIR tags)
            -> Source References (collapsible)
            -> Caveats (warning alerts)
            -> Validation Issues (warning alerts)
            -> Blocked Reason (error alert)
       -> AiProviderSettingsDrawer (provider mode selector)
```

### Provider Modes

| Mode | Color | Behavior |
|:---|:---|:---|
| `local` (default) | Green | Deterministic tools only, keyword routing |
| `mock` | Blue | Deterministic tools + mock provider metadata |
| `external-byok` | Red (disabled) | Blocked in current build |

### Output Validation Pipeline

```
User Input -> routeQuestion() / runTool()
  -> CopilotToolResult
  -> validateProviderOutput(summary, { confidence })
     -> 8 validators: FAIR labels, source refs, forbidden claims,
        currency/BP rules, write actions, causality, confidence downgrade, guessing
     -> status: 'pass' | 'warning' | 'blocked'
     -> if blocked: sanitize to "[Content blocked by safety validation]"
  -> CopilotMessage renders with validation issues
```

### Key Source Files

| File | Purpose |
|:---|:---|
| `frontend/src/components/copilot/CopilotChat.tsx` | Main chat component |
| `frontend/src/components/copilot/CopilotMessage.tsx` | Individual message card |
| `frontend/src/components/copilot/CopilotQuickButtons.tsx` | 6 quick action buttons |
| `frontend/src/components/copilot/AiProviderSettingsDrawer.tsx` | Provider mode drawer |
| `frontend/src/components/copilot/AiProviderStatusTag.tsx` | Mode indicator tag |
| `frontend/src/core/aiCopilotTools.ts` | 6 deterministic tools + keyword router |
| `frontend/src/core/aiCopilotOutputValidation.ts` | Post-generation validation layer |
| `frontend/src/core/aiCopilotGuardrails.ts` | 10 red lines + sensitive key detection |
| `frontend/src/core/aiCopilotContext.ts` | Context builder with sanitization |
| `frontend/src/core/aiCopilotExport.ts` | Export pack builder |
| `frontend/src/core/aiProviderAdapter.ts` | Provider adapter interface + mock/external |
| `frontend/src/i18n/en.ts` | English translations |
| `frontend/src/i18n/zhTW.ts` | Traditional Chinese translations |
