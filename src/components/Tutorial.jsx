import { useState, useEffect, useCallback } from 'react';
import { C } from '../palette.js';

const mono = { fontFamily: "'IBM Plex Mono', monospace" };

const TUTORIAL_KEY = 'statlab_tutorial_v1_seen';

export function hasTutorialSeen() {
  try { return localStorage.getItem(TUTORIAL_KEY) === '1'; } catch { return false; }
}

export function markTutorialSeen() {
  try { localStorage.setItem(TUTORIAL_KEY, '1'); } catch { /* ignore */ }
}

const STEPS = [
  { id: 'welcome', target: null, title: 'Welcome to StatLab', body: 'A quick tour of the workbench, using the built-in Iris dataset and a Welch t-test as an example.' },
  { id: 'navigator', target: 'navigator', title: 'Pick a test', body: 'Browse or search 84+ statistical tests here. Selecting one drives the chart, parameters, and results.' },
  { id: 'viz', target: 'viz', title: 'See your data', body: 'The chart updates automatically for the active test. Switch to EXPLORE for free-form charting of the whole dataset.' },
  { id: 'calc', target: 'calc', title: 'Configure and read results', body: 'Set test parameters on the left and read APA-ready results, tables, and diagnostics on the right.' },
  { id: 'advanced', target: 'advanced', title: 'Advanced settings', body: 'Map X/Y/Color variables and set the significance level here. Collapse this panel when you don\'t need it.' },
  { id: 'dataset', target: 'dataset', title: 'Try other datasets', body: 'Click here anytime to browse the built-in sample datasets — Diamonds, Gapminder, Salaries, and more.' },
];

function useTargetRect(target) {
  const [rect, setRect] = useState(null);
  useEffect(() => {
    if (!target) { setRect(null); return undefined; }
    const measure = () => {
      const el = document.querySelector(`[data-tutorial-target="${target}"]`);
      setRect(el ? el.getBoundingClientRect() : null);
    };
    measure();
    window.addEventListener('resize', measure);
    const id = setInterval(measure, 300);
    return () => { window.removeEventListener('resize', measure); clearInterval(id); };
  }, [target]);
  return rect;
}

export function Tutorial({ open, onClose, onStepChange }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const rect = useTargetRect(open ? current.target : null);

  useEffect(() => {
    onStepChange?.(open ? current.id : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, current.id]);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  const finish = useCallback(() => {
    markTutorialSeen();
    onClose?.();
  }, [onClose]);

  if (!open) return null;

  const isLast = step === STEPS.length - 1;

  const captionStyle = rect
    ? {
        position: 'fixed',
        top: Math.min(window.innerHeight - 160, rect.bottom + 12),
        left: Math.max(12, Math.min(window.innerWidth - 320, rect.left)),
        width: 300,
      }
    : {
        position: 'fixed', top: '40%', left: '50%', transform: 'translate(-50%, -50%)', width: 320,
      };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000 }}>
      <svg style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        <defs>
          <mask id="statlab-tutorial-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {rect && (
              <rect
                x={rect.left - 6} y={rect.top - 6}
                width={rect.width + 12} height={rect.height + 12}
                rx={6} fill="black"
              />
            )}
          </mask>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill="rgba(3,6,10,.75)" mask="url(#statlab-tutorial-mask)" />
      </svg>

      <div style={{ ...captionStyle, background: C.panel, border: `1px solid ${C.accent}`, borderRadius: 6, padding: 14, boxShadow: '0 12px 32px rgba(0,0,0,.6)', fontFamily: "'Barlow Condensed', sans-serif" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{current.title}</div>
        <div style={{ fontSize: 12, color: C.text, lineHeight: 1.5, marginBottom: 10 }}>{current.body}</div>

        <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
          {STEPS.map((s, i) => (
            <div key={s.id} style={{ width: 6, height: 6, borderRadius: '50%', background: i === step ? C.accent : C.border }} />
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            type="button"
            onClick={finish}
            style={{ background: 'transparent', border: 'none', color: C.dim, ...mono, fontSize: 9, cursor: 'pointer' }}
          >
            Skip
          </button>
          <div style={{ display: 'flex', gap: 6 }}>
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep(s => s - 1)}
                style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.text, ...mono, fontSize: 9, padding: '4px 10px', borderRadius: 3, cursor: 'pointer' }}
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() => (isLast ? finish() : setStep(s => s + 1))}
              style={{ background: C.accent, border: 'none', color: '#000', ...mono, fontSize: 9, fontWeight: 700, padding: '4px 12px', borderRadius: 3, cursor: 'pointer' }}
            >
              {isLast ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
