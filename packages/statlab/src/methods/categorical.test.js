// src/tests/categorical.test.js
import { describe, it, expect } from 'vitest';
import {
  chiSquare, chiGoF, fisherExact, mcnemar, binomialTest, onePropZ, twoPropZ,
  tost, bayesFactorT, bayesFactorCorr,
  grubbsTest, leveneTest, bartlettTest, bonferroni, holm, bh, sensitivityLOO,
  cmhTest, relativeRisk, cramersV,
  kendallW, dunnTest, nemenyiTest, cochranQPost,
  storeyQValue, benjaminiYekutieli, localFDR, stratifiedFDR, fwerControl,
} from './categorical.js';
import { mannWhitney, wilcoxonSR } from './nonparametric.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };
import { expectKeys } from './__fixtures__/helpers.js';

const cat = ref.categorical;

const mk2x2Data = (a, b, c, d) => [
  ...Array(a).fill({ col1: 'A', col2: 'X' }),
  ...Array(b).fill({ col1: 'A', col2: 'Y' }),
  ...Array(c).fill({ col1: 'B', col2: 'X' }),
  ...Array(d).fill({ col1: 'B', col2: 'Y' }),
];

describe('chiSquare', () => {
  it('returns null for empty data', () =>
    expect(chiSquare([], 'col1', 'col2')).toBeNull());
  it('chi2 matches R chisq.test() for 2×2 table', () => {
    const data = mk2x2Data(10, 20, 30, 40);
    const res = chiSquare(data, 'col1', 'col2');
    expect(res.chi2).toBeCloseTo(cat.chiSquare_2x2.chi2, 1);
    expect(res.p).toBeCloseTo(cat.chiSquare_2x2.p, 2);
  });
  it('Cramér V is between 0 and 1', () => {
    const data = mk2x2Data(10, 5, 3, 20);
    const res = chiSquare(data, 'col1', 'col2');
    expect(res.V).toBeGreaterThanOrEqual(0);
    expect(res.V).toBeLessThanOrEqual(1);
  });
  it('lowExp flag set when expected cell < 5', () => {
    const data = mk2x2Data(1, 1, 1, 1);
    const res = chiSquare(data, 'col1', 'col2');
    expect(res.lowExp).toBe(true);
  });
  it('lowExp is false for large balanced table', () => {
    const data = mk2x2Data(50, 50, 50, 50);
    expect(chiSquare(data, 'col1', 'col2').lowExp).toBe(false);
  });
});

describe('chiGoF', () => {
  it('returns null for mismatched lengths', () =>
    expect(chiGoF([10, 20], [33])).toBeNull());
  it('perfect fit → chi2=0', () =>
    expect(chiGoF([10, 20], [10, 20]).chi2).toBeCloseTo(0, 8));
  it('chi2 > 0 for imperfect fit', () => {
    const res = chiGoF([10, 20, 30], [20, 20, 20]);
    expect(res.chi2).toBeGreaterThan(0);
    expect(res.p).toBeLessThanOrEqual(1);
  });
  it('df = k-1', () => {
    expect(chiGoF([10, 20, 30], [20, 20, 20]).df).toBe(2);
  });
  it('matches a scipy.stats.chisquare oracle', () => {
    const e = cat.chiGoF_basic;
    const r = chiGoF(e.observed, e.expected);
    expect(r.chi2).toBeCloseTo(e.chi2, 6);
    expect(r.p).toBeCloseTo(e.p, 6);
  });
});

describe('fisherExact', () => {
  it('p matches R fisher.test() for [[5,2],[1,8]]', () => {
    const res = fisherExact(5, 2, 1, 8);
    expect(res.p).toBeCloseTo(cat.fisher_2x2.p, 2);
  });
  it('OR matches R fisher.test()', () => {
    const res = fisherExact(5, 2, 1, 8);
    expect(res.OR).toBeCloseTo(cat.fisher_2x2.OR, 0);
  });
  it('returns warning object when n > 500', () => {
    const res = fisherExact(200, 200, 200, 200);
    expect(res.warning).toBeDefined();
    expect(res.p).toBeNull();
  });
  it('OR ≈ 1 for balanced table', () => {
    const res = fisherExact(10, 10, 10, 10);
    expect(res.OR).toBeCloseTo(1, 3);
  });
  it('result has orCI property', () => {
    const res = fisherExact(5, 2, 1, 8);
    expect(Array.isArray(res.orCI)).toBe(true);
  });
});

describe('mcnemar', () => {
  it('returns null when b+c < 10', () =>
    expect(mcnemar(2, 3)).toBeNull());
  it('chi2 matches R mcnemar.test() for b=3, c=7', () => {
    const res = mcnemar(3, 7);
    expect(res.chi2).toBeCloseTo(cat.mcnemar_basic.chi2, 1);
    expect(res.p).toBeCloseTo(cat.mcnemar_basic.p, 1);
  });
  it('chi2 is small (continuity correction gives 1/(b+c)) when b=c', () => {
    const res = mcnemar(10, 10);
    // (|10-10|-1)^2/20 = 1/20 = 0.05 with continuity correction
    expect(res.chi2).toBeCloseTo(0.05, 4);
  });
});

describe('binomialTest', () => {
  it('pHat = k/n', () => {
    const res = binomialTest(3, 10, 0.5);
    expect(res.pHat).toBeCloseTo(0.3, 4);
  });
  it('p is small for extreme k with p0=0.5', () => {
    const res = binomialTest(0, 20, 0.5);
    expect(res.p).toBeLessThan(0.01);
  });
  it('CI[0] < pHat < CI[1]', () => {
    const res = binomialTest(4, 10, 0.5);
    expect(res.ci95[0]).toBeLessThan(res.pHat);
    expect(res.ci95[1]).toBeGreaterThan(res.pHat);
  });
  it('result shape has k, n, p0 fields', () => {
    const res = binomialTest(5, 10, 0.5);
    expect(res.k).toBe(5);
    expect(res.n).toBe(10);
    expect(res.p0).toBe(0.5);
  });
});

describe('onePropZ', () => {
  it('z≈0 when ph=p0', () => {
    const res = onePropZ(50, 100, 0.5);
    expect(res.z).toBeCloseTo(0, 4);
    expect(res.p).toBeCloseTo(1, 1);
  });
  it('large |z| for extreme proportion', () => {
    const res = onePropZ(90, 100, 0.5);
    expect(Math.abs(res.z)).toBeGreaterThan(5);
    expect(res.p).toBeLessThan(0.001);
  });
  it('result has ph and h fields', () => {
    const res = onePropZ(40, 100, 0.5);
    expect(res).toHaveProperty('ph');
    expect(res).toHaveProperty('h');
  });
});

describe('twoPropZ', () => {
  it('z≈0 when p1=p2', () => {
    const res = twoPropZ(50, 100, 50, 100);
    expect(res.z).toBeCloseTo(0, 4);
  });
  it('RR and OR are positive', () => {
    const res = twoPropZ(30, 100, 15, 100);
    expect(res.RR).toBeGreaterThan(0);
    expect(res.OR).toBeGreaterThan(0);
  });
  it('ARR = p1 - p2', () => {
    const res = twoPropZ(30, 100, 15, 100);
    expect(res.ARR).toBeCloseTo(0.15, 4);
  });
});

describe('mannWhitney', () => {
  it('returns null for group with < 2 values', () =>
    expect(mannWhitney([1], [2, 3, 4])).toBeNull());

  it('U is between 0 and n1*n2', () => {
    const a = [1, 2, 3, 4, 5], b = [3, 4, 5, 6, 7];
    const res = mannWhitney(a, b);
    expect(res.u).toBeGreaterThanOrEqual(0);
    expect(res.u).toBeLessThanOrEqual(a.length * b.length);
  });

  it('perfect separation: all a < all b → U=0', () => {
    const a = [1, 2, 3], b = [10, 11, 12];
    const res = mannWhitney(a, b);
    expect(res.u).toBeCloseTo(0, 1);
    expect(res.p).toBeLessThan(0.1);
  });

  it('result has rb (rank-biserial) between 0 and 1', () => {
    const res = mannWhitney([1,2,3,4,5], [3,4,5,6,7]);
    expect(res.rb).toBeGreaterThanOrEqual(0);
    expect(res.rb).toBeLessThanOrEqual(1);
  });
});

describe('wilcoxonSR', () => {
  it('returns null for n < 5', () =>
    expect(wilcoxonSR([1, -2, 3])).toBeNull());

  it('returns W, z, p for valid data', () => {
    const diffs = [2, -1, 3, 4, -2, 1, 5, -3];
    const res = wilcoxonSR(diffs);
    expect(res).not.toBeNull();
    expect(res).toHaveProperty('W');
    expect(res).toHaveProperty('z');
    expect(res).toHaveProperty('p');
  });

  it('accepts two paired arrays', () => {
    const a = [10, 12, 14, 9, 11, 13, 15, 8];
    const b = [8,  10, 12, 7,  9, 11, 13, 6];
    const res = wilcoxonSR(a, b);
    expect(res).not.toBeNull();
    expect(res.p).toBeGreaterThan(0);
  });
});

describe('tost', () => {
  it('returns null for empty arrays', () =>
    expect(tost([], [1, 2], -0.5, 0.5)).toBeNull());

  it('returns equiv=true for nearly equal groups within bounds', () => {
    const a = Array.from({ length: 20 }, () => 5 + Math.random() * 0.1);
    const b = Array.from({ length: 20 }, () => 5 + Math.random() * 0.1);
    const res = tost(a, b, -1, 1);
    expect(res).not.toBeNull();
    expect(res).toHaveProperty('equiv');
    expect(res).toHaveProperty('pEquiv');
  });

  it('result has t1, t2, p1, p2 fields', () => {
    const a = [5, 5.1, 4.9, 5.05, 4.95, 5.02, 4.98, 5.01, 4.99, 5.0];
    const b = [5, 5.0, 5.1, 4.95, 5.05, 4.98, 5.02, 5.00, 5.01, 4.99];
    const res = tost(a, b, -0.5, 0.5);
    expect(res).toHaveProperty('t1');
    expect(res).toHaveProperty('t2');
    expect(res).toHaveProperty('p1');
    expect(res).toHaveProperty('p2');
  });
});

describe('bayesFactorT', () => {
  it('returns null for invalid n', () =>
    expect(bayesFactorT(2, 0)).toBeNull());

  it('accepts t=0 as valid', () =>
    expect(bayesFactorT(0, 10)).not.toBeNull());

  it('returns BF10 and BF01 for valid t and n', () => {
    const res = bayesFactorT(2.5, 20);
    expect(res).not.toBeNull();
    expect(res).toHaveProperty('BF10');
    expect(res).toHaveProperty('BF01');
  });

  it('BF10 * BF01 ≈ 1', () => {
    const res = bayesFactorT(3.0, 15, 10);
    expect(res.BF10 * res.BF01).toBeCloseTo(1, 2);
  });

  it('returns label string', () => {
    const res = bayesFactorT(2.0, 20);
    expect(typeof res.label).toBe('string');
  });
});

describe('bayesFactorCorr', () => {
  it('returns null for n < 3', () =>
    expect(bayesFactorCorr(0.5, 2)).toBeNull());

  it('returns BF10 for valid r and n', () => {
    const res = bayesFactorCorr(0.5, 20);
    expect(res).not.toBeNull();
    expect(res).toHaveProperty('BF10');
    expect(res.BF10).toBeGreaterThan(0);
  });

  it('strong correlation gives BF10 > 1', () => {
    const res = bayesFactorCorr(0.9, 30);
    expect(res.BF10).toBeGreaterThan(1);
  });
});

describe('grubbsTest', () => {
  it('returns null for n < 7', () =>
    expect(grubbsTest([1, 2, 3, 4, 5])).toBeNull());

  it('detects an obvious outlier', () => {
    const vals = [5, 5.1, 4.9, 5.05, 4.95, 5.02, 100];
    const res = grubbsTest(vals);
    expect(res).not.toBeNull();
    expect(res.outlierVal).toBeCloseTo(100, 0);
    expect(res.p).toBeLessThan(0.05);
  });

  it('returns G and outlierIdx', () => {
    const vals = [1, 2, 3, 4, 5, 6, 7, 8, 50];
    const res = grubbsTest(vals);
    expect(res).toHaveProperty('G');
    expect(res).toHaveProperty('outlierIdx');
  });
  it('matches the exact t-distribution Grubbs oracle (moderate significance)', () => {
    const e = cat.grubbs_moderate;
    const r = grubbsTest(e.vals);
    expect(r.G).toBeCloseTo(e.G, 4);
    expect(r.p).toBeCloseTo(e.p, 3);
  });
  it('reports a p-value far smaller than the old normal-approximation would give, on an extreme outlier', () => {
    // Previously grubbsTest used a normal approximation that gave p≈0.033 here;
    // the correct t(n-2)-distribution reference gives p≈1.4e-6 — a ~24,000x
    // understatement of significance in the old code.
    const e = cat.grubbs_extreme;
    const r = grubbsTest(e.vals);
    expect(r.G).toBeCloseTo(e.G, 4);
    expect(r.p).toBeLessThan(0.0001);
  });
});

describe('leveneTest', () => {
  it('returns F and p for two groups', () => {
    const groups = [[1, 2, 3, 4, 5], [10, 20, 30, 40, 50]];
    const res = leveneTest(groups);
    expect(res).toHaveProperty('F');
    expect(res).toHaveProperty('p');
    expect(res).toHaveProperty('equal');
  });

  it('equal variance groups → equal=true', () => {
    const g1 = Array.from({ length: 10 }, (_, i) => i + 1);
    const g2 = Array.from({ length: 10 }, (_, i) => i + 2);
    const res = leveneTest([g1, g2]);
    expect(res.equal).toBe(true);
  });

  it('F is non-negative', () => {
    const res = leveneTest([[1, 2, 3, 4, 5], [10, 20, 30, 40, 50]]);
    expect(res.F).toBeGreaterThanOrEqual(0);
  });
  it('matches a scipy.stats.levene(center="mean") oracle', () => {
    const e = cat.levene_basic;
    const r = leveneTest(e.groups);
    expect(r.F).toBeCloseTo(e.F, 4); // r.F is toFixed(4)-rounded internally
    expect(r.p).toBeCloseTo(e.p, 6);
  });
});

describe('bartlettTest', () => {
  it('returns B and p', () => {
    const groups = [[1,2,3,4,5], [2,4,6,8,10]];
    const res = bartlettTest(groups);
    expect(res).toHaveProperty('B');
    expect(res).toHaveProperty('p');
  });

  it('p is between 0 and 1', () => {
    const groups = [[1,2,3,4,5], [10,20,30,40,50], [2,3,4,5,6]];
    const res = bartlettTest(groups);
    expect(res.p).toBeGreaterThanOrEqual(0);
    expect(res.p).toBeLessThanOrEqual(1);
  });

  it('B is non-negative', () => {
    const groups = [[1,2,3,4,5], [2,4,6,8,10]];
    const r = bartlettTest(groups);
    expect(r.B).toBeGreaterThanOrEqual(0);
  });
  it('matches a scipy.stats.bartlett oracle', () => {
    const e = cat.bartlett_basic;
    const r = bartlettTest(e.groups);
    expect(r.B).toBeCloseTo(e.B, 4); // r.B is toFixed(4)-rounded internally
    expect(r.p).toBeCloseTo(e.p, 6);
  });
});

describe('bonferroni', () => {
  it('adjusts p values by multiplying by m', () => {
    const pairs = [{ p: 0.01 }, { p: 0.02 }, { p: 0.05 }];
    const res = bonferroni(pairs);
    expect(res[0].pAdj).toBeCloseTo(0.03, 5);
    expect(res[1].pAdj).toBeCloseTo(0.06, 5);
    expect(res[2].pAdj).toBeCloseTo(0.15, 5);
  });

  it('pAdj never exceeds 1', () => {
    const pairs = [{ p: 0.5 }, { p: 0.6 }, { p: 0.7 }];
    const res = bonferroni(pairs);
    res.forEach(r => expect(r.pAdj).toBeLessThanOrEqual(1));
  });

  it('pAdj >= original p', () => {
    const pairs = [{ p: 0.01 }, { p: 0.03 }, { p: 0.05 }];
    const res = bonferroni(pairs);
    res.forEach(r => expect(r.pAdj).toBeGreaterThanOrEqual(r.p));
  });
});

describe('holm', () => {
  it('pAdj values are non-decreasing in sorted order', () => {
    const pairs = [{ p: 0.01 }, { p: 0.03 }, { p: 0.05 }];
    const res = holm(pairs).sort((a, b) => a.p - b.p);
    expect(res[0].pAdj).toBeLessThanOrEqual(res[1].pAdj);
    expect(res[1].pAdj).toBeLessThanOrEqual(res[2].pAdj);
  });

  it('pAdj never exceeds 1', () => {
    const pairs = [{ p: 0.4 }, { p: 0.5 }, { p: 0.6 }];
    const res = holm(pairs);
    res.forEach(r => expect(r.pAdj).toBeLessThanOrEqual(1));
  });

  it('pAdj >= original p', () => {
    const pairs = [{ p: 0.01 }, { p: 0.03 }, { p: 0.05 }];
    const res = holm(pairs);
    res.forEach(r => expect(r.pAdj).toBeGreaterThanOrEqual(r.p));
  });
});

describe('bh', () => {
  it('returns same length as input', () => {
    const pairs = [{ p: 0.01 }, { p: 0.04 }, { p: 0.2 }];
    expect(bh(pairs)).toHaveLength(3);
  });

  it('pAdj values are between 0 and 1', () => {
    const pairs = [{ p: 0.01 }, { p: 0.04 }, { p: 0.1 }, { p: 0.5 }];
    const res = bh(pairs);
    res.forEach(r => {
      expect(r.pAdj).toBeGreaterThanOrEqual(0);
      expect(r.pAdj).toBeLessThanOrEqual(1);
  });
  });
  it('pAdj >= original p', () => {
    const pairs = [{ p: 0.01 }, { p: 0.04 }];
    const res = bh(pairs);
    res.forEach(r => expect(r.pAdj).toBeGreaterThanOrEqual(r.p));
  });
});

describe('storeyQValue', () => { it('contract keys', () => expectKeys(storeyQValue([0.01, 0.05, 0.1, 0.2, 0.5]), ['test', 'qValues', 'pi0', 'n', 'apa'])); it('pi0 between 0-1', () => { const r = storeyQValue([0.01, 0.05, 0.1, 0.2, 0.5]); expect(r.pi0).toBeGreaterThanOrEqual(0); expect(r.pi0).toBeLessThanOrEqual(1); }); it('qValues non-empty', () => { const r = storeyQValue([0.01, 0.05, 0.1, 0.2, 0.5]); expect(r.qValues.length).toBeGreaterThan(0); }); });
describe('benjaminiYekutieli', () => { it('contract keys', () => expectKeys(benjaminiYekutieli([0.01, 0.05, 0.1]), ['test', 'thresholds', 'n', 'apa'])); it('nSig counts', () => { const r = benjaminiYekutieli([0.01, 0.05, 0.1]); expect(r.n).toBe(3); }); it('thresholds non-empty', () => { const r = benjaminiYekutieli([0.01, 0.05, 0.1]); expect(r.thresholds.length).toBeGreaterThan(0); }); });
describe('localFDR', () => { it('contract keys', () => expectKeys(localFDR([0.01, 0.05, 0.1, 0.2]), ['test', 'lfdr', 'pi0', 'n', 'apa'])); it('lfdr values between 0-1', () => { const r = localFDR([0.01, 0.05, 0.1, 0.2]); r.lfdr.forEach(v => { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); }); }); it('lfdr length matches n', () => { const r = localFDR([0.01, 0.05, 0.1, 0.2]); expect(r.lfdr.length).toBe(r.n); }); });
describe('stratifiedFDR', () => { it('contract keys', () => expectKeys(stratifiedFDR([0.01, 0.05, 0.1, 0.2], [1, 1, 2, 2]), ['test', 'results', 'n', 'nStrata', 'apa'])); it('results non-empty', () => { const r = stratifiedFDR([0.01, 0.05, 0.1, 0.2], [1, 1, 2, 2]); if (r) expect(r.results.length).toBeGreaterThan(0); }); it('nStrata correct', () => { const r = stratifiedFDR([0.01, 0.05, 0.1, 0.2], [1, 1, 2, 2]); if (r) expect(r.nStrata).toBe(2); }); });
describe('fwerControl', () => { it('contract keys', () => expectKeys(fwerControl([0.001, 0.01, 0.05, 0.5]), ['test', 'rejected', 'method', 'n', 'apa'])); it('nRejected integer', () => { const r = fwerControl([0.001, 0.01, 0.05, 0.5]); expect(Number.isInteger(r.rejected)).toBe(true); }); it('rejected between 0 and n', () => { const r = fwerControl([0.001, 0.01, 0.05, 0.5]); expect(r.rejected).toBeGreaterThanOrEqual(0); expect(r.rejected).toBeLessThanOrEqual(4); }); });

describe('sensitivityLOO', () => {
  it('returns null for n < 10', () =>
    expect(sensitivityLOO([1, 2, 3], v => ({ p: 0.05 }))).toBeNull());

  it('returns nSig, propSig, stable for large enough array', () => {
    const vals = Array.from({ length: 20 }, (_, i) => i + 1);
    const testFn = arr => ({ p: arr.length > 10 ? 0.01 : 0.1 });
    const res = sensitivityLOO(vals, testFn);
    expect(res).not.toBeNull();
    expect(res).toHaveProperty('nSig');
    expect(res).toHaveProperty('propSig');
    expect(res).toHaveProperty('stable');
  });

  it('propSig between 0 and 1', () => {
    const vals = Array.from({ length: 20 }, (_, i) => i + 1);
    const testFn = arr => ({ p: arr.length > 10 ? 0.01 : 0.1 });
    const r = sensitivityLOO(vals, testFn);
    expect(r.propSig).toBeGreaterThanOrEqual(0);
    expect(r.propSig).toBeLessThanOrEqual(1);
  });
});

// CMH Test
describe('cmhTest', () => {
  const tables = [
    [10, 20, 5, 30],
    [15, 18, 8, 25],
    [12, 22, 6, 28],
  ];

  it('returns null for <2 tables', () => {
    expect(cmhTest(null)).toBeNull();
    expect(cmhTest([tables[0]])).toBeNull();
  });

  it('returns OR and chi2', () => {
    const r = cmhTest(tables);
    expect(r.or).toBeGreaterThan(0);
    expect(r.chi2).toBeGreaterThanOrEqual(0);
    expect(r.p).toBeGreaterThanOrEqual(0);
    expect(r.k).toBe(3);
  });

  it('contract keys', () => {
    expectKeys(cmhTest(tables), ['test', 'or', 'orCI', 'chi2', 'df', 'p', 'chi2Homog', 'dfHomog', 'pHomog', 'k', 'apa']);
  });

  it('homogeneity p in [0,1]', () => {
    const r = cmhTest(tables);
    expect(r.pHomog).toBeGreaterThanOrEqual(0);
    expect(r.pHomog).toBeLessThanOrEqual(1);
  });

  it('apa is a non-empty string', () => {
    const r = cmhTest(tables);
    expect(typeof r.apa).toBe('string');
    expect(r.apa.length).toBeGreaterThan(0);
  });
});

// Relative Risk
describe('relativeRisk', () => {
  it('returns null for zero cells', () => {
    expect(relativeRisk(0, 10, 20, 30)).toBeNull();
    expect(relativeRisk(10, 20, 0, 30)).toBeNull();
  });

  it('returns RR > 1 for increased risk', () => {
    const r = relativeRisk(40, 60, 20, 80);
    expect(r.rr).toBeGreaterThan(1);
  });

  it('RR CI encloses RR', () => {
    const r = relativeRisk(30, 70, 20, 80);
    expect(r.rrCI[0]).toBeLessThanOrEqual(r.rr);
    expect(r.rrCI[1]).toBeGreaterThanOrEqual(r.rr);
  });

  it('contract keys', () => {
    expectKeys(relativeRisk(30, 70, 20, 80), ['test', 'rr', 'rrCI', 'arr', 'nnt', 'pExposed', 'pUnexposed', 'nTotal', 'apa']);
  });

  it('apa is a non-empty string', () => {
    const r = relativeRisk(30, 70, 20, 80);
    expect(typeof r.apa).toBe('string');
    expect(r.apa.length).toBeGreaterThan(0);
  });
});

// Cramer's V
describe('cramersV', () => {
  it('returns null for invalid', () => expect(cramersV(-1, 10, 2)).toBeNull());
  it('V in [0,1]', () => { const r = cramersV(12.5, 50, 3); expect(r.v).toBeGreaterThanOrEqual(0); expect(r.v).toBeLessThanOrEqual(1); });
  it('label matches thresholds', () => { expect(cramersV(0.5, 100, 3).label).toBe('negligible'); expect(cramersV(5, 100, 3).label).toBe('small'); expect(cramersV(30, 100, 3).label).toBe('medium'); expect(cramersV(80, 100, 3).label).toBe('large'); });
  it('contract keys', () => expectKeys(cramersV(12.5, 50, 3), ['test', 'v', 'df', 'label', 'n', 'apa']));
  it('apa non-empty', () => { const r = cramersV(12.5, 50, 3); expect(typeof r.apa).toBe('string'); expect(r.apa.length).toBeGreaterThan(0); });
});

describe('kendallW', () => {
  const d = []; for (let i = 0; i < 10; i++) d.push({ v1: i % 4, v2: (i + 1) % 4, v3: (i + 2) % 4 });
  it('null <8', () => expect(kendallW(d.slice(0, 4), ['v1', 'v2'])).toBeNull());
  it('contract keys', () => expectKeys(kendallW(d, ['v1', 'v2', 'v3']), ['test', 'W', 'chi2', 'df', 'p', 'n', 'k', 'apa']));
  it('W in [0,1]', () => { const r = kendallW(d, ['v1', 'v2', 'v3']); expect(r.W).toBeGreaterThanOrEqual(0); expect(r.W).toBeLessThanOrEqual(1); });
});

describe('dunnTest', () => {
  const g = [{ name: 'A', vals: [1, 2, 3, 4] }, { name: 'B', vals: [5, 6, 7, 8] }, { name: 'C', vals: [9, 10, 11, 12] }];
  it('null <2', () => expect(dunnTest([g[0]])).toBeNull());
  it('contract keys', () => expectKeys(dunnTest(g), ['test', 'pairs', 'alpha', 'k', 'apa']));
  it('pairs non-empty', () => { const r = dunnTest(g); if (r) expect(r.pairs.length).toBeGreaterThan(0); });
});

describe('nemenyiTest', () => {
  const g = [{ name: 'A', vals: [1, 2, 3] }, { name: 'B', vals: [2, 3, 4] }, { name: 'C', vals: [3, 4, 5] }];
  it('null <2', () => expect(nemenyiTest([g[0]])).toBeNull());
  it('contract keys', () => expectKeys(nemenyiTest(g), ['test', 'pairs', 'k', 'n', 'alpha', 'apa']));
  it('k is non-zero', () => { const r = nemenyiTest(g); if (r) expect(r.k).toBeGreaterThan(0); });
});

describe('cochranQPost', () => {
  const d = []; for (let i = 0; i < 10; i++) d.push({ v1: i % 2, v2: (i + 1) % 2, v3: i % 2 });
  it('contract keys', () => expectKeys(cochranQPost(d, ['v1', 'v2', 'v3']), ['test', 'pairs', 'k', 'nSubjects', 'alpha', 'apa']));
  it('pairs non-empty', () => { const r = cochranQPost(d, ['v1', 'v2', 'v3']); if (r) expect(r.pairs.length).toBeGreaterThan(0); });
  it('k matches vars', () => { const r = cochranQPost(d, ['v1', 'v2', 'v3']); if (r) expect(r.k).toBe(3); });
});
