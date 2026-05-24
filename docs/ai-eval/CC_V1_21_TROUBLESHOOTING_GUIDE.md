# CC v1.21.0 AI Brief Export 卡點排查指南

本排查指南旨在幫助 CC（Claude Code）或前端團隊在實現 `v1.21.0 AI Brief Export / Prompt Pack` 主功能卡住時，能夠快速定位 TS 型別、JSON 序列化、剪貼板權限、Blob 下載、i18n parities、數據脫敏以及 UI 佈局等 7 大方向的核心卡點，並提供代碼級的解決方案。

---

## 1. TypeScript 型別錯誤 (TypeScript Typing Conflict)

### 1.1 可能症狀
編譯時報錯：`Type 'SanitizedPayload' is not assignable to type 'AnalysisContractPayload'`。或者是 optional 屬性（如 `user?: User`）在脫敏剔除時被 TS 判定可能為 `undefined`，導致後續調用屬性報錯。

### 1.2 可能根因
- 系統底層的 `AnalysisContractPayload` (v1.1) 包含了許多必填、嵌套的複雜對象。
- 脫敏處理（如 `delete payload.user`）破壞了原型的必填契約。
- 使用 `JSON.parse(JSON.stringify(payload))` 深拷貝時，會導致 Date 對象被轉換成 string，而 Map/Set/undefined 被流失，引發型別斷裂。

### 1.3 建議檢查位置
- `frontend/src/core/aiBriefExport.ts` 中執行脫敏與克隆的函數。

### 1.4 修復方向
定義一個專屬的 `SanitizedContractPayload` 接口，使用 TS 的 `Omit` 或 `Partial` 來安全放寬隱私型別約束，或在深克隆時進行明確的型別斷言：
```typescript
export interface SanitizedContractPayload extends Omit<AnalysisContractPayload, 'user' | 'workspace'> {
  user?: never; // 強制標記為不存在
  workspace?: never;
  // 其他保留的物理指標數據
}

// 脫敏時明確進行克隆與轉譯
export function sanitizePayload(payload: AnalysisContractPayload): SanitizedContractPayload {
  const cloned = JSON.parse(JSON.stringify(payload));
  delete cloned.user;
  delete cloned.workspace;
  return cloned as SanitizedContractPayload;
}
```

---

## 2. JSON 序列化與解析災難 (JSON Stringify/Parse Disaster)

### 2.1 可能症狀
- 運行時控制台報警崩潰：`TypeError: Converting circular structure to JSON`。
- 用戶拷貝外部 AI 回覆粘貼回系統，或者系統解析 AI 返回的 JSON 數據時，報錯 `SyntaxError: Unexpected token \` in JSON at position 0`。

### 2.2 可能根因
- 系統的 calculations results 數據對象中，可能無意中引用了父節點（如雙向鏈表或 React 內部的 state 對象），導致 `JSON.stringify` 發生無限遞歸循環引用。
- 外部大語言模型（LLM）在輸出 JSON 時，通常會自動加上 Markdown 的代碼包裹器（如 ` ```json ... ``` `），導致 `JSON.parse` 無法直接解析。

### 2.3 建議檢查命令
- 檢查單元測試 `aiBriefExport.test.ts` 中是否對 stringify 進行了安全斷言。

### 2.4 修復方向
- **解決循環引用**：編寫一個 replacer 函數過濾掉循環引用的 key，或者直接深克隆系統核心的 pure metrics 矩陣，不克隆 React DOM/State。
- **解決 Markdown JSON 包裹解析**：使用正則表達式在 parse 前剝離 markdown 標籤：
```typescript
export function safeParseJson<T>(rawText: string): T {
  // 正則剝離 ```json 和 ``` 標籤
  const sanitizedText = rawText
    .replace(/^```json\s*/i, '')
    .replace(/```\s*$/, '')
    .trim();
  return JSON.parse(sanitizedText) as T;
}
```

---

## 3. 剪貼板權限與兼容性 (Clipboard API Permission)

### 3.1 可能症狀
點擊“Copy”複製按鈕在 localhost 開發環境一切正常，但部署到局域網測試機或部分舊版瀏覽器後毫無反應，控制台報錯：`TypeError: Cannot read properties of undefined (reading 'writeText')`。

### 3.2 可能根因
現代瀏覽器的安全策略規定：`navigator.clipboard` 唯有在**安全上下文 (Secure Context)** 下才被定義和暴露。安全上下文指的是：
- `https://` 協議網站。
- 本地開發的 `http://localhost` 或 `http://127.0.0.1`。
- 當通過普通局域網 IP（如 `http://192.168.1.100`）訪問測試機時，`navigator.clipboard` 為 `undefined`。

### 3.3 建議檢查命令
- 在控制台輸入 `window.isSecureContext`，若為 `false` 則代表剪貼板 API 被瀏覽器安全策略禁用。

### 3.4 修復方向
在代碼中提供一個 fallback（備用）拷貝方案。當 `navigator.clipboard` 未定義時，自動啟用臨時 textarea 方案進行複製：
```typescript
export async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error("Modern copy failed, trying fallback", err);
    }
  }

  // Fallback 備用方案：適用於 HTTP / 局域網測試環境
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed"; // 避免頁面滾動
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error("Fallback copy failed", err);
    document.body.removeChild(textArea);
    return false;
  }
}
```

---

## 4. JSON 離線下載與亂碼 (Blob Download & Encoding)

### 4.1 可能症狀
點擊下載無響應，或者下載導出的 JSON 在 Windows Excel/記事本中打開時，所有中文標籤全部顯示為亂碼（亂码災難）。

### 4.2 可能根因
- 未正確釋放動態分配的 Object URL，導致前端內存泄漏。
- 導出文本中未聲明 **UTF-8 字符集或 BOM 頭**，導致部分作業系統（特別是 Windows）默認使用 ANSI 讀取，引發中文亂碼。

### 4.3 建議檢查位置
- 檢查下載觸發函數中 Blob 的聲明方式。

### 4.4 修復方向
在創建 Blob 時硬編碼注入 `\ufeff`（UTF-8 BOM 头），並及時調用 `URL.revokeObjectURL(url)` 釋放系統內存：
```typescript
export function downloadJsonFile(content: string, filename: string) {
  // 注入 \ufeff 作為 UTF-8 BOM，防範 Excel/記事本打開亂碼
  const blob = new Blob(["\ufeff" + content], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();

  // 延時釋放與清理，防止內存溢出
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}
```

---

## 5. i18n 多語言缺失與 Parity 測試挂掉 (i18n Parity Fail)

### 5.1 可能症狀
運行專案單元測試時，`i18nKeys.test.ts` 報錯掛掉，提示 `zhTW.ts` 與 `en.ts` 的 JSON 鍵值對錶結構不對稱。

### 5.2 可能根因
CC 在前端 Results Risk Brief 中增加了複制按鈕、提示彈窗或預覽面板時，只在 `zhTW.ts` 中寫了鍵（如 `riskBrief.exportButton`），漏掉了在 `en.ts` 中配齊對稱的英文 key。

### 5.3 建議檢查命令
在 `D:\abf-capacity-calculator` 下運行：
```bash
npm run test -- frontend/src/core/i18nKeys.test.ts
```

### 5.4 修復方向
利用 `git diff` 找出自己在語系文件中新增的所有 Key，並在 `en.ts` 和 `zhTW.ts` 中保持嚴格的鏡像對稱：
```typescript
// zhTW.ts 範例
results: {
  riskBrief: {
    exportBrief: "導出決策 Brief Pack",
    copySuccess: "複製成功！"
  }
}

// en.ts 範例 (必須嚴格對齊)
results: {
  riskBrief: {
    exportBrief: "Export Decision Brief Pack",
    copySuccess: "Copied successfully!"
  }
}
```
*(注：導出的中文 Prompt 引導詞應正確使用“增層載板/增層工序（Build-up）”、“主板/核板（Core）”等 ABF 行業標準中文詞彙，防範機翻)*。

---

## 6. 深度脫敏數據洩漏 (Deep Sanitization Leak)

### 6.1 可能症狀
安全審計中，發現雖然刪除了頂層的 `payload.user` 對象，但當數據結構嵌套很深時（如 `payload.matrices.revenueByCustomer[0].ownerInfo`），仍然残留了協作者的賬號隱私。

### 6.2 可能根因
使用淺拷貝或簡單的 `delete` 只能消除頂層一級屬性，無法遞歸清理深層的隱私 key。

### 6.3 建議檢查命令
編寫測試，對導出的 sanitized 字符串使用正則表達式掃描，檢驗是否仍存在 `@` (email) 或 Firebase 密鑰特徵。

### 6.4 修復方向
編寫一個深度递归脫敏的輔助函數，在深拷貝的同時徹底擦除特定名稱的 key：
```typescript
export function deepSanitize<T>(obj: T, keysToRemove: string[]): T {
  if (obj === null || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => deepSanitize(item, keysToRemove)) as unknown as T;
  }

  const sanitized = {} as Record<string, any>;
  for (const [key, value] of Object.entries(obj)) {
    if (keysToRemove.includes(key)) {
      continue; // 徹底擦除該 key
    }
    sanitized[key] = deepSanitize(value, keysToRemove);
  }
  return sanitized as unknown as T;
}

// 使用範例
const sanitized = deepSanitize(payload, ["uid", "email", "ownerInfo", "token", "password"]);
```

---

## 7. UI 與長文本佈局溢出 (UI Layout & Overflow)

### 7.1 可能症狀
導出 Brief Pack 的預覽框（Preview Container）在展示超長 Prompt 和 JSON 數據時，直接將頁面撐爆，把右側按鈕擠到了屏外，或者導致頁面出現非常難看的雙滾動條。

### 7.2 可能根因
預覽框未在 CSS 上配置換行和折行屬性，或者未限製最大高度。

### 7.3 修復方向
在預覽的 `<pre>` 或 `<code>` 容器上，配置 TailwindCSS 的折行與最大高度限製，確保其在任何屏幕寬度下都不發生佈局溢出：
```tsx
<pre className="max-h-60 overflow-y-auto rounded-lg bg-gray-900 p-4 text-xs text-green-400 overflow-x-hidden whitespace-pre-wrap break-all">
  {previewText}
</pre>
```
- **Z-Index 防護**：複製成功的 Toast 氣泡，其 Z-Index 必須設為 $\ge 50$，以確保其不會被 Modal 遮罩層覆蓋。
- **Toast 持續時間**：Toast 展示時間建議設為 `2500ms`，既能提供明確反饋，又不會長時間遮擋頁面。
