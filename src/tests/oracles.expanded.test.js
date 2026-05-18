import { describe, it, expect } from 'vitest';
import { oneWayANOVA, welchANOVA } from './anova.js';
import { mannWhitney, binomialTest, twoPropZ } from './categorical.js';
import { mediation } from './regression.js';
import { metaAnalysis } from './multivariate.js';
import { mkGroups, GROUP_A, GROUP_B, mkTabular } from './fixtures/core.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

describe('expanded regression oracles', () => {
  it('oneWayANOVA on fixture groups matches snapshot', () => {
    const r = oneWayANOVA(mkGroups());
    const e = ref.anova.oneWay_fixture_groups;
    expect(r.F).toBeCloseTo(e.F, 2);
    expect(r.dfB).toBe(e.dfB);
    expect(r.dfW).toBe(e.dfW);
    expect(r.p).toBeCloseTo(e.p, 5);
  });

  it('welchANOVA on fixture groups matches snapshot', () => {
    const r = welchANOVA(mkGroups());
    const e = ref.anova.welch_fixture_groups;
    expect(r.F).toBeCloseTo(e.F, 3);
    expect(r.p).toBeCloseTo(e.p, 6);
  });

  it('mannWhitney GROUP_A vs B matches snapshot', () => {
    const r = mannWhitney(GROUP_A, GROUP_B);
    expect(r.p).toBeCloseTo(ref.categorical.mannWhitney_ab.p, 4);
  });

  it('binomialTest(12,20) matches snapshot', () => {
    const r = binomialTest(12, 20, 0.5);
    expect(r.p).toBeCloseTo(ref.categorical.binomial_12_20.p, 4);
  });

  it('twoPropZ matches snapshot', () => {
    const r = twoPropZ(35, 50, 28, 50);
    expect(r.z).toBeCloseTo(ref.categorical.twoPropZ_35_50.z, 3);
    expect(r.p).toBeCloseTo(ref.categorical.twoPropZ_35_50.p, 3);
  });

  it('mediation on tabular fixture matches snapshot', () => {
    const rows = mkTabular();
    const X = rows.map(r => r.x);
    const M = rows.map(r => r.m);
    const Y = rows.map(r => r.y);
    const r = mediation(X, M, Y);
    const e = ref.regression.mediation_tabular;
    expect(r.ab).toBeCloseTo(e.ab, 3);
    expect(r.z_sobel).toBeCloseTo(e.z_sobel, 2);
    expect(r.p_sobel).toBeCloseTo(e.p_sobel, 3);
  });

  it('metaAnalysis two studies matches snapshot', () => {
    const r = metaAnalysis([
      { label: 'a', d: 0.5, se: 0.1 },
      { label: 'b', d: 0.3, se: 0.2 },
    ]);
    const e = ref.meta.two_studies;
    expect(r.dRE).toBeCloseTo(e.dRE, 2);
    expect(r.p).toBeCloseTo(e.p, 6);
  });
});
