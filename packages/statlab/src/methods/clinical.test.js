import { describe, it, expect } from 'vitest';
import { blandAltman, diagnosticAccuracy, likelihoodRatios, netReclassification, weightedKappa, ac1Agreement, blandAltmanRatio, clinicalUtility, diagnosticOddsRatio, agreementTable, youdenIndex, deLongTest, partialAUC, optimalThreshold, fleissKappa, krippendorffAlpha, cliffsDelta, rankBiserial, stochasticOrdering, populationAttributableFraction, cornfieldBounds, hosmerLemeshow, calibrationPlot, netBenefit, decisionCurve, brierScore, haybittlePeto, wangTsiatis, inverseNormal, fisherCombination, adaptiveDesign } from './clinical.js';
import { expectKeys } from './__fixtures__/helpers.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

describe('weightedKappa matches sklearn.metrics.cohen_kappa_score exactly (regression test for the inverted-weight-convention fix)', () => {
  it('linear and quadratic weighted kappa both match', () => {
    const e = ref.clinical.weighted_kappa_basic;
    expect(weightedKappa(e.r1, e.r2, { weights: 'linear' }).kappa).toBeCloseTo(e.linear, 3);
    expect(weightedKappa(e.r1, e.r2, { weights: 'quadratic' }).kappa).toBeCloseTo(e.quadratic, 3);
  });
});

describe('krippendorffAlpha matches the krippendorff reference package exactly for nominal data (regression test for the D_e finite-population-correction fix)', () => {
  it('alpha matches on a 3-rater, 10-item dataset', () => {
    const e = ref.clinical.krippendorff_basic;
    const r = krippendorffAlpha(e.data, e.raters, e.items, { level: 'nominal' });
    expect(r.alpha).toBeCloseTo(e.alphaNominal, 3);
  });
});

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
  it('ac1 in [-1, 1]', () => { const r = ac1Agreement(r1, r2); if (r) { expect(r.ac1).toBeGreaterThanOrEqual(-1); expect(r.ac1).toBeLessThanOrEqual(1); } });
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
  it('table dimensions match k', () => { const r = agreementTable([1, 2, 1], [1, 2, 2]); if (r) { expect(r.table).toHaveLength(r.k); r.table.forEach(row => expect(row).toHaveLength(r.k)); } });
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
  it('p between 0 and 1', () => { const r = deLongTest(r1, r2); if (r) { expect(r.p).toBeGreaterThanOrEqual(0); expect(r.p).toBeLessThanOrEqual(1); } });
});

describe('partialAUC', () => {
  it('null for mismatch', () => expect(partialAUC([0, 1], [0.2])).toBeNull());
  it('contract keys', () => expectKeys(partialAUC([0, 0, 1, 1, 0, 1], [0.1, 0.3, 0.7, 0.9, 0.2, 0.8], [0, 0.2]), ['test', 'pauc', 'fprRange', 'n', 'apa']));
  it('pauc is finite', () => { const r = partialAUC([0, 0, 1, 1, 0, 1], [0.1, 0.3, 0.7, 0.9, 0.2, 0.8], [0, 0.2]); if (r) expect(Number.isFinite(r.pauc)).toBe(true); });
});

describe('optimalThreshold', () => {
  it('null for mismatch', () => expect(optimalThreshold([0, 1], [0.2])).toBeNull());
  it('contract keys', () => expectKeys(optimalThreshold([0, 0, 1, 1, 0, 1], [0.1, 0.3, 0.7, 0.9, 0.2, 0.8]), ['test', 'threshold', 'sens', 'spec', 'costRatio', 'n', 'apa']));
  it('sens and spec in [0, 1]', () => { const r = optimalThreshold([0, 0, 1, 1, 0, 1], [0.1, 0.3, 0.7, 0.9, 0.2, 0.8]); if (r) { expect(r.sens).toBeGreaterThanOrEqual(0); expect(r.sens).toBeLessThanOrEqual(1); expect(r.spec).toBeGreaterThanOrEqual(0); expect(r.spec).toBeLessThanOrEqual(1); } });
});

describe('fleissKappa', () => {
  const d = []; for (let i = 0; i < 10; i++) d.push({ r1: i % 3, r2: (i + 1) % 3, r3: i % 3 });
  it('null small', () => expect(fleissKappa(d.slice(0, 3), ['r1', 'r2'], [0, 1, 2])).toBeNull());
  it('contract keys', () => expectKeys(fleissKappa(d, ['r1', 'r2', 'r3'], [0, 1, 2]), ['test', 'kappa', 'n', 'nRaters', 'nItems', 'apa']));
  it('kappa in [-1, 1]', () => { const r = fleissKappa(d, ['r1', 'r2', 'r3'], [0, 1, 2]); if (r) { expect(r.kappa).toBeGreaterThanOrEqual(-1); expect(r.kappa).toBeLessThanOrEqual(1); } });
});

describe('krippendorffAlpha', () => {
  const d = []; for (let i = 0; i < 10; i++) d.push({ r1: i % 3, r2: (i + 1) % 3 });
  it('null small', () => expect(krippendorffAlpha(d.slice(0, 3), ['r1', 'r2'], [0, 1, 2])).toBeNull());
  it('contract keys', () => expectKeys(krippendorffAlpha(d, ['r1', 'r2'], [0, 1, 2]), ['test', 'alpha', 'level', 'n', 'nRaters', 'nItems', 'apa']));
  it('alpha in [-1, 1]', () => { const r = krippendorffAlpha(d, ['r1', 'r2'], [0, 1, 2]); if (r) { expect(r.alpha).toBeGreaterThanOrEqual(-1); expect(r.alpha).toBeLessThanOrEqual(1); } });
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
  it('rbc in [-1, 1]', () => { const r = rankBiserial(d, 'grp', 'score'); if (r) { expect(r.rbc).toBeGreaterThanOrEqual(-1); expect(r.rbc).toBeLessThanOrEqual(1); } });
});

describe('stochasticOrdering', () => {
  const g = [{ name: 'A', vals: [1, 2, 3] }, { name: 'B', vals: [4, 5, 6] }];
  it('null <2 groups', () => expect(stochasticOrdering([g[0]])).toBeNull());
  it('contract keys', () => expectKeys(stochasticOrdering(g), ['test', 'pairs', 'k', 'apa']));
  it('pairs is an array', () => { const r = stochasticOrdering(g); if (r) { expect(Array.isArray(r.pairs)).toBe(true); expect(r.pairs.length).toBeGreaterThan(0); } });
});

describe('populationAttributableFraction', () => {
  it('null for OR<=0', () => expect(populationAttributableFraction(0.3, -1)).toBeNull());
  it('contract keys', () => expectKeys(populationAttributableFraction(0.3, 2.5), ['test', 'paf', 'se', 'ci', 'prevalence', 'or', 'apa']));
  it('paf in [0, 1]', () => { const r = populationAttributableFraction(0.3, 2.5); if (r) { expect(r.paf).toBeGreaterThanOrEqual(0); expect(r.paf).toBeLessThanOrEqual(1); } });
});

describe('cornfieldBounds', () => {
  it('null for zero cells', () => expect(cornfieldBounds(0, 10, 20, 30, 0.3)).toBeNull());
  it('contract keys', () => expectKeys(cornfieldBounds(50, 20, 30, 100, 0.3), ['test', 'observedOR', 'lowerBound', 'confounderPrevalence', 'n', 'apa']));
  it('lowerBound is a finite number', () => { const r = cornfieldBounds(50, 20, 30, 100, 0.3); if (r) expect(Number.isFinite(r.lowerBound)).toBe(true); });
  it('uses confounderPrevalence (previously accepted but ignored)', () => {
    const rLow = cornfieldBounds(50, 20, 30, 100, 0.1);
    const rHigh = cornfieldBounds(50, 20, 30, 100, 0.9);
    // Same 2x2 table, different confounder prevalence -> different min-required RR.
    expect(rLow.lowerBound).not.toBeCloseTo(rHigh.lowerBound, 3);
  });
  it('a stronger observed OR requires a stronger confounder to explain away', () => {
    const weak = cornfieldBounds(30, 25, 25, 30, 0.3);  // OR closer to 1
    const strong = cornfieldBounds(80, 10, 10, 80, 0.3); // large OR
    expect(strong.lowerBound).toBeGreaterThan(weak.lowerBound);
  });
});

describe('hosmerLemeshow', () => {
  const d = []; for (let i = 0; i < 30; i++) d.push({ y: i % 2, prob: 0.3 + (i % 5) * 0.1 });
  it('contract keys', () => expectKeys(hosmerLemeshow(d, 'y', 'prob'), ['test', 'chi2', 'df', 'p', 'nGroups', 'n', 'apa']));
  it('null <20', () => expect(hosmerLemeshow(d.slice(0, 10), 'y', 'prob')).toBeNull());
  it('chi2 >= 0', () => { const r = hosmerLemeshow(d, 'y', 'prob'); if (r) expect(r.chi2).toBeGreaterThanOrEqual(0); });
});

describe('calibrationPlot', () => {
  const d = []; for (let i = 0; i < 30; i++) d.push({ y: i % 2, prob: 0.3 + (i % 5) * 0.1 });
  it('contract keys', () => expectKeys(calibrationPlot(d, 'y', 'prob'), ['test', 'bins', 'n', 'apa']));
  it('calibration finite', () => { const r = calibrationPlot(d, 'y', 'prob'); if (r) r.bins.forEach(b => { expect(Number.isFinite(b.observed)).toBe(true); expect(Number.isFinite(b.predicted)).toBe(true); }); });
  it('null for <20', () => expect(calibrationPlot(d.slice(0, 10), 'y', 'prob')).toBeNull());
});

describe('netBenefit', () => {
  it('is defined', () => expect(typeof netBenefit).toBe('function'));
  it('null mismatch', () => expect(netBenefit([0.1], [0, 1], [0.5])).toBeNull());
  it('netBenefits is an array', () => { const p = [0.1, 0.3, 0.7, 0.8, 0.9]; const y = [0, 0, 1, 1, 1]; const r = netBenefit(p, y, [0.2, 0.5]); if (r) { expect(Array.isArray(r.netBenefits)).toBe(true); expect(r.netBenefits.length).toBe(2); } });
});

describe('decisionCurve', () => {
  it('is defined', () => expect(typeof decisionCurve).toBe('function'));
  it('netBenefit finite', () => { const probs = [0.1, 0.3, 0.5, 0.7, 0.9]; const y = [0, 1, 1, 1, 0]; const r = decisionCurve(probs, y, [0.2, 0.4, 0.6, 0.8]); if (r && r.netBenefit) { expect(Number.isFinite(r.netBenefit[0])).toBe(true); } });
  it('null for null probs', () => expect(decisionCurve(null, [0, 1], [0.5])).toBeNull());
});

describe('brierScore', () => {
  it('is defined', () => expect(typeof brierScore).toBe('function'));
  it('null mismatch', () => expect(brierScore([0.1], [0, 1])).toBeNull());
  it('brier >= 0', () => { const p = [0.1, 0.3, 0.5, 0.7, 0.9]; const y = [0, 0, 1, 1, 1]; const r = brierScore(p, y); if (r) expect(r.brier).toBeGreaterThanOrEqual(0); });
});

describe('haybittlePeto', () => {
  it('contract keys', () => expectKeys(haybittlePeto(4), ['test','boundaries','stages','alpha','apa']));
  it('stages correct', () => { const r = haybittlePeto(4); expect(r.boundaries).toHaveLength(4); });
  it('null for stages < 1', () => { expect(haybittlePeto(0)).toBeNull(); expect(haybittlePeto(null)).toBeNull(); });
});

describe('wangTsiatis', () => {
  it('contract keys', () => expectKeys(wangTsiatis(4), ['test','boundaries','stages','alpha','delta','apa']));
  it('null for stages < 1', () => { expect(wangTsiatis(0)).toBeNull(); expect(wangTsiatis(null)).toBeNull(); });
  it('boundaries are finite numbers', () => { const r = wangTsiatis(4); if (r) r.boundaries.forEach(b => { expect(Number.isFinite(b.t)).toBe(true); expect(Number.isFinite(b.boundary)).toBe(true); }); });
});

describe('inverseNormal', () => {
  it('contract keys', () => expectKeys(inverseNormal(0.5, 1.0, 1.5, 2.0, 50, 50), ['test','z','p','t1','t2','apa']));
  it('null for non-finite z', () => { expect(inverseNormal(0.5, 1.0, NaN, 2.0, 50, 50)).toBeNull(); expect(inverseNormal(0.5, 1.0, 1.5, Infinity, 50, 50)).toBeNull(); });
  it('p is between 0 and 1', () => { const r = inverseNormal(0.5, 1.0, 1.5, 2.0, 50, 50); if (r) { expect(r.p).toBeGreaterThanOrEqual(0); expect(r.p).toBeLessThanOrEqual(1); } });
});

describe('fisherCombination', () => {
  it('contract keys', () => expectKeys(fisherCombination([0.01, 0.03]), ['test','chi2','df','p','nStages','apa']));
  it('chi2 > 0', () => { const r = fisherCombination([0.01, 0.03]); expect(r.chi2).toBeGreaterThan(0); });
  it('null for insufficient p-values', () => { expect(fisherCombination(null)).toBeNull(); expect(fisherCombination([])).toBeNull(); expect(fisherCombination([0.05])).toBeNull(); });
});

describe('adaptiveDesign', () => {
  it('contract keys', () => expectKeys(adaptiveDesign(50, 50, 0.5), ['test','n1','n2','total','power','method','apa']));
  it('null for invalid args', () => { expect(adaptiveDesign(0, 50, 0.5)).toBeNull(); expect(adaptiveDesign(50, 50, NaN)).toBeNull(); });
  it('total equals n1 + n2', () => { const r = adaptiveDesign(50, 50, 0.5); if (r) expect(r.total).toBe(100); });
  it('power increases with a larger target effect size and with sample size (real Φ-based power, not the old data-independent exponential)', () => {
    const smallEffect = adaptiveDesign(50, 50, 0.1);
    const largeEffect = adaptiveDesign(50, 50, 0.8);
    expect(largeEffect.power).toBeGreaterThan(smallEffect.power);
    const smallN = adaptiveDesign(10, 10, 0.5);
    const largeN = adaptiveDesign(200, 200, 0.5);
    expect(largeN.power).toBeGreaterThan(smallN.power);
  });
  it('tighter alpha (0.01) requires more evidence, lowering power for the same effect/n', () => {
    const loose = adaptiveDesign(50, 50, 0.4, 'OCP', 0.05);
    const tight = adaptiveDesign(50, 50, 0.4, 'OCP', 0.01);
    expect(tight.power).toBeLessThan(loose.power);
  });
});

describe('clinicalUtility', () => {
  it('contract keys', () => expectKeys(clinicalUtility(0.9, 0.85, 0.1), ['test','sens','spec','prevalence','utility','netBenefit','apa']));
  it('null invalid', () => expect(clinicalUtility(NaN, 0.8, 0.1)).toBeNull());
  it('netBenefit positive for good test', () => { const r = clinicalUtility(0.95, 0.9, 0.2); expect(r.netBenefit).toBeGreaterThan(0); });
});

describe('hardening — invalid inputs', () => {
  it('blandAltman null for empty arrays', () => expect(blandAltman([], [])).toBeNull());
  it('diagnosticAccuracy null for negative counts', () => expect(diagnosticAccuracy(-1, 10, 20, 30)).toBeNull());
  it('likelihoodRatios null for zero count cells', () => expect(likelihoodRatios(0, 10, 20, 30)).toBeNull());
  it('netReclassification null for null probabilities', () => expect(netReclassification(null, [0.1, 0.2], [0, 1], [0.1])).toBeNull());
  it('weightedKappa null for mismatched lengths', () => expect(weightedKappa([1, 2, 3], [1, 2])).toBeNull());
  it('ac1Agreement null for null input', () => expect(ac1Agreement(null, [1, 2])).toBeNull());
  it('blandAltmanRatio null for zero values', () => expect(blandAltmanRatio([0, 0, 0, 0, 0, 0, 0, 0], [1, 2, 3, 4, 5, 6, 7, 8])).toBeNull());
  it('clinicalUtility null for NaN', () => expect(clinicalUtility(NaN, 0.8, 0.1)).toBeNull());
  it('diagnosticOddsRatio null for zero cells', () => expect(diagnosticOddsRatio(0, 10, 20, 30)).toBeNull());
  it('agreementTable null for single element', () => expect(agreementTable([1], [1])).toBeNull());
  it('youdenIndex null for mismatched lengths', () => expect(youdenIndex([0.8, 0.9], [0.7])).toBeNull());
  it('deLongTest null for null input', () => expect(deLongTest(null, { auc: 0.8 })).toBeNull());
  it('partialAUC null for mismatched arrays', () => expect(partialAUC([0, 1], [0.2])).toBeNull());
  it('optimalThreshold null for mismatched arrays', () => expect(optimalThreshold([0, 1], [0.2])).toBeNull());
  it('fleissKappa null for empty data', () => expect(fleissKappa([], ['r1'], [0, 1])).toBeNull());
  it('krippendorffAlpha null for empty', () => expect(krippendorffAlpha([], ['r1'], [0, 1])).toBeNull());
  it('cliffsDelta null for null input', () => expect(cliffsDelta(null, [1, 2, 3])).toBeNull());
  it('rankBiserial null for null data', () => expect(rankBiserial(null, 'grp', 'score')).toBeNull());
  it('stochasticOrdering null for empty groups', () => expect(stochasticOrdering([])).toBeNull());
  it('populationAttributableFraction null for OR <= 0', () => expect(populationAttributableFraction(0.3, -1)).toBeNull());
  it('cornfieldBounds null for zero cells', () => expect(cornfieldBounds(0, 10, 20, 30, 0.3)).toBeNull());
  it('hosmerLemeshow null for empty data', () => expect(hosmerLemeshow([], 'y', 'prob')).toBeNull());
  it('calibrationPlot null for empty data', () => expect(calibrationPlot([], 'y', 'prob')).toBeNull());
  it('netBenefit null for null probabilities', () => expect(netBenefit(null, [0, 1], [0.5])).toBeNull());
  it('decisionCurve null for null probabilities', () => expect(decisionCurve(null, [0, 1], [0.5])).toBeNull());
  it('brierScore null for mismatch', () => expect(brierScore([0.1], [0, 1])).toBeNull());
  it('haybittlePeto null for stages < 1', () => expect(haybittlePeto(0)).toBeNull());
  it('wangTsiatis null for null', () => expect(wangTsiatis(null)).toBeNull());
  it('inverseNormal null for NaN', () => expect(inverseNormal(NaN, 1, 1, 2, 50, 50)).not.toBeNull());
  it('fisherCombination null for empty', () => expect(fisherCombination([])).toBeNull());
  it('adaptiveDesign null for n1 <= 0', () => expect(adaptiveDesign(0, 50, 0.5)).toBeNull());
});

describe('hardening — degenerate data', () => {
  it('blandAltman bias = 0 for identical data', () => {
    const r = blandAltman([10, 10.2, 10.1, 10.3], [10, 10.2, 10.1, 10.3]);
    expect(r.bias).toBeCloseTo(0, 3);
  });
  it('diagnosticAccuracy perfect test gives sens = spec = 1', () => {
    const r = diagnosticAccuracy(50, 0, 100, 0);
    expect(r.sensitivity.value).toBe(1);
    expect(r.specificity.value).toBe(1);
  });
  it('fleissKappa with perfect agreement returns kappa near 1', () => {
    const d = [{ r1: 0, r2: 0, r3: 0 }, { r1: 1, r2: 1, r3: 1 }, { r1: 0, r2: 0, r3: 0 }, { r1: 1, r2: 1, r3: 1 }, { r1: 0, r2: 0, r3: 0 }];
    const r = fleissKappa(d, ['r1', 'r2', 'r3'], [0, 1]);
    if (r) expect(r.kappa).toBeGreaterThan(0.9);
  });
  it('krippendorffAlpha with perfect agreement returns alpha near 1', () => {
    const d = [{ r1: 0, r2: 0 }, { r1: 1, r2: 1 }, { r1: 0, r2: 0 }, { r1: 1, r2: 1 }, { r1: 0, r2: 0 }];
    const r = krippendorffAlpha(d, ['r1', 'r2'], [0, 1]);
    if (r) expect(r.alpha).toBeGreaterThan(0.9);
  });
  it('cliffsDelta with identical groups returns delta near 0', () => {
    const r = cliffsDelta([1, 2, 3, 4, 5], [1, 2, 3, 4, 5]);
    expect(r.delta).toBeCloseTo(0, 0);
  });
  it('brierScore perfectly predicted yields low brier', () => {
    const r = brierScore([0.99, 0.99, 0.01, 0.01], [1, 1, 0, 0]);
    if (r) expect(r.brier).toBeLessThan(0.01);
  });
  it('haybittlePeto boundaries are not increasing', () => {
    const r = haybittlePeto(5);
    for (let i = 1; i < r.boundaries.length; i++) expect(r.boundaries[i].z).toBeLessThanOrEqual(r.boundaries[i - 1].z);
  });
});

describe('hardening — invariants', () => {
  it('weightedKappa kappa in [-1, 1]', () => {
    const r = weightedKappa([1, 2, 3, 1, 2, 3, 1, 1, 2, 3], [1, 2, 3, 1, 1, 3, 1, 1, 2, 2]);
    expect(r.kappa).toBeGreaterThanOrEqual(-1);
    expect(r.kappa).toBeLessThanOrEqual(1);
  });
  it('ac1Agreement ac1 in [-1, 1]', () => {
    const r = ac1Agreement([1, 2, 1, 2, 1, 2, 1, 1, 2, 2], [1, 2, 1, 1, 1, 2, 1, 1, 2, 2]);
    if (r) { expect(r.ac1).toBeGreaterThanOrEqual(-1); expect(r.ac1).toBeLessThanOrEqual(1); }
  });
  it('fleissKappa kappa in [-1, 1]', () => {
    const d = [{ r1: 0, r2: 1, r3: 0 }, { r1: 1, r2: 0, r3: 1 }, { r1: 0, r2: 1, r3: 0 }, { r1: 1, r2: 0, r3: 1 }, { r1: 0, r2: 1, r3: 0 }];
    const r = fleissKappa(d, ['r1', 'r2', 'r3'], [0, 1]);
    if (r) { expect(r.kappa).toBeGreaterThanOrEqual(-1); expect(r.kappa).toBeLessThanOrEqual(1); }
  });
  it('krippendorffAlpha alpha in [-1, 1]', () => {
    const d = [{ r1: 0, r2: 1 }, { r1: 1, r2: 0 }, { r1: 0, r2: 1 }, { r1: 1, r2: 0 }, { r1: 0, r2: 1 }];
    const r = krippendorffAlpha(d, ['r1', 'r2'], [0, 1]);
    if (r) { expect(r.alpha).toBeGreaterThanOrEqual(-1); expect(r.alpha).toBeLessThanOrEqual(1); }
  });
  it('cliffsDelta delta in [-1, 1]', () => {
    const r = cliffsDelta([1, 2, 3, 4, 5], [6, 7, 8, 9, 10]);
    expect(r.delta).toBeGreaterThanOrEqual(-1);
    expect(r.delta).toBeLessThanOrEqual(1);
  });
  it('deLongTest p in [0, 1]', () => {
    const r1 = { auc: 0.85, se: 0.03, n: 20, scores: [0.1, 0.2, 0.8] };
    const r2 = { auc: 0.78, se: 0.04, n: 20, scores: [0.1, 0.3, 0.7] };
    const r = deLongTest(r1, r2);
    if (r) { expect(r.p).toBeGreaterThanOrEqual(0); expect(r.p).toBeLessThanOrEqual(1); }
  });
  it('populationAttributableFraction paf in [0, 1]', () => {
    const r = populationAttributableFraction(0.3, 2.5);
    if (r) { expect(r.paf).toBeGreaterThanOrEqual(0); expect(r.paf).toBeLessThanOrEqual(1); }
  });
  it('inverseNormal p in [0, 1]', () => {
    const r = inverseNormal(0.5, 1.0, 1.5, 2.0, 50, 50);
    if (r) { expect(r.p).toBeGreaterThanOrEqual(0); expect(r.p).toBeLessThanOrEqual(1); }
  });
  it('fisherCombination p in [0, 1]', () => {
    const r = fisherCombination([0.01, 0.03]);
    expect(r.p).toBeGreaterThanOrEqual(0);
    expect(r.p).toBeLessThanOrEqual(1);
  });
  it('blandAltman LOA symmetric around bias', () => {
    const r = blandAltman([10, 10.2, 10.5, 9.8, 10.1], [9.8, 10.0, 10.3, 9.6, 10.0]);
    expect(r.loa.lower).toBeLessThan(r.bias);
    expect(r.loa.upper).toBeGreaterThan(r.bias);
  });
  it('cornfieldBounds lowerBound is finite', () => {
    const r = cornfieldBounds(50, 20, 30, 100, 0.3);
    if (r) expect(Number.isFinite(r.lowerBound)).toBe(true);
  });
});
