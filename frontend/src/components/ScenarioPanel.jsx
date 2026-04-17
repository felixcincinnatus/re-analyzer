// ScenarioPanel.jsx — 3 reactive sliders (ARV, Repair, Holding) + Reset button.
// Sits inside the results card, below metrics, separated by a 1px divider.
// Score badge rerenders synchronously on every onChange — no debounce here.
import { useMemo } from 'react';
import { calculateDeal } from '../utils/calculator.js';

const SCORE_STYLES = {
  STRONG:   { bg: '#d4f5e2', color: '#1a7a4a' },
  MARGINAL: { bg: '#fef3cd', color: '#7a5c1a' },
  AVOID:    { bg: '#fde8e8', color: '#7a1a1a' },
};

// Slider track fill: show colored portion from min→value
const sliderStyle = {
  width: '100%',
  height: 44,        // visible track is 6px via CSS below; padding gives 44px touch target
  cursor: 'pointer',
  accentColor: '#1a7a4a',
  WebkitAppearance: 'none',
  appearance: 'none',
};

function Slider({ label, value, min, max, step, onChange, format }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#333' }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#1a7a4a' }}>{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={sliderStyle}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={format(value)}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#aaa', marginTop: 2 }}>
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}

export default function ScenarioPanel({
  baseInputs,           // the original submitted inputs (never mutated)
  baseRepairEstimate,   // repair_estimate from the initial backend response (for slider range)
  activeOverride,       // current scenario's override object (or {} for base view)
  onOverrideChange,     // (newOverride) => void
  onReset,              // () => void — called when "Reset to Original" is clicked
  sym,                  // currency symbol
}) {
  if (!baseInputs || !baseInputs.arv_estimate) {
    return (
      <div style={{ padding: '12px 0', fontSize: 13, color: '#aaa' }}>
        Enter a valid ARV to enable scenario modeling.
      </div>
    );
  }

  const baseArv = baseInputs.arv_estimate;
  const baseRepair = baseRepairEstimate ?? 0;
  const baseHolding = baseInputs.holding_months;

  // Slider ranges
  const arvMin = Math.round(baseArv * 0.80 / 1000) * 1000;
  const arvMax = Math.round(baseArv * 1.20 / 1000) * 1000;
  const repairMin = Math.round(baseRepair * 0.50 / 500) * 500;
  const repairMax = Math.round(baseRepair * 1.50 / 500) * 500;

  // Current slider values (fall back to base when no override set)
  const arvVal = activeOverride.arv_estimate ?? baseArv;
  const repairVal = activeOverride.repair_estimate ?? baseRepair;
  const holdingVal = activeOverride.holding_months ?? baseHolding;

  // Live score computed client-side (synchronous, zero-debounce)
  const liveResult = useMemo(() => {
    return calculateDeal(
      { ...baseInputs, arv_estimate: arvVal, holding_months: holdingVal },
      repairVal !== baseRepair ? repairVal : null
    );
  }, [baseInputs, arvVal, repairVal, holdingVal, baseRepair]);

  const score = liveResult?.metrics?.deal_score ?? null;
  const roi = liveResult?.metrics?.roi_pct ?? null;
  const net = liveResult?.metrics?.net_profit ?? null;
  const scoreStyle = score ? SCORE_STYLES[score] : null;

  const fmt = (n) =>
    `${sym}${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  const fmtMo = (n) => `${n} mo`;

  const setArv = (v) => onOverrideChange({ ...activeOverride, arv_estimate: v });
  const setRepair = (v) => onOverrideChange({ ...activeOverride, repair_estimate: v });
  const setHolding = (v) => onOverrideChange({ ...activeOverride, holding_months: v });

  const isModified =
    arvVal !== baseArv || repairVal !== baseRepair || holdingVal !== baseHolding;

  return (
    <div>
      {/* Live score badge */}
      {scoreStyle && (
        <div
          aria-live="polite"
          aria-atomic="true"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: scoreStyle.bg,
            borderRadius: 8,
            padding: '8px 12px',
            marginBottom: 14,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 700, color: scoreStyle.color }}>
            {score}
          </span>
          {roi !== null && (
            <span style={{ fontSize: 12, color: scoreStyle.color }}>
              ROI {roi.toFixed(1)}%
            </span>
          )}
          {net !== null && (
            <span style={{ fontSize: 12, color: scoreStyle.color }}>
              Net {fmt(net)}
            </span>
          )}
        </div>
      )}

      {/* ARV slider */}
      <Slider
        label="ARV Estimate"
        value={arvVal}
        min={arvMin}
        max={arvMax}
        step={1000}
        onChange={setArv}
        format={fmt}
      />

      {/* Repair slider — only show if base repair > 0 */}
      {baseRepair > 0 && (
        <Slider
          label="Repair Cost"
          value={repairVal}
          min={repairMin}
          max={repairMax}
          step={500}
          onChange={setRepair}
          format={fmt}
        />
      )}

      {/* Holding months slider */}
      <Slider
        label="Holding Months"
        value={holdingVal}
        min={1}
        max={18}
        step={1}
        onChange={setHolding}
        format={fmtMo}
      />

      {/* Reset button */}
      {isModified && (
        <button
          onClick={onReset}
          style={{
            marginTop: 4,
            padding: '7px 14px',
            background: 'transparent',
            color: '#555',
            border: '1px solid #ddd',
            borderRadius: 6,
            fontSize: 12,
            cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          ↺ Reset to Original
        </button>
      )}
    </div>
  );
}
