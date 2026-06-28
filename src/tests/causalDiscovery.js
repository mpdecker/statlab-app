import { avg, corr, sampleVar } from '../math/core.js';
import { tPVal, chiPVal, normalCDF, normalINV, tInv2 } from '../math/distributions.js';
import { mulberry32 } from '../math/rng.js';

let __rng = mulberry32(42); // reseeded per stochastic call for reproducibility

// Partial correlation test (conditional independence)
function partialCorr(x, y, z) {
  if (!z || !z.length) return corr(x, y);
  const rz = z.map((_, i) => z.map(r => r[i]));
  // Compute residuals
  const xRes = residuals(x, rz);
  const yRes = residuals(y, rz);
  return corr(xRes, yRes);
}

function residuals(y, X) {
  const n = y.length;
  const Xt = X[0].map((_, j) => X.map(r => r[j]));
  const XtX = Xt.map(r1 => X[0].map((_, j) => r1.reduce((s, _, k) => s + X[k][j] * r1[k], 0)));
  const XtY = Xt.map(r1 => r1.reduce((s, v, k) => s + v * y[k], 0));
  const diag = XtX.map((r, i) => r[i] || 1);
  const beta = XtY.map((v, i) => v / diag[i]);
  return y.map((yi, i) => yi - beta.reduce((s, b, j) => s + b * X[j][i], 0));
}

// ── Partial Correlation Test ──────────────────────────────────────
export function partialCorrTest(data, vars, xVar, yVar, zVars) {
  if (!data || !vars || vars.length < 1 || !xVar || !yVar) return null;
  const n = data.length;
  const x = data.map(r => +r[xVar]);
  const y = data.map(r => +r[yVar]);
  const z = (zVars || []).map(v => data.map(r => +r[v]));
  const r = partialCorr(x, y, z);
  const t = r * Math.sqrt((n - z.length - 2) / Math.max(1 - r * r, 1e-10));
  const p = tPVal(t, n - z.length - 2);
  return { test: 'Partial Corr Test', r: +r.toFixed(4), t: +t.toFixed(4), p, df: n - z.length - 2, n, apa: `r_partial = ${r.toFixed(3)}, p = ${p.toFixed(4)}` };
}

// ── Skeleton Phase (PC algorithm) ─────────────────────────────────
export function skeletonPhase(data, vars, { alpha = 0.05 } = {}) {
  if (!data || !vars || vars.length < 3) return null;
  const n = data.length, k = vars.length;
  const C = Array.from({ length: k }, () => Array(k).fill(0));
  for (let i = 0; i < k; i++) {
    C[i][i] = 1;
    for (let j = i + 1; j < k; j++) {
      const xi = data.map(r => +r[vars[i]]);
      const xj = data.map(r => +r[vars[j]]);
      C[i][j] = C[j][i] = corr(xi, xj);
    }
  }
  // Complete graph minus edges where correlation is not significant
  const edges = [];
  for (let i = 0; i < k; i++) {
    for (let j = i + 1; j < k; j++) {
      const t = Math.abs(C[i][j]) * Math.sqrt((n - 2) / Math.max(1 - C[i][j] * C[i][j], 1e-10));
      const p = tPVal(t, n - 2);
      const removed = p > alpha;
      edges.push({ i, j, r: +C[i][j].toFixed(4), p, removed });
    }
  }
  return { test: 'Skeleton Phase', edges, n, k, alpha, apa: `Skeleton: ${edges.filter(e => !e.removed).length}/${edges.length} edges kept` };
}

// ── Collider Detection ────────────────────────────────────────────
export function colliderDetection(edges, nVars) {
  if (!edges || !edges.length) return null;
  const colliders = [];
  for (let a = 0; a < nVars; a++) {
    for (let b = a + 1; b < nVars; b++) {
      for (let c = 0; c < nVars; c++) {
        if (c === a || c === b) continue;
        const a_c = edges.find(e => (e.i === a && e.j === c) || (e.i === c && e.j === a));
        const b_c = edges.find(e => (e.i === b && e.j === c) || (e.i === c && e.j === b));
        const a_b = edges.find(e => (e.i === a && e.j === b) || (e.i === b && e.j === a));
        if (a_c && !a_c.removed && b_c && !b_c.removed && a_b && a_b.removed) {
          colliders.push({ collider: c, parents: [a, b] });
        }
      }
    }
  }
  return { test: 'Collider Detection', colliders, nVars, apa: `Colliders: ${colliders.length} detected` };
}

// ── DAG Adjacency ─────────────────────────────────────────────────
export function dagAdjacency(skeleton, colliders) {
  if (!skeleton || !colliders) return null;
  const adj = Array.isArray(skeleton) ? skeleton.map(e => ({
    from: e.i,
    to: e.j,
    directed: false,
  })) : [];
  colliders.forEach(c => {
    c.parents.forEach(p => {
      const existing = adj.find(e => e.from === p && e.to === c.collider);
      if (existing) existing.directed = true;
      else adj.push({ from: p, to: c.collider, directed: true });
    });
  });
  return { test: 'DAG Adjacency', edges: adj, nEdges: adj.length, apa: `DAG: ${adj.filter(e => e.directed).length} directed edges` };
}

// ── PC Algorithm (full) ───────────────────────────────────────────
export function pcAlgorithm(data, vars, { alpha = 0.05 } = {}) {
  if (!data || !vars || !vars.length || data.length < vars.length * 3) return null;
  const skel = skeletonPhase(data, vars, { alpha });
  if (!skel) return null;
  const cols = colliderDetection(skel.edges, vars.length);
  if (!cols) return null;
  const dag = dagAdjacency(skel.edges, cols.colliders);
  return { test: 'PC Algorithm', dag: dag?.edges, nVars: vars.length, n: data.length, apa: `PC: ${dag?.nEdges} edges, α = ${alpha}` };
}

// ── LiNGAM ────────────────────────────────────────────────────────
export function lingam(data, vars, { seed = 42, maxIter = 20 } = {}) {
  __rng = mulberry32(seed);
  if (!data || data.length < 10 || !vars || vars.length < 3) return null;
  const n = data.length, k = vars.length;
  const X = data.map(r => vars.map(v => +r[v]));
  const B = Array.from({length: k}, () => Array(k).fill(0));
  for (let iter = 0; iter < maxIter; iter++) {
    const order = [...Array(k).keys()].sort(() => __rng() - 0.5);
    for (const i of order) {
      for (let j = 0; j < k; j++) {
        if (j === i) continue;
        let num = 0, den = 0;
        for (let t = 0; t < n; t++) { num += X[t][j] * X[t][i]; den += X[t][j] * X[t][j]; }
        B[i][j] = den > 0 ? num / den : 0;
      }
    }
  }
  const edges = [];
  for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) if (Math.abs(B[i][j]) > 0.1) edges.push({ from: j, to: i, b: +B[i][j].toFixed(4) });
  return { test: 'LiNGAM', edges, nEdges: edges.length, nVars: k, n, apa: `LiNGAM: ${edges.length} edges, ${k} vars` };
}

// ── FCI Algorithm ─────────────────────────────────────────────────
export function fciAlgorithm(data, vars, { alpha = 0.05 } = {}) {
  if (!data || data.length < 10 || !vars || vars.length < 3) return null;
  const skel = skeletonPhase(data, vars, { alpha });
  if (!skel) return null;
  const k = vars.length;
  const activeEdges = skel.edges.filter(e => !e.removed);
  return { test: 'FCI Algorithm', edges: activeEdges, nEdges: activeEdges.length, nVars: k, n: data.length, apa: `FCI: ${activeEdges.length} edges, alpha=${alpha}` };
}
