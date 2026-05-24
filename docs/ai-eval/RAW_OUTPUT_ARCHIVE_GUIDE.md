# 外部 AI 原始輸出存檔指南 (Raw Output Archive Guide)

為了保證評測過程的可追溯性、公開性與科學性，所有外部 AI 測試的原始輸出（Raw Output）與對應的打分表（Scorecards）必須進行嚴格的存檔管理。

本指南規定了存檔的目錄結構、命名規則、存檔原則以及安全性邊界。

---

## 1. 存檔目錄結構 (Directory Structure)
所有的測試結果均應存放在 `docs/ai-eval/results/` 下。如果目錄不存在，請自行創建：

```text
docs/ai-eval/
└── results/
    ├── raw/                 # 用於存放外部 AI 大模型的純文字原始回答 (.md)
    └── scorecards/          # 用於存放針對各模型單獨評分的打分表 (.md)
```

*註：為了防止空目錄被 Git 忽略，本模組已在對應目錄下內建了 `.gitkeep` 檔案。*

---

## 2. 檔案命名規則 (Naming Conventions)
為了便於檢索與腳本化批次處理，所有檔案必須遵循以下**嚴格的蛇形命名與日期前綴**：

### 1. 原始回答 (Raw Output) 命名：
```text
YYYYMMDD_model_case_raw.md
```
* **`YYYYMMDD`**：測試當天日期，如 `20260524`。
* **`model`**：模型代號，必須全小寫。如：`gemini`、`claude`、`chatgpt`、`doubao`、`kimi`、`deepseek`、`glm`、`minimax`。
* **`case`**：案例名稱，必須全小寫。如：`currency` (代表 Currency Trap)、`dirty` (代表 Dirty Data)。

*範例*：`20260524_claude_currency_raw.md`

### 2. 打分表 (Scorecard) 命名：
```text
YYYYMMDD_model_case_scorecard.md
```
*範例*：`20260524_claude_currency_scorecard.md`

---

## 3. 核心存檔三原則 (Core Principles)

### 1. 純淨性原則 (Purity)
- **嚴禁手動美化**：必須原汁原味地拷貝 AI 的 Markdown 輸出，不可做任何拼寫修正、排版調整或字句刪改。
- **保存完整元數據**：建議在原始回答文件（`raw.md`）的最前端加入以下 YAML frontmatter 元數據註釋，便於日後統計：
  ```markdown
  ---
  testDate: 2026-05-24
  modelName: Claude 3.5 Sonnet
  caseName: Currency Trap Case
  promptPackVersion: v1.21.1
  ---
  ```

### 2. 客觀性原則 (Objectivity)
- **單輪決策**：保存的原始輸出必須是 AI 面對 **第一輪單次 Prompt** 時的答覆。
- **嚴禁中途調教**：不允許在 AI 答錯後拷貝「人為糾正、再次引導或連續多輪對話」的記錄。我們評估的是模型在**無人工干預**下的即插即用決策能力。

### 3. 安全防洩露原則 (Security Boundary)
> [!WARNING]
> - **敏感商業數據保護**：如果您使用的是包含真實客戶、真實 SKU 代號、專案實體 UID 或 Firebase 密鑰的真實 Analysis Contract，**絕對禁止將 `raw/` 和 `scorecards/` 存檔提交並 push 到任何公開的開源 Git 倉庫 (Public Repo)**。
> - **安全實踐**：在提交代碼前，請仔細運行 `git status` 自查。如有真實敏感數據，請將對應結果放入 `.gitignore` 排除，或僅提交脱敏後的模擬 Benchmark Case (如基準的 Currency Trap Case / Dirty Data Case 模擬包)。
