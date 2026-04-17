import io
from datetime import date
from html import escape
from weasyprint import HTML
from ..models.deal import DealRequest, CostBreakdown, DealMetrics


SCORE_COLORS = {
    "STRONG":   ("#1a7a4a", "#d4f5e2"),
    "MARGINAL": ("#7a5c1a", "#fef3cd"),
    "AVOID":    ("#7a1a1a", "#fde8e8"),
}


def fmt(value: float, symbol: str) -> str:
    return f"{symbol}{value:,.0f}"


def generate_pdf(req: DealRequest, costs: CostBreakdown, metrics: DealMetrics, narrative: str) -> bytes:
    sym = "₾" if req.market == "ge" else "$"
    score = metrics.deal_score
    score_fg, score_bg = SCORE_COLORS.get(score, ("#333", "#eee"))

    html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    font-family: 'Inter', Arial, sans-serif;
    font-size: 11px;
    color: #1a1a1a;
    padding: 32px 40px;
    line-height: 1.5;
  }}
  h1 {{ font-size: 20px; font-weight: 700; margin-bottom: 2px; }}
  h2 {{ font-size: 13px; font-weight: 600; margin: 18px 0 8px; border-bottom: 1px solid #e0e0e0; padding-bottom: 4px; }}
  .header {{ display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }}
  .meta {{ font-size: 10px; color: #666; margin-top: 4px; }}
  .score-banner {{
    display: inline-block;
    padding: 6px 20px;
    border-radius: 6px;
    font-size: 16px;
    font-weight: 700;
    color: {score_fg};
    background: {score_bg};
    border: 1.5px solid {score_fg};
  }}
  table {{ width: 100%; border-collapse: collapse; margin-bottom: 8px; }}
  td, th {{ padding: 5px 8px; text-align: left; font-size: 10.5px; }}
  th {{ background: #f5f5f5; font-weight: 600; }}
  tr:nth-child(even) td {{ background: #fafafa; }}
  .total-row td {{ font-weight: 700; border-top: 1.5px solid #ccc; }}
  .two-col {{ display: flex; gap: 16px; }}
  .two-col > div {{ flex: 1; }}
  .grid-4 {{ display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; margin-bottom: 8px; }}
  .card {{
    background: #f8f8f8;
    border: 1px solid #e5e5e5;
    border-radius: 6px;
    padding: 8px 10px;
  }}
  .card-label {{ font-size: 9px; color: #888; margin-bottom: 2px; }}
  .card-value {{ font-size: 14px; font-weight: 700; }}
  .narrative {{ font-size: 10.5px; line-height: 1.7; color: #333; }}
  .narrative p {{ margin-bottom: 10px; }}
  .footer {{ margin-top: 24px; border-top: 1px solid #e0e0e0; padding-top: 8px; font-size: 9px; color: #aaa; display: flex; justify-content: space-between; }}
  .highlight {{ color: {score_fg}; }}
</style>
</head>
<body>

<div class="header">
  <div>
    <h1>Deal Analysis Memo</h1>
    <div class="meta">{escape(req.address)}, {escape(req.city)} &nbsp;|&nbsp; {escape(req.property_type)} &nbsp;|&nbsp; {req.sqft:,.0f} sqft &nbsp;|&nbsp; {req.bedrooms}bd/{req.bathrooms}ba</div>
    <div class="meta">Analyst: {escape(req.analyst_name or '')} &nbsp;|&nbsp; Date: {date.today().strftime("%B %d, %Y")} &nbsp;|&nbsp; Market: {"Georgia (GEL)" if req.market == "ge" else "United States (USD)"}</div>
  </div>
  <div class="score-banner">{score}</div>
</div>

<div class="grid-4">
  <div class="card"><div class="card-label">Purchase Price</div><div class="card-value">{fmt(req.purchase_price, sym)}</div></div>
  <div class="card"><div class="card-label">ARV Estimate</div><div class="card-value">{fmt(req.arv_estimate, sym)}</div></div>
  <div class="card"><div class="card-label">Net Profit</div><div class="card-value highlight">{fmt(metrics.net_profit, sym)}</div></div>
  <div class="card"><div class="card-label">ROI</div><div class="card-value highlight">{metrics.roi_pct:.1f}%</div></div>
</div>

<div class="two-col">
  <div>
    <h2>Cost Breakdown</h2>
    <table>
      <tr><th>Item</th><th>Amount</th></tr>
      <tr><td>Purchase Price</td><td>{fmt(req.purchase_price, sym)}</td></tr>
      <tr><td>Repair Estimate ({escape(req.condition)} condition)</td><td>{fmt(costs.repair_estimate, sym)}</td></tr>
      <tr><td>Closing Costs ({req.closing_costs_pct}%)</td><td>{fmt(costs.closing_costs, sym)}</td></tr>
      <tr><td>Holding Costs ({req.holding_months} mo @ {fmt(req.monthly_holding_cost, sym)}/mo)</td><td>{fmt(costs.holding_costs, sym)}</td></tr>
      <tr><td>Selling Costs ({req.selling_costs_pct}%)</td><td>{fmt(costs.selling_costs, sym)}</td></tr>
      <tr class="total-row"><td>Total All-In Cost</td><td>{fmt(costs.total_all_in_cost, sym)}</td></tr>
    </table>
  </div>

  <div>
    <h2>Returns &amp; Max Bid</h2>
    <table>
      <tr><th>Metric</th><th>Value</th></tr>
      <tr><td>ARV Estimate</td><td>{fmt(req.arv_estimate, sym)}</td></tr>
      <tr><td>Net Profit</td><td>{fmt(metrics.net_profit, sym)}</td></tr>
      <tr><td>Profit Margin</td><td>{metrics.profit_margin_pct:.1f}%</td></tr>
      <tr><td>ROI</td><td>{metrics.roi_pct:.1f}%</td></tr>
      <tr><td>Max Bid (70% Rule)</td><td>{fmt(metrics.max_bid_70, sym)}</td></tr>
      <tr class="total-row"><td>Max Bid (15% Margin)</td><td>{fmt(metrics.max_bid_custom, sym)}</td></tr>
    </table>
  </div>
</div>

<h2>AI Deal Analysis</h2>
<div class="narrative">
  {"".join(f"<p>{escape(p.strip())}</p>" for p in narrative.strip().split("\n\n") if p.strip())}
</div>

{"" if not req.notes else f'<h2>Analyst Notes</h2><div class="narrative"><p>{escape(req.notes)}</p></div>'}

<div class="footer">
  <span>Generated by RE Deal Analyzer &nbsp;|&nbsp; Powered by Claude AI</span>
  <span>For informational purposes only. Not financial advice.</span>
</div>

</body>
</html>"""

    pdf_bytes = HTML(string=html).write_pdf()
    return pdf_bytes
