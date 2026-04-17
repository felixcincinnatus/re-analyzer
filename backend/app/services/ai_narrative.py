import os
import anthropic
from ..models.deal import DealRequest, CostBreakdown, DealMetrics


def generate_narrative(req: DealRequest, costs: CostBreakdown, metrics: DealMetrics) -> str:
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    client = anthropic.Anthropic(api_key=api_key)

    sym = "₾" if req.market == "ge" else "$"

    prompt = f"""You are a professional real estate investment analyst. Write a concise 3-paragraph deal analysis memo for the following property.

Property Details:
- Address: {req.address}, {req.city}
- Type: {req.property_type} | Condition: {req.condition}
- Size: {req.sqft} sqft | {req.bedrooms}bd / {req.bathrooms}ba
- Purchase Price: {sym}{req.purchase_price:,.0f}
- ARV Estimate: {sym}{req.arv_estimate:,.0f}

Cost Breakdown:
- Repair Estimate: {sym}{costs.repair_estimate:,.0f}
- Closing Costs: {sym}{costs.closing_costs:,.0f}
- Holding Costs ({req.holding_months} months): {sym}{costs.holding_costs:,.0f}
- Selling Costs: {sym}{costs.selling_costs:,.0f}
- Total All-In Cost: {sym}{costs.total_all_in_cost:,.0f}

Returns:
- Net Profit: {sym}{metrics.net_profit:,.0f}
- ROI: {metrics.roi_pct:.1f}%
- Profit Margin: {metrics.profit_margin_pct:.1f}%
- Deal Score: {metrics.deal_score}

Paragraph 1: Summarize the deal opportunity and property condition.
Paragraph 2: Analyze the financials — highlight strengths or concerns.
Paragraph 3: Give a clear recommendation (buy/pass/negotiate) with reasoning.

Write in a professional but direct tone. No bullet points — full paragraphs only."""

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=600,
        messages=[{"role": "user", "content": prompt}],
    )

    return message.content[0].text
