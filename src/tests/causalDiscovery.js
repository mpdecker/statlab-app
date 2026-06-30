import { avg, corr, sampleVar } from '../math/core.js';
import { tPVal, chiPVal, normalCDF, normalINV, tInv2 } from '../math/distributions.js';
import { mulberry32 } from '../math/rng.js';
import { solveNormalEquations } from '../math/matrix.js';

let __rng = mulberry32(42); // reseeded per stochastic call for reproducibility

// Partial correlation test (conditional independence)
function partialCorr(x, y, z) {
  if (!z || !z.length) return corr(x, y);
  // z is [var][obs]; transpose to an n×p design matrix [obs][var].
  const rz = z[0].map((_, i) => z.map(col => col[i]));
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
  const beta = solveNormalEquations(XtX, XtY);
  return y.map((yi, i) => yi - beta.reduce((s, b, j) => s + b * X[i][j], 0));
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
export function lingam(data, vars, { seed = 42, threshold = 0.15 } = {}) {
  if (!data || data.length < 10 || !vars || vars.length < 3) return null;
  const k = vars.length;
  // DirectLiNGAM (Shimizu et al. 2011): find the causal order by repeatedly
  // selecting the most exogenous variable — the one least dependent on the
  // residuals of the others regressed on it — then deflate. Dependence is the
  // (model-free) distance correlation, so the procedure exploits non-Gaussianity.
  const X = data.map(r => vars.map(v => +r[v]));
  const col = j => X.map(r => r[j]);
  const sub = X.length > 250 ? X.filter((_, i) => i % Math.ceil(X.length / 250) === 0) : X; // cap dCor cost
  const stdz = c => { const m = avg(c); const sd = Math.sqrt(avg(c.map(v => (v - m) ** 2))) || 1; return c.map(v => (v - m) / sd); };
  const residOf = (y, x) => { const cov = y.reduce((a, v, t) => a + v * x[t], 0), vx = x.reduce((a, v) => a + v * v, 0); const b = vx > 0 ? cov / vx : 0; return y.map((v, t) => v - b * x[t]); };
  const dcov2 = (x, y) => {
    const m = x.length;
    const A = x.map(xi => x.map(xj => Math.abs(xi - xj)));
    const B = y.map(yi => y.map(yj => Math.abs(yi - yj)));
    const dbl = M => { const rm = M.map(r => avg(r)); const gm = avg(rm); return M.map((r, i) => r.map((v, j) => v - rm[i] - rm[j] + gm)); };
    const Ac = dbl(A), Bc = dbl(B); let s = 0; for (let i = 0; i < m; i++) for (let j = 0; j < m; j++) s += Ac[i][j] * Bc[i][j]; return s / (m * m);
  };
  const dcor = (x, y) => { const vx = dcov2(x, x), vy = dcov2(y, y), c = dcov2(x, y); return vx * vy > 0 ? Math.sqrt(Math.abs(c) / Math.sqrt(vx * vy)) : 0; };

  // Causal order via DirectLiNGAM on a (subsampled) standardized working copy.
  let work = vars.map((_, j) => stdz(sub.map(r => r[j])));
  let active = vars.map((_, j) => j);
  const order = [];
  while (active.length > 1) {
    let best = active[0], bestScore = Infinity;
    for (const mm of active) {
      let T = 0;
      for (const j of active) { if (j === mm) continue; T += dcor(work[mm], residOf(work[j], work[mm])); }
      if (T < bestScore) { bestScore = T; best = mm; }
    }
    order.push(best);
    work = work.map((c, i) => (active.includes(i) && i !== best ? stdz(residOf(c, work[best])) : c));
    active = active.filter(i => i !== best);
  }
  order.push(active[0]);

  // Structural coefficients: regress each variable on its predecessors in the
  // causal order (its potential parents) by OLS; keep edges above threshold.
  const edges = [];
  for (let oi = 1; oi < k; oi++) {
    const child = order[oi];
    const parents = order.slice(0, oi);
    const Z = X.map(r => [1, ...parents.map(p => r[p])]);
    const y = col(child);
    const kz = parents.length + 1;
    const ZtZ = Array.from({ length: kz }, (_, a) => Array.from({ length: kz }, (_, b) => Z.reduce((s, r) => s + r[a] * r[b], 0)));
    const ZtY = Array.from({ length: kz }, (_, a) => Z.reduce((s, r, i) => s + r[a] * y[i], 0));
    const beta = solveNormalEquations(ZtZ, ZtY);
    parents.forEach((p, idx) => { if (Math.abs(beta[1 + idx]) > threshold) edges.push({ from: p, to: child, b: +beta[1 + idx].toFixed(4) }); });
  }
  return { test: 'LiNGAM', edges, nEdges: edges.length, causalOrder: order, nVars: k, n: data.length, apa: `LiNGAM (DirectLiNGAM): ${edges.length} edges, ${k} vars` };
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
