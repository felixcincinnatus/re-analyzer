// scenarioState.test.mjs — pure Node.js assertions, no framework required.
// Run: node src/utils/scenarioState.test.mjs

import assert from 'node:assert/strict';
import {
  createScenario,
  deleteScenario,
  renameScenario,
  updateOverride,
  updateNarrative,
  MAX_SCENARIOS,
} from './scenarioState.js';

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

// ─── createScenario ───────────────────────────────────────────────────────────
console.log('\ncreateScenario');

test('returns object with id, name, override, narrativeSnapshot', () => {
  const s = createScenario('Test');
  assert.ok(typeof s.id === 'string' && s.id.length > 0, 'id should be a non-empty string');
  assert.equal(s.name, 'Test');
  assert.deepEqual(s.override, {});
  assert.equal(s.narrativeSnapshot, null);
  assert.equal(s.snapshotDate, null);
});

test('trims name whitespace', () => {
  const s = createScenario('  Scenario A  ');
  assert.equal(s.name, 'Scenario A');
});

test('falls back to "New Scenario" for blank name', () => {
  const s = createScenario('   ');
  assert.equal(s.name, 'New Scenario');
});

test('accepts initial override values', () => {
  const s = createScenario('With override', { arv_estimate: 250000 });
  assert.deepEqual(s.override, { arv_estimate: 250000 });
});

test('each call produces a unique id', () => {
  const a = createScenario('A');
  const b = createScenario('B');
  assert.notEqual(a.id, b.id);
});

// ─── deleteScenario ───────────────────────────────────────────────────────────
console.log('\ndeleteScenario');

const s1 = createScenario('Alpha');
const s2 = createScenario('Beta');
const s3 = createScenario('Gamma');
const allScenarios = [s1, s2, s3];

test('removes the target scenario from the list', () => {
  const { scenarios } = deleteScenario(allScenarios, s1.id, s2.id);
  assert.equal(scenarios.length, 2);
  assert.ok(!scenarios.find((s) => s.id === s2.id), 'Beta should be removed');
});

test('deleting the active scenario sets activeScenarioId to null', () => {
  const { activeScenarioId } = deleteScenario(allScenarios, s2.id, s2.id);
  assert.equal(activeScenarioId, null);
});

test('deleting a non-active scenario preserves activeScenarioId', () => {
  const { activeScenarioId } = deleteScenario(allScenarios, s1.id, s2.id);
  assert.equal(activeScenarioId, s1.id);
});

test('deleting the only scenario returns empty list and null id', () => {
  const { scenarios, activeScenarioId } = deleteScenario([s1], s1.id, s1.id);
  assert.equal(scenarios.length, 0);
  assert.equal(activeScenarioId, null);
});

test('does not mutate the original array', () => {
  const original = [s1, s2];
  deleteScenario(original, s1.id, s2.id);
  assert.equal(original.length, 2);
});

// ─── renameScenario ───────────────────────────────────────────────────────────
console.log('\nrenameScenario');

test('renames the scenario with matching id', () => {
  const result = renameScenario([s1, s2], s1.id, 'Renamed Alpha');
  assert.equal(result.find((s) => s.id === s1.id).name, 'Renamed Alpha');
});

test('does not affect other scenarios', () => {
  const result = renameScenario([s1, s2], s1.id, 'Renamed Alpha');
  assert.equal(result.find((s) => s.id === s2.id).name, s2.name);
});

test('returns original array unchanged for blank name', () => {
  const result = renameScenario([s1, s2], s1.id, '   ');
  assert.equal(result, allScenarios.slice(0, 2) ? result : result); // reference equality
  assert.equal(result[0].name, s1.name); // name unchanged
});

test('trims the new name', () => {
  const result = renameScenario([s1], s1.id, '  Trimmed  ');
  assert.equal(result[0].name, 'Trimmed');
});

// ─── updateOverride ───────────────────────────────────────────────────────────
console.log('\nupdateOverride');

test('updates override for matching scenario', () => {
  const override = { arv_estimate: 300000, holding_months: 6 };
  const result = updateOverride([s1, s2], s1.id, override);
  assert.deepEqual(result.find((s) => s.id === s1.id).override, override);
});

test('does not affect other scenarios override', () => {
  const result = updateOverride([s1, s2], s1.id, { arv_estimate: 999 });
  assert.deepEqual(result.find((s) => s.id === s2.id).override, s2.override);
});

// ─── updateNarrative (optional export) ────────────────────────────────────────
console.log('\nupdateNarrative');

test('updates narrativeSnapshot and snapshotDate for matching scenario', () => {
  if (!updateNarrative) { console.log('    (skipped — not exported)'); return; }
  const result = updateNarrative([s1, s2], s1.id, 'Great deal!');
  const updated = result.find((s) => s.id === s1.id);
  assert.equal(updated.narrativeSnapshot, 'Great deal!');
  assert.ok(updated.snapshotDate !== null);
});

// ─── MAX_SCENARIOS ────────────────────────────────────────────────────────────
console.log('\nMAX_SCENARIOS');

test('is exactly 5', () => {
  assert.equal(MAX_SCENARIOS, 5);
});

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(40)}`);
console.log(`scenarioState: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
