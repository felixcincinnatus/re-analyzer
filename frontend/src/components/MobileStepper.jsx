// MobileStepper.jsx — 3-step wizard for mobile (< 1024px).
// Step 1: Property Details  Step 2: Financial Details  Step 3: Results & Scenarios
// Step 3 is locked until the first analysis completes (hasResult).
// Back/Next buttons, step indicator (● / ✓ / ○), focus management on transition.
import { useRef, useEffect } from 'react';

const STEPS = [
  { label: 'Property Details', shortLabel: '1' },
  { label: 'Financial Details', shortLabel: '2' },
  { label: 'Results & Scenarios', shortLabel: '3' },
];

function StepDot({ index, currentStep, hasResult }) {
  const stepNum = index + 1;
  const isCompleted = currentStep > stepNum;
  const isActive = currentStep === stepNum;
  const isLocked = stepNum === 3 && !hasResult;

  let bg = '#e0e0e0';
  let color = '#888';
  let symbol = '○';

  if (isCompleted) {
    bg = '#1a7a4a';
    color = '#fff';
    symbol = '✓';
  } else if (isActive) {
    bg = '#1a7a4a';
    color = '#fff';
    symbol = '●';
  } else if (isLocked) {
    bg = '#f0f0f0';
    color = '#ccc';
    symbol = '○';
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {index > 0 && (
        <div
          style={{
            width: 24,
            height: 2,
            background: isCompleted ? '#1a7a4a' : '#e0e0e0',
          }}
        />
      )}
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: bg,
          color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 13,
          fontWeight: 700,
          flexShrink: 0,
        }}
        aria-current={isActive ? 'step' : undefined}
        aria-label={`Step ${stepNum}: ${STEPS[index].label}${isLocked ? ' (locked until analysis)' : ''}`}
      >
        {symbol}
      </div>
    </div>
  );
}

export default function MobileStepper({
  currentStep,      // 1 | 2 | 3
  onStepChange,     // (newStep) => void
  hasResult,        // boolean — whether first analysis has completed
  children,         // array of 3 render elements [step1, step2, step3]
}) {
  const contentRef = useRef(null);

  // Move focus to the top of the new step's content on transition.
  useEffect(() => {
    if (contentRef.current) {
      const focusable = contentRef.current.querySelector(
        'input, select, textarea, button, [tabindex]'
      );
      if (focusable) {
        focusable.focus({ preventScroll: false });
      } else {
        contentRef.current.focus({ preventScroll: false });
      }
    }
  }, [currentStep]);

  const canGoBack = currentStep > 1;
  const canGoNext = currentStep < 3 && (currentStep < 2 || hasResult);

  const goBack = () => { if (canGoBack) onStepChange(currentStep - 1); };
  const goNext = () => { if (canGoNext) onStepChange(currentStep + 1); };

  const stepLabel = STEPS[currentStep - 1]?.label ?? '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Step indicator row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        role="list"
        aria-label="Steps"
      >
        {STEPS.map((_, i) => (
          <StepDot
            key={i}
            index={i}
            currentStep={currentStep}
            hasResult={hasResult}
          />
        ))}
      </div>

      {/* Step label */}
      <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#444' }}>
        Step {currentStep} of {STEPS.length}: {stepLabel}
      </div>

      {/* Step content */}
      <div
        ref={contentRef}
        tabIndex={-1}
        style={{ outline: 'none' }}
        aria-live="polite"
        aria-atomic="false"
      >
        {Array.isArray(children) ? children[currentStep - 1] : children}
      </div>

      {/* Navigation buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <button
          onClick={goBack}
          disabled={!canGoBack}
          style={{
            padding: '10px 20px',
            borderRadius: 8,
            border: '1px solid #ddd',
            background: canGoBack ? '#fff' : '#f5f5f5',
            color: canGoBack ? '#333' : '#bbb',
            cursor: canGoBack ? 'pointer' : 'not-allowed',
            fontFamily: 'Inter, sans-serif',
            fontSize: 13,
            fontWeight: 600,
          }}
          aria-disabled={!canGoBack}
        >
          ← Back
        </button>

        <button
          onClick={goNext}
          disabled={!canGoNext}
          title={
            currentStep === 2 && !hasResult
              ? 'Run analysis first to see results'
              : currentStep === 3
              ? 'Already on the last step'
              : undefined
          }
          style={{
            padding: '10px 20px',
            borderRadius: 8,
            border: 'none',
            background: canGoNext ? '#1a7a4a' : '#ccc',
            color: '#fff',
            cursor: canGoNext ? 'pointer' : 'not-allowed',
            fontFamily: 'Inter, sans-serif',
            fontSize: 13,
            fontWeight: 600,
          }}
          aria-disabled={!canGoNext}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
