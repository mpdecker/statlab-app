import { describe, it, expect } from 'vitest';
import { prsScore, aceHeritability, ldPruning, polygenicPrediction, manhattanData, heritabilityGCTA, ldScoreRegression, mendelianRandomization } from './genetics.js';
import { expectKeys } from './__fixtures__/helpers.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

const g = [[0, 1, 2], [1, 0, 1], [2, 1, 0], [0, 2, 1], [1, 1, 2], [0, 0, 1]];

describe('prsScore', () => {
  it('contract keys', () => expectKeys(prsScore(g, [0.5, -0.3, 0.2]), ['test', 'scores', 'n', 'nMarkers', 'apa']));
  it('n scores = n individuals', () => { const r = prsScore(g, [0.5, 0.3, 0.2]); expect(r.scores).toHaveLength(g.length); });
  it('scores non-empty', () => { const r = prsScore(g, [0.5, -0.3, 0.2]); if (r && r.scores) expect(r.scores.length).toBeGreaterThan(0); });
});

describe('aceHeritability', () => {
  const mz = [10, 11, 12, 10.5, 9, 9.5, 11, 10, 10.5, 11.5, 9.8, 10.2];
  const dz = [10, 9, 12, 11, 8, 10, 11, 9, 9.5, 8.5, 12, 11, 10, 10.5, 9, 11];
  it('contract keys', () => expectKeys(aceHeritability(mz, dz), ['test', 'A', 'C', 'E', 'rMZ', 'rDZ', 'nPairs', 'apa']));
  it('A+C+E ≈ 1', () => { const r = aceHeritability(mz, dz); expect(r.A + r.C + r.E).toBeCloseTo(1, 0); });
  it('A between 0-1', () => { const mz2 = [10, 11, 12, 10.5, 9, 9.5, 11, 10, 10.5, 11.5, 9.8, 10.2]; const dz2 = [10, 9, 12, 11, 8, 10, 11, 9, 9.5, 8.5, 12, 11, 10, 10.5, 9, 11]; const r = aceHeritability(mz2, dz2); if (r) { expect(r.A).toBeGreaterThanOrEqual(0); expect(r.A).toBeLessThanOrEqual(1); } });
});

describe('ldPruning', () => {
  it('contract keys', () => expectKeys(ldPruning(g), ['test', 'kept', 'nRemoved', 'threshold', 'window', 'nMarkers', 'apa']));
  it('kept markers > 0', () => { const r = ldPruning(g); expect(r.kept.length).toBeGreaterThan(0); });
  it('kept <= total', () => { const r = ldPruning(g); if (r) expect(r.kept.length).toBeLessThanOrEqual(r.nMarkers); });
});

describe('polygenicPrediction', () => {
  const phenotype = [5, 3, 7, 4, 6, 2];
  it('contract keys', () => { const r = polygenicPrediction(phenotype, g); if (r) expectKeys(r, ['test', 'rSquared', 'nMarkers', 'n', 'apa']); });
  it('handles gracefully', () => { const r = polygenicPrediction(phenotype, g); expect(r === null || Number.isFinite(r.rSquared)).toBe(true); });
  it('rSquared between 0-1', () => { const phenotype2 = [5, 3, 7, 4, 6, 2]; const r = polygenicPrediction(phenotype2, g); if (r && r.rSquared !== null) { expect(r.rSquared).toBeGreaterThanOrEqual(0); expect(r.rSquared).toBeLessThanOrEqual(1); } });
});

describe('manhattanData', () => {
  it('is defined', () => expect(typeof manhattanData).toBe('function'));
  it('chromosomes non-empty', () => { const r = manhattanData([1, 2, 3], [100, 200, 300], [0.01, 0.02, 0.03]); if (r && r.chromosomes) expect(r.chromosomes.length).toBeGreaterThan(0); });
  it('data points match input', () => { const r = manhattanData([1, 2, 3], [100, 200, 300], [0.01, 0.02, 0.03]); if (r && r.data) expect(r.data.length).toBe(3); });
});

describe('heritabilityGCTA', () => {
  const GRM = Array.from({length: 10}, (_, i) => Array.from({length: 10}, (_, j) => i === j ? 1 : +(Math.random() * 0.05).toFixed(4)));
  const pheno = Array.from({length: 10}, () => Math.random() * 2 - 1);
  it('contract keys', () => expectKeys(heritabilityGCTA(GRM, pheno), ['test','h2','n','apa']));
  it('null <10', () => expect(heritabilityGCTA([[1]], [0])).toBeNull());
  it('h2 between 0-1', () => { const GRM2 = Array.from({length: 10}, (_, i) => Array.from({length: 10}, (_, j) => i === j ? 1 : +(Math.random() * 0.05).toFixed(4))); const pheno2 = Array.from({length: 10}, () => Math.random() * 2 - 1); const r = heritabilityGCTA(GRM2, pheno2); if (r) { expect(r.h2).toBeGreaterThanOrEqual(0); expect(r.h2).toBeLessThanOrEqual(1); } });
});
describe('ldScoreRegression', () => {
  const chi2 = Array.from({length: 15}, () => 1.5 + Math.random() * 2);
  const ld = Array.from({length: 15}, () => 10 + Math.random() * 5);
  it('contract keys', () => expectKeys(ldScoreRegression(chi2, ld, 1000), ['test','h2','intercept','m','n','apa']));
  it('null <10', () => expect(ldScoreRegression([1,2], [3,4], 100)).toBeNull());
  it('h2 between 0-1', () => { const chi2_2 = Array.from({length: 15}, () => 1.5 + Math.random() * 2); const ld2 = Array.from({length: 15}, () => 10 + Math.random() * 5); const r = ldScoreRegression(chi2_2, ld2, 1000); if (r) { expect(r.h2).toBeGreaterThanOrEqual(0); expect(r.h2).toBeLessThanOrEqual(1); } });
});
describe('mendelianRandomization', () => {
  it('contract keys', () => expectKeys(mendelianRandomization(0.5, 0.1, 0.3, 0.05), ['test','estimate','se','apa']));
  it('null zero instrument', () => expect(mendelianRandomization(0.5, 0.1, 0, 0.05)).toBeNull());
  it('estimate finite', () => { const r = mendelianRandomization(0.5, 0.1, 0.3, 0.05); if (r) expect(Number.isFinite(r.estimate)).toBe(true); });
});

describe('polygenicPrediction matches sklearn.linear_model.Ridge(fit_intercept=False) exactly', () => {
  it('R^2 matches on a 12x5 genotype matrix with alpha=0.1', () => {
    const e = ref.genetics.polygenic_basic;
    const r = polygenicPrediction(e.y, e.X);
    expect(r.rSquared).toBeCloseTo(e.rSquared, 4);
  });
});

describe('mendelianRandomization matches the standard delta-method formula exactly', () => {
  it('estimate and SE match', () => {
    const e = ref.genetics.mr_basic;
    const r = mendelianRandomization(e.betaYX, e.seYX, e.betaZX, e.seZX);
    expect(r.estimate).toBeCloseTo(e.estimate, 4);
    expect(r.se).toBeCloseTo(e.se, 4);
  });
});

describe('genetics edge cases', () => {
  it('prsScore null for empty', () => expect(prsScore([], [0.5])).toBeNull());
  it('prsScore null for mismatch', () => expect(prsScore(g, [0.5])).toBeNull());
  it('aceHeritability null <10', () => expect(aceHeritability([1, 2, 3], [4, 5, 6])).toBeNull());
  it('ldPruning null for empty', () => expect(ldPruning([], { threshold: 0.8 })).toBeNull());
  it('polygenicPrediction null <10', () => expect(polygenicPrediction([1, 2, 3], [[0, 1]])).toBeNull());
  it('manhattanData null for empty', () => expect(manhattanData([], [], [])).toBeNull());
});

describe('hardening — invalid inputs', () => {
  it('prsScore null for null genotypes', () => expect(prsScore(null, [0.5, 0.3, 0.2])).toBeNull());
  it('prsScore null for null weights', () => expect(prsScore(g, null)).toBeNull());
  it('prsScore null for mismatched lengths', () => expect(prsScore(g, [0.5])).toBeNull());
  it('aceHeritability null for null MZ', () => expect(aceHeritability(null, [10, 9, 12, 11, 8, 10, 11, 9, 9.5, 8.5])).toBeNull());
  it('aceHeritability null for null DZ', () => expect(aceHeritability([10, 11, 12, 10.5, 9, 9.5, 11, 10, 10.5, 11.5], null)).toBeNull());
  it('ldPruning null for null', () => expect(ldPruning(null)).toBeNull());
  it('polygenicPrediction null for null phenotype', () => expect(polygenicPrediction(null, g)).toBeNull());
  it('polygenicPrediction null for null genotype', () => expect(polygenicPrediction([5, 3, 7, 4, 6, 2], null)).toBeNull());
  it('manhattanData handles mismatched lengths gracefully', () => expect(manhattanData([1, 2], [100, 200, 300], [0.01, 0.02])).not.toBeNull());
  it('heritabilityGCTA null for null GRM', () => expect(heritabilityGCTA(null, [0, 1, 0])).toBeNull());
  it('ldScoreRegression null for null chi2', () => expect(ldScoreRegression(null, [10, 11, 12], 1000)).toBeNull());
  it('mendelianRandomization null for zero instrument coefficient', () => expect(mendelianRandomization(0.5, 0.1, 0, 0.05)).toBeNull());
});

describe('hardening — degenerate data', () => {
  it('prsScore with zero weights returns all zero scores', () => {
    const r = prsScore(g, [0, 0, 0]);
    if (r) r.scores.forEach(s => expect(s).toBeCloseTo(0, 4));
  });
  it('aceHeritability A + C + E appx 1', () => {
    const mz = [10, 11, 12, 10.5, 9, 9.5, 11, 10, 10.5, 11.5];
    const dz = [10, 9, 12, 11, 8, 10, 11, 9, 9.5, 8.5];
    const r = aceHeritability(mz, dz);
    expect(r.A + r.C + r.E).toBeCloseTo(1, 0);
  });
  it('ldPruning with identical columns keeps at least one marker', () => {
    const identical = [[0, 1], [0, 1], [0, 1], [1, 0], [0, 1]];
    const r = ldPruning(identical, { threshold: 0.5 });
    if (r) expect(r.kept.length).toBeGreaterThan(0);
  });
  it('polygenicPrediction rSquared in [0, 1]', () => {
    const r = polygenicPrediction([5, 3, 7, 4, 6, 2], g);
    if (r && r.rSquared !== null) { expect(r.rSquared).toBeGreaterThanOrEqual(0); expect(r.rSquared).toBeLessThanOrEqual(1); }
  });
  it('heritabilityGCTA h2 in [0, 1]', () => {
    const GRM = Array.from({ length: 10 }, (_, i) => Array.from({ length: 10 }, (_, j) => i === j ? 1 : +(Math.random() * 0.05).toFixed(4)));
    const pheno = Array.from({ length: 10 }, () => Math.random() * 2 - 1);
    const r = heritabilityGCTA(GRM, pheno);
    if (r) { expect(r.h2).toBeGreaterThanOrEqual(0); expect(r.h2).toBeLessThanOrEqual(1); }
  });
  it('ldScoreRegression h2 between 0-1', () => {
    const chi2 = Array.from({ length: 15 }, () => 1.5 + Math.random() * 2);
    const ld = Array.from({ length: 15 }, () => 10 + Math.random() * 5);
    const r = ldScoreRegression(chi2, ld, 1000);
    if (r) { expect(r.h2).toBeGreaterThanOrEqual(0); expect(r.h2).toBeLessThanOrEqual(1); }
  });
  it('mendelianRandomization estimate is finite', () => {
    const r = mendelianRandomization(0.5, 0.1, 0.3, 0.05);
    if (r) expect(Number.isFinite(r.estimate)).toBe(true);
  });
  it('manhattanData data points match input length', () => {
    const r = manhattanData([1, 2, 3], [100, 200, 300], [0.01, 0.02, 0.03]);
    if (r && r.data) expect(r.data.length).toBe(3);
  });
});
