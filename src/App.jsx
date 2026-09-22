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
const featuredCalculators = [
  ['Welch t-test', '/calculators/welch-t-test/'],
  ['Mann-Whitney U', '/calculators/mann-whitney-u/'],
  ['One-way ANOVA', '/calculators/one-way-anova/'],
  ['Bayesian A/B Test', '/calculators/bayesian-ab-test/'],
  ['Kaplan-Meier Survival', '/calculators/kaplan-meier-survival/'],
  ['Cosine Similarity (RAG)', '/calculators/cosine-similarity-calculator/'],
  ['Cpk Capability (SPC)', '/calculators/cpk-process-capability-calculator/'],
  ['Power & Sample Size', '/calculators/sample-size-power/'],
];

// ── Landing page ──────────────────────────────────────────────────────────────
function LandingPage({ onLaunch }) {
  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: "'Barlow Condensed', sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '0 20px 40px' }}>
      <style>{FONTS}</style>
      <style>{GLOBAL_CSS}</style>

      {/* Prominent Top Navigation Bar */}
      <nav style={{ width: '100%', maxWidth: 1040, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0', borderBottom: `1px solid ${C.border}`, marginBottom: 40 }}>
        <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: '.05em', color: '#fff' }}>
          STAT<span style={{ color: C.accent }}>LAB</span>
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <a
            href="/calculators/"
            style={{
              color: C.accent,
              fontSize: 13,
              fontWeight: 700,
              textDecoration: 'none',
              background: 'rgba(93,242,182,0.1)',
              border: `1px solid ${C.accent}`,
              padding: '6px 14px',
              borderRadius: 20,
              letterSpacing: '.04em'
            }}
          >
            Calculators Directory (220) &rarr;
          </a>
          <a href="https://www.npmjs.com/package/@statlab/core" target="_blank" rel="noopener" style={{ color: C.dim, fontSize: 13, textDecoration: 'none', ...mono }}>
            npm
          </a>
          <a href="https://github.com/mpdecker/Statlab" target="_blank" rel="noopener" style={{ color: C.dim, fontSize: 13, textDecoration: 'none', ...mono }}>
            GitHub
          </a>
        </div>
      </nav>

      <div style={{ maxWidth: 760, textAlign: 'center' }}>
        <div style={{ fontSize: 64, fontWeight: 900, letterSpacing: '.05em', color: '#fff', marginBottom: 8 }}>
          STAT<span style={{ color: C.accent }}>LAB</span>
        </div>
        <p style={{ fontSize: 20, lineHeight: 1.4, color: C.text, marginBottom: 6, fontWeight: 600 }}>
          {`${TOTAL_TEST_COUNT} statistical tests in your browser.`}
        </p>
        <p style={{ fontSize: 15, lineHeight: 1.5, color: C.dim, marginBottom: 28 }}>
          Zero install, zero account, 100% browser-local execution. APA 7 output & zero runtime dependencies.
        </p>

        {/* Hero Dual Action Buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 14, marginBottom: 36 }}>
          <button
            onClick={onLaunch}
            style={{
              background: C.accent, color: '#000', border: 'none',
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16,
              padding: '14px 36px', borderRadius: 4, cursor: 'pointer',
              letterSpacing: '.05em', boxShadow: '0 4px 20px rgba(93,242,182,0.25)',
            }}
          >
            LAUNCH APP &rarr;
          </button>

          <a
            href="/calculators/"
            style={{
              background: 'rgba(255,255,255,0.04)', color: C.text, border: `1px solid ${C.border}`,
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16,
              padding: '14px 32px', borderRadius: 4, textDecoration: 'none',
              letterSpacing: '.05em', display: 'inline-flex', alignItems: 'center', gap: 6
            }}
          >
            EXPLORE 220 CALCULATORS &rarr;
          </a>
        </div>

        {/* Prominent Calculators Feature Section */}
        <div style={{
          margin: '0 auto 36px',
          maxWidth: 680,
          background: 'linear-gradient(180deg, rgba(17,23,34,0.9), rgba(13,18,27,0.9))',
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          padding: '20px 24px',
          textAlign: 'center',
          boxShadow: '0 12px 36px rgba(0,0,0,0.3)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: '.03em', textTransform: 'uppercase' }}>
              Static SEO Calculators Directory (220 Pages)
            </h3>
            <a href="/calculators/" style={{ color: C.accent, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
              View All 220 Calculators &rarr;
            </a>
          </div>
          <p style={{ fontSize: 13, color: C.dim, margin: '0 0 14px', lineHeight: 1.45, textAlign: 'left' }}>
            Standalone, shareable browser calculators for t-tests, ANOVA, non-parametric tests, Bayesian A/B models, survival analysis, AI/ML evaluation metrics, SPC control charts, and extreme value distributions.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
            {featuredCalculators.map(([label, href]) => (
              <a
                key={href}
                href={href}
                style={{
                  border: `1px solid ${C.border}`,
                  color: C.accent,
                  borderRadius: 4,
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  textDecoration: 'none',
                  background: 'rgba(93,242,182,0.06)',
                }}
              >
                {label} &rarr;
              </a>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px 16px', textAlign: 'left', maxWidth: 560, margin: '0 auto' }}>
          {TEST_CATEGORIES.map(({ cat, n, color }) => (
            <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0', borderBottom: `1px solid ${C.border}` }}>
              <span style={{ color }}>{cat}</span>
              <span style={{ color: C.dim, ...mono, fontSize: 11 }}>{n} tests</span>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 11, color: C.dim, marginTop: 30 }}>
          Designed for researchers, instructors, developers, and statistical engineers.
        </p>
        <p style={{ fontSize: 10, color: C.dim, marginTop: 8 }}>
          <a href="/calculators/" style={{ color: C.accent, textDecoration: 'none' }}>220 Calculators</a>
          {' \u00B7 '}
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
