// shareUrl.js — encode/decode app state into a URL search string.
// Only the active scenario's override is included (not all scenarios).
// Clipboard write uses navigator.clipboard with a textarea fallback for Safari.

const PARAM = 's'; // single compressed param key

// Fields serialised from baseInputs + active override.
const INPUT_FIELDS = [
  'address', 'city', 'market', 'purchase_price', 'arv_estimate',
  'condition', 'sqft', 'holding_months', 'monthly_holding_cost',
  'closing_costs_pct', 'selling_costs_pct',
];

const OVERRIDE_FIELDS = ['arv_estimate', 'repair_estimate', 'holding_months'];

/**
 * Build a URL string encoding the current session state.
 * @param {object} baseInputs
 * @param {object} activeOverride — the active scenario's override (or {})
 * @param {string|null} activeScenarioName — for labelling (optional)
 * @returns {string} full URL (origin + pathname + ?s=...)
 */
export function buildShareUrl(baseInputs, activeOverride, activeScenarioName) {
  const payload = {};

  INPUT_FIELDS.forEach((k) => {
    if (baseInputs[k] !== undefined && baseInputs[k] !== '') {
      payload[k] = baseInputs[k];
    }
  });

  // Only include override keys that differ from base.
  OVERRIDE_FIELDS.forEach((k) => {
    if (activeOverride[k] !== undefined) {
      payload[`o_${k}`] = activeOverride[k];
    }
  });

  if (activeScenarioName) {
    payload.scenario = activeScenarioName;
  }

  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  const url = new URL(window.location.href);
  url.search = '';
  url.searchParams.set(PARAM, encoded);
  return url.toString();
}

/**
 * Parse a URL's search params and return { inputs, override, scenarioName }.
 * Returns null if no share param found or parse fails.
 */
export function parseShareUrl(search) {
  try {
    const params = new URLSearchParams(search);
    const encoded = params.get(PARAM);
    if (!encoded) return null;

    const payload = JSON.parse(decodeURIComponent(escape(atob(encoded))));

    const inputs = {};
    INPUT_FIELDS.forEach((k) => {
      if (payload[k] !== undefined) inputs[k] = payload[k];
    });

    const override = {};
    OVERRIDE_FIELDS.forEach((k) => {
      const pk = `o_${k}`;
      if (payload[pk] !== undefined) override[k] = payload[pk];
    });

    return {
      inputs,
      override,
      scenarioName: payload.scenario || null,
    };
  } catch {
    return null;
  }
}

/**
 * Write text to clipboard.
 * Primary: navigator.clipboard API.
 * Fallback: execCommand (Safari < 13.1, old iOS).
 * @param {string} text
 * @returns {Promise<void>}
 */
export async function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  // Fallback for Safari / older browsers.
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'absolute';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
}
