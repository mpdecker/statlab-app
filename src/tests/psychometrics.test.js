import { describe, it, expect } from 'vitest';
import { omegaMcDonald, parallelAnalysis, irtRasch1PL, irt2PL, scaleScore } from './psychometrics.js';
import { itemMatrix, itemRows, binaryMatrix } from './fixtures/phase3.js';
import { expectKeys } from './__fixtures__/helpers.js';

const mkMatrix = (n = 40, k = 4) => itemMatrix(n, k, 42);
const mkRows = (n = 40) => itemRows(n, ['x1', 'x2', 'x3', 'x4'], 42);

describe('omegaMcDonald', () => {
  it('returns null for empty matrix', () => expect(omegaMcDonald([])).toBeNull());
  it('returns null for k < 2', () => expect(omegaMcDonald([[1, 2], [3, 4]])).toBeNull());
  it('returns null when n < k + 3', () => expect(omegaMcDonald(mkMatrix(4, 4))).toBeNull());
  it('returns null for single column', () => expect(omegaMcDonald(mkMatrix(30, 1))).toBeNull());

  it('omega total in (0, 1]', () => {
    const r = omegaMcDonald(mkMatrix());
    expect(r.omegaTotal).toBeGreaterThan(0);
    expect(r.omegaTotal).toBeLessThanOrEqual(1);
  });

  it('omega hierarchical matches total in 1-factor model', () => {
    const r = omegaMcDonald(mkMatrix());
    expect(r.omegaHierarchical).toBe(r.omegaTotal);
  });

  it('exposes contract fields', () => {
    const r = omegaMcDonald(mkMatrix());
    expectKeys(r, ['test', 'omegaTotal', 'omegaHierarchical', 'label', 'k', 'n', 'loadings', 'apa']);
    expect(r.test).toBe("McDonald's ω");
  });

  it('loadings length equals k', () => {
    const k = 6;
    expect(omegaMcDonald(mkMatrix(50, k)).loadings).toHaveLength(k);
  });

  it('label tier reflects magnitude', () => {
    const r = omegaMcDonald(mkMatrix(80, 8, 1));
    const tiers = ['excellent', 'good', 'acceptable', 'questionable'];
    expect(tiers).toContain(r.label);
  });

  it('apa mentions omega and N', () => {
    const r = omegaMcDonald(mkMatrix());
    expect(r.apa).toMatch(/ω/);
    expect(r.apa).toMatch(/N =/);
  });

  it('higher inter-item correlation yields higher omega', () => {
    const weak = itemMatrix(50, 4, 1).map((row, i) => row.map((v, j) => v + (i === j ? 5 : 0) * 0.01));
    const strong = itemMatrix(50, 4, 1).map((row, i) =>
      row.map((v, j) => v + (j === 0 ? i * 0.5 : v * 0.05)));
    const w = omegaMcDonald(weak).omegaTotal;
    const s = omegaMcDonald(strong).omegaTotal;
    expect(s).toBeGreaterThanOrEqual(w);
  });
});

describe('parallelAnalysis', () => {
  const data = mkRows();

  it('returns null for one variable', () => expect(parallelAnalysis(data, ['x1'])).toBeNull());
  it('returns null when n < p + 5', () => {
    expect(parallelAnalysis(data.slice(0, 6), ['x1', 'x2', 'x3'])).toBeNull();
  });
  it('returns null for empty data', () => expect(parallelAnalysis([], ['x1', 'x2'])).toBeNull());

  it('retain count in [0, p]', () => {
    const r = parallelAnalysis(data, ['x1', 'x2', 'x3', 'x4']);
    expect(r.nFactors).toBeGreaterThanOrEqual(0);
    expect(r.nFactors).toBeLessThanOrEqual(4);
  });

  it('scree rows match p with data/random/retain flags', () => {
    const r = parallelAnalysis(data, ['x1', 'x2', 'x3']);
    expect(r.scree).toHaveLength(3);
    r.scree.forEach(row => {
      expect(row).toMatchObject({ pc: expect.any(Number), data: expect.any(Number), random: expect.any(Number) });
      expect(typeof row.retain).toBe('boolean');
    });
  });

  it('nFactors equals count of retain flags', () => {
    const r = parallelAnalysis(data, ['x1', 'x2', 'x3', 'x4'], 25);
    expect(r.nFactors).toBe(r.scree.filter(s => s.retain).length);
  });

  it('contract fields present', () => {
    const r = parallelAnalysis(data, ['x1', 'x2']);
    expectKeys(r, ['test', 'nFactors', 'scree', 'n', 'p', 'vars', 'apa']);
    expect(r.test).toBe('Parallel Analysis');
  });

  it('filters rows with missing values', () => {
    const dirty = [...data];
    dirty[0] = { ...dirty[0], x2: NaN };
    const r = parallelAnalysis(dirty, ['x1', 'x2', 'x3']);
    expect(r.n).toBe(data.length - 1);
  });

  it('apa describes factor retention', () => {
    expect(parallelAnalysis(data, ['x1', 'x2', 'x3']).apa).toMatch(/factor/i);
  });

  it('reproducible with seed', () => {
    const a = parallelAnalysis(data, ['x1', 'x2', 'x3', 'x4'], 30, 7);
    const b = parallelAnalysis(data, ['x1', 'x2', 'x3', 'x4'], 30, 7);
    expect(a.nFactors).toBe(b.nFactors);
    expect(a.scree.map(s => s.random)).toEqual(b.scree.map(s => s.random));
  });
});

describe('irtRasch1PL', () => {
  const bin = binaryMatrix(45, 5, 7, 2);

  it('returns null for n < 10', () => expect(irtRasch1PL(binaryMatrix(8, 4))).toBeNull());
  it('returns null for empty matrix', () => expect(irtRasch1PL([])).toBeNull());
  it('returns null for zero items', () => expect(irtRasch1PL([[1], [0]])).toBeNull());

  it('difficulties match item count', () => {
    const r = irtRasch1PL(bin);
    expect(r.difficulties).toHaveLength(5);
    r.difficulties.forEach(d => expect(d).toHaveProperty('b'));
  });

  it('icc probabilities in [0, 1]', () => {
    const r = irtRasch1PL(bin);
    expect(r.icc.length).toBe(41);
    r.icc.forEach(pt => {
      pt.curves.forEach(p => {
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThanOrEqual(1);
      });
    });
  });

  it('theta mean near zero after identification', () => {
    const r = irtRasch1PL(bin);
    expect(Math.abs(r.thetaMean)).toBeLessThan(0.5);
  });

  it('contract fields', () => {
    const r = irtRasch1PL(bin);
    expectKeys(r, ['test', 'difficulties', 'thetaMean', 'thetaSD', 'n', 'k', 'icc', 'apa']);
    expect(r.test).toBe('IRT Rasch (1PL)');
  });

  it('all-zero responses still converge', () => {
    const zeros = Array.from({ length: 25 }, () => Array(4).fill(0));
    expect(irtRasch1PL(zeros)).not.toBeNull();
  });
});

describe('irt2PL', () => {
  const bin = binaryMatrix(55, 4, 9, 1.5);

  it('returns null for n < 15', () => expect(irt2PL(binaryMatrix(12, 4))).toBeNull());
  it('items have discrimination a >= 0.2', () => {
    const r = irt2PL(bin);
    r.items.forEach(it => expect(it.a).toBeGreaterThanOrEqual(0.2));
  });
  it('icc curve count matches items', () => {
    const r = irt2PL(bin);
    expect(r.icc[0].curves).toHaveLength(r.k);
  });
  it('contract fields', () => {
    const r = irt2PL(bin);
    expectKeys(r, ['test', 'items', 'n', 'k', 'icc', 'apa']);
    expect(r.test).toBe('IRT 2PL');
  });
});

describe('scaleScore', () => {
  it('returns null for empty matrix', () => expect(scaleScore([])).toBeNull());
  it('sum scoring adds items', () => {
    expect(scaleScore([[1, 2], [3, 4]], { method: 'sum' }).scores[0]).toBe(3);
  });
  it('mean scoring averages items', () => {
    expect(scaleScore([[2, 4]], { method: 'mean' }).mean).toBe(3);
  });
  it('reverse coding changes first row score', () => {
    const m = [[1, 5], [2, 4]];
    const base = scaleScore(m, { method: 'sum' }).scores[0];
    const rev = scaleScore(m, { method: 'sum', reverseIdx: [1] }).scores[0];
    expect(rev).not.toBe(base);
  });
  it('nReversed reflects reverseIdx length', () => {
    expect(scaleScore([[1, 2, 3]], { reverseIdx: [0, 2] }).nReversed).toBe(2);
  });
  it('scores capped at 200 export rows', () => {
    const big = Array.from({ length: 250 }, () => [1, 2]);
    expect(scaleScore(big).scores).toHaveLength(200);
  });
  it('sd non-negative', () => {
    expect(scaleScore([[1, 3], [2, 4], [5, 1]]).sd).toBeGreaterThanOrEqual(0);
  });
  it('contract fields', () => {
    const r = scaleScore([[1, 2]], { method: 'mean' });
    expectKeys(r, ['test', 'method', 'nReversed', 'scores', 'mean', 'sd', 'n', 'k', 'apa']);
  });
});
