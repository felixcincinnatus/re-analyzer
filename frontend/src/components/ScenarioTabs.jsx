// ScenarioTabs.jsx — pill tabs for named scenarios.
// Selected tab: #1a7a4a bg / white text.
// Unselected: white bg / #555 text / 1px #ddd border.
// Delete (×) only on the active tab.
// Rename via pencil icon → inline <input>, blur/Enter confirms, Escape cancels.
// "+ New Scenario" disabled with tooltip when MAX_SCENARIOS reached.
import { useState, useRef, useEffect } from 'react';
import { MAX_SCENARIOS } from '../utils/scenarioState.js';

const BASE_TAB = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  minHeight: 44,
  padding: '0 14px',
  borderRadius: 20,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  border: '1px solid #ddd',
  fontFamily: 'Inter, sans-serif',
  whiteSpace: 'nowrap',
  userSelect: 'none',
};

const ACTIVE_TAB = {
  ...BASE_TAB,
  background: '#1a7a4a',
  color: '#fff',
  border: '1px solid #1a7a4a',
};

const INACTIVE_TAB = {
  ...BASE_TAB,
  background: '#fff',
  color: '#555',
};

const ICON_BTN = {
  background: 'none',
  border: 'none',
  padding: '2px 4px',
  cursor: 'pointer',
  lineHeight: 1,
  display: 'inline-flex',
  alignItems: 'center',
};

export default function ScenarioTabs({
  scenarios,          // array of scenario objects { id, name, override, ... }
  activeScenarioId,   // string | null
  onSelect,           // (id) => void
  onAdd,              // () => void — create new scenario
  onDelete,           // (id) => void
  onRename,           // (id, newName) => void
}) {
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef(null);

  // Focus the rename input whenever it appears.
  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const startRename = (id, currentName) => {
    setEditingId(id);
    setEditValue(currentName);
  };

  const commitRename = () => {
    const trimmed = editValue.trim();
    if (trimmed && editingId) {
      onRename(editingId, trimmed);
    }
    setEditingId(null);
  };

  const cancelRename = () => {
    setEditingId(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
    if (e.key === 'Escape') { e.preventDefault(); cancelRename(); }
  };

  const atLimit = scenarios.length >= MAX_SCENARIOS;

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
        alignItems: 'center',
      }}
      role="tablist"
      aria-label="Scenarios"
    >
      {scenarios.map((s) => {
        const isActive = s.id === activeScenarioId;
        const isEditing = s.id === editingId;

        return (
          <div
            key={s.id}
            style={isActive ? ACTIVE_TAB : INACTIVE_TAB}
            role="tab"
            aria-selected={isActive}
            aria-label={`Scenario: ${s.name}`}
            onClick={() => { if (!isEditing) onSelect(s.id); }}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && !isEditing) onSelect(s.id);
            }}
            tabIndex={isActive ? 0 : -1}
          >
            {/* Tab name or inline rename input */}
            {isEditing ? (
              <input
                ref={inputRef}
                value={editValue}
                maxLength={50}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={commitRename}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
                style={{
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  color: isActive ? '#fff' : '#333',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: 13,
                  fontWeight: 600,
                  width: Math.max(60, editValue.length * 8),
                  minWidth: 60,
                  maxWidth: 200,
                }}
                aria-label="Rename scenario"
              />
            ) : (
              <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {s.name}
              </span>
            )}

            {/* Pencil rename button — always visible on active tab, hidden when editing */}
            {isActive && !isEditing && (
              <button
                style={{
                  ...ICON_BTN,
                  color: '#ffffffbb',
                  fontSize: 11,
                }}
                onClick={(e) => { e.stopPropagation(); startRename(s.id, s.name); }}
                title="Rename scenario"
                aria-label="Rename scenario"
              >
                ✎
              </button>
            )}

            {/* Delete button — only on active tab, not while editing */}
            {isActive && !isEditing && (
              <button
                style={{
                  ...ICON_BTN,
                  color: '#ffffffaa',
                  fontSize: 14,
                  marginLeft: -2,
                }}
                onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
                title="Delete scenario"
                aria-label="Delete scenario"
              >
                ×
              </button>
            )}
          </div>
        );
      })}

      {/* "+ New Scenario" button */}
      <div
        title={atLimit ? `Limit of ${MAX_SCENARIOS} scenarios reached` : 'Add a new scenario'}
        style={{ display: 'inline-flex' }}
      >
        <button
          onClick={atLimit ? undefined : onAdd}
          disabled={atLimit}
          style={{
            ...BASE_TAB,
            background: 'transparent',
            color: atLimit ? '#bbb' : '#1a7a4a',
            border: `1px solid ${atLimit ? '#e0e0e0' : '#1a7a4a'}`,
            cursor: atLimit ? 'not-allowed' : 'pointer',
            fontWeight: 600,
          }}
          aria-disabled={atLimit}
          aria-label={atLimit ? `Scenario limit reached (${MAX_SCENARIOS})` : 'Add new scenario'}
        >
          + New Scenario
        </button>
      </div>
    </div>
  );
}
