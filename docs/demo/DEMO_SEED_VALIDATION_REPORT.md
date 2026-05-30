# ABF Capacity Calculator — Demo Seed 验证报告 (v1.48.1)

**版本**: v1.48.1
**日期**: 2026-05-29
**状态**: ✅ 全部通过

---

## 一、验证结果摘要

| 检查项 | 结果 | 说明 |
|--------|------|------|
| JSON Parse | ✅ PASS | 5 个 JSON 文件全部可解析 |
| C-ORPHAN Absent | ✅ PASS | C-ORPHAN 不在 products 中 |
| Revenue Target | ✅ PASS | 2,788.2M TWD (28 亿 TWD ±5%) |
| BP Attainment | ✅ PASS | 87.1% (83-92% 范围内) |
| Customer A 2026-07 | ✅ PASS | forecastPcs = 0 (订单消失) |
| Customer C 2026-11 Surge | ✅ PASS | +57.0% (≥45%) |
| Core Utilization 2026-07 | ✅ PASS | 93.5% (88-97% 范围内) |
| Core Utilization 2026-08 | ✅ PASS | 96.4% (88-97% 范围内) |

**总体结果**: ✅ **PASS**

---

## 二、关键指标详情

### 2.1 营收与 BP

| 指标 | 值 | 目标 | 状态 |
|------|-----|------|------|
| 2026 Forecast Revenue | 2,788.2M TWD | 2,800M ±5% | ✅ |
| BP Target 2026 | 3,200M TWD | 保持不变 | ✅ |
| BP Attainment | 87.1% | 83-92% | ✅ |
| BP Gap | 411.8M TWD | - | ℹ️ |

### 2.2 客户营收分布

| 客户 | 营收 (M TWD) | 占比 |
|------|-------------|------|
| Customer A | 574.2 | 20.6% |
| Customer B | 744.9 | 26.7% |
| Customer C | 789.7 | 28.3% |
| Customer D | 504.0 | 18.1% |
| Customer E | 175.4 | 6.3% |
| **总计** | **2,788.2** | **100%** |

### 2.3 DQ 问题验证

| DQ 问题 | 验证结果 | 详情 |
|---------|---------|------|
| Customer A 2026-07 订单消失 | ✅ | forecastPcs = 0 |
| Customer C 2026-11 暴涨 | ✅ | +57.0% (464K → 729K pcs) |
| Core Utilization 瓶颈 | ✅ | 2026-07: 93.5%, 2026-08: 96.4% |
| C-ORPHAN 孤儿预测 | ✅ | 3 条 forecast 引用不存在的 SKU |
| B-EUR-001 不支持币种 | ✅ | EUR 不在 USD/TWD/CNY 中 |
| A-NO-PRICE 缺失单价 | ✅ | unitPrice = 0 |
| F2 2026-09 缺失产能 | ✅ | capacityPlans 中无此月份 |
| 2028 缺失 BP Target | ✅ | bpTargets 中无 2028 年 |

### 2.4 Core Utilization 详情

| 月份 | Demand (panels) | Capacity (panels) | Utilization |
|------|----------------|-------------------|-------------|
| 2026-07 | 74,623 | 79,800 | 93.5% ✅ |
| 2026-08 | 76,903 | 79,800 | 96.4% ✅ |
| 2026-09 | 89,243 | 57,400 | 155.5% ⚠️ |
| 2026-10 | 101,988 | 85,400 | 119.4% ⚠️ |

**说明**: 2026-09 和 2026-10 的超高利用率是设计如此：
- 2026-09: F2 产能缺失 (DQ issue)
- 2026-10: Customer C 新品导入导致需求激增

---

## 三、数据文件清单

| 文件 | 记录数 | 说明 |
|------|--------|------|
| DEMO_SEED_PRODUCTS.json | 34 SKU | 5 个客户 |
| DEMO_SEED_FORECASTS.json | 387 条 | 2026 年 1-12 月 |
| DEMO_SEED_CAPACITY.json | 36 条 | 3 个工厂 |
| DEMO_SEED_PARAMETERS.json | - | 汇率、面板、良率 |
| DEMO_SEED_BP_TARGETS.json | - | 2026-2027 年目标 |

---

## 四、v1.48.1 修复内容

| P1 | 问题 | 修复方式 | 状态 |
|-----|------|---------|------|
| P1-01 | Forecast 记录数不一致 | 补齐全部 34 SKU，共 387 条 | ✅ |
| P1-02 | 营收与 BP 不符 | 调整 volume 使 revenue 达 2,788M TWD | ✅ |
| P1-03 | Customer A 订单消失未体现 | 2026-07 forecast 设为 0 | ✅ |
| P1-04 | Customer C surge 未体现 | 2026-11 forecast +57% | ✅ |
| P1-05 | 产能瓶颈无法触发 | 调整 capacity 使 utilization 达 93-96% | ✅ |

| P2 | 问题 | 修复方式 | 状态 |
|-----|------|---------|------|
| P2-01 | PowerShell UTF-8 | 更新 SOP 添加 -Encoding UTF8 | ✅ |

---

## 五、验证脚本

验证脚本位置: `docs/demo/validate-demo-seed.mjs`

运行方式:
```powershell
node docs/demo/validate-demo-seed.mjs
```

---

**文档版本**: v1.48.1
**创建日期**: 2026-05-29
**维护者**: Demo Data Validation Agent
