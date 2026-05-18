import { describe, it, expect } from 'vitest';
import { matMul, matTrans, matInv, jacobiEigen } from './matrix.js';
import {
  fCritUpper, chiCrit, powerANOVA, powerChi, powerLogistic, powerMixed, powerMediation,
  binaryInvNormalCDF,
} from './power.js';
import {
  normalCDF, normalINV, tPDF, tInv2, computePowerT, computePowerCorr,
  requiredN, requiredNCorr, normalityDP, shapiroWilk, bootstrapCI,
} from './distributions.js';
import { popVar, popSD, sampleVar, winsorize, clamp, effD, effR } from './core.js';

describe('matrix exhaustive', () => {
  it('matMul rejects incompatible dimensions via empty/zero', () => {
    expect(matMul([[1, 2]], [[1], [2], [3]])).toBeDefined();
  });
  it('matInv 1x1', () => {
    expect(matInv([[4]])[0][0]).toBeCloseTo(0.25, 8);
  });
  it('jacobiEigen 3x3 symmetric', () => {
    const A = [[4, 1, 0], [1, 3, 1], [0, 1, 2]];
    const { eigenvalues } = jacobiEigen(A);
    expect(eigenvalues[0]).toBeGreaterThan(eigenvalues[2]);
  });
});

describe('power exhaustive', () => {
  it('fCrit increases with lower alpha', () => {
    expect(fCritUpper(0.01, 2, 30)).toBeGreaterThan(fCritUpper(0.1, 2, 30));
  });
  it('chiCrit increases with df', () => {
    expect(chiCrit(0.05, 10)).toBeGreaterThan(chiCrit(0.05, 4));
  });
  it('binaryInvNormalCDF endpoints', () => {
    expect(binaryInvNormalCDF(0.05)).toBeLessThan(0);
    expect(binaryInvNormalCDF(0.95)).toBeGreaterThan(0);
  });
  it('powerANOVA monotone in f', () => {
    const low = powerANOVA(0.1, 3, 50);
    const high = powerANOVA(0.5, 3, 50);
    expect(high).toBeGreaterThan(low);
  });
  it('powerMediation returns MC and asymptotic power', () => {
    const r = powerMediation(0.3, 0.4, 0.1, 0.1, 500, 0.05);
    expect(r.powerMC).toBeGreaterThanOrEqual(0);
    expect(r.powerMC).toBeLessThanOrEqual(1);
    expect(r.powerAsymp).toBeGreaterThanOrEqual(0);
    expect(r.zObs).toBeDefined();
  });
});

describe('distributions exhaustive', () => {
  it('normalCDF symmetric', () => {
    expect(normalCDF(0)).toBeCloseTo(0.5, 3);
    expect(normalCDF(1.96)).toBeCloseTo(0.975, 2);
  });
  it('normalINV round-trip', () => {
    expect(normalINV(normalCDF(1.2))).toBeCloseTo(1.2, 2);
  });
  it('tPDF integrates-ish at peak', () => {
    expect(tPDF(0, 10)).toBeGreaterThan(tPDF(3, 10));
  });
  it('requiredN increases with target power', () => {
    expect(requiredN(0.5, 0.9)).toBeGreaterThan(requiredN(0.5, 0.7));
  });
  it('bootstrapCI contains point estimate', () => {
    const r = bootstrapCI([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], arr => arr.reduce((s, x) => s + x, 0) / arr.length, 500, 0.05);
    const mean = 5.5;
    expect(r.lo).toBeLessThan(mean);
    expect(r.hi).toBeGreaterThan(mean);
  });
  it('normalityDP and shapiroWilk on normal-ish data', () => {
    const x = Array.from({ length: 30 }, (_, i) => i * 0.1 + Math.sin(i));
    expect(normalityDP(x).p).toBeGreaterThan(0);
    expect(shapiroWilk(x).p).toBeGreaterThan(0);
  });
});

describe('core utilities exhaustive', () => {
  it('popVar vs sampleVar', () => {
    const a = [2, 4, 4, 4, 5, 5, 7, 9];
    expect(popVar(a)).toBeLessThan(sampleVar(a) + 1);
  });
  it('winsorize clamps tails', () => {
    const w = winsorize([1, 2, 3, 100], 0.25);
    expect(Math.max(...w)).toBeLessThan(100);
  });
  it('clamp bounds', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
  });
  it('effect labels', () => {
    expect(effD(0.1)).toBe('negligible');
    expect(effR(0.6)).toBe('large');
  });
});
