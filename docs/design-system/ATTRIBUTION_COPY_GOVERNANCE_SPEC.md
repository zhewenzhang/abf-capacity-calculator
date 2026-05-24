# 比例歸因文案治理規格 (Attribution Copy Governance Specification)

- **目標版本**：`v1.30.0`
- **定位**：為協同開發團隊 (CC) 與後續 AI 生成引擎規範全站涉及業績差距、快照變更、產能風險分析時的**專業措辭與文案保護線**，從語意上根絕“因果歸因謬誤”。

---

## 🚫 1. 禁用詞彙黑名單 (The Term Blacklist)

在進行任何關於 **Top Changes (主要變更)**、**BP Gap (目標差距分攤)** 和 **Risk Brief (風險歸因)** 的 UI 標籤、圖表副標題以及翻譯詞條起草時，**嚴厲禁止使用以下帶有強烈定性、主觀定罪的因果判定詞**：

- **英文禁用黑名單**：
  - `cause` (名詞/動詞皆禁)
  - `caused by` / `because of`
  - `responsible for` (負責/責任歸屬)
  - `culprit` (元兇/罪魁禍首)
- **繁體中文禁用黑名單**：
  - `導致` / `造成`
  - `責任在於` / `由於...所致`
  - `元兇` / `下滑罪魁`

---

## 🎨 2. 中英文安全替代詞對照詞典 (The Copy Dictionary)

為了防範因因果措辭不當招致的跨部門糾紛與決策失誤，全站必須強制替換採用以下高度專業、客觀中立的財務級歸因措辭：

| 禁用因果句式範例 | 英文安全替代句式 (Safe English) | 繁體中文安全替代譯法 (Safe zh-TW) | 語意安全防禦原理 |
| :--- | :--- | :--- | :--- |
| SKUs that **cause** the BP Miss | `Attribution of BP Gap by SKU` | **SKU 營業目標差距分攤** | 申明這只是數值對帳上的差額分攤，非物理原因。 |
| Loss **due to** OSAT A | `Gap contribution associated with OSAT A` | **與 OSAT A 變動相關之缺口貢獻** | 以“相關性 (Association)”取代物理因果。 |
| Top **drivers / culprits** of decrease | `Primary mathematical contributors to decrease` | **下滑差額之首要數學貢獻項** | 明示這是純數學運算，非物理推手。 |
| **caused by** forecast drop | `mathematically apportioned to forecast reduction` | **數值分攤至預測量變動** | 用“分攤 (Apportioned)”界定數學邊界。 |

---

## 📝 3. 四大核心分析板塊文案保護規則 (Section Rules)

### A. Risk Brief (風險簡報區)
- **規則**：在 AI Risk Brief 渲染或導出時，**頁頭必須強製附帶以下置信度明示 Alert**：
  - *文案*：`「分析聲明：本簡報基於確定性模型進行數學比例歸因，反映的是差額分攤比率，不構成物理層面的直接因果推論。商業決策請結合廠區與財務團隊二次審核。」`

### B. Change Review (快照變更審查)
- **規則**：主要變更表格（Top Changes Table）的副標題，統一強制標註：
  - *文案*：`「主要變更依營收變動絕對值排序，反映的是兩個快照間的數值分攤份額（Attribution），而非唯一物理原因（Causality）。」`

### C. BP Gap Attribution (BP 差距分析)
- **規則**：在達成率未達標時，圖表標題嚴禁命名為 `BP 未達標原因`，必須命名為 `BP 目標缺口歸因分析` 或 `BP Target Gap Apportionment`。

### D. Top Drivers (首要驅動因子)
- **規則**：Dashboard 的圖表分類一律擦除 "Driver (驅動者)" 字樣，統一換裝為 `首要數學貢獻維度` 或 `Primary Mathematical Dimensions`。

---

## 💾 4. CC 可直接執行的 v1.30.0 專屬極客 Prompt

```text
請執行 v1.30.0：比例歸因與因果文案大清洗重構。

【硬性約束】：不修改核心算法，全面對齊中英文翻譯包，確保財務分析措辭專業、中立、0 歧義。

【開發任務】：
1. 全局清理 `en.ts` / `zhTW.ts` 中關於 Top Changes、Results 及 Risk Brief 的翻譯鍵，將所有 `caused by`, `due to`, `導致`, `造成` 替換為 `associated with`, `attribution`, `相關`, `分攤`。
2. 在 AI Brief Export 的 Prompt 模板及網頁導出區頭部，強行嵌入標準的地道繁中/英文免責警示水印，明示比例分攤非物理因果。
3. Results 所有子報表（BP Analysis, Capacity Results）頂部，固定渲染統一的 `DataCaveatAlert` 置信度信息條，明示 deterministic 確定性運籌。
4. 表格表頭 Delta 列統一命名為 `差異`、`差異 %`（zh-TW）和 `Delta`, `Delta %`（EN），副標題追加比例分攤註解。
```
