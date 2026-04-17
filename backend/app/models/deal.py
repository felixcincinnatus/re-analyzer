from pydantic import BaseModel, ConfigDict, Field
from typing import Literal, Optional


class DealRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    market: Literal["us", "ge"]
    address: str = Field(max_length=200)
    city: str = Field(max_length=200)
    property_type: str = Field(max_length=100)
    condition: Literal["Good", "Fair", "Poor"]
    sqft: float = Field(ge=0)
    bedrooms: int = Field(ge=0, le=50)
    bathrooms: float = Field(ge=0, le=50)
    purchase_price: float = Field(ge=0)
    arv_estimate: float = Field(gt=0)
    closing_costs_pct: float = Field(default=2.5, ge=0, le=50)
    holding_months: int = Field(default=4, ge=0, le=360)
    monthly_holding_cost: float = Field(default=1200.0, ge=0)
    selling_costs_pct: float = Field(default=6.0, ge=0, le=50)
    analyst_name: Optional[str] = Field(default="Analyst", max_length=200)
    notes: Optional[str] = Field(default="", max_length=5000)
    repair_override: Optional[float] = Field(None, ge=0)  # if set, skips condition/sqft formula


class CostBreakdown(BaseModel):
    repair_estimate: float
    closing_costs: float
    holding_costs: float
    selling_costs: float
    total_all_in_cost: float


class DealMetrics(BaseModel):
    net_profit: float
    roi_pct: float
    max_bid_70: float
    max_bid_custom: float
    deal_score: str  # STRONG, MARGINAL, AVOID
    profit_margin_pct: float


class DealResponse(BaseModel):
    request: DealRequest
    costs: CostBreakdown
    metrics: DealMetrics
    ai_narrative: str
    currency: str
    currency_symbol: str
