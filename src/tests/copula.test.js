import { describe, it, expect } from 'vitest';
import { gaussianCopula, tCopula, claytonCopula, gumbelCopula, frankCopula, copulaFit, tailDependence } from './copula.js';
import { expectKeys } from './__fixtures__/helpers.js';

const d = []; for (let i = 0; i < 30; i++) d.push({ x1: i * 0.5, x2: i * 0.3 + Math.sin(i) * 2, x3: i % 5 });

describe('gaussianCopula', () => {
  it('null <10', () => expect(gaussianCopula(d.slice(0, 5), ['x1', 'x2'])).toBeNull());
  it('contract keys', () => expectKeys(gaussianCopula(d, ['x1', 'x2']), ['test', 'correlation', 'pseudoObs', 'simulated', 'n', 'd', 'apa']));
  it('correlation matrix correct size', () => { const r = gaussianCopula(d, ['x1', 'x2']); expect(r.correlation).toHaveLength(2); expect(r.correlation[0]).toHaveLength(2); });
});

describe('tCopula', () => {
  it('null <10', () => expect(tCopula(d.slice(0, 5), ['x1', 'x2'])).toBeNull());
  it('is defined', () => expect(typeof tCopula).toBe('function'));
});

describe('claytonCopula', () => {
  it('null <10', () => expect(claytonCopula(d.slice(0, 5), ['x1', 'x2'])).toBeNull());
  it('tau in [-1,1]', () => { const r = claytonCopula(d, ['x1', 'x2']); expect(r.tau).toBeGreaterThanOrEqual(-1); expect(r.tau).toBeLessThanOrEqual(1); });
  it('contract keys', () => expectKeys(claytonCopula(d, ['x1', 'x2']), ['test', 'theta', 'fittedTheta', 'tau', 'tailDependence', 'n', 'd', 'apa']));
});

describe('gumbelCopula', () => {
  it('null for theta<1', () => expect(gumbelCopula(d, ['x1', 'x2'], { theta: 0.5 })).toBeNull());
  it('contract keys', () => expectKeys(gumbelCopula(d, ['x1', 'x2']), ['test', 'theta', 'fittedTheta', 'tau', 'tailDependence', 'n', 'd', 'apa']));
});

describe('frankCopula', () => {
  it('contract keys', () => expectKeys(frankCopula(d, ['x1', 'x2']), ['test', 'theta', 'fittedTheta', 'tau', 'n', 'd', 'apa']));
});

describe('copulaFit', () => {
  it('routes to correct family', () => { expect(copulaFit(d, ['x1', 'x2'], { family: 'clayton' }).test).toBe('Clayton Copula'); });
  it('null for unknown family', () => expect(copulaFit(d, ['x1', 'x2'], { family: 'unknown' })).toBeNull());
});

describe('tailDependence', () => {
  it('null for invalid', () => expect(tailDependence(null)).toBeNull());
  it('contract keys', () => expectKeys(tailDependence({ tailDependence: { lower: 0.5, upper: null } }), ['test', 'lower', 'upper', 'apa']));
});
