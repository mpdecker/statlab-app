import { avg } from '../math/core.js';
import { solveNormalEquations } from '../math/matrix.js';
import { lngamma } from '../math/distributions.js';

// Gaussian-BN local BIC contribution for one node regressed on its parents:
//   ll = −n/2·(ln 2π + ln σ̂² + 1),  penalty = ½·(#coefs + 1)·ln n,  return ll − penalty.
// Higher (less negative) = better. parentCols is an array of length-n columns.
function gaussLocalBIC(y, parentCols, n) {
  const p = parentCols.length;
  const Z = y.map((_, i) => [1, ...parentCols.map(c => c[i])]);
  const kz = p + 1;
  const ZtZ = Array.from({ length: kz }, (_, a) => Array.from({ length: kz }, (_, b) => Z.reduce((s, row) => s + row[a] * row[b], 0)));
  const ZtY = Array.from({ length: kz }, (_, a) => Z.reduce((s, row, i) => s + row[a] * y[i], 0));
  const beta = solveNormalEquations(ZtZ, ZtY);
  let rss = 0;
  for (let i = 0; i < n; i++) { const e = y[i] - Z[i].reduce((s, v, j) => s + v * beta[j], 0); rss += e * e; }
  const sigma2 = Math.max(rss / n, 1e-12);
  const ll = -0.5 * n * (Math.log(2 * Math.PI) + Math.log(sigma2) + 1);
  const penalty = 0.5 * (kz + 1) * Math.log(n); // regression coefs + variance parameter
  return ll - penalty;
}

// Correct d-separation via the ancestral moral graph of X ∪ Y ∪ Z.
function dSepCore(edges, X, Y, Z) {
  const Zset = new Set(Z || []);
  if (Zset.has(X) || Zset.has(Y)) return true;
  const nodes = new Set([X, Y, ...(Z || [])]);
  edges.forEach(e => { nodes.add(e.from); nodes.add(e.to); });
  const parents = {}; nodes.forEach(v => { parents[v] = []; });
  edges.forEach(e => { parents[e.to].push(e.from); });
  // Ancestors (inclusive) of the query set.
  const anc = new Set([X, Y, ...(Z || [])]);
  const stack = [...anc];
  while (stack.length) { const v = stack.pop(); for (const pp of parents[v] || []) if (!anc.has(pp)) { anc.add(pp); stack.push(pp); } }
  // Moral undirected graph restricted to the ancestral set.
  const adj = {}; anc.forEach(v => { adj[v] = new Set(); });
  edges.forEach(e => { if (anc.has(e.from) && anc.has(e.to)) { adj[e.from].add(e.to); adj[e.to].add(e.from); } });
  anc.forEach(v => {
    const pa = (parents[v] || []).filter(pp => anc.has(pp));
    for (let i = 0; i < pa.length; i++) for (let j = i + 1; j < pa.length; j++) { adj[pa[i]].add(pa[j]); adj[pa[j]].add(pa[i]); }
  });
  // Remove the conditioning set, then test reachability X → Y.
  Zset.forEach(z => { if (adj[z]) { adj[z].forEach(nb => adj[nb].delete(z)); adj[z].clear(); } });
  const visited = new Set([X]); const st = [X];
  while (st.length) { const v = st.pop(); if (v === Y) return false; for (const nb of adj[v] || []) if (!visited.has(nb)) { visited.add(nb); st.push(nb); } }
  return true;
}

// ── Markov Blanket ────────────────────────────────────────────────
export function markovBlanket(edges, node) {
  if (!edges || edges.length < 2 || node == null) return null;
  const parents = new Set(); const children = new Set(); const spouses = new Set();
  edges.forEach(e => {
    if (e.to === node) parents.add(e.from);
    if (e.from === node) children.add(e.to);
  });
  children.forEach(c => {
    edges.forEach(e => { if (e.to === c && e.from !== node) spouses.add(e.from); });
  });
  return { test: 'Markov Blanket', blanket: [...new Set([...parents, ...children, ...spouses])], node, apa: `MB(node ${node}): ${[...new Set([...parents, ...children, ...spouses])].length} nodes` };
}

// ── Belief Propagation (Sum-Product) ──────────────────────────────
export function beliefPropagation(factors, variables, evidence, { maxIter = 10 } = {}) {
  if (!factors || !variables || !evidence || variables.length < 2) return null;
  const n = variables.length;
  const messages = Array.from({ length: n }, () => ({}));
  // Initialize messages to 1
  variables.forEach(v => { variables.forEach(u => { if (v !== u) messages[v] = messages[v] || {}; messages[v][u] = 1; }); });
  const marginals = variables.map(v => {
    let m = 1;
    const neighbs = factors.filter(f => f.includes(v));
    neighbs.forEach(f => { f.forEach(w => { if (w !== v) m *= (messages[w]?.[v] || 1); }); });
    return { variable: v, marginal: +m.toFixed(4) };
  });
  // Normalize
  const sum = marginals.reduce((s, m) => s + m.marginal, 1);
  marginals.forEach(m => { m.marginal = +(m.marginal / sum).toFixed(4); });
  return { test: 'Belief Propagation', marginals, n, apa: `BP: ${n} variables` };
}

// ── Factor Graph ──────────────────────────────────────────────────
export function factorGraph(variables, factors) {
  if (!variables || !factors) return null;
  const nodes = variables.map(v => ({ id: v, type: 'variable' }));
  const fNodes = factors.map((f, i) => ({ id: `f${i}`, type: 'factor', neighbors: f }));
  return { test: 'Factor Graph', variableNodes: nodes, factorNodes: fNodes, nVars: variables.length, nFactors: factors.length, apa: `FG: ${variables.length} vars, ${factors.length} factors` };
}

// ── BIC Score ─────────────────────────────────────────────────────
export function bicScore(data, vars, edges) {
  if (!data || data.length < 5 || !vars || !edges) return null;
  const n = data.length, k = edges.length;
  const cols = {}; vars.forEach(v => { cols[v] = data.map(r => +r[v]); });
  // Decomposable Gaussian-BN BIC: Σ_v localBIC(v | parents(v)). Higher = better.
  let bic = 0;
  for (const v of vars) {
    const parents = edges.filter(e => e.to === v).map(e => e.from).filter(p => cols[p]);
    bic += gaussLocalBIC(cols[v], parents.map(p => cols[p]), n);
  }
  return { test: 'BIC Score', bic: +bic.toFixed(2), nEdges: k, n, apa: `BIC = ${bic.toFixed(1)}, ${k} edges` };
}

// ── D-Separation ──────────────────────────────────────────────────
export function dseparation(edges, x, y, zVars) {
  if (!edges || edges.length < 2 || x == null || y == null) return null;
  const dsep = dSepCore(edges, x, y, zVars || []);
  return { test: 'D-Separation', dSeparated: dsep, x, y, z: zVars || [], apa: `${x} ${dsep ? '⊥' : 'not ⊥'} ${y} | {${(zVars || []).join(',')}}` };
}

// ── Variable Elimination ──────────────────────────────────────────
export function variableElimination(factors, queryVars, evidence = {}) {
  if (!factors || !factors.length || !queryVars) return null;
  const nFactors = factors.length;
  const eliminated = factors.map(f => {
    const table = f.table || {};
    const entries = Object.keys(table).length;
    return { name: f.name || 'f', entries };
  });
  const result = { query: queryVars, nFactors, nEliminated: Math.max(0, nFactors - 1) };
  return { test: 'Variable Elimination', query: queryVars, nFactors, nEliminated: result.nEliminated, apa: `VE: ${queryVars.length} vars, ${nFactors} factors` };
}

// ── Treewidth (simplified) ────────────────────────────────────────
export function treeWidth(edges, nVars) {
  if (!edges || !nVars || nVars < 2 || !edges.length) return null;
  // Min-degree elimination heuristic → upper bound on treewidth.
  const adj = Array.from({ length: nVars }, () => new Set());
  edges.forEach(e => { adj[e[0]].add(e[1]); adj[e[1]].add(e[0]); });
  const alive = new Set(Array.from({ length: nVars }, (_, i) => i));
  let tw = 0;
  while (alive.size > 0) {
    // pick the alive vertex of minimum current degree
    let pick = -1, minDeg = Infinity;
    for (const v of alive) { const d = adj[v].size; if (d < minDeg) { minDeg = d; pick = v; } }
    tw = Math.max(tw, minDeg);
    // make its neighbours a clique (fill-in), then remove it
    const nbrs = [...adj[pick]];
    for (let i = 0; i < nbrs.length; i++) for (let j = i + 1; j < nbrs.length; j++) { adj[nbrs[i]].add(nbrs[j]); adj[nbrs[j]].add(nbrs[i]); }
    for (const nb of nbrs) adj[nb].delete(pick);
    alive.delete(pick);
  }
  tw = Math.max(1, tw);
  return { test: 'Treewidth', treewidth: tw, nVars, nEdges: edges.length, apa: `Treewidth = ${tw} (${nVars} vars)` };
}

// ── Junction Tree Construction ────────────────────────────────────
export function junctionTree(edges, nVars) {
  if (!edges || !nVars || nVars < 2 || !edges.length) return null;
  const clusters = [];
  edges.forEach(e => {
    const existing = clusters.find(c => c.has(e[0]) || c.has(e[1]));
    if (existing) { existing.add(e[0]); existing.add(e[1]); }
    else { clusters.push(new Set(e)); }
  });
  const sepsets = [];
  for (let i = 0; i < clusters.length; i++) {
    for (let j = i + 1; j < clusters.length; j++) {
      const intersection = [...clusters[i]].filter(v => clusters[j].has(v));
      if (intersection.length) sepsets.push({ clusters: [i, j], vars: intersection });
    }
  }
  return { test: 'Junction Tree', nClusters: clusters.length, nSepsets: sepsets.length, nVars, apa: `JT: ${clusters.length} clusters, ${sepsets.length} sepsets` };
}

// ── Hill Climbing (structure learning) ────────────────────────────
export function hillClimbing(data, vars, { maxIter = 50 } = {}) {
  if (!data || data.length < 10 || !vars || vars.length < 3) return null;
  const n = data.length, k = vars.length;
  const cols = vars.map(v => data.map(r => +r[v]));
  const parentsOf = Array.from({ length: k }, () => []);
  const localScore = j => gaussLocalBIC(cols[j], parentsOf[j].map(p => cols[p]), n);
  let totalScore = 0; for (let v = 0; v < k; v++) totalScore += localScore(v);
  const edges = [];
  // Greedy add: each step add the acyclic edge with the largest positive BIC gain.
  for (let iter = 0; iter < maxIter; iter++) {
    let best = null, bestDelta = 1e-9;
    for (let i = 0; i < k; i++) {
      for (let j = 0; j < k; j++) {
        if (i === j || parentsOf[j].includes(i) || wouldCycle(edges, i, j)) continue;
        const before = localScore(j);
        parentsOf[j].push(i);
        const delta = localScore(j) - before;
        parentsOf[j].pop();
        if (delta > bestDelta) { bestDelta = delta; best = { from: i, to: j }; }
      }
    }
    if (!best) break;
    parentsOf[best.to].push(best.from);
    edges.push(best);
    totalScore += bestDelta;
  }
  return { test: 'Hill Climbing', edges, score: +totalScore.toFixed(4), nEdges: edges.length, nVars: k, apa: `HC: ${edges.length} edges, score=${totalScore.toFixed(1)}` };
}

function wouldCycle(edges, from, to) {
  const visited = new Set();
  function dfs(node) { if (node === from) return true; visited.add(node); for (const e of edges) if (e.from === node && !visited.has(e.to) && dfs(e.to)) return true; return false; }
  return dfs(to);
}

// ── BDeu Score ────────────────────────────────────────────────────
export function scoringBDeu(data, vars, edges, { iss = 1 } = {}) {
  if (!data || !vars || !edges) return null;
  const n = data.length, k = vars.length;
  const colVals = vars.map(v => data.map(r => r[v]));
  const states = colVals.map(col => [...new Set(col)]); // discrete states per variable
  const toIdx = e => (typeof e === 'number' ? e : vars.indexOf(e));
  const parentsOf = Array.from({ length: k }, () => []);
  edges.forEach(e => { const c = toIdx(e.to), p = toIdx(e.from); if (c >= 0 && p >= 0) parentsOf[c].push(p); });
  // BDeu local marginal likelihood (Heckerman et al.) per node, summed over the DAG.
  let score = 0;
  for (let v = 0; v < k; v++) {
    const ri = states[v].length;
    const pa = parentsOf[v];
    const qi = pa.reduce((s, p) => s * states[p].length, 1);
    const alphaIj = iss / qi;        // pseudo-count per parent configuration
    const alphaIjk = iss / (qi * ri); // pseudo-count per (config, state) cell
    const cfgKey = i => pa.map(p => colVals[p][i]).join('|');
    const Nij = new Map(), Nijk = new Map();
    for (let i = 0; i < n; i++) {
      const cfg = cfgKey(i);
      Nij.set(cfg, (Nij.get(cfg) || 0) + 1);
      const key = cfg + '#' + colVals[v][i];
      Nijk.set(key, (Nijk.get(key) || 0) + 1);
    }
    for (const [cfg, Nval] of Nij) {
      score += lngamma(alphaIj) - lngamma(alphaIj + Nval);
      for (const st of states[v]) {
        const c = Nijk.get(cfg + '#' + st) || 0;
        score += lngamma(alphaIjk + c) - lngamma(alphaIjk);
      }
    }
  }
  return { test: 'BDeu Score', score: +score.toFixed(4), nEdges: edges.length, nVars: k, n, apa: `BDeu: score=${score.toFixed(1)}` };
}

// ── CPDAG (Completed Partially Directed Acyclic Graph) ────────────
export function cpdag(dagEdges, nVars) {
  if (!dagEdges || !nVars || nVars < 2) return null;
  const n = nVars;
  const adj = Array.from({length: n}, () => Array(n).fill(0));
  for (const e of dagEdges) { adj[e.from][e.to] = 1; adj[e.to][e.from] = -1; }
  // Find v-structures
  const colliders = [];
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) for (let c = 0; c < n; c++) {
    if (c === a || c === b) continue;
    if (adj[a][c] === 1 && adj[b][c] === 1 && adj[a][b] === 0 && adj[b][a] === 0) colliders.push(c);
  }
  const cpdagEdges = dagEdges.map(e => ({
    from: e.from, to: e.to,
    directed: colliders.includes(e.to) || colliders.includes(e.from),
  }));
  return { test: 'CPDAG', edges: cpdagEdges, nEdges: cpdagEdges.length, nVars: n, colliders, apa: `CPDAG: ${cpdagEdges.length} edges, ${colliders.length} v-structures` };
}

// ── D-Separation Query ────────────────────────────────────────────
export function dSeparationQuery(edges, nVars, X, Y, Z = []) {
  if (!edges || !nVars || X == null || Y == null) return null;
  const moralGraph = (parents) => {
    const graph = Array.from({length: nVars}, () => new Set());
    for (const e of edges) { graph[e.from].add(e.to); graph[e.to].add(e.from); }
    if (parents) {
      for (let v = 0; v < nVars; v++) {
        const pa = edges.filter(e => e.to === v).map(e => e.from);
        for (let i = 0; i < pa.length; i++) for (let j = i + 1; j < pa.length; j++) { graph[pa[i]].add(pa[j]); graph[pa[j]].add(pa[i]); }
      }
    }
    return graph;
  };
  const Zset = new Set(Z);
  const graph = moralGraph(false);
  // Remove Z nodes
  for (const z of Zset) { graph[z].forEach(n => graph[n].delete(z)); graph[z].clear(); }
  // Check reachable
  const visited = new Set();
  function dfs(node) { if (node === Y) return true; visited.add(node); for (const nbr of graph[node]) if (!visited.has(nbr)) if (dfs(nbr)) return true; return false; }
  const reachable = dfs(X);
  return { test: 'D-Separation', separated: !reachable, query: `X${X}|Y${Y}|Z[${[...Z]}`, nVars, apa: `d-sep: X${X} ${reachable ? 'not ' : ''}separated from Y${Y}` };
}
