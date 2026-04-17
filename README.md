# RE Deal Analyzer

Analyze fix-and-flip real estate deals in seconds with AI-powered insights.

**Features:**
- Deal scoring (STRONG / MARGINAL / AVOID) with ROI, net profit, max bid (70% rule + custom margin)
- Cost breakdown: repair estimate by condition × sqft, closing/holding/selling costs
- Scenario modeling: slide ARV, repair cost, and holding months to see score change live
- AI narrative from Claude (3-paragraph deal memo)
- PDF export (printable deal memo)
- Shareable URL with compressed deal state
- Deal history panel (last 50 analyses, localStorage)
- US (USD) and Georgia (GEL) market support
- Mobile stepper layout for walk-through use

## Quick Start

**Backend (FastAPI):**
```bash
cd backend
cp .env.example .env          # add your ANTHROPIC_API_KEY
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend (Vite + React):**
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173`. Backend runs on `http://localhost:8000`.

## Deployment (Render)

The `render.yaml` configures two Render web services:
- `re-analyzer-backend` — Python/FastAPI, set `ANTHROPIC_API_KEY` in Render dashboard
- `re-analyzer-frontend` — Node/Vite static site, `VITE_API_URL` set to backend URL

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, Vite 5, Vanilla CSS |
| Backend | FastAPI, Pydantic v2, Uvicorn |
| AI | Anthropic Claude claude-sonnet-4-6 |
| PDF | WeasyPrint, Inter font |
| Deploy | Render (render.yaml) |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes (backend) | Claude API key — get from console.anthropic.com |
| `VITE_API_URL` | No (frontend) | Backend URL override (defaults to `/api`) |
