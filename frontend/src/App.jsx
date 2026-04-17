import { useState, useEffect, useRef } from 'react'
import ScenarioPanel from './components/ScenarioPanel.jsx'
import ScenarioTabs from './components/ScenarioTabs.jsx'
import DealHistory from './components/DealHistory.jsx'
import MobileStepper from './components/MobileStepper.jsx'
import {
  createScenario, deleteScenario, renameScenario, updateOverride, MAX_SCENARIOS,
} from './utils/scenarioState.js'
import { loadHistory, saveToHistory, makeHistoryEntry } from './utils/dealHistory.js'
import { buildShareUrl, parseShareUrl, copyToClipboard } from './utils/shareUrl.js'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const SESSION_KEY = 're-analyzer-active'

const SCORE_STYLES = {
  STRONG:   { bg: '#d4f5e2', color: '#1a7a4a', border: '#1a7a4a' },
  MARGINAL: { bg: '#fef3cd', color: '#7a5c1a', border: '#7a5c1a' },
  AVOID:    { bg: '#fde8e8', color: '#7a1a1a', border: '#7a1a1a' },
}

const defaultForm = {
  market: 'us', address: '', city: '',
  property_type: 'SFR', condition: 'Fair',
  sqft: '', bedrooms: '', bathrooms: '',
  purchase_price: '', arv_estimate: '',
  closing_costs_pct: '2.5', holding_months: '4',
  monthly_holding_cost: '1200', selling_costs_pct: '6.0',
  analyst_name: '', notes: '',
}

// Convert parsed baseInputs (numbers) back to form strings for inputs.
function baseInputsToForm(inp) {
  return {
    market: inp.market || 'us',
    address: inp.address || '',
    city: inp.city || '',
    property_type: inp.property_type || 'SFR',
    condition: inp.condition || 'Fair',
    analyst_name: inp.analyst_name || '',
    notes: inp.notes || '',
    sqft: inp.sqft != null ? String(inp.sqft) : '',
    bedrooms: inp.bedrooms != null ? String(inp.bedrooms) : '',
    bathrooms: inp.bathrooms != null ? String(inp.bathrooms) : '',
    purchase_price: inp.purchase_price != null ? String(inp.purchase_price) : '',
    arv_estimate: inp.arv_estimate != null ? String(inp.arv_estimate) : '',
    closing_costs_pct: inp.closing_costs_pct != null ? String(inp.closing_costs_pct) : '2.5',
    holding_months: inp.holding_months != null ? String(inp.holding_months) : '4',
    monthly_holding_cost: inp.monthly_holding_cost != null ? String(inp.monthly_holding_cost) : '1200',
    selling_costs_pct: inp.selling_costs_pct != null ? String(inp.selling_costs_pct) : '6.0',
  }
}

// Parse form strings to typed values for API payload.
function formToBaseInputs(form) {
  return {
    market: form.market,
    address: form.address,
    city: form.city,
    property_type: form.property_type,
    condition: form.condition,
    analyst_name: form.analyst_name,
    notes: form.notes,
    sqft: parseFloat(form.sqft) || 0,
    bedrooms: parseInt(form.bedrooms) || 0,
    bathrooms: parseFloat(form.bathrooms) || 0,
    purchase_price: parseFloat(form.purchase_price) || 0,
    arv_estimate: parseFloat(form.arv_estimate) || 0,
    closing_costs_pct: parseFloat(form.closing_costs_pct) || 0,
    holding_months: parseInt(form.holding_months) || 0,
    monthly_holding_cost: parseFloat(form.monthly_holding_cost) || 0,
    selling_costs_pct: parseFloat(form.selling_costs_pct) || 0,
  }
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle = {
  padding: '8px 10px', borderRadius: 6, border: '1px solid #ddd',
  fontSize: 13, fontFamily: 'Inter, sans-serif', outline: 'none', width: '100%',
  boxSizing: 'border-box',
}
const selectStyle = { ...inputStyle, background: '#fff' }

function MetricCard({ label, value, highlight }) {
  return (
    <div style={{
      background: highlight ? '#f0faf5' : '#f8f8f8',
      border: `1px solid ${highlight ? '#a8e0c5' : '#e5e5e5'}`,
      borderRadius: 8, padding: '12px 14px',
    }}>
      <div style={{ fontSize: 10, color: '#888', marginBottom: 4, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: highlight ? '#1a7a4a' : '#1a1a1a' }}>{value}</div>
    </div>
  )
}

function Table({ rows, totalRow }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <tbody>
        {rows.map(([label, value], i) => (
          <tr key={i} style={{ background: i % 2 === 0 ? '#fafafa' : '#fff' }}>
            <td style={{ padding: '6px 10px', color: '#555' }}>{label}</td>
            <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 500 }}>{value}</td>
          </tr>
        ))}
        {totalRow && (
          <tr style={{ borderTop: '2px solid #ccc' }}>
            <td style={{ padding: '7px 10px', fontWeight: 700 }}>{totalRow[0]}</td>
            <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700 }}>{totalRow[1]}</td>
          </tr>
        )}
      </tbody>
    </table>
  )
}

export default function App() {
  const [form, setForm] = useState(defaultForm)
  const [baseInputs, setBaseInputs] = useState(null)        // set on first analyze
  const [baseRepairEstimate, setBaseRepairEstimate] = useState(null)
  const [result, setResult] = useState(null)                // last backend response
  const [scenarios, setScenarios] = useState([])
  const [activeScenarioId, setActiveScenarioId] = useState(null)
  const [history, setHistory] = useState(() => loadHistory())
  const [loading, setLoading] = useState(false)
  const [refreshLoading, setRefreshLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [error, setError] = useState(null)
  const [copyStatus, setCopyStatus] = useState(null) // null | 'copied' | 'error'
  const [mobileStep, setMobileStep] = useState(1)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024)
  const persistTimerRef = useRef(null)

  const sym = form.market === 'ge' ? '₾' : '$'
  const fmt = (n) => `${sym}${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`

  // Derived: active scenario override (or empty object for base view)
  const activeScenario = scenarios.find((s) => s.id === activeScenarioId) ?? null
  const activeOverride = activeScenario?.override ?? {}

  // ── Mobile breakpoint listener ──────────────────────────────────────────────
  useEffect(() => {
    const handle = () => setIsMobile(window.innerWidth < 1024)
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [])

  // ── Session persistence (debounced 500ms) ───────────────────────────────────
  useEffect(() => {
    if (!baseInputs) return
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current)
    persistTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(SESSION_KEY, JSON.stringify({
          baseInputs, result, scenarios, activeScenarioId, baseRepairEstimate,
        }))
      } catch {}
    }, 500)
  }, [baseInputs, result, scenarios, activeScenarioId, baseRepairEstimate])

  // ── Mount: URL share parse, then localStorage restore ──────────────────────
  useEffect(() => {
    const shared = parseShareUrl(window.location.search)
    if (shared) {
      const existing = localStorage.getItem(SESSION_KEY)
      if (existing) {
        const ok = window.confirm('Load deal from shared link? Your current session will be replaced.')
        if (!ok) {
          // Still restore existing session
          restoreSession(JSON.parse(existing))
          window.history.replaceState({}, '', window.location.pathname)
          return
        }
      }
      // Pre-fill form from URL data
      setForm(f => ({ ...f, ...baseInputsToForm({ ...defaultForm, ...shared.inputs }) }))
      window.history.replaceState({}, '', window.location.pathname)
      return
    }

    // No URL param — restore from localStorage
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      if (!raw) return
      restoreSession(JSON.parse(raw))
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function restoreSession(session) {
    if (session.baseInputs) {
      setBaseInputs(session.baseInputs)
      setForm(baseInputsToForm(session.baseInputs))
    }
    if (session.result) setResult(session.result)
    if (session.scenarios) setScenarios(session.scenarios)
    if (session.activeScenarioId !== undefined) setActiveScenarioId(session.activeScenarioId)
    if (session.baseRepairEstimate != null) setBaseRepairEstimate(session.baseRepairEstimate)
  }

  // ── Form helpers ────────────────────────────────────────────────────────────
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  // ── Analyze (base) ──────────────────────────────────────────────────────────
  const analyze = async (advanceMobileStep = false) => {
    setLoading(true)
    setError(null)
    const parsed = formToBaseInputs(form)
    try {
      const res = await fetch(`${API_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setResult(data)
      setBaseInputs(parsed)
      setBaseRepairEstimate(data.costs?.repair_estimate ?? null)
      // Reset scenarios to base view on re-analyze
      setActiveScenarioId(null)

      // Save to deal history
      const entry = makeHistoryEntry({
        baseInputs: parsed,
        scenarios,
        costs: data.costs,
        metrics: data.metrics,
        ai_narrative: data.ai_narrative,
      })
      setHistory(prev => saveToHistory(prev, entry))

      if (advanceMobileStep) setMobileStep(3)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Refresh Analysis (re-analyze with active override) ─────────────────────
  const refreshAnalyze = async () => {
    if (!baseInputs) return
    setRefreshLoading(true)
    setError(null)
    const payload = {
      ...baseInputs,
      arv_estimate: activeOverride.arv_estimate ?? baseInputs.arv_estimate,
      holding_months: activeOverride.holding_months ?? baseInputs.holding_months,
      ...(activeOverride.repair_estimate != null && { repair_override: activeOverride.repair_estimate }),
    }
    try {
      const res = await fetch(`${API_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setResult(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setRefreshLoading(false)
    }
  }

  // ── PDF download ────────────────────────────────────────────────────────────
  const downloadPdf = async () => {
    if (!baseInputs) return
    setPdfLoading(true)
    // Explicit field mapping — no spreading activeOverride directly.
    const payload = {
      market: baseInputs.market,
      address: baseInputs.address,
      city: baseInputs.city,
      property_type: baseInputs.property_type,
      condition: baseInputs.condition,
      analyst_name: baseInputs.analyst_name,
      notes: baseInputs.notes,
      sqft: baseInputs.sqft,
      bedrooms: baseInputs.bedrooms,
      bathrooms: baseInputs.bathrooms,
      purchase_price: baseInputs.purchase_price,
      arv_estimate: activeOverride.arv_estimate ?? baseInputs.arv_estimate,
      closing_costs_pct: baseInputs.closing_costs_pct,
      holding_months: activeOverride.holding_months ?? baseInputs.holding_months,
      monthly_holding_cost: baseInputs.monthly_holding_cost,
      selling_costs_pct: baseInputs.selling_costs_pct,
      ...(activeOverride.repair_estimate != null && { repair_override: activeOverride.repair_estimate }),
    }
    try {
      const res = await fetch(`${API_URL}/api/analyze/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(await res.text())
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `deal_memo_${(baseInputs.address || 'deal').replace(/ /g, '_')}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e.message)
    } finally {
      setPdfLoading(false)
    }
  }

  // ── Share URL ───────────────────────────────────────────────────────────────
  const handleCopyLink = async () => {
    if (!baseInputs) return
    try {
      const url = buildShareUrl(baseInputs, activeOverride, activeScenario?.name)
      await copyToClipboard(url)
      setCopyStatus('copied')
      setTimeout(() => setCopyStatus(null), 2000)
    } catch {
      setCopyStatus('error')
      setTimeout(() => setCopyStatus(null), 2000)
    }
  }

  // ── Scenario management ─────────────────────────────────────────────────────
  const handleAddScenario = () => {
    if (scenarios.length >= MAX_SCENARIOS) return
    const s = createScenario(`Scenario ${scenarios.length + 1}`, { ...activeOverride })
    setScenarios(prev => [...prev, s])
    setActiveScenarioId(s.id)
  }

  const handleDeleteScenario = (id) => {
    const { scenarios: next, activeScenarioId: nextId } =
      deleteScenario(scenarios, activeScenarioId, id)
    setScenarios(next)
    setActiveScenarioId(nextId)
  }

  const handleRenameScenario = (id, newName) => {
    setScenarios(prev => renameScenario(prev, id, newName))
  }

  const handleOverrideChange = (newOverride) => {
    if (!activeScenarioId) return
    setScenarios(prev => updateOverride(prev, activeScenarioId, newOverride))
  }

  const handleResetOverride = () => {
    if (!activeScenarioId) return
    setScenarios(prev => updateOverride(prev, activeScenarioId, {}))
  }

  // ── Deal history reload ─────────────────────────────────────────────────────
  const handleReloadDeal = (entry) => {
    setBaseInputs(entry.baseInputs)
    setForm(baseInputsToForm(entry.baseInputs))
    setResult({ costs: entry.costs, metrics: entry.metrics, ai_narrative: entry.ai_narrative, request: entry.baseInputs })
    setBaseRepairEstimate(entry.costs?.repair_estimate ?? null)
    setScenarios(entry.scenarios || [])
    setActiveScenarioId(null)
  }

  // ── Derived display values ──────────────────────────────────────────────────
  const scoreStyle = result ? SCORE_STYLES[result.metrics.deal_score] || {} : {}
  const hasOverrideChanges = Object.keys(activeOverride).length > 0

  // ======== RENDER FRAGMENTS ================================================

  const propertyForm = (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Market">
          <select style={selectStyle} value={form.market} onChange={set('market')}>
            <option value="us">🇺🇸 US (USD)</option>
            <option value="ge">🇬🇪 Georgia (GEL)</option>
          </select>
        </Field>
        <Field label="Property Type">
          <select style={selectStyle} value={form.property_type} onChange={set('property_type')}>
            {['SFR','Condo','Townhouse','Multi-Family','Land'].map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
      </div>
      <div style={{ marginTop: 12 }}>
        <Field label="Address">
          <input style={inputStyle} placeholder="123 Maple St" value={form.address} onChange={set('address')} />
        </Field>
      </div>
      <div style={{ marginTop: 12 }}>
        <Field label="City / Market Area">
          <input style={inputStyle} placeholder="Atlanta, GA" value={form.city} onChange={set('city')} />
        </Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 12 }}>
        <Field label="Sqft">
          <input style={inputStyle} type="number" placeholder="1500" value={form.sqft} onChange={set('sqft')} />
        </Field>
        <Field label="Beds">
          <input style={inputStyle} type="number" placeholder="3" value={form.bedrooms} onChange={set('bedrooms')} />
        </Field>
        <Field label="Baths">
          <input style={inputStyle} type="number" step="0.5" placeholder="2" value={form.bathrooms} onChange={set('bathrooms')} />
        </Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
        <Field label="Condition">
          <select style={selectStyle} value={form.condition} onChange={set('condition')}>
            {['Good','Fair','Poor'].map(c => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Analyst Name">
          <input style={inputStyle} placeholder="Your name" value={form.analyst_name} onChange={set('analyst_name')} />
        </Field>
      </div>
    </div>
  )

  const financialsForm = (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label={`Purchase Price (${sym})`}>
          <input style={inputStyle} type="number" placeholder="150000" value={form.purchase_price} onChange={set('purchase_price')} />
        </Field>
        <Field label={`ARV Estimate (${sym})`}>
          <input style={inputStyle} type="number" placeholder="220000" value={form.arv_estimate} onChange={set('arv_estimate')} />
        </Field>
        <Field label="Closing Costs (%)">
          <input style={inputStyle} type="number" step="0.1" value={form.closing_costs_pct} onChange={set('closing_costs_pct')} />
        </Field>
        <Field label="Selling Costs (%)">
          <input style={inputStyle} type="number" step="0.1" value={form.selling_costs_pct} onChange={set('selling_costs_pct')} />
        </Field>
        <Field label="Holding Months">
          <input style={inputStyle} type="number" value={form.holding_months} onChange={set('holding_months')} />
        </Field>
        <Field label={`Monthly Hold Cost (${sym})`}>
          <input style={inputStyle} type="number" value={form.monthly_holding_cost} onChange={set('monthly_holding_cost')} />
        </Field>
      </div>
      <div style={{ marginTop: 12 }}>
        <Field label="Notes (optional)">
          <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 56 }} placeholder="Any additional notes..." value={form.notes} onChange={set('notes')} />
        </Field>
      </div>
    </div>
  )

  const analyzeButton = (advanceMobile = false) => (
    <button
      onClick={() => analyze(advanceMobile)}
      disabled={loading}
      style={{
        marginTop: 16, width: '100%', padding: '11px',
        background: loading ? '#aaa' : '#1a7a4a', color: '#fff',
        border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700,
        cursor: loading ? 'not-allowed' : 'pointer',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {loading ? 'Analyzing...' : 'Analyze Deal →'}
    </button>
  )

  const errorBanner = error && (
    <div style={{ marginTop: 12, padding: 10, background: '#fde8e8', borderRadius: 6, fontSize: 12, color: '#7a1a1a' }}>
      {error}
    </div>
  )

  // Results panel content (used in both desktop and mobile step 3)
  const resultsContent = result ? (
    <div>
      {/* Scenario Tabs */}
      {baseInputs && (
        <div style={{ marginBottom: 14 }}>
          <ScenarioTabs
            scenarios={scenarios}
            activeScenarioId={activeScenarioId}
            onSelect={setActiveScenarioId}
            onAdd={handleAddScenario}
            onDelete={handleDeleteScenario}
            onRename={handleRenameScenario}
          />
        </div>
      )}

      {/* Score Banner (base result) */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: scoreStyle.bg, border: `2px solid ${scoreStyle.border}`,
        borderRadius: 12, padding: '14px 20px', marginBottom: 16,
      }}>
        <div>
          <div style={{ fontSize: 11, color: scoreStyle.color, fontWeight: 600 }}>DEAL SCORE</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: scoreStyle.color }}>{result.metrics.deal_score}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: scoreStyle.color }}>ROI</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: scoreStyle.color }}>{result.metrics.roi_pct.toFixed(1)}%</div>
        </div>
      </div>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 16 }}>
        <MetricCard label="Net Profit" value={fmt(result.metrics.net_profit)} highlight />
        <MetricCard label="Profit Margin" value={`${result.metrics.profit_margin_pct.toFixed(1)}%`} highlight />
        <MetricCard label="Max Bid (70% Rule)" value={fmt(result.metrics.max_bid_70)} />
        <MetricCard label="Max Bid (15% Margin)" value={fmt(result.metrics.max_bid_custom)} />
      </div>

      {/* Scenario Panel — divider, then sliders */}
      {baseInputs && (
        <div style={{
          background: '#fff', borderRadius: 10, padding: 16,
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 16,
        }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: '#333' }}>
            Scenario Modeling
          </h3>
          <ScenarioPanel
            baseInputs={baseInputs}
            baseRepairEstimate={baseRepairEstimate}
            activeOverride={activeOverride}
            onOverrideChange={handleOverrideChange}
            onReset={handleResetOverride}
            sym={sym}
          />
        </div>
      )}

      {/* Cost / Returns Tables */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={{ background: '#fff', borderRadius: 10, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: '#333' }}>Cost Breakdown</h3>
          <Table
            rows={[
              ['Purchase Price', fmt(result.request?.purchase_price ?? baseInputs?.purchase_price ?? 0)],
              [`Repair (${result.request?.condition ?? ''})`, fmt(result.costs.repair_estimate)],
              [`Closing (${result.request?.closing_costs_pct ?? ''}%)`, fmt(result.costs.closing_costs)],
              [`Holding (${result.request?.holding_months ?? ''} mo)`, fmt(result.costs.holding_costs)],
              [`Selling (${result.request?.selling_costs_pct ?? ''}%)`, fmt(result.costs.selling_costs)],
            ]}
            totalRow={['Total All-In', fmt(result.costs.total_all_in_cost)]}
          />
        </div>
        <div style={{ background: '#fff', borderRadius: 10, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: '#333' }}>Returns</h3>
          <Table
            rows={[
              ['ARV Estimate', fmt(result.request?.arv_estimate ?? baseInputs?.arv_estimate ?? 0)],
              ['Total All-In Cost', fmt(result.costs.total_all_in_cost)],
              ['Net Profit', fmt(result.metrics.net_profit)],
              ['Profit Margin', `${result.metrics.profit_margin_pct.toFixed(1)}%`],
              ['ROI', `${result.metrics.roi_pct.toFixed(1)}%`],
            ]}
          />
        </div>
      </div>

      {/* AI Narrative */}
      <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 16 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: '#333' }}>AI Deal Analysis</h3>
        <div style={{ fontSize: 13, lineHeight: 1.75, color: '#444' }}>
          {(result.ai_narrative || '').split('\n\n').map((p, i) => (
            <p key={i} style={{ marginBottom: 10 }}>{p}</p>
          ))}
        </div>
      </div>

      {/* Action buttons row */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {/* Refresh Analysis — only when a scenario is active with overrides */}
        {activeScenarioId && hasOverrideChanges && (
          <button
            onClick={refreshAnalyze}
            disabled={refreshLoading}
            style={{
              flex: '1 1 auto', padding: '10px 14px',
              background: refreshLoading ? '#aaa' : '#f0f7f3',
              color: refreshLoading ? '#fff' : '#1a7a4a',
              border: '1px solid #1a7a4a', borderRadius: 8,
              fontSize: 13, fontWeight: 600, cursor: refreshLoading ? 'not-allowed' : 'pointer',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {refreshLoading ? 'Refreshing...' : '↻ Refresh Analysis'}
          </button>
        )}

        {/* Copy Link */}
        {baseInputs && (
          <button
            onClick={handleCopyLink}
            style={{
              flex: '1 1 auto', padding: '10px 14px',
              background: '#f5f5f5', color: copyStatus === 'copied' ? '#1a7a4a' : '#555',
              border: '1px solid #ddd', borderRadius: 8,
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {copyStatus === 'copied' ? '✓ Copied!' : copyStatus === 'error' ? 'Copy failed' : '🔗 Copy Link'}
          </button>
        )}

        {/* Download PDF */}
        <button
          onClick={downloadPdf}
          disabled={pdfLoading}
          style={{
            flex: '1 1 auto', padding: '10px 14px',
            background: pdfLoading ? '#aaa' : '#1a3a7a', color: '#fff',
            border: 'none', borderRadius: 8,
            fontSize: 13, fontWeight: 600, cursor: pdfLoading ? 'not-allowed' : 'pointer',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {pdfLoading ? 'Generating PDF...' : '⬇ Download PDF'}
        </button>
      </div>
    </div>
  ) : null

  const emptyState = (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: 14 }}>
      Fill the form and click "Analyze Deal →" to see results.
    </div>
  )

  // ── MOBILE LAYOUT ──────────────────────────────────────────────────────────
  if (isMobile) {
    const step1Content = (
      <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: '#333' }}>Property Details</h2>
        {propertyForm}
      </div>
    )

    const step2Content = (
      <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: '#333' }}>Financials ({sym})</h2>
        {financialsForm}
        {analyzeButton(true)}
        {errorBanner}
      </div>
    )

    const step3Content = result ? resultsContent : (
      <div style={{ padding: 24, textAlign: 'center', color: '#aaa', fontSize: 13 }}>
        Complete Step 2 and analyze a deal first.
      </div>
    )

    return (
      <div style={{ fontFamily: 'Inter, sans-serif', minHeight: '100vh', background: '#f2f4f7', padding: '20px 12px 40px' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>RE Deal Analyzer</h1>
            <p style={{ fontSize: 12, color: '#777', marginTop: 4 }}>Analyze fix-and-flip deals in seconds.</p>
          </div>
          <MobileStepper
            currentStep={mobileStep}
            onStepChange={setMobileStep}
            hasResult={!!result}
          >
            {step1Content}
            {step2Content}
            {step3Content}
          </MobileStepper>
        </div>
      </div>
    )
  }

  // ── DESKTOP LAYOUT ─────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: 'Inter, sans-serif', minHeight: '100vh', background: '#f2f4f7', padding: '32px 16px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>RE Deal Analyzer</h1>
          <p style={{ fontSize: 13, color: '#777', marginTop: 4 }}>Analyze fix-and-flip deals in seconds with AI-powered insights.</p>
        </div>

        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

          {/* Form Panel */}
          <div style={{ flexShrink: 0, width: 380, background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: '#333' }}>Property Details</h2>
            {propertyForm}
            <div style={{ height: 1, background: '#eee', margin: '16px 0' }} />
            <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: '#333' }}>Financials ({sym})</h2>
            {financialsForm}
            {analyzeButton(false)}
            {errorBanner}
          </div>

          {/* Results Area */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {result ? resultsContent : emptyState}
          </div>

          {/* Deal History Sidebar */}
          <DealHistory
            history={history}
            onReload={handleReloadDeal}
            sym={sym}
          />
        </div>
      </div>
    </div>
  )
}
