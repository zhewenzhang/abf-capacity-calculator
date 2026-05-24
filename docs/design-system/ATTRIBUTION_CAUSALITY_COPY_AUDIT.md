# 归因与因果文案审计报告 (Attribution & Causality Copy Audit)

在多维数据分析与 AI 自动生成报告中，“数学比例分摊（Attribution）”与“商业物理因果（Causality）”是两个性质完全不同的概念。本报告针对 ABF 产能计算器中所有涉及分析、推荐及 AI 导出简报的文案措辞执行严密审计，彻底防范由于“因果归因谬误”引发的高管投资偏失与法律责任纠纷。

---

## 💡 核心概念澄清：Attribution $\neq$ Causality

1. **Proportional Attribution (数学比例分摊归因)**：
   - *定义*：当系统整体业绩未达标（出现缺口）时，在纯数学模型上，将此缺口按照各产品 SKU 或事业部（BU）的预测下滑比例进行数值上的占比分摊。
   - *事实*：这是一种**事后差额的数学统计分账**。例如 SKU A 占了未达标缺口的 30%，并不代表是 SKU A 的行为“导致”了 30% 的未达标。
2. **Causality (物理/商业因果归因)**：
   - *定义*：指某项特定的物理原因（如特定制程良率崩溃、主原料缺料、设备当机、市场大势崩盘）与最终业绩未达标之间存在着不可分割的物理因果链条。
   - *事实*：AI 无法仅凭前端二维电子表格的数据波动直接推断出物理因果。**若在 UI 措辞中过度使用强因果关系（如“由于……导致了……”），会让高管误以为 BU 负责人是业绩未达标的唯一过错责任人，引发内部信任危机与投资决策偏失。**

---

## 🚨 3 处高风险“强因果”文案漏洞盘点

### 1. Results 下 Top Changes 模块标题
- **老版本英文 UI 裸露**：`SKUs and BUs that CAUSE the BP Miss`
- **老版本中文直译**：`導致 BP 營業目標未達成的產品與事業部`
- **致命缺陷**：直接使用了强因果词汇 **"CAUSE"** 与 **"導致"**，强行把数学上的下滑占比定性为 BU 的过错。
- **修补建议**：彻底废除 "CAUSE / 導致"，改用中立的数学分账词汇。

---

### 2. AI Risk Brief 生成简报的 Prompt 模板文案
- **老版本 Prompt 写死**：`Analyze the drivers that PUSHED DOWN the capacity utilization and caused the bottleneck...`
- **致命缺陷**：命令 AI 寻找“将利用率拉下来的 Driver（物理推手）”，AI 会捕获此 Prompt 强烈的主观心理暗示，从而脑补并生成诸如“由于 OSAT A 的出货延误**摧毁**了制程 B 的效能”等强因果主观推论（Causality Illusion），造成财务与生产责任判定失实。
- **修补建议**：修改 Prompt 指向，命令 AI 仅进行“数学缺口分摊比例分析”。

---

### 3. Change Review (快照对比) 模块的 Delta 差异推荐解释
- **老版本 UI 裸露**：`SKU Omega drop of 15% is the reason for the negative BP Gap.`
- **老版本繁中直译**：`SKU Omega 預測量下滑 15% 是造成 BP 缺口變紅的原因。`
- **致命缺陷**：将“变红的原因”单一归咎于 SKU Omega 的预测量变化，完全忽视了汇率大势波动、良率系数未激活及产能额定值修改等其他物理因子（Multiple factors）。
- **使用替代**：改用“数学贡献占比”或“首要分摊项”。

---

## 🎨 建议的中英文安全词典 (The Safe Copy Dictionary)

为了守护数据可信度，全系统 `zhTW.ts` / `en.ts` 及 AI Prompt 模板必须强制采用以下中立、财务级严谨的词汇对照：

| 原高风险强因果词条 | 英文安全替换语气 (Safe English) | 繁体中文安全译法 (Safe zh-TW) | 语义与设计安全保护原理 |
| :--- | :--- | :--- | :--- |
| **caused the BP miss / 導致未達標** | `Attribution to BP Gap` / `Gap Share` | **BP 缺口分攤占比**、**未達標差額分攤** | 强调这只是对差额进行数学上的分账，而不是物理定罪。 |
| **due to / 因為...** | `associated with SKU change` | **與產品預測變動相關** | 用“相关性 (Association)”代替强因果，符合科学统计原则。 |
| **primary driver / 物理推手** | `primary mathematical contributor` | **首要數學分攤貢獻項** | 明确标示这是数学计算结果，防止脑补物理原因。 |
| **pushed down / 摧毀了/拉低了** | `share of decrease` | **下滑差額分攤比** | 降温情绪化和夸张词汇，保持系统专业严肃的 SaaS 工具风格。 |
| **the reason for... / ...的原因** | `Attribution analysis indicates...` | **比例歸因分析顯示...** | 在页头或图表前缀明示，这是一份归因比例分析。 |
