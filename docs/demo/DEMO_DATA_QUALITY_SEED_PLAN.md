# ABF Capacity Calculator — Demo 数据质量问题种子计划

**版本**: v1.0
**日期**: 2026-05-29
**用途**: Demo 数据集中故意植入的数据质量问题

---

## 概述

本文件定义了 Demo 数据集中故意植入的 10 种数据质量问题，用于演示：

1. **数据质量检测** — 系统如何自动发现这些问题
2. **数据质量修复** — 用户如何一键修复这些问题
3. **异常智能诊断** — 系统如何评估这些问题的业务影响

---

## 一、数据质量问题清单

### DQ-01: 缺失单价 (Missing Unit Price)

| 属性 | 值 |
|------|-----|
| **问题类型** | `data:missing-sku-attributes` |
| **植入位置** | SKU `A-NO-PRICE` (Customer A) |
| **具体表现** | `unitPrice` 字段为空 |
| **影响** | 无法计算该 SKU 的营收 |
| **严重度** | High |
| **预期检测** | Products 页面显示红色 DQ Badge |
| **修复方式** | 点击 Badge → Quick Fix Drawer → 输入单价 $3.20 |
| **演示价值** | 展示 DQ 检测和一键修复流程 |

### DQ-02: 不支持的币种 (Unsupported Currency)

| 属性 | 值 |
|------|-----|
| **问题类型** | `data:unsupported-currency` |
| **植入位置** | SKU `B-EUR-001` (Customer B) |
| **具体表现** | `currency` 字段为 `EUR`（系统只支持 USD/TWD/CNY） |
| **影响** | 该 SKU 无法参与多币种计算 |
| **严重度** | High |
| **预期检测** | Products 页面显示 "Unsupported Currency" 红色 Badge |
| **修复方式** | 点击 Badge → Quick Fix Drawer → 修改为 TWD 或 USD |
| **演示价值** | 展示币种验证和修复 |

### DQ-03: 孤儿预测 (Orphan Forecast)

| 属性 | 值 |
|------|-----|
| **问题类型** | `data:orphan-forecast` |
| **植入位置** | Forecast 引用 SKU `C-ORPHAN`（不存在的 SKU） |
| **具体表现** | 3 条 Forecast 记录引用不存在的 SKU Code |
| **影响** | 这些预测不会被计算引擎处理 |
| **严重度** | Medium |
| **预期检测** | Forecasts 页面显示 "Orphan SKU" 警告 |
| **修复方式** | 点击警告 → Guided Fix Modal → 创建 SKU 或删除 Forecast |
| **演示价值** | 展示数据一致性检查 |

### DQ-04: 缺失产能月份 (Missing Capacity Month)

| 属性 | 值 |
|------|-----|
| **问题类型** | `capacity:missing-months` |
| **植入位置** | Factory 2 (F2) 在 2026-09 缺失配置 |
| **具体表现** | 该月份没有 Core/BU Panel/Day 配置 |
| **影响** | 2026-09 的产能计算不完整 |
| **严重度** | High |
| **预期检测** | Capacity 页面显示 "Missing Month" 警告 |
| **修复方式** | 点击警告 → 跳转到 Capacity 页面 → 补充配置 |
| **演示价值** | 展示产能完整性检查 |

### DQ-05: 缺失 BP 目标 (Missing BP Target)

| 属性 | 值 |
|------|-----|
| **问题类型** | `bp:missing-target-with-forecast` |
| **植入位置** | BP Targets 表中 2028 年缺失 |
| **具体表现** | 2028 年有预测数据但没有 BP 目标 |
| **影响** | 无法计算 2028 年 BP 达成率 |
| **严重度** | Medium |
| **预期检测** | BP Targets 页面 2028 年列显示黄色警告 |
| **修复方式** | 点击年份警告 → Quick Fix Popover → 输入 BP 目标 |
| **演示价值** | 展示 BP 目标完整性检查 |

### DQ-06: 客户订单消失 (Customer Order Disappearance)

| 属性 | 值 |
|------|-----|
| **问题类型** | `sales:forecast-volume-drop` |
| **植入位置** | Customer A 在 2026-07 开始预测下降 15% |
| **具体表现** | 月度预测从 445K 降到 378K |
| **影响** | 营收预测大幅下降 |
| **严重度** | High |
| **预期检测** | Operations 页面异常诊断显示 "Forecast Volume Drop" |
| **修复方式** | 需要 Sales 确认客户意图，非系统自动修复 |
| **演示价值** | 展示业务异常诊断 |

### DQ-07: 产能扩张延迟 (Capacity Delay)

| 属性 | 值 |
|------|-----|
| **问题类型** | `capacity:high-utilization` |
| **植入位置** | Factory 2 在 2026-07-09 产能应从 3,000 升到 3,500，但延迟到 2026-10 |
| **具体表现** | 2026-07-09 产能配置低于预期 |
| **影响** | 2026-08 Core 利用率达到 95% |
| **严重度** | Critical |
| **预期检测** | Operations 页面显示 "Core Utilization 95%" 红色警告 |
| **修复方式** | 需要 Planning 确认产能扩张时间表 |
| **演示价值** | 展示产能瓶颈预警 |

### DQ-08: 预测暴涨 (Forecast Surge)

| 属性 | 值 |
|------|-----|
| **问题类型** | `sales:forecast-volume-spike` |
| **植入位置** | Customer C 在 2026-11 预测暴涨 50% |
| **具体表现** | 从 2026-10 的 226K 升到 2026-11 的 339K |
| **影响** | 产能需求激增，可能造成瓶颈 |
| **严重度** | High |
| **预期检测** | Operations 页面显示 "Forecast Volume Spike" 警告 |
| **修复方式** | 需要确认新品导入时间表是否准确 |
| **演示价值** | 展示预测异常检测 |

### DQ-09: BP 未达标 (BP Miss)

| 属性 | 值 |
|------|-----|
| **问题类型** | `bp:target-missed` |
| **植入位置** | 2026 年 BP 目标 3,200M TWD vs 预测 2,800M TWD |
| **具体表现** | 达成率 87.1%，缺口 412M TWD |
| **影响** | 年度目标无法达成 |
| **严重度** | Critical |
| **预期检测** | Dashboard 和 Results 显示 BP 未达标警告 |
| **修复方式** | 需要管理层决策：调整目标或增加营收 |
| **演示价值** | 展示 BP 归因分析 |

### DQ-10: 利用率瓶颈 (Utilization Bottleneck)

| 属性 | 值 |
|------|-----|
| **问题类型** | `capacity:bottleneck-concentration` |
| **植入位置** | 2026-07 到 2026-10 连续 4 个月 Core 利用率 > 90% |
| **具体表现** | Core 持续为瓶颈，BU 相对宽松 |
| **影响** | 产能扩张决策 |
| **严重度** | Critical |
| **预期检测** | Results Risk Brief 显示 "Core Bottleneck Concentration" |
| **修复方式** | 需要产能扩张评估 |
| **演示价值** | 展示风险简报和产能影响分析 |

---

## 二、DQ 问题植入位置汇总

| # | 问题类型 | 植入位置 | 严重度 | 演示页面 |
|---|---------|---------|--------|---------|
| 1 | Missing Unit Price | SKU A-NO-PRICE | High | Products |
| 2 | Unsupported Currency | SKU B-EUR-001 | High | Products |
| 3 | Orphan Forecast | Forecast C-ORPHAN | Medium | Forecasts |
| 4 | Missing Capacity | F2 2026-09 | High | Capacity |
| 5 | Missing BP Target | 2028 年 | Medium | BP Targets |
| 6 | Order Disappearance | Customer A 2026-07 | High | Operations |
| 7 | Capacity Delay | F2 2026-07-09 | Critical | Operations |
| 8 | Forecast Surge | Customer C 2026-11 | High | Operations |
| 9 | BP Miss | 2026 年 | Critical | Dashboard/Results |
| 10 | Utilization Bottleneck | Core 2026-07-10 | Critical | Results |

---

## 三、预期系统检测结果

### Products 页面

- A-NO-PRICE: 红色 Badge "Missing Unit Price"
- B-EUR-001: 红色 Badge "Unsupported Currency"

### Forecasts 页面

- C-ORPHAN: 黄色警告 "Orphan SKU detected"

### Capacity 页面

- F2 2026-09: 黄色警告 "Missing capacity configuration"

### BP Targets 页面

- 2028: 黄色年份指示器 "No BP target configured"

### Operations 页面

- 异常诊断列表:
  - [Critical] 2026-08 Core utilization 95%
  - [High] Customer A forecast drop -15%
  - [High] Customer C forecast surge +50%
  - [Medium] Customer B forecast drop -20%

### Results 页面

- Risk Brief:
  - Top Risk Period: 2026-08 (Score 92)
  - Bottleneck: Core (4 consecutive months)
- Key Findings:
  - #1: BP 2026 未达成 (缺口 400M TWD)
  - #2: 2026-08 Core 产能瓶颈
  - #3: Customer A 预测下降
  - #4: Customer C 预测暴涨
  - #5: 数据质量问题 (3 个 High)

---

## 四、修复建议

### 可自动修复 (Quick Fix)

| 问题 | 修复方式 | 操作 |
|------|---------|------|
| Missing Unit Price | Quick Fix Drawer | 输入 $3.20 |
| Unsupported Currency | Quick Fix Drawer | 改为 TWD |
| Missing BP Target | Quick Fix Popover | 输入 4,500M TWD |
| Orphan Forecast | Guided Fix Modal | 删除或创建 SKU |

### 需要人工确认

| 问题 | 修复方式 | 负责人 |
|------|---------|--------|
| Missing Capacity | 补充配置 | Planning |
| Order Disappearance | 确认客户意图 | Sales |
| Capacity Delay | 确认扩张时间表 | Planning |
| Forecast Surge | 确认新品导入时间 | Sales |
| BP Miss | 调整目标或增加营收 | Management |
| Utilization Bottleneck | 产能扩张评估 | Planning |

---

## 五、演示流程建议

### DQ 演示脚本 (5 分钟)

1. **打开 Products 页面** → 看到 2 个红色 DQ Badge
2. **点击 A-NO-PRICE Badge** → Quick Fix Drawer 打开 → 输入单价 → 修复完成
3. **点击 B-EUR-001 Badge** → Quick Fix Drawer 打开 → 修改币种 → 修复完成
4. **打开 Forecasts 页面** → 看到 Orphan SKU 警告
5. **点击警告** → Guided Fix Modal → 选择删除 → 修复完成
6. **打开 BP Targets 页面** → 看到 2028 黄色警告
7. **点击警告** → Quick Fix Popover → 输入目标 → 修复完成

### 业务异常演示脚本 (5 分钟)

1. **打开 Operations 页面** → 看到异常诊断列表
2. **查看 2026-08 Core 利用率 95%** → 点击查看详情
3. **点击 Results** → 查看 Risk Brief → Top Risk Periods
4. **切换到 Capacity Impact** → 查看 Core +10% 影响
5. **打开 Scenario** → 运行 "Core +10%" 场景 → 查看瓶颈缓解

---

**文档版本**: v1.0
**创建日期**: 2026-05-29
**维护者**: Demo Dataset Agent
