# Viewer 只讀修補技術規格 (Viewer Read-Only Fix Specification)

- **目標版本**：`v1.28.0`
- **定位**：為協同開發團隊 (CC) 制定標準的 **DOM 級 Viewer 只讀硬阻斷** 實現標準，徹底解決“只讀觀察員可在網格本地任意改字與粘貼”的安全性與交互漏洞。

---

## 🛡️ 1. 四大高頻網格頁面硬阻斷防線 (The Grid Defense Lines)

在進行 `react-datasheet-grid` 渲染時，嚴禁僅做 [保存] 按钮隱藏，必須多管齊下，在 DOM 級死鎖單元格編輯機制：

### A. 兵器 1：網格列級禁用 (Column Disabled)
- **原理**：在 `columns` 定義中，為每一個可編輯列（如 `textColumn`、`floatColumn`、`intColumn`）注入 `disabled: !writable`。
- **注意**：必須將 `writable` (由 `canEdit(scope.role)` 算得) 作为 `useMemo` 的依賴項，確保在工作空間權限切換時，網格重新刷新為禁用態。

### B. 兵器 2：網格行級鎖死 (Grid lockRows)
- **原理**：在 `<DataSheetGrid>` 根組件上，強行聲明 `lockRows={!writable}`。
- **效果**：當用戶為 Viewer 時，表格徹底失去底部 [新增空白行] 的按鈕，且鍵盤的 `Insert`、`Delete` 刪除整行操作被底層物理硬阻斷。

### C. 兵器 3：剪貼簿粘貼硬阻擋 (Clipboard Paste Interceptor)
- **原理**：`react-datasheet-grid` 在 disabled 狀態下，雖然會原生攔截單元格輸入，但若用戶框選後按下 `Ctrl + V`，在某些老瀏覽器中仍能將數據寫入本地 State。
- **防線**：在網格最外層包裹的 `div` 容器上綁定 `onPaste` 物理事件攔截：
  ```typescript
  const handlePaste = (e: React.ClipboardEvent) => {
    if (!writable) {
      e.preventDefault();
      e.stopPropagation();
      message.warning(t('common.readOnlyNoEdit'));
    }
  };
  ```

### D. 兵器 4：onChange 前置哨兵守衛 (State Change Guard)
- **原理**：在 `onChange` (如 `handleChange`) 函數頭部設置極簡哨兵，從 React 狀態更新的源頭上掐斷任何非法數據越權篡改：
  ```typescript
  const handleChange = (newRows: SheetRow[]) => {
    if (!writable) return; // 哨兵守衛：只讀觀察員嚴禁變更任何本地 State！
    setRows(newRows);
  };
  ```

---

## 🏗️ 四大頁面 (Products / Capacity / Forecasts / BP) 換裝方案

### 1. Products Spreadsheet Lab
- 實施 `lockRows={!writable}`。
- 列定義 `columns` 所有列強制綁定 `disabled: !writable`，依賴項補齊 `[writable]`。
- 頂部 [Validate]、[+20 Rows] 鈕綁定 `disabled={!writable}`。

### 2. Capacity Lab
- 實施 `lockRows={true}` (產能設備行數固定，禁止增減)。
- 額定產能等列綁定 `disabled: !writable`。

### 3. Forecasts Lab
- 實施 `lockRows={true}` (SKU 數固定)。
- 12 個月份的 columns 映射循環中，統一綁定 `disabled: !writable`。

### 4. BP Targets
- 實施 `lockRows={true}` (年份行數固定)。
- 年度營業額（Million TWD）輸入列綁定 `disabled: !writable`。

---

## 📝 2. Ant Design Form & Input 硬性防護規範

對於非二維大網格的常規表單配置（如 Parameters 匯率設定）：
- 所有 `<Input>`、`<InputNumber>` 和 `<Select>` 元件必須統一綁定 `disabled={!writable}` 或 `readOnly={!writable}`。
- 卡片右上角或底部的 [Update] 或 [Save] 動作按鈕，一律強制設置 `disabled={!writable}`（或者在 Viewer 下直接物理隱藏，代之以“只讀空間”小 Label）。

---

## 🎨 3. Workspace Viewer 專屬 UX 視覺與 Copy 標準

- **只讀專用 Alert 橫幅**：當用戶為 Viewer 時，頁面頂部（在 `ExperimentalBanner` 下方）必須渲染一條精美的 AntD Warning 提示條：
  - *中文*：`「只讀模式：您目前處於唯讀空間，無權限編輯銷售預測或產能設定。」`
  - *英文*：`"Read-Only Mode: You are in a read-only workspace and do not have permission to edit settings."`
- **網格背景灰色暗示**： react-datasheet-grid 必須套用 `.dsg-container-disabled` 樣式，將所有單元格背景色統一重繪為極溫和的淺灰色（如 `#fafafa`），給用戶以明確的“此表已被鎖定”的視覺心智暗示。

---

## 💾 4. CC 可直接執行的 v1.28.0 專屬極客 Prompt

```text
請執行 v1.28.0：Viewer 角色 DOM 級硬只讀阻斷重構。

【硬性約束】：不修改 core formulas，不改數據流，不修改 firestore.rules，純屬前端交互硬阻斷安全加固。

【開發任務】：
1. 在 Products Spreadsheet Lab、Capacity Lab、Forecasts Lab 和 BP Targets 獨立頁的 react-datasheet-grid 中，強制配置 `lockRows={!writable}`（writable 通過 canEdit 算得）。
2. 在上述四個大表的 `columns` 列定義中，為所有可輸入列（如 textColumn, intColumn, floatColumn）綁定 `disabled: !writable`，並確保 `useMemo` 的依賴項中正確包含了 `[writable]`。
3. 在這四個大表的最外層包裹容器上，綁定 `onPaste` 物理事件。當 `!writable` 時，調用 `e.preventDefault()` 徹底攔截 Ctrl+V 粘貼。
4. 在網格的 `onChange` 數據變更處理函數頭部，強行插入哨兵守衛：`if (!writable) return;`，從源頭阻止本地 State 被篡改。
5. 在 Parameters 引用的所有 Ant Design `<Input>` / `<InputNumber>` 上，統一綁定 `disabled={!writable}`。
6. 在所有編輯頁面頂部，若 `!writable === true`，渲染統一的 Warning Alert 橫幅說明唯讀空間權限限制，並將 disabled 網格單元格背景色設為溫和的淺灰色。
```
