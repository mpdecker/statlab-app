import { describe, it, expect } from 'vitest';
import { giniCoefficient, lorenzCurve, theilIndex, atkinsonIndex, concentrationIndex, hooverIndex, palmaRatio, decomposition } from './inequality.js';
import { expectKeys } from './__fixtures__/helpers.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };
const ineqRef = ref.inequality.basic;

const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 50];

describe('giniCoefficient', () => {
  it('contract keys', () => expectKeys(giniCoefficient(data), ['test', 'gini', 'n', 'apa']));
  it('gini in [0,1]', () => { const r = giniCoefficient(data); expect(r.gini).toBeGreaterThanOrEqual(0); expect(r.gini).toBeLessThanOrEqual(1); });
  it('null <5', () => expect(giniCoefficient([1, 2])).toBeNull());
  it('matches an independently-computed mean-absolute-difference oracle', () => {
    const r = giniCoefficient(ineqRef.data);
    expect(r.gini).toBeCloseTo(ineqRef.gini, 4);
  });
});

describe('lorenzCurve', () => {
  it('contract keys', () => expectKeys(lorenzCurve(data), ['test', 'points', 'n', 'apa']));
  it('points = n', () => { const r = lorenzCurve(data); expect(r.points).toHaveLength(data.length); });
  it('null for zero total', () => expect(lorenzCurve([0, 0, 0, 0, 0])).toBeNull());
});

describe('theilIndex', () => {
  it('contract keys', () => expectKeys(theilIndex(data), ['test', 'theil', 'n', 'apa']));
  it('null <5', () => expect(theilIndex([1, 2, 3])).toBeNull());
  it('theil non-negative', () => { const r = theilIndex(data); if (r) expect(r.theil).toBeGreaterThanOrEqual(0); });
  it('matches an independently-computed GE(1) oracle (regression test for the missing /mean weight-term bug)', () => {
    // Previously weighted by raw v_i instead of v_i/mean, inflating the index
    // by exactly a factor of `mean` (~21.5x on this dataset).
    const r = theilIndex(ineqRef.data);
    expect(r.theil).toBeCloseTo(ineqRef.theil, 4);
  });
});

describe('atkinsonIndex', () => {
  it('contract keys', () => expectKeys(atkinsonIndex(data), ['test', 'atkinson', 'epsilon', 'n', 'apa']));
  it('epsilon=2 works', () => { const r = atkinsonIndex(data, { epsilon: 2 }); expect(r.epsilon).toBe(2); });
  it('atkinson between 0-1', () => { const r = atkinsonIndex(data); if (r) { expect(r.atkinson).toBeGreaterThanOrEqual(0); expect(r.atkinson).toBeLessThanOrEqual(1); } });
  it('matches an independently-computed oracle at epsilon=1 (geometric mean) and epsilon=0.5', () => {
    const r1 = atkinsonIndex(ineqRef.data, { epsilon: 1 });
    expect(r1.atkinson).toBeCloseTo(ineqRef.atkinson1, 4);
    const rHalf = atkinsonIndex(ineqRef.data, { epsilon: 0.5 });
    expect(rHalf.atkinson).toBeCloseTo(ineqRef.atkinson_half, 4);
  });
});

describe('concentrationIndex', () => {
  it('contract keys', () => expectKeys(concentrationIndex(data, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), ['test', 'ci', 'n', 'apa']));
  it('null <5', () => expect(concentrationIndex([1, 2], [3, 4])).toBeNull());
  it('ci between -1 and 1', () => { const r = concentrationIndex(data, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]); if (r) { expect(r.ci).toBeGreaterThanOrEqual(-1); expect(r.ci).toBeLessThanOrEqual(1); } });
});

describe('hooverIndex', () => {
  const data = [1,2,3,4,5,10,20,50];
  it('contract keys', () => expectKeys(hooverIndex(data), ['test','H','n','apa']));
  it('null <3', () => expect(hooverIndex([1,2])).toBeNull());
  it('H between 0-1', () => { const r = hooverIndex(data); if (r) { expect(r.H).toBeGreaterThanOrEqual(0); expect(r.H).toBeLessThanOrEqual(1); } });
});
describe('palmaRatio', () => {
  const data = [1,2,3,4,5,6,7,8,10,20,50,100];
  it('contract keys', () => expectKeys(palmaRatio(data), ['test','ratio','n','apa']));
  it('null <10', () => expect(palmaRatio([1,2,3])).toBeNull());
  it('ratio >= 0', () => { const r = palmaRatio(data); if (r) expect(r.ratio).toBeGreaterThanOrEqual(0); });
});
describe('decomposition', () => {
  const data = [1,2,3,10,20,30,100,200,300];
  const groups = [1,1,1,2,2,2,3,3,3];
  it('contract keys', () => expectKeys(decomposition(data, groups), ['test','Tbetween','Twithin','Ttotal','n','apa']));
  it('null mismatched', () => expect(decomposition([1,2,3], [1,2])).toBeNull());
  it('Tbetween non-negative', () => { const r = decomposition(data, groups); if (r) expect(r.Tbetween).toBeGreaterThanOrEqual(0); });
});

describe('hardening — invalid inputs', () => {
  it('giniCoefficient rejects null/short', () => {
    expect(giniCoefficient(null)).toBeNull();
    expect(giniCoefficient([])).toBeNull();
    expect(giniCoefficient([1, 2, 3])).toBeNull();
  });
  it('lorenzCurve rejects null/all zero', () => {
    expect(lorenzCurve(null)).toBeNull();
    expect(lorenzCurve([])).toBeNull();
  });
  it('theilIndex rejects null/short/zero mean', () => {
    expect(theilIndex(null)).toBeNull();
    expect(theilIndex([1, 2])).toBeNull();
    expect(theilIndex([0, 0, 0, 0, 0])).toBeNull();
  });
  it('atkinsonIndex rejects null/short/zero mean', () => {
    expect(atkinsonIndex(null)).toBeNull();
    expect(atkinsonIndex([1, 2])).toBeNull();
    expect(atkinsonIndex([0, 0, 0, 0, 0])).toBeNull();
  });
  it('concentrationIndex rejects null/mismatch/zero mean', () => {
    expect(concentrationIndex(null, [1,2,3,4,5])).toBeNull();
    expect(concentrationIndex([1,2,3], [1,2])).toBeNull();
  });
  it('hooverIndex rejects null/short', () => {
    expect(hooverIndex(null)).toBeNull();
  });
  it('palmaRatio rejects null/short', () => {
    expect(palmaRatio(null)).toBeNull();
    expect(palmaRatio([1, 2, 3])).toBeNull();
  });
  it('decomposition rejects null/mismatch', () => {
    expect(decomposition(null, [1, 2, 3])).toBeNull();
    expect(decomposition([1, 2], [1])).toBeNull();
  });
});

describe('hardening — invariants', () => {
  it('giniCoefficient in [0,1] for valid data', () => {
    const r = giniCoefficient(data);
    expect(r.gini).toBeGreaterThanOrEqual(0);
    expect(r.gini).toBeLessThanOrEqual(1);
  });
  it('concentrationIndex in [-1,1]', () => {
    const r = concentrationIndex(data, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(r.ci).toBeGreaterThanOrEqual(-1);
    expect(r.ci).toBeLessThanOrEqual(1);
  });
});
