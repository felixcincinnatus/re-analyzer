// DealHistory.jsx — collapsible sidebar drawer.
// Expanded: 260px wide. Collapsed: 40px strip with rotated label.
// Entries are loaded from props (parent owns the array). Click-to-reload
// restores all form fields and scenario state without a backend call.
// Empty state: "No saved deals yet."
import { useState } from 'react';

const SCORE_COLORS = {
  STRONG:   { bg: '#d4f5e2', color: '#1a7a4a' },
  MARGINAL: { bg: '#fef3cd', color: '#7a5c1a' },
  AVOID:    { bg: '#fde8e8', color: '#7a1a1a' },
};

function ScoreBadge({ score }) {
  if (!score || !SCORE_COLORS[score]) return null;
  const { bg, color } = SCORE_COLORS[score];
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '1px 6px',
        borderRadius: 10,
        background: bg,
        color,
        fontSize: 10,
        fontWeight: 700,
        marginLeft: 4,
        verticalAlign: 'middle',
      }}
    >
      {score}
    </span>
  );
}

export default function DealHistory({
  history,      // array of history entries (max 50, newest first)
  onReload,     // (entry) => void — restore session from this entry
  sym,          // currency symbol
}) {
  const [open, setOpen] = useState(true);

  const fmt = (n) =>
    `${sym}${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  const formatDate = (iso) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '';
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        width: open ? 260 : 40,
        minHeight: 120,
        transition: 'width 0.2s ease',
        flexShrink: 0,
      }}
    >
      {/* Collapsed strip */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          title="Show deal history"
          aria-label="Open deal history"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 40,
            height: '100%',
            minHeight: 120,
            background: '#f2f4f7',
            border: '1px solid #e5e7ea',
            borderRadius: 8,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#555',
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
              transform: 'rotate(180deg)',
              letterSpacing: 1,
            }}
          >
            HISTORY
          </span>
        </button>
      )}

      {/* Expanded panel */}
      {open && (
        <div
          style={{
            background: '#fff',
            border: '1px solid #e5e7ea',
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
            width: 260,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 14px',
              borderBottom: '1px solid #f0f0f0',
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: '#333', letterSpacing: 0.5 }}>
              SAVED DEALS
            </span>
            <button
              onClick={() => setOpen(false)}
              title="Hide deal history"
              aria-label="Close deal history"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 16,
                color: '#999',
                padding: '0 2px',
                lineHeight: 1,
              }}
            >
              ‹
            </button>
          </div>

          {/* Entry list */}
          <div
            style={{
              maxHeight: 420,
              overflowY: 'auto',
              padding: history.length === 0 ? '24px 14px' : '4px 0',
            }}
          >
            {history.length === 0 ? (
              <p style={{ margin: 0, fontSize: 12, color: '#aaa', textAlign: 'center' }}>
                No saved deals yet.
              </p>
            ) : (
              history.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => onReload(entry)}
                  title={`Reload: ${entry.address}${entry.city ? ', ' + entry.city : ''}`}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    borderBottom: '1px solid #f5f5f5',
                    padding: '8px 14px',
                    cursor: 'pointer',
                    fontFamily: 'Inter, sans-serif',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f9fafb')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 2,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#222',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: 155,
                      }}
                    >
                      {entry.address}
                    </span>
                    <ScoreBadge score={entry.lastScore} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: '#888' }}>
                      {entry.city || ''}
                    </span>
                    <span style={{ fontSize: 11, color: '#aaa' }}>
                      {entry.lastArv ? fmt(entry.lastArv) : ''}
                      {entry.date ? ' · ' + formatDate(entry.date) : ''}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
