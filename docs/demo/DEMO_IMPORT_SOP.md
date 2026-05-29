# ABF Capacity Calculator — Demo 数据导入 SOP

**版本**: v1.0
**日期**: 2026-05-29
**用途**: 安全导入 Demo 数据的标准操作流程

---

## 一、概述

本文档定义了将 Demo 数据安全导入 ABF Capacity Calculator 的标准操作流程 (SOP)。遵循本流程可以确保：

1. 不污染生产数据
2. DQ 问题被正确触发
3. 可以安全回滚
4. 演示环境准备就绪

---

## 二、导入前准备

### 2.1 环境确认

```powershell
# 确认当前 Firebase 项目
firebase projects:list
firebase use <demo-project-id>

# 确认不是生产项目
# ⚠️ 如果显示 production project，立即停止！
```

### 2.2 数据文件确认

```powershell
# 确认 5 个 seed 文件存在
ls docs/demo/DEMO_SEED_*.json

# 预期输出：
# DEMO_SEED_PRODUCTS.json
# DEMO_SEED_FORECASTS.json
# DEMO_SEED_CAPACITY.json
# DEMO_SEED_PARAMETERS.json
# DEMO_SEED_BP_TARGETS.json
```

### 2.2.1 PowerShell UTF-8 编码注意事项

**重要**: Windows PowerShell 5.1 默认使用系统编码（非 UTF-8），读取 JSON 文件时可能导致中文乱码或 `ConvertFrom-Json` 解析错误。

```powershell
# ✅ 正确方式：显式指定 UTF-8 编码
$json = Get-Content -Path "docs/demo/DEMO_SEED_PRODUCTS.json" -Encoding UTF8 -Raw | ConvertFrom-Json

# ❌ 错误方式：不指定编码（可能乱码）
$json = Get-Content -Path "docs/demo/DEMO_SEED_PRODUCTS.json" -Raw | ConvertFrom-Json

# 批量读取所有 seed 文件
$files = @(
  "DEMO_SEED_PRODUCTS.json",
  "DEMO_SEED_FORECASTS.json",
  "DEMO_SEED_CAPACITY.json",
  "DEMO_SEED_PARAMETERS.json",
  "DEMO_SEED_BP_TARGETS.json"
)

foreach ($file in $files) {
  $path = "docs/demo/$file"
  $data = Get-Content -Path $path -Encoding UTF8 -Raw | ConvertFrom-Json
  Write-Host "✅ $file loaded successfully"
}
```

**替代方案**: 使用 PowerShell 7+ (pwsh)，默认支持 UTF-8。

### 2.3 备份现有数据（如有）

```powershell
# 导出现有数据作为备份
firebase firestore:export gs://<bucket>/backup-$(Get-Date -Format "yyyyMMdd-HHmmss")
```

---

## 三、手动导入流程

### 步骤 1: 创建 Demo Workspace

1. 使用 demo-owner 账号登录
2. 创建新 workspace：
   - 名称: `[DEMO] ABF Capacity Demo - YYYY-MM-DD`
   - 记录 workspace ID
3. 添加成员：
   - demo-editor@yourcompany.com (Editor)
   - demo-viewer@yourcompany.com (Viewer)

### 步骤 2: 导入 Products/SKU

1. 导航到 Products 页面
2. 点击 "Import" 或手动创建
3. 按照 `DEMO_SEED_PRODUCTS.json` 创建 34 个 SKU
4. 验证：
   - A-NO-PRICE 显示红色 Badge (Missing Unit Price)
   - B-EUR-001 显示红色 Badge (Unsupported Currency)
   - C-ORPHAN 不在列表中

### 步骤 3: 导入 Forecasts

1. 导航到 Forecasts 页面
2. 导入 2026 年 1-12 月预测数据
3. 验证：
   - C-ORPHAN 显示 "Orphan SKU" 警告
   - Customer A 2026-07 开始下降

### 步骤 4: 导入 Capacity

1. 导航到 Capacity 页面
2. 配置 3 个工厂的产能数据
3. 验证：
   - F2 2026-09 显示 "Missing capacity" 警告
   - F2 2026-07-08 产能配置为 3000（延迟扩张）

### 步骤 5: 配置 Parameters

1. 导航到 Parameters 页面
2. 配置：
   - 面板参数 (244.1mm x 246.2mm)
   - 汇率 (USD→TWD: 32.5, USD→CNY: 7.25)
   - 良率矩阵
   - 工作天数 (28 天/月)
3. 验证：
   - 无汇率配置错误

### 步骤 6: 配置 BP Targets

1. 导航到 BP Targets 页面
2. 配置：
   - 2026: 3,200M TWD
   - 2027: 3,800M TWD
3. 验证：
   - 2028 年显示黄色警告 (Missing BP Target)

---

## 四、导入后验证清单

### 4.1 DQ 问题验证

| # | 问题类型 | 预期位置 | 验证方法 | 通过 |
|---|---------|---------|---------|------|
| 1 | Missing Unit Price | Products: A-NO-PRICE | 红色 Badge | [ ] |
| 2 | Unsupported Currency | Products: B-EUR-001 | 红色 Badge | [ ] |
| 3 | Orphan Forecast | Forecasts: C-ORPHAN | 黄色警告 | [ ] |
| 4 | Missing Capacity | Capacity: F2 2026-09 | 黄色警告 | [ ] |
| 5 | Missing BP Target | BP Targets: 2028 | 黄色指示器 | [ ] |
| 6 | Order Disappearance | Operations: Customer A | 异常诊断 | [ ] |
| 7 | Capacity Delay | Operations: F2 2026-07-08 | 异常诊断 | [ ] |
| 8 | Forecast Surge | Operations: Customer C 2026-11 | 异常诊断 | [ ] |
| 9 | BP Miss | Dashboard: 2026 | BP 达成率 87.1% | [ ] |
| 10 | Utilization Bottleneck | Results: Core 2026-08 | 风险评分 92 | [ ] |

### 4.2 功能验证

| # | 功能 | 验证方法 | 通过 |
|---|------|---------|------|
| 1 | Dashboard | KPI 卡片显示正确数据 | [ ] |
| 2 | Results | BP Analysis 显示缺口 400M TWD | [ ] |
| 3 | Operations | 异常诊断显示 4+ 个问题 | [ ] |
| 4 | Scenario | 能够运行 Customer B -20% 场景 | [ ] |
| 5 | AI Copilot | 能够回答 "为什么 BP 不达标" | [ ] |

### 4.3 数据完整性验证

| # | 数据 | 预期数量 | 验证方法 | 通过 |
|---|------|---------|---------|------|
| 1 | Products | 34 SKU | Products 页面计数 | [ ] |
| 2 | Forecasts | ~100 条 | Forecasts 页面计数 | [ ] |
| 3 | Capacity | 36 条 | Capacity 页面计数 | [ ] |
| 4 | BP Targets | 2 年 | BP Targets 页面 | [ ] |

---

## 五、未来自动 Import Script 设计

### 5.1 脚本架构

```
tools/demo/
├── import-demo-data.ts      # 主导入脚本
├── validate-demo-data.ts    # 数据验证脚本
├── cleanup-demo-data.ts     # 清理脚本
└── types.ts                 # 类型定义
```

### 5.2 接口设计

```typescript
// import-demo-data.ts
interface ImportOptions {
  workspaceId: string;
  projectId: string;
  seedPath: string;          // e.g., 'docs/demo/'
  dryRun: boolean;           // 只验证不导入
  skipExisting: boolean;     // 跳过已存在数据
}

interface ImportResult {
  success: boolean;
  imported: {
    products: number;
    forecasts: number;
    capacity: number;
    parameters: boolean;
    bpTargets: boolean;
  };
  errors: ImportError[];
  warnings: string[];
}

async function importDemoData(options: ImportOptions): Promise<ImportResult>;
```

### 5.3 使用方式

```powershell
# 验证模式（不实际导入）
npx ts-node tools/demo/import-demo-data.ts --dry-run --workspace-id <id>

# 实际导入
npx ts-node tools/demo/import-demo-data.ts --workspace-id <id> --project-id <id>

# 清理模式
npx ts-node tools/demo/cleanup-demo-data.ts --workspace-id <id>
```

---

## 六、避免污染真实 Workspace 的策略

### 6.1 前置检查

```typescript
// 导入前必须检查
const safetyChecks = [
  isDemoWorkspace(workspaceId),      // 必须是 demo workspace
  isNotProductionProject(projectId), // 不是生产项目
  hasBackup(),                        // 已备份
  isOwnerRole(userId),                // 是 Owner 角色
];
```

### 6.2 命名约定

- Demo workspace 必须包含 `[DEMO]` 前缀
- Demo 数据的 ID 必须包含 `demo-` 前缀
- 避免使用真实客户名称

### 6.3 权限控制

- 只有 Owner 可以导入
- Editor 只能查看和编辑
- Viewer 只能查看

---

## 七、回滚流程

### 7.1 快速回滚

```powershell
# 删除整个 workspace
# 在 Firebase Console 中操作

# 或者恢复备份
firebase firestore:import gs://<bucket>/<backup-id>
```

### 7.2 部分回滚

1. 删除导入的 SKU
2. 删除导入的 Forecast
3. 删除导入的 Capacity 配置
4. 重置 Parameters

---

## 八、常见问题

### Q1: 导入后 DQ 问题没有显示？

**A**: 检查以下：
1. 数据是否正确导入
2. 浏览器是否刷新
3. DQ 引擎是否正常运行

### Q2: C-ORPHAN 没有显示孤儿警告？

**A**: 确认：
1. C-ORPHAN SKU 不在 Products 列表中
2. Forecast 中引用了 `sku-c-orphan`
3. 刷新 Forecasts 页面

### Q3: 如何确认数据是 Demo 数据？

**A**: 检查：
1. Workspace 名称包含 `[DEMO]`
2. SKU 数量为 34
3. 存在 A-NO-PRICE、B-EUR-001 等测试 SKU

---

**文档版本**: v1.0
**创建日期**: 2026-05-29
**维护者**: Demo Import SOP Agent
