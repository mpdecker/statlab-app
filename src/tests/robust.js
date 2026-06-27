import { avg, sampleSD, sampleVar } from '../math/core.js';

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

// ── S-Estimator ───────────────────────────────────────────────────
export function sEstimator(x, y, { bdp = 0.5, maxIter = 20 } = {}) {
  if (!x || !y || x.length < 5 || x.length !== y.length) return null;
  const n = x.length;
  const X = x.map(v => [1, v]);
  let beta = [avg(y), 0];
  for (let iter = 0; iter < maxIter; iter++) {
    const resid = y.map((yi, i) => yi - beta[0] - beta[1] * x[i]);
    const mad = madScale(resid);
    if (mad < 1e-10) break;
    const rho = resid.map(r => {
      const z = r / mad;
      const z2 = z * z;
      if (Math.abs(z) <= 1.547) return z2 / 2;
      if (Math.abs(z) <= 2.548) return 1.547 * Math.abs(z) - 1.547 * 1.547 / 2;
      return 1.547 * 2.548 - 1.547 * 1.547 / 2;
    });
    const scale = Math.sqrt(rho.reduce((s, r) => s + r, 0) / (n * bdp));
    const psi = resid.map(r => {
      const z = r / scale;
      if (Math.abs(z) <= 1) return z;
      return Math.sign(z);
    });
    const w = resid.map(r => {
      const z = r / scale;
      if (Math.abs(z) <= 1) return 1;
      return 1 / Math.abs(z);
    });
    const wx = w.reduce((s, wi, i) => s + wi * X[i][1], 0);
    const wxx = w.reduce((s, wi, i) => s + wi * X[i][1] * X[i][1], 0);
    const wy = w.reduce((s, wi, i) => s + wi * y[i], 0);
    beta[1] = wxx > 0 ? (n * w.reduce((s, wi, i) => s + wi * x[i] * y[i], 0) - wx * wy) / (n * wxx - wx * wx) : 0;
    beta[0] = w.reduce((s, wi, i) => s + wi * (y[i] - beta[1] * x[i]), 0) / w.reduce((s, wi) => s + wi, 0);
  }
  return { test: 'S-Estimator', coefficients: [{name:'intercept',b:+beta[0].toFixed(5)},{name:'slope',b:+beta[1].toFixed(5)}], n, apa: `S-est: beta=${beta[1].toFixed(3)}` };
}

// ── LTS Regression ────────────────────────────────────────────────
export function ltsRegression(x, y, { h = null } = {}) {
  if (!x || !y || x.length < 5 || x.length !== y.length) return null;
  const n = x.length;
  const hSize = h || Math.floor(n / 2);
  if (hSize < 3 || hSize > n) return null;
  let bestBeta = [0, 0], bestSS = Infinity;
  for (let trial = 0; trial < 20; trial++) {
    const subset = [...Array(n).keys()].sort(() => Math.random() - 0.5).slice(0, hSize);
    const xs = subset.map(i => x[i]), ys = subset.map(i => y[i]);
    const beta = simpleOLS(xs, ys);
    if (!beta) continue;
    const resid = y.map((yi, i) => yi - beta[0] - beta[1] * x[i]);
    const sorted = resid.map((r, i) => ({ r: r * r, i })).sort((a, b) => a.r - b.r);
    const ss = sorted.slice(0, hSize).reduce((s, v) => s + v.r, 0);
    if (ss < bestSS) { bestSS = ss; bestBeta = beta; }
  }
  return { test: 'LTS Regression', coefficients: [{name:'intercept',b:+bestBeta[0].toFixed(5)},{name:'slope',b:+bestBeta[1].toFixed(5)}], h: hSize, n, apa: `LTS: beta=${bestBeta[1].toFixed(3)}, h=${hSize}` };
}

function simpleOLS(x, y) {
  const n = x.length; let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (let i = 0; i < n; i++) { sx += x[i]; sy += y[i]; sxx += x[i] * x[i]; sxy += x[i] * y[i]; }
  const b1 = (n * sxy - sx * sy) / Math.max(n * sxx - sx * sx, 1);
  return [sy / n - b1 * sx / n, b1];
}

// ── QQ Confidence Band ────────────────────────────────────────────
export function qqConfidence(data, { nSim = 100 } = {}) {
  if (!data || data.length < 5) return null;
  const n = data.length;
  const sorted = [...data].sort((a, b) => a - b);
  const theoretical = sorted.map((_, i) => {
    const p = (i + 0.5) / n;
    return approxNormalQuantile(p);
  });
  const upper = theoretical.map(t => t + 1.96 * 0.3);
  const lower = theoretical.map(t => t - 1.96 * 0.3);
  return { test: 'QQ Confidence Band', theoretical: theoretical.map(v => +v.toFixed(4)), upper: upper.map(v => +v.toFixed(4)), lower: lower.map(v => +v.toFixed(4)), n, apa: `QQ band: 95% CI, n=${n}` };
}

function approxNormalQuantile(p) {
  if (p <= 0 || p >= 1) return 0;
  const t = Math.sqrt(-2 * Math.log(p < 0.5 ? p : 1 - p));
  const c0 = 2.515517, c1 = 0.802853, c2 = 0.010328;
  const d1 = 1.432788, d2 = 0.189269, d3 = 0.001308;
  const sign = p < 0.5 ? -1 : 1;
  return sign * (t - (c0 + c1 * t + c2 * t * t) / (1 + d1 * t + d2 * t * t + d3 * t * t * t));
}
