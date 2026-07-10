import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import Papa from 'papaparse';
import { FONTS, GLOBAL_CSS, C, PAL } from './palette.js';
import { BUILTIN, detectCols, loadDataset, _cache, DATASET_DEFAULTS } from './data/datasets.js';
import {
  resolveQuickViewVars, barGroupsFromResult, loadingFromResult,
  formatInferenceSummary, CHART_MODE_LABELS, exploreChartLabel, explorePanelChartFromMode,
  seriesFromResult,
} from './utils/vizHelpers.js';
import { CHART_FOR_TEST } from './config/chartMap.js';
import { TREE } from './config/tree.js';
import { computeStats, corr, avg, sampleSD } from 'statlab/math/core';
import { barHeightPct } from './utils/parse.js';
import { useInference, Navigator } from './components/InferencePanel.jsx';
import { InferenceConfig } from './components/InferenceConfig.jsx';
import { InferenceResults } from './components/InferenceResults.jsx';
import { ResizablePanel } from './components/ResizablePanel.jsx';
import ExplorePanel from './components/ExplorePanel.jsx';
import {
  QuickScatter, QuickScatterFit, ViolinPlot, BarCI, HistogramDensity, HeatmapCorr, MosaicPlot,
  PowerCurve, PathDiagram, ForestPlot, QQPlot, ScreePlot, ResidualPlot, BootstrapHist,
  QuickSlopes, BoxPlotGrid, IRTCurves, LCAProfiles, SpaghettiPlot, CaterpillarPlot,
  ITSPlot, RDPlot, SociogramPlot, TimeSeriesChart,
} from './components/charts.jsx';

const mono = { fontFamily: "'IBM Plex Mono', monospace" };

const CHART_ICONS = [
  { id: 'violin', label: 'VLN', title: 'Violin' },
  { id: 'box', label: 'BOX', title: 'Box plot' },
  { id: 'scatter', label: 'SCT', title: 'Scatter' },
  { id: 'histogram', label: 'HST', title: 'Histogram' },
  { id: 'barci', label: 'BCI', title: 'Bar + CI' },
  { id: 'heatmap', label: 'HM', title: 'Correlogram heatmap' },
  { id: 'mosaic', label: 'MOS', title: 'Mosaic plot' },
  { id: 'timeseries', label: 'TS', title: 'Time series' },
  { id: 'boot', label: 'BST', title: 'Bootstrap' },
];

function computeCorrMatrix(data, vars) {
  return vars.map(v1 => vars.map(v2 => {
    if (v1 === v2) return 1;
    const xs = data.map(r => +r[v1]).filter(Number.isFinite);
    const ys = data.map(r => +r[v2]).filter(Number.isFinite);
    const n = Math.min(xs.length, ys.length);
    if (n < 2) return 0;
    return corr(xs.slice(0, n), ys.slice(0, n));
  }));
}

function renderQuickChart({ mode, data, xVar, yVar, colorVar, ds, colorMap, groups, inferenceResult, activeTest }) {
  const numVals = (col) => data.map(r => +r[col]).filter(Number.isFinite);
  const gVar = colorVar && colorVar !== '(none)' ? colorVar : null;
  const emptyHint = (msg) => (
    <div style={{ padding: 12, fontSize: 9, color: C.dim, ...mono, textAlign: 'center', lineHeight: 1.5 }}>{msg}</div>
  );
  switch (mode) {
    case 'violin': {
      const gVar = colorVar && colorVar !== '(none)' ? colorVar : null;
      const gList = gVar ? [...new Set(data.map(r => r[gVar]))].slice(0, 4) : ['all'];
      return (
        <div style={{ display: 'flex', gap: 4, height: '100%', alignItems: 'center', justifyContent: 'center' }}>
          {gList.map(g => (
            <div key={g} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 8, color: C.dim }}>{g}</div>
              <ViolinPlot
                data={(gVar ? data.filter(r => r[gVar] === g) : data).map(r => +r[yVar]).filter(Number.isFinite)}
                  width={90} height={130}
              />
            </div>
          ))}
        </div>
      );
    }
    case 'scatter':
      return (
        <QuickScatter
          data={data} xVar={xVar} yVar={yVar}
          colorVar={colorVar !== '(none)' ? colorVar : null}
          colorMap={colorMap} groups={groups}
        />
      );
    case 'scatterfit':
      return (
        <QuickScatterFit
          data={data} xVar={xVar} yVar={yVar}
          colorVar={colorVar !== '(none)' ? colorVar : null}
          colorMap={colorMap} groups={groups}
        />
      );
    case 'path':
      return inferenceResult && activeTest === 'mediation'
        ? <PathDiagram r={inferenceResult} />
        : emptyHint('Run Mediation in Inference to see the path diagram.');
    case 'forest':
      return inferenceResult?.studies?.length
        ? <ForestPlot items={inferenceResult.studies.map(s => ({ label: s.label, est: s.d, lo: s.d - 1.96 * s.se, hi: s.d + 1.96 * s.se, p: s.p }))} />
        : emptyHint('Enter study effects in Meta-analysis, then run.');
    case 'qq':
      return <QQPlot vals={numVals(yVar || xVar)} label={yVar || xVar} />;
    case 'scree':
      return inferenceResult?.eigenvalues?.length
        ? <ScreePlot eigenvalues={inferenceResult.eigenvalues} />
        : emptyHint('Run PCA with scale variables selected.');
    case 'residual':
      return inferenceResult?.fitted && inferenceResult?.residuals
        ? <ResidualPlot fitted={inferenceResult.fitted} residuals={inferenceResult.residuals} />
        : emptyHint('Run Simple OLS to view residuals vs fitted.');
    case 'boot':
      return inferenceResult?.dist
        ? <BootstrapHist dist={inferenceResult.dist} lo={inferenceResult.lo} hi={inferenceResult.hi} />
        : <HistogramDensity values={numVals(yVar || xVar)} width={210} height={160} />;
    case 'timeseries': {
      const tsSeries = seriesFromResult(inferenceResult, activeTest);
      if (tsSeries?.length) return <TimeSeriesChart series={tsSeries} width={210} height={140} />;
      return <HistogramDensity values={numVals(yVar || xVar)} width={210} height={160} />;
    }
    case 'histogram':
      return <HistogramDensity values={numVals(yVar || xVar)} width={210} height={160} />;
    case 'barci':
      return <BarCI groups={barGroupsFromResult(inferenceResult, activeTest, data, gVar, yVar)} width={210} height={160} />;
    case 'box':
      return gVar
        ? <BoxPlotGrid data={data} groupVar={gVar} yVar={yVar} width={210} height={160} />
        : emptyHint('Select a Color / group variable for box plots.');
    case 'slopes':
      return inferenceResult?.simpleSlopes?.length
        ? <QuickSlopes slopes={inferenceResult.simpleSlopes} />
        : emptyHint('Run Moderation in Inference to see simple slopes at \u00B11 SD.');
    case 'loading': {
      const load = loadingFromResult(inferenceResult, activeTest, ds?.numeric);
      if (load) {
        return (
          <HeatmapCorr
            matrix={load.matrix} labels={load.colLabels} rowLabels={load.rowLabels}
            width={210} height={210}
          />
        );
      }
      return emptyHint('Run PCA, EFA, or Cronbach \u03B1 in Inference.');
    }
    case 'heatmap': {
      const vars = (ds?.numeric || []).slice(0, 6);
      return <HeatmapCorr matrix={computeCorrMatrix(data, vars)} labels={vars} width={210} height={210} />;
    }
    case 'mosaic':
      return <MosaicPlot data={data} xVar={gVar || xVar} yVar={yVar} width={210} height={160} />;
    case 'power':
      return <PowerCurve d={0.5} currentN={Math.floor(data.length / 2)} />;
    case 'irtplot':
      return inferenceResult?.icc?.length
        ? <IRTCurves icc={inferenceResult.icc} itemCount={inferenceResult.k} />
        : emptyHint('Run IRT 1PL or 2PL with scale items selected.');
    case 'lca':
      return inferenceResult?.profiles?.length
        ? <LCAProfiles profiles={inferenceResult.profiles} />
        : emptyHint('Run Latent Class Analysis with two categorical indicators.');
    case 'spaghetti':
      return gVar && yVar
        ? <SpaghettiPlot data={data} xVar={xVar || ds?.numeric?.[0]} yVar={yVar} groupVar={gVar} />
        : emptyHint('Select cluster ID and outcome for spaghetti plot.');
    case 'caterpillar':
      return inferenceResult?.groupMeans?.length
        ? <CaterpillarPlot groups={inferenceResult.groupMeans} />
        : emptyHint('Run HLM random intercept to see caterpillar plot.');
    case 'its':
      return inferenceResult?.series?.length
        ? <ITSPlot series={inferenceResult.series} />
        : emptyHint('Run Interrupted Time Series with time and outcome vectors.');
    case 'rddplot':
      return inferenceResult?.points?.length
        ? <RDPlot points={inferenceResult.points} cutoff={inferenceResult.cutoff} />
        : emptyHint('Run Regression Discontinuity with X and Y variables.');
    case 'sociogram':
      return inferenceResult?.nodes?.length
        ? <SociogramPlot nodes={inferenceResult.nodes} edges={inferenceResult.edges} />
        : emptyHint('Run Sociogram / enter edge list (A-B,B-C).');
    default:
      return (
        <QuickScatter
          data={data} xVar={xVar} yVar={yVar}
          colorVar={colorVar !== '(none)' ? colorVar : null}
          colorMap={colorMap} groups={groups}
        />
      );
  }
}

// ── Panel layout hook ────────────────────────────────────────────────────────
const defaultPanelLayout = {
  navigator: { width: 240, visible: true },
  config: { width: 280, visible: true },
  quickView: { width: 260, visible: true, position: 'right' },
};

function getBreakpointLayout() {
  const w = window.innerWidth;
  const layout = JSON.parse(JSON.stringify(defaultPanelLayout));
  if (w < 768) {
    layout.navigator.visible = false;
    layout.config.visible = false;
    layout.quickView.visible = false;
  } else if (w < 1024) {
    layout.navigator.visible = false;
    layout.quickView.visible = false;
  } else if (w < 1400) {
    layout.quickView.visible = false;
  }
  return layout;
}

function usePanelLayout() {
  const [layout, setLayout] = useState(() => {
    try {
      const raw = localStorage.getItem('statlab_panels_v1');
      if (raw) return JSON.parse(raw);
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
  const toggleQvPosition = useCallback(() => setLayout(prev => ({
    ...prev, quickView: { ...prev.quickView, position: prev.quickView.position === 'left' ? 'right' : 'left' }
  })), []);
  const resetPanels = useCallback(() => setLayout(getBreakpointLayout()), []);

  return { layout, toggleVisible, setPanelWidth, toggleQvPosition, resetPanels };
}

// ── Header ────────────────────────────────────────────────────────────────────
function Header({ dsKey, setDsKey, customDef, switchDs, fileRef, handleCSV, uploadMsg, datasetStatus, xVar, setXVar, yVar, setYVar, colorVar, setColorVar, ds, data, panelLayout, togglePanel, toggleQvPosition, resetPanels }) {
  const numeric     = ds?.numeric     || [];
  const categorical = ds?.categorical || [];
  const btnStyle = (active) => ({
    background: active ? 'rgba(196,255,0,.12)' : 'transparent',
    border: `1px solid ${active ? C.accent : C.border}`,
    color: active ? C.accent : C.dim,
    ...mono, fontSize: 10, padding: '2px 6px', borderRadius: 3, cursor: 'pointer', lineHeight: 1,
    transition: 'all .1s',
  });
  return (
    <div style={{ padding: '7px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
      {/* Wordmark */}
      <div style={{ lineHeight: 1, marginRight: 4 }}>
        <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '.05em', color: '#fff' }}>
          STAT<span style={{ color: C.accent }}>LAB</span>
        </div>
        <div style={{ fontSize: 8, color: C.dim, ...mono }}>{`v7 \u00B7 ${TOTAL_TEST_COUNT} tests \u00B7 social science edition`}</div>
      </div>

      {/* Dataset pills */}
      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {Object.entries(BUILTIN).map(([key, d]) => (
          <button
            key={key}
            onClick={() => switchDs(key)}
            style={{
              background: dsKey === key ? C.accent : 'transparent',
              color:      dsKey === key ? '#000'    : C.dim,
              border:     `1px solid ${dsKey === key ? C.accent : C.border}`,
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 11,
              padding: '2px 8px', borderRadius: 3, cursor: 'pointer', transition: 'all .1s',
            }}
          >
            {d.label.toUpperCase()}
          </button>
        ))}
        {customDef && (
          <button
            onClick={() => switchDs('custom')}
            style={{
              background: dsKey === 'custom' ? C.accent : 'transparent',
              color:      dsKey === 'custom' ? '#000'    : C.dim,
              border:     `1px solid ${dsKey === 'custom' ? C.accent : C.border}`,
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 11,
              padding: '2px 8px', borderRadius: 3, cursor: 'pointer',
            }}
          >
            {customDef.label.toUpperCase()}
          </button>
        )}
      </div>

      {/* CSV upload */}
      <button
        onClick={() => fileRef.current.click()}
        style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.text, ...mono, fontSize: 9, padding: '3px 8px', borderRadius: 3, cursor: 'pointer' }}
      >
        + CSV
      </button>
      <input ref={fileRef} type="file" accept=".csv" onChange={handleCSV} style={{ display: 'none' }} />
      {uploadMsg && <span style={{ fontSize: 9, color: C.accent, ...mono }}>{uploadMsg}</span>}

      {/* Panel toggle toolbar */}
      {panelLayout && (
        <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
          <button onClick={() => togglePanel('navigator')} title="Toggle Navigator panel" aria-label="Toggle Navigator panel" style={btnStyle(panelLayout.navigator.visible)}>NAV</button>
          <button onClick={() => togglePanel('config')} title="Toggle Config panel" aria-label="Toggle Config panel" style={btnStyle(panelLayout.config.visible)}>CFG</button>
          <button onClick={() => togglePanel('quickView')} title="Toggle Quick View panel" aria-label="Toggle Quick View panel" style={btnStyle(panelLayout.quickView.visible)}>QV</button>
          <button onClick={toggleQvPosition} title="Move Quick View to opposite side" aria-label="Move Quick View to opposite side" style={btnStyle(false)}>FLP</button>
          <button onClick={resetPanels} title="Reset all panel widths" aria-label="Reset all panel widths" style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.dim, ...mono, fontSize: 10, padding: '2px 6px', borderRadius: 3, cursor: 'pointer' }}>RST</button>
        </div>
      )}

      {/* Quick-view axis selectors */}
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        {[
          { label: 'X', value: xVar, onChange: setXVar, options: [...numeric, ...categorical] },
          { label: 'Y', value: yVar, onChange: setYVar, options: numeric },
          { label: 'Color', value: colorVar, onChange: setColorVar, options: ['(none)', ...categorical] },
        ].map(({ label, value, onChange, options }) => (
          <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <label style={{ fontSize: 7, color: C.dim, ...mono, textTransform: 'uppercase', letterSpacing: '.1em' }}>{label}</label>
            <select
              value={value}
              onChange={e => onChange(e.target.value)}
              style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text, ...mono, fontSize: 10, padding: '2px 5px', borderRadius: 3, outline: 'none', cursor: 'pointer' }}
            >
              {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        ))}
        <span style={{ fontSize: 9, color: datasetStatus === 'loading' ? C.warn : C.dim, ...mono }}>
          {datasetStatus === 'loading' ? 'loading dataset\u2026' : `n=${data.length} \u00B7 ${ds?.desc}`}
        </span>
      </div>
    </div>
  );
}

// ── Quick-view content ────────────────────────────────────────────────────────
function QuickView({ data, xVar, yVar, colorVar, ds, activeTest, chartMode, setChartMode, inferenceResult, inferenceContext }) {
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
      <span style={{ fontSize: 7, color: C.dim, ...mono }}>{modeLabel}</span>
      {CHART_ICONS.map(({ id, label, title }) => (
        <button
          key={id}
          type="button"
          title={title}
          onClick={() => setChartMode(id === chartMode ? null : id)}
          style={{
            background: effectiveMode === id ? 'rgba(196,255,0,.15)' : 'transparent',
            border: `1px solid ${effectiveMode === id ? C.accent : C.border}`,
            color: effectiveMode === id ? C.accent : C.dim,
            padding: '3px 8px', borderRadius: 3, fontSize: 9, cursor: 'pointer',
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '5px 8px', borderBottom: `1px solid ${C.border}`, fontSize: 7, color: C.dim, ...mono, textTransform: 'uppercase', letterSpacing: '.1em' }}>
        {vizX} {'\u00D7'} {vizY}
        {resolved.usingInference && (
          <span style={{ marginLeft: 6, color: C.warn, fontSize: 6 }}>{'\u25B6 inference vars'}</span>
        )}
      </div>

      {chartIcons}

      <div style={{ flex: 1, padding: '6px 3px 3px', minHeight: 0 }}>
        <div style={{ height: '100%', background: C.chartBg, borderRadius: 3, padding: '10px 2px 2px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, opacity: .15, backgroundImage: `linear-gradient(${C.border} 1px,transparent 1px),linear-gradient(90deg,${C.border} 1px,transparent 1px)`, backgroundSize: '30px 30px', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1, height: '100%' }}>
            {renderQuickChart({ mode: effectiveMode, data, xVar: vizX, yVar: vizY, colorVar: vizGroup, ds, colorMap, groups, inferenceResult, activeTest })}
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
        {yStats && (
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

// ── Landing page ──────────────────────────────────────────────────────────────
// Headline categories get their own row; everything else (diagnostics, power
// calculators, and the long tail of specialty categories) is bucketed into
// "DIAGNOSTICS & TOOLS" so the summary stays readable as TREE grows. Counts are
// derived from TREE directly rather than hand-maintained, so they can't go stale.
const HEADLINE_CATS = [
  { cat: "COMPARE MEANS",       color: '#44dd88' },
  { cat: "ANALYSIS OF VARIANCE", label: "ANOVA", color: '#60a5fa' },
  { cat: "NONPARAMETRIC",       color: '#f0c040' },
  { cat: "CORRELATION",         color: '#c4ff00' },
  { cat: "REGRESSION",          color: '#ff6bd6' },
  { cat: "CATEGORICAL",         color: '#b980ff' },
  { cat: "EQUIVALENCE & BAYES", color: '#34d399' },
  { cat: "MULTIVARIATE",        color: '#34d399' },
  { cat: "PSYCHOMETRICS",       color: '#f472b6' },
  { cat: "MULTILEVEL MODELS",   color: '#2dd4bf' },
  { cat: "CLUSTERING",          color: '#fb923c' },
  { cat: "NETWORK",             color: '#a78bfa' },
  { cat: "META-ANALYSIS & CAUSAL", label: "META & CAUSAL", color: '#fbbf24' },
];
const TEST_CATEGORIES = (() => {
  const headlineNames = new Set(HEADLINE_CATS.map(h => h.cat));
  const rows = HEADLINE_CATS.map(h => ({
    cat: h.label || h.cat, color: h.color,
    n: TREE.find(c => c.cat === h.cat)?.tests.length || 0,
  }));
  const rest = TREE.filter(c => !headlineNames.has(c.cat)).reduce((s, c) => s + c.tests.length, 0);
  rows.push({ cat: "DIAGNOSTICS & TOOLS", n: rest, color: '#ff4444' });
  return rows;
})();
const TOTAL_TEST_COUNT = TREE.reduce((s, c) => s + c.tests.length, 0);

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

// ── Root App ──────────────────────────────────────────────────────────────────
const LS_KEY = 'statlab_session_v2';

function loadSession() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return null;
}

function saveSession(state) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch (e) { /* ignore */ }
}

function getInitialState() {
  const saved = loadSession();
  return {
    dsKey:      saved?.dsKey      || 'iris',
    xVar:       saved?.xVar       || 'sepalLength',
    yVar:       saved?.yVar       || 'petalLength',
    colorVar:   saved?.colorVar   || 'species',
    activeTest: saved?.activeTest || 't_welch',
    activeTab:  saved?.activeTab  || 'inference',
    hasLaunched: !!saved,
  };
}

const POWER_TESTS_SET = new Set(['pow_anova', 'pow_chi', 'pow_logit', 'pow_mixed', 'pow_med']);

export default function App() {
  const init = useMemo(() => getInitialState(), []);
  const [hasLaunched, setHasLaunched] = useState(init.hasLaunched);
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
  const [activeTab, setActiveTab] = useState(init.activeTab);
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
    saveSession({ dsKey, xVar, yVar, colorVar, activeTest, activeTab });
  }, [dsKey, xVar, yVar, colorVar, activeTest, activeTab]);

  const handleLaunch = useCallback(() => {
    setHasLaunched(true);
    saveSession({ dsKey, xVar, yVar, colorVar, activeTest, activeTab });
  }, [dsKey, xVar, yVar, colorVar, activeTest, activeTab]);

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

  const handleTabSwitch = useCallback(tab => {
    if (tab === 'explore' && activeTab === 'inference') {
      const mode = CHART_FOR_TEST[activeTest] ?? 'scatter';
      const resolved = resolveQuickViewVars(activeTest, { xVar, yVar, groupVar: colorVar }, inferenceContext);
      const inc = inferenceContext?.scaleVars?.length
        ? inferenceContext.scaleVars
        : [resolved.xVar, resolved.yVar, ...(ds?.numeric || []).slice(0, 4)];
      setExploreSeed({
        chartType: mode,
        chartLabel: explorePanelChartFromMode(mode),
        chartLabelDisplay: exploreChartLabel(mode),
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
    setActiveTab(tab);
  }, [activeTab, activeTest, xVar, yVar, colorVar, ds, inferenceContext, inferenceResult]);

  const handleBridgeToInference = useCallback(({ row, col }) => {
    setXVar(row);
    setYVar(col);
    setActiveTest('pearson');
    setActiveTab('inference');
  }, []);

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

  if (!hasLaunched) {
    return <LandingPage onLaunch={handleLaunch} />;
  }

  const qvSide = panels.layout.quickView.position === 'left' ? 'right' : 'left';

  const quickViewPanel = (
    <ResizablePanel
      title="Quick View"
      collapsed={!panels.layout.quickView.visible}
      onToggleCollapse={() => panels.toggleVisible('quickView')}
      width={panels.layout.quickView.width}
      minWidth={200}
      maxWidth={450}
      defaultWidth={260}
      onResize={panels.setPanelWidth('quickView')}
      side={qvSide}
      storageKey="qv"
    >
      <QuickView
        data={data}
        xVar={xVar}
        yVar={yVar}
        colorVar={colorVar}
        ds={ds}
        activeTest={activeTest}
        chartMode={chartMode}
        setChartMode={setChartMode}
        inferenceResult={inferenceResult}
        inferenceContext={inferenceContext}
      />
    </ResizablePanel>
  );

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
        dsKey={dsKey} setDsKey={setDsKey}
        customDef={customDef} switchDs={switchDs}
        fileRef={fileRef} handleCSV={handleCSV} uploadMsg={uploadMsg} datasetStatus={datasetStatus}
        xVar={xVar} setXVar={setXVar}
        yVar={yVar} setYVar={setYVar}
        colorVar={colorVar} setColorVar={setColorVar}
        ds={ds} data={data}
        panelLayout={panels.layout}
        togglePanel={panels.toggleVisible}
        toggleQvPosition={panels.toggleQvPosition}
        resetPanels={panels.resetPanels}
      />

      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* Quick View on left side */}
        {panels.layout.quickView.position === 'left' && panels.layout.quickView.visible && quickViewPanel}

        {/* Navigator panel */}
        {panels.layout.navigator.visible && activeTab === 'inference' && (
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
          >
            <Navigator active={activeTest} setActive={setActiveTest} />
          </ResizablePanel>
        )}

        {/* Config panel */}
        {panels.layout.config.visible && activeTab === 'inference' && (
          <ResizablePanel
            title="Config"
            collapsed={!panels.layout.config.visible}
            onToggleCollapse={() => panels.toggleVisible('config')}
            width={panels.layout.config.width}
            minWidth={180}
            maxWidth={450}
            defaultWidth={280}
            onResize={panels.setPanelWidth('config')}
            side="right"
            storageKey="cfg"
          >
            <InferenceConfig
              active={activeTest} alpha={inference.alpha} setAlpha={inference.setAlpha}
              ds={ds} data={data} state={inference.state}
            />
          </ResizablePanel>
        )}

        {/* Content area */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            {['inference', 'explore'].map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => handleTabSwitch(tab)}
                style={{
                  padding: '5px 14px', fontSize: 9, ...mono, textTransform: 'uppercase', letterSpacing: '0.1em',
                  color: activeTab === tab ? C.accent : C.dim, background: 'transparent', border: 'none',
                  borderBottom: `2px solid ${activeTab === tab ? C.accent : 'transparent'}`, cursor: 'pointer',
                }}
              >
                {tab === 'inference' ? '\u25B6 INFERENCE' : '\u25C8 EXPLORE'}
              </button>
            ))}
          </div>

          {activeTab === 'inference' && (
            <>
              <div style={{ padding: '3px 10px', borderBottom: `1px solid ${C.border}`, fontSize: 7, color: C.dim, ...mono, textTransform: 'uppercase', letterSpacing: '.1em', flexShrink: 0 }}>
                {`\u22A2 ${TOTAL_TEST_COUNT} statistical tests \u00B7 mediation \u00B7 moderation \u00B7 TOST \u00B7 Bayes \u00B7 PCA/EFA \u00B7 ICC \u00B7 meta-analysis \u00B7 DiD \u00B7 APA 7 output`}
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
                {/* Bootstrap mediation path + CI */}
                {activeTest === 'med_bootstrap' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {inference.medBs && Number.isFinite(inference.medBs.lo) && Number.isFinite(inference.medBs.hi) && <>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {[
                          { label: 'indirect a\u00D7b', value: inference.medBs.ab.toFixed(5), color: inference.medBs.sig ? C.ok : C.warn },
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
                        <div style={{ fontSize: 8, color: C.dim, ...mono, marginBottom: 2 }}>{'Bootstrap a\u00D7b distribution '}(B={inference.medBs.B})</div>
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
                  <div style={{ color: C.dim, ...mono, fontSize: 10, padding: 8 }}>{'Computing power\u2026'}</div>
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
            </>
          )}

          {activeTab === 'explore' && (
            <ExplorePanel data={data} ds={ds} seed={exploreSeed} inferenceContext={inferenceContext} onBridgeToInference={handleBridgeToInference} />
          )}
        </div>

        {/* Quick View on right side */}
        {panels.layout.quickView.position === 'right' && panels.layout.quickView.visible && quickViewPanel}
      </div>
    </div>
  );
}
