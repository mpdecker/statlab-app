import { useState, useMemo, useRef } from 'react';
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

function renderChart({ chart, data, includeVars, groupVar, canvasSize, onBridgeToInference }) {
  const { w, h } = canvasSize;
  const firstNum = includeVars.find(v => data[0] && typeof data[0][v] === 'number');
  const secondNum = includeVars.filter(v => data[0] && typeof data[0][v] === 'number')[1];
  const gv = groupVar !== '(none)' ? groupVar : undefined;
  const numVars = includeVars.filter(v => data[0] && typeof data[0][v] === 'number');

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
    case 'Bubble': return <ExBubble data={data} xVar={firstNum} yVar={secondNum} sizeVar={includeVars[2]} groupVar={gv} width={w} height={h} />;
    case 'Scatt. matrix': return <ExScatterMatrix data={data} vars={numVars.slice(0, 5)} width={w} height={h} />;
    case 'Bar+CI': return <ExBarCI data={data} xVar={gv ?? includeVars[0]} yVar={firstNum} width={w} height={h} />;
    case 'Dot+CI': return <ExDotCI data={data} xVar={gv ?? includeVars[0]} yVar={firstNum} width={w} height={h} />;
    case 'Lollipop': return <ExLollipop data={data} xVar={gv ?? includeVars[0]} yVar={firstNum} width={w} height={h} />;
    case 'Strip+mean': return <ExStripPlot data={data} xVar={gv ?? includeVars[0]} yVar={firstNum} width={w} height={h} />;
    case 'Interact. plot': return <ExInteractionPlot data={data} xVar={firstNum} yVar={secondNum} modVar={gv ?? includeVars[2]} width={w} height={h} />;
    case 'Simp. slopes': return <ExSimpleSlopes data={data} xVar={firstNum} yVar={secondNum} modVar={gv ?? includeVars[2]} width={w} height={h} />;
    case 'Spotlight': return <ExSpotlight data={data} xVar={firstNum} yVar={secondNum} modVar={gv ?? includeVars[2]} width={w} height={h} />;
    case 'Mosaic': return <ExMosaic data={data} xVar={gv ?? includeVars[0]} yVar={includeVars[1]} width={w} height={h} />;
    case 'Stacked%': return <ExStackedBar100 data={data} xVar={gv ?? includeVars[0]} yVar={includeVars[1]} width={w} height={h} />;
    case 'Diverg. Likert': return <ExDivergingLikert data={data} itemVar={gv ?? includeVars[0]} responseVar={firstNum} width={w} height={h} />;
    case 'PCA biplot': return <ExPCABiplot data={data} vars={numVars} groupVar={gv} width={w} height={h} />;
    case 'Load. heatmap': return <ExLoadingHeatmap data={data} vars={numVars} width={w} height={h} />;
    case 'Dendrogram': return <ExDendrogram data={data} vars={numVars} width={w} height={h} />;
    case 'Silhouette': return <ExSilhouette data={data} vars={numVars} width={w} height={h} />;
    default: return <span style={{ color: '#333', fontSize: 10 }}>Select variables to visualize</span>;
  }
}

export default function ExplorePanel({ data, ds, seed, onBridgeToInference }) {
  const [activeChart, setActiveChart] = useState(seed?.chartLabel ?? seed?.chartType ?? 'Scatter+fit');
  const [includeVars, setIncludeVars] = useState(seed?.includeVars ?? []);
  const [groupVar, setGroupVar] = useState(seed?.groupVar ?? '(none)');
  const canvasRef = useRef(null);

  const cols = useMemo(() => {
    if (!data?.length) return [];
    return Object.keys(data[0]);
  }, [data]);

  const catCols = useMemo(() => cols.filter(c => typeof data[0]?.[c] === 'string' || typeof data[0]?.[c] === 'boolean'), [cols, data]);

  const effectiveInclude = includeVars.length
    ? includeVars
    : (ds?.numeric?.length ? ds.numeric : cols.filter(c => typeof data[0]?.[c] === 'number')).slice(0, Math.min(5, cols.length));

  const handleExportSVG = () => {
    const svgEl = canvasRef.current?.querySelector('svg');
    if (!svgEl) return;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svgEl);
    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `statlab-${activeChart.toLowerCase().replace(/\s+/g, '-')}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', height: '100%', flex: 1, minHeight: 0 }}>
      <div style={{ width: 176, borderRight: '1px solid #2a2a2a', background: '#0a0a0a', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {seed && (
          <div style={{ margin: '6px 8px', background: 'rgba(196,255,0,.06)', border: '1px solid rgba(196,255,0,.2)', borderRadius: 3, padding: '4px 6px', fontSize: 8, color: '#c4ff00', lineHeight: 1.4 }}>
            ◈ seeded from<br />
            <span style={{ color: '#fff' }}>{seed.chartLabel ?? seed.chartType}</span><br />
            <span style={{ color: '#555', fontSize: 7 }}>click any chart to change</span>
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
        </div>

        <button
          type="button"
          style={{ margin: 8, padding: '5px 8px', background: 'transparent', border: '1px solid #2a2a2a', color: '#555', fontSize: 9, fontFamily: 'IBM Plex Mono, monospace', borderRadius: 3, cursor: 'pointer' }}
          onClick={handleExportSVG}
        >
          ↓ Export SVG
        </button>
      </div>

      <div style={{ flex: 1, background: '#0d0d0d', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ padding: '5px 12px', borderBottom: '1px solid #1e1e1e', fontSize: 8, color: '#888', fontFamily: 'IBM Plex Mono, monospace' }}>
          {activeChart}
          {effectiveInclude.length ? ` · ${effectiveInclude.join(' · ')}` : ''}
          {groupVar !== '(none)' ? ` · grouped by ${groupVar}` : ''}
        </div>
        <div ref={canvasRef} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12, overflow: 'auto' }}>
          {data?.length
            ? renderChart({
              chart: activeChart,
              data,
              includeVars: effectiveInclude,
              groupVar,
              canvasSize: { w: 560, h: 400 },
              onBridgeToInference,
            })
            : <span style={{ color: '#333', fontSize: 10 }}>No data loaded</span>
          }
        </div>
      </div>
    </div>
  );
}
