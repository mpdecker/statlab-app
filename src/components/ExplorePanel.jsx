import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  getChartInsight, exportSvgFromCanvas, exportCanvasAsPng,
  EXPLORE_CHARTS_XY, EXPLORE_CHARTS_SIZE, EXPLORE_CHARTS_CAT_PAIR,
} from '../utils/vizHelpers.js';
import {
  ExHistogram, ExViolin, ExBox, ExRainCloud, ExECDF,
  ExScatterFit, ExCorrelogram, ExBubble, ExScatterMatrix,
  ExBarCI, ExDotCI, ExLollipop, ExStripPlot,
  ExInteractionPlot, ExSimpleSlopes, ExSpotlight,
  ExMosaic, ExStackedBar100, ExDivergingLikert,
  ExPCABiplot, ExLoadingHeatmap, ExDendrogram, ExSilhouette,
} from './charts-explore.jsx';

const CHART_SECTIONS = [
  { label: 'Distribution', charts: ['Histogram', 'Box', 'Violin', 'Rain-cloud', 'ECDF'] },
  { label: 'Relationship', charts: ['Scatter+fit', 'Correlogram', 'Bubble', 'Scatt. matrix'] },
  { label: 'Comparison', charts: ['Bar+CI', 'Dot+CI', 'Lollipop', 'Strip+mean'] },
  { label: 'Interaction', charts: ['Interact. plot', 'Simp. slopes', 'Spotlight'] },
  { label: 'Categorical', charts: ['Mosaic', 'Stacked%', 'Diverg. Likert'] },
  { label: 'Multivariate', charts: ['PCA biplot', 'Load. heatmap', 'Dendrogram', 'Silhouette'] },
];

function useCanvasSize(ref) {
  const [size, setSize] = useState({ w: 560, h: 360 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setSize({
        w: Math.max(320, Math.floor(width - 24)),
        h: Math.max(240, Math.floor(height - 80)),
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return size;
}

function renderChart({ chart, data, includeVars, groupVar, xVar, yVar, sizeVar, catX, catY, canvasSize, onBridgeToInference }) {
  const { w, h } = canvasSize;
  const numVars = includeVars.filter(v => data[0] && typeof data[0][v] === 'number');
  const firstNum = xVar || numVars[0];
  const secondNum = yVar || numVars[1];
  const gv = groupVar !== '(none)' ? groupVar : undefined;
  const cx = catX || (gv ?? includeVars[0]);
  const cy = catY || includeVars[1];

  switch (chart) {
    case 'Histogram': return <ExHistogram data={data} xVar={firstNum} groupVar={gv} width={w} height={h} />;
    case 'Violin': return <ExViolin data={data} xVar={firstNum} groupVar={gv} width={w} height={h} />;
    case 'Box': return <ExBox data={data} xVar={firstNum} groupVar={gv} width={w} height={h} />;
    case 'Rain-cloud': return <ExRainCloud data={data} xVar={firstNum} groupVar={gv} width={w} height={h} />;
    case 'ECDF': return <ExECDF data={data} xVar={firstNum} width={w} height={h} />;
    case 'Scatter+fit': return <ExScatterFit data={data} xVar={firstNum} yVar={secondNum} groupVar={gv} width={w} height={h} />;
    case 'Correlogram': return (
      <ExCorrelogram data={data} vars={numVars} width={w} height={h}
        onCellClick={({ row, col }) => onBridgeToInference?.({ row, col })} />
    );
    case 'Bubble': return <ExBubble data={data} xVar={firstNum} yVar={secondNum} sizeVar={sizeVar || numVars[2]} groupVar={gv} width={w} height={h} />;
    case 'Scatt. matrix': return <ExScatterMatrix data={data} vars={numVars.slice(0, 5)} width={w} height={h} />;
    case 'Bar+CI': return <ExBarCI data={data} xVar={gv ?? includeVars[0]} yVar={firstNum} width={w} height={h} />;
    case 'Dot+CI': return <ExDotCI data={data} xVar={gv ?? includeVars[0]} yVar={firstNum} width={w} height={h} />;
    case 'Lollipop': return <ExLollipop data={data} xVar={gv ?? includeVars[0]} yVar={firstNum} width={w} height={h} />;
    case 'Strip+mean': return <ExStripPlot data={data} xVar={gv ?? includeVars[0]} yVar={firstNum} width={w} height={h} />;
    case 'Interact. plot': return <ExInteractionPlot data={data} xVar={firstNum} yVar={secondNum} modVar={gv ?? includeVars[2]} width={w} height={h} />;
    case 'Simp. slopes': return <ExSimpleSlopes data={data} xVar={firstNum} yVar={secondNum} modVar={gv ?? includeVars[2]} width={w} height={h} />;
    case 'Spotlight': return <ExSpotlight data={data} xVar={firstNum} yVar={secondNum} modVar={gv ?? includeVars[2]} width={w} height={h} />;
    case 'Mosaic': return <ExMosaic data={data} xVar={cx} yVar={cy} width={w} height={h} />;
    case 'Stacked%': return <ExStackedBar100 data={data} xVar={cx} yVar={cy} width={w} height={h} />;
    case 'Diverg. Likert': return <ExDivergingLikert data={data} itemVar={gv ?? includeVars[0]} responseVar={firstNum} width={w} height={h} />;
    case 'PCA biplot': return <ExPCABiplot data={data} vars={numVars} groupVar={gv} width={w} height={h} />;
    case 'Load. heatmap': return <ExLoadingHeatmap data={data} vars={numVars} width={w} height={h} />;
    case 'Dendrogram': return <ExDendrogram data={data} vars={numVars} width={w} height={h} />;
    case 'Silhouette': return <ExSilhouette data={data} vars={numVars} width={w} height={h} />;
    default: return <span style={{ color: '#333', fontSize: 10 }}>Select variables to visualize</span>;
  }
}

export default function ExplorePanel({ data, ds, seed, inferenceContext, onBridgeToInference }) {
  const [activeChart, setActiveChart] = useState(seed?.chartLabel ?? 'Scatter+fit');
  const [includeVars, setIncludeVars] = useState(seed?.includeVars ?? []);
  const [groupVar, setGroupVar] = useState(seed?.groupVar ?? '(none)');
  const [xVar, setXVar] = useState(seed?.xVar ?? '');
  const [yVar, setYVar] = useState(seed?.yVar ?? '');
  const [sizeVar, setSizeVar] = useState('');
  const [catX, setCatX] = useState(seed?.catX ?? '');
  const [catY, setCatY] = useState(seed?.catY ?? '');
  const canvasRef = useRef(null);
  const canvasSize = useCanvasSize(canvasRef);

  useEffect(() => {
    if (!seed) return;
    if (seed.chartLabel) setActiveChart(seed.chartLabel);
    if (seed.includeVars?.length) setIncludeVars(seed.includeVars);
    if (seed.groupVar) setGroupVar(seed.groupVar);
    if (seed.xVar) setXVar(seed.xVar);
    if (seed.yVar) setYVar(seed.yVar);
    if (seed.catX) setCatX(seed.catX);
    if (seed.catY) setCatY(seed.catY);
  }, [seed]);

  const cols = useMemo(() => {
    if (!data?.length) return [];
    return Object.keys(data[0]);
  }, [data]);

  const catCols = useMemo(() => cols.filter(c => typeof data[0]?.[c] === 'string' || typeof data[0]?.[c] === 'boolean'), [cols, data]);
  const numCols = useMemo(() => cols.filter(c => typeof data[0]?.[c] === 'number'), [cols, data]);

  const effectiveInclude = includeVars.length
    ? includeVars
    : (ds?.numeric?.length ? ds.numeric : numCols).slice(0, Math.min(6, cols.length));

  const effectiveX = xVar || effectiveInclude.find(c => typeof data[0]?.[c] === 'number') || '';
  const effectiveY = yVar || effectiveInclude.filter(c => typeof data[0]?.[c] === 'number')[1] || effectiveX;
  const effectiveCatX = catX || catCols[0] || '';
  const effectiveCatY = catY || catCols[1] || catCols[0] || '';

  const insight = useMemo(() => getChartInsight(activeChart, {
    data, xVar: effectiveX, yVar: effectiveY, groupVar,
    numVars: effectiveInclude.filter(c => typeof data[0]?.[c] === 'number'),
  }), [activeChart, data, effectiveX, effectiveY, groupVar, effectiveInclude]);

  const showXY = EXPLORE_CHARTS_XY.has(activeChart);
  const showSize = EXPLORE_CHARTS_SIZE.has(activeChart);
  const showCatPair = EXPLORE_CHARTS_CAT_PAIR.has(activeChart);

  const handleExportSVG = useCallback(() => {
    exportSvgFromCanvas(canvasRef.current, `statlab-${activeChart.toLowerCase().replace(/\s+/g, '-')}.svg`);
  }, [activeChart]);

  const handleExportPNG = useCallback(() => {
    exportCanvasAsPng(canvasRef.current, `statlab-${activeChart.toLowerCase().replace(/\s+/g, '-')}.png`);
  }, [activeChart]);

  return (
    <div style={{ display: 'flex', height: '100%', flex: 1, minHeight: 0 }}>
      <div style={{ width: 176, borderRight: '1px solid #2a2a2a', background: '#0a0a0a', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {seed && (
          <div style={{ margin: '6px 8px', background: 'rgba(196,255,0,.06)', border: '1px solid rgba(196,255,0,.2)', borderRadius: 3, padding: '4px 6px', fontSize: 8, color: '#c4ff00', lineHeight: 1.4 }}>
            ◈ seeded from Inference<br />
            <span style={{ color: '#fff' }}>{seed.chartLabel ?? seed.chartType}</span>
            {inferenceContext?.active && (
              <><br /><span style={{ color: '#555', fontSize: 7 }}>test: {inferenceContext.active}</span></>
            )}
            <br /><span style={{ color: '#555', fontSize: 7 }}>click any chart to change</span>
          </div>
        )}

        {CHART_SECTIONS.map(({ label, charts }) => (
          <div key={label} style={{ borderBottom: '1px solid #1e1e1e' }}>
            <div style={{ padding: '4px 8px', fontSize: 7, color: '#444', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>{label}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, padding: '4px 6px' }}>
              {charts.map(c => (
                <button
                  key={c}
                  onClick={() => setActiveChart(c)}
                  style={{
                    padding: '5px 4px', borderRadius: 3, fontSize: 9,
                    fontFamily: 'IBM Plex Mono, monospace', cursor: 'pointer',
                    textAlign: 'center', lineHeight: 1.3,
                    background: activeChart === c ? 'rgba(196,255,0,.08)' : 'transparent',
                    border: `1px solid ${activeChart === c ? 'rgba(196,255,0,.4)' : '#1e1e1e'}`,
                    color: activeChart === c ? '#c4ff00' : '#888',
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div style={{ borderBottom: '1px solid #1e1e1e' }}>
          <div style={{ padding: '4px 8px', fontSize: 7, color: '#444', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>Variables</div>
          <div style={{ padding: '5px 8px' }}>
            <div style={{ fontSize: 7, color: '#444', textTransform: 'uppercase', marginBottom: 2 }}>Include</div>
            <select
              multiple
              size={5}
              style={{ width: '100%', background: '#111', border: '1px solid #333', color: '#c4ff00', fontSize: 9, fontFamily: 'IBM Plex Mono, monospace', padding: '3px 5px', borderRadius: 2 }}
              value={includeVars}
              onChange={e => setIncludeVars([...e.target.selectedOptions].map(o => o.value))}
            >
              {cols.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ padding: '5px 8px' }}>
            <div style={{ fontSize: 7, color: '#444', textTransform: 'uppercase', marginBottom: 2 }}>Group / color</div>
            <select
              style={{ width: '100%', background: '#111', border: '1px solid #333', color: '#c4ff00', fontSize: 9, fontFamily: 'IBM Plex Mono, monospace', padding: '3px 5px', borderRadius: 2 }}
              value={groupVar}
              onChange={e => setGroupVar(e.target.value)}
            >
              <option value="(none)">(none)</option>
              {catCols.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {showXY && (
            <>
              <div style={{ padding: '5px 8px' }}>
                <div style={{ fontSize: 7, color: '#444', textTransform: 'uppercase', marginBottom: 2 }}>X</div>
                <select style={{ width: '100%', background: '#111', border: '1px solid #333', color: '#c4ff00', fontSize: 9, fontFamily: 'IBM Plex Mono, monospace', padding: '3px 5px', borderRadius: 2 }}
                  value={effectiveX} onChange={e => setXVar(e.target.value)}>
                  {numCols.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ padding: '5px 8px' }}>
                <div style={{ fontSize: 7, color: '#444', textTransform: 'uppercase', marginBottom: 2 }}>Y</div>
                <select style={{ width: '100%', background: '#111', border: '1px solid #333', color: '#c4ff00', fontSize: 9, fontFamily: 'IBM Plex Mono, monospace', padding: '3px 5px', borderRadius: 2 }}
                  value={effectiveY} onChange={e => setYVar(e.target.value)}>
                  {numCols.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </>
          )}
          {showCatPair && (
            <>
              <div style={{ padding: '5px 8px' }}>
                <div style={{ fontSize: 7, color: '#444', textTransform: 'uppercase', marginBottom: 2 }}>Cat X</div>
                <select style={{ width: '100%', background: '#111', border: '1px solid #333', color: '#c4ff00', fontSize: 9, fontFamily: 'IBM Plex Mono, monospace', padding: '3px 5px', borderRadius: 2 }}
                  value={effectiveCatX} onChange={e => setCatX(e.target.value)}>
                  {catCols.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ padding: '5px 8px' }}>
                <div style={{ fontSize: 7, color: '#444', textTransform: 'uppercase', marginBottom: 2 }}>Cat Y</div>
                <select style={{ width: '100%', background: '#111', border: '1px solid #333', color: '#c4ff00', fontSize: 9, fontFamily: 'IBM Plex Mono, monospace', padding: '3px 5px', borderRadius: 2 }}
                  value={effectiveCatY} onChange={e => setCatY(e.target.value)}>
                  {catCols.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </>
          )}
          {showSize && (
            <div style={{ padding: '5px 8px' }}>
              <div style={{ fontSize: 7, color: '#444', textTransform: 'uppercase', marginBottom: 2 }}>Size</div>
              <select style={{ width: '100%', background: '#111', border: '1px solid #333', color: '#c4ff00', fontSize: 9, fontFamily: 'IBM Plex Mono, monospace', padding: '3px 5px', borderRadius: 2 }}
                value={sizeVar} onChange={e => setSizeVar(e.target.value)}>
                <option value="">(auto)</option>
                {numCols.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, margin: 8 }}>
          <button
            type="button"
            style={{ padding: '5px 8px', background: 'transparent', border: '1px solid #2a2a2a', color: '#555', fontSize: 9, fontFamily: 'IBM Plex Mono, monospace', borderRadius: 3, cursor: 'pointer' }}
            onClick={handleExportSVG}
          >
            ↓ Export SVG
          </button>
          <button
            type="button"
            style={{ padding: '5px 8px', background: 'transparent', border: '1px solid #2a2a2a', color: '#555', fontSize: 9, fontFamily: 'IBM Plex Mono, monospace', borderRadius: 3, cursor: 'pointer' }}
            onClick={handleExportPNG}
          >
            ↓ Export PNG
          </button>
        </div>
      </div>

      <div style={{ flex: 1, background: '#0d0d0d', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ padding: '5px 12px', borderBottom: '1px solid #1e1e1e', fontSize: 8, color: '#888', fontFamily: 'IBM Plex Mono, monospace' }}>
          {activeChart}
          {effectiveInclude.length ? ` · ${effectiveInclude.join(' · ')}` : ''}
          {groupVar !== '(none)' ? ` · grouped by ${groupVar}` : ''}
          <span style={{ float: 'right', color: '#444' }}>{canvasSize.w}×{canvasSize.h}</span>
        </div>
        <div ref={canvasRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 12, overflow: 'auto', minHeight: 0 }}>
          {data?.length
            ? renderChart({
              chart: activeChart,
              data,
              includeVars: effectiveInclude,
              groupVar,
              xVar: effectiveX,
              yVar: effectiveY,
              sizeVar,
              catX: effectiveCatX,
              catY: effectiveCatY,
              canvasSize,
              onBridgeToInference,
            })
            : <span style={{ color: '#333', fontSize: 10 }}>No data loaded</span>
          }
          {insight && data?.length > 0 && (
            <div style={{ marginTop: 8, maxWidth: 520, padding: '6px 10px', background: 'rgba(196,255,0,.04)', border: '1px solid rgba(196,255,0,.15)', borderRadius: 3, fontSize: 8, color: '#888', lineHeight: 1.45, fontFamily: 'IBM Plex Mono, monospace' }}>
              {insight}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
