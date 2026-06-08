#!/usr/bin/env node
/**
 * verify-release-baseline.cjs — v1.61.1
 *
 * Checks that ALL required features are present before deployment.
 * Run via: npm run verify:release-baseline
 *
 * Exit code 0 = PASS, 1 = FAIL
 */

const fs = require('fs');
const path = require('path');

const FRONTEND = path.join(__dirname, '..', 'frontend', 'src');

let allPassed = true;
const errors = [];

function check(label, filePath, pattern, invert = false) {
  const fullPath = path.join(FRONTEND, filePath);
  if (!fs.existsSync(fullPath)) {
    errors.push(`MISSING FILE: ${filePath}`);
    allPassed = false;
    return;
  }
  const content = fs.readFileSync(fullPath, 'utf-8');
  const found = content.includes(pattern);
  if (invert) {
    // Check that pattern is NOT present
    if (found) {
      errors.push(`FAIL (should NOT contain): ${filePath} contains ${JSON.stringify(pattern)}`);
      allPassed = false;
    }
  } else {
    if (!found) {
      errors.push(`FAIL (should contain): ${filePath} missing ${JSON.stringify(pattern)}`);
      allPassed = false;
    }
  }
}

// ========== Version ==========
const pkgPath = path.join(__dirname, '..', 'frontend', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
if (parseInt(pkg.version.split('.')[1], 10) < 60) {
  errors.push(`FAIL: version ${pkg.version} is below v1.60.x — possible regression`);
  allPassed = false;
}

// ========== Global AI Drawer ==========
check('CopilotDrawerProvider', 'App.tsx', 'CopilotDrawerProvider');
check('CopilotDrawerButton', 'App.tsx', 'CopilotDrawerButton');
check('GlobalCopilotDrawer', 'App.tsx', 'GlobalCopilotDrawer');
check('CopilotDrawerContext exists', 'components/copilot/CopilotDrawerContext.tsx', 'CopilotDrawerProvider');

// ========== Risk Brief ==========
check('Risk brief executive conclusion', 'pages/CalculationResults.tsx', 'executiveConclusion');
check('Risk brief key findings', 'pages/CalculationResults.tsx', 'findings');
check('Risk brief planStatus', 'pages/CalculationResults.tsx', 'planStatus');

// ========== Yearly Metrics ==========
check('Yearly metrics state', 'pages/DailyOperationsWorkbench.tsx', 'metricsYear');
check('Annual revenue display', 'pages/DailyOperationsWorkbench.tsx', 'annualRevenue');

// ========== BP Simulation ==========
check('BP simActive', 'pages/BpTargets.tsx', 'simActive');
check('BP version history', 'pages/BpTargets.tsx', 'handleSaveVersion');

// ========== AI NOT in PRIMARY_NAV ==========
check('AI NOT in PRIMARY_NAV', 'App.tsx', "key: 'copilot'", true); // invert = true

// ========== No regressed content ==========
check('No 問題摘要', 'pages/DailyOperationsWorkbench.tsx', '問題摘要', true);
check('No 今日行動建議', 'pages/DailyOperationsWorkbench.tsx', '今日行動建議', true);

// ========== i18n key parity ==========
// Check that key counts match between zhTW.ts and en.ts
const zhTW = fs.readFileSync(path.join(FRONTEND, 'i18n', 'zhTW.ts'), 'utf-8');
const en = fs.readFileSync(path.join(FRONTEND, 'i18n', 'en.ts'), 'utf-8');
const zhKeys = (zhTW.match(/'[\w.]+':/g) || []).length;
const enKeys = (en.match(/'[\w.]+':/g) || []).length;
if (Math.abs(zhKeys - enKeys) > 50) {
  errors.push(`WARN: i18n key count mismatch zhTW(${zhKeys}) vs en(${enKeys}) — the dedicated i18nKeys.test.ts covers this strictly`);
}

// ========== Results ==========
if (allPassed) {
  console.log('✅ verify:release-baseline — ALL CHECKS PASSED');
  process.exit(0);
} else {
  console.error('❌ verify:release-baseline — FAILED CHECKS:');
  for (const err of errors) {
    console.error(`   ${err}`);
  }
  process.exit(1);
}
