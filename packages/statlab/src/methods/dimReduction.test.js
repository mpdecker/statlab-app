import { describe, it, expect } from 'vitest';
import { expectKeys } from './__fixtures__/helpers.js';
import { tsne, isomap, lle, umapApprox } from './dimReduction.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

const X = Array.from({length: 15}, () => Array.from({length: 3}, () => Math.random() * 10));

describe('tsne', () => {
  it('contract keys', () => expectKeys(tsne(X, { perplexity: 5, maxIter: 10 }), ['test','embedding','n','p','nComponents','apa']));
  it('null <5', () => expect(tsne(X.slice(0,3))).toBeNull());
  it('embedding has correct dimensions', () => { const r = tsne(X, { perplexity: 5, maxIter: 10 }); if (r) { expect(r.embedding.length).toBe(X.length); expect(r.embedding[0].length).toBe(r.nComponents) } });
});
describe('isomap', () => {
  it('contract keys', () => expectKeys(isomap(X, { nNeighbors: 3, nComponents: 2 }), ['test','embedding','n','p','nComponents','apa']));
  it('null <5', () => expect(isomap(X.slice(0,3))).toBeNull());
  it('embedding has n rows', () => { const r = isomap(X, { nNeighbors: 3, nComponents: 2 }); if (r) expect(r.embedding.length).toBe(X.length) });
});
describe('lle', () => {
  it('contract keys', () => expectKeys(lle(X, { nNeighbors: 3, nComponents: 2 }), ['test','embedding','n','p','nComponents','apa']));
  it('null <5', () => expect(lle(X.slice(0,3))).toBeNull());
  it('embedding has nComponents columns', () => { const r = lle(X, { nNeighbors: 3, nComponents: 2 }); if (r) expect(r.embedding[0].length).toBe(r.nComponents) });
});
describe('umapApprox', () => {
  it('contract keys', () => expectKeys(umapApprox(X), ['test','embedding','n','p','nComponents','apa']));
  it('null <5', () => expect(umapApprox(X.slice(0,3))).toBeNull());
  it('embedding has correct dimensions', () => { const r = umapApprox(X); if (r) { expect(r.embedding.length).toBe(X.length); expect(r.embedding[0].length).toBe(r.nComponents) } });
});

// ── Correctness tests for the real implementations ─────────────────
function twoClusters() {
  const pts = [];
  for (let i = 0; i < 8; i++) pts.push([Math.cos(i) * 0.3, Math.sin(i) * 0.3, (i % 2) * 0.1]);     // cluster A near origin
  for (let i = 0; i < 8; i++) pts.push([10 + Math.cos(i) * 0.3, 10 + Math.sin(i) * 0.3, (i % 2) * 0.1]); // cluster B far away
  return pts;
}
function separation(emb) {
  const A = emb.slice(0, 8), B = emb.slice(8);
  const dist = (u, v) => Math.hypot(...u.map((x, i) => x - v[i]));
  const mean = arr => arr.reduce((s, v) => s + v, 0) / arr.length;
  const within = [], between = [];
  for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) { within.push(dist(A[i], A[j])); within.push(dist(B[i], B[j])); }
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) between.push(dist(A[i], B[j]));
  return mean(between) / mean(within);
}

describe('tsne uses perplexity and the full KL gradient (incl. -Q repulsion)', () => {
  it('does not collapse and separates two clusters', () => {
    const r = tsne(twoClusters(), { perplexity: 4, maxIter: 400, seed: 1 });
    const A = r.embedding.slice(0, 8);
    const dist = (u, v) => Math.hypot(...u.map((x, i) => x - v[i]));
    let within = 0, cnt = 0;
    for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) { within += dist(A[i], A[j]); cnt++; }
    within /= cnt;
    expect(within).toBeGreaterThan(0.1);                 // -Q repulsion prevents within-cluster collapse
    expect(separation(r.embedding)).toBeGreaterThan(1.5); // clusters still separated
  });
});

describe('lle solves the constrained reconstruction weights', () => {
  it('reconstructs points lying on a plane with near-zero error', () => {
    const X = [];
    let s = 11; const rnd = () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return (s / 2 ** 32) * 2 - 1; };
    for (let i = 0; i < 14; i++) { const a = rnd(), b = rnd(); X.push([a, b, 2 * a - b]); } // 2D plane in 3D
    const r = lle(X, { nNeighbors: 4, nComponents: 2 });
    expect(r.reconError).toBeLessThan(1e-4); // solved weights reconstruct the plane; uniform 1/k would give O(0.1)
  });
});

describe('umapApprox is a real neighbor embedding (not plain PCA)', () => {
  it('separates two well-separated clusters', () => {
    const r = umapApprox(twoClusters(), { nNeighbors: 4, seed: 1 });
    expect(separation(r.embedding)).toBeGreaterThan(3);
  });
});

describe('isomap matches scikit-learn (regression test for the asymmetric-kNN-graph and missing-sqrt(eigenvalue)-scaling fixes)', () => {
  it('pairwise embedding distances correlate strongly with sklearn.manifold.Isomap on a near-1D helix', () => {
    const e = ref.dimReduction.isomap_basic;
    const r = isomap(e.X, { nNeighbors: e.nNeighbors, nComponents: e.nComponents });
    const n = e.X.length;
    const jsPdist = [];
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      jsPdist.push(Math.hypot(...r.embedding[i].map((v, k) => v - r.embedding[j][k])));
    }
    const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
    const mx = mean(jsPdist), my = mean(e.pairwiseDist);
    let cov = 0, vx = 0, vy = 0;
    for (let i = 0; i < jsPdist.length; i++) { cov += (jsPdist[i] - mx) * (e.pairwiseDist[i] - my); vx += (jsPdist[i] - mx) ** 2; vy += (e.pairwiseDist[i] - my) ** 2; }
    const correlation = cov / Math.sqrt(vx * vy);
    expect(correlation).toBeGreaterThan(0.9);
  });
});
