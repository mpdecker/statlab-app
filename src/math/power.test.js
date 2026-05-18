// src/math/power.test.js
import { describe, it, expect } from 'vitest';
import {
  fCritUpper,
  chiCrit,
  powerANOVA,
  powerChi,
  powerLogistic,
  powerMixed,
  powerMediation,
  binaryInvNormalCDF,
} from './power.js';

describe('fCritUpper / chiCrit', () => {
  it('fCritUpper returns positive critical value', () => {
    const fc = fCritUpper(0.05, 3, 20);
    expect(fc).toBeGreaterThan(0);
    expect(fc).toBeLessThan(100);
  });
  it('chiCrit yields finite df', () => {
    expect(chiCrit(0.05, 4)).toBeGreaterThan(0);
    expect(chiCrit(0.05, 4)).toBeLessThan(200);
  });
});

describe('binaryInvNormalCDF', () => {
  it('invert near median', () => {
    expect(binaryInvNormalCDF(0.5)).toBeCloseTo(0, 1);
  });
});

describe('powerChi', () => {
  it('reports power in unit interval', () => {
    const p = powerChi(0.3, 5, 100, 0.05);
    expect(p).not.toBe(null);
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(1);
  });
});

describe('powerLogistic', () => {
  it('returns positive power under typical settings', () => {
    const p = powerLogistic(2.0, 0.35, 60, 0.05);
    expect(p).toBeTruthy();
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(1);
  });
});

describe('powerMixed', () => {
  it('responds to clustered design parameters', () => {
    const p = powerMixed(0.06, 8, 14, 0.45, 0.05);
    expect(p).toBeTruthy();
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(1);
  });
});

describe('powerANOVA', () => {
  it('computes reproducible-ish Monte Carlo fraction', () => {
    const p = powerANOVA(0.4, 3, 65, 0.05);
    expect(p).toBeTruthy();
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(1);
  });

  it('same seed yields identical power', () => {
    const a = powerANOVA(0.25, 3, 30, 0.05, 99);
    const b = powerANOVA(0.25, 3, 30, 0.05, 99);
    expect(a).toBe(b);
  });
});

describe('powerMediation', () => {
  it('combines asymptotic Sobel MC', () => {
    const mc = powerMediation(0.35, 0.42, 0.095, 0.09, 500, 0.05);
    expect(mc).not.toBe(null);
    expect(mc.powerMC).toBeGreaterThanOrEqual(0);
    expect(mc.powerMC).toBeLessThanOrEqual(1);
    expect(mc.powerAsymp).toBeGreaterThanOrEqual(0);
  });

  it('uses seed for reproducible MC power', () => {
    const a = powerMediation(0.3, 0.4, 0.1, 0.1, 400, 0.05, 7);
    const b = powerMediation(0.3, 0.4, 0.1, 0.1, 400, 0.05, 7);
    expect(a.powerMC).toBe(b.powerMC);
  });
});
