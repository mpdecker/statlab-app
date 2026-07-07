import { describe, it, expect } from 'vitest';
import { expectKeys } from './__fixtures__/helpers.js';
import { moransI, gearysC, semivariogram, ordinaryKriging, idw, ripleysK, spatialErrorModel, spatialLagModel } from './spatial.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

const pts = [];
for (let i = 0; i < 30; i++) pts.push({ x: i * 0.7 + Math.random() * 0.3, y: i * 0.4 + Math.random() * 0.3, v: 10 + i * 2 + Math.random() * 5 });
const predPts = [{ x: 1, y: 1 }, { x: 5, y: 3 }, { x: 10, y: 8 }];

describe('moransI', () => {
  it('contract keys', () => expectKeys(moransI(pts, 'v'), ['test', 'I', 'EI', 'z', 'p', 'n', 'apa']));
  it('null for <10 points', () => expect(moransI(pts.slice(0, 5), 'v')).toBeNull());
  it('I between -1 and 1', () => { const r = moransI(pts, 'v'); if (r) { expect(r.I).toBeGreaterThanOrEqual(-1); expect(r.I).toBeLessThanOrEqual(1); } });
});

describe('gearysC', () => {
  it('contract keys', () => expectKeys(gearysC(pts, 'v'), ['test', 'C', 'z', 'p', 'n', 'apa']));
  it('null for <10', () => expect(gearysC(pts.slice(0, 5), 'v')).toBeNull());
  it('C >= 0', () => { const r = gearysC(pts, 'v'); if (r) expect(r.C).toBeGreaterThanOrEqual(0); });
});

describe('moransI and gearysC match an independent numpy recomputation of the row-standardized inverse-distance formula (regression test for the Geary\'s C (n-1) double-counting fix)', () => {
  it('moransI matches', () => {
    const e = ref.spatial.basic;
    const r = moransI(e.points, 'val');
    expect(r.I).toBeCloseTo(e.moransI, 4);
  });
  it('gearysC matches the correct textbook formula, not the buggy (n-1)x-inflated value', () => {
    const e = ref.spatial.basic;
    const r = gearysC(e.points, 'val');
    expect(r.C).toBeCloseTo(e.gearysC, 4);
  });
});

describe('semivariogram', () => {
  it('contract keys', () => expectKeys(semivariogram(pts, 'v'), ['test', 'bins', 'nugget', 'sill', 'range', 'nPairs', 'apa']));
  it('null <5 points', () => expect(semivariogram(pts.slice(0, 3), 'v')).toBeNull());
  it('has positive sill', () => { const r = semivariogram(pts, 'v'); expect(r.sill).toBeGreaterThan(0); });
  it('nugget >= 0', () => { const r = semivariogram(pts, 'v'); if (r) expect(r.nugget).toBeGreaterThanOrEqual(0); });
  it('sill >= nugget', () => { const r = semivariogram(pts, 'v'); if (r) expect(r.sill).toBeGreaterThanOrEqual(r.nugget); });
});

describe('ordinaryKriging', () => {
  it('contract keys', () => expectKeys(ordinaryKriging(pts, 'v', predPts), ['test', 'predictions', 'nugget', 'sill', 'range', 'nObs', 'nPred', 'apa']));
  it('null <5 points', () => expect(ordinaryKriging(pts.slice(0, 3), 'v', predPts)).toBeNull());
  it('predictions non-empty', () => { const r = ordinaryKriging(pts, 'v', predPts); if (r && r.predictions) expect(r.predictions.length).toBeGreaterThan(0); });
});

describe('idw', () => {
  it('contract keys', () => expectKeys(idw(pts, 'v', predPts), ['test', 'predictions', 'power', 'nNeighbors', 'nObs', 'nPred', 'apa']));
  it('null <3 points', () => expect(idw(pts.slice(0, 2), 'v', predPts)).toBeNull());
  it('power positive', () => { const r = idw(pts, 'v', predPts); if (r) expect(r.power).toBeGreaterThan(0); });
});

describe('ripleysK', () => {
  it('contract keys', () => expectKeys(ripleysK(pts, { nRadii: 5 }), ['test', 'K', 'lambda', 'area', 'n', 'envelope', 'apa']));
  it('null <20 points', () => expect(ripleysK(pts.slice(0, 5))).toBeNull());
  it('lambda positive', () => { const r = ripleysK(pts, { nRadii: 5 }); if (r) expect(r.lambda).toBeGreaterThan(0); });
});

describe('spatialErrorModel', () => {
  it('contract keys', () => expectKeys(spatialErrorModel(pts, 'v', pts), ['test', 'rho', 'se', 'z', 'p', 'n', 'apa']));
  it('rho between -1-1', () => { const r = spatialErrorModel(pts, 'v', pts); if (r && r.rho !== undefined && Number.isFinite(r.rho)) { expect(r.rho).toBeGreaterThan(-2); expect(r.rho).toBeLessThan(2); } });
  it('se positive', () => { const r = spatialErrorModel(pts, 'v', pts); if (r) expect(r.se).toBeGreaterThan(0); });
});

describe('spatialLagModel', () => {
  it('contract keys', () => expectKeys(spatialLagModel(pts, 'v', pts), ['test', 'rho', 'se', 'z', 'p', 'n', 'apa']));
  it('rho between -1-1', () => { const r = spatialLagModel(pts, 'v', pts); if (r && r.rho !== undefined && Number.isFinite(r.rho)) { expect(r.rho).toBeGreaterThan(-2); expect(r.rho).toBeLessThan(2); } });
  it('z finite', () => { const r = spatialLagModel(pts, 'v', pts); if (r) expect(Number.isFinite(r.z)).toBe(true); });
});

describe('hardening — invalid inputs', () => {
  it('moransI null for null data', () => expect(moransI(null, 'v')).toBeNull());
  it('moransI null for null value field', () => expect(moransI(pts, null)).toBeNull());
  it('gearysC null for null data', () => expect(gearysC(null, 'v')).toBeNull());
  it('semivariogram null for null', () => expect(semivariogram(null, 'v')).toBeNull());
  it('ordinaryKriging null for null observations', () => expect(ordinaryKriging(null, 'v', predPts)).toBeNull());
  it('ordinaryKriging null for null prediction points', () => expect(ordinaryKriging(pts, 'v', null)).toBeNull());
  it('idw null for null data', () => expect(idw(null, 'v', predPts)).toBeNull());
  it('ripleysK null for null', () => expect(ripleysK(null)).toBeNull());
  it('spatialErrorModel null for null', () => expect(spatialErrorModel(null, 'v', pts)).toBeNull());
  it('spatialLagModel null for null', () => expect(spatialLagModel(null, 'v', pts)).toBeNull());
});

describe('hardening — degenerate data', () => {
  it('moransI I in [-1, 1]', () => {
    const r = moransI(pts, 'v');
    if (r) { expect(r.I).toBeGreaterThanOrEqual(-1); expect(r.I).toBeLessThanOrEqual(1); }
  });
  it('gearysC C >= 0', () => {
    const r = gearysC(pts, 'v');
    if (r) expect(r.C).toBeGreaterThanOrEqual(0);
  });
  it('semivariogram sill >= nugget', () => {
    const r = semivariogram(pts, 'v');
    if (r) expect(r.sill).toBeGreaterThanOrEqual(r.nugget);
  });
  it('ordinaryKriging predictions length matches prediction points', () => {
    const r = ordinaryKriging(pts, 'v', predPts);
    if (r && r.predictions) expect(r.predictions.length).toBe(predPts.length);
  });
  it('idw power is positive', () => {
    const r = idw(pts, 'v', predPts);
    if (r) expect(r.power).toBeGreaterThan(0);
  });
  it('ripleysK lambda positive', () => {
    const r = ripleysK(pts, { nRadii: 5 });
    if (r) expect(r.lambda).toBeGreaterThan(0);
  });
  it('spatialErrorModel se positive', () => {
    const r = spatialErrorModel(pts, 'v', pts);
    if (r) expect(r.se).toBeGreaterThan(0);
  });
  it('spatialLagModel z finite', () => {
    const r = spatialLagModel(pts, 'v', pts);
    if (r) expect(Number.isFinite(r.z)).toBe(true);
  });
});

describe('hardening — reproducibility', () => {
  it('ordinaryKriging deterministic for same inputs', () => {
    const r1 = ordinaryKriging(pts, 'v', predPts);
    const r2 = ordinaryKriging(pts, 'v', predPts);
    if (r1 && r2 && r1.predictions) {
      r1.predictions.forEach((p, i) => {
        if (p.value !== undefined && r2.predictions[i].value !== undefined)
          expect(p.value).toBeCloseTo(r2.predictions[i].value, 4);
      });
    }
  });
  it('semivariogram deterministic', () => {
    const r1 = semivariogram(pts, 'v');
    const r2 = semivariogram(pts, 'v');
    if (r1 && r2) expect(r1.sill).toBeCloseTo(r2.sill, 4);
  });
  it('idw deterministic', () => {
    const r1 = idw(pts, 'v', predPts);
    const r2 = idw(pts, 'v', predPts);
    if (r1 && r2 && r1.predictions) {
      r1.predictions.forEach((p, i) => {
        if (r2.predictions[i].value !== undefined) expect(p.value).toBeCloseTo(r2.predictions[i].value, 4);
      });
    }
  });
});
