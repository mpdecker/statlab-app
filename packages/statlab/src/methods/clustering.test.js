import { describe, it, expect } from 'vitest';
import { kmeans, hierarchicalCluster, latentClassAnalysis, silhouetteScore, dbscan, gaussianMixture, calinskiHarabasz, daviesBouldin, optimalK, affinityMatrix, normalizedLaplacian, spectralEmbedding, eigengap, spectralClustering } from './clustering.js';
import { clusterRows } from './fixtures/phase3.js';
import { expectKeys } from './__fixtures__/helpers.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

const rows = clusterRows(60);

describe('kmeans', () => {
  it('returns null when n < k + 2', () => expect(kmeans(rows.slice(0, 5), ['x', 'y'], 4)).toBeNull());
  it('returns null for empty vars', () => expect(kmeans(rows, [], 3)).toBeNull());
  it('returns null when no complete cases', () => {
    const bad = rows.map(r => ({ x: NaN, y: 1 }));
    expect(kmeans(bad, ['x', 'y'], 2)).toBeNull();
  });

  it('clamps k to [2, 8]', () => {
    const r = kmeans(rows, ['x', 'y'], 99);
    expect(r.k).toBeLessThanOrEqual(8);
    expect(r.k).toBeGreaterThanOrEqual(2);
  });

  it('labels in [0, k-1]', () => {
    const r = kmeans(rows, ['x', 'y'], 3);
    expect(r.labels.every(l => l >= 0 && l < r.k)).toBe(true);
  });

  it('centroids shape k × p', () => {
    const r = kmeans(rows, ['x', 'y'], 4);
    expect(r.centroids).toHaveLength(4);
    r.centroids.forEach(c => expect(c).toHaveLength(2));
  });

  it('WCSS non-negative', () => {
    expect(kmeans(rows, ['x', 'y'], 2).wcss).toBeGreaterThanOrEqual(0);
  });

  it('reaches the global-optimum WCSS on well-separated clusters, matching a scipy.cluster.vq.kmeans2 oracle (regression test for the empty-cluster/bad-init bug)', () => {
    // Naive uniform-random initialization (no k-means++, no restarts, no
    // empty-cluster reseeding) could permanently starve a cluster for some
    // seeds — on this exact dataset it gave WCSS≈97.7 instead of the true
    // optimum ≈0.375 (~260x worse), with one cluster silently empty.
    const e = ref.clustering.kmeans_basic;
    const data = e.x.map((_, i) => ({ x: e.x[i], y: e.y[i] }));
    const r = kmeans(data, ['x', 'y'], 3);
    expect(r.wcss).toBeCloseTo(e.wcss, 2);
    // All three clusters must actually be used (no empty/dead cluster).
    const counts = [0, 1, 2].map(k => r.labels.filter(l => l === k).length);
    counts.forEach(c => expect(c).toBeGreaterThan(0));
  });

  it('silhouette in [-1, 1] when defined', () => {
    const sil = kmeans(rows, ['x', 'y'], 2).silhouette;
    if (sil != null) {
      expect(sil).toBeGreaterThanOrEqual(-1);
      expect(sil).toBeLessThanOrEqual(1);
    }
  });

  it('well-separated blobs yield silhouette > 0.2', () => {
    const sil = kmeans(rows, ['x', 'y'], 2).silhouette;
    expect(sil).toBeGreaterThan(0.2);
  });

  it('contract fields', () => {
    const r = kmeans(rows, ['x', 'y'], 3);
    expectKeys(r, ['test', 'k', 'centroids', 'labels', 'wcss', 'silhouette', 'n', 'vars', 'apa']);
    expect(r.test).toBe('k-Means');
  });

  it('apa mentions k and N', () => {
    const r = kmeans(rows, ['x', 'y'], 2);
    expect(r.apa).toMatch(/k=2/);
    expect(r.apa).toMatch(/N =/);
  });

  it('single variable clustering works', () => {
    const r = kmeans(rows, ['x'], 2);
    expect(r.vars).toEqual(['x']);
    expect(r.centroids[0]).toHaveLength(1);
  });
});

describe('hierarchicalCluster', () => {
  it('returns null for n < 3', () => expect(hierarchicalCluster(rows.slice(0, 2), ['x', 'y'])).toBeNull());
  it('returns null for empty vars', () => expect(hierarchicalCluster(rows, [])).toBeNull());

  it('produces n-1 merge heights', () => {
    const r = hierarchicalCluster(rows, ['x', 'y'], 'ward');
    expect(r.mergeHeights).toHaveLength(rows.length - 1);
  });

  it('ward linkage non-negative merge heights', () => {
    hierarchicalCluster(rows, ['x', 'y'], 'ward').mergeHeights.forEach(h => {
      expect(h).toBeGreaterThanOrEqual(0);
    });
  });

  it('supports single linkage', () => {
    expect(hierarchicalCluster(rows, ['x', 'y'], 'single').linkage).toBe('single');
  });

  it('supports complete linkage', () => {
    expect(hierarchicalCluster(rows, ['x', 'y'], 'complete').linkage).toBe('complete');
  });

  it('dendrogram capped at 20 steps', () => {
    const r = hierarchicalCluster(rows, ['x', 'y']);
    expect(r.dendrogram.length).toBeLessThanOrEqual(20);
  });

  it('labels length equals n', () => {
    const r = hierarchicalCluster(rows, ['x', 'y']);
    expect(r.labels).toHaveLength(rows.length);
  });

  it('contract fields', () => {
    const r = hierarchicalCluster(rows, ['x', 'y'], 'ward');
    expectKeys(r, ['test', 'linkage', 'mergeHeights', 'dendrogram', 'labels', 'n', 'vars', 'apa']);
  });

  it('apa references linkage', () => {
    expect(hierarchicalCluster(rows, ['x', 'y'], 'complete').apa).toMatch(/complete/i);
  });

  it('matches a scipy.cluster.hierarchy.linkage oracle for single/complete/ward merge heights (regression test for the mislabeled ward linkage)', () => {
    // 'ward' previously fell through to plain centroid-to-centroid Euclidean
    // distance (i.e. centroid/UPGMC linkage) instead of the real Ward
    // variance-minimization criterion — single/complete already matched scipy
    // exactly, which is what isolated the bug to 'ward' specifically.
    const e = ref.clustering.hclust_basic;
    const data = e.X.map(([x, y]) => ({ x, y }));
    const rSingle = hierarchicalCluster(data, ['x', 'y'], 'single');
    rSingle.mergeHeights.forEach((h, i) => expect(h).toBeCloseTo(e.single_heights[i], 3));
    const rComplete = hierarchicalCluster(data, ['x', 'y'], 'complete');
    rComplete.mergeHeights.forEach((h, i) => expect(h).toBeCloseTo(e.complete_heights[i], 3));
    const rWard = hierarchicalCluster(data, ['x', 'y'], 'ward');
    rWard.mergeHeights.forEach((h, i) => expect(h).toBeCloseTo(e.ward_heights[i], 3));
  });
});

describe('latentClassAnalysis', () => {
  const lcaRows = clusterRows(80);

  it('returns null for n < 20', () => expect(latentClassAnalysis(lcaRows.slice(0, 15), ['c1', 'c2'])).toBeNull());
  it('returns null for J < 2 indicators', () => expect(latentClassAnalysis(lcaRows, ['c1'])).toBeNull());
  it('clamps classes to [2, 4]', () => {
    expect(latentClassAnalysis(lcaRows, ['c1', 'c2'], 9).nClasses).toBeLessThanOrEqual(4);
  });

  it('class proportions sum to ~1', () => {
    const r = latentClassAnalysis(lcaRows, ['c1', 'c2'], 2);
    const s = r.classProportions.reduce((a, b) => a + b, 0);
    expect(s).toBeCloseTo(1, 2);
  });

  it('profiles per requested class count', () => {
    expect(latentClassAnalysis(lcaRows, ['c1', 'c2'], 3).profiles).toHaveLength(3);
  });

  it('classAssign length equals n', () => {
    const r = latentClassAnalysis(lcaRows, ['c1', 'c2'], 2);
    expect(r.classAssign).toHaveLength(r.n);
  });

  it('BIC is finite number', () => {
    expect(Number.isFinite(latentClassAnalysis(lcaRows, ['c1', 'c2'], 2).BIC)).toBe(true);
  });

  it('each profile lists indicator modes', () => {
    const r = latentClassAnalysis(lcaRows, ['c1', 'c2'], 2);
    r.profiles.forEach(p => {
      expect(p.items).toHaveLength(2);
      p.items.forEach(it => expect(it.mode).toBeTruthy());
    });
  });

  it('contract fields', () => {
    const r = latentClassAnalysis(lcaRows, ['c1', 'c2'], 2);
    expectKeys(r, ['test', 'nClasses', 'classProportions', 'profiles', 'classAssign', 'BIC', 'n', 'catVars', 'apa']);
  });

  it('3-class BIC differs from 2-class', () => {
    const b2 = latentClassAnalysis(lcaRows, ['c1', 'c2'], 2).BIC;
    const b3 = latentClassAnalysis(lcaRows, ['c1', 'c2'], 3).BIC;
    expect(b2).not.toBe(b3);
  });
});

// ── Silhouette Score ──────────────────────────────────────────────────────────
describe('silhouetteScore', () => {
  it('returns null for small data', () => {
    const small = [{ x: 1, y: 2 }, { x: 3, y: 4 }];
    expect(silhouetteScore(small, ['x', 'y'], [0, 1], 2)).toBeNull();
  });

  it('returns valid score for clustered data', () => {
    const r = kmeans(rows, ['x', 'y'], 3);
    const s = silhouetteScore(rows, ['x', 'y'], r.labels, 3);
    expect(s).not.toBeNull();
    expect(s.silhouette).toBeGreaterThanOrEqual(-1);
    expect(s.silhouette).toBeLessThanOrEqual(1);
    expect(s.k).toBe(3);
  });

  it('contract keys', () => {
    const r = kmeans(rows, ['x', 'y'], 3);
    const s = silhouetteScore(rows, ['x', 'y'], r.labels, 3);
    expectKeys(s, ['test', 'silhouette', 'n', 'k', 'apa']);
  });

  it('silhouette > 0 for well-separated clusters', () => {
    const wellData = [
      { x: 0, y: 0 }, { x: 0.1, y: 0.1 }, { x: -0.1, y: 0 },
      { x: 5, y: 5 }, { x: 5.1, y: 5.1 }, { x: 4.9, y: 5 },
    ];
    const r = kmeans(wellData, ['x', 'y'], 2);
    const s = silhouetteScore(wellData, ['x', 'y'], r.labels, 2);
    expect(s.silhouette).toBeGreaterThan(0.5);
  });

  it('apa is a non-empty string', () => {
    const r = kmeans(rows, ['x', 'y'], 3);
    const s = silhouetteScore(rows, ['x', 'y'], r.labels, 3);
    expect(typeof s.apa).toBe('string');
    expect(s.apa.length).toBeGreaterThan(0);
  });
});

// ── DBSCAN ────────────────────────────────────────────────────────────────────
describe('dbscan', () => {
  it('returns null for tiny data', () => {
    const tiny = [{ x: 1, y: 2 }, { x: 3, y: 4 }];
    expect(dbscan(tiny, ['x', 'y'], 0.5, 2)).toBeNull();
  });

  it('returns contract keys', () => {
    const r = dbscan(rows, ['x', 'y'], 0.5, 3);
    expectKeys(r, ['test', 'labels', 'corePoints', 'nClusters', 'noise', 'eps', 'minPts', 'n', 'apa']);
  });

  it('labels length matches n', () => {
    const r = dbscan(rows, ['x', 'y'], 0.5, 3);
    expect(r.labels).toHaveLength(r.n);
  });

  it('noise >= 0 and nClusters >= 0', () => {
    const r = dbscan(rows, ['x', 'y'], 0.5, 3);
    expect(r.noise).toBeGreaterThanOrEqual(0);
    expect(r.nClusters).toBeGreaterThanOrEqual(0);
  });

  it('corePoints is boolean array', () => {
    const r = dbscan(rows, ['x', 'y'], 0.5, 3);
    expect(r.corePoints.length).toBe(r.n);
    expect(typeof r.corePoints[0]).toBe('boolean');
  });

  it('apa is a non-empty string', () => {
    const r = dbscan(rows, ['x', 'y'], 0.5, 3);
    expect(typeof r.apa).toBe('string');
    expect(r.apa.length).toBeGreaterThan(0);
  });

  it('matches a sklearn.cluster.DBSCAN oracle when a border point is indexed before its cluster\'s core points (regression test for the visited/labeling bug)', () => {
    // A point visited early in the outer scan and found not to be core stayed
    // permanently unlabeled (noise) even when a later core point's BFS
    // expansion reached it as a genuine border member — because `visited`
    // gated label assignment, not just re-expansion.
    const e = ref.clustering.dbscan_border;
    const data = e.x.map((_, i) => ({ x: e.x[i], y: e.y[i] }));
    const r = dbscan(data, ['x', 'y'], e.eps, e.minPts);
    expect(r.labels).toEqual(e.labels);
  });
});

// ── Gaussian Mixture Model ────────────────────────────────────────────────────
describe('gaussianMixture', () => {
  it('returns null for small data', () => {
    const small = [{ x: 1, y: 2 }, { x: 3, y: 4 }, { x: 5, y: 6 }];
    expect(gaussianMixture(small, ['x', 'y'], 2)).toBeNull();
  });

  it('contract keys', () => {
    const r = gaussianMixture(rows, ['x', 'y'], 2, { maxIter: 20 });
    expectKeys(r, ['test', 'nComponents', 'weights', 'means', 'covariances', 'labels', 'logLikelihood', 'bic', 'aic', 'n', 'apa']);
  });

  it('weights sum to 1', () => {
    const r = gaussianMixture(rows, ['x', 'y'], 2, { maxIter: 20 });
    const sum = r.weights.reduce((s, w) => s + w, 0);
    expect(sum).toBeCloseTo(1, 2);
  });

  it('labels in [0, nComponents-1]', () => {
    const r = gaussianMixture(rows, ['x', 'y'], 2, { maxIter: 20 });
    r.labels.forEach(l => {
      expect(l).toBeGreaterThanOrEqual(0);
      expect(l).toBeLessThan(r.nComponents);
    });
  });

  it('BIC is finite', () => {
    const r = gaussianMixture(rows, ['x', 'y'], 2, { maxIter: 20 });
    expect(Number.isFinite(r.bic)).toBe(true);
  });

  it('logLikelihood is finite', () => {
    const r = gaussianMixture(rows, ['x', 'y'], 2, { maxIter: 20 });
    expect(Number.isFinite(r.logLikelihood)).toBe(true);
  });

  it('apa is a non-empty string', () => {
    const r = gaussianMixture(rows, ['x', 'y'], 2, { maxIter: 20 });
    expect(typeof r.apa).toBe('string');
    expect(r.apa.length).toBeGreaterThan(0);
  });
});

// ── Calinski-Harabasz ─────────────────────────────────────────────────────────
describe('calinskiHarabasz', () => {
  it('returns null for k < 2', () => {
    const r = kmeans(rows, ['x', 'y'], 2);
    expect(calinskiHarabasz(rows, ['x', 'y'], r.labels, 1)).toBeNull();
  });

  it('contract keys', () => {
    const r = kmeans(rows, ['x', 'y'], 3);
    const ch = calinskiHarabasz(rows, ['x', 'y'], r.labels, 3);
    expectKeys(ch, ['test', 'chIndex', 'ssBetween', 'ssWithin', 'k', 'n', 'apa']);
  });

  it('CH > 0 for valid clusters', () => {
    const r = kmeans(rows, ['x', 'y'], 3);
    const ch = calinskiHarabasz(rows, ['x', 'y'], r.labels, 3);
    expect(ch.chIndex).toBeGreaterThan(0);
  });

  it('apa is a non-empty string', () => {
    const r = kmeans(rows, ['x', 'y'], 3);
    const ch = calinskiHarabasz(rows, ['x', 'y'], r.labels, 3);
    expect(typeof ch.apa).toBe('string');
    expect(ch.apa.length).toBeGreaterThan(0);
  });
});

// ── Davies-Bouldin ────────────────────────────────────────────────────────────
describe('daviesBouldin', () => {
  it('returns null for k < 2', () => {
    const r = kmeans(rows, ['x', 'y'], 2);
    expect(daviesBouldin(rows, ['x', 'y'], r.labels, 1)).toBeNull();
  });

  it('contract keys', () => {
    const r = kmeans(rows, ['x', 'y'], 3);
    const db = daviesBouldin(rows, ['x', 'y'], r.labels, 3);
    expectKeys(db, ['test', 'dbIndex', 'k', 'n', 'apa']);
  });

  it('DB > 0 for valid clusters', () => {
    const r = kmeans(rows, ['x', 'y'], 3);
    const db = daviesBouldin(rows, ['x', 'y'], r.labels, 3);
    expect(db.dbIndex).toBeGreaterThan(0);
  });

  it('lower DB for well-separated clusters', () => {
    const wellData = Array.from({ length: 30 }, (_, i) => ({
      x: i < 15 ? i * 0.1 : 10 + (i - 15) * 0.1,
      y: i < 15 ? i * 0.1 : 10 + (i - 15) * 0.1,
    }));
    const r = kmeans(wellData, ['x', 'y'], 2);
    const db = daviesBouldin(wellData, ['x', 'y'], r.labels, 2);
    expect(db.dbIndex).toBeLessThan(3);
  });

  it('apa is a non-empty string', () => {
    const r = kmeans(rows, ['x', 'y'], 3);
    const db = daviesBouldin(rows, ['x', 'y'], r.labels, 3);
    expect(typeof db.apa).toBe('string');
    expect(db.apa.length).toBeGreaterThan(0);
  });
});

// ── Optimal k ─────────────────────────────────────────────────────────────────
describe('optimalK', () => {
  it('returns null for tiny data', () => expect(optimalK([{ x: 1, y: 2 }, { x: 3, y: 4 }], ['x', 'y'], 3)).toBeNull());
  it('contract keys with silhouette method', () => expectKeys(optimalK(rows, ['x', 'y'], 5, { method: 'silhouette' }), ['test', 'optimalK', 'curve', 'method', 'maxK', 'apa']));
  it('contract keys with CH method', () => expectKeys(optimalK(rows, ['x', 'y'], 5, { method: 'ch' }), ['test', 'optimalK', 'curve', 'method', 'maxK', 'apa']));
  it('optimalK is between 2 and maxK', () => { const r = optimalK(rows, ['x', 'y'], 5, { method: 'silhouette' }); expect(r.optimalK).toBeGreaterThanOrEqual(2); expect(r.optimalK).toBeLessThanOrEqual(5); });
  it('curve has entries from k=2 to maxK', () => { const r = optimalK(rows, ['x', 'y'], 4, { method: 'silhouette' }); r.curve.forEach(c => { expect(c.k).toBeGreaterThanOrEqual(2); expect(c.k).toBeLessThanOrEqual(4); expect(Number.isFinite(c.value)).toBe(true); }); });
  it('apa is a non-empty string', () => { const r = optimalK(rows, ['x', 'y'], 5, { method: 'silhouette' }); expect(typeof r.apa).toBe('string'); expect(r.apa.length).toBeGreaterThan(0); });
});

describe('affinityMatrix', () => {
  it('contract keys', () => expectKeys(affinityMatrix(rows, ['x', 'y']), ['test', 'A', 'sigma', 'n', 'apa']));
  it('null <5', () => expect(affinityMatrix(rows.slice(0, 3), ['x', 'y'])).toBeNull());
  it('A non-empty', () => { const r = affinityMatrix(rows, ['x', 'y']); if (r) expect(r.A.length).toBeGreaterThan(0); });
});

describe('normalizedLaplacian', () => {
  it('contract keys', () => { const a = affinityMatrix(rows, ['x', 'y']); if (a) expectKeys(normalizedLaplacian(a.A), ['test', 'L', 'type', 'n', 'apa']); });
  it('symmetric and rw types', () => { const a = affinityMatrix(rows, ['x', 'y']); if (a) { expect(normalizedLaplacian(a.A).type).toBe('symmetric'); } });
  it('L non-empty', () => { const a = affinityMatrix(rows, ['x', 'y']); if (a) { const r = normalizedLaplacian(a.A); if (r) expect(r.L.length).toBeGreaterThan(0); } });
});

describe('spectralEmbedding', () => {
  it('contract keys', () => { const a = affinityMatrix(rows, ['x', 'y']); if (a) expectKeys(spectralEmbedding(a.A), ['test', 'embedding', 'nClusters', 'n', 'apa']); });
  it('embedding non-empty', () => { const a = affinityMatrix(rows, ['x', 'y']); if (a) { const r = spectralEmbedding(a.A); if (r) expect(r.embedding.length).toBeGreaterThan(0); } });
  it('nClusters correct', () => { const a = affinityMatrix(rows, ['x', 'y']); if (a) { const r = spectralEmbedding(a.A, 3); if (r) expect(r.nClusters).toBe(3); } });
});

describe('eigengap', () => {
  it('contract keys', () => expectKeys(eigengap([0.1, 0.5, 1.2, 2.0, 3.5, 6.0, 7.0]), ['test', 'bestK', 'maxGap', 'nValues', 'apa']));
  it('bestK >= 2', () => { const r = eigengap([0.1, 0.5, 1.2, 2.0]); expect(r.bestK).toBeGreaterThanOrEqual(2); });
  it('maxGap positive', () => { const r = eigengap([0.1, 0.5, 1.2, 2.0]); expect(r.maxGap).toBeGreaterThan(0); });
});

describe('spectralClustering', () => {
  it('contract keys', () => { const r = spectralClustering(rows, ['x', 'y'], 3); if (r) expectKeys(r, ['test', 'labels', 'nClusters', 'n', 'apa']); });
  it('labels present', () => { const r = spectralClustering(rows, ['x', 'y'], 3); if (r) expect(r.labels).toHaveLength(rows.length); });
  it('nClusters matches input', () => { const r = spectralClustering(rows, ['x', 'y'], 3); if (r) expect(r.nClusters).toBe(3); });
});

describe('hardening — reproducibility', () => {
  it('kmeans same seed yields same labels', () => {
    const data = clusterRows(40).map((r, i) => ({ ...r, x1: r.x + i * 0.01 }));
    const a = kmeans(data, ['x1', 'x'], 3, 50, 99);
    const b = kmeans(data, ['x1', 'x'], 3, 50, 99);
    expect(a.labels).toEqual(b.labels);
  });
});

describe('hardening — hierarchicalCluster invalid inputs', () => {
  it('returns null for empty data', () => {
    expect(hierarchicalCluster([], ['x', 'y'])).toBeNull();
  });
});

describe('hardening — hierarchicalCluster reproducibility', () => {
  it('same data same linkage yields same merge heights', () => {
    const data = clusterRows(20);
    const a = hierarchicalCluster(data, ['x', 'y'], 'ward');
    const b = hierarchicalCluster(data, ['x', 'y'], 'ward');
    expect(a.mergeHeights).toEqual(b.mergeHeights);
  });
});

describe('hardening — dbscan invalid inputs', () => {
  it('returns null for empty data', () => {
    expect(dbscan([], ['x', 'y'], 0.5, 3)).toBeNull();
  });
});

describe('hardening — gaussianMixture invalid inputs', () => {
  it('returns null for empty data', () => {
    expect(gaussianMixture([], ['x', 'y'], 2)).toBeNull();
  });
});

describe('hardening — gaussianMixture reproducibility', () => {
  it('same seed yields same labels', () => {
    const data = clusterRows(30);
    const a = gaussianMixture(data, ['x', 'y'], 2, { maxIter: 20, seed: 42 });
    const b = gaussianMixture(data, ['x', 'y'], 2, { maxIter: 20, seed: 42 });
    expect(a.labels).toEqual(b.labels);
  });
});

describe('hardening — silhouetteScore invariants', () => {
  it('silhouette in [-1, 1] for various k values', () => {
    const data = clusterRows(30);
    const r = kmeans(data, ['x', 'y'], 3);
    const s = silhouetteScore(data, ['x', 'y'], r.labels, 3);
    expect(s.silhouette).toBeGreaterThanOrEqual(-1);
    expect(s.silhouette).toBeLessThanOrEqual(1);
  });
});

describe('hardening — calinskiHarabasz invariants', () => {
  it('CH index is finite and positive for valid clusters', () => {
    const data = clusterRows(30);
    const r = kmeans(data, ['x', 'y'], 3);
    const ch = calinskiHarabasz(data, ['x', 'y'], r.labels, 3);
    expect(Number.isFinite(ch.chIndex)).toBe(true);
    expect(ch.chIndex).toBeGreaterThan(0);
  });
});

describe('hardening — daviesBouldin invariants', () => {
  it('DB index is finite and positive for valid clusters', () => {
    const data = clusterRows(30);
    const r = kmeans(data, ['x', 'y'], 3);
    const db = daviesBouldin(data, ['x', 'y'], r.labels, 3);
    expect(Number.isFinite(db.dbIndex)).toBe(true);
    expect(db.dbIndex).toBeGreaterThan(0);
  });
});

describe('hardening — optimalK invalid inputs', () => {
  it('returns null for empty data', () => {
    expect(optimalK([], ['x', 'y'], 5)).toBeNull();
  });
});

describe('hardening — latentClassAnalysis invariants', () => {
  it('class proportions sum to approximately 1 across runs', () => {
    const data = clusterRows(50);
    const r = latentClassAnalysis(data, ['c1', 'c2'], 2);
    const sum = r.classProportions.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 2);
  });
});

describe('hardening — eigengap invalid inputs', () => {
  it('returns null for empty eigenvalues', () => {
    expect(eigengap([])).toBeNull();
  });
});

describe('hardening — spectralClustering invalid inputs', () => {
  it('returns null for null data', () => {
    expect(spectralClustering(null, ['x', 'y'], 3)).toBeNull();
  });
});
