// scenarioState.js — pure state helpers for named scenarios (no React, no side effects)

export function createScenario(name, override = {}) {
  return {
    id: crypto.randomUUID(),
    name: name.trim() || 'New Scenario',
    override,
    narrativeSnapshot: null,
    snapshotDate: null,
  };
}

export function deleteScenario(scenarios, activeScenarioId, targetId) {
  const nextScenarios = scenarios.filter((s) => s.id !== targetId);
  const nextActiveId = activeScenarioId === targetId ? null : activeScenarioId;
  return { scenarios: nextScenarios, activeScenarioId: nextActiveId };
}

export function renameScenario(scenarios, id, newName) {
  const trimmed = newName.trim();
  if (!trimmed) return scenarios; // empty name: revert (caller should handle)
  return scenarios.map((s) => (s.id === id ? { ...s, name: trimmed } : s));
}

export function updateOverride(scenarios, id, override) {
  return scenarios.map((s) => (s.id === id ? { ...s, override } : s));
}

export function updateNarrative(scenarios, id, narrative) {
  return scenarios.map((s) =>
    s.id === id
      ? { ...s, narrativeSnapshot: narrative, snapshotDate: new Date().toISOString() }
      : s
  );
}

export const MAX_SCENARIOS = 5;
