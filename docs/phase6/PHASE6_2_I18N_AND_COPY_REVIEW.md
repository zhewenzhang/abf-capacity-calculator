# Phase 6.2 本地化 (i18n) 与 UI 术语文案审查报告

本报告用于提前审查 **ABF Capacity Calculator** 在 **Phase 6.2 Forecast Version History Workflow** 阶段新增的前端 UI 词汇本地化 Parity 对齐状况，并对 `v1.23.0` 中已知遗留的 P3 级别 i18n 硬编码缺陷提供精确的重构建议。本报告旨在确保系统在升级至 `v1.24.0` 时达成 100% 完整的 Parity 对齐与地道的台湾繁体中文本地化（zh-TW）语感。

---

## 一、 v1.23.0 已知 P3 级硬编码文案修复建议

在上一轮只读审计中，我们在 `main` 分支的 `CalculationResults.tsx` 里穿透盘点出两处 Statistic 组件的 `title` 属性存在英文硬编码，且在双语 i18n 翻译文件中缺失对应的键：

### 1. 细节 A：BP 差距变化 (BP Gap Delta)
- **源码定位**：`CalculationResults.tsx` 第 1869 行左右：
  ```tsx
  <Statistic title="BP Gap Delta" ... />
  ```
- **修复方案**：
  - 在双语翻译文件中增补 `changeReview.bpGapDelta` 键。
  - 将此处修改为：
    ```tsx
    title={t('changeReview.bpGapDelta')}
    ```

### 2. 细节 B：最高核心稼动率变化 (Max Core Util Delta)
- **源码定位**：`CalculationResults.tsx` 第 1944 行左右：
  ```tsx
  <Statistic title="Max Core Util Delta" ... />
  ```
- **修复方案**：
  - 双语翻译文件中已存在 `changeReview.maxCoreUtilDelta` 键。
  - 直接将此处修改为：
    ```tsx
    title={t('changeReview.maxCoreUtilDelta')}
    ```

---

## 二、 Phase 6.2 核心术语建议与双语对照表

为了将系统的“快照管理”平滑升级为“预测版本工作流”，我们对核心词汇进行了地道的英文与台湾本地化（zh-TW）繁体中文对齐定义。

### 1. 核心术语对照矩阵

| 英文原词 (EN Key Value) | 推荐台湾繁体中文 (zh-TW Value) | 语义说明与业务场景 |
| :--- | :--- | :--- |
| **Data Snapshots** | **資料快照** | 基础数据底档的物理保存。 |
| **Forecast Version** | **預測版本** | 升级后的版本工作流主语言。 |
| **Version Type / Snapshot Kind** | **版本類型** | 标识快照的版本种类（如工作版、BP版等）。 |
| **Review Status** | **評審狀態** | 标识版本目前所处的生命周期阶段。 |
| **Period Label** | **週期標籤** | 业务定位标签（例如：`2026 BP` 等）。 |
| **Working Version** | **工作版** | 用户正在实时编辑和调整的数据版本。 |
| **BP Baseline** | **BP 基準版** | 年度预算（Business Plan）目标的锁定基准。 |
| **Customer Update** | **客戶更新版** | 客户中途调整 Forecast 需求的更新版本。 |
| **Capacity Review** | **產能評估版** | 产能规划专家评估设备扩张的论证版本。 |
| **Scenario** | **情情境模擬版 / 模擬情境版** | 多方案情境对比版本（如增加 10% 产能版）。 |
| **Archived Version** | **封存版** | 归档且过时、仅用于历史追溯的只读版本。 |
| **Draft** | **草稿** | 新建版本的默认评审状态。 |
| **Reviewed** | **已評審** | 已通过业务或工厂专家审核的版本。 |
| **Locked** | **已鎖定** | 深度冻结、不容许删除的硬资产版本。 |

---

## 三、 i18n 双语 Parity 对齐定义 (zh-TW / EN JSON 推荐补丁)

CC 团队在 `v1.24.0` 升级中，必须在双语文件中 100% 镜像增补以下翻译键，严禁采用零散的 ad-hoc 命名：

### 1. `frontend/src/i18n/zhTW.ts` 中增补：
```typescript
  // Phase 6.2 Forecast Version History Workflow
  'changeReview.forecastVersion': '預測版本',
  'changeReview.versionType': '版本類型',
  'changeReview.reviewStatus': '評審狀態',
  'changeReview.periodLabel': '週期標籤',
  'changeReview.periodLabelPlaceholder': '例如：2026 BP, 2026-Q3 Update',
  'changeReview.note': '備註',
  'changeReview.bpGapDelta': 'BP 差距變化',
  
  // Snapshot Kinds
  'changeReview.kind.working': '工作版',
  'changeReview.kind.bpBaseline': 'BP 基準版',
  'changeReview.kind.customerUpdate': '客戶更新版',
  'changeReview.kind.capacityReview': '產能評估版',
  'changeReview.kind.scenario': '情境模擬版',
  'changeReview.kind.archive': '封存版',
  
  // Review Statuses
  'changeReview.status.draft': '草稿',
  'changeReview.status.reviewed': '已評審',
  'changeReview.status.locked': '已鎖定',
  'changeReview.status.archived': '已封存',

  // Recommended Compare Pairs
  'changeReview.recommendationTitle': '推薦對比版本',
  'changeReview.recommendationDesc': '系統偵測到以下最具分析價值的版本對，建議點擊一鍵套用進行比對：',
  'changeReview.recommendationApply': '套用推薦',
  'changeReview.recommendationBpVsLatest': '年度 BP 基準版 與 最新工作/客戶更新版 比對',
  'changeReview.recommendationLatestTwo': '最新兩版歷史預測版本對比',
  'changeReview.recommendationNotEnough': '建立 2 個以上快照版本以獲取推薦對比對',

  // Immutable Alert
  'changeReview.immutableAlert': '為了確保歷史快照作為項目審計底料的強客觀確定性，快照一旦建立將終生鎖定（唯讀不可改）。如需調整快照名稱、版本類型或備註等元數據，請刪除該舊快照後重建保存。'
```

### 2. `frontend/src/i18n/en.ts` 中增补：
```typescript
  // Phase 6.2 Forecast Version History Workflow
  'changeReview.forecastVersion': 'Forecast Version',
  'changeReview.versionType': 'Version Type',
  'changeReview.reviewStatus': 'Review Status',
  'changeReview.periodLabel': 'Period Label',
  'changeReview.periodLabelPlaceholder': 'e.g. 2026 BP, 2026-Q3 Update',
  'changeReview.note': 'Note',
  'changeReview.bpGapDelta': 'BP Gap Delta',
  
  // Snapshot Kinds
  'changeReview.kind.working': 'Working Version',
  'changeReview.kind.bpBaseline': 'BP Baseline',
  'changeReview.kind.customerUpdate': 'Customer Update',
  'changeReview.kind.capacityReview': 'Capacity Review',
  'changeReview.kind.scenario': 'Scenario',
  'changeReview.kind.archive': 'Archived Version',
  
  // Review Statuses
  'changeReview.status.draft': 'Draft',
  'changeReview.status.reviewed': 'Reviewed',
  'changeReview.status.locked': 'Locked',
  'changeReview.status.archived': 'Archived',

  // Recommended Compare Pairs
  'changeReview.recommendationTitle': 'Recommended Compare Pair',
  'changeReview.recommendationDesc': 'The system has detected the most valuable versions to compare. Click apply to set them:',
  'changeReview.recommendationApply': 'Apply',
  'changeReview.recommendationBpVsLatest': 'Annual BP Baseline vs. Latest Working/Customer Update',
  'changeReview.recommendationLatestTwo': 'Latest two historical versions comparison',
  'changeReview.recommendationNotEnough': 'Create at least 2 snapshot versions to get compare recommendations',

  // Immutable Alert
  'changeReview.immutableAlert': 'To ensure the strong objective determinism of historical snapshots as audit logs, they are permanently locked upon creation. To modify metadata, please delete the old version and re-save.'
```

---

## 四、 避坑指南：不建议与建议使用的本地化翻译

为了保证业务术语的确定性，我们需要在文案上避开不当翻译，遵循台湾高科技制造及载板行业的习惯语感：

### ❌ 不建议使用的“不当”翻译
- **Attributions 翻译为“属性”**：
  - *原因*：在大盘中，“营收 Attributions”表示“比例分摊归因”。若翻译为“屬性”会误导用户以为这是 SKU 或客户的元数据分类，导致巨大误解。必须严密规范翻译为 **“歸因”**。
- **Scenario 翻译为“脚本”**：
  - *原因*：高科技载板规划中，Scenario 指的是“模拟情境 / 模拟方案”。翻译为“腳本”带有强烈的高级代码测试或戏剧台词色彩。必须统一翻译为 **“模擬情境”** 或 **“情境模擬”**。
- **Working Version 翻译为“工作中的版本”**：
  - *原因*：翻译冗长，缺乏工业级的干练感。统一翻译为 **“工作版”**。

---

## 五、 UI 静态文案 (i18n) 与数据动态标签 (Labels) 的物理隔离边界

为了避免将翻译文件撑得过于臃肿，我们对文案的使用做出了清晰的角色和物理隔离隔离：

1. **强制必须写在 i18n 双语文件中的文案**：
   - 所有的表头标签（如 `Name`, `Version Type` 等）。
   - 所有的弹窗提示、警示卡 Alert 内容、推荐卡配对描述。
   - 所有下拉框的固定选项翻译值（如 `draft`, `locked` 等 Kind 和 Status 键）。
2. **允许并应当保留在数据库/数据 Labels 中的文案**：
   - 用户填写的 `PeriodLabel`（如 `2026 BP`）— 这是属于动态的业务实体数据，必须允许用户用中英混合输入，系统原样读取渲染，**切勿强行在前端代码中对其进行硬编码翻译匹配**。
   - 用户填写的备注 `Note` — 属于动态备注文本，列表原样拉取渲染，有无均 fallback 为空字符串。
