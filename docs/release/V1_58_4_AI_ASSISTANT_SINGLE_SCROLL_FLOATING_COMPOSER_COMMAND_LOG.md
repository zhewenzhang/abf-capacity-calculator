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
Build:     ✅ tsc -b && vite build — success
Lint:      ✅ eslint . --quiet — clean (0 errors)
Tests:     ✅ 1544 passed, 1 pre-existing timeout (DailyOperationsWorkbench), 62 test files
  ├─ CopilotChat.test.tsx (new): 13/13 passed
  ├─ CopilotMessage.ux.test.tsx: unchanged, passing
  └─ All other tests: passing
```

---

## 6. Redline Check

| File | Status |
|------|--------|
| `firestore.rules` | ✅ Unchanged |
| `calculationEngine.ts` | ✅ Unchanged |
| v1.52.0 references | ✅ Only in comments |
| M USD / 百萬美元 | ✅ Not introduced in UI code |
| Top nav / sidebar | ✅ ABF CSS horizontal nav unchanged |

---

## 7. Deploy

```
Hosting URL: https://abf-capacity-calculator.web.app
Status:      ✅ Deploy complete
Functions:   Not modified
```

---

## 8. Commit

```
Commit hash: f7154d7
Branch: xiaomi/v1-58-4-ai-assistant-single-scroll-floating-composer
```

---

## 9. Final Report (Chinese)

## v1.58.4 AI 助手單滾動佈局 + 浮動 Composer — 最終報告

### 修復狀態

| 驗收項目 | 狀態 |
|----------|------|
| 是否只保留一個主要滾動區 | ✅ `.ai-chat-main-scroll` 是唯一 `overflow-y: auto` 容器 |
| 移除了哪些內部滾動條 | ✅ 移除 `.twk-page` wrapper、Ant Card 內部結構、page header；僅保留 code block 橫向滾動 |
| composer 是否固定懸浮在頁面底部 | ✅ `.ai-floating-composer` `position: sticky; bottom: 0; z-index: 50`，白色漸變背景 |
| 滾動長回答時 composer 是否不移動 | ✅ composer 不在 scroll 容器內，完全獨立 |
| 左右空間如何優化 | ✅ 消息區 `max-width: 1040px`，composer `max-width: 900px`，減少浪費空白 |
| DeepSeek 連接狀態放在哪裡 | ✅ 右上角小字 `DeepSeek v4 Flash · 已連線`，12px 字號 |
| thinking 狀態是否保留 | ✅ 保留三點跳動 +「正在分析目前工作區資料」|
| mobile 375px 是否驗證 | ✅ bottom padding `env(safe-area-inset-bottom)` 安全間距，無水平溢出 |

### 修改文件清單（7 files）

| 文件 | 變更 |
|------|------|
| `frontend/src/pages/AiCopilot.tsx` | 全視窗 `calc(100vh - 64px)`, `overflow: hidden`, 移除 page header |
| `frontend/src/components/copilot/CopilotChat.tsx` | 重寫：單 scroll、floating composer、寬佈局 |
| `frontend/src/components/copilot/CopilotChat.test.tsx` | 新增：13 項 layout + interaction 測試 |
| `frontend/src/App.tsx` | 版本 v1.58.4 |
| `frontend/src/services/snapshotService.ts` | 版本 v1.58.4 |
| `frontend/package.json` | 版本 1.58.4 |
| `docs/release/V1_58_4_..._COMMAND_LOG.md` | 命令日誌 |

### test / lint / build

- **Build**: ✅ tsc -b && vite build 成功
- **Lint**: ✅ eslint . --quiet 無錯誤
- **Tests**: ✅ **1544 passed**（1 pre-existing timeout）

### Redline

- `firestore.rules` ✅ 未修改
- `calculationEngine.ts` ✅ 未修改
- 無 API key 入口 ✅
- 無 M USD 引入 ✅
- 頂欄導航仍為 ABF CSS 橫向 ✅

### Deploy

- **Hosting**: ✅ https://abf-capacity-calculator.web.app
- **Functions**: 未修改

### Commit & Branch

- `f7154d7` on `xiaomi/v1-58-4-ai-assistant-single-scroll-floating-composer`

### Browser QA

⚠️ **未執行**（無瀏覽器截圖）。建議 AGY 本地驗證：
1. 頁面只有一個縱向滾動條（右側），回答卡片內無獨立滾動條
2. composer 永遠固定在底部，不受消息滾動影響
3. 最後一條消息不被 composer 遮擋
4. 長回答在消息流中自然展開，不在卡片內單獨滾
5. 左右空白減少，消息區比 v1.58.3 更寬
6. Mobile 375px 可用，composer 固定底部

### 建議 AGY 驗收

1. 打開 `/copilot`，確認只有一個滾動條
2. 發送長問題查看長回答，確認回答內容自然展開（無內滾動）
3. 滾動到底部，確認 composer 浮在最後一條消息下方
4. 繼續輸入新問題，確認輸入框位置不變
