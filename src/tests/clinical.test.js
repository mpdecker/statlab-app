import { describe, it, expect } from 'vitest';
import { blandAltman, diagnosticAccuracy, likelihoodRatios, netReclassification, weightedKappa, ac1Agreement, blandAltmanRatio, diagnosticOddsRatio, agreementTable, youdenIndex, deLongTest, partialAUC, optimalThreshold, fleissKappa, krippendorffAlpha, cliffsDelta, rankBiserial, stochasticOrdering, populationAttributableFraction, cornfieldBounds, hosmerLemeshow, calibrationPlot, netBenefit, decisionCurve, brierScore, haybittlePeto, wangTsiatis, inverseNormal, fisherCombination, adaptiveDesign } from './clinical.js';
import { expectKeys } from './__fixtures__/helpers.js';

const a = [10, 10.2, 10.5, 9.8, 10.1, 10.3, 9.9, 10.4, 10.0, 10.6];
const b = [9.8, 10.0, 10.3, 9.6, 10.0, 10.1, 9.7, 10.2, 9.9, 10.4];

describe('blandAltman', () => {
  it('returns null for <3 or mismatched', () => {
    expect(blandAltman(null, b)).toBeNull();
    expect(blandAltman(a.slice(0, 2), b.slice(0, 2))).toBeNull();
  });

  it('bias = 0 for identical', () => {
    const r = blandAltman(a, a);
    expect(r.bias).toBeCloseTo(0, 3);
  });

  it('LOA symmetric around bias', () => {
    const r = blandAltman(a, b);
    expect(r.loa.lower).toBeLessThan(r.bias);
    expect(r.loa.upper).toBeGreaterThan(r.bias);
  });

  it('r in [-1, 1]', () => {
    const r = blandAltman(a, b);
    expect(r.r).toBeGreaterThanOrEqual(-1);
    expect(r.r).toBeLessThanOrEqual(1);
  });

  it('contract keys', () => {
    expectKeys(blandAltman(a, b), ['test', 'bias', 'sdDiff', 'loa', 'ciBias', 'ciLoaLower', 'ciLoaUpper', 'r', 'pPropBias', 'n', 'apa']);
  });

  it('apa is a non-empty string', () => {
    const r = blandAltman(a, b);
    expect(typeof r.apa).toBe('string');
    expect(r.apa.length).toBeGreaterThan(0);
  });
});

describe('diagnosticAccuracy', () => {
  it('returns null for negative counts', () => {
    expect(diagnosticAccuracy(-1, 10, 20, 30)).toBeNull();
    expect(diagnosticAccuracy(0, 0, 0, 0)).toBeNull();
  });

  it('sensitivity and specificity in [0,1]', () => {
    const r = diagnosticAccuracy(50, 20, 80, 10);
    expect(r.sensitivity.value).toBeGreaterThanOrEqual(0);
    expect(r.specificity.value).toBeLessThanOrEqual(1);
  });

  it('perfect test gives sens=spec=1', () => {
    const r = diagnosticAccuracy(50, 0, 100, 0);
    expect(r.sensitivity.value).toBe(1);
    expect(r.specificity.value).toBe(1);
  });

  it('CIs enclose estimate', () => {
    const r = diagnosticAccuracy(50, 20, 80, 10);
    expect(r.sensitivity.ciLo).toBeLessThanOrEqual(r.sensitivity.value);
    expect(r.sensitivity.ciHi).toBeGreaterThanOrEqual(r.sensitivity.value);
  });

  it('contract keys', () => {
    expectKeys(diagnosticAccuracy(50, 20, 80, 10), ['test', 'sensitivity', 'specificity', 'ppv', 'npv', 'accuracy', 'youden', 'f1', 'prevalence', 'n', 'apa']);
  });

  it('apa is a non-empty string', () => {
    const r = diagnosticAccuracy(50, 20, 80, 10);
    expect(typeof r.apa).toBe('string');
    expect(r.apa.length).toBeGreaterThan(0);
  });
});

describe('likelihoodRatios', () => {
  it('returns null for zero counts', () => {
    expect(likelihoodRatios(0, 10, 20, 30)).toBeNull();
    expect(likelihoodRatios(10, 0, 20, 30)).toBeNull();
  });

  it('LR+ > 1 for useful test', () => {
    const r = likelihoodRatios(50, 10, 40, 100);
    expect(r.lrPlus.value).toBeGreaterThan(1);
  });

  it('LR- in [0, 1]', () => {
    const r = likelihoodRatios(50, 10, 40, 100);
    expect(r.lrMinus.value).toBeGreaterThanOrEqual(0);
    expect(r.lrMinus.value).toBeLessThanOrEqual(1);
  });

  it('CIs enclose', () => {
    const r = likelihoodRatios(50, 10, 40, 100);
    expect(r.lrPlus.ciLo).toBeLessThanOrEqual(r.lrPlus.value);
    expect(r.lrPlus.ciHi).toBeGreaterThanOrEqual(r.lrPlus.value);
  });

  it('contract keys', () => {
    expectKeys(likelihoodRatios(50, 10, 40, 100), ['test', 'lrPlus', 'lrMinus', 'n', 'apa']);
  });
});

describe('netReclassification', () => {
  const pOld = [0.05, 0.15, 0.08, 0.30, 0.12, 0.25, 0.04, 0.20, 0.10, 0.35];
  const pNew = [0.08, 0.10, 0.12, 0.25, 0.18, 0.30, 0.06, 0.15, 0.08, 0.40];
  const y = [0, 1, 0, 1, 0, 1, 0, 0, 0, 1];

  it('returns null for invalid', () => {
    expect(netReclassification(null, pNew, y, [0.1, 0.2])).toBeNull();
  });

  it('NRI in [-2, 2]', () => {
    const r = netReclassification(pOld, pNew, y, [0.1, 0.2]);
    expect(r.nri).toBeGreaterThanOrEqual(-2);
    expect(r.nri).toBeLessThanOrEqual(2);
  });

  it('reclass table has correct dimensions', () => {
    const r = netReclassification(pOld, pNew, y, [0.1, 0.2]);
    const k = r.thresholds.length + 1;
    expect(r.reclassTable).toHaveLength(k);
    r.reclassTable.forEach(row => expect(row).toHaveLength(k));
  });

  it('contract keys', () => {
    expectKeys(netReclassification(pOld, pNew, y, [0.1, 0.2]), ['test', 'nriEvents', 'nriNonEvents', 'nri', 'n', 'nEvents', 'nNonEvents', 'reclassTable', 'thresholds', 'apa']);
  });

  it('apa is a non-empty string', () => {
    const r = netReclassification(pOld, pNew, y, [0.1, 0.2]);
    expect(typeof r.apa).toBe('string');
    expect(r.apa.length).toBeGreaterThan(0);
  });
});

describe('weightedKappa', () => {
  const r1 = [1, 2, 3, 1, 2, 3, 1, 1, 2, 3];
  const r2 = [1, 2, 3, 1, 1, 3, 1, 1, 2, 2];
  it('null small', () => expect(weightedKappa(r1.slice(0, 3), r2.slice(0, 3))).toBeNull());
  it('kappa in [-1,1]', () => { const r = weightedKappa(r1, r2); expect(r.kappa).toBeGreaterThanOrEqual(-1); expect(r.kappa).toBeLessThanOrEqual(1); });
  it('contract keys', () => expectKeys(weightedKappa(r1, r2), ['test', 'kappa', 'se', 'ci', 'weights', 'k', 'n', 'apa']));
  it('quadratic differs', () => { const rl = weightedKappa(r1, r2, { weights: 'linear' }); const rq = weightedKappa(r1, r2, { weights: 'quadratic' }); expect(rl.kappa).not.toBe(rq.kappa); });
});

describe('ac1Agreement', () => {
  const r1 = [1, 2, 1, 2, 1, 2, 1, 1, 2, 2];
  const r2 = [1, 2, 1, 1, 1, 2, 1, 1, 2, 2];
  it('null small', () => expect(ac1Agreement(r1.slice(0, 2), r2.slice(0, 2))).toBeNull());
  it('contract keys', () => expectKeys(ac1Agreement(r1, r2), ['test', 'ac1', 'se', 'ci', 'pObserved', 'pChance', 'k', 'n', 'apa']));
});

describe('blandAltmanRatio', () => {
  const a = [2, 3, 4, 5, 6, 7, 8, 9];
  const b = [2.5, 3.5, 4.5, 5.5, 6.5, 7.5, 8.5, 9.5];
  it('null for zero', () => expect(blandAltmanRatio([1, 2, 0, 4, 5, 6, 7, 8], b)).toBeNull());
  it('ratio > 0', () => { const r = blandAltmanRatio(a, b); expect(r.ratio).toBeGreaterThan(0); });
  it('contract keys', () => expectKeys(blandAltmanRatio(a, b), ['test', 'bias', 'ratio', 'loa', 'ci', 'n', 'apa']));
});

describe('diagnosticOddsRatio', () => {
  it('null for zero cells', () => expect(diagnosticOddsRatio(0, 10, 20, 30)).toBeNull());
  it('DOR > 0', () => { const r = diagnosticOddsRatio(50, 10, 40, 100); expect(r.dor).toBeGreaterThan(0); });
  it('contract keys', () => expectKeys(diagnosticOddsRatio(50, 10, 40, 100), ['test', 'dor', 'ci', 'n', 'apa']));
});

describe('agreementTable', () => {
  it('null <2', () => expect(agreementTable([1], [1])).toBeNull());
  it('contract keys', () => expectKeys(agreementTable([1, 2, 1], [1, 2, 2]), ['test', 'table', 'labels', 'k', 'n', 'apa']));
});

describe('youdenIndex', () => {
  it('null for mismatch', () => expect(youdenIndex([0.8, 0.9], [0.7])).toBeNull());
  it('contract keys', () => expectKeys(youdenIndex([0.8, 0.9, 0.6], [0.7, 0.8, 0.9]), ['test', 'youden', 'index', 'sensAtBest', 'specAtBest', 'apa']));
  it('Youden in [-1,1]', () => { const r = youdenIndex([0.8, 0.9], [0.7, 0.8]); expect(r.youden).toBeGreaterThanOrEqual(-1); expect(r.youden).toBeLessThanOrEqual(1); });
});

describe('deLongTest', () => {
  const r1 = { auc: 0.85, se: 0.03, n: 20, scores: [0.1, 0.2, 0.8] };
  const r2 = { auc: 0.78, se: 0.04, n: 20, scores: [0.1, 0.3, 0.7] };
  it('null for invalid', () => expect(deLongTest(null, r2)).toBeNull());
  it('contract keys or null', () => { const r = deLongTest(r1, r2); if (r) expectKeys(r, ['test', 'z', 'p', 'auc1', 'auc2', 'apa']); });
});

describe('partialAUC', () => {
  it('null for mismatch', () => expect(partialAUC([0, 1], [0.2])).toBeNull());
  it('contract keys', () => expectKeys(partialAUC([0, 0, 1, 1, 0, 1], [0.1, 0.3, 0.7, 0.9, 0.2, 0.8], [0, 0.2]), ['test', 'pauc', 'fprRange', 'n', 'apa']));
});

describe('optimalThreshold', () => {
  it('null for mismatch', () => expect(optimalThreshold([0, 1], [0.2])).toBeNull());
  it('contract keys', () => expectKeys(optimalThreshold([0, 0, 1, 1, 0, 1], [0.1, 0.3, 0.7, 0.9, 0.2, 0.8]), ['test', 'threshold', 'sens', 'spec', 'costRatio', 'n', 'apa']));
});

describe('fleissKappa', () => {
  const d = []; for (let i = 0; i < 10; i++) d.push({ r1: i % 3, r2: (i + 1) % 3, r3: i % 3 });
  it('null small', () => expect(fleissKappa(d.slice(0, 3), ['r1', 'r2'], [0, 1, 2])).toBeNull());
  it('contract keys', () => expectKeys(fleissKappa(d, ['r1', 'r2', 'r3'], [0, 1, 2]), ['test', 'kappa', 'n', 'nRaters', 'nItems', 'apa']));
});

describe('krippendorffAlpha', () => {
  const d = []; for (let i = 0; i < 10; i++) d.push({ r1: i % 3, r2: (i + 1) % 3 });
  it('null small', () => expect(krippendorffAlpha(d.slice(0, 3), ['r1', 'r2'], [0, 1, 2])).toBeNull());
  it('contract keys', () => expectKeys(krippendorffAlpha(d, ['r1', 'r2'], [0, 1, 2]), ['test', 'alpha', 'level', 'n', 'nRaters', 'nItems', 'apa']));
});

describe('cliffsDelta', () => {
  it('null small', () => expect(cliffsDelta([1, 2], [3, 4])).toBeNull());
  it('contract keys', () => expectKeys(cliffsDelta([1, 2, 3, 4, 5], [6, 7, 8, 9, 10]), ['test', 'delta', 'se', 'z', 'p', 'label', 'n1', 'n2', 'apa']));
  it('delta in [-1,1]', () => { const r = cliffsDelta([1, 2, 3, 4, 5], [6, 7, 8, 9, 10]); expect(r.delta).toBeGreaterThanOrEqual(-1); expect(r.delta).toBeLessThanOrEqual(1); });
});

describe('rankBiserial', () => {
  const d = []; for (let i = 0; i < 10; i++) d.push({ grp: i < 5 ? 'A' : 'B', score: i + (i < 5 ? 0 : 3) });
  it('null <6', () => expect(rankBiserial(d.slice(0, 4), 'grp', 'score')).toBeNull());
  it('contract keys', () => expectKeys(rankBiserial(d, 'grp', 'score'), ['test', 'rbc', 'pSuperiority', 'n1', 'n2', 'apa']));
});

describe('stochasticOrdering', () => {
  const g = [{ name: 'A', vals: [1, 2, 3] }, { name: 'B', vals: [4, 5, 6] }];
  it('null <2 groups', () => expect(stochasticOrdering([g[0]])).toBeNull());
  it('contract keys', () => expectKeys(stochasticOrdering(g), ['test', 'pairs', 'k', 'apa']));
});

describe('populationAttributableFraction', () => {
  it('null for OR<=0', () => expect(populationAttributableFraction(0.3, -1)).toBeNull());
  it('contract keys', () => expectKeys(populationAttributableFraction(0.3, 2.5), ['test', 'paf', 'se', 'ci', 'prevalence', 'or', 'apa']));
});

describe('cornfieldBounds', () => {
  it('null for zero cells', () => expect(cornfieldBounds(0, 10, 20, 30, 0.3)).toBeNull());
  it('contract keys', () => expectKeys(cornfieldBounds(50, 20, 30, 100, 0.3), ['test', 'observedOR', 'lowerBound', 'confounderPrevalence', 'n', 'apa']));
});

describe('hosmerLemeshow', () => {
  const d = []; for (let i = 0; i < 30; i++) d.push({ y: i % 2, prob: 0.3 + (i % 5) * 0.1 });
  it('contract keys', () => expectKeys(hosmerLemeshow(d, 'y', 'prob'), ['test', 'chi2', 'df', 'p', 'nGroups', 'n', 'apa']));
  it('null <20', () => expect(hosmerLemeshow(d.slice(0, 10), 'y', 'prob')).toBeNull());
});

describe('calibrationPlot', () => {
  const d = []; for (let i = 0; i < 30; i++) d.push({ y: i % 2, prob: 0.3 + (i % 5) * 0.1 });
  it('contract keys', () => expectKeys(calibrationPlot(d, 'y', 'prob'), ['test', 'bins', 'n', 'apa']));
});

describe('netBenefit', () => {
  it('is defined', () => expect(typeof netBenefit).toBe('function'));
  it('null mismatch', () => expect(netBenefit([0.1], [0, 1], [0.5])).toBeNull());
});

describe('decisionCurve', () => {
  it('is defined', () => expect(typeof decisionCurve).toBe('function'));
});

describe('brierScore', () => {
  it('is defined', () => expect(typeof brierScore).toBe('function'));
  it('null mismatch', () => expect(brierScore([0.1], [0, 1])).toBeNull());
});

describe('haybittlePeto', () => { it('contract keys', () => expectKeys(haybittlePeto(4), ['test','boundaries','stages','alpha','apa'])); it('stages correct', () => { const r = haybittlePeto(4); expect(r.boundaries).toHaveLength(4) }) });
describe('wangTsiatis', () => { it('contract keys', () => expectKeys(wangTsiatis(4), ['test','boundaries','stages','alpha','delta','apa'])) });
describe('inverseNormal', () => { it('contract keys', () => expectKeys(inverseNormal(0.5, 1.0, 1.5, 2.0, 50, 50), ['test','z','p','t1','t2','apa'])) });
describe('fisherCombination', () => { it('contract keys', () => expectKeys(fisherCombination([0.01, 0.03]), ['test','chi2','df','p','nStages','apa'])); it('chi2 > 0', () => { const r = fisherCombination([0.01, 0.03]); expect(r.chi2).toBeGreaterThan(0) }) });
describe('adaptiveDesign', () => { it('contract keys', () => expectKeys(adaptiveDesign(50, 50, 0.5), ['test','n1','n2','total','power','method','apa'])) });
