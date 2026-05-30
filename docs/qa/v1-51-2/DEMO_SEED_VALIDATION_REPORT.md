# v1.51.2 Demo Seed Validation Report

**版本**: v1.51.2
**日期**: 2026-05-30

---

## 验证结果

```
Overall: PASS ✅
```

---

## 详细输出

| 检查项 | 结果 | 说明 |
|--------|------|------|
| JSON-PARSE | ✅ PASS | 5 个 JSON 文件全部可解析 |
| C-ORPHAN-ABSENT | ✅ PASS | C-ORPHAN 不在 products 中 |
| REVENUE-TARGET | ✅ PASS | 2,788.2M TWD (28 亿 TWD ±5%) |
| BP-ATTAINMENT | ✅ PASS | 87.1% (83-92% 范围内) |
| CUST-A-JUL-DISAPPEAR | ✅ PASS | Customer A 2026-07 forecast = 0 |
| CUST-C-NOV-SURGE | ✅ PASS | +57.0% (≥45%) |
| CORE-UTIL-2026-07 | ✅ PASS | 93.5% (88-97% 范围内) |
| CORE-UTIL-2026-08 | ✅ PASS | 96.4% (88-97% 范围内) |

---

## 核心指标摘要

| 指标 | 值 |
|------|-----|
| Forecast Records | 387 条 |
| 2026 Revenue | 2,788.2M TWD |
| BP Target | 3,200M TWD |
| BP Attainment | 87.1% |
| Customer A 2026-07 | 0 pcs |
| Customer C 2026-11 Surge | +57.0% |
| Core Utilization 2026-07 | 93.5% |
| Core Utilization 2026-08 | 96.4% |

---

## 结论

Demo seed validation PASS，数据一致性验证通过。

---

**报告生成时间**: 2026-05-30
**维护者**: Demo Seed Validation Agent
