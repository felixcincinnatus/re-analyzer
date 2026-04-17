#!/usr/bin/env python3
"""Generate calculator_fixtures.json for JS parity tests.
Run from the backend/ directory: python tests/generate_fixtures.py
"""
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.deal import DealRequest
from app.services.calculator import calculate_deal

cases = [
    {
        "label": "US Fair condition",
        "input": {
            "market": "us",
            "address": "123 Maple St",
            "city": "Atlanta GA",
            "property_type": "SFR",
            "condition": "Fair",
            "sqft": 1500,
            "bedrooms": 3,
            "bathrooms": 2.0,
            "purchase_price": 150000,
            "arv_estimate": 220000,
            "closing_costs_pct": 3.0,
            "holding_months": 6,
            "monthly_holding_cost": 1200.0,
            "selling_costs_pct": 6.0,
        },
    },
    {
        "label": "GE Good condition",
        "input": {
            "market": "ge",
            "address": "Rustaveli Ave 1",
            "city": "Tbilisi",
            "property_type": "Condo",
            "condition": "Good",
            "sqft": 80,
            "bedrooms": 2,
            "bathrooms": 1.0,
            "purchase_price": 200000,
            "arv_estimate": 280000,
            "closing_costs_pct": 2.0,
            "holding_months": 4,
            "monthly_holding_cost": 800.0,
            "selling_costs_pct": 5.0,
        },
    },
    {
        "label": "US edge case zero cash_invested",
        "input": {
            "market": "us",
            "address": "0 Cash St",
            "city": "Test",
            "property_type": "SFR",
            "condition": "Good",
            "sqft": 0,
            "bedrooms": 2,
            "bathrooms": 1.0,
            "purchase_price": 0,
            "arv_estimate": 100000,
            "closing_costs_pct": 3.0,
            "holding_months": 6,
            "monthly_holding_cost": 0.0,
            "selling_costs_pct": 6.0,
        },
    },
    {
        "label": "US with repair_override",
        "input": {
            "market": "us",
            "address": "456 Oak Ave",
            "city": "Nashville TN",
            "property_type": "SFR",
            "condition": "Fair",
            "sqft": 1800,
            "bedrooms": 3,
            "bathrooms": 2.0,
            "purchase_price": 175000,
            "arv_estimate": 260000,
            "closing_costs_pct": 3.0,
            "holding_months": 8,
            "monthly_holding_cost": 1400.0,
            "selling_costs_pct": 6.0,
            "repair_override": 45000.0,
        },
    },
]

fixtures = []
for case in cases:
    req = DealRequest(**case["input"])
    costs, metrics = calculate_deal(req)
    fixtures.append({
        "label": case["label"],
        "input": case["input"],
        "costs": costs.model_dump(),
        "metrics": metrics.model_dump(),
    })

out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "calculator_fixtures.json")
with open(out_path, "w") as f:
    json.dump(fixtures, f, indent=2)

print(f"Wrote {len(fixtures)} fixtures to {out_path}")
