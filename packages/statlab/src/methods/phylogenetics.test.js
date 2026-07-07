import { describe, it, expect } from 'vitest';
import { independentContrasts, pagelsLambda, blombergK, phylogeneticSignal, picCorrelation, pglsRegression, diversificationRate, ouTraitModel } from './phylogenetics.js';
import { expectKeys } from './__fixtures__/helpers.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

const trait = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const trait2 = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];
const tree = [1, 2, 3, 4, 5];

describe('independentContrasts', () => { it('contract keys', () => expectKeys(independentContrasts(tree, trait), ['test', 'contrasts', 'mean', 't', 'n', 'apa'])); it('null<5', () => expect(independentContrasts([1,2], [1,2])).toBeNull()); it('contrasts array non-empty', () => { const r = independentContrasts(tree, trait); if (r) { expect(Array.isArray(r.contrasts)).toBe(true); expect(r.contrasts.length).toBeGreaterThan(0); } }) });
describe('pagelsLambda', () => { it('contract keys', () => expectKeys(pagelsLambda(trait, tree), ['test', 'lambda', 'n', 'apa'])); it('null<5', () => expect(pagelsLambda([1,2], tree)).toBeNull()); it('lambda between 0 and 1', () => { const r = pagelsLambda(trait, tree); if (r) { expect(r.lambda).toBeGreaterThanOrEqual(0); expect(r.lambda).toBeLessThanOrEqual(1); } }) });
describe('blombergK', () => { it('contract keys', () => expectKeys(blombergK(trait, tree), ['test', 'K', 'n', 'apa'])); it('null<5', () => expect(blombergK([1,2], tree)).toBeNull()); it('K non-negative', () => { const r = blombergK(trait, tree); if (r) expect(r.K).toBeGreaterThanOrEqual(0); }) });
describe('phylogeneticSignal', () => { it('contract keys', () => expectKeys(phylogeneticSignal(trait, tree), ['test', 'statistic', 'p', 'method', 'n', 'apa'])); it('p between 0 and 1', () => { const r = phylogeneticSignal(trait, tree); if (r) { expect(r.p).toBeGreaterThanOrEqual(0); expect(r.p).toBeLessThanOrEqual(1); } }); it('n positive', () => { const r = phylogeneticSignal(trait, tree); if (r) expect(r.n).toBeGreaterThan(0); }) });
describe('picCorrelation', () => { it('contract keys', () => expectKeys(picCorrelation(trait, trait2, tree), ['test', 'r', 'n', 'apa'])); it('null mismatch', () => expect(picCorrelation([1,2],[3,4,5], tree)).toBeNull()); it('r between -1 and 1', () => { const r = picCorrelation(trait, trait2, tree); if (r) { expect(r.r).toBeGreaterThanOrEqual(-1); expect(r.r).toBeLessThanOrEqual(1); } }) });

describe('pglsRegression', () => {
  const d = []; for (let i = 0; i < 10; i++) d.push({ x: i, y: i * 2 + Math.random() });
  it('contract keys', () => expectKeys(pglsRegression(d, 'x', 'y', 0.5), ['test','beta','lambda','n','apa']));
  it('null <5', () => expect(pglsRegression(d.slice(0,3), 'x', 'y')).toBeNull());
  it('beta finite', () => { const r = pglsRegression(d, 'x', 'y', 0.5); if (r && Array.isArray(r.beta)) expect(r.beta.every(b => Number.isFinite(b))).toBe(true); });
  it('lambda between 0 and 1', () => { const r = pglsRegression(d, 'x', 'y', 0.5); if (r) { expect(r.lambda).toBeGreaterThanOrEqual(0); expect(r.lambda).toBeLessThanOrEqual(1); } });
});
describe('diversificationRate', () => {
  const branches = [1.2, 0.8, 1.5, 0.6, 2.1, 0.9, 1.3, 0.7, 1.1, 0.5];
  it('contract keys', () => expectKeys(diversificationRate(branches), ['test','lambda','se','n','apa']));
  it('null <5', () => expect(diversificationRate([1,2])).toBeNull());
  it('lambda positive', () => { const r = diversificationRate(branches); if (r) expect(r.lambda).toBeGreaterThan(0); });
  it('se positive', () => { const r = diversificationRate(branches); if (r) expect(r.se).toBeGreaterThan(0); });
});
describe('ouTraitModel', () => {
  const d = []; for (let i = 0; i < 10; i++) d.push({ trait: 5 + i * 0.3 + Math.random() });
  it('contract keys', () => expectKeys(ouTraitModel(d, 'trait'), ['test','alpha','theta','sigma2','logLik','n','apa']));
  it('null <5', () => expect(ouTraitModel(d.slice(0,3), 'trait')).toBeNull());
  it('alpha positive', () => { const r = ouTraitModel(d, 'trait'); if (r) expect(r.alpha).toBeGreaterThan(0); });
  it('sigma2 positive', () => { const r = ouTraitModel(d, 'trait'); if (r) expect(r.sigma2).toBeGreaterThan(0); });
});

// ── Real tree-based validation (Brownian-motion simulation on a known tree) ──
function balancedVCV(D) { // 2^D tips, unit branches; C[i][j] = shared leading bits
  const nTips = 2 ** D;
  return Array.from({ length: nTips }, (_, i) => Array.from({ length: nTips }, (_, j) => {
    if (i === j) return D;
    let shared = 0; for (let b = D - 1; b >= 0; b--) { if (((i >> b) & 1) === ((j >> b) & 1)) shared++; else break; }
    return shared;
  }));
}
function chol(A) { const n = A.length, L = Array.from({ length: n }, () => Array(n).fill(0)); for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) { let s = A[i][j]; for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k]; L[i][j] = i === j ? Math.sqrt(Math.max(s, 1e-12)) : s / (L[j][j] || 1e-12); } return L; }
function mkRng(seed) { let s = seed; return () => { let u = 0; for (let k = 0; k < 12; k++) { s = (Math.imul(1664525, s) + 1013904223) >>> 0; u += s / 2 ** 32; } return u - 6; }; }
function simBM(L, z, sigma) { return L.map(row => row.reduce((s, v, j) => s + v * z[j], 0) * sigma); }

describe('phylogenetics: real tree-based comparative methods', () => {
  const D = 5, C = balancedVCV(D), n = C.length, L = chol(C), tree = { vcv: C };

  it('pagelsLambda ≈ 1 for Brownian-motion traits, ≈ 0 for iid noise', () => {
    const rng = mkRng(7);
    const bm = simBM(L, Array.from({ length: n }, () => rng()), 1);
    const iid = Array.from({ length: n }, () => rng());
    expect(pagelsLambda(bm, tree).lambda).toBeGreaterThan(0.4);  // clear phylogenetic signal
    expect(pagelsLambda(iid, tree).lambda).toBeLessThan(0.2);     // ~no signal
  });

  it('blombergK ≈ 1 for Brownian-motion traits', () => {
    const rng = mkRng(11);
    const bm = simBM(L, Array.from({ length: n }, () => rng()), 1);
    const r = blombergK(bm, tree);
    expect(r.K).toBeGreaterThan(0.5);
    expect(r.K).toBeLessThan(2);
  });

  it('pglsRegression recovers the slope under phylogenetic error', () => {
    const rng = mkRng(3);
    const x = simBM(L, Array.from({ length: n }, () => rng()), 1);
    const err = simBM(L, Array.from({ length: n }, () => rng()), 0.3);
    const beta1 = 1.8;
    const y = x.map((xi, i) => 2 + beta1 * xi + err[i]);
    const data = x.map((xi, i) => ({ x: xi, y: y[i] }));
    const r = pglsRegression(data, 'x', 'y', 1, { tree });
    expect(Math.abs(r.beta[1] - 1.8)).toBeLessThan(0.4);
  });

  it('picCorrelation recovers a known cross-trait correlation', () => {
    const rng = mkRng(5);
    const z1 = Array.from({ length: n }, () => rng());
    const z2 = Array.from({ length: n }, () => rng());
    const rho = 0.8;
    const t1 = simBM(L, z1, 1);
    const t2 = simBM(L, z1.map((v, i) => rho * v + Math.sqrt(1 - rho * rho) * z2[i]), 1);
    const r = picCorrelation(t1, t2, tree);
    expect(Math.abs(r.r - 0.8)).toBeLessThan(0.25);
    // independently-evolved traits: removes the spurious tree-driven correlation
    const indep1 = simBM(L, Array.from({ length: n }, () => rng()), 1);
    const indep2 = simBM(L, Array.from({ length: n }, () => rng()), 1);
    expect(Math.abs(picCorrelation(indep1, indep2, tree).r)).toBeLessThan(0.4);
  });

  it('ouTraitModel infers stronger pull (higher α) for weaker phylogenetic signal', () => {
    const rng = mkRng(9);
    const bm = simBM(L, Array.from({ length: n }, () => rng()), 1);   // strong signal → small α
    const noisy = Array.from({ length: n }, () => rng());             // no signal → large α
    const aBM = ouTraitModel(bm.map((v, i) => ({ trait: v })), 'trait', { tree }).alpha;
    const aNoise = ouTraitModel(noisy.map((v, i) => ({ trait: v })), 'trait', { tree }).alpha;
    expect(aNoise).toBeGreaterThan(aBM);
  });
});

describe('pglsRegression actually uses the phylogenetic tree (regression test for the ignored-tree/index-based-covariance fix)', () => {
  it('matches a from-scratch numpy GLS solve of X\'V^-1X b = X\'V^-1y for a real balanced-tree VCV', () => {
    const e = ref.phylogenetics.pgls_basic;
    const data = e.x.map((xi, i) => ({ x: xi, y: e.y[i] }));
    const r = pglsRegression(data, 'x', 'y', e.lambda, { tree: { vcv: e.vcv } });
    expect(r.beta[0]).toBeCloseTo(e.beta[0], 3);
    expect(r.beta[1]).toBeCloseTo(e.beta[1], 3);
  });
});

describe('hardening — phylogenetics edge cases', () => {
  it('independentContrasts null for null tree', () => expect(independentContrasts(null, trait)).toBeNull());
  it('independentContrasts null for <5 trait values', () => expect(independentContrasts(tree, [1,2,3,4])).toBeNull());
  it('pagelsLambda null for null trait', () => expect(pagelsLambda(null, tree)).toBeNull());
  it('pagelsLambda null for <5 trait values', () => expect(pagelsLambda([1,2,3], tree)).toBeNull());
  it('blombergK null for null trait', () => expect(blombergK(null, tree)).toBeNull());
  it('blombergK null for <5 values', () => expect(blombergK([1,2,3,4], tree)).toBeNull());
  it('phylogeneticSignal null for null trait', () => expect(phylogeneticSignal(null, tree)).toBeNull());
  it('phylogeneticSignal null for <5 values', () => expect(phylogeneticSignal([1,2], tree)).toBeNull());
  it('picCorrelation null for null trait1', () => expect(picCorrelation(null, trait2, tree)).toBeNull());
  it('picCorrelation null for mismatched lengths', () => expect(picCorrelation([1,2],[3,4,5], tree)).toBeNull());
  it('pglsRegression null for null data', () => expect(pglsRegression(null, 'x', 'y', 0.5)).toBeNull());
  it('pglsRegression null for missing xVar', () => { const d = [{x:1,y:2}]; expect(pglsRegression(d, '', 'y')).toBeNull(); });
  it('diversificationRate null for null branchLengths', () => expect(diversificationRate(null)).toBeNull());
  it('diversificationRate null for <5 branches', () => expect(diversificationRate([1,2,3,4])).toBeNull());
  it('ouTraitModel null for null data', () => expect(ouTraitModel(null, 'trait')).toBeNull());
  it('ouTraitModel null for <5 rows', () => { const d = []; for (let i = 0; i < 3; i++) d.push({ trait: i }); expect(ouTraitModel(d, 'trait')).toBeNull(); });
});
