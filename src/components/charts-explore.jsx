import {
  ComposedChart, Bar, Line, XAxis, YAxis, ResponsiveContainer, LineChart,
  Scatter, ScatterChart, BarChart, ReferenceLine, ErrorBar,
} from 'recharts';
import { ViolinPlot, BoxPlot, HeatmapCorr, MosaicPlot } from './charts.jsx';
import { fitOLS } from '../utils/vizHelpers.js';

function histBins(values, nBins = 20) {
  const min = Math.min(...values), max = Math.max(...values);
  if (min === max) return [{ x: min, count: values.length }];
  const w = (max - min) / nBins;
  const bins = Array.from({ length: nBins }, (_, i) => ({ x: +(min + i * w).toFixed(2), count: 0 }));
  for (const v of values) {
    const i = Math.min(Math.floor((v - min) / w), nBins - 1);
    bins[i].count++;
  }
  return bins;
}

function pearsonR(xs, ys) {
  const n = xs.length;
  if (!n) return 0;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  const num = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
  const den = Math.sqrt(xs.reduce((s, x) => s + (x - mx) ** 2, 0) * ys.reduce((s, y) => s + (y - my) ** 2, 0));
  return den === 0 ? 0 : num / den;
}

function groupStats(data, xVar, yVar) {
  const groups = [...new Set(data.map(r => r[xVar]))];
  return groups.map(g => {
    const vals = data.filter(r => r[xVar] === g).map(r => r[yVar]).filter(v => typeof v === 'number');
    const n = vals.length;
    const mean = vals.reduce((a, b) => a + b, 0) / n;
    const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(n - 1, 1);
    const se = Math.sqrt(variance / n);
    return { name: g, mean, se, ci95: se * 1.96 };
  });
}

function covMatrix(data, vars) {
  const n = data.length;
  const means = vars.map(v => data.reduce((s, r) => s + (r[v] ?? 0), 0) / n);
  return vars.map((v1, i) => vars.map((v2, j) =>
    data.reduce((s, r) => s + ((r[v1] ?? 0) - means[i]) * ((r[v2] ?? 0) - means[j]), 0) / (n - 1)
  ));
}

function powerIterationPC1(cov, iters = 50) {
  const n = cov.length;
  let v = Array.from({ length: n }, () => Math.random() - 0.5);
  for (let it = 0; it < iters; it++) {
    const mv = cov.map(row => row.reduce((s, c, j) => s + c * v[j], 0));
    const norm = Math.sqrt(mv.reduce((s, x) => s + x * x, 0));
    v = mv.map(x => x / (norm || 1));
  }
  return v;
}

function euclidean(a, b, vars) {
  return Math.sqrt(vars.reduce((s, v) => s + ((a[v] ?? 0) - (b[v] ?? 0)) ** 2, 0));
}

// ── Distribution charts ───────────────────────────────────────────────────────

export function ExViolin({ data, xVar, groupVar, width = 400, height = 240, color = '#c4ff00' }) {
  const groups = groupVar ? [...new Set(data.map(r => r[groupVar]))] : ['all'];
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
      {groups.map(g => {
        const vals = (groupVar ? data.filter(r => r[groupVar] === g) : data).map(r => r[xVar]).filter(v => typeof v === 'number');
        return (
          <div key={g} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: '#555', marginBottom: 2 }}>{g}</div>
            <ViolinPlot data={vals} width={Math.min(100, width / groups.length)} height={height} color={color} />
          </div>
        );
      })}
    </div>
  );
}

export function ExBox({ data, xVar, groupVar, width = 400, height = 120 }) {
  const groups = groupVar ? [...new Set(data.map(r => r[groupVar]))] : ['all'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {groups.map(g => {
        const vals = (groupVar ? data.filter(r => r[groupVar] === g) : data).map(r => r[xVar]).filter(v => typeof v === 'number');
        return (
          <div key={g} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 9, color: '#555', width: 60, textAlign: 'right' }}>{g}</span>
            <BoxPlot data={vals} width={width - 80} height={40} />
          </div>
        );
      })}
    </div>
  );
}

export function ExHistogram({ data, xVar, groupVar, width = 400, height = 240 }) {
  const vals = data.map(r => r[xVar]).filter(v => typeof v === 'number');
  const bins = histBins(vals);
  return (
    <ResponsiveContainer width={width} height={height}>
      <ComposedChart data={bins} margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
        <XAxis dataKey="x" tick={{ fill: '#555', fontSize: 9 }} />
        <YAxis tick={{ fill: '#555', fontSize: 9 }} />
        <Bar dataKey="count" fill="#c4ff00" fillOpacity={0.3} stroke="#c4ff00" strokeWidth={0.5} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function ExRainCloud({ data, xVar, groupVar, width = 400, height = 200 }) {
  const vals = data.map(r => r[xVar]).filter(v => typeof v === 'number');
  const jittered = vals.map(v => ({ x: v, y: (Math.random() - 0.5) * 0.4 }));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <ViolinPlot data={vals} width={width} height={height * 0.6} />
      <ResponsiveContainer width={width} height={height * 0.35}>
        <ScatterChart margin={{ top: 0, right: 10, bottom: 10, left: 10 }}>
          <XAxis dataKey="x" type="number" domain={['auto', 'auto']} tick={{ fill: '#555', fontSize: 9 }} />
          <YAxis dataKey="y" type="number" domain={[-1, 1]} hide />
          <Scatter data={jittered} fill="#c4ff00" fillOpacity={0.5} r={2} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ExECDF({ data, xVar, width = 400, height = 240 }) {
  const vals = [...data.map(r => r[xVar]).filter(v => typeof v === 'number')].sort((a, b) => a - b);
  const ecdfData = vals.map((v, i) => ({ x: v, p: (i + 1) / vals.length }));
  return (
    <ResponsiveContainer width={width} height={height}>
      <LineChart data={ecdfData} margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
        <XAxis dataKey="x" tick={{ fill: '#555', fontSize: 9 }} />
        <YAxis tick={{ fill: '#555', fontSize: 9 }} domain={[0, 1]} />
        <Line dataKey="p" dot={false} stroke="#c4ff00" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Relationship charts ───────────────────────────────────────────────────────

export function ExScatterFit({ data, xVar, yVar, groupVar, width = 400, height = 280 }) {
  const points = data.map(r => ({ x: r[xVar], y: r[yVar], g: r[groupVar] })).filter(p => typeof p.x === 'number' && typeof p.y === 'number');
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const fit = fitOLS(xs, ys);
  return (
    <ResponsiveContainer width={width} height={height}>
      <ComposedChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
        <XAxis dataKey="x" type="number" name={xVar} tick={{ fill: '#555', fontSize: 9 }} />
        <YAxis dataKey="y" type="number" name={yVar} tick={{ fill: '#555', fontSize: 9 }} />
        <Scatter data={points} fill="#c4ff00" fillOpacity={0.6} r={3} />
        {fit && <Line data={fit.line} dataKey="y" stroke="#4daaff" strokeWidth={2} dot={false} name={`r=${fit.r.toFixed(3)}`} />}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function ExCorrelogram({ data, vars, width = 320, height = 320, onCellClick }) {
  const matrix = vars.map(v1 => vars.map(v2 => {
    if (v1 === v2) return 1;
    const pairs = data.filter(r => typeof r[v1] === 'number' && typeof r[v2] === 'number');
    return pearsonR(pairs.map(r => r[v1]), pairs.map(r => r[v2]));
  }));
  return <HeatmapCorr matrix={matrix} labels={vars} width={width} height={height} onCellClick={onCellClick} />;
}

export function ExBubble({ data, xVar, yVar, sizeVar, groupVar, width = 400, height = 280 }) {
  const points = data.map(r => ({ x: r[xVar], y: r[yVar], z: r[sizeVar] ?? 1, g: r[groupVar] }))
    .filter(p => typeof p.x === 'number' && typeof p.y === 'number');
  const maxZ = Math.max(...points.map(p => p.z), 1);
  return (
    <ResponsiveContainer width={width} height={height}>
      <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
        <XAxis dataKey="x" type="number" tick={{ fill: '#555', fontSize: 9 }} />
        <YAxis dataKey="y" type="number" tick={{ fill: '#555', fontSize: 9 }} />
        <Scatter data={points.map(p => ({ ...p, r: 4 + (p.z / maxZ) * 20 }))} fill="#c4ff00" fillOpacity={0.5} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

export function ExScatterMatrix({ data, vars, width = 480, height = 480 }) {
  const n = vars.length;
  const cellW = (width - 40) / n;
  const cellH = (height - 40) / n;
  return (
    <svg width={width} height={height}>
      {vars.map((v, i) => (
        <text key={`yl${i}`} x={18} y={40 + i * cellH + cellH / 2 + 4} textAnchor="middle" fontSize={8} fill="#555" transform={`rotate(-90, 18, ${40 + i * cellH + cellH / 2})`}>{v}</text>
      ))}
      {vars.map((v, j) => (
        <text key={`xl${j}`} x={40 + j * cellW + cellW / 2} y={14} textAnchor="middle" fontSize={8} fill="#555">{v}</text>
      ))}
      {vars.map((yv, i) => vars.map((xv, j) => {
        const pts = data.map(r => ({ x: r[xv], y: r[yv] })).filter(p => typeof p.x === 'number' && typeof p.y === 'number');
        const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
        const minX = Math.min(...xs), maxX = Math.max(...xs);
        const minY = Math.min(...ys), maxY = Math.max(...ys);
        const px = x => 40 + j * cellW + ((x - minX) / (maxX - minX || 1)) * (cellW - 4);
        const py = y => 40 + i * cellH + (1 - (y - minY) / (maxY - minY || 1)) * (cellH - 4);
        return (
          <g key={`${i}-${j}`}>
            <rect x={40 + j * cellW} y={40 + i * cellH} width={cellW - 2} height={cellH - 2} fill="#111" stroke="#1e1e1e" />
            {i === j
              ? <text x={40 + j * cellW + cellW / 2} y={40 + i * cellH + cellH / 2 + 4} textAnchor="middle" fontSize={9} fill="#c4ff00">{xv}</text>
              : pts.slice(0, 200).map((p, k) => <circle key={k} cx={px(p.x)} cy={py(p.y)} r={1.5} fill="#c4ff00" fillOpacity={0.5} />)
            }
          </g>
        );
      }))}
    </svg>
  );
}

// ── Comparison charts ─────────────────────────────────────────────────────────

export function ExBarCI({ data, xVar, yVar, width = 400, height = 280 }) {
  const stats = groupStats(data, xVar, yVar);
  return (
    <ResponsiveContainer width={width} height={height}>
      <BarChart data={stats} margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
        <XAxis dataKey="name" tick={{ fill: '#555', fontSize: 9 }} />
        <YAxis tick={{ fill: '#555', fontSize: 9 }} />
        <Bar dataKey="mean" fill="#c4ff00" fillOpacity={0.5}>
          <ErrorBar dataKey="ci95" width={4} strokeWidth={1.5} stroke="#c4ff00" />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ExDotCI({ data, xVar, yVar, width = 400, height = 280 }) {
  const stats = groupStats(data, xVar, yVar);
  const grand = stats.reduce((s, g) => s + g.mean, 0) / stats.length;
  return (
    <ResponsiveContainer width={width} height={height}>
      <LineChart data={stats} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
        <XAxis dataKey="name" tick={{ fill: '#555', fontSize: 9 }} />
        <YAxis tick={{ fill: '#555', fontSize: 9 }} />
        <ReferenceLine y={grand} stroke="#333" strokeDasharray="3 3" />
        <Line dataKey="mean" stroke="#c4ff00" strokeWidth={0} dot={{ r: 6, fill: '#c4ff00' }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ExLollipop({ data, xVar, yVar, width = 400, height = 280 }) {
  const stats = groupStats(data, xVar, yVar);
  const maxMean = Math.max(...stats.map(s => s.mean));
  const minMean = Math.min(...stats.map(s => s.mean));
  const range = maxMean - minMean || 1;
  const pad = { t: 20, b: 30, l: 60, r: 10 };
  const h = height - pad.t - pad.b;
  const w = width - pad.l - pad.r;
  const barH = Math.min(24, h / stats.length - 4);
  return (
    <svg width={width} height={height}>
      {stats.map(({ name, mean }, i) => {
        const y = pad.t + i * (h / stats.length) + (h / stats.length - barH) / 2 + barH / 2;
        const x1 = pad.l;
        const x2 = pad.l + ((mean - minMean) / range) * w;
        return (
          <g key={name}>
            <text x={pad.l - 4} y={y + 4} textAnchor="end" fontSize={9} fill="#555">{name}</text>
            <line x1={x1} y1={y} x2={x2} y2={y} stroke="#c4ff00" strokeWidth={1.5} />
            <circle cx={x2} cy={y} r={5} fill="#c4ff00" fillOpacity={0.8} />
            <text x={x2 + 8} y={y + 4} fontSize={8} fill="#888">{mean.toFixed(1)}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function ExStripPlot({ data, xVar, yVar, width = 400, height = 280 }) {
  const groups = [...new Set(data.map(r => r[xVar]))];
  const allVals = data.map(r => r[yVar]).filter(v => typeof v === 'number');
  const minV = Math.min(...allVals), maxV = Math.max(...allVals);
  const range = maxV - minV || 1;
  const pad = { t: 20, b: 30, l: 60, r: 10 };
  const h = height - pad.t - pad.b;
  const w = width - pad.l - pad.r;
  const groupH = h / groups.length;
  const scaleX = v => pad.l + ((v - minV) / range) * w;
  return (
    <svg width={width} height={height}>
      {groups.map((g, i) => {
        const vals = data.filter(r => r[xVar] === g).map(r => r[yVar]).filter(v => typeof v === 'number');
        const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
        const cy = pad.t + i * groupH + groupH / 2;
        return (
          <g key={g}>
            <text x={pad.l - 4} y={cy + 4} textAnchor="end" fontSize={9} fill="#555">{g}</text>
            {vals.slice(0, 200).map((v, j) => (
              <circle key={j} cx={scaleX(v)} cy={cy + (Math.random() - 0.5) * (groupH * 0.6)} r={2} fill="#c4ff00" fillOpacity={0.4} />
            ))}
            <line x1={scaleX(mean) - 6} y1={cy} x2={scaleX(mean) + 6} y2={cy} stroke="#ff4d6d" strokeWidth={2} />
          </g>
        );
      })}
    </svg>
  );
}

// ── Interaction charts ────────────────────────────────────────────────────────

export function ExInteractionPlot({ data, xVar, yVar, modVar, width = 400, height = 280 }) {
  const modVals = [...new Set(data.map(r => r[modVar]))].slice(0, 4);
  const xVals = [...new Set(data.map(r => r[xVar]))].sort();
  const lineData = xVals.map(x => {
    const row = { x };
    for (const m of modVals) {
      const pts = data.filter(r => r[xVar] === x && r[modVar] === m).map(r => r[yVar]).filter(v => typeof v === 'number');
      row[m] = pts.length ? pts.reduce((a, b) => a + b, 0) / pts.length : undefined;
    }
    return row;
  });
  const colors = ['#c4ff00', '#4daaff', '#ff4d6d', '#ff9f40'];
  return (
    <ResponsiveContainer width={width} height={height}>
      <LineChart data={lineData} margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
        <XAxis dataKey="x" tick={{ fill: '#555', fontSize: 9 }} />
        <YAxis tick={{ fill: '#555', fontSize: 9 }} />
        {modVals.map((m, i) => (
          <Line key={m} dataKey={m} stroke={colors[i]} strokeWidth={2} dot={{ r: 3 }} connectNulls />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ExSimpleSlopes({ data, xVar, yVar, modVar, width = 400, height = 280 }) {
  const vals = data.map(r => r[modVar]).filter(v => typeof v === 'number');
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const sd = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length);
  const levels = [
    { label: '-1 SD', filter: r => r[modVar] <= mean - sd * 0.5 },
    { label: 'Mean', filter: r => Math.abs(r[modVar] - mean) <= sd * 0.5 },
    { label: '+1 SD', filter: r => r[modVar] >= mean + sd * 0.5 },
  ];
  const xNums = data.map(r => r[xVar]).filter(v => typeof v === 'number');
  const xMin = Math.min(...xNums), xMax = Math.max(...xNums);
  const colors = ['#4daaff', '#c4ff00', '#ff4d6d'];
  const lineData = [xMin, xMax].map(x => {
    const row = { x };
    for (const { label, filter } of levels) {
      const pts = data.filter(filter).map(r => r[yVar]).filter(v => typeof v === 'number');
      row[label] = pts.length ? pts.reduce((a, b) => a + b, 0) / pts.length : undefined;
    }
    return row;
  });
  return (
    <ResponsiveContainer width={width} height={height}>
      <LineChart data={lineData} margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
        <XAxis dataKey="x" type="number" tick={{ fill: '#555', fontSize: 9 }} />
        <YAxis tick={{ fill: '#555', fontSize: 9 }} />
        {levels.map(({ label }, i) => (
          <Line key={label} dataKey={label} stroke={colors[i]} strokeWidth={2} dot={false} connectNulls />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ExSpotlight({ data, xVar, yVar, modVar, width = 400, height = 280 }) {
  const modVals = data.map(r => r[modVar]).filter(v => typeof v === 'number').sort((a, b) => a - b);
  const q = (p) => modVals[Math.floor(p * modVals.length)];
  const quintile = (v) => {
    if (v < q(0.2)) return 0;
    if (v < q(0.4)) return 1;
    if (v < q(0.6)) return 2;
    if (v < q(0.8)) return 3;
    return 4;
  };
  const colors = ['#4daaff', '#7dccff', '#c4ff00', '#ffcc00', '#ff4d6d'];
  const points = data.map(r => ({ x: r[xVar], y: r[yVar], q: typeof r[modVar] === 'number' ? quintile(r[modVar]) : 2 }))
    .filter(p => typeof p.x === 'number' && typeof p.y === 'number');
  const allX = points.map(p => p.x), allY = points.map(p => p.y);
  const [minX, maxX, minY, maxY] = [Math.min(...allX), Math.max(...allX), Math.min(...allY), Math.max(...allY)];
  const pad = { t: 10, r: 10, b: 24, l: 30 };
  const w = width - pad.l - pad.r, h = height - pad.t - pad.b;
  const px = x => pad.l + ((x - minX) / (maxX - minX || 1)) * w;
  const py = y => pad.t + (1 - (y - minY) / (maxY - minY || 1)) * h;
  return (
    <svg width={width} height={height}>
      {points.slice(0, 500).map((p, i) => (
        <circle key={i} cx={px(p.x)} cy={py(p.y)} r={3} fill={colors[p.q]} fillOpacity={0.6} />
      ))}
    </svg>
  );
}

// ── Categorical charts ────────────────────────────────────────────────────────

export function ExMosaic({ data, xVar, yVar, width = 400, height = 280 }) {
  return <MosaicPlot data={data} xVar={xVar} yVar={yVar} width={width} height={height} />;
}

export function ExStackedBar100({ data, xVar, yVar, width = 400, height = 280 }) {
  const xVals = [...new Set(data.map(r => r[xVar]))];
  const yVals = [...new Set(data.map(r => r[yVar]))];
  const colors = ['#c4ff00', '#4daaff', '#ff4d6d', '#ff9f40', '#9f7fff'];
  const barData = xVals.map(x => {
    const rows = data.filter(r => r[xVar] === x);
    const total = rows.length;
    const row = { name: x };
    for (const y of yVals) {
      row[y] = rows.filter(r => r[yVar] === y).length / total * 100;
    }
    return row;
  });
  return (
    <ResponsiveContainer width={width} height={height}>
      <BarChart data={barData} margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
        <XAxis dataKey="name" tick={{ fill: '#555', fontSize: 9 }} />
        <YAxis tick={{ fill: '#555', fontSize: 9 }} unit="%" />
        {yVals.map((y, i) => (
          <Bar key={y} dataKey={y} stackId="a" fill={colors[i % colors.length]} fillOpacity={0.8} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ExDivergingLikert({ data, itemVar, responseVar, neutralValue, width = 480, height = 320 }) {
  const items = [...new Set(data.map(r => r[itemVar]))];
  const responses = [...new Set(data.map(r => r[responseVar]))].sort();
  const mid = neutralValue ?? responses[Math.floor(responses.length / 2)];
  const negResponses = responses.filter(r => r < mid);
  const posResponses = responses.filter(r => r > mid);
  const colors = { neg: '#ff4d6d', neu: '#333', pos: '#4daaff' };
  const pad = { t: 10, b: 20, l: 120, r: 10 };
  const h = height - pad.t - pad.b;
  const w = width - pad.l - pad.r;
  const barH = Math.min(20, h / items.length - 4);
  return (
    <svg width={width} height={height}>
      {items.map((item, i) => {
        const rows = data.filter(r => r[itemVar] === item);
        const total = rows.length;
        const negPct = negResponses.reduce((s, r) => s + rows.filter(row => row[responseVar] === r).length, 0) / total;
        const neuPct = rows.filter(row => row[responseVar] === mid).length / total;
        const posPct = posResponses.reduce((s, r) => s + rows.filter(row => row[responseVar] === r).length, 0) / total;
        const cy = pad.t + i * (h / items.length) + (h / items.length) / 2;
        const cx = pad.l + w / 2;
        return (
          <g key={item}>
            <text x={pad.l - 4} y={cy + 4} textAnchor="end" fontSize={9} fill="#555">{item}</text>
            <rect x={cx - negPct * w / 2 - neuPct * w / 4 - posPct * w / 2} y={cy - barH / 2}
              width={negPct * w / 2} height={barH} fill={colors.neg} fillOpacity={0.7} />
            <rect x={cx - neuPct * w / 4} y={cy - barH / 2}
              width={neuPct * w / 2} height={barH} fill={colors.neu} fillOpacity={0.7} />
            <rect x={cx + neuPct * w / 4} y={cy - barH / 2}
              width={posPct * w / 2} height={barH} fill={colors.pos} fillOpacity={0.7} />
          </g>
        );
      })}
      <line x1={pad.l + w / 2} y1={pad.t} x2={pad.l + w / 2} y2={height - pad.b} stroke="#444" strokeWidth={1} strokeDasharray="3 3" />
    </svg>
  );
}

// ── Multivariate charts ───────────────────────────────────────────────────────

export function ExPCABiplot({ data, vars, groupVar, width = 400, height = 320 }) {
  if (!vars?.length || !data?.length) return <span style={{ color: '#333', fontSize: 10 }}>Select ≥2 numeric variables</span>;
  const numData = data.filter(r => vars.every(v => typeof r[v] === 'number'));
  if (numData.length < 4) return <span style={{ color: '#333', fontSize: 10 }}>Insufficient numeric data</span>;
  const cov = covMatrix(numData, vars);
  const pc1 = powerIterationPC1(cov);
  const cov2 = cov.map((row, i) => row.map((c, j) => c - pc1[i] * pc1[j] * cov.reduce((s, r, k) => s + r[k], 0)));
  const pc2 = powerIterationPC1(cov2);
  const means = vars.map(v => numData.reduce((s, r) => s + r[v], 0) / numData.length);
  const stds = vars.map((v, i) => Math.sqrt(numData.reduce((s, r) => s + (r[v] - means[i]) ** 2, 0) / numData.length) || 1);
  const scores = numData.map(r => {
    const z = vars.map((v, i) => (r[v] - means[i]) / stds[i]);
    return { pc1: z.reduce((s, x, i) => s + x * pc1[i], 0), pc2: z.reduce((s, x, i) => s + x * pc2[i], 0), g: r[groupVar] };
  });
  const allPc1 = scores.map(s => s.pc1), allPc2 = scores.map(s => s.pc2);
  const [minPc1, maxPc1, minPc2, maxPc2] = [Math.min(...allPc1), Math.max(...allPc1), Math.min(...allPc2), Math.max(...allPc2)];
  const pad = { t: 10, r: 10, b: 24, l: 30 };
  const w = width - pad.l - pad.r, h = height - pad.t - pad.b;
  const px = x => pad.l + ((x - minPc1) / (maxPc1 - minPc1 || 1)) * w;
  const py = y => pad.t + (1 - (y - minPc2) / (maxPc2 - minPc2 || 1)) * h;
  const cx = px(0), cy = py(0);
  const scale = Math.min(w, h) * 0.35;
  return (
    <svg width={width} height={height}>
      {scores.slice(0, 300).map((s, i) => (
        <circle key={i} cx={px(s.pc1)} cy={py(s.pc2)} r={2.5} fill="#c4ff00" fillOpacity={0.5} />
      ))}
      {vars.map((v, i) => (
        <g key={v}>
          <line x1={cx} y1={cy} x2={cx + pc1[i] * scale} y2={cy - pc2[i] * scale} stroke="#ff4d6d" strokeWidth={1.5} />
          <text x={cx + pc1[i] * scale * 1.15} y={cy - pc2[i] * scale * 1.15 + 4} fontSize={9} fill="#ff4d6d" textAnchor="middle">{v}</text>
        </g>
      ))}
      <line x1={pad.l} y1={cy} x2={width - pad.r} y2={cy} stroke="#222" strokeWidth={0.5} />
      <line x1={cx} y1={pad.t} x2={cx} y2={height - pad.b} stroke="#222" strokeWidth={0.5} />
    </svg>
  );
}

export function ExLoadingHeatmap({ data, vars, width = 360, height = 280 }) {
  if (!vars?.length || !data?.length) return <span style={{ color: '#333', fontSize: 10 }}>Select ≥2 numeric variables</span>;
  const numData = data.filter(r => vars.every(v => typeof r[v] === 'number'));
  if (numData.length < 4) return <span style={{ color: '#333', fontSize: 10 }}>Insufficient numeric data</span>;
  const cov = covMatrix(numData, vars);
  const pc1 = powerIterationPC1(cov);
  const cov2 = cov.map((row, i) => row.map((c, j) => c - pc1[i] * pc1[j] * cov.reduce((s, r, k) => s + r[k], 0)));
  const pc2 = powerIterationPC1(cov2);
  const loadings = [pc1, pc2];
  return <HeatmapCorr matrix={loadings} labels={['PC1', 'PC2']} rowLabels={vars} width={width} height={height} />;
}

export function ExDendrogram({ data, vars, width = 400, height = 320 }) {
  if (!vars?.length || !data?.length) return <span style={{ color: '#333', fontSize: 10 }}>Select ≥2 numeric variables</span>;
  const sample = data.filter(r => vars.every(v => typeof r[v] === 'number')).slice(0, 30);
  if (sample.length < 3) return <span style={{ color: '#333', fontSize: 10 }}>Need ≥3 rows</span>;
  let clusters = sample.map((r, i) => ({ id: i, members: [i], height: 0 }));
  const links = [];
  while (clusters.length > 1) {
    let minD = Infinity, mergeA = 0, mergeB = 1;
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const d = Math.min(...clusters[i].members.flatMap(a => clusters[j].members.map(b => euclidean(sample[a], sample[b], vars))));
        if (d < minD) { minD = d; mergeA = i; mergeB = j; }
      }
    }
    links.push({ a: clusters[mergeA], b: clusters[mergeB], height: minD });
    const merged = { id: clusters.length, members: [...clusters[mergeA].members, ...clusters[mergeB].members], height: minD };
    clusters = clusters.filter((_, i) => i !== mergeA && i !== mergeB);
    clusters.push(merged);
  }
  const maxH = links[links.length - 1]?.height || 1;
  const pad = { t: 10, b: 10, l: 10, r: 10 };
  const w = width - pad.l - pad.r;
  const leafX = {};
  sample.forEach((_, i) => { leafX[i] = pad.l + ((i + 0.5) / sample.length) * w; });
  const clusterCx = {};
  links.forEach(({ a, b }) => {
    const ax = a.members.reduce((s, m) => s + (leafX[m] ?? clusterCx[m] ?? 0), 0) / a.members.length;
    const bx = b.members.reduce((s, m) => s + (leafX[m] ?? clusterCx[m] ?? 0), 0) / b.members.length;
    clusterCx[a.id] = ax; clusterCx[b.id] = bx;
  });
  const scaleY = lh => pad.t + (1 - lh / maxH) * (height - pad.t - pad.b);
  return (
    <svg width={width} height={height}>
      {sample.map((_, i) => (
        <line key={i} x1={leafX[i]} y1={height - pad.b} x2={leafX[i]} y2={height - pad.b - 4} stroke="#333" strokeWidth={1} />
      ))}
      {links.map(({ a, b, height: lh }, i) => {
        const ax = a.members.reduce((s, m) => s + (leafX[m] ?? clusterCx[m] ?? 0), 0) / a.members.length;
        const bx = b.members.reduce((s, m) => s + (leafX[m] ?? clusterCx[m] ?? 0), 0) / b.members.length;
        const y = scaleY(lh);
        return (
          <g key={i}>
            <line x1={ax} y1={y} x2={bx} y2={y} stroke="#c4ff00" strokeWidth={1.5} />
            <line x1={ax} y1={y} x2={ax} y2={scaleY(a.height)} stroke="#c4ff00" strokeWidth={1} />
            <line x1={bx} y1={y} x2={bx} y2={scaleY(b.height)} stroke="#c4ff00" strokeWidth={1} />
          </g>
        );
      })}
    </svg>
  );
}

export function ExSilhouette({ data, vars, k = 3, width = 400, height = 280 }) {
  if (!vars?.length || !data?.length) return <span style={{ color: '#333', fontSize: 10 }}>Select ≥2 numeric variables</span>;
  const numData = data.filter(r => vars.every(v => typeof r[v] === 'number')).slice(0, 100);
  if (numData.length < k + 1) return <span style={{ color: '#333', fontSize: 10 }}>Need ≥{k + 1} rows</span>;
  let centroids = numData.slice(0, k).map(r => vars.reduce((o, v) => ({ ...o, [v]: r[v] }), {}));
  let assignments = new Array(numData.length).fill(0);
  for (let iter = 0; iter < 10; iter++) {
    assignments = numData.map(r => {
      let minD = Infinity, best = 0;
      centroids.forEach((c, ci) => { const d = euclidean(r, c, vars); if (d < minD) { minD = d; best = ci; } });
      return best;
    });
    centroids = Array.from({ length: k }, (_, ci) => {
      const members = numData.filter((_, i) => assignments[i] === ci);
      if (!members.length) return centroids[ci];
      return vars.reduce((o, v) => ({ ...o, [v]: members.reduce((s, r) => s + r[v], 0) / members.length }), {});
    });
  }
  const scores = numData.map((r, i) => {
    const ci = assignments[i];
    const intra = numData.filter((_, j) => assignments[j] === ci && j !== i);
    const a = intra.length ? intra.reduce((s, n) => s + euclidean(r, n, vars), 0) / intra.length : 0;
    const b = Math.min(...Array.from({ length: k }, (_, c) => {
      if (c === ci) return Infinity;
      const others = numData.filter((_, j) => assignments[j] === c);
      return others.length ? others.reduce((s, n) => s + euclidean(r, n, vars), 0) / others.length : Infinity;
    }));
    return { score: (b - a) / Math.max(a, b), cluster: ci };
  });
  const sorted = [...scores].sort((a, b) => a.cluster - b.cluster || b.score - a.score);
  const colors = ['#c4ff00', '#4daaff', '#ff4d6d', '#ff9f40', '#9f7fff'];
  const pad = { t: 10, b: 20, l: 10, r: 40 };
  const w = width - pad.l - pad.r, h = height - pad.t - pad.b;
  const barH = h / sorted.length;
  return (
    <svg width={width} height={height}>
      {sorted.map(({ score, cluster }, i) => (
        <rect key={i}
          x={score >= 0 ? pad.l + w / 2 : pad.l + w / 2 + score * w / 2}
          y={pad.t + i * barH}
          width={Math.abs(score) * w / 2}
          height={Math.max(barH - 0.5, 1)}
          fill={colors[cluster % colors.length]}
          fillOpacity={0.7}
        />
      ))}
      <line x1={pad.l + w / 2} y1={pad.t} x2={pad.l + w / 2} y2={height - pad.b} stroke="#444" strokeWidth={1} />
      <text x={pad.l + w / 2} y={height - 4} textAnchor="middle" fontSize={8} fill="#555">Silhouette score →</text>
    </svg>
  );
}
