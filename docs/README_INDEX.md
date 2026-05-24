# ABF Capacity Calculator 全景Specs文檔索引導航 (README_INDEX.md)

歡迎查閱 **ABF Capacity Calculator** 的全景文檔索引！
為了使新加入的開發同事、AI Agent 或項目管理人員能在 2 分鐘內精準定位任何子模組的設計規格與測試指南，我們將整個 `docs/` 目錄下的所有核心文檔整理為以下導航地圖：

---

## 🗺️ 全景 Specs 文檔地圖 (Documentation Map)

```text
D:\abf-capacity-calculator-agy\
├── docs/
│   ├── README_INDEX.md ----------------------------> [你目前查閱的文檔全景地圖]
│   │
│   ├── project/ ------------------------------------> [專案架構、 Roadmap 與交接引導]
│   │   ├── PROJECT_ARCHITECTURE_AND_ROADMAP.md -----> 專案架構、Mermaid拓撲、大盤完成度與長期Roadmap批次時程
│   │   ├── VERSION_HISTORY_DIGEST.md ---------------> 項目 v1.14.x 到 v1.21.1 強化版演進精要歷史里程碑
│   │   └── AGENT_HANDOFF_BRIEF.md ------------------> 新 AI / 新同事接手「九大零信任紅線」與9大核心技術風險Mitigation
│   │
│   ├── phase6/ -------------------------------------> [Phase 6 快照版本與變更對決]
│   │   ├── PHASE6_FORECAST_VERSIONING_REVIEW.md ----> 產品定位、四大角色痛點與 Hybrid 存盤策略、權限路徑矩陣
│   │   ├── PHASE6_IMPLEMENTATION_RECOMMENDATION.md -> 12大Delta指標、AntD UI風格、DeepSeek離線護欄與8大實作風險緩和
│   │   ├── PHASE6_MVP_ACCEPTANCE_CHECKLIST.md ------> MVP質量驗收 checklist、6維核對與 Go/No-Go 上線決策門檻
│   │   └── PHASE6_MVP_TEST_CASES.md ----------------> MVP 核心測試案例庫 (8 個基準/邊界/權限對抗 Cases 詳解)
│   │
│   └── ai-eval/ ------------------------------------> [AI 評測工程與 Scorecards 工具包]
│       ├── README.md -------------------------------> AI Analysis Evaluation Kit 初始大綱
│       ├── EXTERNAL_AI_TEST_RUNBOOK.md -------------> 外部大模型盲測實操 SOP
│       ├── MODEL_COMPARISON_GUIDE.md ---------------> 跨模型選型評鑑與盲測技巧
│       ├── AI_ANALYSIS_RUBRIC.md -------------------> 決策、算術、品質與貨幣折算 Rubric 評分標準細則
│       ├── AI_EVAL_SCORECARD_TEMPLATE.md -----------> 基礎打分卡模板
│       ├── FIRST_ROUND_TEST_PLAN.md ----------------> 首輪盲測計劃 (Currency Trap 與 Dirty Data 兩大P0案例)
│       ├── FIRST_ROUND_SCORE_SHEET.md --------------> 可直接複製使用的 Markdown 首輪 8 大模型實測打分表
│       ├── RAW_OUTPUT_ARCHIVE_GUIDE.md -------------> 原始回答與打分存檔命名規範、去隱私化安全實踐
│       ├── FIRST_ROUND_DECISION_TEMPLATE.md --------> 首輪選型決策報告模板 (適合各任務的模型選配指南)
│       ├── PHASE6_CHANGE_IMPACT_RUBRIC.md ----------> 第一代變更影響評測 AI 測評 Rubric 與 veto 否決紅線
│       └── PHASE6_DEEPSEEK_SCORECARD.md ------------> DeepSeek V4-Flash Change Impact 離線解讀專用 100分打分 scorecard
│
├── README.md ---------------------------------------> 項目總入口大盤說明書
├── ANALYSIS_CONTRACT.md ----------------------------> 決策分析深度 v1.1 數據契約 Payload Schema 規格書
└── docs/WORKSPACE_COLLABORATION.md ------------------> 多人共享 Workspace 數據路徑與協作架構 Specs
```

---

## ⚡ 核心文檔快速入口 (Quick Links)

1. **如果你是新接手的 AI Agent**：
   - 請第一時間精讀 👉 [docs/project/AGENT_HANDOFF_BRIEF.md](project/AGENT_HANDOFF_BRIEF.md) 了解「九大紅線」！
2. **如果你需要了解當前最新的 Roadmap 預估時程**：
   - 請查閱 👉 [docs/project/PROJECT_ARCHITECTURE_AND_ROADMAP.md](project/PROJECT_ARCHITECTURE_AND_ROADMAP.md) 了解 Batch 1-5 任務！
3. **如果你是手動 QA 人員，需要立刻對即將到來的 Phase 6 進行驗收**：
   - 請查閱 👉 [docs/phase6/PHASE6_MVP_ACCEPTANCE_CHECKLIST.md](phase6/PHASE6_MVP_ACCEPTANCE_CHECKLIST.md) 的 Go/No-Go 門檻！
4. **如果你要開啟對 DeepSeek V4-Flash 的變更影響解讀盲測**：
   - 請複製 👉 [docs/phase6/DEEPSEEK_CHANGE_IMPACT_PROMPT.md](phase6/DEEPSEEK_CHANGE_IMPACT_PROMPT.md) 粘貼進大模型！
5. **如果你需要給 DeepSeek 首輪表現進行客觀打分**：
   - 請使用 👉 [docs/ai-eval/PHASE6_DEEPSEEK_SCORECARD.md](ai-eval/PHASE6_DEEPSEEK_SCORECARD.md) 填寫 Scorecard！
