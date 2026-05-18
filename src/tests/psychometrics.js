import { avg, sampleVar, corr, fmtP } from '../math/core.js';
import { jacobiEigen } from '../math/matrix.js';
import { mulberry32, boxMullerN } from '../math/rng.js';
import { pca } from './multivariate.js';

function sigmoid(z) {
  const c = Math.max(-20, Math.min(20, z));
  return 1 / (1 + Math.exp(-c));
}

function corrMatrixFromItems(matrix) {
  const k = matrix[0]?.length;
  if (!k) return null;
  return Array.from({ length: k }, (_, i) =>
    Array.from({ length: k }, (_, j) => +(corr(matrix.map(r => r[i]), matrix.map(r => r[j]))).toFixed(6)));
}

/** McDonald's ω (total) from 1-factor model on item correlation matrix */
export function omegaMcDonald(matrix) {
  const k = matrix[0]?.length;
  const n = matrix.length;
  if (!k || k < 2 || n < k + 3) return null;
  const R = corrMatrixFromItems(matrix);
  if (!R) return null;
  const { eigenvalues, eigenvectors } = jacobiEigen(R);
  const loadings = eigenvectors[0].map(v => v * Math.sqrt(Math.max(eigenvalues[0], 0)));
  const uniq = R.map((_, i) => Math.max(1e-6, 1 - loadings[i] ** 2));
  const sumL = loadings.reduce((s, l) => s + l, 0);
  const omegaT = (sumL ** 2) / ((sumL ** 2) + uniq.reduce((s, u) => s + u, 0));
  const omegaH = (sumL ** 2) / (sumL ** 2 + uniq.reduce((s, u) => s + u, 0));
  const label = omegaT >= .9 ? 'excellent' : omegaT >= .8 ? 'good' : omegaT >= .7 ? 'acceptable' : 'questionable';
  return {
    test: "McDonald's ω",
    omegaTotal: +omegaT.toFixed(4),
    omegaHierarchical: +omegaH.toFixed(4),
    label, k, n,
    loadings: loadings.map(l => +l.toFixed(4)),
    apa: `ω = ${omegaT.toFixed(3)} [${label}], k = ${k}, N = ${n}`,
  };
}

/** Parallel analysis (Monte Carlo) — compare data eigenvalues to random */
export function parallelAnalysis(data, vars, nReps = 40, seed = 42) {
  const matrix = data.filter(r => vars.every(v => Number.isFinite(+r[v]))).map(r => vars.map(v => +r[v]));
  const n = matrix.length;
  const p = vars.length;
  if (n < p + 5 || p < 2) return null;
  const pcaRes = pca(data, vars);
  if (!pcaRes) return null;
  const dataEv = pcaRes.eigenvaluesRaw;
  const rand = mulberry32(seed ?? 42);
  const randMeans = Array(p).fill(0);
  for (let rep = 0; rep < nReps; rep++) {
    const Z = Array.from({ length: n }, () =>
      Array.from({ length: p }, () => boxMullerN(rand)));
    const R = Array.from({ length: p }, (_, i) =>
      Array.from({ length: p }, (_, j) => corr(Z.map(r => r[i]), Z.map(r => r[j]))));
    const { eigenvalues } = jacobiEigen(R);
    eigenvalues.forEach((e, i) => { randMeans[i] += e / nReps; });
  }
  const retain = dataEv.map((e, i) => e > randMeans[i]).filter(Boolean).length;
  const scree = dataEv.map((e, i) => ({
    pc: i + 1,
    data: +e.toFixed(4),
    random: +randMeans[i].toFixed(4),
    retain: e > randMeans[i],
  }));
  return {
    test: 'Parallel Analysis',
    nFactors: retain,
    scree,
    n, p, vars,
    apa: `Parallel analysis suggests ${retain} factor${retain !== 1 ? 's' : ''} (λ_data > λ_random), p = ${p}, N = ${n}`,
  };
}

/** Rasch 1PL — joint ML difficulties (discrimination fixed at 1) */
export function irtRasch1PL(matrix) {
  const n = matrix.length;
  const k = matrix[0]?.length;
  if (!n || !k || n < 10) return null;
  const Y = matrix.map(r => r.map(v => (v > 0 ? 1 : 0)));
  let b = Array(k).fill(0);
  let theta = Array(n).fill(0);
  for (let it = 0; it < 80; it++) {
    for (let i = 0; i < n; i++) {
      let num = 0;
      let den = 0;
      for (let j = 0; j < k; j++) {
        const p = sigmoid(theta[i] - b[j]);
        num += Y[i][j] - p;
        den += p * (1 - p);
      }
      theta[i] += (den > 1e-8 ? num / den : 0) * 0.5;
    }
    for (let j = 0; j < k; j++) {
      let num = 0;
      let den = 0;
      for (let i = 0; i < n; i++) {
        const p = sigmoid(theta[i] - b[j]);
        num += Y[i][j] - p;
        den += p * (1 - p);
      }
      b[j] += (den > 1e-8 ? num / den : 0) * 0.5;
    }
    const m = avg(b);
    b = b.map(x => x - m);
    theta = theta.map(x => x - avg(theta));
  }
  const difficulties = b.map((v, j) => ({ item: j + 1, b: +v.toFixed(4) }));
  const icc = Array.from({ length: 41 }, (_, t) => {
    const th = -4 + t * 0.2;
    return {
      theta: +th.toFixed(2),
      curves: b.map(bj => +sigmoid(th - bj).toFixed(4)),
    };
  });
  return {
    test: 'IRT Rasch (1PL)',
    difficulties,
    thetaMean: +avg(theta).toFixed(4),
    thetaSD: +Math.sqrt(sampleVar(theta)).toFixed(4),
    n, k,
    icc,
    apa: `Rasch 1PL: k = ${k} items, N = ${n}, difficulty range [${Math.min(...b).toFixed(2)}, ${Math.max(...b).toFixed(2)}]`,
  };
}

/** 2PL IRT — per-item a and b (simplified JML) */
export function irt2PL(matrix) {
  const n = matrix.length;
  const k = matrix[0]?.length;
  if (!n || !k || n < 15) return null;
  const Y = matrix.map(r => r.map(v => (v > 0 ? 1 : 0)));
  let a = Array(k).fill(1);
  let b = Array(k).fill(0);
  let theta = Array(n).fill(0);
  for (let it = 0; it < 60; it++) {
    for (let i = 0; i < n; i++) {
      let upd = 0;
      let w = 0;
      for (let j = 0; j < k; j++) {
        const z = a[j] * (theta[i] - b[j]);
        const p = sigmoid(z);
        const err = Y[i][j] - p;
        upd += a[j] * err;
        w += a[j] ** 2 * p * (1 - p);
      }
      theta[i] += (w > 1e-8 ? upd / w : 0) * 0.4;
    }
    for (let j = 0; j < k; j++) {
      let updB = 0;
      let updA = 0;
      let wB = 0;
      let wA = 0;
      for (let i = 0; i < n; i++) {
        const z = a[j] * (theta[i] - b[j]);
        const p = sigmoid(z);
        const err = Y[i][j] - p;
        updB += a[j] * err;
        wB += a[j] ** 2 * p * (1 - p);
        updA += (theta[i] - b[j]) * err;
        wA += (theta[i] - b[j]) ** 2 * p * (1 - p);
      }
      b[j] += (wB > 1e-8 ? updB / wB : 0) * 0.4;
      a[j] = Math.max(0.2, a[j] + (wA > 1e-8 ? updA / wA : 0) * 0.2);
    }
  }
  const items = a.map((aj, j) => ({ item: j + 1, a: +aj.toFixed(4), b: +b[j].toFixed(4) }));
  const icc = Array.from({ length: 41 }, (_, t) => {
    const th = -4 + t * 0.2;
    return {
      theta: +th.toFixed(2),
      curves: items.map(it => +sigmoid(it.a * (th - it.b)).toFixed(4)),
    };
  });
  return {
    test: 'IRT 2PL',
    items,
    n, k,
    icc,
    apa: `2PL IRT: k = ${k}, N = ${n}; discrimination M = ${avg(a).toFixed(2)}`,
  };
}

/** Composite scale scoring (sum/mean) with optional reverse coding */
export function scaleScore(matrix, { method = 'sum', reverseIdx = [] } = {}) {
  const k = matrix[0]?.length;
  const n = matrix.length;
  if (!k || n < 1) return null;
  const revSet = new Set(reverseIdx);
  const scoreRows = matrix.map(row => {
    const adj = row.map((v, j) => {
      let x = +v;
      if (revSet.has(j)) {
        const col = matrix.map(r => +r[j]).filter(Number.isFinite);
        const lo = Math.min(...col);
        const hi = Math.max(...col);
        x = hi + lo - x;
      }
      return x;
    });
    const s = method === 'mean' ? avg(adj) : adj.reduce((a, b) => a + b, 0);
    return +s.toFixed(4);
  });
  const scores = scoreRows;
  return {
    test: 'Scale Scoring',
    method,
    nReversed: reverseIdx.length,
    scores: scores.slice(0, 200),
    mean: +avg(scores).toFixed(4),
    sd: +Math.sqrt(sampleVar(scores)).toFixed(4),
    n, k,
    apa: `${method === 'mean' ? 'Mean' : 'Sum'} composite: M = ${avg(scores).toFixed(2)}, SD = ${Math.sqrt(sampleVar(scores)).toFixed(2)}, k = ${k}, N = ${n}`,
  };
}
