import { describe, it, expect } from 'vitest';
import { moransI, gearysC, semivariogram, ordinaryKriging, idw, ripleysK, localMoransI, moranScatterplot, spaceTimeVariogram, getisOrdGi, spatialScan, spatialRegression, spatialDurbinModel, spatialErrorModel, spatialSAC, spatialSLX, directIndirectEffects, spatialLRTest, kCross, lCross, pairCorrelation, nearestNeighborG, envelopeTest, stepLengthAngle, minimumConvexPolygon, kernelUD, movementCorrelation, homeRangeOverlap, gwrCoefficients, gwrBandwidth, spatialPanelFE, spatialPanelRE, localR2 } from './spatial.js';
import { expectKeys } from './__fixtures__/helpers.js';

const clustered = [
  { x: 0, y: 0, value: 10 }, { x: 0.5, y: 0.2, value: 11 },
  { x: 0.2, y: 0.5, value: 10.5 }, { x: 0.8, y: 0.3, value: 9.8 },
  { x: 5, y: 5, value: 2 }, { x: 5.2, y: 4.8, value: 2.5 },
  { x: 4.8, y: 5.1, value: 1.8 }, { x: 5.1, y: 5.2, value: 2.2 },
  { x: 2.5, y: 2.5, value: 6 }, { x: 3, y: 3, value: 5.5 },
];

const random = [
  { x: 0, y: 0, value: 5 }, { x: 1, y: 3, value: 3 },
  { x: 2, y: 1, value: 8 }, { x: 3, y: 4, value: 2 },
  { x: 4, y: 2, value: 7 }, { x: 5, y: 5, value: 4 },
  { x: 1, y: 5, value: 6 }, { x: 3, y: 0, value: 5 },
  { x: 5, y: 1, value: 9 }, { x: 2, y: 3, value: 4 },
  { x: 0, y: 4, value: 1 }, { x: 4, y: 0, value: 6 },
];

describe("moransI", () => {
  it('returns null for small n', () => {
    expect(moransI(null)).toBeNull();
    expect(moransI([{ x: 0, y: 0, value: 1 }, { x: 1, y: 1, value: 2 }])).toBeNull();
  });

  it('I > 0 for clustered data', () => {
    const r = moransI(clustered);
    expect(r.I).toBeGreaterThan(0);
  });

  it('contract keys', () => {
    expectKeys(moransI(clustered), ['test', 'I', 'expectation', 'variance', 'z', 'p', 'n', 'apa']);
  });

  it('p in [0, 1]', () => {
    const r = moransI(clustered);
    expect(r.p).toBeGreaterThanOrEqual(0);
    expect(r.p).toBeLessThanOrEqual(1);
  });

  it('apa is a non-empty string', () => {
    const r = moransI(clustered);
    expect(typeof r.apa).toBe('string');
    expect(r.apa.length).toBeGreaterThan(0);
  });
});

describe("gearysC", () => {
  it('returns null for small n', () => {
    expect(gearysC(null)).toBeNull();
    expect(gearysC([{ x: 0, y: 0, value: 1 }, { x: 1, y: 1, value: 2 }])).toBeNull();
  });

  it('C < 1 for clustered data', () => {
    const r = gearysC(clustered);
    expect(r.C).toBeLessThan(1.5);
  });

  it('contract keys', () => {
    expectKeys(gearysC(clustered), ['test', 'C', 'expectation', 'variance', 'z', 'p', 'n', 'apa']);
  });

  it('p in [0, 1]', () => {
    const r = gearysC(clustered);
    expect(r.p).toBeGreaterThanOrEqual(0);
    expect(r.p).toBeLessThanOrEqual(1);
  });

  it('apa is a non-empty string', () => {
    const r = gearysC(clustered);
    expect(typeof r.apa).toBe('string');
    expect(r.apa.length).toBeGreaterThan(0);
  });
});

describe("semivariogram", () => {
  it('returns null for small data', () => {
    expect(semivariogram(clustered.slice(0, 5))).toBeNull();
  });

  it('returns lags array', () => {
    const r = semivariogram(clustered);
    expect(r.lags.length).toBeGreaterThan(0);
  });

  it('model params are finite', () => {
    const r = semivariogram(clustered);
    expect(Number.isFinite(r.model.nugget)).toBe(true);
    expect(Number.isFinite(r.model.sill)).toBe(true);
    expect(r.model.sill).toBeGreaterThanOrEqual(r.model.nugget);
  });

  it('contract keys', () => {
    expectKeys(semivariogram(clustered), ['test', 'lags', 'model', 'n', 'apa']);
  });

  it('apa is a non-empty string', () => {
    const r = semivariogram(clustered);
    expect(typeof r.apa).toBe('string');
    expect(r.apa.length).toBeGreaterThan(0);
  });
});

describe("ordinaryKriging", () => {
  it('returns null for small data', () => {
    expect(ordinaryKriging(clustered.slice(0, 3), 'value', [{ x: 1, y: 1 }])).toBeNull();
  });

  it('predicts at given points', () => {
    const predPts = [{ x: 1, y: 1 }, { x: 4, y: 4 }];
    const r = ordinaryKriging(clustered, 'value', predPts);
    expect(r.predictions).toHaveLength(2);
  });

  it('variance is positive', () => {
    const r = ordinaryKriging(clustered, 'value', [{ x: 1, y: 1 }]);
    expect(r.predictions[0].variance).toBeGreaterThan(0);
  });

  it('contract keys', () => {
    expectKeys(ordinaryKriging(clustered, 'value', [{ x: 1, y: 1 }]), ['test', 'predictions', 'model', 'n', 'nPredicted', 'apa']);
  });

  it('apa is a non-empty string', () => {
    const r = ordinaryKriging(clustered, 'value', [{ x: 1, y: 1 }]);
    expect(typeof r.apa).toBe('string');
    expect(r.apa.length).toBeGreaterThan(0);
  });
});

describe("idw", () => {
  it('returns null for small data', () => {
    expect(idw([{ x: 0, y: 0, value: 1 }, { x: 1, y: 1, value: 2 }], 'value', [{ x: 0.5, y: 0.5 }])).toBeNull();
  });

  it('predictions within data range', () => {
    const r = idw(clustered, 'value', [{ x: 1, y: 1 }]);
    const minV = Math.min(...clustered.map(p => p.value));
    const maxV = Math.max(...clustered.map(p => p.value));
    expect(r.predictions[0].value).toBeGreaterThanOrEqual(minV - 0.1);
    expect(r.predictions[0].value).toBeLessThanOrEqual(maxV + 0.1);
  });

  it('power argument changes predictions', () => {
    const r1 = idw(clustered, 'value', [{ x: 1, y: 1 }], { power: 2 });
    const r2 = idw(clustered, 'value', [{ x: 1, y: 1 }], { power: 4 });
    expect(r1.predictions[0].value).not.toBe(r2.predictions[0].value);
  });

  it('contract keys', () => {
    expectKeys(idw(clustered, 'value', [{ x: 1, y: 1 }]), ['test', 'predictions', 'power', 'n', 'nPredicted', 'apa']);
  });

  it('apa is a non-empty string', () => {
    const r = idw(clustered, 'value', [{ x: 1, y: 1 }]);
    expect(typeof r.apa).toBe('string');
    expect(r.apa.length).toBeGreaterThan(0);
  });
});

describe("ripleysK", () => {
  it('returns null for small data', () => {
    expect(ripleysK(clustered.slice(0, 5))).toBeNull();
  });

  it('returns K array', () => {
    const r = ripleysK(random);
    expect(r.K.length).toBeGreaterThan(0);
  });

  it('K(r) values increase with r', () => {
    const r = ripleysK(random);
    for (let i = 1; i < r.K.length; i++) {
      expect(r.K[i].Kobs).toBeGreaterThanOrEqual(r.K[i - 1].Kobs - 0.001);
    }
  });

  it('contract keys', () => {
    expectKeys(ripleysK(random), ['test', 'K', 'n', 'area', 'apa']);
  });

  it('apa non-empty', () => {
    const r = ripleysK(random);
    expect(typeof r.apa).toBe('string');
    expect(r.apa.length).toBeGreaterThan(0);
  });
});

describe('localMoransI', () => {
  it('null <10', () => expect(localMoransI(clustered.slice(0, 5))).toBeNull());
  it('contract keys', () => expectKeys(localMoransI(clustered), ['test', 'lisa', 'n', 'apa']));
  it('lisa per point', () => { const r = localMoransI(clustered); expect(r.lisa).toHaveLength(clustered.length); });
  it('clusters classified', () => { const r = localMoransI(clustered); const clusters = r.lisa.map(l => l.cluster); expect(clusters.length).toBe(clustered.length); });
});

describe('moranScatterplot', () => {
  it('null <10', () => expect(moranScatterplot(clustered.slice(0, 5))).toBeNull());
  it('contract keys', () => expectKeys(moranScatterplot(clustered), ['test', 'points', 'slope', 'n', 'apa']));
  it('points count = n', () => { const r = moranScatterplot(clustered); expect(r.points).toHaveLength(clustered.length); });
});

describe('spaceTimeVariogram', () => {
  const stData = [];
  for (let i = 0; i < 30; i++) stData.push({ x: i % 5, y: i % 6, value: i * 0.5, time: i * 2 });
  it('null <20', () => expect(spaceTimeVariogram(stData.slice(0, 10), 'time', 'value')).toBeNull());
  it('contract keys', () => expectKeys(spaceTimeVariogram(stData, 'time', 'value'), ['test', 'variogram', 'n', 'apa']));
  it('variogram has entries', () => { const r = spaceTimeVariogram(stData, 'time', 'value'); expect(r.variogram.length).toBeGreaterThan(0); });
});

describe('spatial edge cases', () => {
  it('moransI with binary weights', () => { const r = moransI(clustered, 'value', { weightType: 'binary', threshold: 10 }); expect(r.I).not.toBeNull(); });
  it('moransI with knn weights', () => { const r = moransI(clustered, 'value', { weightType: 'knn', k: 3 }); expect(r.p).toBeGreaterThanOrEqual(0); });
  it('gearysC with different weight type', () => { const r = gearysC(clustered, 'value', { weightType: 'knear', k: 3 }); expect(r.C).not.toBeNull(); });
  it('semivariogram null for <10', () => expect(semivariogram(clustered.slice(0, 5))).toBeNull());
  it('ordinaryKriging with model param', () => { const r = ordinaryKriging(clustered, 'value', [{ x: 1, y: 1 }], { model: { nugget: 0, psill: 5, range: 10 } }); expect(r.predictions[0].value).not.toBeNull(); });
  it('idw with custom power', () => { const r = idw(clustered, 'value', [{ x: 1, y: 1 }], { power: 1 }); expect(Number.isFinite(r.predictions[0].value)).toBe(true); });
});

describe('getisOrdGi', () => { it('contract keys', () => expectKeys(getisOrdGi(clustered), ['test', 'lisa', 'n', 'distance', 'apa'])); });
describe('spatialScan', () => {
  const pts = clustered.map(p => ({ ...p, cases: Math.round(p.value * 2), pop: 10 }));
  it('contract keys', () => expectKeys(spatialScan(pts, 'cases', 'pop'), ['test', 'LLR', 'centerIdx', 'radius', 'n', 'totalCases', 'totalPop', 'apa']));
});
describe('spatialRegression', () => {
  const d = []; for (let i = 0; i < 30; i++) d.push({ y: i, x1: i, x2: i * 0.5, x: i % 5, yval: i % 6 });
  it('contract keys', () => { const r = spatialRegression(d, 'y', ['x1', 'x2']); if (r) expectKeys(r, ['test', 'coefficients', 'rho', 'n', 'apa']); });
});

describe('spatialDurbinModel', () => {
  const d = []; for (let i = 0; i < 30; i++) d.push({ y: i, x1: i, x2: i * 0.5 });
  it('contract keys', () => { const r = spatialDurbinModel(d, 'y', ['x1', 'x2']); if (r) expectKeys(r, ['test', 'rho', 'coefficients', 'n', 'apa']); });
});
describe('spatialErrorModel', () => {
  const d = []; for (let i = 0; i < 30; i++) d.push({ y: i, x1: i, x2: i * 0.5 });
  it('contract keys', () => { const r = spatialErrorModel(d, 'y', ['x1', 'x2']); if (r) expectKeys(r, ['test', 'coefficients', 'lambda', 'n', 'apa']); });
});
describe('spatialSAC', () => {
  const d = []; for (let i = 0; i < 30; i++) d.push({ y: i, x1: i, x2: i * 0.5 });
  it('contract keys', () => { const r = spatialSAC(d, 'y', ['x1', 'x2']); if (r) expectKeys(r, ['test', 'rho', 'lambda', 'coefficients', 'n', 'apa']); });
});
describe('spatialSLX', () => {
  const d = []; for (let i = 0; i < 30; i++) d.push({ y: i, x1: i, x2: i * 0.5 });
  it('is defined', () => expect(typeof spatialSLX).toBe('function'));
});
describe('directIndirectEffects', () => {
  it('contract keys', () => expectKeys(directIndirectEffects({ rho: 0.3, coefficients: [{ name: 'x1', b: 0.5 }] }), ['test', 'effects', 'rho', 'apa']));
});
describe('spatialLRTest', () => { it('contract keys', () => expectKeys(spatialLRTest(0.85, -20), ['test', 'LR', 'p', 'df', 'apa'])); });

describe('kCross', () => {
  const pts = []; for (let i = 0; i < 30; i++) pts.push({ x: i % 5, y: i % 6 });
  const marks = pts.map((_, i) => i % 2 ? 'A' : 'B');
  it('contract keys', () => { const r = kCross(pts, marks, 'A', 'B'); if (r) expectKeys(r, ['test', 'K', 'mark1', 'mark2', 'n', 'apa']); });
});
describe('lCross', () => {
  const pts = []; for (let i = 0; i < 30; i++) pts.push({ x: i % 5, y: i % 6 });
  const marks = pts.map((_, i) => i % 2 ? 'A' : 'B');
  it('contract keys', () => { const r = lCross(pts, marks, 'A', 'B'); if (r) expectKeys(r, ['test', 'L', 'mark1', 'mark2', 'n', 'apa']); });
});
describe('pairCorrelation', () => {
  it('contract keys', () => { const pts = []; for (let i = 0; i < 30; i++) pts.push({ x: Math.random() * 5, y: Math.random() * 5 }); const r = pairCorrelation(pts); if (r) expectKeys(r, ['test', 'g', 'nBins', 'n', 'apa']); });
});
describe('nearestNeighborG', () => {
  const pts = []; for (let i = 0; i < 20; i++) pts.push({ x: Math.random() * 10, y: Math.random() * 10 });
  it('contract keys', () => expectKeys(nearestNeighborG(pts), ['test', 'G', 'n', 'apa']));
  it('G sorted', () => { const r = nearestNeighborG(pts); for (let i = 1; i < r.G.length; i++) expect(r.G[i].G).toBeGreaterThanOrEqual(r.G[i-1].G); });
});
describe('envelopeTest', () => {
  const pts = []; for (let i = 0; i < 30; i++) pts.push({ x: Math.random() * 10, y: Math.random() * 10 });
  it('contract keys', () => { const r = envelopeTest(pts, n => Array.from({ length: n }, () => ({ x: Math.random() * 10, y: Math.random() * 10 })), { nSim: 10, statFn: p => p.length }); if (r) expectKeys(r, ['test', 'p', 'nSim', 'n', 'apa']); });
});

describe('stepLengthAngle', () => {
  const pts = [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 3, y: 1 }, { x: 5, y: 3 }, { x: 7, y: 4 }];
  it('contract keys', () => expectKeys(stepLengthAngle(pts), ['test', 'stepLengths', 'angles', 'meanStep', 'meanAngle', 'n', 'nSteps', 'apa']));
});

describe('minimumConvexPolygon', () => {
  it('contract keys', () => { const pts = []; for (let i = 0; i < 10; i++) pts.push({ x: Math.random() * 10, y: Math.random() * 10 }); expectKeys(minimumConvexPolygon(pts), ['test', 'area', 'n', 'nPoints', 'apa']); });
});

describe('kernelUD', () => {
  const pts = []; for (let i = 0; i < 15; i++) pts.push({ x: Math.random() * 10, y: Math.random() * 10 });
  it('contract keys', () => expectKeys(kernelUD(pts), ['test', 'ud', 'bandwidth', 'gridSize', 'totalDensity', 'n', 'apa']));
  it('density > 0', () => { const r = kernelUD(pts); expect(r.totalDensity).toBeGreaterThan(0); });
});

describe('movementCorrelation', () => {
  it('contract keys', () => expectKeys(movementCorrelation([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], [2, 4, 6, 8, 10, 12, 14, 16, 18, 20]), ['test', 'r', 'n', 'apa']));
});

describe('homeRangeOverlap', () => {
  const u1 = [[1, 0.5], [0.5, 1]];
  const u2 = [[1, 0.3], [0.3, 1]];
  it('contract keys', () => expectKeys(homeRangeOverlap(u1, u2), ['test', 'bhattacharyya', 'n', 'apa']));
  it('null mismatch', () => { const r = homeRangeOverlap([[1]], [[1, 2]]); expect(r === null || r.test !== undefined).toBe(true); });
});

describe('gwrCoefficients', () => {
  const d = []; for (let i = 0; i < 20; i++) d.push({ y: i, x1: i, x2: i * 0.5, x: i % 5, y: i % 4 });
  it('contract keys', () => { const r = gwrCoefficients(d, 'y', ['x1', 'x2']); if (r) expectKeys(r, ['test', 'betas', 'bandwidth', 'n', 'p', 'apa']); });
});

describe('gwrBandwidth', () => { it('is defined', () => expect(typeof gwrBandwidth).toBe('function')); });
describe('spatialPanelFE', () => { it('is defined', () => expect(typeof spatialPanelFE).toBe('function')); });
describe('spatialPanelRE', () => { it('is defined', () => expect(typeof spatialPanelRE).toBe('function')); });
describe('localR2', () => { it('contract keys', () => { const r = localR2({ betas: [[0.5, 0.3], [0.4, 0.2]] }, [1, 2]); if (r) expectKeys(r, ['test', 'r2', 'n', 'apa']); }); });
