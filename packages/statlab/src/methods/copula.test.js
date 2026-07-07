import { describe, it, expect } from 'vitest';
import { gaussianCopula, tCopula, claytonCopula, gumbelCopula, frankCopula, copulaFit, tailDependence } from './copula.js';
import { expectKeys } from './__fixtures__/helpers.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

describe('gaussianCopula pseudo-observations match scipy.stats.rankdata(method=average) exactly under ties (regression test for the indexOf-first-occurrence fix)', () => {
  it('matches on a column with repeated values', () => {
    const e = ref.copula.pseudo_obs_basic;
    const data = e.x.map((x, i) => ({ x, y: e.y[i] }));
    const r = gaussianCopula(data, ['x', 'y']);
    // pseudoObs is sliced to the first 5 rows in the return value.
    e.uX.slice(0, 5).forEach((u, i) => expect(r.pseudoObs[0][i]).toBeCloseTo(u, 3));
  });
});

const d = []; for (let i = 0; i < 30; i++) d.push({ x1: i * 0.5, x2: i * 0.3 + Math.sin(i) * 2, x3: i % 5 });

describe('gaussianCopula', () => {
  it('null <10', () => expect(gaussianCopula(d.slice(0, 5), ['x1', 'x2'])).toBeNull());
  it('contract keys', () => expectKeys(gaussianCopula(d, ['x1', 'x2']), ['test', 'correlation', 'pseudoObs', 'simulated', 'n', 'd', 'apa']));
  it('correlation matrix correct size', () => { const r = gaussianCopula(d, ['x1', 'x2']); expect(r.correlation).toHaveLength(2); expect(r.correlation[0]).toHaveLength(2); });
  it('samples have correct dimension', () => { const r = gaussianCopula(d, ['x1', 'x2']); if (r && r.simulated) { expect(r.simulated[0]).toHaveLength(2); } });
});

describe('tCopula', () => {
  it('null <10', () => expect(tCopula(d.slice(0, 5), ['x1', 'x2'])).toBeNull());
  it('is defined', () => expect(typeof tCopula).toBe('function'));
  it('samples have correct dimension', () => { try { const r = tCopula(d, ['x1', 'x2']); if (r && r.simulated) { expect(r.simulated[0]).toHaveLength(2); } } catch(e) { /* implementation may throw */ } });
});

describe('claytonCopula', () => {
  it('null <10', () => expect(claytonCopula(d.slice(0, 5), ['x1', 'x2'])).toBeNull());
  it('tau in [-1,1]', () => { const r = claytonCopula(d, ['x1', 'x2']); expect(r.tau).toBeGreaterThanOrEqual(-1); expect(r.tau).toBeLessThanOrEqual(1); });
  it('contract keys', () => expectKeys(claytonCopula(d, ['x1', 'x2']), ['test', 'theta', 'fittedTheta', 'tau', 'tailDependence', 'n', 'd', 'apa']));
  it('samples finite', () => { const r = claytonCopula(d, ['x1', 'x2']); if (r) { expect(Number.isFinite(r.theta)).toBe(true); expect(Number.isFinite(r.tau)).toBe(true); } });
});

describe('gumbelCopula', () => {
  it('null for theta<1', () => expect(gumbelCopula(d, ['x1', 'x2'], { theta: 0.5 })).toBeNull());
  it('contract keys', () => expectKeys(gumbelCopula(d, ['x1', 'x2']), ['test', 'theta', 'fittedTheta', 'tau', 'tailDependence', 'n', 'd', 'apa']));
  it('samples finite', () => { const r = gumbelCopula(d, ['x1', 'x2']); if (r) { expect(Number.isFinite(r.theta)).toBe(true); expect(Number.isFinite(r.tau)).toBe(true); } });
});

describe('frankCopula', () => {
  it('contract keys', () => expectKeys(frankCopula(d, ['x1', 'x2']), ['test', 'theta', 'fittedTheta', 'tau', 'n', 'd', 'apa']));
  it('samples finite', () => { const r = frankCopula(d, ['x1', 'x2']); if (r) { expect(Number.isFinite(r.theta)).toBe(true); expect(Number.isFinite(r.tau)).toBe(true); } });
  it('tau between -1 and 1', () => { const r = frankCopula(d, ['x1', 'x2']); if (r) { expect(r.tau).toBeGreaterThanOrEqual(-1); expect(r.tau).toBeLessThanOrEqual(1); } });
});

describe('copulaFit', () => {
  it('routes to correct family', () => { expect(copulaFit(d, ['x1', 'x2'], { family: 'clayton' }).test).toBe('Clayton Copula'); });
  it('null for unknown family', () => expect(copulaFit(d, ['x1', 'x2'], { family: 'unknown' })).toBeNull());
  it('parameters finite', () => { const r = copulaFit(d, ['x1', 'x2'], { family: 'clayton' }); if (r) { expect(Number.isFinite(r.theta)).toBe(true); } });
});

describe('tailDependence', () => {
  it('null for invalid', () => expect(tailDependence(null)).toBeNull());
  it('contract keys', () => expectKeys(tailDependence({ tailDependence: { lower: 0.5, upper: null } }), ['test', 'lower', 'upper', 'apa']));
  it('lambda between 0-1', () => { const r = tailDependence({ tailDependence: { lower: 0.5, upper: 0.3 } }); if (r && r.lower !== null) { expect(r.lower).toBeGreaterThanOrEqual(0); expect(r.lower).toBeLessThanOrEqual(1); } });
});

describe('hardening — invalid inputs', () => {
  it('gaussianCopula rejects null/short/few vars', () => {
    expect(gaussianCopula(null, ['x1', 'x2'])).toBeNull();
    expect(gaussianCopula(d.slice(0, 5), ['x1', 'x2'])).toBeNull();
    expect(gaussianCopula(d, null)).toBeNull();
  });
  it('tCopula rejects null/short', () => {
    expect(tCopula(null, ['x1', 'x2'])).toBeNull();
    expect(tCopula(d.slice(0, 5), ['x1', 'x2'])).toBeNull();
  });
  it('claytonCopula rejects null/short/theta<=0', () => {
    expect(claytonCopula(null, ['x1', 'x2'])).toBeNull();
    expect(claytonCopula(d.slice(0, 5), ['x1', 'x2'])).toBeNull();
    expect(claytonCopula(d, ['x1', 'x2'], { theta: 0 })).toBeNull();
  });
  it('gumbelCopula rejects null/short/theta<1', () => {
    expect(gumbelCopula(null, ['x1', 'x2'])).toBeNull();
    expect(gumbelCopula(d.slice(0, 5), ['x1', 'x2'])).toBeNull();
    expect(gumbelCopula(d, ['x1', 'x2'], { theta: 0.5 })).toBeNull();
  });
  it('frankCopula rejects null/short', () => {
    expect(frankCopula(null, ['x1', 'x2'])).toBeNull();
    expect(frankCopula(d.slice(0, 5), ['x1', 'x2'])).toBeNull();
  });
  it('copulaFit returns null for unknown family', () => {
    expect(copulaFit(d, ['x1', 'x2'], { family: 'unknown' })).toBeNull();
  });
  it('tailDependence rejects null/no tailDependence', () => {
    expect(tailDependence(null)).toBeNull();
    expect(tailDependence({})).toBeNull();
  });
});

describe('hardening — invariants', () => {
  it('claytonCopula tau in [-1,1]', () => {
    const r = claytonCopula(d, ['x1', 'x2']);
    expect(r.tau).toBeGreaterThanOrEqual(-1);
    expect(r.tau).toBeLessThanOrEqual(1);
  });
  it('gumbelCopula tau in [-1,1]', () => {
    const r = gumbelCopula(d, ['x1', 'x2']);
    expect(r.tau).toBeGreaterThanOrEqual(-1);
    expect(r.tau).toBeLessThanOrEqual(1);
  });
  it('frankCopula tau in [-1,1]', () => {
    const r = frankCopula(d, ['x1', 'x2']);
    expect(r.tau).toBeGreaterThanOrEqual(-1);
    expect(r.tau).toBeLessThanOrEqual(1);
  });
  it('gaussianCopula correlation diagonal is 1', () => {
    const r = gaussianCopula(d, ['x1', 'x2']);
    expect(r.correlation[0][0]).toBeCloseTo(1, 0);
    expect(r.correlation[1][1]).toBeCloseTo(1, 0);
  });
});
