import { avg } from '../math/core.js';
import { jacobiEigen } from '../math/matrix.js';

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
export function centralityMeasures(A) {
  const n = A.length;
  if (!n) return null;
  const degree = A.map((row, i) => row.reduce((s, v, j) => s + (i !== j ? v : 0), 0));
  const maxDeg = Math.max(...degree, 1);

  const eig = jacobiEigen(A.map((row, i) => row.map((v, j) => (i === j ? 0 : v))));
  const eigenCent = eig.eigenvectors[0].map(v => Math.abs(v));
  const eMax = Math.max(...eigenCent, 1e-9);
  const eigenNorm = eigenCent.map(v => v / eMax);

  const between = Array(n).fill(0);
  for (let s = 0; s < n; s++) {
    const dist = Array(n).fill(Infinity);
    const paths = Array(n).fill(0);
    dist[s] = 0;
    paths[s] = 1;
    const q = [s];
    while (q.length) {
      const v = q.shift();
      for (let w = 0; w < n; w++) {
        if (!A[v][w] || v === w) continue;
        if (dist[w] === Infinity) {
          dist[w] = dist[v] + 1;
          paths[w] = paths[v];
          q.push(w);
        }
        if (dist[w] === dist[v] + 1) paths[w] += paths[v];
      }
    }
    for (let t = 0; t < n; t++) {
      if (s === t) continue;
      for (let v = 0; v < n; v++) {
        if (dist[v] === dist[t] - 1 && paths[v] && paths[t]) {
          between[v] += paths[s] * paths[t] / paths[v];
        }
      }
    }
  }
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
