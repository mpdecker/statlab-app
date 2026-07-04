import { describe, it, expect } from 'vitest';
import { powerCoxPH, powerMetaAnalysis, powerEquivalence, powerInteractionANOVA,
  powerANOVA, powerChiSq, powerLogisticReg, powerMultilevel, powerCorrelation, powerMediationTest,
  requiredNT, requiredNCorrelation, requiredNOneProp, requiredNTwoProp, requiredNWilcoxon,
  requiredNLogRank, requiredNOLS, requiredNANOVA,
  powerTTestWrapper, powerProportionOne, powerProportionTwo, powerWilcoxonTest,
  powerLogRankTest, powerRMANOVA, powerOLS_apa, powerSpearmanTest,
} from './power.js';
import { expectKeys } from './__fixtures__/helpers.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

describe('powerCoxPH', () => {
  it('returns null for invalid input', () => {
    expect(powerCoxPH(2, 0.5)).toBeNull();
    expect(powerCoxPH(10, -1)).toBeNull();
    expect(powerCoxPH(10, 0.5, 2)).toBeNull();
  });

  it('contract keys', () => {
    expectKeys(powerCoxPH(100, 0.6), ['test', 'power', 'nEvents', 'hr', 'rSquaredOther', 'k', 'alpha', 'apa']);
  });

  it('power in [0.05, 0.999] for reasonable input', () => {
    const r = powerCoxPH(100, 0.6);
    expect(r.power).toBeGreaterThan(0.05);
    expect(r.power).toBeLessThan(0.999);
  });

  it('power increases with nEvents', () => {
    const r1 = powerCoxPH(50, 0.5);
    const r2 = powerCoxPH(200, 0.5);
    expect(r2.power).toBeGreaterThan(r1.power);
  });

  it('rSquaredOther reduces power', () => {
    const r1 = powerCoxPH(100, 0.6, 0);
    const r2 = powerCoxPH(100, 0.6, 0.3);
    expect(r2.power).toBeLessThanOrEqual(r1.power);
  });

  it('apa is a non-empty string', () => {
    const r = powerCoxPH(100, 0.6);
    expect(typeof r.apa).toBe('string');
    expect(r.apa.length).toBeGreaterThan(0);
  });
});

describe('powerMetaAnalysis', () => {
  it('returns null for invalid', () => {
    expect(powerMetaAnalysis(2, 0.3, 0)).toBeNull();
  });

  it('contract keys', () => {
    expectKeys(powerMetaAnalysis(10, 0.3, 0.02), ['test', 'power', 'k', 'd', 'tau2', 'nPerStudy', 'alpha', 'apa']);
  });

  it('power in [0.05, 0.999]', () => {
    const r = powerMetaAnalysis(20, 0.3, 0.02);
    expect(r.power).toBeGreaterThan(0.05);
    expect(r.power).toBeLessThan(0.999);
  });

  it('power increases with k', () => {
    const r1 = powerMetaAnalysis(10, 0.3, 0.01);
    const r2 = powerMetaAnalysis(30, 0.3, 0.01);
    expect(r2.power).toBeGreaterThan(r1.power);
  });

  it('power increases with d', () => {
    const r1 = powerMetaAnalysis(15, 0.2, 0.01);
    const r2 = powerMetaAnalysis(15, 0.5, 0.01);
    expect(r2.power).toBeGreaterThan(r1.power);
  });

  it('tau2 reduces power', () => {
    const r1 = powerMetaAnalysis(15, 0.4, 0);
    const r2 = powerMetaAnalysis(15, 0.4, 0.05);
    expect(r2.power).toBeLessThanOrEqual(r1.power);
  });

  it('apa is a non-empty string', () => {
    const r = powerMetaAnalysis(15, 0.3, 0.01);
    expect(typeof r.apa).toBe('string');
    expect(r.apa.length).toBeGreaterThan(0);
  });
});

describe('powerEquivalence', () => {
  it('returns null for invalid', () => {
    expect(powerEquivalence(0, 0, -1, 1)).toBeNull();
    expect(powerEquivalence(0, 1, 2, -1)).toBeNull();
  });

  it('contract keys', () => {
    expectKeys(powerEquivalence(0, 0.3, -1, 1), ['test', 'power', 'meanDiff', 'se', 'dL', 'dU', 'alpha', 'apa']);
  });

  it('power is 0 when mean outside bounds', () => {
    const r = powerEquivalence(2, 0.3, -1, 1);
    expect(r.power).toBe(0);
  });

  it('power in [0, 1]', () => {
    const r = powerEquivalence(0, 0.3, -1, 1);
    expect(r.power).toBeGreaterThanOrEqual(0);
    expect(r.power).toBeLessThanOrEqual(1);
  });

  it('higher power at center of bounds', () => {
    const r1 = powerEquivalence(0, 0.3, -1, 1);
    const r2 = powerEquivalence(0.8, 0.3, -1, 1);
    expect(r1.power).toBeGreaterThan(r2.power);
  });

  it('power increases with smaller se', () => {
    const r1 = powerEquivalence(0, 0.5, -1, 1);
    const r2 = powerEquivalence(0, 0.2, -1, 1);
    expect(r2.power).toBeGreaterThan(r1.power);
  });

  it('apa is a non-empty string', () => {
    const r = powerEquivalence(0, 0.3, -1, 1);
    expect(typeof r.apa).toBe('string');
    expect(r.apa.length).toBeGreaterThan(0);
  });
});

describe('powerInteractionANOVA', () => {
  it('returns null for invalid', () => {
    expect(powerInteractionANOVA(1, 2, 5, 0.2)).toBeNull();
    expect(powerInteractionANOVA(2, 2, 1, 0.2)).toBeNull();
    expect(powerInteractionANOVA(2, 2, 5, 0)).toBeNull();
  });

  it('contract keys', () => {
    expectKeys(powerInteractionANOVA(2, 3, 10, 0.25), ['test', 'power', 'kA', 'kB', 'nPerCell', 'fInt', 'alpha', 'apa']);
  });

  it('power in [0.05, 0.999]', () => {
    const r = powerInteractionANOVA(2, 2, 20, 0.3);
    expect(r.power).toBeGreaterThan(0.05);
    expect(r.power).toBeLessThan(0.999);
  });

  it('power increases with nPerCell', () => {
    const r1 = powerInteractionANOVA(2, 2, 10, 0.25);
    const r2 = powerInteractionANOVA(2, 2, 30, 0.25);
    expect(r2.power).toBeGreaterThan(r1.power);
  });

  it('power increases with fInt', () => {
    const r1 = powerInteractionANOVA(2, 2, 20, 0.15);
    const r2 = powerInteractionANOVA(2, 2, 20, 0.35);
    expect(r2.power).toBeGreaterThan(r1.power);
  });

  it('apa is a non-empty string', () => {
    const r = powerInteractionANOVA(2, 2, 20, 0.25);
    expect(typeof r.apa).toBe('string');
    expect(r.apa.length).toBeGreaterThan(0);
  });
});

// Power Wrappers
describe('powerANOVA', () => {
  it('null for k<2', () => expect(powerANOVA(0.3, 1, 10)).toBeNull());
  it('power in range', () => { const r = powerANOVA(0.3, 3, 20); expect(r.power).toBeGreaterThan(0.05); });
  it('contract keys', () => expectKeys(powerANOVA(0.3, 3, 20), ['test', 'power', 'cohenF', 'f2', 'k', 'nPerGroup', 'alpha', 'apa']));
});

describe('powerChiSq', () => {
  it('null for df<1', () => expect(powerChiSq(0.3, 0, 50)).toBeNull());
  it('power increases with N', () => { const r1 = powerChiSq(0.2, 2, 30); const r2 = powerChiSq(0.2, 2, 100); expect(r2.power).toBeGreaterThan(r1.power); });
  it('power between 0-1', () => { const r = powerChiSq(0.3, 2, 50); if (r) { expect(r.power).toBeGreaterThanOrEqual(0); expect(r.power).toBeLessThanOrEqual(1); } });
});

describe('powerLogisticReg', () => {
  it('contract keys', () => expectKeys(powerLogisticReg(2, 0.2, 50), ['test', 'power', 'or', 'pControl', 'nPerGroup', 'alpha', 'apa']));
  it('power in range', () => { const r = powerLogisticReg(2, 0.2, 100); expect(r.power).toBeGreaterThan(0.05); });
  it('null for OR <= 0', () => expect(powerLogisticReg(0, 0.2, 50)).toBeNull());
});

describe('powerMultilevel', () => {
  it('power in range', () => { const r = powerMultilevel(0.05, 20, 10, 0.4); expect(r.power).toBeGreaterThan(0.05); });
  it('power between 0-1', () => { const r = powerMultilevel(0.05, 20, 10, 0.4); if (r) { expect(r.power).toBeGreaterThanOrEqual(0); expect(r.power).toBeLessThanOrEqual(1); } });
  it('null for ICC out of range', () => expect(powerMultilevel(1.5, 20, 10, 0.4)).toBeNull());
});

describe('powerCorrelation', () => {
  it('null for n<5', () => expect(powerCorrelation(3, 0.3)).toBeNull());
  it('power in [0,1]', () => { const r = powerCorrelation(50, 0.3); expect(r.power).toBeGreaterThanOrEqual(0); expect(r.power).toBeLessThanOrEqual(1); });
  it('contract keys', () => expectKeys(powerCorrelation(50, 0.3), ['test','power','n','r','alpha','apa']));
});

describe('powerMediationTest', () => {
  it('power in range', () => { const r = powerMediationTest(0.3, 0.4, 0.1, 0.1, { B: 100 }); expect(r.powerMC).toBeGreaterThanOrEqual(0); });
  it('power between 0-1', () => { const r = powerMediationTest(0.3, 0.4, 0.1, 0.1, { B: 100 }); if (r) { expect(r.powerMC).toBeGreaterThanOrEqual(0); expect(r.powerMC).toBeLessThanOrEqual(1); } });
  it('null for seA=0', () => expect(powerMediationTest(0.3, 0.4, 0, 0.1)).toBeNull());
});

describe('requiredNT', () => {
  it('returns n', () => { const r = requiredNT(0.5); expect(r.n).toBeGreaterThan(2); });
  it('contract keys', () => expectKeys(requiredNT(0.5), ['test', 'n', 'd', 'power', 'alpha', 'type', 'apa']));
  it('n finite', () => expect(Number.isFinite(requiredNT(0.5).n)).toBe(true));
});

describe('requiredNCorrelation', () => {
  it('returns n', () => { const r = requiredNCorrelation(0.3); expect(r.n).toBeGreaterThan(5); });
  it('n positive', () => { const r = requiredNCorrelation(0.3); if (r) expect(r.n).toBeGreaterThan(0); });
  it('n finite', () => expect(Number.isFinite(requiredNCorrelation(0.3).n)).toBe(true));
});

describe('requiredNOneProp', () => {
  it('returns n', () => { const r = requiredNOneProp(0.1, 0.3); expect(r.n).toBeGreaterThan(5); });
  it('n positive', () => { const r = requiredNOneProp(0.1, 0.3); if (r) expect(r.n).toBeGreaterThan(0); });
  it('n finite', () => expect(Number.isFinite(requiredNOneProp(0.1, 0.3).n)).toBe(true));
});

describe('requiredNTwoProp', () => {
  it('returns n', () => { const r = requiredNTwoProp(0.2, 0.4); expect(r.n).toBeGreaterThan(5); });
  it('n positive', () => { const r = requiredNTwoProp(0.2, 0.4); if (r) expect(r.n).toBeGreaterThan(0); });
  it('n finite', () => expect(Number.isFinite(requiredNTwoProp(0.2, 0.4).n)).toBe(true));
});

describe('requiredNWilcoxon', () => {
  it('returns n', () => { const r = requiredNWilcoxon(0.5); expect(r.n).toBeGreaterThan(3); });
  it('n positive', () => { const r = requiredNWilcoxon(0.5); if (r) expect(r.n).toBeGreaterThan(0); });
  it('n finite', () => expect(Number.isFinite(requiredNWilcoxon(0.5).n)).toBe(true));
});

describe('requiredNLogRank', () => {
  it('returns nEvents', () => { const r = requiredNLogRank(0.6); expect(r.nEvents).toBeGreaterThan(4); });
  it('n positive', () => { const r = requiredNLogRank(0.6); if (r) expect(r.nEvents).toBeGreaterThan(0); });
  it('nEvents finite', () => expect(Number.isFinite(requiredNLogRank(0.6).nEvents)).toBe(true));
});

describe('requiredNOLS', () => {
  it('returns n', () => { const r = requiredNOLS(0.2, 2); expect(r.n).toBeGreaterThan(5); });
  it('n positive', () => { const r = requiredNOLS(0.2, 2); if (r) expect(r.n).toBeGreaterThan(0); });
  it('n finite', () => expect(Number.isFinite(requiredNOLS(0.2, 2).n)).toBe(true));
});

describe('requiredNANOVA', () => {
  it('returns nPerGroup', () => { const r = requiredNANOVA(0.3, 3); expect(r.nPerGroup).toBeGreaterThan(2); });
  it('null for cohenF <= 0', () => expect(requiredNANOVA(0, 3)).toBeNull());
  it('nPerGroup finite', () => expect(Number.isFinite(requiredNANOVA(0.3, 3).nPerGroup)).toBe(true));
});

describe('powerTTestWrapper', () => {
  it('power in range', () => { const r = powerTTestWrapper(30, 30, 0.5); expect(r.power).toBeGreaterThan(0.05); });
  it('power between 0-1', () => { const r = powerTTestWrapper(30, 30, 0.5); if (r) { expect(r.power).toBeGreaterThanOrEqual(0); expect(r.power).toBeLessThanOrEqual(1); } });
  it('null for n1<2', () => expect(powerTTestWrapper(1, 1, 0.5)).toBeNull());
});

describe('powerProportionOne', () => {
  it('power in range', () => { const r = powerProportionOne(100, 0.1, 0.3); expect(r.power).toBeGreaterThan(0.05); });
  it('power between 0-1', () => { const r = powerProportionOne(100, 0.1, 0.3); if (r) { expect(r.power).toBeGreaterThanOrEqual(0); expect(r.power).toBeLessThanOrEqual(1); } });
  it('null for p0=p1', () => expect(powerProportionOne(100, 0.5, 0.5)).toBeNull());
});

describe('powerProportionTwo', () => {
  it('power in range', () => { const r = powerProportionTwo(100, 100, 0.2, 0.4); expect(r.power).toBeGreaterThan(0.05); });
  it('power between 0-1', () => { const r = powerProportionTwo(100, 100, 0.2, 0.4); if (r) { expect(r.power).toBeGreaterThanOrEqual(0); expect(r.power).toBeLessThanOrEqual(1); } });
  it('null for p<0', () => expect(powerProportionTwo(50, 50, -0.1, 0.3)).toBeNull());
});

describe('powerWilcoxonTest', () => {
  it('power in range', () => { const r = powerWilcoxonTest(30, 30, 0.5); expect(r.power).toBeGreaterThan(0.05); });
  it('power between 0-1', () => { const r = powerWilcoxonTest(30, 30, 0.5); if (r) { expect(r.power).toBeGreaterThanOrEqual(0); expect(r.power).toBeLessThanOrEqual(1); } });
  it('null for n<3', () => expect(powerWilcoxonTest(2, 2, 0.5)).toBeNull());
});

describe('powerLogRankTest', () => {
  it('power in range', () => { const r = powerLogRankTest(50, 0.6); expect(r.power).toBeGreaterThan(0.05); });
  it('power between 0-1', () => { const r = powerLogRankTest(50, 0.6); if (r) { expect(r.power).toBeGreaterThanOrEqual(0); expect(r.power).toBeLessThanOrEqual(1); } });
  it('null for nEvents<4', () => expect(powerLogRankTest(2, 0.6)).toBeNull());
});

describe('powerRMANOVA', () => {
  it('power in range', () => { const r = powerRMANOVA(3, 20, 1, 0.3); expect(r.power).toBeGreaterThan(0.05); });
  it('power between 0-1', () => { const r = powerRMANOVA(3, 20, 1, 0.3); if (r) { expect(r.power).toBeGreaterThanOrEqual(0); expect(r.power).toBeLessThanOrEqual(1); } });
  it('null for k<2', () => expect(powerRMANOVA(1, 20, 1, 0.3)).toBeNull());
});

describe('powerOLS_apa', () => {
  it('power in range', () => { const r = powerOLS_apa(0.2, 30, 2); expect(r.power).toBeGreaterThan(0.05); });
  it('power between 0-1', () => { const r = powerOLS_apa(0.2, 30, 2); if (r) { expect(r.power).toBeGreaterThanOrEqual(0); expect(r.power).toBeLessThanOrEqual(1); } });
  it('null for n<k+2', () => expect(powerOLS_apa(0.2, 4, 5)).toBeNull());
});

describe('powerSpearmanTest', () => {
  it('power in range', () => { const r = powerSpearmanTest(30, 0.3); expect(r.power).toBeGreaterThan(0.05); });
  it('power between 0-1', () => { const r = powerSpearmanTest(30, 0.3); if (r) { expect(r.power).toBeGreaterThanOrEqual(0); expect(r.power).toBeLessThanOrEqual(1); } });
  it('null for n<5', () => expect(powerSpearmanTest(3, 0.3)).toBeNull());
});

// ── Edge Cases ──────────────────────────────────────────────────────────────
describe('edge cases', () => {
  it('powerCoxPH null for hr<=0', () => expect(powerCoxPH(10, 0)).toBeNull());
  it('powerCoxPH null for rSquaredOther out of range', () => expect(powerCoxPH(10, 0.5, 1.5)).toBeNull());
  it('powerMetaAnalysis null for tau2<0', () => expect(powerMetaAnalysis(10, 0.3, -0.1)).toBeNull());
  it('powerEquivalence returns 0 when meanDiff outside', () => expect(powerEquivalence(2, 0.3, -1, 1).power).toBe(0));
  it('powerEquivalence null for dL>=dU', () => expect(powerEquivalence(0, 0.3, 2, -1)).toBeNull());
  it('powerInteractionANOVA null for kA<2', () => expect(powerInteractionANOVA(1, 2, 5, 0.2)).toBeNull());
  it('powerInteractionANOVA null for nPerCell<2', () => expect(powerInteractionANOVA(2, 2, 1, 0.2)).toBeNull());
  it('powerANOVA null for negative cohenF', () => expect(powerANOVA(-0.1, 3, 10)).toBeNull());
  it('powerChiSq power increases with cohenW', () => { expect(powerChiSq(0.5, 2, 50).power).toBeGreaterThan(powerChiSq(0.1, 2, 50).power); });
  it('powerLogisticReg null for OR<=0', () => expect(powerLogisticReg(0, 0.2, 50)).toBeNull());
  it('powerMultilevel null for ICC>=1', () => expect(powerMultilevel(1.5, 10, 5, 0.4)).toBeNull());
  it('powerCorrelation null for |r| >= 1', () => expect(powerCorrelation(50, 1.5)).toBeNull());
  it('powerMediationTest null for seA=0', () => expect(powerMediationTest(0.3, 0.4, 0, 0.1)).toBeNull());
  it('requiredNT returns finite value', () => expect(Number.isFinite(requiredNT(0.8).n)).toBe(true));
  it('requiredNLogRank null for hr=0', () => expect(requiredNLogRank(0)).toBeNull());
  it('requiredNANOVA null for cohenF=0', () => expect(requiredNANOVA(0, 3)).toBeNull());
  it('powerTTestWrapper null for n1<2', () => expect(powerTTestWrapper(1, 1, 0.5)).toBeNull());
  it('powerProportionOne null for p0=p1', () => expect(powerProportionOne(100, 0.5, 0.5)).toBeNull());
  it('powerProportionTwo null for p<0', () => expect(powerProportionTwo(50, 50, -0.1, 0.3)).toBeNull());
  it('powerRMANOVA null for k<2', () => expect(powerRMANOVA(1, 10, 1, 0.3)).toBeNull());
  it('powerOLS_apa null for n<k+2', () => expect(powerOLS_apa(0.2, 4, 5)).toBeNull());
  it('powerCoxPH power increases with nEvents', () => { expect(powerCoxPH(200, 0.6).power).toBeGreaterThan(powerCoxPH(50, 0.6).power); });
  it('powerMetaAnalysis null for nPerStudy<4', () => expect(powerMetaAnalysis(10, 0.3, 0, null, 3)).toBeNull());
  it('powerEquivalence power=1 when meanDiff at center', () => { const r = powerEquivalence(0, 0.1, -2, 2); expect(r.power).toBeGreaterThan(0.9); });
  it('powerInteractionANOVA null for fInt<=0', () => expect(powerInteractionANOVA(2, 2, 10, 0)).toBeNull());
  it('powerANOVA with custom seed', () => { const r1 = powerANOVA(0.3, 3, 20, 0.05, 42); const r2 = powerANOVA(0.3, 3, 20, 0.05, 99); expect(Number.isFinite(r1.power)).toBe(true); });
  it('powerChiSq alpha parameter affects power', () => { expect(powerChiSq(0.3, 2, 50, 0.01).power).toBeLessThanOrEqual(powerChiSq(0.3, 2, 50, 0.1).power); });
  it('requiredNT with paired type', () => { const r = requiredNT(0.5, 0.8, 0.05, 'paired'); expect(r.n).toBeGreaterThan(2); });
  it('requiredNCorrelation returns finite n', () => expect(Number.isFinite(requiredNCorrelation(0.3).n)).toBe(true));
  it('requiredNOneProp with different p', () => { expect(requiredNOneProp(0.1, 0.4).n).toBeLessThan(requiredNOneProp(0.1, 0.3).n || Infinity); });
  it('requiredNTwoProp returns n', () => expect(requiredNTwoProp(0.2, 0.4).n).toBeGreaterThan(5));
  it('requiredNWilcoxon returns n', () => expect(requiredNWilcoxon(0.5).n).toBeGreaterThan(3));
  it('requiredNOLS returns n', () => expect(requiredNOLS(0.2, 2).n).toBeGreaterThan(5));
  it('powerProportionOne p0=p1 null', () => expect(powerProportionOne(100, 0.5, 0.5)).toBeNull());
  it('powerTTestWrapper with one-sample type', () => { const r = powerTTestWrapper(20, 20, 0.5, 'one-sample'); expect(r).not.toBeNull(); });
  it('powerWilcoxonTest null for n<3', () => expect(powerWilcoxonTest(2, 2, 0.5)).toBeNull());
  it('powerLogRankTest null for nEvents<4', () => expect(powerLogRankTest(2, 0.6)).toBeNull());
  it('powerSpearmanTest null for n<5', () => expect(powerSpearmanTest(3, 0.3)).toBeNull());
});

describe('powerChiSq, powerOLS_apa, powerRMANOVA, powerInteractionANOVA use the exact noncentral chi-square/F distribution (regression test for the normal-approximation fix)', () => {
  it('powerChiSq matches scipy.stats.ncx2 exactly (old normal approx could be off by several points)', () => {
    const e = ref.power.chi_basic;
    const r = powerChiSq(e.cohenW, e.df, e.N, e.alpha);
    expect(r.power).toBeCloseTo(e.power, 3);
  });
  it('powerOLS_apa matches scipy.stats.ncf exactly (old normal approx gave 0.970 vs. the exact 0.905)', () => {
    const e = ref.power.ols_basic;
    const r = powerOLS_apa(e.rSquared, e.n, e.k, e.alpha);
    expect(r.power).toBeCloseTo(e.power, 3);
  });
  it('powerRMANOVA matches scipy.stats.ncf exactly', () => {
    const e = ref.power.rmanova_basic;
    const r = powerRMANOVA(e.k, e.n, e.epsilon, e.f, e.alpha);
    expect(r.power).toBeCloseTo(e.power, 3);
  });
  it('powerInteractionANOVA matches scipy.stats.ncf exactly', () => {
    const e = ref.power.interaction_anova_basic;
    const r = powerInteractionANOVA(e.kA, e.kB, e.nPerCell, e.fInt, e.alpha);
    expect(r.power).toBeCloseTo(e.power, 3);
  });
});
