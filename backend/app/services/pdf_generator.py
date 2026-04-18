from datetime import date
from fpdf import FPDF
from ..models.deal import DealRequest, CostBreakdown, DealMetrics

SCORE_COLORS = {
    "STRONG":   {"fg": (26, 122, 74),   "bg": (212, 245, 226)},
    "MARGINAL": {"fg": (122, 92, 26),   "bg": (254, 243, 205)},
    "AVOID":    {"fg": (122, 26, 26),   "bg": (253, 232, 232)},
}


def _fmt(value: float, sym: str) -> str:
    return f"{sym}{value:,.0f}"


def generate_pdf(req: DealRequest, costs: CostBreakdown, metrics: DealMetrics, narrative: str) -> bytes:
    sym = "\u20be" if req.market == "ge" else "$"
    score = metrics.deal_score
    colors = SCORE_COLORS.get(score, {"fg": (51, 51, 51), "bg": (238, 238, 238)})
    fg = colors["fg"]
    bg = colors["bg"]
    market_label = "Georgia (GEL)" if req.market == "ge" else "United States (USD)"

    pdf = FPDF()
    pdf.set_margins(16, 16, 16)
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=16)

    W = pdf.w - 32  # usable width

    # ── Header ────────────────────────────────────────────────────────────────
    pdf.set_font("Helvetica", "B", 16)
    pdf.set_text_color(26, 26, 26)
    pdf.cell(W - 36, 8, "Deal Analysis Memo", ln=False)

    # Score badge
    pdf.set_fill_color(*bg)
    pdf.set_text_color(*fg)
    pdf.set_font("Helvetica", "B", 11)
    badge_x = pdf.get_x()
    badge_y = pdf.get_y()
    pdf.set_xy(pdf.w - 16 - 34, badge_y)
    pdf.cell(34, 8, score, border=1, align="C", fill=True)
    pdf.set_xy(16, badge_y + 8)

    pdf.set_text_color(100, 100, 100)
    pdf.set_font("Helvetica", "", 8)
    addr_line = f"{req.address}, {req.city}  |  {req.property_type}  |  {req.sqm:,.0f} sq m  |  {req.bedrooms}bd/{req.bathrooms}ba"
    pdf.cell(W, 5, addr_line, ln=True)
    analyst_line = f"Analyst: {req.analyst_name or '—'}  |  Date: {date.today().strftime('%B %d, %Y')}  |  Market: {market_label}"
    pdf.cell(W, 5, analyst_line, ln=True)
    pdf.ln(3)

    # ── Divider ───────────────────────────────────────────────────────────────
    pdf.set_draw_color(220, 220, 220)
    pdf.line(16, pdf.get_y(), pdf.w - 16, pdf.get_y())
    pdf.ln(4)

    # ── Key metrics row (4 cards) ──────────────────────────────────────────────
    card_w = (W - 6) / 4
    cards = [
        ("Purchase Price", _fmt(req.purchase_price, sym), False),
        ("ARV Estimate",   _fmt(req.arv_estimate, sym),   False),
        ("Net Profit",     _fmt(metrics.net_profit, sym),  True),
        ("ROI",            f"{metrics.roi_pct:.1f}%",      True),
    ]
    row_y = pdf.get_y()
    for i, (label, value, highlight) in enumerate(cards):
        x = 16 + i * (card_w + 2)
        pdf.set_fill_color(248, 248, 248)
        pdf.set_draw_color(229, 229, 229)
        pdf.rect(x, row_y, card_w, 14, "DF")
        pdf.set_xy(x + 2, row_y + 2)
        pdf.set_font("Helvetica", "", 7)
        pdf.set_text_color(136, 136, 136)
        pdf.cell(card_w - 4, 4, label, ln=True)
        pdf.set_xy(x + 2, row_y + 6)
        pdf.set_font("Helvetica", "B", 11)
        pdf.set_text_color(*fg if highlight else (26, 26, 26))
        pdf.cell(card_w - 4, 6, value)
    pdf.set_y(row_y + 18)

    # ── Two-column tables ─────────────────────────────────────────────────────
    col_w = (W - 6) / 2
    table_y = pdf.get_y()

    def section_header(x, y, w, text):
        pdf.set_xy(x, y)
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_text_color(26, 26, 26)
        pdf.cell(w, 6, text, ln=True)
        pdf.set_draw_color(220, 220, 220)
        pdf.line(x, pdf.get_y(), x + w, pdf.get_y())
        pdf.ln(2)

    def table_row(x, w, left, right, bold=False, shade=False):
        y = pdf.get_y()
        if shade:
            pdf.set_fill_color(250, 250, 250)
            pdf.rect(x, y, w, 6, "F")
        if bold:
            pdf.set_draw_color(200, 200, 200)
            pdf.line(x, y, x + w, y)
        pdf.set_xy(x + 2, y)
        pdf.set_font("Helvetica", "B" if bold else "", 8.5)
        pdf.set_text_color(26, 26, 26)
        pdf.cell(w - 40, 6, left)
        pdf.set_xy(x + w - 38, y)
        pdf.cell(36, 6, right, align="R")
        pdf.set_y(y + 6)

    # Left: Cost Breakdown
    section_header(16, table_y, col_w, "Cost Breakdown")
    left_rows = [
        ("Purchase Price",                           _fmt(req.purchase_price, sym),     False, False),
        (f"Repair ({req.condition} cond.)",          _fmt(costs.repair_estimate, sym),   False, True),
        (f"Closing ({req.closing_costs_pct}%)",      _fmt(costs.closing_costs, sym),     False, False),
        (f"Holding ({req.holding_months} mo)",        _fmt(costs.holding_costs, sym),     False, True),
        (f"Selling ({req.selling_costs_pct}%)",       _fmt(costs.selling_costs, sym),     False, False),
        ("Total All-In Cost",                        _fmt(costs.total_all_in_cost, sym), True,  False),
    ]
    for label, val, bold, shade in left_rows:
        table_row(16, col_w, label, val, bold=bold, shade=shade)

    # Right: Returns
    right_y = table_y
    section_header(16 + col_w + 6, right_y, col_w, "Returns & Max Bid")
    right_rows = [
        ("ARV Estimate",         _fmt(req.arv_estimate, sym),    False, False),
        ("Net Profit",           _fmt(metrics.net_profit, sym),  False, True),
        ("Profit Margin",        f"{metrics.profit_margin_pct:.1f}%", False, False),
        ("ROI",                  f"{metrics.roi_pct:.1f}%",      False, True),
        ("Max Bid (70% Rule)",   _fmt(metrics.max_bid_70, sym),  False, False),
        ("Max Bid (15% Margin)", _fmt(metrics.max_bid_custom, sym), True, False),
    ]
    cur_y = pdf.get_y()
    pdf.set_y(right_y + 8)  # align with left table start
    for label, val, bold, shade in right_rows:
        table_row(16 + col_w + 6, col_w, label, val, bold=bold, shade=shade)

    pdf.set_y(max(pdf.get_y(), cur_y) + 4)

    # ── AI Narrative ──────────────────────────────────────────────────────────
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(26, 26, 26)
    pdf.cell(W, 6, "AI Deal Analysis", ln=True)
    pdf.set_draw_color(220, 220, 220)
    pdf.line(16, pdf.get_y(), pdf.w - 16, pdf.get_y())
    pdf.ln(2)

    pdf.set_font("Helvetica", "", 8.5)
    pdf.set_text_color(51, 51, 51)
    for para in narrative.strip().split("\n\n"):
        para = para.strip()
        if para:
            pdf.multi_cell(W, 5, para)
            pdf.ln(3)

    # ── Analyst Notes ─────────────────────────────────────────────────────────
    if req.notes and req.notes.strip():
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_text_color(26, 26, 26)
        pdf.cell(W, 6, "Analyst Notes", ln=True)
        pdf.set_draw_color(220, 220, 220)
        pdf.line(16, pdf.get_y(), pdf.w - 16, pdf.get_y())
        pdf.ln(2)
        pdf.set_font("Helvetica", "", 8.5)
        pdf.set_text_color(51, 51, 51)
        pdf.multi_cell(W, 5, req.notes.strip())

    # ── Footer ────────────────────────────────────────────────────────────────
    pdf.set_y(-20)
    pdf.set_draw_color(220, 220, 220)
    pdf.line(16, pdf.get_y(), pdf.w - 16, pdf.get_y())
    pdf.ln(2)
    pdf.set_font("Helvetica", "", 7)
    pdf.set_text_color(170, 170, 170)
    pdf.cell(W / 2, 5, "Generated by RE Deal Analyzer  |  Powered by Claude AI")
    pdf.cell(W / 2, 5, "For informational purposes only. Not financial advice.", align="R")

    return bytes(pdf.output())
