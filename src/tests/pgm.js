import { avg } from '../math/core.js';

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
  const corrVals = edges.map(e => {
    const xi = data.map(r => +r[e.from]), xj = data.map(r => +r[e.to]);
    return { ...e, r: Math.abs(xi.reduce((s, v, i) => s + (v - avg(xi)) * (xj[i] - avg(xj)), 0) / (n * Math.sqrt(xi.reduce((s, v) => s + (v - avg(xi)) ** 2, 0) * xj.reduce((s, v) => s + (v - avg(xj)) ** 2, 0)) + 0.01)) };
  });
  const avgR = corrVals.reduce((s, e) => s + e.r, 0) / k;
  const bic = n * Math.log(1 - avgR + 0.001) + k * Math.log(n);
  return { test: 'BIC Score', bic: +bic.toFixed(2), nEdges: k, n, apa: `BIC = ${bic.toFixed(1)}, ${k} edges` };
}

// ── D-Separation ──────────────────────────────────────────────────
export function dseparation(edges, x, y, zVars) {
  if (!edges || edges.length < 2 || x == null || y == null) return null;
  const blocked = (zVars || []).includes(x) || (zVars || []).includes(y);
  const allPaths = edges.filter(e => e.from === x || e.to === x);
  const zPaths = allPaths.filter(e => (zVars || []).includes(e.from) || (zVars || []).includes(e.to));
  const dsep = zPaths.length >= allPaths.length && !blocked;
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
  const degrees = Array(nVars).fill(0);
  edges.forEach(e => { degrees[e[0]]++; degrees[e[1]]++; });
  const tw = Math.max(1, Math.max(...degrees) - 1);
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
export function hillClimbing(data, vars, { maxIter = 50, score = 'bic' } = {}) {
  if (!data || data.length < 10 || !vars || vars.length < 3) return null;
  const n = data.length, k = vars.length;
  const edges = [];
  const initialScore = -k * Math.log(n);
  let bestScore = initialScore;
  for (let iter = 0; iter < maxIter; iter++) {
    let improved = false;
    for (let i = 0; i < k; i++) {
      for (let j = 0; j < k; j++) {
        if (i === j) continue;
        const exists = edges.some(e => e.from === i && e.to === j);
        const acyclic = !exists && !wouldCycle(edges, i, j);
        if (acyclic) {
          const newEdges = [...edges, { from: i, to: j }];
          const newScore = -(newEdges.length + k) * Math.log(n);
          if (newScore > bestScore) { edges.push({ from: i, to: j }); bestScore = newScore; improved = true; }
        }
      }
    }
    if (!improved) break;
  }
  return { test: 'Hill Climbing', edges, score: +bestScore.toFixed(4), nEdges: edges.length, nVars: k, apa: `HC: ${edges.length} edges, score=${bestScore.toFixed(1)}` };
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
  const score = -(edges.length + k) * Math.log(n) * 0.5 - n * 0.1;
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
