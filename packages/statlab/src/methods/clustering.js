import { avg, sampleVar, corr, fmtP } from '../math/core.js';
import { matInv, jacobiEigen } from '../math/matrix.js';
import { mulberry32 } from '../math/rng.js';

function lcg(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 2 ** 32; };
}

function dist2(a, b) {
  return a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0);
}

function _silhouette(X, labels, k) {
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

/** k-means (Lloyd) on numeric columns; k-means++ seeded init, multi-restart */

// k-means++ initialization (Arthur & Vassilvitskii 2007): first centroid
// uniform-random, each subsequent centroid sampled with probability
// proportional to its squared distance from the nearest already-chosen
// centroid. This spreads initial centroids across clusters — a plain uniform
// random pick can (and, for some seeds, reliably does) place two initial
// centroids inside the same true cluster, starving another cluster and
// leaving it permanently empty under Lloyd's algorithm (see below).
function _kmeansPlusPlusInit(X, k, rng) {
  const n = X.length;
  const centroids = [[...X[Math.floor(rng() * n)]]];
  while (centroids.length < k) {
    const d2 = X.map(x => Math.min(...centroids.map(c => dist2(x, c))));
    const total = d2.reduce((s, v) => s + v, 0);
    if (total <= 1e-12) { centroids.push([...X[Math.floor(rng() * n)]]); continue; }
    let r = rng() * total, idx = n - 1;
    for (let i = 0; i < n; i++) { r -= d2[i]; if (r <= 0) { idx = i; break; } }
    centroids.push([...X[idx]]);
  }
  return centroids;
}

function _kmeansOnce(X, k, maxIter, rng) {
  const n = X.length, p = X[0].length;
  let centroids = _kmeansPlusPlusInit(X, k, rng);
  let labels = Array(n).fill(0);
  for (let iter = 0; iter < maxIter; iter++) {
    labels = X.map(x => {
      let best = 0, bd = Infinity;
      centroids.forEach((c, j) => { const d = dist2(x, c); if (d < bd) { bd = d; best = j; } });
      return best;
    });
    const newC = Array.from({ length: k }, () => Array(p).fill(0));
    const counts = Array(k).fill(0);
    X.forEach((x, i) => { counts[labels[i]]++; x.forEach((v, j) => { newC[labels[i]][j] += v; }); });
    let moved = false;
    for (let j = 0; j < k; j++) {
      if (!counts[j]) {
        // Empty cluster: reseed its centroid at the point currently farthest
        // from its own cluster's centroid (the point Lloyd's algorithm is
        // fitting worst), instead of leaving a dead centroid nothing can ever
        // be reassigned to (which silently reduces the effective k forever).
        let farI = 0, farD = -1;
        X.forEach((x, i) => { const d = dist2(x, centroids[labels[i]]); if (d > farD) { farD = d; farI = i; } });
        centroids[j] = [...X[farI]];
        moved = true;
        continue;
      }
      const nc = newC[j].map(v => v / counts[j]);
      if (dist2(nc, centroids[j]) > 1e-8) moved = true;
      centroids[j] = nc;
    }
    if (!moved) break;
  }
  const wcss = X.reduce((s, x, i) => s + dist2(x, centroids[labels[i]]), 0);
  return { centroids, labels, wcss };
}

// ── k-Means ───────────────────────────────────────────────────────
/** k-means clustering. @param {Array<Record<string, number>>} data @param {string[]} vars @param {number} [k=3] @param {number} [maxIter=100] @param {number} [seed=42] */
export function kmeans(data, vars, k = 3, maxIter = 100, seed = 42) {
  const rows = data.filter(r => vars.every(v => Number.isFinite(+r[v])));
  const X = rows.map(r => vars.map(v => +r[v]));
  const n = X.length;
  const p = vars.length;
  k = Math.max(2, Math.min(8, Math.floor(k)));
  if (n < k + 2 || p < 1) return null;

  // Multiple restarts (keep the lowest-WCSS run): Lloyd's algorithm only finds a
  // local optimum, and even k-means++ doesn't guarantee the global one on every
  // draw — restarting is the standard mitigation (as in scikit-learn's n_init).
  const rng = lcg(seed);
  let best = null;
  const nInit = 10;
  for (let r = 0; r < nInit; r++) {
    const run = _kmeansOnce(X, k, maxIter, rng);
    if (!best || run.wcss < best.wcss) best = run;
  }
  const { centroids, labels, wcss } = best;
  const sil = _silhouette(X, labels, k);

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
  if (linkage === 'ward') {
    // Ward's criterion is the increase in total within-cluster sum of squares
    // from merging A and B: ΔESS = (|A||B|/(|A|+|B|))·‖centroid_A−centroid_B‖²,
    // reported as d=√(2·ΔESS) (scipy's convention). The previous code fell
    // through to plain centroid-to-centroid Euclidean distance for any
    // non-single/non-complete linkage — i.e. it computed centroid (UPGMC)
    // linkage regardless of the requested method, silently mislabeled as
    // "ward". Verified against scipy.cluster.hierarchy.linkage(method='ward')
    // (single/complete already matched scipy exactly; only ward diverged).
    const nA = A.length, nB = B.length;
    const d2 = dist2(mean(A), mean(B));
    return Math.sqrt(2 * (nA * nB / (nA + nB)) * d2);
  }
  return Math.sqrt(dist2(mean(A), mean(B))); // 'centroid' / unrecognized linkage
}

/** Agglomerative hierarchical clustering (Ward/single/complete) */

// ── Hierarchical Cluster ──────────────────────────────────────────
/** Agglomerative hierarchical clustering. @param {Array<Record<string, number>>} data @param {string[]} vars @param {string} [linkage='ward'] */
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

// ── Latent Class Analysis ─────────────────────────────────────────
/** Latent class analysis for categorical indicators. @param {Array<Record<string, any>>} data @param {string[]} catVars @param {number} [nClasses=2] */
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

// ── Silhouette Score (public export) ──────────────────────────────────────────
/** Mean silhouette width for a labeling. @param {Array<Record<string, number>>} data @param {string[]} vars @param {number[]} labels @param {number} k */
export function silhouetteScore(data, vars, labels, k) {
  const X = data.filter(r => vars.every(v => Number.isFinite(+r[v]))).map(r => vars.map(v => +r[v]));
  const sil = _silhouette(X, labels, k);
  if (sil == null) return null;
  return {
    test: 'Silhouette Score',
    silhouette: +sil.toFixed(4),
    n: X.length, k,
    apa: `Silhouette = ${sil.toFixed(3)}, k = ${k}, N = ${X.length}`,
  };
}

// ── DBSCAN ────────────────────────────────────────────────────────────────────
/** DBSCAN density-based clustering. @param {Array<Record<string, number>>} data @param {string[]} vars @param {number} [eps=0.5] @param {number} [minPts=5] */
export function dbscan(data, vars, eps = 0.5, minPts = 5) {
  const X = data.filter(r => vars.every(v => Number.isFinite(+r[v]))).map(r => vars.map(v => +r[v]));
  const n = X.length;
  if (n < 3) return null;
  const labels = Array(n).fill(-1);
  const visited = Array(n).fill(false);
  const corePoints = Array(n).fill(false);

  // Find neighbors
  const neighbors = Array.from({ length: n }, (_, i) => {
    const nb = [];
    for (let j = 0; j < n; j++) {
      if (i !== j && Math.sqrt(dist2(X[i], X[j])) <= eps) nb.push(j);
    }
    return nb;
  });

  // Mark core points
  for (let i = 0; i < n; i++) {
    if (neighbors[i].length + 1 >= minPts) corePoints[i] = true;
  }

  // `visited` controls whether we've already expanded a point's OWN neighbor
  // list into the seed queue — it must NOT gate label assignment. A point can
  // be "visited" early (in the outer scan, found not to be core, so left
  // unlabeled) and only later discovered to be a *border* point reachable
  // from some other cluster's core point; that border point must still get
  // labeled when the BFS reaches it. The previous code's `if (visited[q])
  // continue;` skipped the label assignment too, permanently misclassifying
  // such early-indexed border points as noise (verified against
  // sklearn.cluster.DBSCAN on a case with a border point placed before its
  // cluster's core points in array order).
  let clusterId = 0;
  for (let i = 0; i < n; i++) {
    if (visited[i]) continue;
    visited[i] = true;
    if (!corePoints[i]) continue;
    const seeds = [...neighbors[i]];
    labels[i] = clusterId;
    while (seeds.length) {
      const q = seeds.shift();
      if (!visited[q]) {
        visited[q] = true;
        if (corePoints[q]) {
          for (const nb of neighbors[q]) {
            if (!visited[nb]) seeds.push(nb);
          }
        }
      }
      if (labels[q] === -1) labels[q] = clusterId;
    }
    clusterId++;
  }

  const noise = labels.filter(l => l === -1).length;
  return {
    test: 'DBSCAN',
    labels,
    corePoints,
    nClusters: clusterId,
    noise,
    eps,
    minPts,
    n,
    apa: `DBSCAN: ${clusterId} cluster(s), ${noise} noise, ε = ${eps}, minPts = ${minPts}, N = ${n}`,
  };
}

// ── Gaussian Mixture Model ────────────────────────────────────────────────────
/** Gaussian mixture model via EM. @param {Array<Record<string, number>>} data @param {string[]} vars @param {number} [nComponents=2] @param {{maxIter?: number, tolerance?: number, seed?: number}} [options] */
export function gaussianMixture(data, vars, nComponents = 2, { maxIter = 100, tolerance = 1e-5, seed = 42 } = {}) {
  const X = data.filter(r => vars.every(v => Number.isFinite(+r[v]))).map(r => vars.map(v => +r[v]));
  const n = X.length;
  const p = vars.length;
  if (n < nComponents * 3 || p < 1) return null;
  const K = nComponents;

  // Initialize with k-means-like seeding
  const rng = lcg(seed);
  const means = Array.from({ length: K }, () => {
    const idx = Math.floor(rng() * n);
    return X[idx].slice();
  });
  const covariances = Array.from({ length: K }, () =>
    Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => i === j ? 1 : 0))
  );
  let weights = Array(K).fill(1 / K);

  let respons = Array.from({ length: n }, () => Array(K).fill(0));
  let logLik = -Infinity;

  for (let iter = 0; iter < maxIter; iter++) {
    // E-step
    let newLL = 0;
    for (let i = 0; i < n; i++) {
      for (let c = 0; c < K; c++) {
        const eigs = jacobiEigen(covariances[c]).eigenvalues;
        const detEst = Math.max(eigs.reduce((d, e) => d * Math.max(e, 1e-8), 1), 1e-10);
        const invCov = matInv(covariances[c].map(r => [...r])) || covariances[c].map(r => r.map(v => v > 0 ? 1 / v : 1));
        const diff = X[i].map((v, j) => v - means[c][j]);
        let mahal = 0;
        for (let a = 0; a < p; a++) for (let b = 0; b < p; b++) mahal += diff[a] * invCov[a][b] * diff[b];
        const logDensity = -0.5 * (p * Math.log(2 * Math.PI) + Math.log(detEst) + mahal);
        respons[i][c] = Math.log(weights[c] + 1e-12) + logDensity;
      }
      const maxL = Math.max(...respons[i]);
      let sum = 0;
      for (let c = 0; c < K; c++) { respons[i][c] = Math.exp(respons[i][c] - maxL); sum += respons[i][c]; }
      for (let c = 0; c < K; c++) respons[i][c] /= sum || 1;
      newLL += Math.log(sum) + maxL;
    }

    // M-step
    const nk = Array(K).fill(0);
    for (let i = 0; i < n; i++) for (let c = 0; c < K; c++) nk[c] += respons[i][c];

    const newMeans = Array.from({ length: K }, () => Array(p).fill(0));
    for (let i = 0; i < n; i++) for (let c = 0; c < K; c++) for (let j = 0; j < p; j++) newMeans[c][j] += respons[i][c] * X[i][j];
    for (let c = 0; c < K; c++) if (nk[c] > 1e-10) newMeans[c] = newMeans[c].map(v => v / nk[c]); else newMeans[c] = means[c].slice();

    const newCovs = Array.from({ length: K }, () => Array.from({ length: p }, () => Array(p).fill(0)));
    for (let i = 0; i < n; i++) {
      for (let c = 0; c < K; c++) {
        const diff = X[i].map((v, j) => v - newMeans[c][j]);
        for (let a = 0; a < p; a++) for (let b = 0; b < p; b++) newCovs[c][a][b] += respons[i][c] * diff[a] * diff[b];
      }
    }
    for (let c = 0; c < K; c++) {
      if (nk[c] > 1e-10) {
        for (let a = 0; a < p; a++) for (let b = 0; b < p; b++) newCovs[c][a][b] /= nk[c];
        const tr = newCovs[c].reduce((s, r, kk) => s + r[kk], 0);
        const reg = 1e-6 * Math.max(tr / p, 1e-6);
        for (let d = 0; d < p; d++) newCovs[c][d][d] += reg;
      } else {
        newCovs[c] = covariances[c].map(r => [...r]);
      }
    }

    const newWeights = nk.map(v => v / n);
    const delta = means.reduce((s, m, c) => s + m.reduce((a, v, j) => a + (v - newMeans[c][j]) ** 2, 0), 0);
    means.forEach((m, c) => { means[c] = newMeans[c].slice(); });
    covariances.forEach((_, c) => { covariances[c] = newCovs[c].map(r => [...r]); });
    weights = newWeights;

    if (delta < tolerance && iter > 3) { logLik = newLL; break; }
    logLik = newLL;
  }

  const nParams = K * p * (p + 1) / 2 + K * p + K - 1;
  const bic = -2 * logLik + nParams * Math.log(n);
  const aic = -2 * logLik + 2 * nParams;

  const labels = respons.map(r => r.indexOf(Math.max(...r)));

  return {
    test: 'Gaussian Mixture Model',
    nComponents: K,
    weights: weights.map(w => +w.toFixed(4)),
    means,
    covariances: covariances.map(cov => cov.map(r => r.map(v => +v.toFixed(6)))),
    labels,
    logLikelihood: +logLik.toFixed(4),
    bic: +bic.toFixed(2),
    aic: +aic.toFixed(2),
    n,
    apa: `GMM (${K} components): BIC = ${bic.toFixed(1)}, weights: ${weights.map(w => (100 * w).toFixed(0) + '%').join(', ')}, N = ${n}`,
  };
}

// ── Calinski-Harabasz Index ───────────────────────────────────────────────────
/** Calinski–Harabasz cluster validity index. @param {Array<Record<string, number>>} data @param {string[]} vars @param {number[]} labels @param {number} k */
export function calinskiHarabasz(data, vars, labels, k) {
  const Xraw = data.filter(r => vars.every(v => Number.isFinite(+r[v]))).map(r => vars.map(v => +r[v]));
  const n = Xraw.length;
  if (n < k + 2 || k < 2) return null;
  const gm = Xraw[0].map((_, j) => avg(Xraw.map(r => r[j])));
  let ssB = 0;
  const clusterSizes = Array(k).fill(0);
  for (const l of labels) clusterSizes[l]++;
  for (let c = 0; c < k; c++) {
    if (!clusterSizes[c]) continue;
    const memb = Xraw.filter((_, i) => labels[i] === c);
    const cm = memb[0].map((_, j) => avg(memb.map(r => r[j])));
    const diff = cm.map((v, j) => v - gm[j]);
    ssB += clusterSizes[c] * diff.reduce((s, v) => s + v * v, 0);
  }
  let ssW = 0;
  for (let c = 0; c < k; c++) {
    const memb = Xraw.filter((_, i) => labels[i] === c);
    if (!memb.length) continue;
    const cm = memb[0].map((_, j) => avg(memb.map(r => r[j])));
    for (const x of memb) {
      for (let j = 0; j < x.length; j++) ssW += (x[j] - cm[j]) ** 2;
    }
  }
  if (ssW <= 0) return null;
  const ch = (ssB / (k - 1)) / (ssW / (n - k));
  return {
    test: 'Calinski-Harabasz Index',
    chIndex: +ch.toFixed(4),
    ssBetween: +ssB.toFixed(4),
    ssWithin: +ssW.toFixed(4),
    k, n,
    apa: `CH = ${ch.toFixed(2)}, k = ${k}, N = ${n}`,
  };
}

// ── Davies-Bouldin Index ──────────────────────────────────────────────────────
/** Davies–Bouldin cluster validity index. @param {Array<Record<string, number>>} data @param {string[]} vars @param {number[]} labels @param {number} k */
export function daviesBouldin(data, vars, labels, k) {
  const Xraw = data.filter(r => vars.every(v => Number.isFinite(+r[v]))).map(r => vars.map(v => +r[v]));
  const n = Xraw.length;
  if (n < k + 2 || k < 2) return null;
  const centroids = Array.from({ length: k }, (_, c) => {
    const memb = Xraw.filter((_, i) => labels[i] === c);
    if (!memb.length) return null;
    return memb[0].map((_, j) => avg(memb.map(r => r[j])));
  });
  if (centroids.some(c => !c)) return null;
  const S = Array.from({ length: k }, (_, c) => {
    const memb = Xraw.filter((_, i) => labels[i] === c);
    if (!memb.length) return 0;
    const cm = centroids[c];
    let sum = 0;
    for (const x of memb) {
      let d = 0;
      for (let j = 0; j < x.length; j++) d += (x[j] - cm[j]) ** 2;
      sum += Math.sqrt(d);
    }
    return sum / memb.length;
  });
  let db = 0;
  for (let i = 0; i < k; i++) {
    let maxR = 0;
    for (let j = 0; j < k; j++) {
      if (i === j) continue;
      const distij = Math.sqrt(centroids[i].reduce((s, v, q) => s + (v - centroids[j][q]) ** 2, 0));
      if (distij <= 0) continue;
      const R = (S[i] + S[j]) / distij;
      if (R > maxR) maxR = R;
    }
    db += maxR;
  }
  db /= k;
  return {
    test: 'Davies-Bouldin Index',
    dbIndex: +db.toFixed(4),
    k, n,
    apa: `DB = ${db.toFixed(3)}, k = ${k}, N = ${n}`,
  };
}

// ── Optimal k ─────────────────────────────────────────────────────────────────
/** Optimal cluster count search. @param {Array<Record<string, number>>} data @param {string[]} vars @param {number} [maxK=8] @param {{method?: string, seed?: number}} [options] */
export function optimalK(data, vars, maxK = 8, { method = 'silhouette', seed = 42 } = {}) {
  const Xraw = data.filter(r => vars.every(v => Number.isFinite(+r[v]))).map(r => vars.map(v => +r[v]));
  const n = Xraw.length;
  if (n < 5 || maxK < 2) return null;
  const limit = Math.min(maxK, n - 1);
  if (limit < 2) return null;
  const curve = [];
  for (let k = 2; k <= limit; k++) {
    const km = kmeans(data, vars, k, 50, seed + k);
    if (!km) continue;
    let value;
    if (method === 'silhouette') {
      const sil = _silhouette(Xraw, km.labels, k);
      value = sil != null ? sil : 0;
    } else if (method === 'ch') {
      const ch = calinskiHarabasz(data, vars, km.labels, k);
      value = ch ? ch.chIndex : 0;
    } else if (method === 'db') {
      const db = daviesBouldin(data, vars, km.labels, k);
      value = db ? db.dbIndex : Infinity;
    } else {
      return null;
    }
    curve.push({ k, value: +value.toFixed(4) });
  }
  if (!curve.length) return null;
  const optimal = method === 'db'
    ? curve.reduce((best, c) => c.value < best.value ? c : best, curve[0])
    : curve.reduce((best, c) => c.value > best.value ? c : best, curve[0]);
  return {
    test: 'Optimal k',
    optimalK: optimal.k,
    curve,
    method,
    maxK: limit,
    apa: `Optimal k = ${optimal.k} via ${method} (k=2..${limit}, N=${n})`,
  };
}

// ── Affinity Matrix ───────────────────────────────────────────────
/** Gaussian affinity (similarity) matrix. @param {Array<Record<string, number>>} data @param {string[]} vars @param {{sigma?: number|null}} [options] */
export function affinityMatrix(data, vars, { sigma = null } = {}) {
  if (!data || data.length < 5 || !vars || vars.length < 2) return null;
  const n = data.length;
  const X = data.map(r => vars.map(v => +r[v]));
  const dists = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => {
    if (i === j) return 0;
    let s = 0;
    for (let k = 0; k < X[i].length; k++) s += (X[i][k] - X[j][k]) ** 2;
    return Math.sqrt(s);
  }));
  const sig = sigma || avg(dists.flat().filter(v => v > 0)) || 1;
  const A = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) =>
    i === j ? 0 : +Math.exp(-dists[i][j] * dists[i][j] / (2 * sig * sig)).toFixed(4)
  ));
  return { test: 'Affinity Matrix', A, sigma: +sig.toFixed(4), n, apa: `Affinity: n = ${n}, σ = ${sig.toFixed(2)}` };
}

// ── Normalized Laplacian ──────────────────────────────────────────
/** Normalized graph Laplacian. @param {number[][]} A adjacency/affinity matrix. @param {{type?: string}} [options] */
export function normalizedLaplacian(A, { type = 'symmetric' } = {}) {
  if (!A || !A.length || A.length < 2) return null;
  const n = A.length;
  const D = A.map(row => row.reduce((s, v) => s + v, 0));
  const L = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => {
    if (i === j) return D[i] || 1;
    const denom = type === 'symmetric' ? Math.sqrt(Math.max(D[i] * D[j], 1)) : Math.max(D[i], 1);
    return +(-A[i][j] / denom).toFixed(4);
  }));
  if (type === 'symmetric') for (let i = 0; i < n; i++) L[i][i] = 1;
  else for (let i = 0; i < n; i++) L[i][i] = D[i] > 0 ? 1 : 1;
  return { test: 'Normalized Laplacian', L, type, n, apa: `Laplacian: ${type}, n = ${n}` };
}

// ── Spectral Embedding ────────────────────────────────────────────
/** Spectral embedding from an affinity matrix. @param {number[][]} A @param {number} [nClusters=2] @param {{type?: string}} [options] */
export function spectralEmbedding(A, nClusters = 2, { type = 'symmetric' } = {}) {
  if (!A || !A.length || nClusters < 2 || nClusters >= A.length) return null;
  const L = normalizedLaplacian(A, { type });
  if (!L) return null;
  const eigs = jacobiEigen(L.L);
  const vals = eigs.eigenvalues.sort((a, b) => a - b);
  const vecs = vals.slice(0, nClusters).map(v => {
    const idx = eigs.eigenvalues.indexOf(v);
    return eigs.eigenvectors[idx];
  });
  const n = A.length;
  const embedding = A.map((_, i) => vecs.map(vec => +(vec[i] || 0).toFixed(4)));
  return { test: 'Spectral Embedding', embedding, nClusters, n, apa: `Spectral embedding: ${nClusters} clusters` };
}

// ── Eigengap ──────────────────────────────────────────────────────
/** Eigengap heuristic for cluster count. @param {number[]} values sorted eigenvalues. */
export function eigengap(values) {
  if (!values || values.length < 2) return null;
  const sorted = [...values].sort((a, b) => a - b);
  let maxGap = 0, bestK = 2;
  for (let i = 0; i < Math.min(sorted.length - 1, 9); i++) {
    const gap = sorted[i + 1] - sorted[i];
    if (gap > maxGap) { maxGap = gap; bestK = i + 2; }
  }
  return { test: 'Eigengap', bestK, maxGap: +maxGap.toFixed(4), nValues: sorted.length, apa: `Eigengap: best k = ${bestK}` };
}

// ── Spectral Clustering ───────────────────────────────────────────
/** Spectral clustering. @param {Array<Record<string, number>>} data @param {string[]} vars @param {number} [nClusters=2] @param {{type?: string, sigma?: number|null, seed?: number}} [options] */
export function spectralClustering(data, vars, nClusters = 2, { type = 'symmetric', sigma = null, seed = 42 } = {}) {
  if (!data || !vars || data.length < 5) return null;
  const A = affinityMatrix(data, vars, { sigma });
  if (!A) return null;
  const emb = spectralEmbedding(/** @type {number[][]} */ (A.A || A), nClusters, { type });
  if (!emb) return null;
  const embed = emb.embedding;
  // k-means on embedding
  const k = nClusters, d = embed[0]?.length || 0;
  const rand = mulberry32(seed);
  const centroids = Array.from({ length: k }, () => embed[Math.floor(rand() * embed.length)]);
  let labels = Array(embed.length).fill(0);
  for (let iter = 0; iter < 20; iter++) {
    labels = embed.map(p => {
      let best = 0, bestD = Infinity;
      centroids.forEach((c, ci) => {
        const dist = c.reduce((s, v, j) => s + (p[j] - v) ** 2, 0);
        if (dist < bestD) { bestD = dist; best = ci; }
      });
      return best;
    });
    centroids.forEach((c, ci) => {
      const memb = embed.filter((_, i) => labels[i] === ci);
      if (memb.length) memb[0].forEach((_, j) => { c[j] = avg(memb.map(m => m[j])); });
    });
  }
  const n = data.length;
  return { test: 'Spectral Clustering', labels, nClusters: k, n, apa: `Spectral clustering: ${k} clusters, n = ${n}` };
}
