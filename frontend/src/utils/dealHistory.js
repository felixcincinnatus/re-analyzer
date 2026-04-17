// dealHistory.js — pure helpers for deal history persistence (no React, no side effects)

const KEY = 're-analyzer-deals';
const MAX = 50;
const PRUNE_COUNT = 10;

export function loadHistory() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    try { localStorage.removeItem(KEY); } catch {}
    return [];
  }
}

export function saveToHistory(history, entry) {
  let next = [entry, ...history];
  if (next.length > MAX) {
    next = next.slice(0, MAX);
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      const pruned = next.slice(0, next.length - PRUNE_COUNT);
      try {
        localStorage.setItem(KEY, JSON.stringify(pruned));
        return pruned;
      } catch {
        console.error('[dealHistory] QuotaExceededError — could not save after pruning', {
          entrySize: JSON.stringify(entry).length,
        });
        return history;
      }
    }
  }
  return next;
}

export function makeHistoryEntry({ baseInputs, scenarios, costs, metrics, ai_narrative }) {
  return {
    id: crypto.randomUUID(),
    address: baseInputs.address || '(no address)',
    city: baseInputs.city || '',
    date: new Date().toISOString(),
    lastScore: metrics?.deal_score ?? null,
    lastArv: baseInputs.arv_estimate,
    baseInputs,
    scenarios,
    costs,
    metrics,
    ai_narrative,
  };
}
