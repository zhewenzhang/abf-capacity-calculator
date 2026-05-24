# 组件重构积压列表 (Component Refactor Backlog)

为了实现系统交互的一致性与前端代码的高可维护性，特将可提取抽象的 **11 个共用 UI 组件** 进行白盒设计并编入 Backlog。

*注：本着 KISS 原则，我们坚决反对一次性强行推倒所有页面重构，CC 团队应按照版本排期渐进式换装。*

---

## 📋 11 个共用组件抽象设计

### 1. `PageHeader` (项目统一页头)
- **解决的不一致**：各页面标题大小、面包屑排版、以及语言切换按钮在部分页面的割裂布局。
- **推荐 Props 设计**：
  ```typescript
  interface PageHeaderProps {
    title: string;          // i18n 标题键或文本
    breadcrumbItems: Array<{ label: string; path?: string }>;
    extraAction?: React.ReactNode; // 右侧额外操作区
  }
  ```
- **建议首批改造页面**：Dashboard、Results、Products 主页。
- **重构风险**：低。纯展现组件。
- **是否适合 CC 实施**：是。
- **建议落地版本**：**v1.26.0**

---

### 2. `SectionCard` (统一板块容器)
- **解决的不一致**：各卡片的阴影宽度（box-shadow）、外边距（margin）、内边距（padding）碎裂。
- **推荐 Props 设计**：
  ```typescript
  interface SectionCardProps {
    title?: string;
    loading?: boolean;
    children: React.ReactNode;
  }
  ```
- **建议首批改造页面**：Parameters 页面、Results 数据卡。
- **重构风险**：低。
- **是否适合 CC 实施**：是。
- **建议落地版本**：**v1.26.0**

---

### 3. `MetricCard` (汇总指标卡片)
- **解决的不一致**：Dashboard 与 Results 卡片数字字体大小不一，百分比涨跌幅判定色与箭头方向倒置问题。
- **推荐 Props 设计**：
  ```typescript
  interface MetricCardProps {
    title: string;
    value: string | number;
    unit?: string;
    trend?: {
      direction: 'up' | 'down';
      value: number;
      type: 'success' | 'error' | 'info'; // 强制颜色语义
    };
  }
  ```
- **建议首批改造页面**：Dashboard、Results Summary。
- **重构风险**：低。
- **是否适合 CC 实施**：是。
- **建议落地版本**：**v1.26.0**

---

### 4. `DirtyStateBar` (统一浮动脏提示条)
- **解决的不一致**：Products Spreadsheet Lab 与 Capacity Lab 中，Save/Discard 动作条的高度、定位、阴影与按钮间距割裂。
- **推荐 Props 设计**：
  ```typescript
  interface DirtyStateBarProps {
    isDirty: boolean;
    isValid?: boolean; // 数据是否校验通过，不通过时保存置灰
    onSave: () => Promise<void> | void;
    onDiscard: () => void;
  }
  ```
- **建议首批改造页面**：Products Spreadsheet Lab、BP Targets 独立页。
- **重构风险**：**中等**。需严密对接页面 React 的脏状态逻辑，防止 Discard 回滚发生延迟。
- **是否适合 CC 实施**：是。
- **建议落地版本**：**v1.28.0**

---

### 5. `EmptyState` (优雅跳转空引导)
- **解决的不一致**：冷启动时多处表格直接裸露空表头，缺乏对新用户的引导。
- **推荐 Props 设计**：
  ```typescript
  interface EmptyStateProps {
    description: string; // t() 翻译文案
    actionText?: string; // 按钮跳转文本
    onAction?: () => void; // 跳转回调
  }
  ```
- **建议首批改造页面**：Forecasts 页面、Products 主页空状态。
- **重构风险**：低。
- **是否适合 CC 实施**：是。
- **建议落地版本**：**v1.27.0**

---

### 6. `PermissionNotice` (只读权限警示卡)
- **解决的不一致**：Viewer 角色在编辑页面缺乏警示卡，且按钮被动隐藏时界面排版发生物理塌陷。
- **推荐 Props 设计**：
  ```typescript
  interface PermissionNoticeProps {
    role: 'Viewer' | 'Editor' | 'Owner';
    featureName: string;
  }
  ```
- **建议首批改造页面**：Capacity Lab、Forecasts Lab、BP Targets。
- **重构风险**：低。
- **是否适合 CC 实施**：是。
- **建议落地版本**：**v1.27.0**

---

### 7. `SpreadsheetToolbar` (网格顶部联动工具条)
- **解决的不一致**：Spreadsheet 大表上方的年份选择器、搜索框间距各异，无法对齐网格左边线。
- **推荐 Props 设计**：
  ```typescript
  interface SpreadsheetToolbarProps {
    year: number;
    onYearChange: (year: number) => void;
    extraFilter?: React.ReactNode;
  }
  ```
- **建议首批改造页面**：Forecasts Spreadsheet Lab、BP Targets。
- **重构风险**：低。
- **是否适合 CC 实施**：是。
- **建议落地版本**：**v1.26.0**

---

### 8. `UnitLabel` (统一物理单位标示)
- **解决的不一致**：各表格表头中，有的写 `(Million TWD)`，有的写 `(M TWD)`，有的不写，造成财务对账困扰。
- **推荐 Props 设计**：
  ```typescript
  interface UnitLabelProps {
    unitType: 'million-twd' | 'percentage' | 'sku-count' | 'rated-capacity';
  }
  ```
- **建议首批改造页面**：Results 表格、BP Targets 表头。
- **重构风险**：低。
- **是否适合 CC 实施**：是。
- **建议落地版本**：**v1.27.0**

---

### 9. `StatusTag` (统一语义标签)
- **解决的不一致**：各页面中 Tag 颜色判定混乱（如达标有的标蓝色，有的标绿色）。
- **推荐 Props 设计**：
  ```typescript
  interface StatusTagProps {
    type: 'success' | 'warning' | 'error' | 'info';
    text: string;
  }
  ```
- **建议首批改造页面**：Capacity 瓶颈设备列表、Snapshot Compare Table。
- **重构风险**：低。
- **是否适合 CC 实施**：是。
- **建议落地版本**：**v1.27.0**

---

### 10. `DataCaveatAlert` (数据可信度与免责提示卡)
- **解决的不一致**：AI brief 导出无免责警示，Results 无确定性计算明示，数学归因混淆。
- **推荐 Props 设计**：
  ```typescript
  interface DataCaveatAlertProps {
    type: 'deterministic' | 'ai-generative';
    customMessage?: string;
  }
  ```
- **建议首批改造页面**：Results 页面顶部、AI Brief Export 区域头部。
- **重构风险**：低。
- **是否适合 CC 实施**：是。
- **建议落地版本**：**v1.28.0**
