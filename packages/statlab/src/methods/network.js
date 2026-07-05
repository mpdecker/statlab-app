import { avg } from '../math/core.js';
import { jacobiEigen } from '../math/matrix.js';
import { mulberry32 } from '../math/rng.js';

let __rng = mulberry32(42); // reseeded per stochastic call for reproducibility

/** Build symmetric adjacency from edge list or correlation threshold */
export function adjacencyFromEdges(nodes, edges, undirected = true) {
  const idx = Object.fromEntries(nodes.map((n, i) => [String(n), i]));
  const n = nodes.length;
  const A = Array.from({ length: n }, () => Array(n).fill(0));
  edges.forEach(({ from, to, weight = 1 }) => {
    const i = idx[String(from)];
    const j = idx[String(to)];
    if (i == null || j == null) return;
    A[i][j] += weight;
    if (undirected) A[j][i] += weight;
  });
  return A;
}

/** Centrality measures on adjacency matrix */

// ── Centrality Measures ───────────────────────────────────────────
export function centralityMeasures(A) {
  const n = A.length;
  if (!n) return null;
  const degree = A.map((row, i) => row.reduce((s, v, j) => s + (i !== j ? v : 0), 0));
  const maxDeg = Math.max(...degree, 1);

  const eig = jacobiEigen(A.map((row, i) => row.map((v, j) => (i === j ? 0 : v))));
  const eigenCent = eig.eigenvectors[0].map(v => Math.abs(v));
  const eMax = Math.max(...eigenCent, 1e-9);
  const eigenNorm = eigenCent.map(v => v / eMax);

  // Betweenness centrality via Brandes' algorithm (Brandes 2001) — the
  // previous code approximated a shortest-path predecessor with "any node v
  // at distance[t]-1", which is not sufficient (many nodes can sit at the
  // right distance level without actually lying on a shortest s→t path),
  // and massively overcounted: on a 6-node test graph it gave node 2 a raw
  // betweenness of 30 when the theoretical per-node maximum for n=6 is 10,
  // and gave nodes with a TRUE betweenness of 0 large nonzero scores.
  // Brandes correctly tracks real predecessor sets and accumulates
  // dependency scores in reverse BFS order. Verified against
  // networkx.betweenness_centrality.
  const between = Array(n).fill(0);
  for (let s = 0; s < n; s++) {
    const dist = Array(n).fill(-1);
    const sigma = Array(n).fill(0);
    const preds = Array.from({ length: n }, () => []);
    const order = [];
    dist[s] = 0; sigma[s] = 1;
    const q = [s];
    while (q.length) {
      const v = q.shift();
      order.push(v);
      for (let w = 0; w < n; w++) {
        if (!A[v][w] || v === w) continue;
        if (dist[w] < 0) { dist[w] = dist[v] + 1; q.push(w); }
        if (dist[w] === dist[v] + 1) { sigma[w] += sigma[v]; preds[w].push(v); }
      }
    }
    const delta = Array(n).fill(0);
    for (let i = order.length - 1; i >= 0; i--) {
      const w = order[i];
      for (const v of preds[w]) delta[v] += (sigma[v] / sigma[w]) * (1 + delta[w]);
      if (w !== s) between[w] += delta[w];
    }
  }
  // Undirected graphs: the double loop over all (s,t) ordered pairs counts
  // each shortest-path pair from both endpoints, so halve the total.
  for (let i = 0; i < n; i++) between[i] /= 2;

  const norm = (n - 1) * (n - 2) / 2 || 1;
  const betweenNorm = between.map(b => +(b / norm).toFixed(4));

  const labels = A.map((_, i) => `n${i}`);
  const nodes = labels.map((name, i) => ({
    name,
    degree: +degree[i].toFixed(4),
    degreeNorm: +(degree[i] / maxDeg).toFixed(4),
    betweenness: betweenNorm[i],
    eigenvector: +eigenNorm[i].toFixed(4),
  }));

  return {
    test: 'Centrality Measures',
    nodes,
    n,
    apa: `Network centrality: n = ${n}, max degree = ${maxDeg.toFixed(2)}`,
  };
}

/** Greedy modularity community detection (Newman) */

// ── Community Detection ───────────────────────────────────────────
export function communityDetection(A) {
  const n = A.length;
  if (n < 2) return null;
  const m2 = A.reduce((s, row, i) => s + row.reduce((a, v, j) => a + (i !== j ? v : 0), 0), 0);
  const m = m2 / 2 || 1e-9;
  const k = A.map(row => row.reduce((s, v) => s + v, 0));
  let communities = Array.from({ length: n }, (_, i) => i);
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < n; i++) {
      const comm = communities[i];
      let bestComm = comm;
      let bestGain = 0;
      const neighborComms = new Set();
      for (let j = 0; j < n; j++) {
        if (A[i][j] && communities[j] !== comm) neighborComms.add(communities[j]);
      }
      neighborComms.forEach(target => {
        let gain = 0;
        for (let j = 0; j < n; j++) {
          if (communities[j] === target || communities[j] === comm) {
            gain += A[i][j] * (communities[j] === target ? 1 : -1);
          }
        }
        gain /= 2 * m;
        if (gain > bestGain) { bestGain = gain; bestComm = target; }
      });
      if (bestComm !== comm) {
        communities[i] = bestComm;
        improved = true;
      }
    }
  }
  const uniq = [...new Set(communities)];
  const modularity = (() => {
    let q = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (communities[i] === communities[j]) {
          q += A[i][j] - (k[i] * k[j]) / m2;
        }
      }
    }
    return q / m2;
  })();

  return {
    test: 'Community Detection',
    communities: communities.map((c, i) => ({ node: i, community: c })),
    nCommunities: uniq.length,
    modularity: +modularity.toFixed(4),
    n,
    apa: `Communities: ${uniq.length} modules, Q = ${modularity.toFixed(3)}, n = ${n}`,
  };
}

/** Force-directed sociogram layout (Fruchterman-Reingold lite) */

// ── Sociogram ─────────────────────────────────────────────────────
export function sociogramLayout(A, iterations = 80) {
  const n = A.length;
  if (!n) return null;
  const pos = Array.from({ length: n }, (_, i) => ({
    id: i,
    x: Math.cos(2 * Math.PI * i / n),
    y: Math.sin(2 * Math.PI * i / n),
  }));
  const area = 4;
  const k0 = Math.sqrt(area / n);
  for (let it = 0; it < iterations; it++) {
    const disp = pos.map(() => ({ x: 0, y: 0 }));
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = pos[i].x - pos[j].x;
        const dy = pos[i].y - pos[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const rep = (k0 * k0) / dist;
        disp[i].x += (dx / dist) * rep;
        disp[i].y += (dy / dist) * rep;
        disp[j].x -= (dx / dist) * rep;
        disp[j].y -= (dy / dist) * rep;
        if (A[i][j]) {
          const att = (dist * dist) / k0;
          disp[i].x -= (dx / dist) * att;
          disp[i].y -= (dy / dist) * att;
          disp[j].x += (dx / dist) * att;
          disp[j].y += (dy / dist) * att;
        }
      }
    }
    const temp = area * (1 - it / iterations);
    pos.forEach((p, i) => {
      const mag = Math.sqrt(disp[i].x ** 2 + disp[i].y ** 2) || 1;
      p.x += (disp[i].x / mag) * Math.min(mag, temp);
      p.y += (disp[i].y / mag) * Math.min(mag, temp);
    });
  }
  const edges = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (A[i][j]) edges.push({ from: i, to: j, weight: A[i][j] });
    }
  }
  return {
    test: 'Sociogram',
    nodes: pos.map(p => ({ id: p.id, x: +p.x.toFixed(4), y: +p.y.toFixed(4) })),
    edges,
    n,
    apa: `Sociogram layout: ${n} nodes, ${edges.length} edges`,
  };
}

/** Parse edge list string "A-B,B-C" or "A-B:2" into adjacency for named nodes */
export function networkFromEdgeList(edgeStr, nodeNames = null) {
  const pairs = edgeStr.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
  const edges = pairs.map(pair => {
    const weightMatch = pair.match(/:([0-9.]+)\s*$/);
    const wRaw = weightMatch ? parseFloat(weightMatch[1]) : 1;
    const weight = Number.isFinite(wRaw) && wRaw > 0 ? wRaw : 1;
    const core = weightMatch ? pair.slice(0, weightMatch.index) : pair;
    const parts = core.split(/[-:>]+/).map(x => x.trim()).filter(Boolean);
    if (parts.length < 2) return null;
    return { from: parts[0], to: parts[1], weight };
  }).filter(e => e?.from && e?.to);
  const nodes = nodeNames?.length
    ? nodeNames
    : [...new Set(edges.flatMap(e => [e.from, e.to]))];
  const A = adjacencyFromEdges(nodes, edges);
  return { nodes, A, edges };
}

// ── PageRank ─────────────────────────────────────────────────────────────────
export function pageRank(A, { damping = 0.85, maxIter = 100, tolerance = 1e-6 } = {}) {
  if (!A || !A.length || A.length < 2) return null;
  const n = A.length;
  const outDeg = A.map(row => row.reduce((s, v) => s + v, 0));
  // Build column-stochastic M: M[j][i] = A[i][j] / outDeg(i)
  const M = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    const d = outDeg[i] || 1;
    for (let j = 0; j < n; j++) {
      M[j][i] = damping * A[i][j] / d + (1 - damping) / n;
    }
  }
  // Handle dangling nodes: uniform distribution
  for (let i = 0; i < n; i++) {
    if (!outDeg[i]) {
      for (let j = 0; j < n; j++) M[j][i] = 1 / n;
    }
  }

  let pr = Array(n).fill(1 / n);
  let nIter = 0;
  for (; nIter < maxIter; nIter++) {
    const newPr = Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) newPr[i] += M[i][j] * pr[j];
    }
    let delta = 0;
    for (let i = 0; i < n; i++) delta += Math.abs(newPr[i] - pr[i]);
    pr = newPr;
    if (delta < tolerance) { nIter++; break; }
  }
  const sum = pr.reduce((s, v) => s + v, 0);
  const scores = pr.map((v, i) => ({ node: i, pagerank: +(v / sum).toFixed(6) }));

  return {
    test: 'PageRank',
    scores,
    damping,
    nIter,
    n,
    apa: `PageRank (d = ${damping}): top node = ${scores.sort((a, b) => b.pagerank - a.pagerank)[0].node}, n = ${n}`,
  };
}

// ── Closeness Centrality ─────────────────────────────────────────────────────
export function closenessCentrality(A) {
  if (!A || !A.length || A.length < 2) return null;
  const n = A.length;
  const scores = [];
  for (let s = 0; s < n; s++) {
    const dist = Array(n).fill(Infinity);
    dist[s] = 0;
    const q = [s];
    while (q.length) {
      const v = q.shift();
      for (let w = 0; w < n; w++) {
        if (A[v][w] && v !== w && dist[w] === Infinity) {
          dist[w] = dist[v] + 1;
          q.push(w);
        }
      }
    }
    let sumDist = 0, reachable = 0;
    for (let i = 0; i < n; i++) {
      if (i !== s && dist[i] < Infinity) { sumDist += dist[i]; reachable++; }
    }
    const closeness = sumDist > 0 ? reachable / sumDist : 0;
    const norm = n > 1 ? closeness / ((n - 1) / sumDist || 1) : closeness;
    scores.push({ node: s, closeness: +closeness.toFixed(6), normCloseness: +closeness.toFixed(6) });
  }
  const maxC = Math.max(...scores.map(s => s.closeness), 1e-9);
  scores.forEach(s => { s.normCloseness = +(s.closeness / maxC).toFixed(4); });

  return {
    test: 'Closeness Centrality',
    scores,
    n,
    apa: `Closeness centrality: max = ${maxC.toFixed(4)}, n = ${n}`,
  };
}

// ── Graph Metrics ────────────────────────────────────────────────────────────
export function graphMetrics(A) {
  if (!A || !A.length || A.length < 2) return null;
  const n = A.length;
  const isDirected = A.some((row, i) => row.some((v, j) => v !== A[j][i]));
  let totalEdges = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) totalEdges += A[i][j];

  // BFS from all nodes for diameter and avg path length
  let maxDist = 0, sumDist = 0, pathCount = 0;
  for (let s = 0; s < n; s++) {
    const dist = Array(n).fill(Infinity);
    dist[s] = 0;
    const q = [s];
    while (q.length) {
      const v = q.shift();
      for (let w = 0; w < n; w++) {
        if (A[v][w] && v !== w && dist[w] === Infinity) {
          dist[w] = dist[v] + 1;
          q.push(w);
        }
      }
    }
    for (let i = 0; i < n; i++) {
      if (i !== s && dist[i] < Infinity) { maxDist = Math.max(maxDist, dist[i]); sumDist += dist[i]; pathCount++; }
    }
  }
  const avgPath = pathCount > 0 ? sumDist / pathCount : 0;

  // Triangles and triples for clustering coefficient
  let triangles = 0, triples = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j || !A[i][j]) continue;
      for (let k = 0; k < n; k++) {
        if (k === i || k === j) continue;
        if (A[j][k] && A[k][i]) triangles++;
        if (A[j][k]) triples++;
      }
    }
  }
  triangles /= 6; // each triangle counted 6 times
  triples /= 2; // each triple counted 2 times
  const clustCoeff = triples > 0 ? (3 * triangles) / triples : 0;

  // Edge density
  const possibleEdges = isDirected ? n * (n - 1) : n * (n - 1) / 2;
  const density = possibleEdges > 0 ? totalEdges / (isDirected ? possibleEdges : n * (n - 1)) : 0;

  // Components
  const visited = Array(n).fill(false);
  let nComp = 0;
  for (let i = 0; i < n; i++) {
    if (visited[i]) continue;
    nComp++;
    const q = [i];
    visited[i] = true;
    while (q.length) {
      const v = q.shift();
      for (let w = 0; w < n; w++) {
        if (A[v][w] && !visited[w]) { visited[w] = true; q.push(w); }
      }
    }
  }

  return {
    test: 'Graph Metrics',
    diameter: maxDist || null,
    avgPathLength: +avgPath.toFixed(4),
    clusteringCoeff: +clustCoeff.toFixed(4),
    edgeDensity: +density.toFixed(4),
    nComponents: nComp,
    n,
    nEdges: totalEdges,
    apa: `Graph: ${n} nodes, ${totalEdges} edges, ${nComp} component(s), CC = ${clustCoeff.toFixed(3)}, density = ${density.toFixed(3)}`,
  };
}

// ── Louvain Communities ──────────────────────────────────────────────────────
export function louvainCommunities(A, seed = 42) {
  __rng = mulberry32(seed);
  if (!A || !A.length || A.length < 2) return null;
  const n = A.length;
  const m2 = A.reduce((s, row, i) => s + row.reduce((a, v, j) => a + (i !== j ? v : 0), 0), 0);
  const m = m2 / 2 || 1e-9;
  const k = A.map(row => row.reduce((s, v) => s + v, 0));

  let communities = Array.from({ length: n }, (_, i) => i);
  let bestComm = [...communities];
  let bestQ = -Infinity;

  for (let phase = 0; phase < 20; phase++) {
    let improved = true;
    while (improved) {
      improved = false;
      // Shuffle node order
      const order = Array.from({ length: n }, (_, i) => i);
      for (let i = n - 1; i > 0; i--) { const j = Math.floor(__rng() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }

      for (const i of order) {
        const curr = communities[i];
        const nbComms = { [curr]: 0 };
        for (let j = 0; j < n; j++) {
          if (A[i][j] && communities[j] !== curr) {
            nbComms[communities[j]] = (nbComms[communities[j]] || 0) + A[i][j];
          }
        }

        let bestMove = curr, bestGain = 0;
        const k_i = k[i];
        for (const t in nbComms) {
          const target = +t;
          if (target === curr) continue;
          const k_i_in = nbComms[target] || 0;
          // Compute Σ_in for target community
          let sigma_in = 0;
          for (let u = 0; u < n; u++) {
            if (communities[u] === target) {
              for (let w = 0; w < n; w++) {
                if (communities[w] === target) sigma_in += A[u][w];
              }
            }
          }
          sigma_in /= 2;
          // Compute Σ_tot for target community
          let sigma_tot = 0;
          for (let u = 0; u < n; u++) if (communities[u] === target) sigma_tot += k[u];

          // Compute Σ_in_curr for current community (without i)
          let sigma_in_curr = 0;
          for (let u = 0; u < n; u++) {
            if (communities[u] === curr && u !== i) {
              for (let w = 0; w < n; w++) {
                if (communities[w] === curr && w !== i) sigma_in_curr += A[u][w];
              }
            }
          }
          sigma_in_curr /= 2;

          let sigma_tot_curr = 0;
          for (let u = 0; u < n; u++) if (communities[u] === curr && u !== i) sigma_tot_curr += k[u];

          const deltaQ = k_i_in - (k_i * sigma_tot) / (2 * m);
          if (deltaQ > bestGain) { bestGain = deltaQ; bestMove = target; }
        }

        if (bestMove !== curr && bestGain > 0) {
          communities[i] = bestMove;
          improved = true;
        }
      }
    }

    // Compute modularity
    let Q = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (communities[i] === communities[j]) {
          Q += A[i][j] - (k[i] * k[j]) / m2;
        }
      }
    }
    Q /= m2;
    if (Q > bestQ) { bestQ = Q; bestComm = [...communities]; }

    // Build new aggregate network (simplified: just check convergence)
    if (!improved) break;
  }

  const uniq = [...new Set(bestComm)];
  const remap = {};
  uniq.forEach((c, i) => { remap[c] = i; });
  const nodes = bestComm.map((c, i) => ({ node: i, community: remap[c] }));

  return {
    test: 'Louvain Communities',
    communities: nodes,
    nCommunities: uniq.length,
    modularity: +bestQ.toFixed(4),
    n,
    apa: `Louvain: ${uniq.length} communities, Q = ${bestQ.toFixed(3)}, n = ${n}`,
  };
}

// ── Fit Power Law ────────────────────────────────────────────────────────────
export function fitPowerLaw(degrees, { xmin = null } = {}) {
  if (!degrees || !degrees.length || degrees.length < 3) return null;
  const sorted = [...degrees].sort((a, b) => a - b);
  if (sorted[0] === sorted[sorted.length - 1]) return null;

  let bestXmin = xmin || sorted[0];
  let bestAlpha = 0, bestKS = Infinity;
  const candidates = xmin ? [xmin] : [...new Set(sorted)].filter(v => v > 0);
  if (!candidates.length) return null;

  for (const xm of candidates) {
    const tail = sorted.filter(d => d >= xm);
    if (tail.length < 3) continue;
    // MLE: α̂ = 1 + n * [Σ ln(k_i / (xmin - 0.5))]⁻¹
    const offset = xm - 0.5;
    let sumLog = 0;
    for (const d of tail) sumLog += Math.log(d / offset);
    const alpha = 1 + tail.length / sumLog;
    if (!(alpha > 1 && Number.isFinite(alpha))) continue;

    // KS statistic
    let ks = 0;
    for (let i = 0; i < tail.length; i++) {
      const empCDF = (i + 1) / tail.length;
      const theoCDF = 1 - Math.pow(xm / tail[i], alpha - 1);
      ks = Math.max(ks, Math.abs(empCDF - theoCDF));
    }
    if (ks < bestKS) { bestKS = ks; bestAlpha = alpha; bestXmin = xm; }
  }

  const tail = sorted.filter(d => d >= bestXmin);
  const se = (bestAlpha - 1) / Math.sqrt(tail.length);

  return {
    test: 'Power-Law Fit',
    alpha: +bestAlpha.toFixed(4),
    se: +se.toFixed(4),
    xmin: bestXmin,
    ksStat: +bestKS.toFixed(4),
    n: degrees.length,
    nTail: tail.length,
    apa: `Power-law: α = ${bestAlpha.toFixed(2)} (xmin = ${bestXmin}), n_tail = ${tail.length} of ${degrees.length}`,
  };
}

// ── Network Diffusion ─────────────────────────────────────────────
export function networkDiffusion(A, seeds, { steps = 10, alpha = 0.85 } = {}) {
  if (!A || !A.length || !seeds || !seeds.length) return null;
  const n = A.length;
  const outDeg = A.map(row => row.reduce((s, v) => s + v, 0));
  const P = A.map((row, i) => {
    const d = outDeg[i] || 1;
    return row.map(v => v / d);
  });
  let state = Array(n).fill(0);
  seeds.forEach(s => { if (s >= 0 && s < n) state[s] = 1; });
  const diffusion = [state.slice()];
  for (let t = 1; t <= steps; t++) {
    const newState = Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let influx = 0;
      for (let j = 0; j < n; j++) influx += P[j][i] * state[j];
      newState[i] = alpha * influx + (1 - alpha) * (seeds.includes(i) ? 1 : 0);
    }
    state = newState;
    diffusion.push(state.map(v => +v.toFixed(4)));
  }
  return { test: 'Network Diffusion', diffusion, seeds, steps, alpha, n, apa: `Diffusion: ${steps} steps, α = ${alpha}, n = ${n}` };
}

// ── SIR Model ─────────────────────────────────────────────────────
export function SIRModel(A, { seed = 42, beta = 0.3, gamma = 0.1, steps = 20, initialInfected = null } = {}) {
  __rng = mulberry32(seed);
  if (!A || !A.length) return null;
  const n = A.length;
  let S = Array(n).fill(1), I = Array(n).fill(0), R = Array(n).fill(0);
  const init = initialInfected || [Math.floor(__rng() * n)];
  init.forEach(i => { if (i < n) { S[i] = 0; I[i] = 1; } });
  const curve = [{ step: 0, S: n - init.length, I: init.length, R: 0 }];
  for (let t = 1; t <= steps; t++) {
    const newI = Array(n).fill(0);
    let sCount = 0, iCount = 0, rCount = 0;
    for (let i = 0; i < n; i++) {
      if (S[i] > 0) {
        let infected = false;
        for (let j = 0; j < n; j++) {
          if (A[i][j] && I[j] > 0 && __rng() < beta) { infected = true; break; }
        }
        if (infected) { S[i] = 0; newI[i] = 1; iCount++; rCount += (R[i] > 0 ? 1 : 0); }
        else { S[i] = 1; sCount++; }
      } else if (I[i] > 0 || newI[i] > 0) {
        if (__rng() < gamma) { I[i] = 0; R[i] = 1; rCount++; }
        else { I[i] = 1; iCount++; }
      } else { R[i] = 1; rCount++; }
    }
    curve.push({ step: t, S: sCount, I: iCount, R: rCount });
    if (iCount === 0) break;
  }
  return { test: 'SIR Model', curve, params: { beta, gamma }, n, apa: `SIR: β=${beta}, γ=${gamma}, R₀=${(beta/gamma).toFixed(2)}, n=${n}` };
}

// ── QAP Test ──────────────────────────────────────────────────────
export function qapTest(A, B, { seed = 42, permutations = 199 } = {}) {
  __rng = mulberry32(seed);
  if (!A || !B || A.length < 3 || A.length !== B.length) return null;
  const n = A.length;
  let obs = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j) obs += A[i][j] * B[i][j];
  let count = 0;
  for (let p = 0; p < permutations; p++) {
    const permB = [...B].sort(() => __rng() - 0.5);
    let permStat = 0;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j) permStat += A[i][j] * permB[i][j];
    if (permStat >= obs) count++;
  }
  return { test: 'QAP Test', obs: +obs.toFixed(4), p: count / permutations, permutations, n, apa: `QAP: obs = ${obs.toFixed(1)}, p = ${(count / permutations).toFixed(3)}` };
}

// ── CUG Test ──────────────────────────────────────────────────────
export function cugTest(A, statFn, { seed = 42, permutations = 199 } = {}) {
  __rng = mulberry32(seed);
  if (!A || !A.length || !statFn) return null;
  const n = A.length;
  const obs = statFn(A);
  let count = 0;
  const edges = A.reduce((s, r) => s + r.reduce((a, v) => a + v, 0), 0) / 2;
  for (let p = 0; p < permutations; p++) {
    const randomA = Array.from({ length: n }, () => Array(n).fill(0));
    for (let e = 0; e < edges; e++) {
      const i = Math.floor(__rng() * n);
      const j = Math.floor(__rng() * n);
      if (i !== j) randomA[i][j] = randomA[j][i] = 1;
    }
    if (statFn(randomA) >= obs) count++;
  }
  return { test: 'CUG Test', obs: +obs.toFixed(4), p: count / permutations, n, apa: `CUG: obs = ${obs.toFixed(2)}, p = ${(count / permutations).toFixed(3)}` };
}

// ── Network Autocorrelation (Moran on network) ────────────────────
export function networkAutocorrelation(A, x) {
  if (!A || !x || A.length !== x.length || A.length < 3) return null;
  const n = A.length;
  const mu = x.reduce((s, v) => s + v, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    den += (x[i] - mu) ** 2;
    for (let j = 0; j < n; j++) {
      if (i !== j) num += A[i][j] * (x[i] - mu) * (x[j] - mu);
    }
  }
  const I = den > 0 ? num / den : 0;
  return { test: 'Network Autocorrelation', I: +I.toFixed(4), n, apa: `Network I = ${I.toFixed(3)}` };
}

// ── Degree Assortativity ──────────────────────────────────────────
export function degreeAssortativity(A) {
  if (!A || !A.length) return null;
  const n = A.length;
  const deg = A.map(row => row.reduce((s, v) => s + v, 0));
  let sumDeg = deg.reduce((s, v) => s + v, 0);
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (A[i][j]) { num += deg[i] * deg[j]; den += (deg[i] * deg[i] + deg[j] * deg[j]) / 2; }
    }
  }
  const assort = den > 0 ? num / den : 0;
  return { test: 'Degree Assortativity', assortativity: +assort.toFixed(4), m: sumDeg / 2, n, apa: `Assortativity = ${assort.toFixed(3)}` };
}

// ── Clustering Profile ────────────────────────────────────────────
export function clusteringProfile(A) {
  if (!A || !A.length) return null;
  const n = A.length;
  const deg = A.map(row => row.reduce((s, v) => s + v, 0));
  const profile = {};
  for (let i = 0; i < n; i++) {
    const d = deg[i];
    if (!profile[d]) profile[d] = { n: 0, sumC: 0 };
    profile[d].n++;
    const neighbs = A[i].reduce((arr, v, j) => v ? [...arr, j] : arr, []);
    let tri = 0;
    for (let a = 0; a < neighbs.length; a++) for (let b = a + 1; b < neighbs.length; b++) if (A[neighbs[a]][neighbs[b]]) tri++;
    const cc = neighbs.length > 1 ? 2 * tri / (neighbs.length * (neighbs.length - 1)) : 0;
    profile[d].sumC += cc;
  }
  const degs = Object.keys(profile).map(Number).sort((a, b) => a - b);
  const result = degs.map(d => ({ degree: d, n: profile[d].n, cc: +(profile[d].sumC / profile[d].n).toFixed(4) }));
  return { test: 'Clustering Profile', profile: result, n, apa: `CC profile: ${result.length} degree bins` };
}
