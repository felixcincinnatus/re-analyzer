import re
import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from ..models.deal import DealRequest, DealResponse
from ..services.calculator import calculate_deal
from ..services.ai_narrative import generate_narrative
from ..services.pdf_generator import generate_pdf

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analyze", tags=["analyze"])


def _run_analysis(req: DealRequest):
    costs, metrics = calculate_deal(req)
    try:
        narrative = generate_narrative(req, costs, metrics)
    except Exception:
        logger.exception("AI narrative generation failed")
        narrative = "AI narrative temporarily unavailable."
    return costs, metrics, narrative


@router.post("", response_model=DealResponse)
def analyze_deal(req: DealRequest):
    costs, metrics, narrative = _run_analysis(req)
    currency = "GEL" if req.market == "ge" else "USD"
    symbol = "₾" if req.market == "ge" else "$"
    return DealResponse(
        request=req,
        costs=costs,
        metrics=metrics,
        ai_narrative=narrative,
        currency=currency,
        currency_symbol=symbol,
    )


@router.post("/pdf")
def analyze_deal_pdf(req: DealRequest):
    costs, metrics, narrative = _run_analysis(req)
    try:
        pdf_bytes = generate_pdf(req, costs, metrics, narrative)
    except Exception:
        logger.exception("PDF generation failed")
        raise HTTPException(status_code=500, detail="PDF generation failed.")

    safe_addr = re.sub(r"[^\w\-]", "_", req.address)[:60]
    filename = f"deal_memo_{safe_addr}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
