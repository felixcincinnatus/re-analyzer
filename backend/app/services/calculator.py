from ..models.deal import DealRequest, CostBreakdown, DealMetrics

# Repair cost per sqft by condition — US market (USD)
REPAIR_COST_US = {
    "Good":  {"base": 10_000, "per_sqft": 15},
    "Fair":  {"base": 20_000, "per_sqft": 35},
    "Poor":  {"base": 40_000, "per_sqft": 65},
}

# Repair cost per sqft by condition — Georgia/Tbilisi market (GEL)
REPAIR_COST_GE = {
    "Good":  {"base": 20_000, "per_sqft": 15},
    "Fair":  {"base": 40_000, "per_sqft": 35},
    "Poor":  {"base": 75_000, "per_sqft": 65},
}


def calculate_deal(req: DealRequest) -> tuple[CostBreakdown, DealMetrics]:
    table = REPAIR_COST_US if req.market == "us" else REPAIR_COST_GE
    rates = table.get(req.condition, table["Fair"])

    repair = req.repair_override if req.repair_override is not None else (rates["base"] + rates["per_sqft"] * req.sqft)
    closing = req.purchase_price * req.closing_costs_pct / 100
    holding = req.monthly_holding_cost * req.holding_months
    selling = req.arv_estimate * req.selling_costs_pct / 100
    total_cost = req.purchase_price + repair + closing + holding + selling

    net_profit = req.arv_estimate - total_cost
    cash_invested = req.purchase_price + repair + closing
    roi_pct = (net_profit / cash_invested * 100) if cash_invested else 0
    profit_margin_pct = (net_profit / req.arv_estimate * 100) if req.arv_estimate else 0

    max_bid_70 = req.arv_estimate * 0.70 - repair
    # Custom max bid: targets 15% net profit margin
    max_bid_custom = req.arv_estimate * 0.85 - repair - closing - holding - selling

    # Deal scoring
    if roi_pct >= 20 and net_profit >= 15_000:
        score = "STRONG"
    elif roi_pct >= 10 and net_profit >= 5_000:
        score = "MARGINAL"
    else:
        score = "AVOID"

    costs = CostBreakdown(
        repair_estimate=round(repair, 2),
        closing_costs=round(closing, 2),
        holding_costs=round(holding, 2),
        selling_costs=round(selling, 2),
        total_all_in_cost=round(total_cost, 2),
    )

    metrics = DealMetrics(
        net_profit=round(net_profit, 2),
        roi_pct=round(roi_pct, 2),
        max_bid_70=round(max_bid_70, 2),
        max_bid_custom=round(max_bid_custom, 2),
        deal_score=score,
        profit_margin_pct=round(profit_margin_pct, 2),
    )

    return costs, metrics
