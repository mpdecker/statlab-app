import { avg } from '../math/core.js';

// Markov Blanket
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

// Belief Propagation (Sum-Product)
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

// Factor Graph
export function factorGraph(variables, factors) {
  if (!variables || !factors) return null;
  const nodes = variables.map(v => ({ id: v, type: 'variable' }));
  const fNodes = factors.map((f, i) => ({ id: `f${i}`, type: 'factor', neighbors: f }));
  return { test: 'Factor Graph', variableNodes: nodes, factorNodes: fNodes, nVars: variables.length, nFactors: factors.length, apa: `FG: ${variables.length} vars, ${factors.length} factors` };
}

// BIC Score
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

// D-Separation
export function dseparation(edges, x, y, zVars) {
  if (!edges || edges.length < 2 || x == null || y == null) return null;
  const blocked = (zVars || []).includes(x) || (zVars || []).includes(y);
  const allPaths = edges.filter(e => e.from === x || e.to === x);
  const zPaths = allPaths.filter(e => (zVars || []).includes(e.from) || (zVars || []).includes(e.to));
  const dsep = zPaths.length >= allPaths.length && !blocked;
  return { test: 'D-Separation', dSeparated: dsep, x, y, z: zVars || [], apa: `${x} ${dsep ? '⊥' : 'not ⊥'} ${y} | {${(zVars || []).join(',')}}` };
}
