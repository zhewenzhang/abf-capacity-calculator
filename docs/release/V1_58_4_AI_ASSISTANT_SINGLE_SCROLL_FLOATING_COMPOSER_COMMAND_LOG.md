# v1.58.4 AI Assistant Single Scroll Layout + Floating Composer

## 1. Baseline Commit

```
5ee609c docs: add v1.58 AI assistant conversational analytics command log
```

Branch: `xiaomi/v1-58-4-ai-assistant-single-scroll-floating-composer`

---

## 2. Current Multi-Scrollbar Analysis

| # | Scroll Source | File |
|---|--------------|------|
| 1 | `.twk-page` with maxWidth + margin auto | `AiCopilot.tsx` |
| 2 | Messages area `overflow-y: auto` | `CopilotChat.tsx` |
| 3 | Ant Card internal structure | `CopilotMessage.tsx` (Card component) |
| 4 | Browser window scrolling (when content exceeds viewport) | App layout |

**Root cause**: No single scroll container. The page wrapper, chat area, and card components each create independent scroll contexts.

---

## 3. New Layout Design

```
.ai-assistant-page (full viewport, overflow: hidden)
  └── .ai-assistant-shell (grid rows: auto 1fr auto)
       ├── Top bar (model status, fixed height)
       ├── .ai-chat-main-scroll (SINGLE scroll container, flex: 1, overflow-y: auto)
       │   ├── Empty state / Messages
       │   └── padding-bottom: 148px (space for floating composer)
       └── .ai-floating-composer (sticky bottom, gradient overlay)
            └── TextArea + Send button
```

**Changes**:
- Remove `twk-page` wrapper, `twk-page-header`, `twk-page-subtitle`
- Remove redundant Ant Card wrapper around messages
- Single overflow container: `.ai-chat-main-scroll`
- Floating composer: sticky, z-index, gradient fade-up
- Thread padding-bottom to prevent message occlusion
- Wider max-width: 1040px messages, 900px composer

---

## 4. Modified Files

| File | Change |
|------|--------|
| `frontend/src/pages/AiCopilot.tsx` | Full viewport, no page header, overflow hidden |
| `frontend/src/components/copilot/CopilotChat.tsx` | Single scroll, floating composer, wider layout |
| `frontend/src/components/copilot/CopilotMessage.tsx` | Remove internal overflow, no Card wrapper |
| `frontend/src/components/copilot/CopilotChat.test.tsx` | Layout tests for single scroll + floating composer |
| `frontend/src/App.tsx` | Version v1.58.4 |
| `frontend/src/services/snapshotService.ts` | Version v1.58.4 |
| `frontend/package.json` | Version v1.58.4 |
| `docs/release/..._COMMAND_LOG.md` | This file |

---

## 5. Test / Lint / Build Results

```
<!-- Filled in -->
```

---

## 6. Redline Check

| File | Status |
|------|--------|
| `firestore.rules` | Unchanged |
| `calculationEngine.ts` | Unchanged |

---

## 7. Deploy

```
<!-- Filled in -->
```

---

## 8. Commit

```
Commit hash: <!-- Filled in -->
Branch: xiaomi/v1-58-4-ai-assistant-single-scroll-floating-composer
```

---

## 9. Final Report (Chinese)

```
<!-- Filled in -->
```
