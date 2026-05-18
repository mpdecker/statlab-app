import { describe, it, expect } from 'vitest';
import { propensityScoreMatch } from './causal.js';
import {
  binomialTest, onePropZ, twoPropZ, chiGoF, fisherExact, mcnemar,
  grubbsTest, sensitivityLOO,
} from './categorical.js';
import { tOne, zTestKnownSD } from './means.js';
import { cohensKappa, metaAnalysis, convertEffectSize, differencesInDifferences } from './multivariate.js';
import { bootstrapMediation, logisticReg, kendallTau, pointBiserial, multipleOLS, hierarchicalOLS, mediation } from './regression.js';
import { rmANOVA, welchANOVA, cochranQ, twoWayANOVA } from './anova.js';
import { pca } from './multivariate.js';
import { powerANOVA, powerMediation } from '../math/power.js';
import { kmeans } from './clustering.js';
import { networkFromEdgeList } from './network.js';
import { hlmRandomIntercept } from './multilevel.js';
import { bootstrapCI, shapiroWilk, normalityDP } from '../math/distributions.js';
import { causalRows } from './fixtures/phase3.js';
import { GROUP_A, mkTabular } from './fixtures/core.js';

describe('hardening — invalid inputs return null', () => {
  it('binomialTest rejects bad n/k/p0', () => {
    expect(binomialTest(5, 0, 0.5)).toBeNull();
    expect(binomialTest(-1, 10, 0.5)).toBeNull();
    expect(binomialTest(5, 10, 0)).toBeNull();
    expect(binomialTest(5, 10, 1)).toBeNull();
  });

  it('proportion z-tests reject n=0', () => {
    expect(onePropZ(1, 0, 0.5)).toBeNull();
    expect(twoPropZ(1, 0, 2, 10)).toBeNull();
  });

  it('chiGoF rejects zero expected', () => {
    expect(chiGoF([1, 2, 3], [0, 1, 1])).toBeNull();
  });

  it('tOne rejects constant vector', () => {
    expect(tOne([3, 3, 3, 3], 0)).toBeNull();
  });

  it('zTestKnownSD rejects sigma<=0', () => {
    expect(zTestKnownSD(1, 0, 0, 10)).toBeNull();
  });

  it('cohensKappa handles perfect agreement', () => {
    expect(cohensKappa(['A', 'A'], ['A', 'A'])?.kappa).toBe(1);
  });

  it('metaAnalysis I2 finite when Q=0', () => {
    const r = metaAnalysis([
      { label: 'a', d: 0.5, se: 0.1 },
      { label: 'b', d: 0.5, se: 0.1 },
    ]);
    expect(Number.isFinite(r.I2)).toBe(true);
  });

  it('metaAnalysis rejects bad se', () => {
    expect(metaAnalysis([{ label: 'a', d: 0.5, se: 0 }, { label: 'b', d: 0.3, se: 0.2 }])).toBeNull();
  });

  it('convertEffectSize rejects singular inputs', () => {
    expect(convertEffectSize('r', '1')).toBeNull();
    expect(convertEffectSize('OR', '0')).toBeNull();
    expect(convertEffectSize('eta2', '1')).toBeNull();
  });

  it('differencesInDifferences requires equal group lengths', () => {
    expect(differencesInDifferences([1, 2], [3, 4, 5], [1, 2], [3, 4])).toBeNull();
  });

  it('rmANOVA rejects empty matrix', () => {
    expect(rmANOVA([])).toBeNull();
    expect(rmANOVA([[]])).toBeNull();
  });

  it('bootstrapMediation returns null when all resamples fail', () => {
    expect(bootstrapMediation([], [], [])).toBeNull();
  });

  it('bootstrapCI rejects empty or tiny samples', () => {
    expect(bootstrapCI([], v => avg(v))).toBeNull();
    expect(bootstrapCI([1], v => avg(v))).toBeNull();
  });

  it('grubbsTest rejects constant data', () => {
    expect(grubbsTest([5, 5, 5, 5, 5, 5, 5])).toBeNull();
  });

  it('shapiroWilk and normalityDP reject constant data', () => {
    const c = [2, 2, 2, 2, 2, 2];
    expect(shapiroWilk(c)).toBeNull();
    expect(normalityDP(c)).toBeNull();
  });

  it('fisherExact rejects negative cells', () => {
    expect(fisherExact(-1, 2, 3, 4)).toBeNull();
  });

  it('mcnemar rejects b+c=0', () => {
    expect(mcnemar(0, 0)).toBeNull();
  });

  it('welchANOVA rejects singleton groups', () => {
    expect(welchANOVA([{ name: 'A', vals: [1] }, { name: 'B', vals: [2, 3] }])).toBeNull();
  });

  it('cochranQ rejects zero denominator', () => {
    expect(cochranQ(Array.from({ length: 6 }, () => [0, 0]))).toBeNull();
  });

  it('logisticReg rejects all-one-class', () => {
    const Y = [1, 1, 1, 1, 1, 1];
    const X = Y.map(() => [0.1]);
    expect(logisticReg(Y, X, ['x'])).toBeNull();
  });

  it('kendallTau rejects all ties', () => {
    expect(kendallTau([1, 1, 1], [2, 2, 2])).toBeNull();
  });

  it('pointBiserial rejects single-level binary', () => {
    expect(pointBiserial([1, 1, 1], [2, 3, 4])).toBeNull();
  });

  it('sensitivityLOO rejects when LOO tests fail', () => {
    expect(sensitivityLOO([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], () => null)).toBeNull();
  });
});

describe('hardening — PSM balanceAfter uses covariates', () => {
  it('balanceAfter diffs are smaller than balanceBefore on average', () => {
    const rows = causalRows(120);
    const r = propensityScoreMatch(rows, 'treat', 'y', ['x1', 'x2']);
    expect(r).not.toBeNull();
    const before = r.balanceBefore.reduce((s, b) => s + Math.abs(b.diff), 0);
    const after = r.balanceAfter.reduce((s, b) => s + Math.abs(b.diff), 0);
    expect(after).toBeLessThanOrEqual(before + 0.01);
  });
});

describe('hardening — kmeans reproducibility', () => {
  it('same seed yields same labels', () => {
    const data = causalRows(40).map((r, i) => ({ ...r, x1: r.x1 + i * 0.01 }));
    const a = kmeans(data, ['x1', 'x2'], 3, 50, 99);
    const b = kmeans(data, ['x1', 'x2'], 3, 50, 99);
    expect(a.labels).toEqual(b.labels);
  });
});

describe('hardening — network edge weights', () => {
  it('parses weighted edges', () => {
    const net = networkFromEdgeList('A-B:2,C-D');
    expect(net.edges.find(e => e.from === 'A')?.weight).toBe(2);
  });
});

describe('hardening — pass 3 guards', () => {
  it('propensityScoreMatch null with too few pairs', () => {
    const rows = causalRows(30).map(r => ({ ...r, treat: 'C' }));
    expect(propensityScoreMatch(rows, 'treat', 'y', ['x1'])).toBeNull();
  });

  it('twoWayANOVA null on constant response', () => {
    const rows = mkTabular(24).map(r => ({ ...r, a: r.group, b: r.cat1, y: 5 }));
    expect(twoWayANOVA(rows, 'a', 'b', 'y')).toBeNull();
  });

  it('pca null when zero total variance', () => {
    const rows = Array.from({ length: 10 }, () => ({ x: 1, y: 2 }));
    expect(pca(rows, ['x', 'y'])).toBeNull();
  });

  it('multipleOLS perfect fit returns model with F null', () => {
    const xs = [[1], [2], [3], [4], [5]];
    const ys = [2, 4, 6, 8, 10];
    const r = multipleOLS(ys, xs, ['x']);
    expect(r).not.toBeNull();
    expect(r.r2).toBe(1);
    expect(r.F).toBeNull();
  });

  it('powerANOVA reproducible with seed', () => {
    expect(powerANOVA(0.3, 3, 25, 0.05, 1)).toBe(powerANOVA(0.3, 3, 25, 0.05, 1));
  });

  it('powerMediation reproducible with seed', () => {
    const a = powerMediation(0.3, 0.4, 0.1, 0.1, 300, 0.05, 2);
    const b = powerMediation(0.3, 0.4, 0.1, 0.1, 300, 0.05, 2);
    expect(a.powerMC).toBe(b.powerMC);
  });

  it('bootstrapMediation reproducible with seed', () => {
    const X = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const M = X.map(x => x * 0.8 + 0.5);
    const Y = X.map(x => x * 1.2 + M[0] * 0.3);
    const a = bootstrapMediation(X, M, Y, 400, 0.05, 11);
    const b = bootstrapMediation(X, M, Y, 400, 0.05, 11);
    expect(a.lo).toBe(b.lo);
    expect(a.hi).toBe(b.hi);
    expect(a.sig).toBe(b.sig);
  });
});

describe('hardening — HLM guards', () => {
  it('hlmRandomIntercept null when one row per cluster', () => {
    const rows = GROUP_A.map((y, i) => ({ y, school: `S${i}`, x: i * 0.1 }));
    expect(hlmRandomIntercept(rows, 'y', 'school', ['x'])).toBeNull();
  });
});
