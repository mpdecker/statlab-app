import { describe, it, expect } from 'vitest';
import { kmeans, hierarchicalCluster, latentClassAnalysis } from './clustering.js';
import { clusterRows } from './fixtures/phase3.js';
import { expectKeys } from './__fixtures__/helpers.js';

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
