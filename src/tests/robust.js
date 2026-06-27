import { avg, sampleSD } from '../math/core.js';

// ── Theil-Sen Slope ────────────────────────────────────────────────────────
export function theilSenSlope(x, y) {
  if (!x || !y || x.length < 10 || x.length !== y.length) return null;
  const n = x.length;
  const slopes = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = x[i] - x[j];
      if (Math.abs(dx) > 1e-10) slopes.push((y[i] - y[j]) / dx);
    }
  }
  slopes.sort((a, b) => a - b);
  const m = slopes.length;
  const slope = m % 2 === 0 ? (slopes[m / 2 - 1] + slopes[m / 2]) / 2 : slopes[Math.floor(m / 2)];
  const intercept = avg(y) - slope * avg(x);
  const fitted = x.map(xi => intercept + slope * xi);
  let ssRes = 0, ssTot = 0;
  const my = avg(y);
  for (let i = 0; i < n; i++) { ssRes += (y[i] - fitted[i]) ** 2; ssTot += (y[i] - my) ** 2; }
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
  return {
    test: 'Theil-Sen', slope: +slope.toFixed(4), intercept: +intercept.toFixed(4), rSquared: +r2.toFixed(4), n,
    apa: `Theil-Sen: slope = ${slope.toFixed(3)}, intercept = ${intercept.toFixed(3)}, R² = ${r2.toFixed(3)}`,
  };
}

// ── MM Estimator ───────────────────────────────────────────────────────────
export function mmEstimator(x, y) {
  if (!x || !y || x.length < 10 || x.length !== y.length) return null;
  const n = x.length;
  // Initial S-estimator via bisquare
  let b0 = 0, b1 = 0;
  let bestMd = Infinity;
  for (let trial = 0; trial < 20; trial++) {
    const i1 = Math.floor(Math.random() * n);
    const i2 = Math.floor(Math.random() * n);
    if (i1 === i2 || Math.abs(x[i1] - x[i2]) < 1e-10) continue;
    const s = (y[i1] - y[i2]) / (x[i1] - x[i2]);
    const ic = y[i1] - s * x[i1];
    const resid = y.map((yi, i) => yi - ic - s * x[i]);
    const mad = median(resid.map(r => Math.abs(r))) * 1.4826;
    if (mad < bestMd) { bestMd = mad; b0 = ic; b1 = s; }
  }
  const sigma = bestMd || 1;
  // M-step with Tukey bisquare
  for (let iter = 0; iter < 10; iter++) {
    const resid = y.map((yi, i) => yi - b0 - b1 * x[i]);
    const r = resid.map(v => v / sigma);
    const w = r.map(ri => {
      const z = Math.abs(ri) / 4.685;
      return z < 1 ? (1 - z * z) ** 2 : 0;
    });
    let sw = 0, swx = 0, swy = 0, swxx = 0, swxy = 0;
    for (let i = 0; i < n; i++) { sw += w[i]; swx += w[i] * x[i]; swy += w[i] * y[i]; swxx += w[i] * x[i] * x[i]; swxy += w[i] * x[i] * y[i]; }
    const denom = sw * swxx - swx * swx;
    if (!denom) break;
    b1 = (sw * swxy - swx * swy) / denom;
    b0 = (swxx * swy - swx * swxy) / denom;
  }
  const fitted = x.map(xi => b0 + b1 * xi);
  let ssRes = 0, ssTot = 0;
  const my = avg(y);
  for (let i = 0; i < n; i++) { ssRes += (y[i] - fitted[i]) ** 2; ssTot += (y[i] - my) ** 2; }
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
  return {
    test: 'MM Estimator', slope: +b1.toFixed(4), intercept: +b0.toFixed(4), sigma: +sigma.toFixed(4), rSquared: +r2.toFixed(4), n,
    apa: `MM: slope = ${b1.toFixed(3)}, intercept = ${b0.toFixed(3)}, σ = ${sigma.toFixed(3)}`,
  };
}

function median(arr) {
  const s = [...arr].sort((a, b) => a - b);
  const m = arr.length;
  return m % 2 ? s[Math.floor(m / 2)] : (s[m / 2 - 1] + s[m / 2]) / 2;
}

// ── MAD Scale ──────────────────────────────────────────────────────────────
export function madScale(data) {
  if (!data || data.length < 5) return null;
  const n = data.length;
  const med = median(data);
  const absDev = data.map(v => Math.abs(v - med));
  const mad = median(absDev) * 1.4826;
  return {
    test: 'MAD Scale', mad: +mad.toFixed(4), median: +med.toFixed(4), n,
    apa: `MAD = ${mad.toFixed(3)}, median = ${med.toFixed(3)}, n = ${n}`,
  };
}

// ── Hampel M-Estimator ─────────────────────────────────────────────────────
export function hampelM(data, { a = 1.5, b = 3, c = 8 } = {}) {
  if (!data || data.length < 8) return null;
  const n = data.length;
  let mu = median(data);
  const sigma = madScale(data)?.mad || 1;
  for (let iter = 0; iter < 20; iter++) {
    const z = data.map(v => (v - mu) / sigma);
    const psi = z.map(zi => {
      const absZ = Math.abs(zi);
      if (absZ <= a) return zi;
      if (absZ <= b) return a * Math.sign(zi);
      if (absZ <= c) return a * (c - absZ) / (c - b) * Math.sign(zi);
      return 0;
    });
    mu += avg(psi) * sigma;
    if (Math.abs(avg(psi)) < 1e-6) break;
  }
  return {
    test: 'Hampel M', mu: +mu.toFixed(4), sigma: +sigma.toFixed(4), a, b, c, n,
    apa: `Hampel M: μ = ${mu.toFixed(3)}, σ = ${sigma.toFixed(3)}, n = ${n}`,
  };
}

// ── MCD Covariance ─────────────────────────────────────────────────────────
export function mcdCovariance(data, vars, { alpha = 0.75 } = {}) {
  if (!data || data.length < 10 || !vars || vars.length < 2) return null;
  const n = data.length, p = vars.length;
  const h = Math.max(Math.floor(alpha * n), p + 2);
  const X = data.map(r => vars.map(v => +r[v]));
  // Simplified: use random subsets, pick smallest determinant
  let bestDet = Infinity, bestSubset = null;
  for (let trial = 0; trial < 50; trial++) {
    const indices = [];
    while (indices.length < h) {
      const idx = Math.floor(Math.random() * n);
      if (!indices.includes(idx)) indices.push(idx);
    }
    const S = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => {
      const mi = avg(indices.map(k => X[k][i]));
      const mj = avg(indices.map(k => X[k][j]));
      let s = 0;
      for (const k of indices) s += (X[k][i] - mi) * (X[k][j] - mj);
      return s / (h - 1);
    }));
    let det = 1;
    for (let i = 0; i < p; i++) det *= Math.abs(S[i][i] || 1);
    if (det < bestDet && det > 1e-10) { bestDet = det; bestSubset = S; }
  }
  if (!bestSubset) return null;
  return {
    test: 'MCD Covariance', covariance: bestSubset.map(r => r.map(v => +v.toFixed(4))), h, n, p,
    apa: `MCD: ${p}×${p} cov based on h=${h} of n=${n}`,
  };
}
