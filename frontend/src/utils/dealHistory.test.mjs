// dealHistory.test.mjs — pure Node.js assertions, no framework required.
// Mocks localStorage since Node has no DOM.
// Run: node src/utils/dealHistory.test.mjs

import assert from 'node:assert/strict';

// ─── localStorage mock ────────────────────────────────────────────────────────
let _store = {};
let _throwOnSet = false;
let _throwCountdown = -1; // -1 = never, >=0 = throw after N successful sets

const localStorageMock = {
  getItem: (k) => _store[k] ?? null,
  setItem: (k, v) => {
    if (_throwOnSet) {
      const err = new Error('QuotaExceededError');
      err.name = 'QuotaExceededError';
      throw err;
    }
    if (_throwCountdown === 0) {
      _throwCountdown = -1;
      const err = new Error('QuotaExceededError');
      err.name = 'QuotaExceededError';
      throw err;
    }
    if (_throwCountdown > 0) _throwCountdown--;
    _store[k] = v;
  },
  removeItem: (k) => { delete _store[k]; },
  clear: () => { _store = {}; },
};

// Inject localStorage mock into global scope before importing the module
// (crypto is already available in Node v22)
globalThis.localStorage = localStorageMock;

const { loadHistory, saveToHistory, makeHistoryEntry } =
  await import('./dealHistory.js');

function reset() {
  _store = {};
  _throwOnSet = false;
  _throwCountdown = -1;
}

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

// ─── loadHistory ──────────────────────────────────────────────────────────────
console.log('\nloadHistory');

test('returns [] when localStorage is empty', () => {
  reset();
  assert.deepEqual(loadHistory(), []);
});

test('returns parsed array when data exists', () => {
  reset();
  const entries = [{ id: '1', address: '123 Main' }];
  _store['re-analyzer-deals'] = JSON.stringify(entries);
  assert.deepEqual(loadHistory(), entries);
});

test('returns [] and clears key on invalid JSON', () => {
  reset();
  _store['re-analyzer-deals'] = 'not-json{{{';
  const result = loadHistory();
  assert.deepEqual(result, []);
  // Key should be removed
  assert.equal(_store['re-analyzer-deals'], undefined);
});

// ─── saveToHistory ────────────────────────────────────────────────────────────
console.log('\nsaveToHistory');

const makeEntry = (n) => ({ id: String(n), address: `${n} Test St`, date: new Date().toISOString() });

test('prepends new entry to history', () => {
  reset();
  const existing = [makeEntry(1)];
  const newEntry = makeEntry(2);
  const result = saveToHistory(existing, newEntry);
  assert.equal(result[0].id, '2');
  assert.equal(result[1].id, '1');
});

test('persists to localStorage', () => {
  reset();
  const entry = makeEntry(10);
  saveToHistory([], entry);
  const stored = JSON.parse(_store['re-analyzer-deals']);
  assert.equal(stored[0].id, '10');
});

test('prunes to MAX=50 when over limit', () => {
  reset();
  // Build 50 existing entries, add one more
  const existing = Array.from({ length: 50 }, (_, i) => makeEntry(i));
  const result = saveToHistory(existing, makeEntry(99));
  assert.equal(result.length, 50);
  assert.equal(result[0].id, '99'); // newest first
});

test('does not prune at exactly 50 entries total', () => {
  reset();
  const existing = Array.from({ length: 49 }, (_, i) => makeEntry(i));
  const result = saveToHistory(existing, makeEntry(99));
  assert.equal(result.length, 50);
});

test('QuotaExceededError: prunes 10 and retries', () => {
  reset();
  const existing = Array.from({ length: 30 }, (_, i) => makeEntry(i));
  const newEntry = makeEntry(99);
  // First setItem call throws, second succeeds
  _throwCountdown = 0; // throw on next setItem, then allow
  const result = saveToHistory(existing, newEntry);
  // next = 31 entries, pruned to 31 - 10 = 21
  assert.equal(result.length, 21);
  assert.equal(result[0].id, '99');
});

test('QuotaExceededError with persistent failure: returns original history', () => {
  reset();
  const existing = [makeEntry(1), makeEntry(2)];
  const newEntry = makeEntry(99);
  _throwOnSet = true; // all setItem calls throw
  const result = saveToHistory(existing, newEntry);
  assert.deepEqual(result, existing);
});

test('does not mutate the input history array', () => {
  reset();
  const existing = [makeEntry(1)];
  const ref = existing;
  saveToHistory(existing, makeEntry(2));
  assert.equal(existing, ref);
  assert.equal(existing.length, 1);
});

// ─── makeHistoryEntry ─────────────────────────────────────────────────────────
console.log('\nmakeHistoryEntry');

const baseInputs = {
  address: '456 Oak Ave',
  city: 'Portland',
  arv_estimate: 350000,
  purchase_price: 200000,
};
const metrics = { deal_score: 'STRONG', roi_pct: 22.5, net_profit: 45000 };
const costs = { total_all_in_cost: 305000 };

test('entry has required shape fields', () => {
  const entry = makeHistoryEntry({ baseInputs, scenarios: [], costs, metrics, ai_narrative: 'Good deal.' });
  assert.ok(typeof entry.id === 'string' && entry.id.length > 0, 'id');
  assert.equal(entry.address, '456 Oak Ave');
  assert.equal(entry.city, 'Portland');
  assert.ok(typeof entry.date === 'string', 'date should be ISO string');
  assert.equal(entry.lastScore, 'STRONG');
  assert.equal(entry.lastArv, 350000);
  assert.deepEqual(entry.baseInputs, baseInputs);
  assert.deepEqual(entry.scenarios, []);
  assert.deepEqual(entry.costs, costs);
  assert.deepEqual(entry.metrics, metrics);
  assert.equal(entry.ai_narrative, 'Good deal.');
});

test('falls back to "(no address)" when address is empty', () => {
  const entry = makeHistoryEntry({
    baseInputs: { ...baseInputs, address: '' },
    scenarios: [], costs, metrics, ai_narrative: null,
  });
  assert.equal(entry.address, '(no address)');
});

test('lastScore is null when metrics is null', () => {
  const entry = makeHistoryEntry({
    baseInputs, scenarios: [], costs, metrics: null, ai_narrative: null,
  });
  assert.equal(entry.lastScore, null);
});

test('city falls back to empty string when missing', () => {
  const entry = makeHistoryEntry({
    baseInputs: { ...baseInputs, city: undefined },
    scenarios: [], costs, metrics, ai_narrative: null,
  });
  assert.equal(entry.city, '');
});

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(40)}`);
console.log(`dealHistory: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
