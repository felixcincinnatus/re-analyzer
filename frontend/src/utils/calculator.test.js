// calculator.test.js — parity tests: JS outputs must match Python-generated fixtures to ±$0.01
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { calculateDeal, repairEstimate, REPAIR_COST_GE } from './calculator.js';

const require = createRequire(import.meta.url);
const fixtures = require('../../../backend/tests/calculator_fixtures.json');

const TOLERANCE = 0.01;

function near(a, b) {
  return Math.abs(a - b) < TOLERANCE;
}

function assertCosts(jsCosts, pyCosts, label) {
  const fields = ['repair_estimate', 'closing_costs', 'holding_costs', 'selling_costs', 'total_all_in_cost'];
  for (const f of fields) {
    expect(near(jsCosts[f], pyCosts[f]), `${label}: ${f} — JS=${jsCosts[f]} PY=${pyCosts[f]}`).toBe(true);
  }
}

function assertMetrics(jsMetrics, pyMetrics, label) {
  const numFields = ['net_profit', 'roi_pct', 'max_bid_70', 'max_bid_custom', 'profit_margin_pct'];
  for (const f of numFields) {
    expect(near(jsMetrics[f], pyMetrics[f]), `${label}: ${f} — JS=${jsMetrics[f]} PY=${pyMetrics[f]}`).toBe(true);
  }
  expect(jsMetrics.deal_score).toBe(pyMetrics.deal_score);
}

describe('calculator.js parity with Python backend', () => {
  for (const fixture of fixtures) {
    it(fixture.label, () => {
      const inp = fixture.input;
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

      expect(result).not.toBeNull();
      assertCosts(result.costs, fixture.costs, fixture.label);
      assertMetrics(result.metrics, fixture.metrics, fixture.label);
    });
  }

  it('GE market uses REPAIR_COST_GE table', () => {
    // Good condition, 80 sqft → GE table: base=20000, per_sqft=15 → 20000+15*80=21200
    const repair = repairEstimate('Good', 80, 'ge');
    expect(repair).toBe(REPAIR_COST_GE.Good.base + REPAIR_COST_GE.Good.per_sqft * 80);
    expect(repair).toBe(21200);
  });

  it('repair_override skips the formula', () => {
    const repair = repairEstimate('Fair', 1800, 'us', 45000);
    expect(repair).toBe(45000);
  });

  it('returns null when arv_estimate is zero or missing', () => {
    expect(calculateDeal({ purchase_price: 100000, arv_estimate: 0, condition: 'Fair', sqft: 1000, market: 'us', closing_costs_pct: 3, holding_months: 6, monthly_holding_cost: 1000, selling_costs_pct: 6 })).toBeNull();
    expect(calculateDeal({ purchase_price: 100000, arv_estimate: null, condition: 'Fair', sqft: 1000, market: 'us', closing_costs_pct: 3, holding_months: 6, monthly_holding_cost: 1000, selling_costs_pct: 6 })).toBeNull();
  });

  it('roi_pct is 0 when cash_invested is 0', () => {
    // purchase_price=0, repair via formula=0 (Good,sqft=0 → base=10000), so cash_invested=10000 for US
    // Use a case where purchase_price=0 but explicitly test roi=0 by passing repair_override=0
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
    expect(result).not.toBeNull();
    expect(result.metrics.roi_pct).toBe(0);
  });
});
