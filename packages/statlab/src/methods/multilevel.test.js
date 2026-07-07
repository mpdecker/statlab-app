import { describe, it, expect } from 'vitest';
import { hlmRandomIntercept, hlmRandomSlope, iccMultilevel, glmmLogistic, glmmPoisson, compareMixedModels, crossLevelInteraction, hlmThreeLevel, geeExchangeable, growthCurve, randomCoefficients, fixedEffectsPanel, randomEffectsPanel, hausmanTest, arellanoBond, glmmNegBinom, geeAR1, remlEstimate, repeatedMeasuresMANOVA, transitionModel } from './multilevel.js';
import { nestedHLM } from './fixtures/phase3.js';
import { GROUP_A } from './fixtures/core.js';
import { expectKeys } from './__fixtures__/helpers.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

const data = nestedHLM();

describe('hlmRandomIntercept', () => {
  it('returns null with fewer than 3 clusters', () => {
    const tiny = nestedHLM({ schools: 2, pupilsPer: 20 });
    expect(hlmRandomIntercept(tiny, 'y', 'school')).toBeNull();
  });

  it('returns null when n < J + 10', () => {
    expect(hlmRandomIntercept(data.slice(0, 12), 'y', 'school')).toBeNull();
  });

  it('ICC in [0, 1] after clamping', () => {
    const r = hlmRandomIntercept(data, 'y', 'school', ['x']);
    expect(r.icc).toBeGreaterThanOrEqual(0);
    expect(r.icc).toBeLessThanOrEqual(1);
  });

  it('variance components non-negative', () => {
    const r = hlmRandomIntercept(data, 'y', 'school');
    expect(r.tau00).toBeGreaterThanOrEqual(0);
    expect(r.sigma2).toBeGreaterThan(0);
  });

  it('design effect >= 1 when ICC > 0', () => {
    const r = hlmRandomIntercept(data, 'y', 'school');
    if (r.icc > 0) expect(r.designEffect).toBeGreaterThanOrEqual(1);
  });

  it('nested data yields ICC > 0.1', () => {
    expect(hlmRandomIntercept(data, 'y', 'school').icc).toBeGreaterThan(0.1);
  });

  it('gamma01 and se when predictor supplied', () => {
    const r = hlmRandomIntercept(data, 'y', 'school', ['x']);
    expect(r.gamma01).not.toBeNull();
    expect(r.seGamma01).toBeGreaterThan(0);
  });

  it('no predictor leaves gamma01 null', () => {
    expect(hlmRandomIntercept(data, 'y', 'school', []).gamma01).toBeNull();
  });

  it('groupMeans capped at 12 clusters', () => {
    const big = nestedHLM({ schools: 20, pupilsPer: 8 });
    expect(hlmRandomIntercept(big, 'y', 'school').groupMeans.length).toBeLessThanOrEqual(12);
  });

  it('contract fields', () => {
    const r = hlmRandomIntercept(data, 'y', 'school', ['x']);
    expectKeys(r, [
      'test', 'icc', 'tau00', 'sigma2', 'gamma00', 'gamma01', 'seGamma01',
      'designEffect', 'nClusters', 'n', 'clusterVar', 'yVar', 'groupMeans', 'apa',
    ]);
    expect(r.test).toBe('HLM Random Intercept');
  });

  it('filters rows missing y', () => {
    const dirty = data.map((r, i) => (i === 0 ? { ...r, y: NaN } : r));
    const r = hlmRandomIntercept(dirty, 'y', 'school');
    expect(r.n).toBe(data.length - 1);
  });

  it('apa includes ICC and cluster count', () => {
    const r = hlmRandomIntercept(data, 'y', 'school');
    expect(r.apa).toMatch(/ICC/);
    expect(r.apa).toMatch(/J =/);
  });

  it('tau00 and sigma2 consistent with ANOVA oracle', () => {
    const r = hlmRandomIntercept(data, 'y', 'school');
    const o = ref.multilevel.hlmNull;
    expect(r.icc).toBeCloseTo(o.icc, 4);
    expect(r.tau00).toBeCloseTo(o.tau00, 4);
    expect(r.sigma2).toBeCloseTo(o.sigma2, 4);
  });

  it('gamma01 consistent with group-mean regression oracle', () => {
    const r = hlmRandomIntercept(data, 'y', 'school', ['x']);
    const o = ref.multilevel.hlmX;
    expect(r.gamma01).toBeCloseTo(o.gamma01, 4);
    expect(r.seGamma01).toBeCloseTo(o.seGamma01, 4);
  });
});

describe('hlmRandomSlope', () => {
  it('returns null when RI fails', () => {
    expect(hlmRandomSlope(data.slice(0, 5), 'y', 'school', 'x')).toBeNull();
  });

  it('extends RI with slope variance', () => {
    const r = hlmRandomSlope(data, 'y', 'school', 'x');
    expect(r.slopeVariance).toBeGreaterThanOrEqual(0);
    expect(r.meanSlope).toBeDefined();
  });

  it('slopes array per cluster (max 15)', () => {
    const r = hlmRandomSlope(data, 'y', 'school', 'x');
    expect(r.slopes.length).toBeGreaterThan(0);
    expect(r.slopes.length).toBeLessThanOrEqual(15);
    r.slopes.forEach(s => {
      expect(s).toHaveProperty('name');
      expect(s).toHaveProperty('slope');
      expect(s.n).toBeGreaterThan(0);
    });
  });

  it('test label updated', () => {
    expect(hlmRandomSlope(data, 'y', 'school', 'x').test).toBe('HLM Random Slope');
  });

  it('apa mentions slope variance', () => {
    expect(hlmRandomSlope(data, 'y', 'school', 'x').apa).toMatch(/slope var/i);
  });
});

describe('iccMultilevel', () => {
  it('returns null when RI null', () => {
    expect(iccMultilevel(data.slice(0, 4), 'y', 'school')).toBeNull();
  });

  it('ICC matches RI model', () => {
    const r = iccMultilevel(data, 'y', 'school');
    const ri = hlmRandomIntercept(data, 'y', 'school', []);
    expect(r.icc).toBe(ri.icc);
    expect(r.designEffect).toBe(ri.designEffect);
  });

  it('contract fields', () => {
    const r = iccMultilevel(data, 'y', 'school');
    expectKeys(r, ['test', 'icc', 'designEffect', 'tau00', 'sigma2', 'nClusters', 'n', 'apa']);
    expect(r.test).toBe('Multilevel ICC');
  });
});

const binaryData = [];
for (let j = 0; j < 5; j++) {
  for (let i = 0; i < 20; i++) {
    const x = i * 0.3;
    const prob = 1 / (1 + Math.exp(-(x - 2.5)));
    binaryData.push({ y: Math.random() < prob ? 1 : 0, x, school: String(j) });
  }
}

const countData = [];
for (let j = 0; j < 5; j++) {
  for (let i = 0; i < 25; i++) {
    const x = i * 0.2;
    const lambda = Math.exp(1.0 + x * 0.3);
    countData.push({ y: Math.round(lambda + (Math.random() - 0.5) * Math.sqrt(lambda)), x, school: String(j) });
  }
}

describe('glmmLogistic', () => {
  it('returns null for non-binary y', () => {
    const bad = [{ y: 2, x: 1, school: 'A' }, { y: 0, x: 2, school: 'A' }];
    expect(glmmLogistic(bad, 'y', 'school')).toBeNull();
  });

  it('returns null for too few clusters', () => {
    const small = binaryData.filter(r => r.school === '0' || r.school === '1');
    expect(glmmLogistic(small, 'y', 'school')).toBeNull();
  });

  it('fits logistic GLMM with predictors', () => {
    const r = glmmLogistic(binaryData, 'y', 'school', ['x']);
    expect(r).not.toBeNull();
    expect(r.test).toBe('GLMM Logistic');
    expect(r.coefficients.length).toBeGreaterThan(0);
    expect(r.tau2).toBeGreaterThanOrEqual(0);
    expect(r.nClusters).toBeGreaterThanOrEqual(2);
  });

  it('logistic GLMM produces positive OR for positive predictor', () => {
    const r = glmmLogistic(binaryData, 'y', 'school', ['x']);
    expect(r.coefficients[1].OR).toBeGreaterThan(1);
  });
});

describe('glmmPoisson', () => {
  it('returns null for non-integer y', () => {
    const bad = [{ y: 1.5, x: 1, school: 'A' }, { y: 2, x: 2, school: 'A' }];
    expect(glmmPoisson(bad, 'y', 'school')).toBeNull();
  });

  it('fits Poisson GLMM with predictors', () => {
    const r = glmmPoisson(countData, 'y', 'school', ['x']);
    expect(r).not.toBeNull();
    expect(r.test).toBe('GLMM Poisson');
    expect(r.coefficients.length).toBeGreaterThan(0);
    expect(r.tau2).toBeGreaterThanOrEqual(0);
    expect(r.phi).toBeGreaterThan(0);
  });

  it('tau2 >= 0', () => {
    const r = glmmPoisson(countData, 'y', 'school', ['x']);
    expect(r.tau2).toBeGreaterThanOrEqual(0);
  });
});

describe('compareMixedModels', () => {
  it('returns null for null input', () => {
    expect(compareMixedModels(null, {})).toBeNull();
  });

  it('compares two model objects', () => {
    const m1 = { logLik: -300, n: 50, k: 2, sigma2: 4.0 };
    const m2 = { logLik: -280, n: 50, k: 3, sigma2: 2.5 };
    const r = compareMixedModels(m1, m2);
    expect(r).not.toBeNull();
    expect(r.lrtStat).toBeGreaterThan(0);
    expect(r.deltaAIC).toBeLessThan(0);
  });

  it('lrtStat positive', () => {
    const m1 = { logLik: -300, n: 50, k: 2, sigma2: 4.0 };
    const m2 = { logLik: -280, n: 50, k: 3, sigma2: 2.5 };
    const r = compareMixedModels(m1, m2);
    expect(r.lrtStat).toBeGreaterThan(0);
  });
});

describe('crossLevelInteraction', () => {
  it('returns null for too few clusters', () => {
    const small = data.filter(r => r.school === 'a' || r.school === 'b').map(r => ({ ...r, x_age: r.x, x_ses: 3 }));
    small.forEach(r => { r.school = r.school === 'a' ? '0' : '1'; });
    expect(crossLevelInteraction(small, 'y', 'school', 'x_age', 'x_ses')).toBeNull();
  });

  it('detects cross-level interaction with sufficient clusters', () => {
    const clData = [];
    for (let j = 0; j < 5; j++) {
      const l2 = j * 2;
      for (let i = 0; i < 15; i++) {
        const l1 = i * 0.5;
        clData.push({ y: 5 + l1 * 0.3 + l2 * 0.8 + l1 * l2 * 0.1 + (Math.random() - 0.5) * 2, x_l1: l1, x_l2: l2, school: String(j) });
      }
    }
    const r = crossLevelInteraction(clData, 'y', 'school', 'x_l1', 'x_l2');
    expect(r).not.toBeNull();
    expect(r.test).toBe('Cross-Level Interaction');
    expect(r.interactionSE).toBeGreaterThan(0);
    expect(r.apa.length).toBeGreaterThan(0);
  });

  it('interaction finite', () => {
    const clData = [];
    for (let j = 0; j < 5; j++) {
      const l2 = j * 2;
      for (let i = 0; i < 15; i++) {
        const l1 = i * 0.5;
        clData.push({ y: 5 + l1 * 0.3 + l2 * 0.8 + l1 * l2 * 0.1 + (Math.random() - 0.5) * 2, x_l1: l1, x_l2: l2, school: String(j) });
      }
    }
    const r = crossLevelInteraction(clData, 'y', 'school', 'x_l1', 'x_l2');
    if (r && r.interaction !== undefined) expect(Number.isFinite(r.interaction)).toBe(true);
  });
});

describe('hlmThreeLevel', () => {
  const d3 = [];
  for (let l3 = 1; l3 <= 3; l3++) for (let l2 = 1; l2 <= 3; l2++) for (let i = 1; i <= 5; i++) d3.push({ y: l3 * 2 + l2 * 0.5 + i * 0.1, l2: `B${l3}${l2}`, l3: `A${l3}` });
  it('null small', () => expect(hlmThreeLevel(d3.slice(0, 5), 'y', 'x', 'l2', 'l3')).toBeNull());
  it('contract keys', () => expectKeys(hlmThreeLevel(d3, 'y', 'x', 'l2', 'l3'), ['test', 'variances', 'icc', 'n', 'apa']));
  it('variance positive', () => { const r = hlmThreeLevel(d3, 'y', 'x', 'l2', 'l3'); if (r) expect(r.variances.l1).toBeGreaterThan(0); });
});

describe('geeExchangeable', () => {
  const ge = []; for (let i = 1; i <= 15; i++) for (let j = 1; j <= 3; j++) ge.push({ y: i + j * 2, x: j, cluster: `C${i}` });
  it('null small', () => expect(geeExchangeable(ge.slice(0, 5), 'y', 'cluster', ['x'])).toBeNull());
  it('contract keys', () => { const r = geeExchangeable(ge, 'y', 'cluster', ['x']); if (r) expectKeys(r, ['test', 'coefficients', 'alpha', 'n', 'nClusters', 'apa']); });
  it('nClusters positive', () => { const r = geeExchangeable(ge, 'y', 'cluster', ['x']); if (r) expect(r.nClusters).toBeGreaterThan(0); });
});

describe('growthCurve', () => {
  const gc = []; for (let i = 1; i <= 8; i++) for (let t = 0; t < 4; t++) gc.push({ y: i * 2 + t * 1.5, time: t, sub: `S${i}` });
  it('null small', () => expect(growthCurve(gc.slice(0, 5), 'time', 'sub', 'y')).toBeNull());
  it('contract keys', () => expectKeys(growthCurve(gc, 'time', 'sub', 'y'), ['test', 'fixed', 'random', 'n', 'apa']));
  it('random var >= 0', () => { const r = growthCurve(gc, 'time', 'sub', 'y'); expect(r.random.tau00).toBeGreaterThanOrEqual(0); });
});

describe('randomCoefficients', () => {
  const rc = []; for (let i = 0; i < 5; i++) for (let j = 0; j < 6; j++) rc.push({ y: i * 3 + j * 2, x1: j, cluster: `G${i}` });
  it('null small', () => expect(randomCoefficients(rc.slice(0, 5), 'y', 'cluster', ['x1'], ['x1'])).toBeNull());
  it('contract keys', () => { const r = randomCoefficients(rc, 'y', 'cluster', ['x1'], ['x1']); if (r) expectKeys(r, ['test', 'fixed', 'randomVariance', 'n', 'nClusters', 'apa']); });
  it('fixed non-empty', () => { const r = randomCoefficients(rc, 'y', 'cluster', ['x1'], ['x1']); if (r) expect(r.fixed.length).toBeGreaterThan(0); });
});

describe('multilevel edge cases', () => {
  it('hlmRandomIntercept null for <3 clusters', () => { const data = [{ y: 1, school: 'A', x: 1 }, { y: 2, school: 'B', x: 2 }, { y: 3, school: 'A', x: 1 }]; expect(hlmRandomIntercept(data, 'y', 'school', ['x'])).toBeNull(); });
  it('hlmRandomSlope null for small data', () => { const data = [{ y: 1, school: 'A', x: 1 }, { y: 2, school: 'B', x: 2 }]; expect(hlmRandomSlope(data, 'y', 'school', ['x'])).toBeNull(); });
  it('iccMultilevel returns ICC in [0,1]', () => { const data = []; for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) data.push({ y: i * 2 + j, school: `S${i}` }); const r = iccMultilevel(data, 'y', 'school'); expect(r.icc).toBeGreaterThanOrEqual(0); expect(r.icc).toBeLessThanOrEqual(1); });
  it('glmmLogistic null for small data', () => { const data = [{ y: 1, cluster: 'A', x: 1 }, { y: 0, cluster: 'B', x: 2 }]; expect(glmmLogistic(data, 'y', 'cluster', ['x'])).toBeNull(); });
  it('hlmThreeLevel variance components >= 0', () => { const d3 = []; for (let l3 = 1; l3 <= 3; l3++) for (let l2 = 1; l2 <= 3; l2++) for (let i = 1; i <= 5; i++) d3.push({ y: l3 * 2 + l2 + i, x: i, l2: `B${l3}${l2}`, l3: `A${l3}` }); const r = hlmThreeLevel(d3, 'y', 'x', 'l2', 'l3'); expect(r.variances.l1).toBeGreaterThanOrEqual(0); });
  it('geeExchangeable null for <3 clusters', () => { const ge = []; for (let i = 1; i <= 2; i++) for (let j = 1; j <= 3; j++) ge.push({ y: i + j, x: j, cluster: `C${i}` }); expect(geeExchangeable(ge, 'y', 'cluster', ['x'])).toBeNull(); });
  it('growthCurve random tau00 >= 0', () => { const gc = []; for (let i = 1; i <= 8; i++) for (let t = 0; t < 4; t++) gc.push({ y: i * 2 + t * 1.5, time: t, sub: `S${i}` }); const r = growthCurve(gc, 'time', 'sub', 'y'); expect(r.random.tau00).toBeGreaterThanOrEqual(0); });
});

describe('fixedEffectsPanel', () => {
  const p = []; for (let i = 1; i <= 5; i++) for (let t = 1; t <= 5; t++) p.push({ y: i * 2 + t, id: `U${i}`, time: t, x1: i + t * 0.5 });
  it('null <3 units', () => expect(fixedEffectsPanel(p.slice(0, 10), 'y', 'id', 'time', ['x1'])).toBeNull());
  it('contract keys', () => { const r = fixedEffectsPanel(p, 'y', 'id', 'time', ['x1']); if (r) expectKeys(r, ['test', 'coefficients', 'n', 'nUnits', 'nPeriods', 'apa']); });
  it('coefficients non-empty', () => { const r = fixedEffectsPanel(p, 'y', 'id', 'time', ['x1']); if (r) expect(r.coefficients.length).toBeGreaterThan(0); });
});

describe('randomEffectsPanel', () => {
  const p = []; for (let i = 1; i <= 5; i++) for (let t = 1; t <= 5; t++) p.push({ y: i * 2 + t, id: `U${i}`, time: t, x1: i + t });
  it('null <3 units', () => expect(randomEffectsPanel(p.slice(0, 10), 'y', 'id', 'time', ['x1'])).toBeNull());
  it('contract keys', () => { const r = randomEffectsPanel(p, 'y', 'id', 'time', ['x1']); if (r) expectKeys(r, ['test', 'coefficients', 'n', 'nUnits', 'apa']); });
  it('nUnits positive', () => { const r = randomEffectsPanel(p, 'y', 'id', 'time', ['x1']); if (r) expect(r.nUnits).toBeGreaterThan(0); });
});

describe('hausmanTest', () => {
  it('null for invalid', () => expect(hausmanTest(null, { coefficients: [{ b: 1, se: 0.1 }] })).toBeNull());
  it('contract keys', () => { const r = hausmanTest({ coefficients: [{ b: 1, se: 0.1 }] }, { coefficients: [{ b: 0.9, se: 0.1 }] }); if (r) expectKeys(r, ['test', 'chi2', 'df', 'p', 'apa']); });
  it('chi2 non-negative', () => { const r = hausmanTest({ coefficients: [{ b: 1, se: 0.1 }] }, { coefficients: [{ b: 0.9, se: 0.1 }] }); if (r) expect(r.chi2).toBeGreaterThanOrEqual(0); });
});

describe('arellanoBond', () => {
  const p = []; for (let i = 1; i <= 10; i++) for (let t = 1; t <= 4; t++) p.push({ y: i * 2 + t, id: `U${i}`, time: t, x1: i + t });
  it('null <5 units', () => expect(arellanoBond(p.slice(0, 10), 'y', 'id', 'time', ['x1'])).toBeNull());
  it('contract keys', () => { const r = arellanoBond(p, 'y', 'id', 'time', ['x1']); if (r) expectKeys(r, ['test', 'coefficients', 'n', 'nUnits', 'apa']); });
  it('nUnits positive', () => { const r = arellanoBond(p, 'y', 'id', 'time', ['x1']); if (r) expect(r.nUnits).toBeGreaterThan(0); });
});

describe('glmmNegBinom', () => {
  const d2 = []; for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) d2.push({ y: i + j + 1, cluster: `C${i}`, x1: i + j });
  it('contract keys', () => { const r = glmmNegBinom(d2, 'y', 'cluster', ['x1']); if (r) expectKeys(r, ['test', 'coefficients', 'theta', 'n', 'nClusters', 'apa']); });
  it('coefficients non-empty', () => { const r = glmmNegBinom(d2, 'y', 'cluster', ['x1']); if (r) expect(r.coefficients.length).toBeGreaterThan(0); });
  it('theta positive', () => { const r = glmmNegBinom(d2, 'y', 'cluster', ['x1']); if (r) expect(r.theta).toBeGreaterThan(0); });
});

describe('geeAR1', () => {
  const d2 = []; for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) d2.push({ y: i + j + 1, cluster: `C${i}`, x1: i + j });
  it('contract keys', () => { const r = geeAR1(d2, 'y', 'cluster', ['x1']); if (r) expectKeys(r, ['test', 'coefficients', 'alpha', 'n', 'nClusters', 'apa']); });
  it('coefficients non-empty', () => { const r = geeAR1(d2, 'y', 'cluster', ['x1']); if (r) expect(r.coefficients.length).toBeGreaterThan(0); });
  it('alpha finite', () => { const r = geeAR1(d2, 'y', 'cluster', ['x1']); if (r) expect(Number.isFinite(r.alpha)).toBe(true); });
});

describe('remlEstimate', () => {
  const X = [[1,0],[1,1],[1,2],[1,3],[1,4],[1,5],[1,6],[1,7],[1,8],[1,9]];
  const y = X.map(x => x[0] * 2 + x[1] * 1.5 + Math.random());
  it('contract keys', () => expectKeys(remlEstimate(X, y), ['test','sigma2','logLik','aic','n','p','apa']));
  it('null <5', () => expect(remlEstimate([[1]], [1])).toBeNull());
  it('sigma2 positive', () => { const r = remlEstimate(X, y); if (r) expect(r.sigma2).toBeGreaterThan(0); });
});

describe('repeatedMeasuresMANOVA', () => {
  const d = []; for (let i = 0; i < 20; i++) d.push({ y1: i + Math.random(), y2: i * 0.5 + Math.random(), y3: i * 0.3 + Math.random() });
  it('contract keys', () => expectKeys(repeatedMeasuresMANOVA(d, ['y1','y2','y3']), ['test','totalSS','betweenSS','withinSS','k','n','apa']));
  it('null <2 responses', () => expect(repeatedMeasuresMANOVA(d, ['y1'])).toBeNull());
  it('k matches responses', () => { const r = repeatedMeasuresMANOVA(d, ['y1','y2','y3']); if (r) expect(r.k).toBe(3); });
  it('reports an F test with GG correction', () => expectKeys(repeatedMeasuresMANOVA(d, ['y1','y2','y3']), ['test','F','p','dfCondition','dfError','ggEpsilon','pGG']));
  it('detects a real within-subject condition effect (low p)', () => {
    let s = 7; const rnd = () => { s = (1103515245 * s + 12345) & 0x7fffffff; return s / 0x7fffffff - 0.5; };
    const dd = []; for (let i = 0; i < 30; i++) { const subj = rnd() * 2; dd.push({ y1: 10 + subj + rnd(), y2: 13 + subj + rnd(), y3: 16 + subj + rnd() }); }
    const r = repeatedMeasuresMANOVA(dd, ['y1','y2','y3']);
    expect(r.F).toBeGreaterThan(4);
    expect(r.p).toBeLessThan(0.01);
    expect(r.ggEpsilon).toBeLessThanOrEqual(1);
  });
  it('does not flag a condition effect when levels share a mean (high p)', () => {
    let s = 99; const rnd = () => { s = (1103515245 * s + 12345) & 0x7fffffff; return s / 0x7fffffff - 0.5; };
    const dd = []; for (let i = 0; i < 30; i++) { const subj = rnd() * 3; dd.push({ y1: 10 + subj + rnd(), y2: 10 + subj + rnd(), y3: 10 + subj + rnd() }); }
    const r = repeatedMeasuresMANOVA(dd, ['y1','y2','y3']);
    expect(r.p).toBeGreaterThan(0.05);
  });
});
describe('transitionModel', () => {
  const d = []; for (let i = 0; i < 20; i++) d.push({ id: Math.floor(i/3), y: i * 2, x1: i % 3, x2: i % 2 });
  it('contract keys', () => expectKeys(transitionModel(d, 'y', ['x1','x2'], { idVar: 'id' }), ['test','coefficients','nSubjects','n','apa']));
  it('null <3 ids', () => expect(transitionModel(d.slice(0,5), 'y', ['x1'], { idVar: 'id' })).toBeNull());
  it('nSubjects positive', () => { const r = transitionModel(d, 'y', ['x1','x2'], { idVar: 'id' }); if (r) expect(r.nSubjects).toBeGreaterThan(0); });
});

describe('transitionModel fits a real multiple (lag + covariates) regression', () => {
  it('recovers separate lag and covariate coefficients', () => {
    const d = [];
    let s = 19; const z = () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return (s / 2 ** 32) * 2 - 1; };
    for (let id = 0; id < 12; id++) {
      let prev = z();
      for (let t = 0; t < 8; t++) { const x1 = z(); const y = 0.5 * prev + 2 * x1 + z() * 0.1; d.push({ id, y, x1, t }); prev = y; }
    }
    const r = transitionModel(d, 'y', ['x1'], { idVar: 'id' });
    const xc = r.coefficients.find(c => c.name === 'x1');
    expect(Math.abs(xc.b - 2)).toBeLessThan(0.2);
    expect(Math.abs(r.lagCoefficient - 0.5)).toBeLessThan(0.2);
  });
});

describe('remlEstimate estimates variance components with clusters', () => {
  it('recovers between- and within-cluster variances', () => {
    let s = 23; const z = () => { let u = 0; for (let k = 0; k < 12; k++) { s = (Math.imul(1664525, s) + 1013904223) >>> 0; u += s / 2 ** 32; } return u - 6; };
    const X = [], y = [], cluster = [];
    const su = 2, se = 0.5; // between sd=2, within sd=0.5
    for (let c = 0; c < 25; c++) { const uc = z() * su; for (let t = 0; t < 8; t++) { X.push([1]); y.push(5 + uc + z() * se); cluster.push(c); } }
    const r = remlEstimate(X, y, cluster);
    expect(r.sigma2u).toBeGreaterThan(2);  // ~ su^2 = 4
    expect(r.sigma2).toBeLessThan(0.6);     // ~ se^2 = 0.25
  });
});

describe('hardening — degenerate data', () => {
  it('hlmRandomIntercept null when one row per cluster', () => {
    const rows = GROUP_A.map((y, i) => ({ y, school: `S${i}`, x: i * 0.1 }));
    expect(hlmRandomIntercept(rows, 'y', 'school', ['x'])).toBeNull();
  });
});

describe('hardening — hlmRandomSlope invalid inputs', () => {
  it('throws for null data', () => {
    expect(() => hlmRandomSlope(null, 'y', 'school', 'x')).toThrow();
  });
});

describe('hardening — iccMultilevel invalid inputs', () => {
  it('throws for null data', () => {
    expect(() => iccMultilevel(null, 'y', 'school')).toThrow();
  });
});

describe('hardening — glmmLogistic invalid inputs', () => {
  it('throws for null data', () => {
    expect(() => glmmLogistic(null, 'y', 'school')).toThrow();
  });
});

describe('hardening — glmmPoisson invalid inputs', () => {
  it('throws for null data', () => {
    expect(() => glmmPoisson(null, 'y', 'school')).toThrow();
  });
});

describe('hardening — compareMixedModels invalid inputs', () => {
  it('returns null for null inputs', () => {
    expect(compareMixedModels(null, null)).toBeNull();
  });
});

describe('hardening — crossLevelInteraction invalid inputs', () => {
  it('throws for null data', () => {
    expect(() => crossLevelInteraction(null, 'y', 'school', 'x1', 'x2')).toThrow();
  });
});

describe('hardening — hlmThreeLevel invalid inputs', () => {
  it('returns null for null data', () => {
    expect(hlmThreeLevel(null, 'y', 'x', 'l2', 'l3')).toBeNull();
  });
});

describe('hardening — geeExchangeable invalid inputs', () => {
  it('returns null for null data', () => {
    expect(geeExchangeable(null, 'y', 'cluster', ['x'])).toBeNull();
  });
});

describe('hardening — growthCurve invalid inputs', () => {
  it('returns null for null data', () => {
    expect(growthCurve(null, 'time', 'sub', 'y')).toBeNull();
  });
});

describe('hardening — glmmNegBinom invalid inputs', () => {
  it('returns null for null data', () => {
    expect(glmmNegBinom(null, 'y', 'cluster', ['x1'])).toBeNull();
  });
});

describe('hardening — geeAR1 invalid inputs', () => {
  it('returns null for null data', () => {
    expect(geeAR1(null, 'y', 'cluster', ['x1'])).toBeNull();
  });
});
