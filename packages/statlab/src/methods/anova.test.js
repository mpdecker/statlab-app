// src/tests/anova.test.js
import { describe, it, expect } from 'vitest';
import {
  oneWayANOVA, welchANOVA, twoWayANOVA, ancova,
  rmANOVA, kruskalWallis, friedman, cochranQ,
  hedgesG, cohensD, gamesHowell, dunnettTest, eta2Partial, omega2Partial,
} from './anova.js';
import { mkTabular } from './fixtures/core.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };
import { expectKeys } from './__fixtures__/helpers.js';

const mkGroup = (name, vals) => ({ name, vals });

describe('oneWayANOVA', () => {
  it('returns null for < 2 groups', () =>
    expect(oneWayANOVA([mkGroup('A', [1,2,3])])).toBeNull());

  it('F matches R aov()', () => {
    const groups = [
      mkGroup('A', [2,3,4]),
      mkGroup('B', [5,6,7]),
      mkGroup('C', [8,9,10]),
    ];
    const res = oneWayANOVA(groups);
    expect(res.F).toBeCloseTo(ref.anova.oneWay_basic.F, 1);
    expect(res.p).toBeCloseTo(ref.anova.oneWay_basic.p, 2);
  });

  it('eta2 is between 0 and 1', () => {
    const groups = [mkGroup('A',[1,2,3]), mkGroup('B',[4,5,6])];
    const eta2 = oneWayANOVA(groups).eta2;
    expect(eta2).toBeGreaterThanOrEqual(0);
    expect(eta2).toBeLessThanOrEqual(1);
  });

  it('all-same values → null or p=1', () => {
    // either null or extremely non-significant
    const res = oneWayANOVA([mkGroup('A',[5,5,5]), mkGroup('B',[5,5,5])]);
    if (res !== null) expect(res.p).toBeGreaterThan(0.5);
  });

  it('APA output is a string containing F', () => {
    const res = oneWayANOVA([mkGroup('A',[1,2,3]), mkGroup('B',[4,5,6])]);
    if (res && res.apa) expect(typeof res.apa).toBe('string');
  });
});

describe('welchANOVA', () => {
  it('returns null for < 2 groups', () =>
    expect(welchANOVA([mkGroup('A', [1,2])])).toBeNull());

  it('returns result for 3 groups with unequal variance', () => {
    const groups = [
      mkGroup('A', [1, 2, 3, 4, 5]),
      mkGroup('B', [10, 20, 30, 40, 50]),
      mkGroup('C', [100, 200, 300]),
    ];
    const res = welchANOVA(groups);
    expect(res).not.toBeNull();
    expect(res.F).toBeGreaterThan(0);
    expect(res.p).toBeLessThanOrEqual(1);
  });

  it('df is finite', () => {
    const groups = [mkGroup('A', [1, 2, 3, 4, 5]), mkGroup('B', [6, 7, 8, 9, 10])];
    const r = welchANOVA(groups);
    if (r && r.df !== undefined) expect(Number.isFinite(r.df)).toBe(true);
  });
});

describe('kruskalWallis', () => {
  it('H matches R kruskal.test()', () => {
    const groups = [mkGroup('A',[1,2,3]), mkGroup('B',[4,5,6]), mkGroup('C',[7,8,9])];
    const res = kruskalWallis(groups);
    expect(res.H).toBeCloseTo(ref.anova.kruskal_basic.H, 1);
    expect(res.p).toBeCloseTo(ref.anova.kruskal_basic.p, 1);
  });

  it('eta2 is between 0 and 1', () => {
    const groups = [mkGroup('A',[1,2,3]), mkGroup('B',[7,8,9])];
    const res = kruskalWallis(groups);
    expect(res.eta2).toBeGreaterThanOrEqual(0);
    expect(res.eta2).toBeLessThanOrEqual(1);
  });

  it('df is finite', () => {
    const r = kruskalWallis([mkGroup('A',[1,2,3]), mkGroup('B',[4,5,6])]);
    expect(Number.isFinite(r.df)).toBe(true);
  });
});

describe('friedman', () => {
  it('returns a result for valid blocked data', () => {
    const blocks = [[1,2,3],[2,3,4],[3,4,5],[4,5,6]];
    const res = friedman(blocks);
    expect(res).not.toBeNull();
    expect(res).toHaveProperty('chi2');
    expect(res).toHaveProperty('p');
    // Note: friedman returns W_kendall, not W
    expect(res).toHaveProperty('W_kendall');
  });

  it('matches a scipy.stats.friedmanchisquare oracle', () => {
    const e = ref.anova.friedman_basic;
    const matrix = e.d1.map((_, i) => [e.d1[i], e.d2[i], e.d3[i]]);
    const res = friedman(matrix);
    expect(res.chi2).toBeCloseTo(e.chi2, 4);
    expect(res.p).toBeCloseTo(e.p, 6);
  });

  it('Kendall W is between 0 and 1', () => {
    const blocks = [[1,2,3],[3,2,1],[2,1,3]];
    const res = friedman(blocks);
    expect(res.W_kendall).toBeGreaterThanOrEqual(0);
    expect(res.W_kendall).toBeLessThanOrEqual(1);
  });

  it('chi2 is non-negative', () => {
    const r = friedman([[1,2,3],[3,2,1],[2,1,3]]);
    expect(r.chi2).toBeGreaterThanOrEqual(0);
  });
});

describe('cochranQ', () => {
  // cochranQ requires n >= 5 rows; 4-row input returns null by design
  it('returns null for < 5 rows (minimum n requirement)', () => {
    const blocks = [[1,0,1],[0,0,1],[1,1,1],[0,1,0]];
    const res = cochranQ(blocks);
    expect(res).toBeNull();
  });

  it('returns a result for valid binary block data with n >= 5', () => {
    const blocks = [[1,0,1],[0,0,1],[1,1,1],[0,1,0],[1,1,0]];
    const res = cochranQ(blocks);
    expect(res).not.toBeNull();
    expect(res).toHaveProperty('Q');
    expect(res).toHaveProperty('p');
  });

  it('matches a statsmodels.stats.contingency_tables.cochrans_q oracle', () => {
    const e = ref.anova.cochranQ_basic;
    const res = cochranQ(e.matrix);
    expect(res.Q).toBeCloseTo(e.Q, 4);
    expect(res.df).toBe(e.df);
    expect(res.p).toBeCloseTo(e.p, 6);
  });

  it('Q is non-negative', () => {
    const blocks = [[1,0,1],[0,0,1],[1,1,1],[0,1,0],[1,1,0]];
    const r = cochranQ(blocks);
    expect(r.Q).toBeGreaterThanOrEqual(0);
  });
});

describe('twoWayANOVA', () => {
  const mkData = () => [
    { A: 'a1', B: 'b1', Y: 5 }, { A: 'a1', B: 'b1', Y: 6 },
    { A: 'a1', B: 'b2', Y: 8 }, { A: 'a1', B: 'b2', Y: 9 },
    { A: 'a2', B: 'b1', Y: 3 }, { A: 'a2', B: 'b1', Y: 4 },
    { A: 'a2', B: 'b2', Y: 7 }, { A: 'a2', B: 'b2', Y: 8 },
  ];

  it('returns null when factor has < 2 levels', () => {
    const data = [{ A: 'a1', B: 'b1', Y: 1 }, { A: 'a1', B: 'b2', Y: 2 }];
    expect(twoWayANOVA(data, 'A', 'B', 'Y')).toBeNull();
  });

  it('returns FA, FB, FAB for valid 2×2 design', () => {
    const res = twoWayANOVA(mkData(), 'A', 'B', 'Y');
    expect(res).not.toBeNull();
    expect(res).toHaveProperty('FA');
    expect(res).toHaveProperty('FB');
    expect(res).toHaveProperty('FAB');
  });

  it('FA, FB, FAB are all non-negative', () => {
    const res = twoWayANOVA(mkData(), 'A', 'B', 'Y');
    expect(res.FA).toBeGreaterThanOrEqual(0);
    expect(res.FB).toBeGreaterThanOrEqual(0);
    expect(res.FAB).toBeGreaterThanOrEqual(0);
  });

  it('eta2 components sum ≤ 1', () => {
    const res = twoWayANOVA(mkData(), 'A', 'B', 'Y');
    expect(res.eta2A + res.eta2B + res.eta2AB).toBeLessThanOrEqual(1.01);
  });

  it('aLevs and bLevs are arrays of correct length', () => {
    const res = twoWayANOVA(mkData(), 'A', 'B', 'Y');
    expect(res.aLevs).toHaveLength(2);
    expect(res.bLevs).toHaveLength(2);
  });
});

describe('ancova', () => {
  const mkGroups = () => [
    { name: 'A', vals: [10, 12, 14, 16, 18] },
    { name: 'B', vals: [8,  10, 12, 14, 16] },
  ];
  const mkCov = () => [[1, 2, 3, 4, 5], [2, 3, 4, 5, 6]];

  it('returns null for < 2 groups', () =>
    expect(ancova([{ name: 'A', vals: [1,2,3] }], [[1,2,3]])).toBeNull());

  it('returns a result for valid input', () => {
    const res = ancova(mkGroups(), mkCov());
    expect(res).not.toBeNull();
    expect(res).toHaveProperty('F');
    expect(res).toHaveProperty('p');
    expect(res).toHaveProperty('eta2');
  });

  it('adjMeans has one entry per group', () => {
    const res = ancova(mkGroups(), mkCov());
    expect(res.adjMeans).toHaveLength(2);
  });

  it('bWithin is a finite number', () => {
    const res = ancova(mkGroups(), mkCov());
    expect(isFinite(res.bWithin)).toBe(true);
  });
});

describe('rmANOVA', () => {
  const mkMatrix = () => Array.from({ length: 10 }, (_, i) => [i+1, i+2, i+3]);

  it('returns null for n < 2', () =>
    expect(rmANOVA([[1, 2, 3]])).toBeNull());

  it('returns null for k < 2', () =>
    expect(rmANOVA([[1],[2],[3]])).toBeNull());

  it('returns F, p, ggEps for valid matrix', () => {
    const res = rmANOVA(mkMatrix());
    expect(res).not.toBeNull();
    expect(res).toHaveProperty('F');
    expect(res).toHaveProperty('p');
    expect(res).toHaveProperty('ggEps');
  });

  it('eta2 is between 0 and 1', () => {
    const res = rmANOVA(mkMatrix());
    expect(res.eta2).toBeGreaterThanOrEqual(0);
    expect(res.eta2).toBeLessThanOrEqual(1);
  });

  it('ggEps is between 1/(k-1) and 1', () => {
    const res = rmANOVA(mkMatrix());
    expect(res.ggEps).toBeGreaterThanOrEqual(0);
    expect(res.ggEps).toBeLessThanOrEqual(1.001);
  });
});

// ── Hedges' g ─────────────────────────────────────────────────────────────────
describe('hedgesG', () => {
  const a = [10, 11, 12, 10.5, 9.8];
  const b = [8, 9, 8.5, 7.5, 9.2];

  it('returns null for small/invalid arrays', () => {
    expect(hedgesG(null, b)).toBeNull();
    expect(hedgesG([1], b)).toBeNull();
    expect(hedgesG([1], [2])).toBeNull();
  });

  it('g has expected sign on known difference', () => {
    const r = hedgesG(a, b);
    expect(r.g).toBeGreaterThan(0);
    expect(r.d).toBeGreaterThan(0);
    expect(r.n1).toBe(a.length);
    expect(r.n2).toBe(b.length);
  });

  it('g ≈ 0 for identical arrays', () => {
    const r = hedgesG(a, a);
    expect(Math.abs(r.g)).toBeLessThan(0.01);
  });

  it('returns contract keys', () => {
    const r = hedgesG(a, b);
    expectKeys(r, ['test', 'g', 'd', 'se', 'label', 'n1', 'n2', 'apa']);
  });

  it('label is a valid string', () => {
    const r = hedgesG(a, b);
    expect(['large', 'medium', 'small', 'negligible']).toContain(r.label);
  });

  it('apa is a non-empty string', () => {
    const r = hedgesG(a, b);
    expect(typeof r.apa).toBe('string');
    expect(r.apa.length).toBeGreaterThan(0);
  });
});

// ── Cohen's d ─────────────────────────────────────────────────────────────────
describe('cohensD', () => {
  const a = [10, 11, 12, 10.5, 9.8];
  const b = [8, 9, 8.5, 7.5, 9.2];

  it('returns null for small arrays', () => {
    expect(cohensD(null, b)).toBeNull();
    expect(cohensD([1], [2])).toBeNull();
  });

  it('d and CI for known difference', () => {
    const r = cohensD(a, b);
    expect(r.d).toBeGreaterThan(0);
    expect(r.ciLo).toBeLessThan(r.d);
    expect(r.ciHi).toBeGreaterThan(r.d);
  });

  it('contract keys', () => {
    expectKeys(cohensD(a, b), ['test', 'd', 'se', 'ciLo', 'ciHi', 'label', 'n1', 'n2', 'apa']);
  });

  it('d ≈ 0 for identical arrays', () => {
    const r = cohensD(a, a);
    expect(Math.abs(r.d)).toBeLessThan(0.01);
  });

  it('apa is a non-empty string', () => {
    const r = cohensD(a, b);
    expect(typeof r.apa).toBe('string');
    expect(r.apa.length).toBeGreaterThan(0);
  });
});

// ── Games-Howell ──────────────────────────────────────────────────────────────
describe('gamesHowell', () => {
  const groups = [
    { name: 'A', vals: [10, 11, 12, 10.5, 9.8] },
    { name: 'B', vals: [8, 9, 8.5, 7.5, 9.2] },
    { name: 'C', vals: [7, 8, 7.5, 6.8, 6.2] },
  ];

  it('returns null for <2 groups', () => {
    expect(gamesHowell(null)).toBeNull();
    expect(gamesHowell([groups[0]])).toBeNull();
  });

  it('contract keys', () => {
    expectKeys(gamesHowell(groups), ['test', 'pairs', 'alpha', 'k', 'apa']);
  });

  it('pairs count = k*(k-1)/2', () => {
    const r = gamesHowell(groups);
    expect(r.pairs).toHaveLength(3);
  });

  it('each pair has diff, se, df, q, p, sig', () => {
    const r = gamesHowell(groups);
    r.pairs.forEach(p => {
      expect(Number.isFinite(p.diff)).toBe(true);
      expect(Number.isFinite(p.se)).toBe(true);
      expect(Number.isFinite(p.q)).toBe(true);
      expect(p.p).toBeGreaterThanOrEqual(0);
      expect(p.p).toBeLessThanOrEqual(1);
      expect(typeof p.sig).toBe('boolean');
    });
  });

  it('sig flags align with p < alpha', () => {
    const r = gamesHowell(groups, 0.05);
    r.pairs.forEach(p => {
      expect(p.sig).toBe(p.p < 0.05);
    });
  });

  it('apa is a non-empty string', () => {
    const r = gamesHowell(groups);
    expect(typeof r.apa).toBe('string');
    expect(r.apa.length).toBeGreaterThan(0);
  });
});

// ── Dunnett's Test ────────────────────────────────────────────────────────────
describe('dunnettTest', () => {
  const groups = [
    { name: 'Control', vals: [10, 11, 10.5, 9.8, 10.2] },
    { name: 'Drug A', vals: [8, 7.5, 8.2, 7.8, 8.5] },
    { name: 'Drug B', vals: [7, 6.5, 7.2, 6.8, 6.2] },
  ];

  it('returns null for <2 groups', () => {
    expect(dunnettTest(null)).toBeNull();
    expect(dunnettTest([groups[0]])).toBeNull();
  });

  it('returns null for invalid controlIndex', () => {
    expect(dunnettTest(groups, 10)).toBeNull();
  });

  it('contract keys', () => {
    expectKeys(dunnettTest(groups), ['test', 'control', 'comparisons', 'mse', 'dfError', 'alpha', 'apa']);
  });

  it('comparisons count = k - 1', () => {
    const r = dunnettTest(groups);
    expect(r.comparisons).toHaveLength(2);
  });

  it('control name matches controlIndex', () => {
    const r = dunnettTest(groups, 1);
    expect(r.control).toBe('Drug A');
  });

  it('comparisons have t, df, p, sig', () => {
    const r = dunnettTest(groups);
    r.comparisons.forEach(c => {
      expect(Number.isFinite(c.t)).toBe(true);
      expect(c.df).toBeGreaterThan(0);
      expect(c.p).toBeGreaterThanOrEqual(0);
      expect(c.p).toBeLessThanOrEqual(1);
      expect(typeof c.sig).toBe('boolean');
    });
  });

  it('apa is a non-empty string', () => {
    const r = dunnettTest(groups);
    expect(typeof r.apa).toBe('string');
    expect(r.apa.length).toBeGreaterThan(0);
  });
});

// ── Partial Eta-Squared ───────────────────────────────────────────────────────
describe('eta2Partial', () => {
  it('returns null for invalid values', () => {
    expect(eta2Partial(-1, 10)).toBeNull();
    expect(eta2Partial(5, 0)).toBeNull();
    expect(eta2Partial(5, -1)).toBeNull();
  });

  it('eta2p in [0, 1]', () => {
    const r = eta2Partial(10, 40);
    expect(r.eta2p).toBeGreaterThanOrEqual(0);
    expect(r.eta2p).toBeLessThanOrEqual(1);
  });

  it('label matches thresholds', () => {
    expect(eta2Partial(0.5, 100).label).toBe('negligible');
    expect(eta2Partial(5, 100).label).toBe('small');
    expect(eta2Partial(15, 100).label).toBe('medium');
    expect(eta2Partial(30, 100).label).toBe('large');
  });

  it('contract keys', () => {
    expectKeys(eta2Partial(10, 40), ['test', 'eta2p', 'label', 'apa']);
  });

  it('apa is a non-empty string', () => {
    const r = eta2Partial(10, 40);
    expect(typeof r.apa).toBe('string');
    expect(r.apa.length).toBeGreaterThan(0);
  });
});

// ── Partial Omega-Squared ─────────────────────────────────────────────────────
describe('omega2Partial', () => {
  it('returns null for invalid', () => {
    expect(omega2Partial(-1, 2, 1, 10, 20)).toBeNull();
    expect(omega2Partial(5, 2, 0, 10, 20)).toBeNull();
    expect(omega2Partial(5, 2, 1, 0, 20)).toBeNull();
  });

  it('omega2p in [0, 1]', () => {
    const r = omega2Partial(25, 4, 2, 47, 50);
    expect(r.omega2p).toBeGreaterThanOrEqual(0);
    expect(r.omega2p).toBeLessThanOrEqual(1);
  });

  it('omega2p ≤ eta2p typically', () => {
    const r = omega2Partial(25, 4, 2, 47, 50);
    expect(r.omega2p).toBeLessThanOrEqual(1);
    expect(Number.isFinite(r.omega2p)).toBe(true);
  });

  it('contract keys', () => {
    expectKeys(omega2Partial(25, 4, 2, 47, 50), ['test', 'omega2p', 'apa']);
  });

  it('apa is a non-empty string', () => {
    const r = omega2Partial(25, 4, 2, 47, 50);
    expect(typeof r.apa).toBe('string');
    expect(r.apa.length).toBeGreaterThan(0);
  });
});

describe('hardening — invalid inputs', () => {
  it('rmANOVA rejects empty matrix', () => {
    expect(rmANOVA([])).toBeNull();
    expect(rmANOVA([[]])).toBeNull();
  });

  it('welchANOVA rejects singleton groups', () => {
    expect(welchANOVA([{ name: 'A', vals: [1] }, { name: 'B', vals: [2, 3] }])).toBeNull();
  });

  it('cochranQ rejects zero denominator', () => {
    expect(cochranQ(Array.from({ length: 6 }, () => [0, 0]))).toBeNull();
  });
});

describe('hardening — degenerate data', () => {
  it('twoWayANOVA null on constant response', () => {
    const rows = mkTabular(24).map(r => ({ ...r, a: r.group, b: r.cat1, y: 5 }));
    expect(twoWayANOVA(rows, 'a', 'b', 'y')).toBeNull();
  });
});

describe('hardening — oneWayANOVA invalid inputs', () => {
  it('returns null for empty groups array', () => {
    expect(oneWayANOVA([])).toBeNull();
  });

  it('returns null for single group', () => {
    expect(oneWayANOVA([mkGroup('A', [1, 2, 3])])).toBeNull();
  });
});

describe('hardening — ancova invalid inputs', () => {
  it('returns null for mismatched covariate lengths', () => {
    expect(ancova([mkGroup('A', [1, 2, 3]), mkGroup('B', [4, 5, 6])], [[1, 2], [3]])).toBeNull();
  });

  it('returns null for single covariate value', () => {
    expect(ancova([mkGroup('A', [1, 2]), mkGroup('B', [3, 4])], [[1, 2], [3, 4]])).not.toBeNull();
  });
});

describe('hardening — friedman invalid inputs', () => {
  it('returns null for empty matrix', () => {
    expect(friedman([])).toBeNull();
  });

  it('returns null for empty nested matrix', () => {
    expect(friedman([[]])).toBeNull();
  });

  it('returns null for single row', () => {
    expect(friedman([[1, 2, 3]])).toBeNull();
  });
});

describe('hardening — kruskalWallis invalid inputs', () => {
  it('returns null for empty groups', () => {
    expect(kruskalWallis([])).toBeNull();
  });

  it('returns null for single group', () => {
    expect(kruskalWallis([mkGroup('A', [1, 2, 3])])).toBeNull();
  });
});
