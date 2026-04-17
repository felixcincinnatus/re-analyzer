# Changelog

## [1.0.0.0] - 2026-04-17

### Added
- Fix-and-flip deal analyzer with AI-powered narratives via Claude claude-sonnet-4-6
- Supports US (USD) and Georgia (GEL) markets
- Deal scoring (STRONG / MARGINAL / AVOID) with ROI, net profit, and max bid calculations
- Scenario modeling workspace: ARV, repair cost, and holding months sliders with real-time score preview
- PDF deal memo download (WeasyPrint, Inter font via Google Fonts)
- Share URL with compressed base64 state (supports non-ASCII Georgian addresses)
- Deal history panel with localStorage persistence (last 50 analyses)
- Mobile stepper layout (3-step wizard for walkthrough use)
- Property condition formula (Good / Fair / Poor × sqft for repair estimate)
- Repair cost override field for manual estimates
- Multi-market currency display with ₾ / $ symbol switching

### Changed
- Backend: hardened Pydantic v2 model with Literal types for market/condition, Field bounds on all numerics, max_length on strings
- Backend: all user-controlled strings HTML-escaped before PDF template embedding (html.escape)
- Backend: Content-Disposition header sanitized via regex to prevent header injection
- Backend: exceptions logged via logging module; raw tracebacks never returned to clients
- Backend: health endpoint simplified to `{"status":"ok"}` (no API key metadata)
- Frontend: btoa/atob encoding fixed for non-ASCII input (Georgian script addresses)
