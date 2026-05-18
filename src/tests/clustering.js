import { avg, sampleVar, corr, fmtP } from '../math/core.js';

function lcg(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 2 ** 32; };
}

function dist2(a, b) {
  return a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0);
}

function silhouetteScore(X, labels, k) {
  const n = X.length;
  if (n < 3 || k < 2) return null;
  let total = 0;
  let count = 0;
  for (let i = 0; i < n; i++) {
    const ci = labels[i];
    const same = X.filter((_, j) => labels[j] === ci && j !== i);
    const otherClusters = [...new Set(labels)].filter(c => c !== ci);
    if (!same.length || !otherClusters.length) continue;
    const a = same.reduce((s, x) => s + Math.sqrt(dist2(X[i], x)), 0) / same.length;
    const b = Math.min(...otherClusters.map(c => {
      const memb = X.filter((_, j) => labels[j] === c);
      return memb.reduce((s, x) => s + Math.sqrt(dist2(X[i], x)), 0) / memb.length;
    }));
    const s = (b - a) / Math.max(a, b, 1e-9);
    total += s;
    count++;
  }
  return count ? total / count : 0;
}

/** k-means (Lloyd) on numeric columns; seeded init for reproducibility */
export function kmeans(data, vars, k = 3, maxIter = 100, seed = 42) {
  const rows = data.filter(r => vars.every(v => Number.isFinite(+r[v])));
  const X = rows.map(r => vars.map(v => +r[v]));
  const n = X.length;
  const p = vars.length;
  k = Math.max(2, Math.min(8, Math.floor(k)));
  if (n < k + 2 || p < 1) return null;

  const rng = lcg(seed);
  const used = new Set();
  const centroids = [];
  let guard = 0;
  while (centroids.length < k && guard++ < n * 4) {
    const idx = Math.floor(rng() * n);
    if (used.has(idx)) continue;
    used.add(idx);
    centroids.push([...X[idx]]);
  }
  if (centroids.length < k) return null;

  let labels = Array(n).fill(0);
  for (let iter = 0; iter < maxIter; iter++) {
    labels = X.map(x => {
      let best = 0;
      let bd = Infinity;
      centroids.forEach((c, j) => {
        const d = dist2(x, c);
        if (d < bd) { bd = d; best = j; }
      });
      return best;
    });
    const newC = Array.from({ length: k }, () => Array(p).fill(0));
    const counts = Array(k).fill(0);
    X.forEach((x, i) => {
      counts[labels[i]]++;
      x.forEach((v, j) => { newC[labels[i]][j] += v; });
    });
    let moved = false;
    for (let j = 0; j < k; j++) {
      if (!counts[j]) continue;
      const nc = newC[j].map(v => v / counts[j]);
      if (dist2(nc, centroids[j]) > 1e-8) moved = true;
      centroids[j] = nc;
    }
    if (!moved) break;
  }

  const wcss = X.reduce((s, x, i) => s + dist2(x, centroids[labels[i]]), 0);
  const sil = silhouetteScore(X, labels, k);

  return {
    test: 'k-Means',
    k,
    centroids: centroids.map(c => c.map(v => +v.toFixed(4))),
    labels,
    wcss: +wcss.toFixed(4),
    silhouette: sil != null ? +sil.toFixed(4) : null,
    n, vars,
    apa: `k-means (k=${k}): WCSS = ${wcss.toFixed(2)}${sil != null ? `, silhouette = ${sil.toFixed(3)}` : ''}, N = ${n}`,
  };
}

function clusterDist(A, B, linkage = 'ward') {
  if (linkage === 'single') {
    let m = Infinity;
    A.forEach(i => B.forEach(j => { m = Math.min(m, Math.sqrt(dist2(i, j))); }));
    return m;
  }
  if (linkage === 'complete') {
    let m = 0;
    A.forEach(i => B.forEach(j => { m = Math.max(m, Math.sqrt(dist2(i, j))); }));
    return m;
  }
  const mean = pts => pts[0].map((_, d) => avg(pts.map(x => x[d])));
  return Math.sqrt(dist2(mean(A), mean(B)));
}

/** Agglomerative hierarchical clustering (Ward/single/complete) */
export function hierarchicalCluster(data, vars, linkage = 'ward') {
  const rows = data.filter(r => vars.every(v => Number.isFinite(+r[v])));
  const X = rows.map(r => vars.map(v => +r[v]));
  const n = X.length;
  if (n < 3 || vars.length < 1) return null;

  let clusters = X.map((x, i) => ({ id: i, pts: [x], members: [i] }));
  const merges = [];

  while (clusters.length > 1) {
    let bestI = 0;
    let bestJ = 1;
    let bestD = Infinity;
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const d = clusterDist(clusters[i].pts, clusters[j].pts, linkage);
        if (d < bestD) { bestD = d; bestI = i; bestJ = j; }
      }
    }
    merges.push({ height: +bestD.toFixed(4), size: clusters[bestI].members.length + clusters[bestJ].members.length });
    const merged = {
      id: n + merges.length,
      pts: [...clusters[bestI].pts, ...clusters[bestJ].pts],
      members: [...clusters[bestI].members, ...clusters[bestJ].members],
    };
    clusters = clusters.filter((_, idx) => idx !== bestI && idx !== bestJ);
    clusters.push(merged);
  }

  const labels = Array(n).fill(0);
  const final = clusters[0]?.members ?? [];
  final.forEach((idx, i) => { labels[idx] = i < Math.ceil(n / 2) ? 0 : 1; });

  return {
    test: 'Hierarchical Cluster',
    linkage,
    mergeHeights: merges.map(m => m.height),
    dendrogram: merges.slice(0, Math.min(20, merges.length)),
    labels,
    n, vars,
    apa: `Hierarchical (${linkage}): ${merges.length} merges, final height = ${merges.at(-1)?.height?.toFixed(3) ?? '—'}, N = ${n}`,
  };
}

/** Latent class analysis — EM for binary/categorical indicators (2–4 classes) */
export function latentClassAnalysis(data, catVars, nClasses = 2) {
  const rows = data.filter(r => catVars.every(v => r[v] != null));
  const n = rows.length;
  const J = catVars.length;
  nClasses = Math.max(2, Math.min(4, Math.floor(nClasses)));
  if (n < 20 || J < 2) return null;

  const levels = catVars.map(v => [...new Set(rows.map(r => String(r[v])))]);
  const enc = rows.map(r => levels.map((lev, j) => lev.indexOf(String(r[catVars[j]]))));
  let pi = Array(nClasses).fill(1 / nClasses);
  let theta = Array.from({ length: nClasses }, () =>
    levels.map(lev => Array(lev.length).fill(1 / lev.length)));

  let resp = Array(n).fill(0).map(() => Array(nClasses).fill(1 / nClasses));
  for (let em = 0; em < 80; em++) {
    for (let i = 0; i < n; i++) {
      for (let c = 0; c < nClasses; c++) {
        let lp = Math.log(pi[c] + 1e-12);
        enc[i].forEach((levIdx, j) => { lp += Math.log(theta[c][j][levIdx] + 1e-12); });
        resp[i][c] = Math.exp(lp);
      }
      const s = resp[i].reduce((a, b) => a + b, 0) || 1;
      resp[i] = resp[i].map(v => v / s);
    }
    pi = Array(nClasses).fill(0);
    resp.forEach(r => r.forEach((p, c) => { pi[c] += p; }));
    pi = pi.map(v => v / n);
    for (let c = 0; c < nClasses; c++) {
      for (let j = 0; j < J; j++) {
        const counts = Array(levels[j].length).fill(1e-6);
        for (let i = 0; i < n; i++) counts[enc[i][j]] += resp[i][c];
        const s = counts.reduce((a, b) => a + b, 0);
        theta[c][j] = counts.map(v => v / s);
      }
    }
  }

  const classAssign = resp.map(r => r.indexOf(Math.max(...r)));
  const bic = -2 * enc.reduce((ll, row, i) => {
    const c = classAssign[i];
    let lp = Math.log(pi[c] + 1e-12);
    row.forEach((levIdx, j) => { lp += Math.log(theta[c][j][levIdx] + 1e-12); });
    return ll + lp;
  }, 0) + (nClasses * levels.reduce((s, lev) => s + lev.length - 1, 0) + nClasses - 1) * Math.log(n);

  const profiles = Array.from({ length: nClasses }, (_, c) => ({
    class: c + 1,
    proportion: +pi[c].toFixed(4),
    items: catVars.map((v, j) => ({
      var: v,
      mode: levels[j][theta[c][j].indexOf(Math.max(...theta[c][j]))],
    })),
  }));

  return {
    test: 'Latent Class Analysis',
    nClasses,
    classProportions: pi.map(p => +p.toFixed(4)),
    profiles,
    classAssign,
    BIC: +bic.toFixed(2),
    n, catVars,
    apa: `LCA (${nClasses} classes): BIC = ${bic.toFixed(1)}, class sizes ${pi.map(p => (100 * p).toFixed(0) + '%').join(', ')}, N = ${n}`,
  };
}
