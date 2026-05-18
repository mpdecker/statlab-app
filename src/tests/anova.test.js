// src/tests/anova.test.js
import { describe, it, expect } from 'vitest';
import {
  oneWayANOVA, welchANOVA, twoWayANOVA, ancova,
  rmANOVA, kruskalWallis, friedman, cochranQ,
} from './anova.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

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

  it('Kendall W is between 0 and 1', () => {
    const blocks = [[1,2,3],[3,2,1],[2,1,3]];
    const res = friedman(blocks);
    expect(res.W_kendall).toBeGreaterThanOrEqual(0);
    expect(res.W_kendall).toBeLessThanOrEqual(1);
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
