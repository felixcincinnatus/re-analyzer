# TODOS

## P1 — Phase 1 (must ship with scenario workspace)

- [x] **Add `repair_override: Optional[float] = Field(None, ge=0)` to DealRequest**
  RESOLVED: Done in the security review pass. Also added Literal types for market/condition,
  ge/gt bounds on all numeric fields, max_length on string fields.

- [x] **Audit `calculator.py` for mid-chain `round()` calls before porting to JS**
  RESOLVED: No mid-chain round() calls exist. All rounding happens at the end when constructing
  CostBreakdown and DealMetrics. Intermediate values are all unrounded floats. JS port: round
  only final outputs to 2dp. No replication needed.

## P2 — Post-Phase-1 improvements

- [ ] **Lock down CORS when deploying to production**
  `main.py` currently uses `allow_origins=["*"]`. Before public deployment, set to the
  explicit frontend origin. Decision: deferred (dev/staging only for now).

- [ ] **Add rate limiting on `/api/analyze` and `/api/analyze/pdf`**
  Each request triggers a paid Anthropic API call. For production use with external users,
  add `slowapi` IP-based rate limiting or a simple API key header check.
  Decision: deferred (internal tool, low risk for now).

- [ ] **Bundle Inter font locally in pdf_generator.py**
  Currently fetches from Google Fonts on every PDF render. Creates hard network dependency
  and leaks server IP to Google. Fix: embed font as base64 data URI or local file.
  Files: `backend/app/services/pdf_generator.py:28`.

- [ ] **Add prompt injection mitigations to ai_narrative.py**
  User-controlled fields (address, city, property_type, condition) are interpolated directly
  into the Claude prompt with no role separation. Low risk for an internal tool but a concern
  for public-facing use. Fix: add a system prompt that classifies user data as untrusted.

- [ ] **Add deal history clear button to DealHistory component**
  50 analyses including analyst identity and financials persist in localStorage indefinitely
  with no way to clear. Add a "Clear History" action to the DealHistory panel.

- [ ] **Split backend: fast `/api/score` + lazy `/api/narrative`**
  POST /api/analyze currently waits for AI narrative generation before returning. The "3-second
  initial score render" platonic ideal requires a fast path that returns costs+metrics only,
  with AI narrative loaded separately. Split into:
  1. POST /api/score — returns CostBreakdown + DealMetrics only, <200ms
  2. POST /api/narrative — returns ai_narrative, called after score renders
  Phase 1 ships without this. Mobile walk-through use case depends on it.
  Effort: ~1–2h backend + ~1h frontend streaming/loading state.

- [ ] **Add `version: 1` field to localStorage schema (`re-analyzer-active`, `re-analyzer-deals`)**
  When data shape changes in future releases, detect and discard stale cached state rather
  than parsing an old format silently. Add schema version check on restore; clear and start
  fresh if version mismatch. Depends on: Phase 1 shipping.

- [ ] **Investigate calculator.js production observability**
  Parity tests catch known cases at build time but silent bugs in production are invisible.
  For a tool used for real estate purchase decisions, consider: periodic backend validation
  of client-computed scores (log divergence, don't block UX). Phase 2 / Phase 3 consideration.

## P3 — Phase 3 (future)

- [ ] **Instant mode**: Address + price + condition only, median-sqft lookup table.
  Needs city → median sqft data source. Deferred pending data availability.

- [ ] **Deal Comparison Mode**: Two deals side by side, shared sliders, comparative AI narrative.
  Adds significant surface area (dual state trees, comparative narrative prompt). Phase 3.

- [ ] **Offline-capable PWA**: Service worker + cache strategy for the client-side calculator.
  Enables true offline walk-through use case. Depends on Phase 1 mobile stepper stability.
