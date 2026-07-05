import { avg } from '../math/core.js';
import { mulberry32 } from '../math/rng.js';

let __rng = mulberry32(42); // reseeded per stochastic call for reproducibility

function quantile(arr, q) {
  const sorted = [...arr].sort((a, b) => a - b);
  const pos = q * (sorted.length - 1);
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (pos - lo) * (sorted[hi] - sorted[lo]);
}

// ── Standardize ─────────────────────────────────────────────────────────────
export function standardize(data, { method = 'zscore' } = {}) {
  if (!data || !data.length) return null;
  const n = data.length;
  const mu = avg(data);
  const sorted = [...data].sort((a, b) => a - b);
  if (method === 'zscore') {
    const sd = Math.sqrt(data.reduce((s, v) => s + (v - mu) ** 2, 0) / (n - 1));
    if (!sd) return null;
    const values = data.map(v => +((v - mu) / sd).toFixed(6));
    return { test: 'Z-Score Standardization', values, method, mean: +mu.toFixed(4), sd: +sd.toFixed(4), n, apa: `Z-score: mean = ${mu.toFixed(3)}, SD = ${sd.toFixed(3)}, n = ${n}` };
  }
  if (method === 'minmax') {
    const min = sorted[0], max = sorted[n - 1];
    if (min === max) return null;
    const values = data.map(v => +((v - min) / (max - min)).toFixed(6));
    return { test: 'Min-Max Standardization', values, method, min: +min.toFixed(4), max: +max.toFixed(4), n, apa: `Min-max: [${min.toFixed(2)}, ${max.toFixed(2)}] → [0, 1], n = ${n}` };
  }
  if (method === 'robust') {
    const med = quantile(data, 0.5);
    const q1 = quantile(data, 0.25), q3 = quantile(data, 0.75);
    const iqr = q3 - q1;
    if (!iqr) return null;
    const values = data.map(v => +((v - med) / iqr).toFixed(6));
    return { test: 'Robust Standardization', values, method, median: +med.toFixed(4), iqr: +iqr.toFixed(4), n, apa: `Robust: median = ${med.toFixed(3)}, IQR = ${iqr.toFixed(3)}, n = ${n}` };
  }
  return null;
}

// ── IQR Outliers ────────────────────────────────────────────────────────────
export function iqrOutliers(data, { multiplier = 1.5 } = {}) {
  if (!data || data.length < 5) return null;
  const n = data.length;
  const q1 = quantile(data, 0.25), q3 = quantile(data, 0.75);
  const iqr = q3 - q1;
  const lower = q1 - multiplier * iqr;
  const upper = q3 + multiplier * iqr;
  const outliers = [];
  data.forEach((v, i) => { if (v < lower || v > upper) outliers.push({ index: i, value: v }); });
  return {
    test: 'IQR Outliers',
    outliers,
    lowerBound: +lower.toFixed(4), upperBound: +upper.toFixed(4),
    nOutliers: outliers.length, pct: +(100 * outliers.length / n).toFixed(1),
    n,
    apa: `IQR: ${outliers.length} outliers (${(100 * outliers.length / n).toFixed(0)}%), bounds [${lower.toFixed(2)}, ${upper.toFixed(2)}]`,
  };
}

// ── MAD Outliers ────────────────────────────────────────────────────────────
export function madOutliers(data, { threshold = 3.5 } = {}) {
  if (!data || data.length < 5) return null;
  const n = data.length;
  const med = quantile(data, 0.5);
  const absDev = data.map(v => Math.abs(v - med));
  const mad = quantile(absDev, 0.5);
  if (!mad) return null;
  const outliers = [];
  data.forEach((v, i) => {
    const z = 0.6745 * (v - med) / mad;
    if (Math.abs(z) > threshold) outliers.push({ index: i, value: v, zScore: +z.toFixed(4) });
  });
  return {
    test: 'MAD Outliers',
    outliers, mad: +mad.toFixed(4),
    threshold, nOutliers: outliers.length, n,
    apa: `MAD: ${outliers.length} outliers (threshold = ${threshold}), MAD = ${mad.toFixed(3)}`,
  };
}

// ── One-Hot Encode ──────────────────────────────────────────────────────────
export function oneHotEncode(data, column) {
  if (!data || !data.length || !column) return null;
  const cats = [...new Set(data.map(r => r[column]))].filter(v => v != null);
  if (cats.length < 2) return null;
  const encoded = data.map(row => {
    const r = { ...row };
    cats.forEach(c => {
      r[`${column}_${c}`] = row[column] === c ? 1 : 0;
    });
    return r;
  });
  return {
    test: 'One-Hot Encoding',
    encoded, categories: cats, n: data.length,
    apa: `One-hot: ${cats.length} categories for "${column}", n = ${data.length}`,
  };
}

// ── Equal-Width Binning ─────────────────────────────────────────────────────
export function equalWidthBinning(data, nBins = 5) {
  if (!data || data.length < nBins) return null;
  const n = data.length;
  const min = Math.min(...data), max = Math.max(...data);
  if (min === max) return null;
  const width = (max - min) / nBins;
  const edges = Array.from({ length: nBins + 1 }, (_, i) => +(min + i * width).toFixed(4));
  const labels = edges.slice(0, -1).map((e, i) => `[${e.toFixed(2)}, ${edges[i + 1].toFixed(2)})`);
  const binIndices = data.map(v => {
    if (v >= max) return nBins - 1;
    return Math.min(nBins - 1, Math.floor((v - min) / width));
  });
  return {
    test: 'Equal-Width Binning',
    binIndices, binEdges: edges, binLabels: labels, nBins, n,
    apa: `Binning: ${nBins} bins, width = ${width.toFixed(2)}, range [${min.toFixed(2)}, ${max.toFixed(2)}]`,
  };
}

// ── Winsorize ───────────────────────────────────────────────────────────────
export function winsorize(data, { lower = 0.05, upper = 0.05 } = {}) {
  if (!data || data.length < 3) return null;
  const n = data.length;
  const lo = quantile(data, lower), hi = quantile(data, 1 - upper);
  const values = data.map(v => +Math.min(hi, Math.max(lo, v)).toFixed(6));
  let clipped = 0;
  data.forEach(v => { if (v < lo || v > hi) clipped++; });
  return {
    test: 'Winsorize',
    values,
    lowerQuantile: +lo.toFixed(4), upperQuantile: +hi.toFixed(4),
    nClipped: clipped, n,
    apa: `Winsorized at [${(100 * lower).toFixed(0)}%, ${(100 * (1 - upper)).toFixed(0)}%]: ${clipped} clipped, n = ${n}`,
  };
}

// ── Frequency Encode ────────────────────────────────────────────────────────
export function frequencyEncode(data, column) {
  if (!data || !data.length || !column) return null;
  const counts = {};
  data.forEach(r => { const v = r[column]; if (v != null) counts[v] = (counts[v] || 0) + 1; });
  const cats = Object.keys(counts);
  if (cats.length < 2) return null;
  const encoded = data.map(r => ({
    ...r,
    [`${column}_freq`]: r[column] != null ? counts[r[column]] : 0,
  }));
  return {
    test: 'Frequency Encoding',
    encoded,
    mapping: Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, v])),
    n: data.length,
    apa: `Freq encode "${column}": ${cats.length} categories, n = ${data.length}`,
  };
}

// ── SMOTE (Synthetic Minority Oversampling) ───────────────────────
export function smote(X, y, { seed = 42, k = 5, multiplier = 1 } = {}) {
  __rng = mulberry32(seed);
  if (!X || !y || X.length < 5 || y.length !== X.length) return null;
  const n = X.length, p = X[0].length;
  const minority = y.map((v, i) => v === 1 ? i : -1).filter(i => i >= 0);
  const majority = y.map((v, i) => v === 0 ? i : -1).filter(i => i >= 0);
  if (minority.length < 3 || majority.length < 3) return null;
  const synthetic = [];
  for (let m = 0; m < multiplier; m++) {
    for (const idx of minority) {
      const neighbors = minority.filter(j => j !== idx).map(j => {
        let d = 0;
        for (let f = 0; f < p; f++) d += (X[idx][f] - X[j][f]) ** 2;
        return { j, d: Math.sqrt(d) };
      }).sort((a, b) => a.d - b.d).slice(0, Math.min(k, minority.length - 1));
      if (neighbors.length > 0) {
        const nn = neighbors[Math.floor(__rng() * neighbors.length)];
        const synth = X[idx].map((v, f) => v + __rng() * (X[nn.j][f] - v));
        synthetic.push(synth);
      }
    }
  }
  const newX = [...X, ...synthetic];
  const newY = [...y, ...Array(synthetic.length).fill(1)];
  return { test: 'SMOTE', nOriginal: n, nSynthetic: synthetic.length, nNew: newX.length, p, k, apa: `SMOTE: ${synthetic.length} synthetic points` };
}

// ── ADASYN ────────────────────────────────────────────────────────
export function adasyn(X, y, { seed = 42, k = 5, beta = 0.5 } = {}) {
  __rng = mulberry32(seed);
  if (!X || !y || X.length < 5) return null;
  const minority = y.map((v, i) => v === 1 ? i : -1).filter(i => i >= 0);
  const majority = y.map((v, i) => v === 0 ? i : -1).filter(i => i >= 0);
  if (minority.length < 3 || majority.length < 3) return null;
  const imbalance = Math.max(0, Math.floor(beta * (majority.length - minority.length)));
  const synthetic = [];
  for (let g = 0; g < Math.min(imbalance, minority.length * 2); g++) {
    const i = minority[g % minority.length];
    const neighbors = minority.filter(j => j !== i).sort(() => __rng() - 0.5).slice(0, Math.min(k, minority.length - 1));
    if (neighbors.length > 0) {
      const nn = neighbors[0];
      const synth = X[i].map((v, f) => v + __rng() * (X[nn][f] - v));
      synthetic.push(synth);
    }
  }
  const newX = [...X, ...synthetic];
  const newY = [...y, ...Array(synthetic.length).fill(1)];
  return { test: 'ADASYN', nOriginal: X.length, nSynthetic: synthetic.length, nNew: newX.length, k, apa: `ADASYN: ${synthetic.length} synth (${X.length}->${newX.length})` };
}

// ── Random Undersampling ──────────────────────────────────────────
export function randomUnderSample(X, y, seed = 42) {
  __rng = mulberry32(seed);
  if (!X || !y || X.length < 3) return null;
  const minority = y.map((v, i) => v === 1 ? i : -1).filter(i => i >= 0);
  const majority = y.map((v, i) => v === 0 ? i : -1).filter(i => i >= 0);
  if (!minority.length || !majority.length) return null;
  const shuffled = [...majority].sort(() => __rng() - 0.5);
  const selected = shuffled.slice(0, minority.length);
  const indices = [...minority, ...selected];
  const newX = indices.map(i => X[i]);
  const newY = indices.map(i => y[i]);
  return { test: 'Random UnderSample', nOriginal: X.length, nNew: newX.length, nMajorityRemoved: majority.length - selected.length, apa: `UnderSample: ${X.length} -> ${newX.length}` };
}
