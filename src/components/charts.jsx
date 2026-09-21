import { C, PAL } from '../palette.js';
import { tPDF, tInv2, normalINV, normalCDF } from '@statlab/core/math/distributions';
import { avg, sampleSD } from '@statlab/core/math/core';
import {
  ComposedChart, Scatter, Line as RLine, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell, LineChart, Line,
  ReferenceLine, ErrorBar,
} from 'recharts';
import { CTip } from './ui.jsx';
import { fitOLS } from '../utils/vizHelpers.js';

const mono = { fontFamily: "'IBM Plex Mono', monospace" };

// ── t-distribution visualizer ─────────────────────────────────────────────────
export function TDistViz({ t, df, alpha = .05, t2 = null }) {
  if (!t || !df || isNaN(t) || isNaN(df)) return null;
  const W = 360, H = 90, PL = 6, PR = 6, PT = 6, PB = 20;
  const cW = W - PL - PR, cH = H - PT - PB;
  const rng = Math.max(4, Math.max(Math.abs(t), t2 ? Math.abs(t2) : 0) + 1.5);
  const xs = Array.from({ length: 120 }, (_, i) => -rng + 2 * rng * i / 119);
  const ys = xs.map(x => tPDF(x, df)), maxY = Math.max(...ys);
  const tc = tInv2(alpha, df);
  const sx = x => PL + (x + rng) / (2 * rng) * cW;
  const sy = y => PT + cH - (y / maxY) * cH;
  const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${sx(x).toFixed(1)},${sy(ys[i]).toFixed(1)}`).join(' ');
  const tail = pts => pts.length < 2 ? '' :
    pts.map((x, i) => `${i === 0 ? 'M' : 'L'}${sx(x).toFixed(1)},${sy(tPDF(x, df)).toFixed(1)}`).join(' ') +
    ` L${sx(pts.at(-1)).toFixed(1)},${sy(0).toFixed(1)} L${sx(pts[0]).toFixed(1)},${sy(0).toFixed(1)} Z`;
  const lPts = xs.filter(x => x <= -tc), rPts = xs.filter(x => x >= tc);
  const inTail = Math.abs(t) > tc;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={mono}>
      <path d={tail(lPts)} fill={C.neg} fillOpacity={.3} />
      <path d={tail(rPts)} fill={C.neg} fillOpacity={.3} />
      <path d={path} stroke={C.pos} strokeWidth={1.5} fill="none" />
      <line x1={sx(t)} x2={sx(t)} y1={PT} y2={PT + cH} stroke={inTail ? C.ok : C.warn} strokeWidth={2} strokeDasharray="4,2" />
      {t2 && <line x1={sx(t2)} x2={sx(t2)} y1={PT} y2={PT + cH} stroke={C.purple} strokeWidth={2} strokeDasharray="4,2" />}
      <line x1={sx(tc)} x2={sx(tc)} y1={PT} y2={PT + cH} stroke={C.neg} strokeWidth={1} strokeDasharray="2,2" />
      <line x1={sx(-tc)} x2={sx(-tc)} y1={PT} y2={PT + cH} stroke={C.neg} strokeWidth={1} strokeDasharray="2,2" />
      <text x={sx(t)} y={H - 2} textAnchor="middle" fontSize={8} fill={inTail ? C.ok : C.warn}>t={t.toFixed(2)}</text>
      {t2 && <text x={sx(t2)} y={H - 2} textAnchor="middle" fontSize={8} fill={C.purple}>t₂={t2.toFixed(2)}</text>}
      <text x={W - PR - 2} y={PT + 10} textAnchor="end" fontSize={8} fill={inTail ? C.ok : C.neg}>{inTail ? '✓ REJECT H₀' : '✗ RETAIN H₀'}</text>
      <text x={PL + 2} y={PT + 10} fontSize={7} fill={C.dim}>df={Math.round(df)}</text>
    </svg>
  );
}

// ── Q-Q plot ──────────────────────────────────────────────────────────────────
export function QQPlot({ vals, label, height = 110 }) {
  if (!vals || vals.length < 4) return null;
  const s = [...vals].sort((a, b) => a - b), n = s.length;
  const m = avg(vals), sd_ = sampleSD(vals);
  const pts = s.map((v, i) => ({ th: +normalINV((i + .5) / n).toFixed(4), sa: v }));
  const xv = pts.map(p => p.th);
  const ref = [
    { th: Math.min(...xv), sa: m + sd_ * Math.min(...xv) },
    { th: Math.max(...xv), sa: m + sd_ * Math.max(...xv) },
  ];
  const axTick = { fontSize: 7, fill: C.dim, ...mono };
  return (
    <div style={{ height }}>
      <div style={{ fontSize: 8, color: C.dim, ...mono, marginBottom: 1 }}>Q-Q: {label}</div>
      <ResponsiveContainer width="100%" height="90%">
        <ComposedChart margin={{ top: 2, right: 6, bottom: 14, left: 6 }}>
          <CartesianGrid stroke={C.border} strokeOpacity={.35} />
          <XAxis dataKey="th" type="number" tick={axTick} stroke={C.border} label={{ value: "theoretical", position: "insideBottom", offset: -6, fill: C.dim, fontSize: 7 }} />
          <YAxis dataKey="sa" type="number" tick={axTick} stroke={C.border} />
          <Tooltip content={<CTip />} />
          <RLine data={ref} dataKey="sa" stroke={C.neg} strokeWidth={1} dot={false} strokeDasharray="4,2" name="normal ref" />
          <Scatter data={pts} fill={C.accent} opacity={.65} r={2} name="quantile" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Residuals vs Fitted ───────────────────────────────────────────────────────
export function ResidualPlot({ fitted, residuals, height = 100 }) {
  if (!fitted || !residuals) return null;
  const pts = fitted.map((f, i) => ({ fitted: +f.toFixed(4), residual: +residuals[i].toFixed(4) }));
  const axTick = { fontSize: 7, fill: C.dim, ...mono };
  return (
    <div style={{ height }}>
      <div style={{ fontSize: 8, color: C.dim, ...mono, marginBottom: 1 }}>Residuals vs Fitted</div>
      <ResponsiveContainer width="100%" height="90%">
        <ComposedChart margin={{ top: 2, right: 6, bottom: 14, left: 6 }}>
          <CartesianGrid stroke={C.border} strokeOpacity={.35} />
          <XAxis dataKey="fitted" type="number" tick={axTick} stroke={C.border} />
          <YAxis type="number" tick={axTick} stroke={C.border} />
          <Tooltip content={<CTip />} />
          <ReferenceLine y={0} stroke={C.neg} strokeDasharray="3,3" />
          <Scatter data={pts} fill={C.accent} opacity={.6} r={2.5} name="residual" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Power curve ───────────────────────────────────────────────────────────────
import { computePowerT } from '@statlab/core/math/distributions';
export function PowerCurve({ d, alpha = .05, currentN, height = 110 }) {
  const pts = Array.from({ length: 40 }, (_, i) => ({
    n: (i + 1) * 5,
    power: +computePowerT((i + 1) * 5, (i + 1) * 5, Math.abs(d) || .5, alpha).toFixed(4),
  }));
  const axTick = { fontSize: 7, fill: C.dim, ...mono };
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={pts} margin={{ top: 2, right: 8, bottom: 16, left: 8 }}>
          <CartesianGrid stroke={C.border} strokeOpacity={.4} />
          <XAxis dataKey="n" tick={axTick} stroke={C.border} label={{ value: "n/group", position: "insideBottom", offset: -4, fill: C.dim, fontSize: 7 }} />
          <YAxis domain={[0, 1]} tick={axTick} stroke={C.border} />
          <Tooltip content={<CTip />} />
          <ReferenceLine y={.8} stroke={C.warn} strokeDasharray="3,3" />
          {currentN && <ReferenceLine x={currentN} stroke={C.accent} strokeDasharray="3,3" />}
          <Line type="monotone" dataKey="power" stroke={C.accent} strokeWidth={2} dot={false} name="power" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── PCA scree plot ─────────────────────────────────────────────────────────────
export function ScreePlot({ eigenvalues, height = 95 }) {
  const data = eigenvalues.map((e, i) => ({ pc: `PC${i + 1}`, v: +e.toFixed(3) }));
  const axTick = { fontSize: 7, fill: C.dim, ...mono };
  return (
    <div style={{ height }}>
      <div style={{ fontSize: 8, color: C.dim, ...mono, marginBottom: 1 }}>Scree Plot</div>
      <ResponsiveContainer width="100%" height="90%">
        <ComposedChart data={data} margin={{ top: 2, right: 8, bottom: 14, left: 8 }}>
          <CartesianGrid stroke={C.border} strokeOpacity={.35} vertical={false} />
          <XAxis dataKey="pc" tick={axTick} stroke={C.border} />
          <YAxis tick={axTick} stroke={C.border} />
          <Tooltip content={<CTip />} />
          <ReferenceLine y={1} stroke={C.warn} strokeDasharray="3,3" />
          <Bar dataKey="v" fill={C.accent} fillOpacity={.65} radius={[2, 2, 0, 0]} name="λ" />
          <Line type="monotone" dataKey="v" stroke={C.pos} strokeWidth={2} dot={{ r: 3, fill: C.pos }} name="λ (line)" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Forest plot (SVG) ─────────────────────────────────────────────────────────
export function ForestPlot({ items }) {
  if (!items?.length) return null;
  const W = 340, PL = 90, PR = 50, PT = 14, PB = 12;
  const H = Math.max(70, items.length * 26 + 28);
  const cW = W - PL - PR;
  const allV = [...items.flatMap(it => [it.lo, it.hi, 0])];
  const vMin = Math.min(...allV), vMax = Math.max(...allV), vR = vMax - vMin || 1;
  const sx = v => PL + (v - vMin) / vR * cW;
  const nullX = sx(0);
  const sy = i => PT + i * 24 + 12;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={mono}>
      <line x1={nullX} x2={nullX} y1={PT} y2={H - PB} stroke={C.border} strokeWidth={1} strokeDasharray="3,3" />
      <text x={nullX} y={PT - 2} textAnchor="middle" fontSize={7} fill={C.dim}>0</text>
      {items.map((it, i) => {
        const cy = sy(i), s = (it.p || 1) < .05, col = s ? C.ok : C.dim;
        return (
          <g key={i}>
            <text x={PL - 4} y={cy + 3} textAnchor="end" fontSize={8} fill={C.text}>{it.label}</text>
            <line x1={sx(it.lo)} x2={sx(it.hi)} y1={cy} y2={cy} stroke={col} strokeWidth={1.5} />
            <line x1={sx(it.lo)} x2={sx(it.lo)} y1={cy - 3} y2={cy + 3} stroke={col} strokeWidth={1.5} />
            <line x1={sx(it.hi)} x2={sx(it.hi)} y1={cy - 3} y2={cy + 3} stroke={col} strokeWidth={1.5} />
            <circle cx={sx(it.est)} cy={cy} r={it.weight ? Math.max(3, Math.min(7, it.weight * 8)) : 4} fill={col} />
            <text x={W - PR + 2} y={cy + 3} fontSize={7} fill={col}>{it.est?.toFixed(3)}</text>
          </g>
        );
      })}
      <line x1={PL} x2={W - PR} y1={H - PB} y2={H - PB} stroke={C.border} strokeWidth={1} />
    </svg>
  );
}

// ── Mediation path diagram (SVG) ──────────────────────────────────────────────
export function PathDiagram({ r }) {
  if (!r) return null;
  const ps = p => p < .001 ? '***' : p < .01 ? '**' : p < .05 ? '*' : 'ns';
  const col = p => p < .05 ? C.ok : C.dim;
  return (
    <svg width="100%" viewBox="0 0 300 125" style={mono}>
      {/* X node */}
      <rect x={8} y={46} width={56} height={26} rx={3} fill="rgba(196,255,0,.07)" stroke={C.accent} strokeWidth={1.5} />
      <text x={36} y={63} textAnchor="middle" fontSize={10} fill={C.accent} fontWeight={700}>X</text>
      {/* M node */}
      <rect x={118} y={8} width={56} height={26} rx={3} fill="rgba(77,170,255,.1)" stroke={C.pos} strokeWidth={1.5} />
      <text x={146} y={25} textAnchor="middle" fontSize={10} fill={C.pos} fontWeight={700}>M</text>
      {/* Y node */}
      <rect x={228} y={46} width={56} height={26} rx={3} fill="rgba(255,77,109,.1)" stroke={C.neg} strokeWidth={1.5} />
      <text x={256} y={63} textAnchor="middle" fontSize={10} fill={C.neg} fontWeight={700}>Y</text>
      {/* X→M (a path) */}
      <line x1={64} y1={52} x2={118} y2={26} stroke={col(r.a_p)} strokeWidth={1.5} />
      <text x={85} y={34} fontSize={8} fill={col(r.a_p)} textAnchor="middle">a={r.a_path?.toFixed(3)} {ps(r.a_p)}</text>
      {/* M→Y (b path) */}
      <line x1={174} y1={26} x2={228} y2={52} stroke={col(r.b_p)} strokeWidth={1.5} />
      <text x={208} y={34} fontSize={8} fill={col(r.b_p)} textAnchor="middle">b={r.b_path?.toFixed(3)} {ps(r.b_p)}</text>
      {/* X→Y (c' direct) */}
      <line x1={64} y1={59} x2={228} y2={59} stroke={col(r.cp_p)} strokeWidth={1.5} strokeDasharray="5,3" />
      <text x={146} y={75} fontSize={8} fill={col(r.cp_p)} textAnchor="middle">c'={r.cp_direct?.toFixed(3)} {ps(r.cp_p)}</text>
      {/* indirect + totals */}
      <text x={146} y={95} fontSize={8} fill={r.p_sobel < .05 ? C.ok : C.dim} textAnchor="middle">
        indirect a×b={r.ab?.toFixed(4)} {ps(r.p_sobel)}
      </text>
      <text x={146} y={108} fontSize={7} fill={C.dim} textAnchor="middle">
        Sobel z={r.z_sobel?.toFixed(2)} · total c={r.c_total?.toFixed(3)}
      </text>
    </svg>
  );
}

// ── Bootstrap distribution histogram ──────────────────────────────────────────
export function BootstrapHist({ dist, lo, hi, color = PAL[0], height = 70 }) {
  if (!dist?.length) return null;
  const min_ = Math.min(...dist), max_ = Math.max(...dist), w = (max_ - min_) / 28 || 1;
  const bins = Array(28).fill(0);
  dist.forEach(x => { bins[Math.min(Math.floor((x - min_) / w), 27)]++; });
  const data = bins.map((count, i) => ({ label: (min_ + i * w).toFixed(3), count }));
  const axTick = { fontSize: 7, fill: C.dim, ...mono };
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 2, right: 8, bottom: 14, left: 8 }}>
          <CartesianGrid stroke={C.border} strokeOpacity={.35} vertical={false} />
          <XAxis dataKey="label" tick={axTick} stroke={C.border} interval="preserveStartEnd" label={{ value: "bootstrap distribution", position: "insideBottom", offset: -4, fill: C.dim, fontSize: 7 }} />
          <YAxis tick={axTick} stroke={C.border} />
          <Tooltip content={<CTip />} />
          {lo != null && <ReferenceLine x={lo.toFixed(3)} stroke={C.pos} strokeDasharray="3,3" />}
          {hi != null && <ReferenceLine x={hi.toFixed(3)} stroke={C.pos} strokeDasharray="3,3" />}
          <Bar dataKey="count" radius={[1, 1, 0, 0]}>
            {data.map((_, i) => <Cell key={i} fill={color} fillOpacity={.7} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── KDE helpers ───────────────────────────────────────────────────────────────
function stdDev(arr) {
  const m = arr.reduce((a, b) => a + b, 0) / arr.length;
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
}

function kde(values, bandwidth) {
  const n = values.length;
  const h = bandwidth ?? (1.06 * stdDev(values) * Math.pow(n, -0.2));
  return (x) => {
    let sum = 0;
    for (const v of values) {
      const z = (x - v) / h;
      sum += Math.exp(-0.5 * z * z);
    }
    return sum / (n * h * Math.sqrt(2 * Math.PI));
  };
}

function histBins(values, nBins = 20) {
  const min = Math.min(...values), max = Math.max(...values);
  if (min === max) return [{ x: min, count: values.length }];
  const w = (max - min) / nBins;
  const bins = Array.from({ length: nBins }, (_, i) => ({ x: min + i * w, count: 0 }));
  for (const v of values) {
    const i = Math.min(Math.floor((v - min) / w), nBins - 1);
    bins[i].count++;
  }
  return bins;
}

export function ViolinPlot({ data, width = 200, height = 140, color = C.accent }) {
  if (!data?.length) return null;
  const sorted = [...data].sort((a, b) => a - b);
  const min = sorted[0], max = sorted[sorted.length - 1];
  if (min === max) return null;
  const density = kde(sorted);
  const steps = 60;
  const ys = Array.from({ length: steps }, (_, i) => min + (i / (steps - 1)) * (max - min));
  const ds = ys.map(density);
  const maxD = Math.max(...ds);
  const cx = width / 2;
  const pad = 12;
  const scaleY = (v) => pad + ((max - v) / (max - min)) * (height - 2 * pad);
  const scaleX = (d) => (d / maxD) * (cx - 6);
  const rightPoints = ys.map((y, i) => [cx + scaleX(ds[i]), scaleY(y)]);
  const leftPoints = [...rightPoints].reverse().map(([x, y]) => [2 * cx - x, y]);
  const path = [...rightPoints, ...leftPoints].map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ') + ' Z';
  return (
    <svg width={width} height={height}>
      <path d={path} fill={color} fillOpacity={0.15} stroke={color} strokeWidth={1.5} />
    </svg>
  );
}

export function QuickSlopes({ slopes, width = 210, height = 120 }) {
  if (!slopes?.length) return null;
  const pad = { l: 36, r: 8, t: 14, b: 22 };
  const w = width - pad.l - pad.r;
  const h = height - pad.t - pad.b;
  const vals = slopes.map(s => s.slope);
  const minS = Math.min(...vals, 0);
  const maxS = Math.max(...vals, 0);
  const range = maxS - minS || 1;
  const zeroY = pad.t + h - ((0 - minS) / range) * h;
  const barW = Math.min(60, Math.max(24, (w / slopes.length) * 0.5));
  return (
    <svg width={width} height={height}>
      <line x1={pad.l} y1={zeroY} x2={width - pad.r} y2={zeroY} stroke={C.border} strokeDasharray="2,2" />
      {slopes.map((s, i) => {
        const cx = pad.l + (i + 0.5) * (w / slopes.length);
        const barH = Math.abs(s.slope / range) * h * 0.75;
        const y = s.slope >= 0 ? zeroY - barH : zeroY;
        return (
          <g key={s.z}>
            <rect x={cx - barW / 2} y={y} width={barW} height={Math.max(barH, 2)} fill={C.accent} fillOpacity={0.55} rx={2} />
            <text x={cx} y={height - 5} textAnchor="middle" fontSize={8} fill={C.dim} {...mono}>{s.z}</text>
            <text x={cx} y={y - 3} textAnchor="middle" fontSize={8} fill={C.accent} {...mono}>{s.slope.toFixed(3)}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function BoxPlotGrid({ data, groupVar, yVar, width = 210, height = 150 }) {
  if (!data?.length || !groupVar || groupVar === '(none)' || !yVar) return null;
  const groups = [...new Set(data.map(r => r[groupVar]))].slice(0, 4);
  const gw = Math.max(48, Math.floor((width - 8) / groups.length) - 4);
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      {groups.map((g, i) => (
        <div key={g} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 7, color: C.dim, ...mono, marginBottom: 2 }}>{String(g).slice(0, 8)}</div>
          <BoxPlot
            data={data.filter(r => r[groupVar] === g).map(r => +r[yVar]).filter(Number.isFinite)}
            width={gw} height={height - 14}
            color={PAL[i % PAL.length]}
          />
        </div>
      ))}
    </div>
  );
}

export function BoxPlot({ data, width = 200, height = 80, color = C.accent }) {
  if (!data?.length) return null;
  const sorted = [...data].sort((a, b) => a - b);
  const n = sorted.length;
  const q1 = sorted[Math.floor(n * 0.25)];
  const median = sorted[Math.floor(n * 0.5)];
  const q3 = sorted[Math.floor(n * 0.75)];
  const iqr = q3 - q1;
  const lo = Math.max(sorted[0], q1 - 1.5 * iqr);
  const hi = Math.min(sorted[n - 1], q3 + 1.5 * iqr);
  const min = sorted[0], max = sorted[n - 1];
  const pad = 10;
  const cy = height / 2;
  const bh = height * 0.4;
  const scale = (v) => pad + ((v - min) / (max - min || 1)) * (width - 2 * pad);
  return (
    <svg width={width} height={height}>
      <line x1={scale(lo)} y1={cy} x2={scale(hi)} y2={cy} stroke={color} strokeWidth={1} />
      <rect x={scale(q1)} y={cy - bh / 2} width={scale(q3) - scale(q1)} height={bh}
        fill="none" stroke={color} strokeWidth={1.5} />
      <line data-testid="median" x1={scale(median)} y1={cy - bh / 2} x2={scale(median)} y2={cy + bh / 2}
        stroke={color} strokeWidth={2} />
    </svg>
  );
}

export function BarCI({ groups, width = 300, height = 200, color = C.accent }) {
  if (!groups?.length) return null;
  const data = groups.map(g => ({ name: g.name, mean: g.mean, err: (g.se ?? g.ci95 ?? 0) * (g.ci95 != null ? 1 : 1.96) }));
  return (
    <ResponsiveContainer width={width} height={height}>
      <BarChart data={data} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
        <XAxis dataKey="name" tick={{ fill: C.dim, fontSize: 10 }} />
        <YAxis tick={{ fill: C.dim, fontSize: 10 }} />
        <Bar dataKey="mean" fill={color} fillOpacity={0.7}>
          <ErrorBar dataKey="err" width={4} strokeWidth={1.5} stroke={color} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function HistogramDensity({ values, width = 300, height = 200, color = C.accent }) {
  if (!values?.length) return null;
  const bins = histBins(values);
  const density = kde(values);
  const range = Math.max(...values) - Math.min(...values) || 1;
  const data = bins.map(b => ({
    x: b.x.toFixed(1),
    count: b.count,
    density: density(b.x + range / 40) * values.length * (range / 20),
  }));
  return (
    <ResponsiveContainer width={width} height={height}>
      <ComposedChart data={data} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
        <XAxis dataKey="x" tick={{ fill: C.dim, fontSize: 9 }} />
        <YAxis tick={{ fill: C.dim, fontSize: 9 }} />
        <Bar dataKey="count" fill={color} fillOpacity={0.3} />
        <Line dataKey="density" dot={false} stroke={color} strokeWidth={2} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function corrColor(r) {
  if (r >= 0) {
    const t = r;
    return `rgba(77,170,255,${0.1 + 0.75 * t})`;
  }
  const t = -r;
  return `rgba(255,77,109,${0.1 + 0.75 * t})`;
}

export function HeatmapCorr({ matrix, labels, rowLabels, width = 240, height = 240, onCellClick }) {
  if (!matrix?.length) return null;
  const rowLabs = rowLabels ?? labels;
  const colLabs = labels ?? rowLabels;
  if (!rowLabs?.length || !colLabs?.length) return null;
  const nR = rowLabs.length;
  const nC = colLabs.length;
  const labelW = 60, pad = 4;
  const cellW = (width - labelW - pad) / nC;
  const cellH = (height - pad - 16) / nR;
  return (
    <svg width={width} height={height}>
      {rowLabs.map((l, i) => (
        <text key={`yl${i}`} x={labelW - 4} y={pad + 16 + i * cellH + cellH / 2 + 4}
          textAnchor="end" fontSize={9} fill={C.dim}>{l}</text>
      ))}
      {colLabs.map((l, j) => (
        <text key={`xl${j}`} x={labelW + j * cellW + cellW / 2} y={pad + 10}
          textAnchor="middle" fontSize={9} fill={C.dim}>{l}</text>
      ))}
      {matrix.map((row, i) => row.map((val, j) => (
        <g key={`${i}-${j}`} onClick={() => onCellClick?.({ row: rowLabs[i], col: colLabs[j], r: val })}
          style={{ cursor: onCellClick ? 'pointer' : 'default' }}>
          <rect
            x={labelW + j * cellW} y={pad + 16 + i * cellH}
            width={cellW - 2} height={cellH - 2}
            fill={corrColor(val)} rx={2}
          />
          <text x={labelW + j * cellW + cellW / 2} y={pad + 16 + i * cellH + cellH / 2 + 4}
            textAnchor="middle" fontSize={9} fill={C.text}>
            {Number(val).toFixed(2)}
          </text>
        </g>
      )))}
    </svg>
  );
}

export function MosaicPlot({ data, xVar, yVar, width = 300, height = 200 }) {
  if (!data?.length || !xVar || !yVar) return null;
  const xVals = [...new Set(data.map(r => r[xVar]))];
  const yVals = [...new Set(data.map(r => r[yVar]))];
  const counts = {};
  for (const r of data) {
    const k = `${r[xVar]}|${r[yVar]}`;
    counts[k] = (counts[k] ?? 0) + 1;
  }
  const xTotals = xVals.map(x => ({ x, total: data.filter(r => r[xVar] === x).length }));
  const grand = data.length;
  const colors = [C.accent, C.pos, C.neg, C.orange, C.violet];
  const pad = { t: 20, b: 30, l: 10, r: 10 };
  const w = width - pad.l - pad.r;
  const h = height - pad.t - pad.b;
  let xOffset = 0;
  const tiles = [];
  for (const { x, total } of xTotals) {
    const colW = (total / grand) * w;
    let yOffset = 0;
    for (const [yi, y] of yVals.entries()) {
      const cnt = counts[`${x}|${y}`] ?? 0;
      const tileH = (cnt / total) * h;
      tiles.push({ x: pad.l + xOffset, y: pad.t + yOffset, w: colW - 1, h: tileH - 1, label: `${x}/${y}`, color: colors[yi % colors.length] });
      yOffset += tileH;
    }
    xOffset += colW;
  }
  return (
    <svg width={width} height={height}>
      {tiles.map((t, i) => (
        <g key={i}>
          <rect x={t.x} y={t.y} width={t.w} height={t.h} fill={t.color} fillOpacity={0.3} stroke={t.color} strokeWidth={0.5} />
        </g>
      ))}
      {xTotals.reduce((acc, { x, total }, i) => {
        const prev = xTotals.slice(0, i).reduce((s, { total: t }) => s + t, 0);
        const cx = pad.l + (prev / grand) * w + ((total / grand) * w) / 2;
        acc.push(<text key={x} x={cx} y={height - 6} textAnchor="middle" fontSize={9} fill={C.dim}>{x}</text>);
        return acc;
      }, [])}
    </svg>
  );
}

// ── MDS scatter ───────────────────────────────────────────────────────────
export function MDSPlot({ points, stress, n }) {
  if (!points?.length) return null;
  const axTick = { fontSize: 9, fill: C.dim, ...mono };
  const pts = points.map((p, i) => ({ x: p[0] ?? 0, y: p[1] ?? 0, id: i }));
  const name = stress != null ? `stress = ${stress}` : (n != null ? `n = ${n}` : 'points');
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart margin={{ top: 4, right: 4, bottom: 18, left: 4 }}>
        <CartesianGrid stroke={C.border} strokeOpacity={.4} />
        <XAxis dataKey="x" type="number" tick={axTick} stroke={C.border} label={{ value: 'Dim 1', position: "insideBottom", offset: -5, fill: C.dim, fontSize: 8 }} />
        <YAxis dataKey="y" type="number" tick={axTick} stroke={C.border} label={{ value: 'Dim 2', angle: -90, position: "insideLeft", offset: 8, fill: C.dim, fontSize: 8 }} />
        <Tooltip content={<CTip />} />
        <Scatter data={pts} fill={C.accent} opacity={.7} r={3} name={name} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ── Scatter quick-view ────────────────────────────────────────────────────────
export function QuickScatter({ data, xVar, yVar, colorVar, colorMap, groups }) {
  if (!xVar || !yVar) return null;
  const axTick = { fontSize: 9, fill: C.dim, ...mono };
  const scData = (() => {
    const valid = data.filter(r => Number.isFinite(+r[xVar]) && Number.isFinite(+r[yVar]));
    return colorVar
      ? (groups || []).map(g => ({ name: g, color: colorMap?.[g] || PAL[0], pts: valid.filter(r => r[colorVar] === g).map(r => ({ x: +r[xVar], y: +r[yVar] })) }))
      : [{ name: 'all', color: PAL[0], pts: valid.map(r => ({ x: +r[xVar], y: +r[yVar] })) }];
  })();
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart margin={{ top: 4, right: 4, bottom: 18, left: 4 }}>
        <CartesianGrid stroke={C.border} strokeOpacity={.4} />
        <XAxis dataKey="x" type="number" tick={axTick} stroke={C.border} label={{ value: xVar, position: "insideBottom", offset: -5, fill: C.dim, fontSize: 8 }} />
        <YAxis dataKey="y" type="number" tick={axTick} stroke={C.border} label={{ value: yVar, angle: -90, position: "insideLeft", offset: 8, fill: C.dim, fontSize: 8 }} />
        <Tooltip content={<CTip />} />
        {scData.map(s => <Scatter key={s.name} name={s.name} data={s.pts} fill={s.color} opacity={.7} r={3} />)}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function QuickScatterFit({ data, xVar, yVar, colorVar, colorMap, groups }) {
  if (!xVar || !yVar) return null;
  const axTick = { fontSize: 9, fill: C.dim, ...mono };
  const valid = data.filter(r => Number.isFinite(+r[xVar]) && Number.isFinite(+r[yVar]));
  const xs = valid.map(r => +r[xVar]);
  const ys = valid.map(r => +r[yVar]);
  const fit = fitOLS(xs, ys);
  const scData = colorVar && colorVar !== '(none)'
    ? (groups || []).map(g => ({ name: g, color: colorMap?.[g] || PAL[0], pts: valid.filter(r => r[colorVar] === g).map(r => ({ x: +r[xVar], y: +r[yVar] })) }))
    : [{ name: 'all', color: PAL[0], pts: valid.map(r => ({ x: +r[xVar], y: +r[yVar] })) }];
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart margin={{ top: 4, right: 4, bottom: 18, left: 4 }}>
        <CartesianGrid stroke={C.border} strokeOpacity={.4} />
        <XAxis dataKey="x" type="number" tick={axTick} stroke={C.border} />
        <YAxis dataKey="y" type="number" tick={axTick} stroke={C.border} />
        <Tooltip content={<CTip />} />
        {scData.map(s => <Scatter key={s.name} data={s.pts} fill={s.color} opacity={.65} r={3} />)}
        {fit && <RLine data={fit.line} dataKey="y" stroke={C.accent} strokeWidth={2} dot={false} name={`fit r=${fit.r.toFixed(2)}`} />}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/** IRT item characteristic curves */
export function IRTCurves({ icc, itemCount = 3, height = 100 }) {
  if (!icc?.length) return null;
  const cols = PAL.slice(0, Math.min(itemCount, icc[0]?.curves?.length || 0));
  const data = icc.map(pt => {
    const row = { theta: pt.theta };
    pt.curves?.forEach((p, j) => { if (j < cols.length) row[`I${j + 1}`] = p; });
    return row;
  });
  const axTick = { fontSize: 7, fill: C.dim, ...mono };
  return (
    <div style={{ height }}>
      <div style={{ fontSize: 8, color: C.dim, ...mono, marginBottom: 1 }}>ICC (θ vs P)</div>
      <ResponsiveContainer width="100%" height="90%">
        <LineChart data={data} margin={{ top: 2, right: 8, bottom: 14, left: 8 }}>
          <CartesianGrid stroke={C.border} strokeOpacity={.35} />
          <XAxis dataKey="theta" tick={axTick} stroke={C.border} />
          <YAxis domain={[0, 1]} tick={axTick} stroke={C.border} />
          <Tooltip content={<CTip />} />
          {cols.map((col, j) => (
            <Line key={j} type="monotone" dataKey={`I${j + 1}`} stroke={col} strokeWidth={1.5} dot={false} name={`Item ${j + 1}`} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** LCA class profile bar chart */
export function LCAProfiles({ profiles, height = 95 }) {
  if (!profiles?.length) return null;
  const data = profiles.flatMap(p =>
    (p.items || []).map(it => ({ class: `C${p.class}`, var: it.var, prop: p.proportion })));
  const axTick = { fontSize: 7, fill: C.dim, ...mono };
  return (
    <div style={{ height }}>
      <div style={{ fontSize: 8, color: C.dim, ...mono, marginBottom: 1 }}>Class proportions</div>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart data={profiles.map(p => ({ name: `C${p.class}`, pct: +(100 * p.proportion).toFixed(1) }))} margin={{ top: 2, right: 8, bottom: 14, left: 8 }}>
          <CartesianGrid stroke={C.border} strokeOpacity={.35} vertical={false} />
          <XAxis dataKey="name" tick={axTick} stroke={C.border} />
          <YAxis tick={axTick} stroke={C.border} domain={[0, 100]} />
          <Tooltip content={<CTip />} />
          <Bar dataKey="pct" fill={C.accent} name="%" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Spaghetti plot for multilevel / longitudinal */
export function SpaghettiPlot({ data, xVar, yVar, groupVar, height = 110 }) {
  if (!data?.length || !xVar || !yVar || !groupVar) return null;
  const groups = [...new Set(data.map(r => r[groupVar]))].slice(0, 12);
  const axTick = { fontSize: 7, fill: C.dim, ...mono };
  return (
    <div style={{ height }}>
      <div style={{ fontSize: 8, color: C.dim, ...mono, marginBottom: 1 }}>Spaghetti · {groupVar}</div>
      <ResponsiveContainer width="100%" height="90%">
        <ComposedChart margin={{ top: 2, right: 6, bottom: 14, left: 6 }}>
          <CartesianGrid stroke={C.border} strokeOpacity={.35} />
          <XAxis dataKey="x" type="number" tick={axTick} stroke={C.border} />
          <YAxis dataKey="y" type="number" tick={axTick} stroke={C.border} />
          <Tooltip content={<CTip />} />
          {groups.map((g, i) => {
            const pts = data.filter(r => r[groupVar] === g).map(r => ({ x: +r[xVar], y: +r[yVar] })).filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
            return <RLine key={g} data={pts} dataKey="y" stroke={PAL[i % PAL.length]} strokeWidth={1} dot={false} opacity={.55} name={String(g)} />;
          })}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Caterpillar plot of group means */
export function CaterpillarPlot({ groups }) {
  if (!groups?.length) return null;
  const sorted = [...groups].sort((a, b) => a.mean - b.mean);
  const W = 320, H = Math.max(70, sorted.length * 18 + 20), PL = 70, PR = 40;
  const vals = sorted.map(g => g.mean);
  const vMin = Math.min(...vals), vMax = Math.max(...vals), vR = vMax - vMin || 1;
  const sx = v => PL + ((v - vMin) / vR) * (W - PL - PR);
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={mono}>
      {sorted.map((g, i) => {
        const y = 12 + i * 18;
        return (
          <g key={i}>
            <text x={PL - 4} y={y + 3} textAnchor="end" fontSize={7} fill={C.dim}>{String(g.name).slice(0, 10)}</text>
            <circle cx={sx(g.mean)} cy={y} r={3} fill={C.accent} />
          </g>
        );
      })}
    </svg>
  );
}

/** ITS segmented means */
export function ITSPlot({ series, height = 95 }) {
  if (!series?.length) return null;
  const axTick = { fontSize: 7, fill: C.dim, ...mono };
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} margin={{ top: 2, right: 8, bottom: 14, left: 8 }}>
          <CartesianGrid stroke={C.border} strokeOpacity={.35} />
          <XAxis dataKey="t" type="number" tick={axTick} stroke={C.border} />
          <YAxis dataKey="y" type="number" tick={axTick} stroke={C.border} />
          <Tooltip content={<CTip />} />
          <Line type="monotone" dataKey="y" stroke={C.accent} strokeWidth={2} dot={{ r: 2 }} name="y" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Time series line chart for arbitrary series data */
export function TimeSeriesChart({ series, width = 210, height = 140 }) {
  if (!series?.length) return null;
  const lines = (Array.isArray(series[0]) || typeof series[0] === 'number')
    ? [{ data: series }]
    : series;
  const hasNames = lines.length > 1 || (lines.length === 1 && typeof lines[0]?.name === 'string');
  const data = (() => {
    const maxLen = Math.max(...lines.map(l => (l.data || l.length || 0) && Array.isArray(l.data || l) ? (l.data || l).length : 0));
    if (!maxLen) return [];
    return Array.from({ length: maxLen }, (_, i) => {
      const row = { index: i + 1 };
      lines.forEach((l, li) => {
        const arr = l.data || l;
        row[hasNames ? (l.name || `y${li + 1}`) : 'y'] = arr?.[i];
      });
      return row;
    });
  })();
  if (!data.length) return null;
  const dataKeys = Object.keys(data[0]).filter(k => k !== 'index');
  const axTick = { fontSize: 7, fill: C.dim, ...mono };
  const colors = [C.accent, C.warn, PAL[2], PAL[4], PAL[6]];
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 14, left: 8 }}>
          <CartesianGrid stroke={C.border} strokeOpacity={.35} />
          <XAxis dataKey="index" type="number" tick={axTick} stroke={C.border} />
          <YAxis type="number" tick={axTick} stroke={C.border} />
          <Tooltip content={<CTip />} />
          {dataKeys.map((key, i) => (
            <Line key={key} type="monotone" dataKey={key} stroke={colors[i % colors.length]} strokeWidth={2} dot={false} name={key} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** RDD local scatter */
export function RDPlot({ points, cutoff, height = 100 }) {
  if (!points?.length) return null;
  const axTick = { fontSize: 7, fill: C.dim, ...mono };
  const left = points.filter(p => p.x < cutoff);
  const right = points.filter(p => p.x >= cutoff);
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart margin={{ top: 2, right: 6, bottom: 14, left: 6 }}>
          <CartesianGrid stroke={C.border} strokeOpacity={.35} />
          <XAxis dataKey="x" type="number" tick={axTick} stroke={C.border} />
          <YAxis dataKey="y" type="number" tick={axTick} stroke={C.border} />
          <Tooltip content={<CTip />} />
          <ReferenceLine x={cutoff} stroke={C.neg} strokeDasharray="4,2" />
          <Scatter data={left} fill={C.pos} opacity={.6} r={2} name="left" />
          <Scatter data={right} fill={C.warn} opacity={.6} r={2} name="right" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Sociogram force layout */
export function SociogramPlot({ nodes, edges }) {
  if (!nodes?.length) return null;
  const xs = nodes.map(n => n.x);
  const ys = nodes.map(n => n.y);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMin = Math.min(...ys), yMax = Math.max(...ys);
  const W = 300, H = 120, pad = 20;
  const sx = x => pad + ((x - xMin) / (xMax - xMin || 1)) * (W - 2 * pad);
  const sy = y => pad + ((y - yMin) / (yMax - yMin || 1)) * (H - 2 * pad);
  const pos = Object.fromEntries(nodes.map(n => [n.id, n]));
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={mono}>
      {(edges || []).map((e, i) => {
        const a = pos[e.from], b = pos[e.to];
        if (!a || !b) return null;
        return <line key={i} x1={sx(a.x)} y1={sy(a.y)} x2={sx(b.x)} y2={sy(b.y)} stroke={C.border} strokeWidth={1} opacity={.6} />;
      })}
      {nodes.map(n => (
        <circle key={n.id} cx={sx(n.x)} cy={sy(n.y)} r={4} fill={C.accent} />
      ))}
    </svg>
  );
}

/** Kaplan-Meier survival step function with CI band */
export function SurvivalPlot({ km, kms }) {
  const curves = kms?.length ? kms.map(k => ({ label: k.strata || 'group', ...k })) : km ? [{ label: 'Overall', ...km }] : null;
  if (!curves?.length) return null;
  const allT = curves.flatMap(c => c.times);
  const tMin = 0, tMax = Math.max(...allT) || 1;
  const allS = curves.flatMap(c => c.surv);
  const sMin = 0, sMax = 1;
  const W = 320, H = 140, PL = 44, PR = 12, PT = 8, PB = 22;
  const cW = W - PL - PR, cH = H - PT - PB;
  const sx = t => PL + ((t - tMin) / (tMax - tMin || 1)) * cW;
  const sy = s => PT + cH - ((s - sMin) / (sMax - sMin || 1)) * cH;

  const stepPath = (times, surv) => {
    if (!times?.length) return '';
    let d = `M${sx(times[0]).toFixed(1)},${sy(surv[0]).toFixed(1)}`;
    for (let i = 1; i < times.length; i++) {
      d += ` L${sx(times[i]).toFixed(1)},${sy(surv[i - 1]).toFixed(1)}`;
      d += ` L${sx(times[i]).toFixed(1)},${sy(surv[i]).toFixed(1)}`;
    }
    return d;
  };

  const ciPoly = (times, lower, upper) => {
    if (!times?.length) return '';
    const pts = [];
    for (let i = 0; i < times.length; i++) pts.push(`${sx(times[i]).toFixed(1)},${sy(lower[i]).toFixed(1)}`);
    for (let i = times.length - 1; i >= 0; i--) pts.push(`${sx(times[i]).toFixed(1)},${sy(upper[i]).toFixed(1)}`);
    return pts.join(' ');
  };

  const colors = curves.length === 1 ? [C.accent] : curves.map((_, i) => PAL[i % PAL.length]);

  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ fontSize: 8, color: C.dim, ...mono, marginBottom: 2 }}>Kaplan-Meier Survival Curve</div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={mono}>
        {/* grid */}
        {Array.from({ length: 5 }, (_, i) => {
          const v = sMin + (i / 4) * (sMax - sMin);
          return <line key={`h${i}`} x1={PL} x2={W - PR} y1={sy(v)} y2={sy(v)} stroke={C.border} strokeOpacity={.2} />;
        })}
        {/* axes */}
        <line x1={PL} x2={W - PR} y1={PT + cH} y2={PT + cH} stroke={C.border} />
        <line x1={PL} x2={PL} y1={PT} y2={PT + cH} stroke={C.border} />
        {/* labels */}
        <text x={PL + cW / 2} y={H - 2} textAnchor="middle" fontSize={7} fill={C.dim}>Time</text>
        <text x={PL - 4} y={PT + cH / 2} textAnchor="middle" fontSize={7} fill={C.dim} transform={`rotate(-90,${PL - 4},${PT + cH / 2})`}>Survival</text>
        {/* CI bands */}
        {curves.map((c, i) => {
          if (!c.lower?.length || !c.upper?.length) return null;
          return <polygon key={`ci${i}`} points={ciPoly(c.times, c.lower, c.upper)} fill={colors[i]} opacity={.1} />;
        })}
        {/* step curves */}
        {curves.map((c, i) => (
          <path key={`km${i}`} d={stepPath(c.times, c.surv)} stroke={colors[i]} strokeWidth={1.5} fill="none" />
        ))}
        {/* legend */}
        {curves.length > 1 && (
          <g transform={`translate(${PL + 4},${PT + 4})`}>
            {curves.map((c, i) => (
              <g key={i} transform={`translate(0,${i * 10})`}>
                <line x1={0} y1={5} x2={10} y2={5} stroke={colors[i]} strokeWidth={1.5} />
                <text x={14} y={7} fontSize={6} fill={C.dim}>{String(c.label).slice(0, 14)}</text>
              </g>
            ))}
          </g>
        )}
        {/* median survival reference */}
        {curves.map((c, i) => {
          if (c.median == null) return null;
          return (
            <g key={`med${i}`}>
              <line x1={sx(c.median)} x2={sx(c.median)} y1={PT} y2={PT + cH} stroke={colors[i]} strokeWidth={.8} strokeDasharray="3,2" />
              <text x={sx(c.median)} y={H - 4} textAnchor="middle" fontSize={6} fill={colors[i]}>median</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
