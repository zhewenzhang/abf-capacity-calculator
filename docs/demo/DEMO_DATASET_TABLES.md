# ABF Capacity Calculator — Demo Dataset 数据表

**版本**: v1.0
**日期**: 2026-05-29
**用途**: Demo 数据集具体数据表

---

## 一、SKU 表 (35 个 SKU)

### Customer A SKUs (10 个)

| SKU Code | Customer | Chip L×W (mm) | Layers | Size | Yield | Price | Currency |
|----------|----------|---------------|--------|------|-------|-------|----------|
| A-16L-001 | Customer A | 35×35 | 16 | Large | 82% | $5.50 | USD |
| A-16L-002 | Customer A | 30×30 | 16 | Medium | 85% | $4.80 | USD |
| A-20L-001 | Customer A | 40×40 | 20 | XLarge | 75% | $7.20 | USD |
| A-20L-002 | Customer A | 35×35 | 20 | Large | 78% | $6.50 | USD |
| A-14L-001 | Customer A | 25×25 | 14 | Medium | 90% | $3.80 | USD |
| A-14L-002 | Customer A | 30×30 | 14 | Medium | 88% | $4.20 | USD |
| A-10L-001 | Customer A | 20×20 | 10 | Small | 92% | $2.50 | USD |
| A-8L-001 | Customer A | 25×25 | 8 | Medium | 93% | $2.00 | USD |
| A-8L-002 | Customer A | 20×20 | 8 | Small | 95% | $1.80 | USD |
| A-NO-PRICE | Customer A | 28×28 | 12 | Medium | 90% | (缺失) | USD |

### Customer B SKUs (8 个)

| SKU Code | Customer | Chip L×W (mm) | Layers | Size | Yield | Price | Currency |
|----------|----------|---------------|--------|------|-------|-------|----------|
| B-14L-001 | Customer B | 28×28 | 14 | Medium | 88% | 120.00 | TWD |
| B-10L-001 | Customer B | 22×22 | 10 | Small | 92% | 75.00 | TWD |
| B-10L-002 | Customer B | 25×25 | 10 | Medium | 90% | 85.00 | TWD |
| B-8L-001 | Customer B | 20×20 | 8 | Small | 95% | 55.00 | TWD |
| B-8L-002 | Customer B | 18×18 | 8 | Small | 95% | 48.00 | TWD |
| B-6L-001 | Customer B | 22×22 | 6 | Small | 95% | 42.00 | TWD |
| B-4L-001 | Customer B | 20×20 | 4 | Small | 95% | 30.00 | TWD |
| B-EUR-001 | Customer B | 25×25 | 10 | Medium | 90% | 2.80 | EUR |

### Customer C SKUs (8 个)

| SKU Code | Customer | Chip L×W (mm) | Layers | Size | Yield | Price | Currency |
|----------|----------|---------------|--------|------|-------|-------|----------|
| C-20L-001 | Customer C | 45×45 | 20 | XLarge | 72% | $8.00 | USD |
| C-20L-002 | Customer C | 40×40 | 20+ | XLarge | 70% | $8.50 | USD |
| C-16L-001 | Customer C | 35×35 | 16 | Large | 82% | $5.80 | USD |
| C-16L-002 | Customer C | 30×30 | 16 | Medium | 85% | $5.00 | USD |
| C-14L-001 | Customer C | 28×28 | 14 | Medium | 88% | $4.00 | USD |
| C-12L-001 | Customer C | 25×25 | 12 | Medium | 90% | $3.50 | USD |
| C-10L-001 | Customer C | 22×22 | 10 | Small | 92% | $2.80 | USD |
| C-ORPHAN | (不存在) | 30×30 | 16 | Medium | 85% | $5.00 | USD |

### Customer D SKUs (6 个)

| SKU Code | Customer | Chip L×W (mm) | Layers | Size | Yield | Price | Currency |
|----------|----------|---------------|--------|------|-------|-------|----------|
| D-8L-001 | Customer D | 18×18 | 8 | Small | 95% | 52.00 | CNY |
| D-8L-002 | Customer D | 20×20 | 8 | Small | 95% | 58.00 | CNY |
| D-4L-001 | Customer D | 15×15 | 4 | Small | 95% | 35.00 | CNY |
| D-4L-002 | Customer D | 18×18 | 4 | Small | 95% | 40.00 | CNY |
| D-6L-001 | Customer D | 20×20 | 6 | Small | 95% | 45.00 | CNY |
| D-6L-002 | Customer D | 22×22 | 6 | Small | 95% | 48.00 | CNY |

### Customer E SKUs (3 个)

| SKU Code | Customer | Chip L×W (mm) | Layers | Size | Yield | Price | Currency |
|----------|----------|---------------|--------|------|-------|-------|----------|
| E-16L-001 | Customer E | 32×32 | 16 | Large | 82% | $6.00 | USD |
| E-12L-001 | Customer E | 28×28 | 12 | Medium | 90% | $3.50 | USD |
| E-8L-001 | Customer E | 22×22 | 8 | Small | 95% | $2.20 | USD |

---

## 二、Forecast 表 (按月按客户，2026 年)

### Customer A 月度预测 (PCS)

| SKU | Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct | Nov | Dec |
|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|
| A-16L-001 | 50K | 50K | 50K | 48K | 45K | 42K | 40K | 38K | 38K | 40K | 42K | 45K |
| A-16L-002 | 40K | 40K | 40K | 38K | 36K | 34K | 32K | 30K | 30K | 32K | 34K | 36K |
| A-20L-001 | 20K | 20K | 20K | 18K | 16K | 15K | 14K | 13K | 13K | 14K | 16K | 18K |
| A-20L-002 | 25K | 25K | 25K | 23K | 21K | 20K | 18K | 17K | 17K | 18K | 20K | 22K |
| A-14L-001 | 60K | 60K | 60K | 58K | 55K | 52K | 50K | 48K | 48K | 50K | 52K | 55K |
| A-14L-002 | 45K | 45K | 45K | 43K | 41K | 39K | 37K | 35K | 35K | 37K | 39K | 41K |
| A-10L-001 | 80K | 80K | 80K | 78K | 75K | 72K | 70K | 68K | 68K | 70K | 72K | 75K |
| A-8L-001 | 70K | 70K | 70K | 68K | 65K | 62K | 60K | 58K | 58K | 60K | 62K | 65K |
| A-8L-002 | 55K | 55K | 55K | 53K | 50K | 48K | 46K | 44K | 44K | 46K | 48K | 50K |

### Customer B 月度预测 (PCS)

| SKU | Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct | Nov | Dec |
|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|
| B-14L-001 | 30K | 30K | 30K | 30K | 30K | 30K | 28K | 24K | 24K | 24K | 24K | 24K |
| B-10L-001 | 50K | 50K | 50K | 50K | 50K | 50K | 45K | 40K | 40K | 40K | 40K | 40K |
| B-10L-002 | 40K | 40K | 40K | 40K | 40K | 40K | 36K | 32K | 32K | 32K | 32K | 32K |
| B-8L-001 | 60K | 60K | 60K | 60K | 60K | 60K | 54K | 48K | 48K | 48K | 48K | 48K |
| B-8L-002 | 45K | 45K | 45K | 45K | 45K | 45K | 40K | 36K | 36K | 36K | 36K | 36K |
| B-6L-001 | 35K | 35K | 35K | 35K | 35K | 35K | 32K | 28K | 28K | 28K | 28K | 28K |
| B-4L-001 | 25K | 25K | 25K | 25K | 25K | 25K | 22K | 20K | 20K | 20K | 20K | 20K |

### Customer C 月度预测 (PCS)

| SKU | Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct | Nov | Dec |
|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|
| C-20L-001 | 10K | 12K | 14K | 16K | 18K | 20K | 22K | 25K | 28K | 30K | 35K | 40K |
| C-20L-002 | 8K | 10K | 12K | 14K | 16K | 18K | 20K | 22K | 25K | 28K | 32K | 36K |
| C-16L-001 | 15K | 18K | 20K | 22K | 25K | 28K | 30K | 32K | 35K | 38K | 42K | 45K |
| C-16L-002 | 20K | 22K | 25K | 28K | 30K | 32K | 35K | 38K | 40K | 42K | 45K | 48K |
| C-14L-001 | 25K | 28K | 30K | 32K | 35K | 38K | 40K | 42K | 45K | 48K | 50K | 52K |
| C-12L-001 | 30K | 32K | 35K | 38K | 40K | 42K | 45K | 48K | 50K | 52K | 55K | 58K |
| C-10L-001 | 35K | 38K | 40K | 42K | 45K | 48K | 50K | 52K | 55K | 58K | 60K | 62K |

### Customer D 月度预测 (PCS)

| SKU | Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct | Nov | Dec |
|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|
| D-8L-001 | 40K | 40K | 40K | 40K | 40K | 40K | 40K | 40K | 40K | 40K | 40K | 40K |
| D-8L-002 | 35K | 35K | 35K | 35K | 35K | 35K | 35K | 35K | 35K | 35K | 35K | 35K |
| D-4L-001 | 50K | 50K | 50K | 50K | 50K | 50K | 50K | 50K | 50K | 50K | 50K | 50K |
| D-4L-002 | 45K | 45K | 45K | 45K | 45K | 45K | 45K | 45K | 45K | 45K | 45K | 45K |
| D-6L-001 | 42K | 42K | 42K | 42K | 42K | 42K | 42K | 42K | 42K | 42K | 42K | 42K |
| D-6L-002 | 38K | 38K | 38K | 38K | 38K | 38K | 38K | 38K | 38K | 38K | 38K | 38K |

### Customer E 月度预测 (PCS)

| SKU | Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct | Nov | Dec |
|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|
| E-16L-001 | 8K | 8K | 8K | 8K | 8K | 8K | 8K | 8K | 8K | 8K | 8K | 8K |
| E-12L-001 | 12K | 12K | 12K | 12K | 12K | 12K | 12K | 12K | 12K | 12K | 12K | 12K |
| E-8L-001 | 15K | 15K | 15K | 15K | 15K | 15K | 15K | 15K | 15K | 15K | 15K | 15K |

### 孤儿预测 (Orphan Forecast)

| SKU Code | Customer | Month | Forecast PCS | 问题 |
|----------|----------|-------|-------------|------|
| C-ORPHAN | (不存在) | 2026-06 | 10,000 | SKU 不存在 |
| C-ORPHAN | (不存在) | 2026-07 | 12,000 | SKU 不存在 |
| C-ORPHAN | (不存在) | 2026-08 | 15,000 | SKU 不存在 |

---

## 三、Capacity 表 (按月按工厂)

### Factory 1 (F1) — 主力厂

| 月份 | Core Panel/Day | BU Panel/Day |
|------|---------------|-------------|
| 2026-01 | 6,000 | 12,000 |
| 2026-02 | 6,000 | 12,000 |
| 2026-03 | 6,000 | 12,000 |
| 2026-04 | 6,000 | 12,000 |
| 2026-05 | 6,000 | 12,000 |
| 2026-06 | 6,000 | 12,000 |
| 2026-07 | 6,000 | 12,000 |
| 2026-08 | 6,000 | 12,000 |
| 2026-09 | 6,000 | 12,000 |
| 2026-10 | 6,000 | 12,000 |
| 2026-11 | 6,000 | 12,000 |
| 2026-12 | 6,000 | 12,000 |
| 2027-01 to 2027-06 | 6,000 | 12,000 |
| 2027-07 to 2027-12 | 6,500 | 13,000 |

### Factory 2 (F2) — 扩张中

| 月份 | Core Panel/Day | BU Panel/Day |
|------|---------------|-------------|
| 2026-01 to 2026-06 | 3,000 | 6,000 |
| 2026-07 to 2026-12 | 3,500 | 7,000 |
| 2027-01 to 2027-06 | 4,000 | 8,000 |
| 2027-07 to 2027-12 | 4,500 | 9,000 |

### Factory 3 (F3) — 新厂 (2027 Q2 投产)

| 月份 | Core Panel/Day | BU Panel/Day |
|------|---------------|-------------|
| 2026-01 to 2026-12 | 0 | 0 |
| 2027-01 to 2027-03 | 0 | 0 |
| 2027-04 to 2027-06 | 1,500 | 3,000 |
| 2027-07 to 2027-12 | 2,000 | 4,000 |

### 缺失产能月份 (Missing Capacity)

| 月份 | 工厂 | 问题 |
|------|------|------|
| 2026-09 | F2 | 故意缺失（用于演示 DQ 检测） |

---

## 四、BP Targets 表

| 年份 | BP 目标 (Million TWD) | 状态 |
|------|----------------------|------|
| 2026 | 3,200 | 有数据 |
| 2027 | 3,800 | 有数据 |
| 2028 | (缺失) | 故意缺失 |

---

## 五、Parameters 表

### 汇率

| 币种对 | 汇率 | 类型 |
|--------|------|------|
| USD → TWD | 32.5 | Constant |
| USD → CNY | 7.25 | Constant |

### 面板参数

| 参数 | 值 |
|------|-----|
| Panel Length | 244.1 mm |
| Panel Width | 246.2 mm |
| Margin Length | 10 mm |
| Margin Width | 5.3 mm |
| Tolerance | 0 mm |
| Working Days | 28 |

### 良率矩阵

| Size Category | 2-8L | 10-14L | 16-20L | 20L+ |
|---------------|------|--------|--------|------|
| Small | 0.95 | 0.92 | 0.88 | 0.82 |
| Medium | 0.93 | 0.90 | 0.85 | 0.78 |
| Large | 0.90 | 0.87 | 0.82 | 0.75 |
| XLarge | 0.88 | 0.85 | 0.80 | 0.72 |

---

**文档版本**: v1.0
**创建日期**: 2026-05-29
**维护者**: Demo Dataset Agent
