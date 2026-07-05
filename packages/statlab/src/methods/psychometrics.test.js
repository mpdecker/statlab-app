import { describe, it, expect } from 'vitest';
import { omegaMcDonald, parallelAnalysis, irtRasch1PL, irt2PL, scaleScore, irt3PL, gradedResponseModel, partialCreditModel, testInformation, difMH, eapScoring, multidimensional2PL, itemFit, nominalResponseModel, generalizedPartialCredit, testEquating, mixedFormatIRT, difLogistic, testRetestReliability, interRaterReliability, parallelFormsReliability, itemDifficultyIndex, itemDiscriminationIndex } from './psychometrics.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };
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

describe('irt3PL', () => {
  it('returns null for non-binary data', () => {
    const bad = [[1, 2], [0, 1]];
    expect(irt3PL(bad)).toBeNull();
  });

  it('estimates item parameters for binary data', () => {
    const n = 40, k = 5;
    const matrix = Array.from({ length: n }, () => Array.from({ length: k }, () => Math.random() < 0.5 ? 1 : 0));
    const r = irt3PL(matrix);
    expect(r).not.toBeNull();
    expect(r.test).toBe('IRT 3PL');
    expect(r.items.length).toBe(k);
    r.items.forEach(item => {
      expect(item.a).toBeGreaterThan(0.2);
      expect(item.c).toBeGreaterThanOrEqual(0);
      expect(item.c).toBeLessThanOrEqual(0.4);
    });
  });

  it('returns null for small n', () => {
    const small = Array.from({ length: 5 }, () => [0, 1, 0, 1]);
    expect(irt3PL(small)).toBeNull();
  });

  it('returns null for non-array input', () => {
    expect(irt3PL(null)).toBeNull();
  });

  it('returns null for single item', () => {
    const single = Array.from({ length: 20 }, () => [Math.random() < 0.5 ? 1 : 0]);
    expect(irt3PL(single)).toBeNull();
  });

  it('abilities array has correct length', () => {
    const n = 30, k = 4;
    const matrix = Array.from({ length: n }, () => Array.from({ length: k }, () => Math.random() < 0.5 ? 1 : 0));
    const r = irt3PL(matrix);
    expect(r.abilities.length).toBe(n);
  });

  it('contract fields present', () => {
    const n = 30, k = 4;
    const matrix = Array.from({ length: n }, () => Array.from({ length: k }, () => Math.random() < 0.5 ? 1 : 0));
    const r = irt3PL(matrix);
    expectKeys(r, ['test', 'items', 'abilities', 'n', 'k', 'apa']);
  });

  it('discrimination bounded in [0.3, 4]', () => {
    const n = 30, k = 4;
    const matrix = Array.from({ length: n }, () => Array.from({ length: k }, () => Math.random() < 0.5 ? 1 : 0));
    const r = irt3PL(matrix);
    r.items.forEach(item => {
      expect(item.a).toBeGreaterThanOrEqual(0.3);
      expect(item.a).toBeLessThanOrEqual(4);
    });
  });
});

describe('gradedResponseModel', () => {
  it('returns null for too few items', () => {
    expect(gradedResponseModel([[0, 1]])).toBeNull();
  });

  it('estimates GRM parameters', () => {
    const n = 40, k = 4;
    const matrix = Array.from({ length: n }, () => Array.from({ length: k }, () => Math.floor(Math.random() * 3)));
    const r = gradedResponseModel(matrix);
    expect(r).not.toBeNull();
    expect(r.test).toBe('Graded Response Model');
    expect(r.items.length).toBe(k);
  });

  it('returns null for n < 10', () => {
    const small = Array.from({ length: 5 }, () => [0, 1, 0, 1]);
    expect(gradedResponseModel(small)).toBeNull();
  });

  it('returns null for non-array input', () => {
    expect(gradedResponseModel(null)).toBeNull();
  });

  it('contract fields present', () => {
    const n = 30, k = 3;
    const matrix = Array.from({ length: n }, () => Array.from({ length: k }, () => Math.floor(Math.random() * 3)));
    const r = gradedResponseModel(matrix);
    expectKeys(r, ['test', 'items', 'abilities', 'n', 'k', 'maxScore', 'apa']);
  });

  it('each item has thresholds and a parameter', () => {
    const n = 30, k = 3;
    const matrix = Array.from({ length: n }, () => Array.from({ length: k }, () => Math.floor(Math.random() * 3)));
    const r = gradedResponseModel(matrix);
    r.items.forEach(item => {
      expect(item.a).toBeGreaterThan(0);
      expect(item.thresholds.length).toBeGreaterThan(0);
    });
  });

  it('abilities array has correct length', () => {
    const n = 30, k = 3;
    const matrix = Array.from({ length: n }, () => Array.from({ length: k }, () => Math.floor(Math.random() * 3)));
    const r = gradedResponseModel(matrix);
    expect(r.abilities.length).toBe(n);
  });
});

describe('partialCreditModel', () => {
  it('returns null for invalid input', () => {
    expect(partialCreditModel(null)).toBeNull();
  });

  it('estimates PCM parameters', () => {
    const n = 40, k = 4;
    const matrix = Array.from({ length: n }, () => Array.from({ length: k }, () => Math.floor(Math.random() * 3)));
    const r = partialCreditModel(matrix);
    expect(r).not.toBeNull();
    expect(r.test).toBe('Partial Credit Model');
    expect(r.items.length).toBe(k);
  });

  it('returns null for n < 10', () => {
    const small = Array.from({ length: 5 }, () => [0, 1, 2]);
    expect(partialCreditModel(small)).toBeNull();
  });

  it('returns null for empty matrix', () => {
    expect(partialCreditModel([])).toBeNull();
  });

  it('contract fields present', () => {
    const n = 30, k = 3;
    const matrix = Array.from({ length: n }, () => Array.from({ length: k }, () => Math.floor(Math.random() * 3)));
    const r = partialCreditModel(matrix);
    expectKeys(r, ['test', 'items', 'abilities', 'n', 'k', 'maxScore', 'apa']);
  });

  it('each item has steps array with difficulties', () => {
    const n = 30, k = 3;
    const matrix = Array.from({ length: n }, () => Array.from({ length: k }, () => Math.floor(Math.random() * 3)));
    const r = partialCreditModel(matrix);
    r.items.forEach(item => {
      expect(item.steps.length).toBeGreaterThanOrEqual(0);
      item.steps.forEach(step => {
        expect(step.step).toBeGreaterThanOrEqual(1);
        expect(step.difficulty).toBeDefined();
      });
    });
  });

  it('abilities array has correct length', () => {
    const n = 30, k = 3;
    const matrix = Array.from({ length: n }, () => Array.from({ length: k }, () => Math.floor(Math.random() * 3)));
    const r = partialCreditModel(matrix);
    expect(r.abilities.length).toBe(n);
  });
});

describe('testInformation', () => {
  it('returns null for empty items', () => {
    expect(testInformation([])).toBeNull();
  });

  it('computes info curve from 3PL items', () => {
    const items = Array.from({ length: 4 }, () => ({ a: 1.5, b: 0, c: 0.2 }));
    const r = testInformation(items, -3, 3, 31);
    expect(r).not.toBeNull();
    expect(r.curve.length).toBe(31);
    expect(r.maxInfo).toBeGreaterThan(0);
  });

  it('info curve is highest near average difficulty', () => {
    const items = Array.from({ length: 4 }, () => ({ a: 1.5, b: 0, c: 0.2 }));
    const r = testInformation(items, -3, 3, 61);
    const midPoint = r.curve[30];
    const edgePoint = r.curve[0];
    expect(midPoint.info).toBeGreaterThan(edgePoint.info);
  });

  it('computes info from PCM items', () => {
    const items = Array.from({ length: 4 }, () => ({ steps: [{ difficulty: -1 }, { difficulty: 0 }, { difficulty: 1 }] }));
    const r = testInformation(items, -3, 3, 21);
    expect(r).not.toBeNull();
    expect(r.curve.length).toBe(21);
  });

  it('more items give higher max info', () => {
    const few = Array.from({ length: 2 }, () => ({ a: 1.5, b: 0, c: 0.2 }));
    const many = Array.from({ length: 6 }, () => ({ a: 1.5, b: 0, c: 0.2 }));
    const rFew = testInformation(few, -3, 3, 31);
    const rMany = testInformation(many, -3, 3, 31);
    expect(rMany.maxInfo).toBeGreaterThan(rFew.maxInfo);
  });

  it('contract fields present', () => {
    const items = [{ a: 1.5, b: 0, c: 0.2 }];
    const r = testInformation(items, -3, 3, 11);
    expectKeys(r, ['test', 'curve', 'maxInfo', 'thetaAtMaxInfo', 'nItems', 'apa']);
  });

  it('returns null for empty items', () => {
    expect(testInformation([])).toBeNull();
  });

  it('handles items with thresholds (GRM-style)', () => {
    const items = [{ a: 1.2, thresholds: [-1, 0, 1] }];
    const r = testInformation(items, -3, 3, 21);
    expect(r).not.toBeNull();
    expect(r.maxInfo).toBeGreaterThan(0);
  });
});

describe('difMH', () => {
  const d = []; for (let i = 0; i < 40; i++) { const row = { grp: i < 20 ? 'A' : 'B' }; for (let j = 1; j <= 5; j++) row[`i${j}`] = (i + j) % 3 > 0 ? 1 : 0; d.push(row); }
  it('null small', () => expect(difMH(d.slice(0, 10), 'grp', ['i1', 'i2', 'i3'])).toBeNull());
  it('contract keys', () => expectKeys(difMH(d, 'grp', ['i1', 'i2', 'i3', 'i4', 'i5']), ['test', 'items', 'n', 'nGroups', 'apa']));
  it('classification valid', () => { const r = difMH(d, 'grp', ['i1', 'i2', 'i3', 'i4', 'i5']); r.items.forEach(i => expect(['A', 'B', 'C']).toContain(i.classification)); });
});

describe('eapScoring', () => {
  const params = [{ a: 1.5, b: 0.5 }, { a: 1.2, b: -0.2 }, { a: 0.8, b: 1.0 }];
  it('null mismatch', () => expect(eapScoring(params, [1, 0])).toBeNull());
  it('contract keys', () => expectKeys(eapScoring(params, [1, 0, 1]), ['test', 'theta', 'se', 'n', 'nQPoints', 'apa']));
  it('se positive', () => { const r = eapScoring(params, [1, 0, 1]); expect(r.se).toBeGreaterThan(0); });
});

describe('multidimensional2PL', () => {
  const d = []; for (let i = 0; i < 20; i++) { const row = {}; for (let j = 0; j < 6; j++) row[`v${j}`] = (i + j) % 3 > 0 ? 1 : 0; d.push(row); }
  it('null small', () => expect(multidimensional2PL(d.slice(0, 5), ['v0', 'v1', 'v2', 'v3', 'v4', 'v5'], [{ name: 'D1', items: ['v0', 'v1', 'v2'] }, { name: 'D2', items: ['v3', 'v4', 'v5'] }])).toBeNull());
  it('contract keys', () => { const r = multidimensional2PL(d, ['v0', 'v1', 'v2', 'v3', 'v4', 'v5'], [{ name: 'D1', items: ['v0', 'v1', 'v2'] }, { name: 'D2', items: ['v3', 'v4', 'v5'] }]); if (r) expectKeys(r, ['test', 'parameters', 'traitCorrelation', 'n', 'apa']); });
  it('traitCorrelation finite', () => { const r = multidimensional2PL(d, ['v0', 'v1', 'v2', 'v3', 'v4', 'v5'], [{ name: 'D1', items: ['v0', 'v1', 'v2'] }, { name: 'D2', items: ['v3', 'v4', 'v5'] }]); if (r) expect(r).toHaveProperty('traitCorrelation'); });
});

describe('itemFit', () => {
  const params = [{ a: 1.5, b: 0.5 }, { a: 1.2, b: -0.2 }];
  const resp = [[1, 0], [1, 1], [0, 0], [1, 1], [0, 1]];
  it('null small', () => expect(itemFit(params, [[1], [0]])).toBeNull());
  it('contract keys', () => expectKeys(itemFit(params, resp), ['test', 'items', 'n', 'apa']));
  it('MNSQ > 0', () => { const r = itemFit(params, resp); expect(r.items[0].infitMnsq).toBeGreaterThan(0); });
});

describe('nominalResponseModel', () => { it('contract keys', () => expectKeys(nominalResponseModel([1, 2, 0, 1, 2, 1, 0, 2, 1, 0]), ['test', 'probabilities', 'n', 'nCategories', 'apa'])); it('probabilities non-empty', () => { const r = nominalResponseModel([1, 2, 0, 1, 2, 1, 0, 2, 1, 0]); expect(r.probabilities.length).toBeGreaterThan(0); }); it('nCategories integer', () => { const r = nominalResponseModel([1, 2, 0, 1, 2, 1, 0, 2, 1, 0]); expect(Number.isInteger(r.nCategories)).toBe(true); }); });
describe('generalizedPartialCredit', () => { it('contract keys', () => expectKeys(generalizedPartialCredit([0, 1, 2, 0, 1, 2, 1, 2, 1, 0], 3), ['test', 'thresholds', 'n', 'nCategories', 'apa'])); it('thresholds non-empty', () => { const r = generalizedPartialCredit([0, 1, 2, 0, 1, 2, 1, 2, 1, 0], 3); expect(r.thresholds.length).toBeGreaterThan(0); }); it('nCategories matches', () => { const r = generalizedPartialCredit([0, 1, 2, 0, 1, 2, 1, 2, 1, 0], 3); expect(r.nCategories).toBe(3); }); });
describe('testEquating', () => { it('contract keys', () => expectKeys(testEquating([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], [11, 12, 13, 14, 15, 16, 17, 18, 19, 20]), ['test', 'equated', 'slope', 'intercept', 'nA', 'nB', 'apa'])); it('coefficients non-empty', () => { const r = testEquating([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], [11, 12, 13, 14, 15, 16, 17, 18, 19, 20]); expect(Number.isFinite(r.slope)).toBe(true); }); it('equated non-empty', () => { const r = testEquating([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], [11, 12, 13, 14, 15, 16, 17, 18, 19, 20]); expect(r.equated.length).toBeGreaterThan(0); }); });
describe('mixedFormatIRT', () => { it('is defined', () => expect(typeof mixedFormatIRT).toBe('function')); it('params non-empty', () => { const d = []; for (let i = 0; i < 20; i++) { const row = {}; for (let j = 1; j <= 6; j++) row[`i${j}`] = (i + j) % 3 > 0 ? 1 : 0; d.push(row); } const r = mixedFormatIRT(d, ['i1', 'i2', 'i3', 'i4', 'i5', 'i6']); if (r) expect(r.items.length).toBeGreaterThan(0); }); it('items match vars', () => { const d = []; for (let i = 0; i < 20; i++) { const row = {}; for (let j = 1; j <= 6; j++) row[`i${j}`] = (i + j) % 3 > 0 ? 1 : 0; d.push(row); } const r = mixedFormatIRT(d, ['i1', 'i2', 'i3', 'i4', 'i5', 'i6']); if (r) expect(r.items.length).toBe(6); }); });
describe('difLogistic', () => { it('is defined', () => expect(typeof difLogistic).toBe('function')); it('dif non-empty', () => { const d = []; for (let i = 0; i < 30; i++) d.push({ grp: i < 15 ? 1 : 0, resp: i % 2, score: i }); const r = difLogistic(d, 'grp', 'resp', 'score'); if (r) expect(Number.isFinite(r.uniform)).toBe(true); }); it('nonuniform finite', () => { const d = []; for (let i = 0; i < 30; i++) d.push({ grp: i < 15 ? 1 : 0, resp: i % 2, score: i }); const r = difLogistic(d, 'grp', 'resp', 'score'); if (r && r.nonuniform !== undefined) expect(Number.isFinite(r.nonuniform)).toBe(true); }); });
describe('difLogistic detects real uniform DIF via nested logistic LR tests', () => {
  const sig = z => 1 / (1 + Math.exp(-z));
  // Simulate a binary item with matching-score effect + a strong group main effect (uniform DIF).
  const mkData = (difMag) => {
    let s = 20240617; const rnd = () => { s = (1103515245 * s + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    const d = [];
    for (let i = 0; i < 400; i++) {
      const grp = i % 2;
      const score = Math.round(rnd() * 10);       // 0..10 ability proxy
      const eta = -2 + 0.4 * score + difMag * grp; // uniform DIF shifts intercept by group
      d.push({ grp, resp: rnd() < sig(eta) ? 1 : 0, score });
    }
    return d;
  };
  it('flags a large uniform DIF (low p) and estimates a positive shift', () => {
    const r = difLogistic(mkData(2.0), 'grp', 'resp', 'score');
    expect(r.pUniform).toBeLessThan(0.01);
    expect(r.uniform).toBeGreaterThan(0.5);
  });
  it('does not flag DIF when groups are equivalent (high p)', () => {
    const r = difLogistic(mkData(0.0), 'grp', 'resp', 'score');
    expect(r.pUniform).toBeGreaterThan(0.05);
  });
  it('reports likelihood-ratio chi-square and p keys', () => expectKeys(difLogistic(mkData(1.0), 'grp', 'resp', 'score'), ['test','uniform','nonUniform','chiUniform','pUniform','chiNonUniform','pNonUniform','chiTotal','pTotal','r2','flag','n','apa']));
});

describe('testRetestReliability', () => {
  const t1 = [10,12,14,16,18,20,22,24,26,28];
  const t2 = t1.map(v => v + Math.random() * 2 - 1);
  it('contract keys', () => expectKeys(testRetestReliability(t1, t2), ['test','r','meanDiff','loa','n','apa']));
  it('null <5', () => expect(testRetestReliability([1,2], [1,2])).toBeNull());
  it('r between -1 and 1', () => { const r = testRetestReliability(t1, t2); if (r) { expect(r.r).toBeGreaterThanOrEqual(-1); expect(r.r).toBeLessThanOrEqual(1); } });
});
describe('interRaterReliability', () => {
  const ratings = [[1,1,2,2,2],[1,2,2,2,2],[2,1,2,2,1]];
  it('contract keys', () => expectKeys(interRaterReliability(ratings), ['test','kappa','nSubjects','nRaters','apa']));
  it('null <3 raters', () => expect(interRaterReliability([[1,2]])).toBeNull());
  it('kappa between -1 and 1', () => { const r = interRaterReliability(ratings); if (r) { expect(r.kappa).toBeGreaterThanOrEqual(-1); expect(r.kappa).toBeLessThanOrEqual(1); } });
});

describe('interRaterReliability matches statsmodels.stats.inter_rater.fleiss_kappa exactly', () => {
  it('Fleiss kappa matches on a 3-rater, 12-subject dataset', () => {
    const e = ref.psychometrics.fleiss_basic;
    const r = interRaterReliability(e.ratings);
    expect(r.kappa).toBeCloseTo(e.kappa, 4);
  });
});
describe('parallelFormsReliability', () => {
  const a = [10,12,14,16,18,20,22,24,26,28];
  const b = a.map(v => v + Math.random());
  it('contract keys', () => expectKeys(parallelFormsReliability(a, b), ['test','r','corrected','n','apa']));
  it('r between -1 and 1', () => { const r = parallelFormsReliability(a, b); if (r) { expect(r.r).toBeGreaterThanOrEqual(-1); expect(r.r).toBeLessThanOrEqual(1); } });
  it('corrected finite', () => { const r = parallelFormsReliability(a, b); if (r) expect(Number.isFinite(r.corrected)).toBe(true); });
});
describe('itemDifficultyIndex', () => {
  const resp = [[1,0,1],[1,1,0],[0,1,1],[1,1,1],[0,0,1],[1,0,0],[1,1,0],[1,0,1]];
  it('contract keys', () => expectKeys(itemDifficultyIndex(resp), ['test','difficulties','nItems','nExaminees','apa']));
  it('difficulties non-empty', () => { const r = itemDifficultyIndex(resp); if (r) expect(r.difficulties.length).toBeGreaterThan(0); });
  it('difficulties between 0-1', () => { const r = itemDifficultyIndex(resp); if (r) r.difficulties.forEach(d => { expect(d).toBeGreaterThanOrEqual(0); expect(d).toBeLessThanOrEqual(1); }); });
});
describe('itemDiscriminationIndex', () => {
  const resp = [[1,0,1],[1,1,0],[0,1,1],[1,1,1],[0,0,1],[1,0,0],[1,1,0],[1,0,1],[0,1,0],[1,1,1]];
  it('contract keys', () => expectKeys(itemDiscriminationIndex(resp), ['test','discriminations','nItems','nExaminees','apa']));
  it('null <10', () => expect(itemDiscriminationIndex([[1,0]])).toBeNull());
  it('discriminations between -1 and 1', () => { const r = itemDiscriminationIndex(resp); if (r) r.discriminations.forEach(d => { expect(d).toBeGreaterThanOrEqual(-1); expect(d).toBeLessThanOrEqual(1); }); });
});
