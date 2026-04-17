#!/usr/bin/env node
// Parity test: JS calculator must match Python fixtures to ±$0.01.
// Run with: node src/utils/calculator.parity.mjs
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { calculateDeal, repairEstimate, REPAIR_COST_GE } from './calculator.js';

const __dir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const fixtures = require(join(__dir, '../../../backend/tests/calculator_fixtures.json'));

const TOLERANCE = 0.01;
let passed = 0;
let failed = 0;

function near(a, b) { return Math.abs(a - b) < TOLERANCE; }

function assert(condition, msg) {
  if (!condition) {
    console.error(`  FAIL: ${msg}`);
    failed++;
  } else {
    passed++;
  }
}

function checkCosts(got, want, label) {
  for (const f of ['repair_estimate', 'closing_costs', 'holding_costs', 'selling_costs', 'total_all_in_cost']) {
    assert(near(got[f], want[f]), `${label} costs.${f}: got ${got[f]}, want ${want[f]}`);
  }
}

function checkMetrics(got, want, label) {
  for (const f of ['net_profit', 'roi_pct', 'max_bid_70', 'max_bid_custom', 'profit_margin_pct']) {
    assert(near(got[f], want[f]), `${label} metrics.${f}: got ${got[f]}, want ${want[f]}`);
  }
  assert(got.deal_score === want.deal_score, `${label} deal_score: got ${got.deal_score}, want ${want.deal_score}`);
}

// ── Fixture parity tests ──────────────────────────────────────────────────────
for (const fx of fixtures) {
  console.log(`Testing: ${fx.label}`);
  const inp = fx.input;
  const result = calculateDeal({
    purchase_price: inp.purchase_price,
    arv_estimate: inp.arv_estimate,
    condition: inp.condition,
    sqft: inp.sqft,
    market: inp.market,
    closing_costs_pct: inp.closing_costs_pct,
    holding_months: inp.holding_months,
    monthly_holding_cost: inp.monthly_holding_cost,
    selling_costs_pct: inp.selling_costs_pct,
  }, inp.repair_override ?? null);

  assert(result !== null, `${fx.label}: expected non-null result`);
  if (result) {
    checkCosts(result.costs, fx.costs, fx.label);
    checkMetrics(result.metrics, fx.metrics, fx.label);
  }
}

// ── Unit tests ────────────────────────────────────────────────────────────────
console.log('Testing: GE market uses REPAIR_COST_GE table');
{
  const repair = repairEstimate('Good', 80, 'ge');
  const expected = REPAIR_COST_GE.Good.base + REPAIR_COST_GE.Good.per_sqft * 80;
  assert(repair === expected, `GE repair: got ${repair}, want ${expected}`);
  assert(repair === 21200, `GE repair should be 21200, got ${repair}`);
}

console.log('Testing: repair_override skips formula');
{
  const repair = repairEstimate('Fair', 1800, 'us', 45000);
  assert(repair === 45000, `repair_override: got ${repair}, want 45000`);
}

console.log('Testing: null when arv_estimate is 0');
{
  const inp = { purchase_price: 100000, arv_estimate: 0, condition: 'Fair', sqft: 1000, market: 'us', closing_costs_pct: 3, holding_months: 6, monthly_holding_cost: 1000, selling_costs_pct: 6 };
  assert(calculateDeal(inp) === null, 'arv_estimate=0 should return null');
}

console.log('Testing: roi_pct is 0 when cash_invested is 0');
{
  const result = calculateDeal({
    purchase_price: 0,
    arv_estimate: 100000,
    condition: 'Good',
    sqft: 0,
    market: 'us',
    closing_costs_pct: 0,
    holding_months: 0,
    monthly_holding_cost: 0,
    selling_costs_pct: 0,
  }, 0); // repair_override=0 → cash_invested=0
  assert(result !== null, 'repair_override=0, purchase_price=0 should not be null');
  if (result) assert(result.metrics.roi_pct === 0, `roi_pct should be 0 when cash_invested=0, got ${result.metrics.roi_pct}`);
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${passed + failed} assertions: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
console.log('All parity checks passed.');
