import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import Papa from 'papaparse';
import { FONTS, GLOBAL_CSS, C, PAL } from './palette.js';
import { BUILTIN, detectCols, loadDataset, _cache, DATASET_DEFAULTS } from './data/datasets.js';
import {
  resolveQuickViewVars, barGroupsFromResult, loadingFromResult,
  formatInferenceSummary, CHART_MODE_LABELS, exploreChartLabel, explorePanelChartFromMode,
} from './utils/vizHelpers.js';
import { CHART_FOR_TEST } from './config/chartMap.js';
import { computeStats, corr } from './math/core.js';
import { InferencePanel } from './components/InferencePanel.jsx';
import ExplorePanel from './components/ExplorePanel.jsx';
import {
  QuickScatter, QuickScatterFit, ViolinPlot, BarCI, HistogramDensity, HeatmapCorr, MosaicPlot,
  PowerCurve, PathDiagram, ForestPlot, QQPlot, ScreePlot, ResidualPlot, BootstrapHist,
  QuickSlopes, BoxPlotGrid, IRTCurves, LCAProfiles, SpaghettiPlot, CaterpillarPlot,
  ITSPlot, RDPlot, SociogramPlot,
} from './components/charts.jsx';

const mono = { fontFamily: "'IBM Plex Mono', monospace" };

const CHART_ICONS = [
  { id: 'violin', label: '♪', title: 'Violin' },
  { id: 'box', label: '▤', title: 'Box plot' },
  { id: 'scatter', label: '⊹', title: 'Scatter' },
  { id: 'histogram', label: '▦', title: 'Histogram' },
  { id: 'barci', label: '⊟', title: 'Bar + CI' },
  { id: 'heatmap', label: '⊞', title: 'Correlogram' },
  { id: 'mosaic', label: '⊠', title: 'Mosaic' },
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
                width={90} height={100}
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
        : emptyHint('Run Moderation in Inference to see simple slopes at ±1 SD.');
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
      return emptyHint('Run PCA, EFA, or Cronbach α in Inference.');
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

// ── Header ────────────────────────────────────────────────────────────────────
function Header({ dsKey, setDsKey, customDef, switchDs, fileRef, handleCSV, uploadMsg, datasetStatus, xVar, setXVar, yVar, setYVar, colorVar, setColorVar, ds, data }) {
  const numeric     = ds?.numeric     || [];
  const categorical = ds?.categorical || [];
  return (
    <div style={{ padding: '7px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
      {/* Wordmark */}
      <div style={{ lineHeight: 1, marginRight: 4 }}>
        <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '.05em', color: '#fff' }}>
          STAT<span style={{ color: C.accent }}>LAB</span>
        </div>
        <div style={{ fontSize: 8, color: C.dim, ...mono }}>v7 · 85 tests · social science edition</div>
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
        ⊕ CSV
      </button>
      <input ref={fileRef} type="file" accept=".csv" onChange={handleCSV} style={{ display: 'none' }} />
      {uploadMsg && <span style={{ fontSize: 9, color: C.accent, ...mono }}>{uploadMsg}</span>}

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
          {datasetStatus === 'loading' ? 'loading dataset…' : `n=${data.length} · ${ds?.desc}`}
        </span>
      </div>
    </div>
  );
}

// ── Quick-view sidebar ────────────────────────────────────────────────────────
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

  return (
    <div style={{ width: 230, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      {/* Label bar */}
      <div style={{ padding: '5px 8px', borderBottom: `1px solid ${C.border}`, fontSize: 7, color: C.dim, ...mono, textTransform: 'uppercase', letterSpacing: '.1em' }}>
        Quick View · {vizX} × {vizY}
        {resolved.usingInference && (
          <span style={{ marginLeft: 6, color: C.warn, fontSize: 6 }}>⊢ inference vars</span>
        )}
      </div>

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
              padding: '3px 8px', borderRadius: 3, fontSize: 10, cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, padding: '6px 3px 3px', minHeight: 0 }}>
        <div style={{ height: '100%', background: C.chartBg, borderRadius: 3, padding: '10px 2px 2px', position: 'relative', overflow: 'hidden' }}>
          {/* Subtle grid */}
          <div style={{ position: 'absolute', inset: 0, opacity: .15, backgroundImage: `linear-gradient(${C.border} 1px,transparent 1px),linear-gradient(90deg,${C.border} 1px,transparent 1px)`, backgroundSize: '30px 30px', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1, height: '100%' }}>
            {renderQuickChart({ mode: effectiveMode, data, xVar: vizX, yVar: vizY, colorVar: vizGroup, ds, colorMap, groups, inferenceResult, activeTest })}
          </div>
        </div>
      </div>

      {/* Summary stats footer */}
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
        {/* Color legend */}
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

// ── Root App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [dsKey,      setDsKey]      = useState('iris');
  const [customData, setCustomData] = useState(null);
  const [customDef,  setCustomDef]  = useState(null);
  const [xVar,       setXVar]       = useState('sepalLength');
  const [yVar,       setYVar]       = useState('petalLength');
  const [colorVar,   setColorVar]   = useState('species');
  const [uploadMsg,  setUploadMsg]  = useState('');
  const [dataVersion, setDataVersion] = useState(0);
  const [activeTest, setActiveTest] = useState('t_welch');
  const [chartMode, setChartMode] = useState(null);
  const [activeTab, setActiveTab] = useState('inference');
  const [exploreSeed, setExploreSeed] = useState(null);
  const [inferenceResult, setInferenceResult] = useState(null);
  const [inferenceContext, setInferenceContext] = useState(null);
  const [datasetStatus, setDatasetStatus] = useState('ready');
  const fileRef = useRef();

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
    setYVar(defs?.y ?? d.numeric[1] || d.numeric[0]);
    setColorVar(defs?.color ?? d.categorical[0] || '(none)');
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
      });
    }
    setActiveTab(tab);
  }, [activeTab, activeTest, xVar, yVar, colorVar, ds, inferenceContext]);

  const handleBridgeToInference = useCallback(({ row, col }) => {
    setXVar(row);
    setYVar(col);
    setActiveTest('pearson');
    setActiveTab('inference');
  }, []);

  const handleCSV = useCallback(e => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadMsg('parsing…');
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
          desc:  `${rows.length} rows · custom`,
          numeric, categorical,
          make: () => rows,
        });
        setDsKey('custom');
        setXVar(numeric[0] || '');
        setYVar(numeric[1] || numeric[0] || '');
        setColorVar(categorical[0] || '(none)');
        setUploadMsg(`✓ ${rows.length} rows · ${numeric.length}N ${categorical.length}C`);
      },
      error: () => setUploadMsg('parse error'),
    });
    e.target.value = '';
  }, []);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: C.bg, fontFamily: "'Barlow Condensed', sans-serif", color: C.text, overflow: 'hidden' }}>
      <style>{FONTS}</style>
      <style>{GLOBAL_CSS}</style>

      {/* ── Header ── */}
      <Header
        dsKey={dsKey} setDsKey={setDsKey}
        customDef={customDef} switchDs={switchDs}
        fileRef={fileRef} handleCSV={handleCSV} uploadMsg={uploadMsg} datasetStatus={datasetStatus}
        xVar={xVar} setXVar={setXVar}
        yVar={yVar} setYVar={setYVar}
        colorVar={colorVar} setColorVar={setColorVar}
        ds={ds} data={data}
      />

      {/* ── Body ── */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>

        {/* Quick-view sidebar */}
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

        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
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
                {tab === 'inference' ? '⊢ INFERENCE' : '◈ EXPLORE'}
              </button>
            ))}
          </div>
          {activeTab === 'inference' && (
            <>
              <div style={{ padding: '3px 10px', borderBottom: `1px solid ${C.border}`, fontSize: 7, color: C.dim, ...mono, textTransform: 'uppercase', letterSpacing: '.1em', flexShrink: 0 }}>
                ⊢ 55 statistical tests · mediation · moderation · TOST · Bayes · PCA/EFA · ICC · meta-analysis · DiD · APA 7 output
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <InferencePanel
                  data={data} ds={ds} active={activeTest} setActive={setActiveTest}
                  onResultChange={(r) => setInferenceResult(r)}
                  onContextChange={setInferenceContext}
                />
              </div>
            </>
          )}
          {activeTab === 'explore' && (
            <ExplorePanel data={data} ds={ds} seed={exploreSeed} inferenceContext={inferenceContext} onBridgeToInference={handleBridgeToInference} />
          )}
        </div>
      </div>
    </div>
  );
}
