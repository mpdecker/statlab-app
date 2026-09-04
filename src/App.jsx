import { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { FONTS, GLOBAL_CSS, C } from './palette.js';
import { TEST_CATEGORIES, TOTAL_TEST_COUNT } from './config/testCategories.js';
import { saveSession, getInitialState } from './utils/session.js';

// The workbench (Navigator/Config/Results/Explore/charts — everything past the
// landing page, including the ~550 kB recharts dependency) is lazy-loaded so
// the landing page paints without waiting on it. It only starts fetching once
// the user actually launches, which for a fresh visitor is also the point
// they'd otherwise be staring at a blank screen anyway.
const Workbench = lazy(() => import('./Workbench.jsx'));

const mono = { fontFamily: "'IBM Plex Mono', monospace" };

// ── Landing page ──────────────────────────────────────────────────────────────
function LandingPage({ onLaunch }) {
  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: "'Barlow Condensed', sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <style>{FONTS}</style>
      <style>{GLOBAL_CSS}</style>
      <div style={{ maxWidth: 720, textAlign: 'center' }}>
        <div style={{ fontSize: 64, fontWeight: 900, letterSpacing: '.05em', color: '#fff', marginBottom: 8 }}>
          STAT<span style={{ color: C.accent }}>LAB</span>
        </div>
        <p style={{ fontSize: 18, lineHeight: 1.5, color: C.text, marginBottom: 6 }}>
          {`${TOTAL_TEST_COUNT} statistical tests in your browser.`}
        </p>
        <p style={{ fontSize: 14, lineHeight: 1.5, color: C.dim, marginBottom: 20 }}>
          No install, no account, no data leaves your machine.
        </p>

        <button
          onClick={onLaunch}
          style={{
            background: C.accent, color: '#000', border: 'none',
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16,
            padding: '12px 40px', borderRadius: 4, cursor: 'pointer',
            letterSpacing: '.05em', marginBottom: 40,
          }}
        >
          LAUNCH APP &rarr;
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px 16px', textAlign: 'left', maxWidth: 560, margin: '0 auto' }}>
          {TEST_CATEGORIES.map(({ cat, n, color }) => (
            <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0', borderBottom: `1px solid ${C.border}` }}>
              <span style={{ color }}>{cat}</span>
              <span style={{ color: C.dim, ...mono, fontSize: 11 }}>{n} tests</span>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 11, color: C.dim, marginTop: 30 }}>
          Designed for researchers, instructors, and graduate students.
        </p>
        <p style={{ fontSize: 10, color: C.dim, marginTop: 8 }}>
          <a href="https://github.com/mpdecker/Statlab" target="_blank" rel="noopener" style={{ color: C.accent, textDecoration: 'none' }}>GitHub</a>
          {' \u00B7 '}
          {'APA 7 \u00B7 PCA/EFA \u00B7 Causal inference \u00B7 IRT \u00B7 LCA \u00B7 Meta-analysis \u00B7 Network'}
        </p>
      </div>
    </div>
  );
}


function WorkbenchLoading() {
  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.dim, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 14, letterSpacing: '.05em' }}>
      <style>{FONTS}</style>
      <style>{GLOBAL_CSS}</style>
      LOADING WORKBENCH&hellip;
    </div>
  );
}

export default function App() {
  const init = useMemo(() => getInitialState(), []);
  const [hasLaunched, setHasLaunched] = useState(init.hasLaunched);

  const handleLaunch = useCallback(() => {
    saveSession(init);
    setHasLaunched(true);
  }, [init]);

  if (!hasLaunched) {
    return <LandingPage onLaunch={handleLaunch} />;
  }

  return (
    <Suspense fallback={<WorkbenchLoading />}>
      <Workbench />
    </Suspense>
  );
}
