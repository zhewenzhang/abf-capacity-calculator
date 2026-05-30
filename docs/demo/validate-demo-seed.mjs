// validate-demo-seed.mjs
// v1.48.1 Demo Seed Business Consistency Validator
// 本地只读验证脚本，不写入任何数据

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const load = (name) => JSON.parse(readFileSync(join(__dirname, name), 'utf8'));

// Load all seed files
const products = load('DEMO_SEED_PRODUCTS.json');
const forecasts = load('DEMO_SEED_FORECASTS.json');
const capacity = load('DEMO_SEED_CAPACITY.json');
const parameters = load('DEMO_SEED_PARAMETERS.json');
const bpTargets = load('DEMO_SEED_BP_TARGETS.json');

const results = [];
const pass = (id, msg) => results.push({ id, status: 'PASS', msg });
const fail = (id, msg) => results.push({ id, status: 'FAIL', msg });

// ── 1. JSON Parse ──
try {
  products; forecasts; capacity; parameters; bpTargets;
  pass('JSON-PARSE', 'All 5 JSON files parse successfully');
} catch (e) {
  fail('JSON-PARSE', `JSON parse error: ${e.message}`);
}

// ── 2. C-ORPHAN not in products ──
const productIds = new Set(products.products.map(p => p.id));
const hasOrphanProduct = productIds.has('sku-c-orphan');
if (!hasOrphanProduct) {
  pass('C-ORPHAN-ABSENT', 'C-ORPHAN is NOT in products (correct)');
} else {
  fail('C-ORPHAN-ABSENT', 'C-ORPHAN found in products (should be absent)');
}

// ── 3. Forecast record count ──
const forecastCount = forecasts.forecasts.length;
console.log(`  Forecast records: ${forecastCount}`);

// ── 4. Calculate 2026 Forecast Revenue (TWD) ──
const EXCHANGE_USD_TWD = parameters.parameters.currencySettings.constantUsdToTwdRate; // 32.5
const EXCHANGE_CNY_TWD = parameters.parameters.currencySettings.constantUsdToTwdRate /
                          parameters.parameters.currencySettings.constantUsdToCnyRate; // 32.5/7.25 ≈ 4.48

let totalRevenueTwd = 0;
let revenueByCustomer = {};

for (const fc of forecasts.forecasts) {
  if (!fc.month.startsWith('2026')) continue;

  const product = products.products.find(p => p.id === fc.skuId);
  if (!product) continue; // Skip orphan forecasts

  const price = fc.unitPrice;
  const pcs = fc.forecastPcs;
  const currency = fc.unitPriceCurrency || product.unitPriceCurrency || 'USD';

  let revenueTwd = 0;
  if (currency === 'USD') {
    revenueTwd = pcs * price * EXCHANGE_USD_TWD;
  } else if (currency === 'TWD') {
    revenueTwd = pcs * price;
  } else if (currency === 'CNY') {
    revenueTwd = pcs * price * EXCHANGE_CNY_TWD;
  }
  // EUR and others: skip (unsupported)

  totalRevenueTwd += revenueTwd;

  const cust = product.customer;
  if (!revenueByCustomer[cust]) revenueByCustomer[cust] = 0;
  revenueByCustomer[cust] += revenueTwd;
}

const totalRevenueMillionTwd = totalRevenueTwd / 1_000_000;
console.log(`  2026 Forecast Revenue: ${totalRevenueMillionTwd.toFixed(1)}M TWD`);
console.log(`  Revenue by customer:`);
for (const [cust, rev] of Object.entries(revenueByCustomer).sort()) {
  console.log(`    ${cust}: ${(rev / 1_000_000).toFixed(1)}M TWD (${(rev / totalRevenueTwd * 100).toFixed(1)}%)`);
}

// Target: 2,800M TWD (28 亿 TWD) ±5% = 2,660 - 2,940M TWD
if (totalRevenueMillionTwd >= 2660 && totalRevenueMillionTwd <= 2940) {
  pass('REVENUE-TARGET', `Revenue ${totalRevenueMillionTwd.toFixed(1)}M TWD is within 2,800M ±5% (28 亿 TWD)`);
} else {
  fail('REVENUE-TARGET', `Revenue ${totalRevenueMillionTwd.toFixed(1)}M TWD is NOT within 2,800M ±5% (2,660-2,940M)`);
}

// ── 5. BP Attainment ──
const bpTarget2026 = bpTargets.bpTargets.yearlyRevenueTargetsMillionTwd['2026']; // 3200
const attainment = (totalRevenueMillionTwd / bpTarget2026) * 100;
console.log(`  BP Target 2026: ${bpTarget2026}M TWD`);
console.log(`  BP Attainment: ${attainment.toFixed(1)}%`);

if (attainment >= 83 && attainment <= 92) {
  pass('BP-ATTAINMENT', `BP Attainment ${attainment.toFixed(1)}% is within 83-92%`);
} else {
  fail('BP-ATTAINMENT', `BP Attainment ${attainment.toFixed(1)}% is NOT within 83-92%`);
}

// ── 6. Customer A 2026-07 Order Disappearance ──
const custAJulForecasts = forecasts.forecasts.filter(fc => {
  const product = products.products.find(p => p.id === fc.skuId);
  return product && product.customer === 'Customer A' && fc.month === '2026-07';
});
const custAJulTotalPcs = custAJulForecasts.reduce((sum, fc) => sum + fc.forecastPcs, 0);
console.log(`  Customer A 2026-07 total pcs: ${custAJulTotalPcs}`);

if (custAJulTotalPcs === 0) {
  pass('CUST-A-JUL-DISAPPEAR', 'Customer A 2026-07 forecast is 0 (order disappearance)');
} else {
  fail('CUST-A-JUL-DISAPPEAR', `Customer A 2026-07 forecast is ${custAJulTotalPcs} pcs (should be 0)`);
}

// ── 7. Customer C 2026-11 Surge ──
const custCOctForecasts = forecasts.forecasts.filter(fc => {
  const product = products.products.find(p => p.id === fc.skuId);
  return product && product.customer === 'Customer C' && fc.month === '2026-10';
});
const custCNovForecasts = forecasts.forecasts.filter(fc => {
  const product = products.products.find(p => p.id === fc.skuId);
  return product && product.customer === 'Customer C' && fc.month === '2026-11';
});
const custCOctTotal = custCOctForecasts.reduce((sum, fc) => sum + fc.forecastPcs, 0);
const custCNovTotal = custCNovForecasts.reduce((sum, fc) => sum + fc.forecastPcs, 0);
const surgePct = custCOctTotal > 0 ? ((custCNovTotal - custCOctTotal) / custCOctTotal * 100) : 0;
console.log(`  Customer C 2026-10 total: ${custCOctTotal} pcs`);
console.log(`  Customer C 2026-11 total: ${custCNovTotal} pcs`);
console.log(`  Surge: ${surgePct.toFixed(1)}%`);

if (surgePct >= 45) {
  pass('CUST-C-NOV-SURGE', `Customer C 2026-11 surge is ${surgePct.toFixed(1)}% (≥45%)`);
} else {
  fail('CUST-C-NOV-SURGE', `Customer C 2026-11 surge is ${surgePct.toFixed(1)}% (should be ≥45%)`);
}

// ── 8. Core Utilization 2026-07~10 ──
const WORKING_DAYS = parameters.parameters.defaultWorkingDays || 28;

// Panel layout calculation
const panelL = parameters.parameters.panelParams.panelLengthMm; // 244.1
const panelW = parameters.parameters.panelParams.panelWidthMm; // 246.2
const marginL = parameters.parameters.panelParams.marginLengthMm; // 10
const marginW = parameters.parameters.panelParams.marginWidthMm; // 5.3

function calcUpp(chipL, chipW) {
  const usableL = panelL - marginL;
  const usableW = panelW - marginW;
  return Math.floor(usableL / chipL) * Math.floor(usableW / chipW);
}

function getYield(sizeCategory, layerCount) {
  const ym = parameters.parameters.yieldMatrix;
  let bucket;
  if (layerCount <= 8) bucket = '4-8L';
  else if (layerCount <= 14) bucket = '10-14L';
  else if (layerCount <= 20) bucket = '16-20L';
  else bucket = '20L+';
  return ym[sizeCategory]?.[bucket] ?? 0.85;
}

const coreUtilMonths = ['2026-07', '2026-08', '2026-09', '2026-10'];
console.log(`  Core Utilization (2026-07~10):`);

for (const month of coreUtilMonths) {
  // Calculate total Core panel demand
  let totalCoreDemand = 0;

  const monthForecasts = forecasts.forecasts.filter(fc => fc.month === month);
  for (const fc of monthForecasts) {
    const product = products.products.find(p => p.id === fc.skuId);
    if (!product || fc.forecastPcs <= 0) continue;

    const upp = calcUpp(product.chipLengthMm, product.chipWidthMm);
    const yieldRate = getYield(product.sizeCategory, product.layerCount);
    const requiredInputPcs = fc.forecastPcs / yieldRate;
    const requiredPanels = Math.ceil(requiredInputPcs / upp);

    // Core steps: roughly layerCount / 2 for ABF
    const coreSteps = Math.max(Math.ceil(product.layerCount / 4), 1);
    totalCoreDemand += requiredPanels * coreSteps;
  }

  // Calculate Core capacity
  const monthCapacity = capacity.capacityPlans.filter(cp => cp.month === month);
  let totalCoreCapacity = 0;
  for (const cp of monthCapacity) {
    totalCoreCapacity += cp.corePanelPerDay * WORKING_DAYS;
  }

  const util = totalCoreCapacity > 0 ? (totalCoreDemand / totalCoreCapacity * 100) : Infinity;
  console.log(`    ${month}: demand=${totalCoreDemand.toFixed(0)}, capacity=${totalCoreCapacity}, util=${util.toFixed(2)}%`);

  if (month === '2026-07' || month === '2026-08') {
    if (util >= 88 && util <= 97) {
      pass(`CORE-UTIL-${month}`, `Core utilization ${util.toFixed(1)}% is in 88-97% range`);
    } else {
      fail(`CORE-UTIL-${month}`, `Core utilization ${util.toFixed(1)}% is NOT in 88-97% range`);
    }
  }
}

// ── Summary ──
console.log('\n═══════════════════════════════════════');
console.log('  VALIDATION SUMMARY');
console.log('═══════════════════════════════════════');
let allPass = true;
for (const r of results) {
  const icon = r.status === 'PASS' ? '✅' : '❌';
  console.log(`  ${icon} ${r.id}: ${r.msg}`);
  if (r.status === 'FAIL') allPass = false;
}
console.log(`\n  Overall: ${allPass ? 'PASS ✅' : 'FAIL ❌'}`);
process.exit(allPass ? 0 : 1);
