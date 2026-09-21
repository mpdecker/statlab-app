import { lazy, Suspense, useState, useMemo, useCallback, useRef, useEffect } from 'react';
import Papa from 'papaparse';
import { FONTS, GLOBAL_CSS, C, PAL } from './palette.js';
import { BUILTIN, detectCols, loadDataset, _cache, DATASET_DEFAULTS } from './data/datasets.js';
import {
  resolveQuickViewVars, barGroupsFromResult, loadingFromResult,
  formatInferenceSummary, CHART_MODE_LABELS, exploreChartLabel, explorePanelChartFromMode,
  seriesFromResult, useCanvasSize,
} from './utils/vizHelpers.js';
import { CHART_FOR_TEST } from './config/chartMap.js';
import { TREE } from './config/tree.js';
import { TOTAL_TEST_COUNT } from './config/testCategories.js';
import { computeStats, corr, avg, sampleSD } from '@statlab/core/math/core';
import { barHeightPct } from './utils/parse.js';
import { useInference, Navigator } from './components/InferencePanel.jsx';
import { SponsorSlot } from './components/SponsorSlot.jsx';
import { InferenceConfig } from './components/InferenceConfig.jsx';
import { InferenceResults } from './components/InferenceResults.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { ResizablePanel } from './components/ResizablePanel.jsx';
import { ResizableBand } from './components/ResizableBand.jsx';
import { DatasetPicker } from './components/DatasetPicker.jsx';
import { DatasetRecommendations } from './components/DatasetRecommendations.jsx';
import { Tutorial, hasTutorialSeen } from './components/Tutorial.jsx';
import { Sel, Inp } from './components/ui.jsx';
import { loadSession, saveSession, getInitialState } from './utils/session.js';

const QuickChart = lazy(() => import('./components/QuickChart.jsx'));
const ExplorePanel = lazy(() => import('./components/ExplorePanel.jsx'));


const mono = { fontFamily: "'IBM Plex Mono', monospace" };
const vLabel = { writingMode: 'vertical-rl', fontSize: 9, color: C.dim, ...mono, letterSpacing: '.1em', textTransform: 'uppercase' };

// Chart modes with a dedicated AUTO-toolbar button. Each button's visible
// text comes from CHART_MODE_LABELS (vizHelpers.js) — the app's one
// existing source of truth for chart-mode names, also used by the EXPLORE
// tab and QuickChart's own mode-render tests — rather than a second,
// independently-worded copy that can silently disagree with it.
const CHART_ICON_IDS = [
  'violin', 'box', 'scatter', 'histogram', 'barci',
  'heatmap', 'mosaic', 'timeseries', 'boot',
];

const defaultPanelLayout = {
  navigator: { width: 240, visible: true },
  advanced: { width: 280, visible: false },
  calc: { height: 260, visible: true },
};

function getBreakpointLayout() {
  const w = window.innerWidth;
  const layout = JSON.parse(JSON.stringify(defaultPanelLayout));
  if (w < 1024) layout.navigator.visible = false;
  return layout;
}

function usePanelLayout() {
  const [layout, setLayout] = useState(() => {
    try {
      const raw = localStorage.getItem('statlab_panels_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          navigator: { ...defaultPanelLayout.navigator, ...parsed.navigator },
          advanced: { ...defaultPanelLayout.advanced, ...parsed.advanced },
          calc: { ...defaultPanelLayout.calc, ...parsed.calc },
        };
      }
    } catch { /* ignore */ }
    return getBreakpointLayout();
  });

  useEffect(() => {
    try { localStorage.setItem('statlab_panels_v1', JSON.stringify(layout)); } catch { /* ignore */ }
  }, [layout]);

  const toggleVisible = useCallback((key) => setLayout(prev => ({
    ...prev, [key]: { ...prev[key], visible: !prev[key].visible }
  })), []);
  const setPanelWidth = useCallback((key) => (w) => setLayout(prev => ({
    ...prev, [key]: { ...prev[key], width: w }
  })), []);
  const setCalcHeight = useCallback((h) => setLayout(prev => ({
    ...prev, calc: { ...prev.calc, height: h }
  })), []);
  const resetPanels = useCallback(() => setLayout(getBreakpointLayout()), []);

  return { layout, toggleVisible, setPanelWidth, setCalcHeight, resetPanels };
}

// ── Header ────────────────────────────────────────────────────────────────────

function Header({ dsKey, customDef, switchDs, fileRef, handleCSV, uploadMsg, datasetStatus, ds, data, onOpenTutorial }) {
  return (
    <div style={{ padding: '7px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
      {/* Wordmark */}
      <div style={{ lineHeight: 1, marginRight: 4 }}>
        <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '.05em', color: '#fff' }}>
          STAT<span style={{ color: C.accent }}>LAB</span>
        </div>
        <div style={{ fontSize: 8, color: C.dim, ...mono }}>{`v7 \u00B7 ${TOTAL_TEST_COUNT} tests \u00B7 social science edition`}</div>
      </div>

      <DatasetPicker
        datasets={Object.entries(BUILTIN)}
        activeKey={dsKey}
        activeLabel={ds?.label ?? ''}
        activeCount={data.length}
        customEntry={customDef ? { label: customDef.label, desc: customDef.desc } : null}
        onSelect={switchDs}
      />

      {datasetStatus === 'loading' && (
        <span style={{ fontSize: 9, color: C.warn, ...mono }}>{'loading dataset\u2026'}</span>
      )}

      {/* CSV upload */}
      <button
        onClick={() => fileRef.current.click()}
        style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.text, ...mono, fontSize: 9, padding: '3px 8px', borderRadius: 3, cursor: 'pointer' }}
      >
        + CSV
      </button>
      <input ref={fileRef} type="file" accept=".csv" onChange={handleCSV} style={{ display: 'none' }} />
      {uploadMsg && <span style={{ fontSize: 9, color: C.accent, ...mono }}>{uploadMsg}</span>}

      <a
        href="/calculators/"
        title="Browse 140 static calculators"
        style={{
          marginLeft: 'auto', color: C.accent, ...mono, fontSize: 9, fontWeight: 700,
          padding: '3px 8px', border: `1px solid ${C.accent}`, borderRadius: 3,
          textDecoration: 'none', background: 'rgba(93,242,182,0.08)'
        }}
      >
        Calculators (140) &rarr;
      </a>

      <a
        href="https://ko-fi.com/matthieudecker"
        target="_blank"
        rel="noopener noreferrer"
        title="Support StatLab on Ko-fi"
        style={{
          color: C.dim, ...mono, fontSize: 9,
          padding: '3px 8px', border: `1px solid ${C.border}`, borderRadius: 3,
          textDecoration: 'none',
        }}
      >
        {'☕'} ko-fi
      </a>

      <button
        onClick={onOpenTutorial}
        title="Replay tutorial"
        aria-label="Replay tutorial"
        style={{
          background: 'transparent', border: `1px solid ${C.border}`, color: C.dim,
          ...mono, fontSize: 11, width: 22, height: 22, borderRadius: '50%', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
        }}
      >
        ?
      </button>
    </div>
  );
}

// ── Quick-view content ────────────────────────────────────────────────────────

function QuickView({ data, xVar, yVar, colorVar, ds, activeTest, chartMode, setChartMode, inferenceResult, inferenceContext }) {
  const chartPanelRef = useRef(null);
  const canvasSize = useCanvasSize(chartPanelRef, { minW: 160, minH: 120, padW: 16, padH: 16, initialW: 210, initialH: 160 });
  const resolved = useMemo(
    () => resolveQuickViewVars(activeTest, { xVar, yVar, groupVar: colorVar }, inferenceContext),
    [activeTest, xVar, yVar, colorVar, inferenceContext],
  );
  const vizX = resolved.xVar || xVar;
  const vizY = resolved.yVar || yVar;
  const vizGroup = resolved.groupVar ?? colorVar;
  const groups   = useMemo(() => vizGroup && vizGroup !== '(none)' ? [...new Set(data.map(r => r[vizGroup]))] : [], [data, vizGroup]);
  const colorMap = useMemo(() => Object.fromEntries(groups.map((g, i) => [g, PAL[i % PAL.length]])), [groups]);
  const autoMode = CHART_FOR_TEST[activeTest] ?? 'scatter';
  const effectiveMode = chartMode ?? autoMode;
  const isAuto = chartMode == null;
  const modeLabel = CHART_MODE_LABELS[effectiveMode] ?? effectiveMode;
  const inferLine = useMemo(() => formatInferenceSummary(inferenceResult, activeTest), [inferenceResult, activeTest]);
  const xStats = useMemo(() => computeStats(data.map(r => +r[vizX]).filter(Number.isFinite)), [data, vizX]);
  const yStats = useMemo(() => computeStats(data.map(r => +r[vizY]).filter(Number.isFinite)), [data, vizY]);
  const pearsonR = useMemo(() => {
    // A group-comparison test (t-test, ANOVA, ...) resolves both "vars" to
    // the same target variable — there's one numeric variable, not two to
    // correlate. Correlating it with itself is always r=1.000, which reads
    // as a real result next to the actual test statistics below it.
    if (vizX === vizY) return null;
    if (!xStats || !yStats) return null;
    const xs = data.map(r => +r[vizX]).filter(Number.isFinite);
    const ys = data.map(r => +r[vizY]).filter(Number.isFinite);
    if (xs.length !== ys.length || xs.length < 3) return null;
    return corr(xs, ys).toFixed(3);
  }, [data, vizX, vizY, xStats, yStats]);

  const chartIcons = (
    <div style={{ padding: '4px 6px', display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center', borderBottom: `1px solid ${C.border}` }}>
      {isAuto && (
        <span style={{ fontSize: 7, color: C.accent, ...mono, padding: '2px 5px', border: `1px solid ${C.accent}`, borderRadius: 2, letterSpacing: '.08em' }} title={`Auto: ${modeLabel}`}>AUTO</span>
      )}
      {/* Only shown when the active mode has no toolbar button of its own
          (most modes don't — the toolbar covers 9 of CHART_MODE_LABELS'
          25) — otherwise this would repeat the same word the highlighted
          button already shows right next to it. */}
      {!CHART_ICON_IDS.includes(effectiveMode) && (
        <span style={{ fontSize: 7, color: C.dim, ...mono }}>{modeLabel}</span>
      )}
      {CHART_ICON_IDS.map(id => (
        <button
          key={id}
          type="button"
          title={CHART_MODE_LABELS[id]}
          onClick={() => setChartMode(id === chartMode ? null : id)}
          style={{
            background: effectiveMode === id ? 'rgba(196,255,0,.15)' : 'transparent',
            border: `1px solid ${effectiveMode === id ? C.accent : C.border}`,
            color: effectiveMode === id ? C.accent : C.dim,
            padding: '3px 8px', borderRadius: 3, fontSize: 9, cursor: 'pointer',
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          {CHART_MODE_LABELS[id]}
        </button>
      ))}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '5px 8px', borderBottom: `1px solid ${C.border}`, fontSize: 7, color: C.dim, ...mono, textTransform: 'uppercase', letterSpacing: '.1em' }}>
        {vizX === vizY ? vizX : `${vizX} ${'\u00D7'} ${vizY}`}
        {resolved.usingInference && (
          <span style={{ marginLeft: 6, color: C.warn, fontSize: 6 }}>{'\u25B6 inference vars'}</span>
        )}
      </div>

      {chartIcons}

      <div style={{ flex: 1, padding: '6px 3px 3px', minHeight: 0 }}>
        <div ref={chartPanelRef} style={{ height: '100%', background: C.chartBg, borderRadius: 3, padding: '10px 2px 2px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, opacity: .15, backgroundImage: `linear-gradient(${C.border} 1px,transparent 1px),linear-gradient(90deg,${C.border} 1px,transparent 1px)`, backgroundSize: '30px 30px', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1, height: '100%' }}>
            <Suspense fallback={<div role="status">Loading chart…</div>}>
              <ErrorBoundary>
                <QuickChart mode={effectiveMode} data={data} xVar={vizX} yVar={vizY} colorVar={vizGroup} ds={ds} colorMap={colorMap} groups={groups} inferenceResult={inferenceResult} activeTest={activeTest} canvasSize={canvasSize} />
              </ErrorBoundary>
            </Suspense>
          </div>
        </div>
      </div>

      <div style={{ padding: '5px 8px', borderTop: `1px solid ${C.border}`, ...mono, fontSize: 9, flexShrink: 0 }}>
        {xStats && (
          <div style={{ marginBottom: 2 }}>
            <span style={{ color: C.dim }}>{vizX}: </span>
            <span style={{ color: C.accent }}>M={xStats.mean}</span>
            <span style={{ color: C.dim }}> SD={xStats.sd} n={xStats.n}</span>
          </div>
        )}
        {yStats && vizY !== vizX && (
          <div style={{ marginBottom: 2 }}>
            <span style={{ color: C.dim }}>{vizY}: </span>
            <span style={{ color: C.accent }}>M={yStats.mean}</span>
            <span style={{ color: C.dim }}> SD={yStats.sd} n={yStats.n}</span>
          </div>
        )}
        {pearsonR != null && (
          <div><span style={{ color: C.dim }}>r = </span><span style={{ color: C.pos }}>{pearsonR}</span></div>
        )}
        {inferLine && (
          <div style={{ marginTop: 3, color: C.warn, fontSize: 8 }}>{inferLine}</div>
        )}
        {groups.length > 0 && vizGroup !== '(none)' && (
          <div style={{ marginTop: 4, borderTop: `1px solid ${C.border}`, paddingTop: 4 }}>
            {groups.slice(0, 6).map(g => (
              <div key={g} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                <div style={{ width: 7, height: 7, borderRadius: 2, background: colorMap[g], flexShrink: 0 }} />
                <span style={{ fontSize: 8, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Viz region (AUTO quick-view / EXPLORE free-form) ─────────────────────────

function VizRegion({ vizMode, setVizMode, data, xVar, yVar, colorVar, ds, activeTest, chartMode, setChartMode, inferenceResult, inferenceContext, exploreSeed, onBridgeToInference }) {
  const chipStyle = (active) => ({
    background: active ? 'rgba(196,255,0,.12)' : 'transparent',
    border: `1px solid ${active ? C.accent : C.border}`,
    color: active ? C.accent : C.dim,
    ...mono, fontSize: 9, padding: '3px 10px', borderRadius: 3, cursor: 'pointer', letterSpacing: '.08em',
  });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{ display: 'flex', gap: 4, padding: '5px 8px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <button type="button" onClick={() => setVizMode('auto')} style={chipStyle(vizMode === 'auto')}>AUTO</button>
        <button type="button" onClick={() => setVizMode('explore')} style={chipStyle(vizMode === 'explore')}>EXPLORE</button>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {vizMode === 'explore'
          ? <Suspense fallback={<div role="status">Loading explorer…</div>}><ExplorePanel data={data} ds={ds} seed={exploreSeed} inferenceContext={inferenceContext} onBridgeToInference={onBridgeToInference} /></Suspense>
          : (
            <QuickView
              data={data} xVar={xVar} yVar={yVar} colorVar={colorVar} ds={ds}
              activeTest={activeTest} chartMode={chartMode} setChartMode={setChartMode}
              inferenceResult={inferenceResult} inferenceContext={inferenceContext}
            />
          )}
      </div>
    </div>
  );
}

// ── Calculation & Interface band (Config + Results) ──────────────────────────

function CalcBand({ inference, activeTest, ds, data, dsKey, switchDs }) {
  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
      <div style={{ width: 260, flexShrink: 0, borderRight: `1px solid ${C.border}`, overflowY: 'auto' }}>
        <DatasetRecommendations activeTest={activeTest} dsKey={dsKey} onSelectDataset={switchDs} />
        <InferenceConfig active={activeTest} ds={ds} data={data} state={inference.state} />
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', minWidth: 0 }}>
        {/* Bootstrap mediation path + CI */}
        {activeTest === 'med_bootstrap' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {inference.medBs && Number.isFinite(inference.medBs.lo) && Number.isFinite(inference.medBs.hi) && <>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {[
                  { label: 'indirect a×b', value: inference.medBs.ab.toFixed(5), color: inference.medBs.sig ? C.ok : C.warn },
                  { label: `${Math.round((1 - inference.aval) * 100)}% CI lo`, value: inference.medBs.lo.toFixed(5), color: C.pos },
                  { label: `${Math.round((1 - inference.aval) * 100)}% CI hi`, value: inference.medBs.hi.toFixed(5), color: C.pos },
                  { label: 'CI excl. 0', value: inference.medBs.sig ? 'YES' : 'NO', color: inference.medBs.sig ? C.ok : C.neg },
                  { label: 'B', value: inference.medBs.B, color: C.dim },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 3, padding: '3px 8px' }}>
                    <div style={{ fontSize: 7, color: C.dim, ...mono, textTransform: 'uppercase' }}>{label}</div>
                    <div style={{ fontSize: 11, color, ...mono, fontWeight: 600 }}>{value}</div>
                  </div>
                ))}
              </div>
              <div style={{ height: 70 }}>
                <div style={{ fontSize: 8, color: C.dim, ...mono, marginBottom: 2 }}>{'Bootstrap a×b distribution '}(B={inference.medBs.B})</div>
                <div style={{ height: 60, background: C.panel, borderRadius: 3, display: 'flex', alignItems: 'flex-end', padding: '2px 4px', gap: 1, overflow: 'hidden' }}>
                  {(() => {
                    const dist = inference.medBs.dist, lo_ = Math.min(...dist), hi_ = Math.max(...dist), w = (hi_ - lo_) / 24 || 1, cs = Array(24).fill(0);
                    dist.forEach(x => { cs[Math.min(Math.floor((x - lo_) / w), 23)]++; });
                    const maxC = Math.max(...cs, 1);
                    return cs.map((c, i) => (
                      <div key={i} style={{ flex: 1, height: barHeightPct(c, maxC), background: C.warn, opacity: .7, borderRadius: '1px 1px 0 0' }} />
                    ));
                  })()}
                </div>
              </div>
            </>}
            {!inference.medBs && <div style={{ color: C.dim, ...mono, fontSize: 10 }}>Click RUN BOOTSTRAP in the config panel.</div>}
          </div>
        )}

        {/* Bootstrap CI */}
        {activeTest === 'bootstrap' && inference.bsResult?.dist?.length && Number.isFinite(inference.bsResult.lo) && Number.isFinite(inference.bsResult.hi) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {[
                { label: inference.bsStat, value: (inference.bsStat === 'mean' ? avg : inference.bsStat === 'median' ? v => { const s = [...v].sort((a, b) => a - b), n = s.length; return n % 2 ? s[Math.floor(n / 2)] : (s[n / 2 - 1] + s[n / 2]) / 2; } : sampleSD)(inference.allTgt).toFixed(4), color: C.accent },
                { label: `${Math.round((1 - inference.aval) * 100)}% CI lo`, value: inference.bsResult.lo.toFixed(4), color: C.pos },
                { label: `${Math.round((1 - inference.aval) * 100)}% CI hi`, value: inference.bsResult.hi.toFixed(4), color: C.pos },
                { label: 'B', value: '1999', color: C.dim },
                { label: 'n', value: inference.allTgt.length, color: C.dim },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 3, padding: '3px 8px' }}>
                  <div style={{ fontSize: 7, color: C.dim, ...mono, textTransform: 'uppercase' }}>{label}</div>
                  <div style={{ fontSize: 11, color, ...mono, fontWeight: 600 }}>{value}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 8, color: C.dim, ...mono, marginBottom: 2 }}>Bootstrap distribution (B=1999)</div>
            <div style={{ height: 60, background: C.panel, borderRadius: 3, display: 'flex', alignItems: 'flex-end', padding: '2px 4px', gap: 1, overflow: 'hidden' }}>
              {(() => {
                const dist = inference.bsResult.dist, lo_ = Math.min(...dist), hi_ = Math.max(...dist), w = (hi_ - lo_) / 28 || 1, cs = Array(28).fill(0);
                dist.forEach(x => { cs[Math.min(Math.floor((x - lo_) / w), 27)]++; });
                const maxC = Math.max(...cs, 1);
                return cs.map((c, i) => (
                  <div key={i} style={{ flex: 1, height: barHeightPct(c, maxC), background: C.accent, opacity: .7, borderRadius: '1px 1px 0 0' }} />
                ));
              })()}
            </div>
          </div>
        )}

        {/* Power running indicator */}
        {POWER_TESTS_SET.has(activeTest) && inference.powerRunning && (
          <div style={{ color: C.dim, ...mono, fontSize: 10, padding: 8 }}>{'Computing power…'}</div>
        )}

        {/* InferenceResults */}
        {!['bootstrap', 'med_bootstrap'].includes(activeTest) && !(POWER_TESTS_SET.has(activeTest) && inference.powerRunning && !inference.powerResult) && (
          <InferenceResults
            r={inference.result}
            active={activeTest}
            alpha={inference.alpha}
            g1={inference.g1} g2={inference.g2}
            g1vals={inference.g1vals} g2vals={inference.g2vals}
            normG1={inference.normG1} normG2={inference.normG2}
            levene={inference.levene}
            scaleVars={inference.scaleVars}
            ds={ds}
          />
        )}
      </div>
    </div>
  );
}

// ── Advanced panel (variable mapping, global settings, layout reset) ─────────

function AdvancedPanel({ ds, xVar, setXVar, yVar, setYVar, colorVar, setColorVar, alpha, setAlpha, onResetLayout }) {
  const numeric     = ds?.numeric     || [];
  const categorical = ds?.categorical || [];
  return (
    <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', height: '100%' }}>
      <div>
        <div style={{ fontSize: 7, color: C.dim, ...mono, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>Variable mapping</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Sel label="X" value={xVar} onChange={setXVar} options={[...numeric, ...categorical]} width="100%" />
          <Sel label="Y" value={yVar} onChange={setYVar} options={numeric} width="100%" />
          <Sel label="Color" value={colorVar} onChange={setColorVar} options={['(none)', ...categorical]} width="100%" />
        </div>
      </div>
      <div>
        <div style={{ fontSize: 7, color: C.dim, ...mono, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>Global settings</div>
        <Inp label="α (significance)" value={alpha} onChange={setAlpha} width={70} />
      </div>
      <button
        type="button"
        onClick={onResetLayout}
        style={{ marginTop: 'auto', background: 'transparent', border: `1px solid ${C.border}`, color: C.dim, ...mono, fontSize: 9, padding: '5px 8px', borderRadius: 3, cursor: 'pointer' }}
      >
        Reset panel layout
      </button>
    </div>
  );
}

const POWER_TESTS_SET = new Set(['pow_anova', 'pow_chi', 'pow_logit', 'pow_mixed', 'pow_med']);

export default function Workbench() {
  const init = useMemo(() => getInitialState(), []);
  const [dsKey,      setDsKey]      = useState(init.dsKey);
  const [customData, setCustomData] = useState(null);
  const [customDef,  setCustomDef]  = useState(null);
  const [xVar,       setXVar]       = useState(init.xVar);
  const [yVar,       setYVar]       = useState(init.yVar);
  const [colorVar,   setColorVar]   = useState(init.colorVar);
  const [uploadMsg,  setUploadMsg]  = useState('');
  const [dataVersion, setDataVersion] = useState(0);
  const [activeTest, setActiveTest] = useState(init.activeTest);
  const [chartMode, setChartMode] = useState(null);
  const [vizMode, setVizMode] = useState(init.vizMode);
  const [tutorialOpen, setTutorialOpen] = useState(() => !hasTutorialSeen());
  const forcedAdvancedRef = useRef(false);
  const [exploreSeed, setExploreSeed] = useState(null);
  const [inferenceResult, setInferenceResult] = useState(null);
  const [inferenceContext, setInferenceContext] = useState(null);
  const [datasetStatus, setDatasetStatus] = useState('ready');
  const [narrowScreen, setNarrowScreen] = useState(() => window.innerWidth < 700);
  const [dismissedNarrowNotice, setDismissedNarrowNotice] = useState(false);
  const fileRef = useRef();

  const panels = usePanelLayout();

  useEffect(() => {
    const onResize = () => setNarrowScreen(window.innerWidth < 700);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── localStorage persistence ──
  useEffect(() => {
    saveSession({ dsKey, xVar, yVar, colorVar, activeTest, vizMode });
  }, [dsKey, xVar, yVar, colorVar, activeTest, vizMode]);

  useEffect(() => { setChartMode(null); }, [activeTest]);

  const ds   = dsKey === 'custom' ? customDef : BUILTIN[dsKey];
  const data = useMemo(() => {
    void dataVersion;
    if (dsKey === 'custom') return customData || [];
    const entry = BUILTIN[dsKey];
    if (entry?.url) return _cache[dsKey] ?? [];
    return entry?.make?.() ?? [];
  }, [dsKey, customData, dataVersion]);

  const switchDs = useCallback(key => {
    setDsKey(key);
    if (key === 'custom') return;
    const d = BUILTIN[key];
    const defs = DATASET_DEFAULTS[key];
    setXVar(defs?.x ?? d.numeric[0]);
    setYVar((defs?.y ?? d.numeric[1]) || d.numeric[0]);
    setColorVar((defs?.color ?? d.categorical[0]) || '(none)');
    if (d.url) {
      setDatasetStatus('loading');
      loadDataset(key)
        .then(() => { setDataVersion(v => v + 1); setDatasetStatus('ready'); })
        .catch(() => setDatasetStatus('error'));
    } else {
      setDatasetStatus('ready');
      setDataVersion(v => v + 1);
    }
  }, []);

  useEffect(() => {
    const entry = BUILTIN[dsKey];
    if (!entry?.url || _cache[dsKey]) return;
    setDatasetStatus('loading');
    loadDataset(dsKey)
      .then(() => { setDataVersion(v => v + 1); setDatasetStatus('ready'); })
      .catch(() => setDatasetStatus('error'));
  }, [dsKey]);

  const handleVizModeSwitch = useCallback(mode => {
    if (mode === 'explore' && vizMode === 'auto') {
      const chartMode_ = CHART_FOR_TEST[activeTest] ?? 'scatter';
      const resolved = resolveQuickViewVars(activeTest, { xVar, yVar, groupVar: colorVar }, inferenceContext);
      const inc = inferenceContext?.scaleVars?.length
        ? inferenceContext.scaleVars
        : [resolved.xVar, resolved.yVar, ...(ds?.numeric || []).slice(0, 4)];
      setExploreSeed({
        chartType: chartMode_,
        chartLabel: explorePanelChartFromMode(chartMode_),
        chartLabelDisplay: exploreChartLabel(chartMode_),
        xVar: resolved.xVar,
        yVar: resolved.yVar,
        groupVar: resolved.groupVar,
        catX: resolved.catX,
        catY: resolved.catY,
        includeVars: [...inc].filter((v, i, a) => v && a.indexOf(v) === i),
        inferenceResult,
        activeTest,
      });
    }
    setVizMode(mode);
  }, [vizMode, activeTest, xVar, yVar, colorVar, ds, inferenceContext, inferenceResult]);

  const handleBridgeToInference = useCallback(({ row, col }) => {
    setXVar(row);
    setYVar(col);
    setActiveTest('pearson');
    setVizMode('auto');
  }, []);

  const handleTutorialStepChange = useCallback((stepId) => {
    if (stepId === 'advanced') {
      if (!panels.layout.advanced.visible) {
        forcedAdvancedRef.current = true;
        panels.toggleVisible('advanced');
      }
    } else if (forcedAdvancedRef.current) {
      forcedAdvancedRef.current = false;
      panels.toggleVisible('advanced');
    }
  }, [panels]);

  const handleCSV = useCallback(e => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadMsg('parsing\u2026');
    Papa.parse(file, {
      header: true, skipEmptyLines: true, dynamicTyping: true,
      complete: ({ data: rows, errors }) => {
        if (errors?.length) console.warn('CSV upload warnings:', errors);
        if (!rows?.length) { setUploadMsg('empty file'); return; }
        if (rows.length > 100_000) { setUploadMsg('file too large (max 100k rows)'); return; }
        const { numeric, categorical } = detectCols(rows);
        setCustomData(rows);
        setCustomDef({
          label: file.name.replace(/\.csv$/i, '').slice(0, 14),
          desc:  `${rows.length} rows \u00B7 custom`,
          numeric, categorical,
          make: () => rows,
        });
        setDsKey('custom');
        setXVar(numeric[0] || '');
        setYVar(numeric[1] || numeric[0] || '');
        setColorVar(categorical[0] || '(none)');
        setUploadMsg(`\u2713 ${rows.length} rows \u00B7 ${numeric.length}N ${categorical.length}C`);
      },
      error: () => setUploadMsg('parse error'),
    });
    e.target.value = '';
  }, []);

  // ── Inference hook ──
  const inference = useInference(data, ds, activeTest, setActiveTest, setInferenceResult, setInferenceContext);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: C.bg, fontFamily: "'Barlow Condensed', sans-serif", color: C.text, overflow: 'hidden' }}>
      <style>{FONTS}</style>
      <style>{GLOBAL_CSS}</style>

      {narrowScreen && !dismissedNarrowNotice && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000, background: C.bg,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 16, padding: 32, textAlign: 'center', fontFamily: "'Barlow Condensed', sans-serif",
        }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.text }}>StatLab works best on a larger screen</div>
          <div style={{ fontSize: 14, color: C.dim, maxWidth: 320, lineHeight: 1.5 }}>
            The multi-panel workbench layout isn't optimized for narrow viewports yet.
            For the full experience, open this on a tablet or desktop.
          </div>
          <button
            onClick={() => setDismissedNarrowNotice(true)}
            style={{ background: C.accent, color: C.bg, border: 'none', borderRadius: 4, padding: '8px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', ...{ fontFamily: "'Barlow Condensed', sans-serif" } }}
          >
            Continue anyway
          </button>
        </div>
      )}

      <Header
        dsKey={dsKey} customDef={customDef} switchDs={switchDs}
        fileRef={fileRef} handleCSV={handleCSV} uploadMsg={uploadMsg} datasetStatus={datasetStatus}
        ds={ds} data={data}
        onOpenTutorial={() => setTutorialOpen(true)}
      />

      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <ResizablePanel
          title="Navigator"
          collapsed={!panels.layout.navigator.visible}
          onToggleCollapse={() => panels.toggleVisible('navigator')}
          width={panels.layout.navigator.width}
          minWidth={160}
          maxWidth={500}
          defaultWidth={240}
          onResize={panels.setPanelWidth('navigator')}
          side="right"
          storageKey="nav"
          collapsedRender={<span style={vLabel}>NAVIGATOR</span>}
          data-tutorial-target="navigator"
        >
          <Navigator active={activeTest} setActive={setActiveTest} />
          <SponsorSlot />
        </ResizablePanel>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <div data-tutorial-target="viz" style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <VizRegion
              vizMode={vizMode} setVizMode={handleVizModeSwitch}
              data={data} xVar={xVar} yVar={yVar} colorVar={colorVar} ds={ds}
              activeTest={activeTest} chartMode={chartMode} setChartMode={setChartMode}
              inferenceResult={inferenceResult} inferenceContext={inferenceContext}
              exploreSeed={exploreSeed} onBridgeToInference={handleBridgeToInference}
            />
          </div>

          <ResizableBand
            title="Calculation & Interface"
            collapsed={!panels.layout.calc.visible}
            onToggleCollapse={() => panels.toggleVisible('calc')}
            height={panels.layout.calc.height}
            minHeight={140}
            maxHeight={520}
            defaultHeight={260}
            onResize={panels.setCalcHeight}
            storageKey="calc"
            data-tutorial-target="calc"
          >
            <CalcBand inference={inference} activeTest={activeTest} ds={ds} data={data} dsKey={dsKey} switchDs={switchDs} />
          </ResizableBand>
        </div>

        <ResizablePanel
          title="Advanced"
          collapsed={!panels.layout.advanced.visible}
          onToggleCollapse={() => panels.toggleVisible('advanced')}
          width={panels.layout.advanced.width}
          minWidth={200}
          maxWidth={420}
          defaultWidth={280}
          onResize={panels.setPanelWidth('advanced')}
          side="left"
          storageKey="adv"
          collapsedRender={<span style={vLabel}>ADVANCED</span>}
          data-tutorial-target="advanced"
        >
          <AdvancedPanel
            ds={ds} xVar={xVar} setXVar={setXVar} yVar={yVar} setYVar={setYVar}
            colorVar={colorVar} setColorVar={setColorVar}
            alpha={inference.alpha} setAlpha={inference.setAlpha}
            onResetLayout={panels.resetPanels}
          />
        </ResizablePanel>
      </div>

      <Tutorial open={tutorialOpen} onClose={() => setTutorialOpen(false)} onStepChange={handleTutorialStepChange} />
    </div>
  );
}
