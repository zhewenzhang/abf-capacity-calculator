# CC (Developer Agent) v1.36.0 Data Quality Remediation 核心开发指令 (Remediation Prompt)

你是一个极其严谨的 AI 资深前端与架构专家。你的任务是基于本系统已有的设计基建、数据模型以及 `v1.35.0` 完成的 DQ Visibility 逻辑，为 ABF Capacity Calculator 开发 **数据质量自愈闭环工作流 (Data Quality Remediation Workflow)**。

在着手修改任何 frontend 代码前，你必须**以事实为本、严格遵守以下 10 条黄金开发红线与实作提醒**：

---

## 💡 给 CC 的 10 条至关重要实作提醒 (Core Golden Rules)

1. **🚨 绝对禁止新建任何数据库模型/集合**：
   * 严禁在 Firestore 中新增任何诸如 `dq_remediation_logs`、`quick_fixes` 等新的 Collection，亦不能在 SKU、Forecast 或 Parameters 中为 DQ 增加任何冗余的状态字段。保持数据模型的清爽。
2. **🚨 严禁进行静默自动修复 (No Silent Auto-save)**：
   * 所有的数据修改必须由具有权限的用户（Owner/Editor）在 UI 界面上显式点击“确认自愈”、“保存”或进行键盘 Enter/失焦，系统绝不能在后台擅自猜测意图并做自动隐式改写。
3. **🚨 100% 复用现有的 Service 保存 API**：
   * 必须通过直接导入并挂接已有的 Service 接口进行保存。具体为：
     * Products 属性自愈 ── 复用 `skuService.saveSku`
     * Forecast 零价格与 SKU 重绑定 ── 复用 `forecastService.saveForecast`
     * Capacity 缺失/零产能自愈 ── 复用 `capacityService.saveCapacityPlan`
     * Parameters 汇率补齐 ── 复用 `parameterService.saveParameters`
     * BP Targets 营业目标缺失 ── 复用 `bpTargetService.saveBpTarget`
4. **🚨 极其严密的只读 Viewer 拦截防线**：
   * Viewer 角色必须具备数据质量的“完整知情权”（能完全看到所有 Error/Warning 图标和 Alert 警示栏），但前端组件中**严禁为 Viewer 角色绑定 Badge 的 onClick 事件**。所有的修复 Drawer、Popover、Modal 对 Viewer 一律不响应，或强制处于 disabled 状态，按钮强置灰，绝无任何物理提交可能。
5. **🚨 缺陷诊断条件的 stateless 原则**：
   * 各输入页面在呈现 DQBadge 或 Alert 时，其判断条件必须统一来自 `core/dataQuality.ts` 导出的 `buildDataQualitySummary` 检测结果。**严禁在 React 组件内部手写 ad-hoc 的临时过滤和判定公式**。页面只负责接收 Issue 对象并进行交互响应。
6. **🚨 物理无刷新的自愈刷新机制 (Stateless Instant Refresh)**：
   * 自愈成功后，必须通过 React 状态机（State / Context）更新本地的数据状态数组，从而自动触发 `buildDataQualitySummary` 的实时重算与页面的重新渲染。**严禁通过 `window.location.reload()` 这种粗暴的整页强制刷新方式来消除错误 Badge**。
7. **🚨 抽屉 (Drawer) / 气泡 (Popover) / 模态 (Modal) 的场景精准搭配**：
   * 必须严格按照规格书的策略搭配交互：
     * **Products 属性缺失** -> 右侧极简 `SKU Quick Fix Drawer`
     * **Forecast 价格为 0** -> 单元格就地激活 InputNumber 编辑态或小气泡
     * **孤儿预测重绑定** -> 弹出 `Orphan Forecast Guided Modal` 提供多路径跳转
     * **汇率缺失** -> 原地弹出 `Exchange Rate Popover` 输入框
     * **产能缺失** -> 一键路由并携带定位参数
     * **营业目标缺失** -> 顶部 Alert 原地展开 Inline Form 行内小表单就地补值
8. **🚨 导航修复的一键高亮定位 (Navigation Highlighting)**：
   * 当从其他页面的 DQ 警示一键跳转至 Capacity 或 BpTargets 页面时，你必须在 URL 中携带如 `?focusMonth=2026-03&focusField=corePanel` 的 Query 参数。
   * 目标页面加载时，必须解析此 URL 参数，不仅要将视口滚动锚定至对应输入框，还必须对该输入框应用明显的 CSS 高亮闪烁效果（如定义一个 `.remind-flash` 动效类），以起到强烈的视觉引导效果。
9. **🚨 严格的输入合法性表单验证 (Form Validation)**：
   * 在 Quick Fix Drawer 或 Popover 自愈输入框中，必须增加前端的数值范围和非空校验。例如：汇率不能填负数或零、SKU 层数分类必须是正整数、单价不能小于等于 0。在点击确认保存时，如校验不通过必须就地标红报错，阻止向后台发送垃圾数据。
10. **🚨 拦截冒泡，防止意外行为**：
    * 当在表格中点击 `DataQualityBadge` 图标时，必须显式调用 `e.stopPropagation()` 和 `e.preventDefault()`。防止点击 Badge 的行为意外触发表格行的选中、勾选、展开或 Spreadsheet 的默认编辑事件。

---

## 🛠 推荐的 React 伪代码实现结构 (Architecture Guide)

为了帮你理清如何在 React 页面中优雅挂接 DQ 自愈流，你可以参考以下高内聚的实现结构：

### 1. Products 页面挂接 SKU 快速修复抽屉 (Drawer 模式)
```typescript
// Products.tsx
const ProductsPage: React.FC = () => {
  const { skus, saveSku, currentUserRole } = useWorkspace();
  const [selectedSkuId, setSelectedSkuId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // 从顶层 dataQuality 引擎中过滤产品域 issues
  const dqSummary = useMemo(() => buildDataQualitySummary({ skus, ... }), [skus]);
  const productIssues = useMemo(() => dqSummary.issues.filter(i => i.domain === 'products'), [dqSummary]);

  const handleFixClick = (e: React.MouseEvent, skuId: string) => {
    e.stopPropagation(); // 拦截冒泡
    e.preventDefault();
    if (currentUserRole === 'Viewer') return; // Viewer 硬拦截
    setSelectedSkuId(skuId);
    setIsDrawerOpen(true);
  };

  return (
    <div className="abf-page">
      <Table 
        dataSource={skus}
        columns={[
          {
            title: 'SKU Code',
            dataIndex: 'skuId',
            render: (text, record) => {
              const hasIssue = productIssues.some(i => i.skuId === record.skuId && i.severity === 'error');
              return (
                <Space>
                  {text}
                  {hasIssue && (
                    <DataQualityBadge 
                      severity="error"
                      onClick={(e) => handleFixClick(e, record.skuId)} // 就地拉出抽屉
                      style={{ cursor: currentUserRole === 'Viewer' ? 'not-allowed' : 'pointer' }}
                    />
                  )}
                </Space>
              );
            }
          }
        ]}
      />

      <SkuQuickFixDrawer 
        skuId={selectedSkuId}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        skus={skus}
        onSave={async (updatedSku) => {
          // 严格进行合法性防备校验
          if (!updatedSku.layerCount || updatedSku.layerCount <= 0) throw new Error("Invalid layer count");
          await saveSku(updatedSku.skuId, updatedSku); // 100% 复用现有 API
          // 状态数组自动更新响应，DQ Badge 瞬时自愈消除！
        }}
      />
    </div>
  );
};
```

### 2. Parameters 页面挂接汇率补齐 (Popover 模式)
```typescript
// Parameters.tsx
const ParametersPage: React.FC = () => {
  const { parameters, saveParameters, currentUserRole } = useWorkspace();
  const [popoverVisible, setPopoverVisible] = useState(false);

  const handleExchangeRateFix = async (rateValue: number) => {
    if (rateValue <= 0) return;
    const updatedParams = {
      ...parameters,
      exchangeRates: {
        ...parameters.exchangeRates,
        TWD: rateValue
      }
    };
    await saveParameters(updatedParams); // 复用保存 Service
    setPopoverVisible(false);
  };

  return (
    <Card 
      title={
        <Space>
          <span>汇率与参数设定</span>
          {currentUserRole !== 'Viewer' ? (
            <Popover
              visible={popoverVisible}
              onVisibleChange={setPopoverVisible}
              content={
                <ExchangeRateFixForm 
                  onSave={handleExchangeRateFix} 
                  onCancel={() => setPopoverVisible(false)}
                />
              }
              trigger="click"
            >
              <DataQualityBadge severity="error" style={{ cursor: 'pointer' }} />
            </Popover>
          ) : (
            <DataQualityBadge severity="error" style={{ cursor: 'not-allowed' }} />
          )}
        </Space>
      }
    >
      {/* 参数表单 */}
    </Card>
  );
};
```

### 3. URL 导航一键高亮定位 (Navigation Highlighting 钩子)
你可以在目标输入页面中，使用以下逻辑来实现平滑滚动和高亮动画：
```typescript
// hooks/useUrlRemediationFocus.ts
import { useEffect } from 'react';

export const useUrlRemediationFocus = (targetFieldPrefix: string) => {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const focusMonth = params.get('focusMonth'); // YYYY-MM
    const focusField = params.get('focusField'); // e.g. buPanelPerDay

    if (focusMonth && focusField) {
      // 拼接 DOM 节点唯一的 ID 或 Class
      const elementId = `${targetFieldPrefix}-${focusMonth}-${focusField}`;
      const element = document.getElementById(elementId);
      if (element) {
        // 1. 平滑滚动到该视口
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // 2. 施加闪烁高亮动效
        element.classList.add('remind-flash');
        const timer = setTimeout(() => {
          element.classList.remove('remind-flash');
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, []);
};
```

请你以极高标准的工程尊严与严谨态度执行此任务，不要产生多余的冗余代码，并完美实现以上所述的自愈交互。
