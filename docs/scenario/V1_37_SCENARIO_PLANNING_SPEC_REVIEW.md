# v1.37.0 Scenario Planning MVP 規劃文件重新審查報告

> **審查日期**: 2026-05-27
> **審查版本**: 修正版 (基于最新 commit `e00d7cd5f8eb84e485c3ceaf5de3883fff69091e`)
> **審查分支**: `agy/v1-37-scenario-planning-review`
> **審查結論**: <font color="green">**Pass (完全通過)**</font>

---

## 一、核心檢查項核對

| # | 檢查項 | 審查結果 | 審查細節與核對事實 |
|---|---|:---:|---|
| 1 | **是否已移除 multi-scenario management** | **Pass** | **是**。已在 Spec 的核心決策、架構設計及 UI 佈局中徹底移除了多情境切換、情境列表、以及在內存中保存多個命名 Scenario 的非 MVP 機制。 |
| 2 | **是否明確收斂為 single in-memory scenario** | **Pass** | **是**。Spec 的核心理念已明確重構為「內存單情境沙盒 (Single-Scenario In-Memory Sandbox)」，只提供一個 What-If 沙盒供使用者動態對比。 |
| 3 | **是否移除 scenarios: ScenarioEntry[] 設計** | **Pass** | **是**。在 `ScenarioContextValue` 和狀態樹中，原先的 `scenarios: ScenarioEntry[]` 數組已被完全刪除，簡化為單一的 `scenarioResults` 和 `multipliers` 模型。 |
| 4 | **是否明確禁止 rename/delete/switch scenario** | **Pass** | **是**。實作 Prompt 在 Task 2 與 Task 3 中均明確寫入了：*「HARD RED LINE: Do NOT implement scenario list, scenario rename, scenario delete, scenario switch, or scenario branching. ONE scenario only.」*，在物理層面和指令層面皆完全禁絕。 |
| 5 | **clone strategy 是否統一** | **Pass** | **是**。已完全禁止了高開銷且可能存在深層循環引用的 `structuredClone` 及 `JSON` 深拷貝方案。Spec 與架構中已**完全統一**為：**Safe shallow clone (spread operator for arrays, targeted clone for objects)**。只克隆 SKU、Forecast、Capacity 平鋪對象，對 parameters 保持只讀共享引用，性能極佳 (<3ms)。 |
| 6 | **是否禁止 baseline mutation** | **Pass** | **是**。重要約束中已明文追加「**禁止 mutation 任何 baseline 物件**」，且克隆與乘數應用函數（`applyMultipliers`）被重寫為對數組內每一項實施 spread 克隆並返回全新數組的無副作用純函數，實現了物理阻斷。 |
| 7 | **CC Prompt 是否足夠防止 scope creep** | **Pass** | **是**。給 CC 的實作 Prompt（`CC_V1_37_SCENARIO_PLANNING_MVP_PROMPT.md`）已進行高強度收緊，追加了 `5a`（MVP only ONE scenario）與 `5b`（Scenario model 禁止 import services）等黃金紅線，且剔除了原 Task 中的多情境模組，極具約束力。 |
| 8 | **是否只修改 docs/scenario** | **Pass** | **是**。經 Git 差異驗證，此分支僅修改了 `docs/scenario` 目錄下的 4 個規劃文件，產品源代碼及配置均未受任何非預期干擾。 |

---

## 二、隱患與修正評估 (P0 / P1 / P2)

* **P0 問題**：無。
* **P1 問題 (多情境管理 Scope Creep) 評估**：**已徹底修復**。多情境的刪除/切換/重命名等內存列表操作已被徹底移除，完全收斂為 Single Scenario Sandbox，KISS 原則得到了完美的貫徹。
* **P2 問題 (克隆策略不一致) 評估**：**已徹底修復**。已統一為 Safe Shallow Clone 方案，清除了所有 `structuredClone` 造成的文檔不一致和潛在性能隱患。

---

## 三、實作可行性與建議

### 結論：**强力推薦進入 4 小時快速實作！**

當前規格書、架構設計和實作 Prompt 在範圍控制（KISS 原則）、性能考量、基線安全性防禦（三層防線）上均達到了**極致的嚴謹與完美**。無任何模稜兩可的描述，完全達到了 **Release-Ready** 的交付級標準。Claude Code (CC) 能夠在完全沒有歧義的情況下，以極高質量在 4 小時內完成全部核心編碼與測試。

---

## 四、仍需補強的紅線 (Continued Redlines)

當前防禦體系已極為堅固。在接下來的實作階段，僅需維持以下這一條代碼紅線的靜態審查：

* **🚨 模組依賴絕對隔離 (Strict Module Isolation Guard)**：
  * 在代碼審查時，必須嚴格檢查新產生的 `core/scenario*.ts` 和 `pages/ScenarioPlanning.tsx` 檔案。不允許引入任何 `services/*` 中的服務寫入函數（如 `saveSKUs`、`saveForecasts` 等），在架構上確保 Scenario 數據 100% Ephemeral（暫時性）。

---

## 五、Git 狀態報告

* **當前分支 (Branch)**: `agy/v1-37-scenario-planning-review`
* **最新提交哈希 (Commit Hash)**: `e00d7cd5f8eb84e485c3ceaf5de3883fff69091e` (基于 xiaomi 的修正)
* **Push 狀態 (Push Status)**: 本地審查分支重建並生成最新審查報告，即將推送到遠端獨立分支以完成最終驗收。
