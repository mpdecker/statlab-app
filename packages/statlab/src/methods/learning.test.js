import { describe, it, expect } from 'vitest';
import { elasticNet, elasticNetCV, kFoldCV, huberRegression, tukeyBisquareRegression, lowess, randomForest, gradientBoosting, confusionMatrix, rocAUC, classificationReport, labelPropagation, localOutlierFactor, isolationScore, selfTraining, anomalyThreshold, partialDependence, accumulatedLE, permutationImportance, shapleyApprox, featureInteraction } from './learning.js';
import { expectKeys } from './__fixtures__/helpers.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

describe('rocAUC matches sklearn.metrics.roc_auc_score exactly', () => {
  it('matches on a 12-observation example', () => {
    const e = ref.learning.roc_basic;
    const r = rocAUC(e.actual, e.scores);
    expect(r.auc).toBeCloseTo(e.auc, 4);
  });
});

const y = [5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35, 37, 39, 41, 43];
const x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
const Xmulti = x.map(v => [v, v * 0.5 + 0.1]);
const yMulti = x.map(v => 10 + 2 * v + 1.5 * v * 0.5);

describe('elasticNet', () => {
  it('returns null for small input', () => { expect(elasticNet([1, 2], [1, 2])).toBeNull(); });
  it('ridge (alpha=0) returns coefficients', () => { const r = elasticNet(y, x, { alpha: 0, lambda: 0.1 }); expectKeys(r, ['test','coefficients','lambda','alpha','mse','n','fitted','apa']); expect(r.coefficients.length).toBe(2); });
  it('lasso (alpha=1) returns coefficients', () => { const r = elasticNet(y, x, { alpha: 1, lambda: 0.1 }); expect(r.test).toContain('Lasso'); });
  it('elasticNet handles multiple predictors', () => { expect(elasticNet(yMulti, Xmulti, { alpha: 0.5, lambda: 0.1 }).coefficients.length).toBe(3); });
});

describe('elasticNetCV', () => {
  it('returns null for small input', () => { expect(elasticNetCV([1, 2], [1, 2])).toBeNull(); });
  it('returns bestLambda and model', () => { const r = elasticNetCV(y, x, { alpha: 0.5, k: 3 }); expectKeys(r, ['bestLambda','bestMSE','model','k','alpha','apa']); expect(r.bestLambda).toBeGreaterThanOrEqual(0); });
});

describe('kFoldCV', () => {
  it('returns null for invalid input', () => { expect(kFoldCV([1, 2], [3, 4], () => ({}), () => [0])).toBeNull(); });
  it('returns per-fold MSE', () => { const train = (X, Y) => elasticNet(Y, X, { alpha: 0, lambda: 0 }); const predict = (m, X) => X.map(r => m.coefficients[0][1] + (m.coefficients[1]?.[1] ?? 0) * (typeof r === 'number' ? r : r[0])); const r = kFoldCV(x, y, train, predict, { k: 3 }); expect(r.msePerFold.length).toBe(3); });
});

describe('huberRegression', () => {
  it('returns null for small input', () => { expect(huberRegression([1, 2], [1, 2])).toBeNull(); });
  it('simple regression returns coefficients', () => { const r = huberRegression(y, x); expectKeys(r, ['test','coefficients','c','n','apa']); });
  it('multiple regression works', () => { expect(huberRegression(yMulti, Xmulti).coefficients.length).toBe(3); });
});

describe('tukeyBisquareRegression', () => {
  it('returns coefficients', () => { const r = tukeyBisquareRegression(y, x); expectKeys(r, ['test','coefficients','c','n','apa']); });
  it('multiple regression works', () => { expect(tukeyBisquareRegression(yMulti, Xmulti).coefficients.length).toBe(3); });
});

describe('lowess', () => {
  it('returns null for small input', () => { expect(lowess([1, 2, 3], [1, 2, 3])).toBeNull(); });
  it('returns smoothed values of same length', () => { const r = lowess([1,2,3,4,5,6,7,8,9,10], [2.1,1.9,3.0,3.8,5.1,5.9,7.0,6.9,8.8,9.9]); expect(r.length).toBe(10); });
  it('degree-0 works', () => { const r = lowess([1,2,3,4,5,6,7], [2,3,4,5,6,7,8], { deg: 0, bandwidth: 0.5 }); expect(r.length).toBe(7); });
});

// ── Random Forest ──────────────────────────────────────────────────────────
describe('randomForest', () => {
  const X = Array.from({ length: 30 }, (_, i) => [i, i * 0.5 + Math.sin(i * 0.7)]);
  const Xt = X[0].map((_, i) => X.map(r => r[i]));
  const y = X.map(r => r[0] * 2 + r[1] + 1);

  it('returns null for small data', () => {
    expect(randomForest([[1,2]], [1])).toBeNull();
  });

  it('regression returns predictions', () => {
    const r = randomForest(Xt, y, { nTrees: 20, maxDepth: 3 });
    expect(r.predictions).toHaveLength(y.length);
    expect(Number.isFinite(r.oobError)).toBe(true);
    expect(r.oobError).toBeGreaterThan(0);
  });

  it('classification works', () => {
    const cy = y.map(v => v > 20 ? 1 : 0);
    const r = randomForest(Xt, cy, { type: 'classification', nTrees: 20, maxDepth: 3 });
    expect(r.predictions.length).toBe(cy.length);
    expect(r.type).toBe('classification');
  });

  it('contract keys', () => {
    const r = randomForest(Xt, y, { nTrees: 10, maxDepth: 3 });
    expectKeys(r, ['test', 'predictions', 'nTrees', 'oobError', 'type', 'n', 'apa']);
  });

  it('apa is a non-empty string', () => {
    const r = randomForest(Xt, y, { nTrees: 10, maxDepth: 3 });
    expect(typeof r.apa).toBe('string');
    expect(r.apa.length).toBeGreaterThan(0);
  });
});

// ── Gradient Boosting ──────────────────────────────────────────────────────
describe('gradientBoosting', () => {
  const X = Array.from({ length: 30 }, (_, i) => [i, i * 0.5 + Math.sin(i * 0.7)]);
  const Xt = X[0].map((_, i) => X.map(r => r[i]));
  const y = X.map(r => r[0] * 2 + r[1] + 1);

  it('returns null for small data', () => {
    expect(gradientBoosting([[1,2]], [1])).toBeNull();
  });

  it('regression returns predictions', () => {
    const r = gradientBoosting(Xt, y, { nTrees: 10, maxDepth: 2 });
    expect(r.predictions).toHaveLength(y.length);
    expect(r.type).toBe('regression');
  });

  it('classification returns probabilities and classes', () => {
    const cy = y.map(v => v > 20 ? 1 : 0);
    const r = gradientBoosting(Xt, cy, { type: 'classification', nTrees: 10, maxDepth: 2 });
    expect(r.predictions).toHaveLength(cy.length);
    expect(r.predictedClasses).toHaveLength(cy.length);
  });

  it('contract keys', () => {
    const r = gradientBoosting(Xt, y, { nTrees: 10, maxDepth: 2 });
    expectKeys(r, ['test', 'predictions', 'nTrees', 'learningRate', 'maxDepth', 'type', 'n', 'apa']);
  });

  it('apa is a non-empty string', () => {
    const r = gradientBoosting(Xt, y, { nTrees: 10, maxDepth: 2 });
    expect(typeof r.apa).toBe('string');
    expect(r.apa.length).toBeGreaterThan(0);
  });
});

// ── Confusion Matrix ───────────────────────────────────────────────────────
describe('confusionMatrix', () => {
  it('returns null for mismatch', () => {
    expect(confusionMatrix([0, 1], [0])).toBeNull();
  });

  it('perfect classification gives accuracy=1', () => {
    const r = confusionMatrix([0, 0, 1, 1], [0, 0, 1, 1]);
    expect(r.accuracy).toBe(1);
  });

  it('per-class metrics in [0,1]', () => {
    const r = confusionMatrix([0, 0, 0, 1, 1, 1], [0, 0, 1, 1, 0, 1]);
    r.perClass.forEach(c => {
      expect(c.precision).toBeGreaterThanOrEqual(0);
      expect(c.precision).toBeLessThanOrEqual(1);
      expect(c.recall).toBeGreaterThanOrEqual(0);
      expect(c.recall).toBeLessThanOrEqual(1);
  });
});

describe('labelPropagation', () => {
  it('contract keys', () => { const r = labelPropagation([[1,2],[2,3],[3,4],[4,5],[5,6]], [0, -1, -1, 1, -1]); if (r) expectKeys(r, ['test','labels','n','apa']); });
  it('null <5', () => expect(labelPropagation([[1],[2]],[0,1])).toBeNull());
});

describe('localOutlierFactor', () => {
  const d = []; for (let i = 0; i < 10; i++) d.push({ x: i, y: i * 0.5 });
  it('contract keys', () => expectKeys(localOutlierFactor(d, ['x', 'y']), ['test','lof','k','n','apa']));
  it('null for small k', () => expect(localOutlierFactor(d.slice(0, 5), ['x','y'])).toBeNull());
});

describe('isolationScore', () => {
  const d = []; for (let i = 0; i < 15; i++) d.push({ x: i, y: i * 0.5 });
  it('contract keys', () => expectKeys(isolationScore(d, ['x','y'], {nTrees:50}), ['test','anomalyScores','nTrees','n','apa']));
  it('null <5', () => expect(isolationScore(d.slice(0, 3), ['x'])).toBeNull());
});

describe('selfTraining', () => {
  it('contract keys', () => { const r = selfTraining([[1,2],[2,3],[3,4],[4,5],[5,6]],[0,-1,-1,1,-1]); if (r) expectKeys(r, ['test','labels','n','nIterations','apa']); });
  it('null <5', () => expect(selfTraining([[1],[2]],[0,1])).toBeNull());
});

describe('anomalyThreshold', () => {
  it('contract keys', () => expectKeys(anomalyThreshold([0.1,0.3,0.5,0.7,0.9]), ['test','threshold','pct','n','nAnomalies','apa']));
  it('null empty', () => expect(anomalyThreshold([])).toBeNull());
});

describe('partialDependence', () => { it('contract keys', () => expectKeys(partialDependence(x=>x[0]*2, [{x:1,v:2},{x:3,v:4},{x:5,v:6}], ['x','v'], 'x'), ['test','pd','grid','n','apa'])); it('pdp non-empty', () => { const r = partialDependence(x=>x[0]*2, [{x:1,v:2},{x:3,v:4},{x:5,v:6}], ['x','v'], 'x'); expect(r.pd.length).toBeGreaterThan(0); }); });
describe('accumulatedLE', () => { it('contract keys', () => expectKeys(accumulatedLE(x=>x[0]*2, [{x:1,v:2},{x:3,v:4},{x:5,v:6}], ['x','v'], 'x'), ['test','ale','grid','var','n','apa'])); it('values non-empty', () => { const r = accumulatedLE(x=>x[0]*2, [{x:1,v:2},{x:3,v:4},{x:5,v:6}], ['x','v'], 'x'); expect(r.ale.length).toBeGreaterThan(0); }); });
describe('permutationImportance', () => { it('contract keys', () => expectKeys(permutationImportance(x=>x[0]*2, [[1,2],[3,4],[5,6]],[2,6,10],{nPerm:5}), ['test','importance','nPerm','n','p','apa'])); it('importance non-empty', () => { const r = permutationImportance(x=>x[0]*2, [[1,2],[3,4],[5,6]],[2,6,10],{nPerm:5}); expect(r.importance.length).toBeGreaterThan(0); }); });
describe('shapleyApprox', () => { it('contract keys', () => expectKeys(shapleyApprox(x=>x[0]*2, [[1,2],[3,4]], [0,0], {nSamples:5}), ['test','shap','nSamples','n','p','apa'])); it('values non-empty', () => { const r = shapleyApprox(x=>x[0]*2, [[1,2],[3,4]], [0,0], {nSamples:5}); expect(r.shap.length).toBeGreaterThan(0); }); });
describe('featureInteraction', () => { it('contract keys', () => expectKeys(featureInteraction(x=>x[0]*2+x[1], [[1,2],[3,4],[5,6],[7,8],[9,10]], 0, 1), ['test','interaction','i','j','n','apa'])); it('H finite', () => { const r = featureInteraction(x=>x[0]*2+x[1], [[1,2],[3,4],[5,6],[7,8],[9,10]], 0, 1); expect(Number.isFinite(r.interaction.H)).toBe(true); }); });

  it('contract keys', () => {
    expectKeys(confusionMatrix([0, 1, 0, 1], [0, 1, 1, 0]), ['test', 'matrix', 'perClass', 'accuracy', 'macroAvg', 'microAvg', 'n', 'apa']);
  });

  it('apa is a non-empty string', () => {
    const r = confusionMatrix([0, 1], [0, 1]);
    expect(typeof r.apa).toBe('string');
    expect(r.apa.length).toBeGreaterThan(0);
  });
});

// ── ROC AUC ────────────────────────────────────────────────────────────────
describe('rocAUC', () => {
  it('returns null for short input', () => {
    expect(rocAUC([0, 1, 0], [0.2, 0.3, 0.4])).toBeNull();
    expect(rocAUC([0, 0, 0, 0, 0], [0.1, 0.2, 0.3, 0.4, 0.5])).toBeNull();
  });

  it('AUC > 0.5 for discriminative scores', () => {
    const r = rocAUC([0, 0, 1, 1, 0, 1, 0, 1], [0.1, 0.2, 0.8, 0.9, 0.3, 0.7, 0.4, 0.85]);
    expect(r.auc).toBeGreaterThan(0.5);
  });

  it('AUC in [0,1]', () => {
    const r = rocAUC([0, 0, 1, 1, 0, 1], [0.1, 0.3, 0.7, 0.9, 0.2, 0.8]);
    expect(r.auc).toBeGreaterThanOrEqual(0);
    expect(r.auc).toBeLessThanOrEqual(1);
  });

  it('contract keys', () => {
    expectKeys(rocAUC([0, 1, 0, 1, 0, 1], [0.1, 0.2, 0.5, 0.8, 0.3, 0.9]), ['test', 'auc', 'n', 'apa']);
  });
});

// ── Classification Report ──────────────────────────────────────────────────
describe('classificationReport', () => {
  it('returns null for invalid', () => expect(classificationReport([], [])).toBeNull());
  it('returns per-class metrics', () => { const r = classificationReport([0, 0, 0, 1, 1, 1], [0, 0, 1, 1, 0, 1]); expect(r.perClass.length).toBeGreaterThanOrEqual(2); expect(r.accuracy).toBeGreaterThanOrEqual(0); expect(r.weightedAvg.f1).toBeGreaterThanOrEqual(0); });
  it('contract keys', () => expectKeys(classificationReport([0, 1, 0, 1], [0, 1, 0, 0]), ['test', 'accuracy', 'perClass', 'macroAvg', 'weightedAvg', 'n', 'apa']));
  it('apa is a non-empty string', () => { const r = classificationReport([0, 1], [0, 1]); expect(typeof r.apa).toBe('string'); expect(r.apa.length).toBeGreaterThan(0); });
});

describe('learning edge cases', () => {
  it('randomForest OOB in [0,1] for classification', () => { const X = Array.from({ length: 30 }, (_, i) => [i]); const Xt = X[0].map((_, ri) => X.map(r => r[ri])); const y = X.map((_, i) => i % 3); const r = randomForest(Xt, y, { type: 'classification', nTrees: 10 }); expect(r.oobError).toBeGreaterThanOrEqual(0); expect(r.oobError).toBeLessThanOrEqual(1); });
  it('gradientBoosting null for non-binary classification', () => { const X = Array.from({ length: 10 }, (_, i) => [i]); const Xt = X[0].map((_, ri) => X.map(r => r[ri])); expect(gradientBoosting(Xt, [0, 1, 2, 0, 1, 2, 0, 1, 2, 0], { type: 'classification' })).toBeNull(); });
  it('elasticNet null for negative lambda', () => expect(elasticNet([1, 2, 3], [0, 1, 2], { lambda: -1 })).toBeNull());
  it('huberRegression null for <3 points', () => expect(huberRegression([1, 2], [0, 1])).toBeNull());
  it('lowess null for bandwidth>1', () => expect(lowess([1, 2, 3, 4, 5], [2, 3, 4, 5, 6], { bandwidth: 2 })).toBeNull());
});
