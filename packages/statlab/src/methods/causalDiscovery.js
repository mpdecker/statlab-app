import { avg, corr, sampleVar } from '../math/core.js';
import { tPVal, chiPVal, normalCDF, normalINV, tInv2 } from '../math/distributions.js';
import { mulberry32 } from '../math/rng.js';
import { solveNormalEquations } from '../math/matrix.js';

let __rng = mulberry32(42); // reseeded per stochastic call for reproducibility

// Partial correlation test (conditional independence)
function partialCorr(x, y, z) {
  if (!z || !z.length) return corr(x, y);
  // z is [var][obs]; transpose to an n×p design matrix [obs][var], with a
  // leading intercept column — without it, the residualizing regression is
  // forced through the origin, which badly under-removes the shared linear
  // relationship with z whenever the conditioning variables aren't already
  // mean-centered (the common case for raw data).
  const rz = z[0].map((_, i) => [1, ...z.map(col => col[i])]);
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
/** @param {Array<Record<string, any>>} data @param {string[]} vars @param {string} xVar @param {string} yVar @param {string[]} zVars */
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
/** @param {Array<Record<string, any>>} data @param {string[]} vars */
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
/** @param {Array<Record<string, any>>} data @param {string[]} vars */
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
/** @param {Array<Record<string, any>>} data @param {string[]} vars */
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
/** @param {Array<Record<string, any>>} data @param {string[]} vars */
export function fciAlgorithm(data, vars, { alpha = 0.05, maxCond = 3 } = {}) {
  if (!data || data.length < 10 || !vars || vars.length < 3) return null;
  const n = data.length, k = vars.length;
  const cols = vars.map(v => data.map(r => +r[v]));
  // Conditional-independence test via partial correlation (Fisher z).
  const residSet = (yi, S) => {
    if (!S.length) { const m = avg(cols[yi]); return cols[yi].map(v => v - m); }
    const Z = data.map((_, t) => [1, ...S.map(s => cols[s][t])]);
    const kz = S.length + 1;
    const ZtZ = Array.from({ length: kz }, (_, a) => Array.from({ length: kz }, (_, b) => Z.reduce((s, r) => s + r[a] * r[b], 0)));
    const ZtY = Array.from({ length: kz }, (_, a) => Z.reduce((s, r, t) => s + r[a] * cols[yi][t], 0));
    const beta = solveNormalEquations(ZtZ, ZtY);
    return cols[yi].map((v, t) => v - Z[t].reduce((s, zz, j) => s + zz * beta[j], 0));
  };
  const indep = (i, j, S) => {
    const r = corr(residSet(i, S), residSet(j, S));
    const rr = Math.max(-0.9999, Math.min(0.9999, r));
    const z = 0.5 * Math.log((1 + rr) / (1 - rr)) * Math.sqrt(Math.max(n - S.length - 3, 1));
    const p = 2 * (1 - normalCDF(Math.abs(z)));
    return p > alpha;
  };
  // ── PC-style skeleton with separating sets ──
  const adj = Array.from({ length: k }, (_, i) => new Set(Array.from({ length: k }, (_, j) => j).filter(j => j !== i)));
  const sepset = {};
  const subsets = (arr, m) => { const out = []; const rec = (start, cur) => { if (cur.length === m) { out.push([...cur]); return; } for (let i = start; i < arr.length; i++) { cur.push(arr[i]); rec(i + 1, cur); cur.pop(); } }; rec(0, []); return out; };
  for (let d = 0; d <= maxCond; d++) {
    let any = false;
    for (let i = 0; i < k; i++) for (const j of [...adj[i]]) {
      if (j < i) continue;
      const cond = [...adj[i]].filter(x => x !== j);
      if (cond.length < d) continue;
      any = true;
      for (const S of subsets(cond, d)) {
        if (indep(i, j, S)) { adj[i].delete(j); adj[j].delete(i); sepset[i + ',' + j] = sepset[j + ',' + i] = S; break; }
      }
    }
    if (!any) break;
  }
  // ── PAG edges (initial circles) + collider orientation ──
  const edges = [];
  for (let i = 0; i < k; i++) for (const j of adj[i]) if (j > i) edges.push({ from: i, to: j, markFrom: 'o', markTo: 'o' });
  const mark = (a, b, m) => { const e = edges.find(x => (x.from === a && x.to === b) || (x.from === b && x.to === a)); if (e) { if (e.from === b) e.markFrom = m; else e.markTo = m; } };
  const colliderSet = new Set();
  for (let c = 0; c < k; c++) {
    const nb = [...adj[c]];
    for (let a = 0; a < nb.length; a++) for (let b = a + 1; b < nb.length; b++) {
      const x = nb[a], y = nb[b];
      if (adj[x].has(y)) continue;                       // unshielded triple x − c − y
      const sep = sepset[x + ',' + y] || [];
      if (!sep.includes(c)) { mark(x, c, '>'); mark(y, c, '>'); colliderSet.add(c); } // c is a collider
    }
  }
  // ── FCI rule R1: a*→c o−* b, a,b nonadjacent ⇒ orient c→b ──
  for (let it = 0; it < k; it++) {
    for (const e of edges) {
      const a = e.from, c = e.to;
      const orientR1 = (X, Y) => { // X*→Y present; look for Y o−* W with X,W nonadjacent
        for (const W of adj[Y]) { if (W === X || adj[X].has(W)) continue; const e2 = edges.find(z => (z.from === Y && z.to === W) || (z.from === W && z.to === Y)); if (!e2) continue; const yMark = e2.from === Y ? e2.markFrom : e2.markTo; if (yMark === 'o') { mark(Y, W, '>'); if (e2.from === Y) e2.markTo = '-'; else e2.markFrom = '-'; } }
      };
      if (e.markTo === '>') orientR1(a, c);
      if (e.markFrom === '>') orientR1(c, a);
    }
  }
  return { test: 'FCI Algorithm', edges, nEdges: edges.length, colliders: [...colliderSet], nVars: k, n, apa: `FCI: ${edges.length} edges, ${colliderSet.size} colliders, alpha=${alpha}` };
}
