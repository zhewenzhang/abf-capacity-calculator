# ABF Capacity Calculator 專案開發回顧 (2026-05)

本文檔記錄 ABF Capacity Calculator 從專案啟動至 v1.29.0 的開發歷程、產品演進、技術決策與未來規劃。

---

## 一、最初的產品目標

ABF Capacity Calculator 最初設計為：

1. **替代故障的 Python 後端**：原有 Python 後端無法維護，需要以現代 Web 技術重建
2. **ABF 基板產能規劃工具**：針對 ABF (Ajinomoto Build-up Film) 封裝基板的產能需求進行規劃
3. **Firebase 後端即服務**：使用 Firebase Auth + Firestore + Hosting，降低維運成本
4. **React + Ant Design 前端**：現代前端技術棧，支援快速迭代
5. **Excel-like 操作體驗**：產能規劃採用類似 Excel 的表格操作方式

---

## 二、需求演進歷程

### Phase 1：基礎功能建立 (v1.0 - v1.7)

- Firebase + React + Ant Design 技術棧確立
- Products / Forecasts / Capacity 基本輸入功能
- Dashboard / Results 分析頁面
- 計算引擎核心實作

### Phase 2：多幣別與 BP 目標 (v1.8 - v1.14)

- USD/TWD/CNY 多幣別支援
- BP (Business Plan) 營業目標輸入
- BP 達成率分析
- 產品健康度分析矩陣

### Phase 3：決策級分析深化 (v1.15 - v1.20)

- 風險驅動因子歸因
- BP Gap Attribution
- 價格敏感度分析
- 產能改善情境分析
- Key Findings 自動萃取

### Phase 4：多人協作 (v1.17 - v1.18)

- Workspace 共用工作區
- Owner / Editor / Viewer 角色權限
- Firestore Security Rules 設計
- UID 邀請機制

### Phase 5：版本管理與變更分析 (v1.22 - v1.24)

- Snapshot 建立、比較、還原
- 變更影響分析
- DeepSeek Prompt Pack 匯出
- 版本分類與審核狀態

### Phase 6：Spreadsheet Lab 系列 (v1.26 - v1.27)

- Forecasts Spreadsheet Lab
- Products Spreadsheet Lab
- Capacity Spreadsheet Lab
- react-datasheet-grid 整合

### Phase 7：BP 獨立與 Viewer 保護 (v1.28 - v1.29)

- BP Targets 獨立頁面
- Parameters 防覆蓋保護
- Viewer True Read-only
- UI 一致性提升

---

## 三、已完成核心能力

### 資料輸入

| 功能 | 頁面 | 狀態 |
|------|------|------|
| SKU 管理 | Products | ✅ |
| 預測輸入 | Forecasts | ✅ |
| 產能規劃 | Capacity | ✅ |
| BP 目標 | BP Targets | ✅ |
| 參數設定 | Parameters | ✅ |

### 分析輸出

| 功能 | 頁面 | 狀態 |
|------|------|------|
| KPI 總覽 | Dashboard | ✅ |
| 月度明細 | Results | ✅ |
| BP 達成率 | Results | ✅ |
| 風險摘要 | Results | ✅ |
| 產能趨勢 | Capacity | ✅ |

### 協作功能

| 功能 | 狀態 |
|------|------|
| 個人空間 | ✅ |
| 共用工作區 | ✅ |
| 角色權限 | ✅ |
| 版本管理 | ✅ |

### 實驗功能

| 功能 | 頁面 | 狀態 |
|------|------|------|
| Excel-like 產品輸入 | Products Lab | ✅ 實驗 |
| Excel-like 預測輸入 | Forecasts Lab | ✅ 實驗 |
| Excel-like 產能輸入 | Capacity Lab | ✅ 實驗 |

---

## 四、與最初規劃的變化

### 正確的產品轉向

| 變化 | 原因 | 正確性 |
|------|------|--------|
| BP 目標獨立頁面 | 防止 Parameters 覆蓋 | ✅ |
| Workspace 多人協作 | 團隊需求 | ✅ |
| Snapshot 變更分析 | 決策支援需求 | ✅ |
| Spreadsheet Lab 系列 | Excel 用戶習慣 | ✅ |
| Viewer Read-only | 資料安全 | ✅ |
| AI Brief Export | 外部 AI 整合需求 | ✅ |

### 未完成的規劃

| 項目 | 狀態 | 原因 |
|------|------|------|
| 多專案 UI | 未實作 | 優先級較低 |
| 即時協作 | 未實作 | Firestore listener 未使用 |
| 月度工作天數 | 固定值 | 簡化實作 |

---

## 五、技術債與設計債

### 技術債

| 項目 | 影響 | 優先級 |
|------|------|--------|
| Results 頁面過大 (105KB) | 載入效能 | 中 |
| 部分 any type 使用 | 型別安全 | 低 |
| Chart vendor chunk 過大 | 首次載入 | 中 |

### 設計債

| 項目 | 影響 | 優先級 |
|------|------|--------|
| Spreadsheet Lab 與正式頁面功能重疊 | 維護成本 | 低 |
| 部分硬編碼語言字串 | 國際化 | 低 |
| Dashboard 邏輯分散 | 可維護性 | 低 |

---

## 六、產品成熟度評估

| 維度 | 評分 | 說明 |
|------|------|------|
| 功能完整性 | 8/10 | 核心功能完備 |
| 穩定性 | 8/10 | 測試覆蓋率高 |
| 使用者體驗 | 7/10 | Spreadsheet Lab 仍為實驗 |
| 文件完整性 | 7/10 | 技術文件完善，使用手冊初建 |
| 擴展性 | 7/10 | Firestore schema 彈性 |

**整體成熟度**：生產就緒，適合團隊使用

---

## 七、未來 4 週 Roadmap

| 週次 | 項目 | 目標 |
|------|------|------|
| W1 | 文件補充 | 使用手冊、Smoke Test 完善 |
| W2 | 效能優化 | Chunk split、載入優化 |
| W3 | Spreadsheet Lab 評估 | 決定是否升級為正式功能 |
| W4 | BP 目標進階功能 | 季度/月度目標輸入評估 |

---

## 八、未來 3 個月 Roadmap

| 月份 | 項目 | 目標 |
|------|------|------|
| M1 | Spreadsheet Lab 整合 | 整合或移除實驗功能 |
| M2 | 行動裝置支援 | 響應式設計優化 |
| M3 | 進階分析 | 更深入的決策支援功能 |

---

## 九、不應該做的事情

### 產品方向

- ❌ 不要接入 AI API 做自動決策
- ❌ 不要修改 BP 目標單位（固定 Million TWD）
- ❌ 不要讓 Display Formatter 污染資料層
- ❌ 不要混淆 Proportional Attribution 與 Causality

### 技術方向

- ❌ 不要替換 Firebase
- ❌ 不要替換 Ant Design
- ❌ 不要恢復 Refine
- ❌ 不要修改 Firestore schema 核心結構

### 安全方向

- ❌ 不要放寬 Firestore Rules
- ❌ 不要讓 Viewer 編輯資料
- ❌ 不要讓 Snapshot 可修改

---

## 十、下一階段最重要的決策

### 1. Spreadsheet Lab 去留

**問題**：Products/Forecasts/Capacity Lab 與正式頁面功能重疊

**選項**：
- A. 合併為正式功能
- B. 維持實驗狀態
- C. 移除

**建議**：評估使用率後決定

### 2. BP 目標精細度

**問題**：目前僅支援年度目標，是否需要季度/月度？

**選項**：
- A. 維持年度目標
- B. 新增季度目標
- C. 新增月度目標

**建議**：維持年度目標，下游自動分配

### 3. 即時協作

**問題**：是否需要多人同時編輯？

**選項**：
- A. 維持現狀（手動刷新）
- B. 加入 Firestore listener
- C. 加入 Operational Transform

**建議**：維持現狀，需求不明確

---

## 十一、階段發展總結

### Firebase + React + Ant Design 基礎重建

- 成功建立現代化前端架構
- Firebase 提供穩定的後端服務
- Ant Design 提供一致的 UI 體驗

### Products / Forecasts / Capacity 基本輸入

- 完整的 CRUD 操作
- 批量操作支援
- 匯入匯出功能

### Dashboard / Results 分析頁

- KPI 總覽
- 月度明細
- BP 達成率
- 風險摘要

### 多幣別與 BP Targets

- USD/TWD/CNY 支援
- BP 目標獨立頁面
- Parameters 防覆蓋

### Workspace 多人協作

- Owner/Editor/Viewer 角色
- UID 邀請機制
- Firestore Rules 保護

### Snapshot / Change Review

- 版本管理
- 變更比較
- DeepSeek Prompt Pack

### AI Brief Export

- 去敏感化匯出
- F-A-I-R 分類
- Guardrails 保護

### Forecasts Spreadsheet Lab

- Excel-like 操作
- 批量輸入
- Dirty tracking

### BP Targets 獨立頁

- 橫向年份輸入
- 防覆蓋保護
- Viewer Read-only

### UI 一致性與 Viewer Read-only

- 統一樣式
- Viewer 全面保護
- onChange guard

---

**文件版本**：2026-05-25
**適用版本**：v1.29.0
