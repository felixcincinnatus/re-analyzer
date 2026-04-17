// calculator.js — client-side port of backend/app/services/calculator.py
// Intermediate values are kept as unrounded floats (matching Python behavior).
// Rounding happens only on final output values, to 2 decimal places.

export const REPAIR_COST_US = {
  Good: { base: 10_000, per_sqft: 15 },
  Fair: { base: 20_000, per_sqft: 35 },
  Poor: { base: 40_000, per_sqft: 65 },
};

export const REPAIR_COST_GE = {
  Good: { base: 20_000, per_sqft: 15 },
  Fair: { base: 40_000, per_sqft: 35 },
  Poor: { base: 75_000, per_sqft: 65 },
};

/**
 * Compute repair estimate from condition + sqft + market.
 * If repair_override is provided (non-null), it is returned as-is.
 */
export function repairEstimate(condition, sqft, market, repairOverride = null) {
  if (repairOverride !== null && repairOverride !== undefined) return repairOverride;
  const table = market === 'us' ? REPAIR_COST_US : REPAIR_COST_GE;
  const rates = table[condition] ?? table['Fair'];
  return rates.base + rates.per_sqft * sqft;
}

/**
 * Compute costs from deal inputs. Returns null if arv_estimate or purchase_price <= 0.
 * All inputs are raw (unrounded). Output values are rounded to 2dp.
 */
export function computeCosts({
  purchasePrice,
  repair,
  closingCostsPct,
  holdingMonths,
  monthlyHoldingCost,
  sellingCostsPct,
  arvEstimate,
}) {
  if (arvEstimate <= 0) return null;

  const closing = purchasePrice * closingCostsPct / 100;
  const holding = monthlyHoldingCost * holdingMonths;
  const selling = arvEstimate * sellingCostsPct / 100;
  const totalCost = purchasePrice + repair + closing + holding + selling;

  return {
    repair_estimate: round2(repair),
    closing_costs: round2(closing),
    holding_costs: round2(holding),
    selling_costs: round2(selling),
    total_all_in_cost: round2(totalCost),
  };
}

/**
 * Compute deal metrics from ARV, costs object, and cash invested.
 * Returns null if costs is null.
 * roi_pct is set to 0 when cash_invested === 0 to avoid divide-by-zero.
 */
export function computeMetrics(arvEstimate, costs, cashInvested) {
  if (!costs) return null;

  const { repair_estimate: repair, closing_costs: closing } = costs;
  const totalCost = costs.total_all_in_cost;

  const netProfit = arvEstimate - totalCost;
  const ci = cashInvested !== undefined ? cashInvested : 0;
  const roiPct = ci !== 0 ? (netProfit / ci * 100) : 0;
  const profitMarginPct = arvEstimate !== 0 ? (netProfit / arvEstimate * 100) : 0;

  const max_bid_70 = arvEstimate * 0.70 - repair;
  const holdingCosts = costs.holding_costs;
  const sellingCosts = costs.selling_costs;
  const max_bid_custom = arvEstimate * 0.85 - repair - closing - holdingCosts - sellingCosts;

  let deal_score;
  if (roiPct >= 20 && netProfit >= 15_000) {
    deal_score = 'STRONG';
  } else if (roiPct >= 10 && netProfit >= 5_000) {
    deal_score = 'MARGINAL';
  } else {
    deal_score = 'AVOID';
  }

  return {
    net_profit: round2(netProfit),
    roi_pct: round2(roiPct),
    max_bid_70: round2(max_bid_70),
    max_bid_custom: round2(max_bid_custom),
    deal_score,
    profit_margin_pct: round2(profitMarginPct),
  };
}

/**
 * Full deal calculation from a displayInputs object.
 * Returns { costs, metrics, cash_invested } or null if inputs are invalid.
 * repairOverride: optional number (from slider), overrides the formula if provided.
 */
export function calculateDeal(inputs, repairOverride = null) {
  const {
    purchase_price,
    arv_estimate,
    condition,
    sqft,
    market,
    closing_costs_pct,
    holding_months,
    monthly_holding_cost,
    selling_costs_pct,
  } = inputs;

  if (!arv_estimate || arv_estimate <= 0) return null;

  const repair = repairEstimate(condition, sqft, market, repairOverride);
  const closing = purchase_price * closing_costs_pct / 100;
  const cashInvested = purchase_price + repair + closing;

  const costs = computeCosts({
    purchasePrice: purchase_price,
    repair,
    closingCostsPct: closing_costs_pct,
    holdingMonths: holding_months,
    monthlyHoldingCost: monthly_holding_cost,
    sellingCostsPct: selling_costs_pct,
    arvEstimate: arv_estimate,
  });

  const metrics = computeMetrics(arv_estimate, costs, cashInvested);

  return { costs, metrics, cash_invested: round2(cashInvested) };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
