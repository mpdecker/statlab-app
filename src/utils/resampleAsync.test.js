import { describe, it, expect } from 'vitest';
import {
  runBootstrapCI, runBootstrapMediation,
  runPowerANOVA, runPowerChi, runPowerLogistic, runPowerMixed, runPowerMediation,
} from './resampleAsync.js';
import { powerANOVA, powerChi, powerLogistic, powerMixed, powerMediation } from '@statlab/core/math/power';
import { bootstrapCI } from '@statlab/core/math/distributions';
import { avg } from '@statlab/core/math/core';

describe('resampleAsync', () => {
  it('runBootstrapCI is reproducible with seed', async () => {
    const vals = [2, 4, 6, 8, 10, 12, 14];
    const a = await runBootstrapCI(vals, 'mean', 400, 0.05, 99);
    const b = await runBootstrapCI(vals, 'mean', 400, 0.05, 99);
    expect(a.lo).toBeCloseTo(b.lo, 6);
    expect(a.hi).toBeCloseTo(b.hi, 6);
  });

  it('runBootstrapCI matches sync bootstrapCI for small B', async () => {
    const vals = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const asyncRes = await runBootstrapCI(vals, 'mean', 200, 0.05, 7);
    const syncRes = bootstrapCI(vals, avg, 200, 0.05, 7);
    expect(asyncRes.lo).toBeCloseTo(syncRes.lo, 5);
    expect(asyncRes.hi).toBeCloseTo(syncRes.hi, 5);
  });

  it('runBootstrapMediation returns CI shape', async () => {
    const X = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const M = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    const Y = [2, 4, 5, 6, 7, 9, 10, 12, 13, 14, 16, 18];
    const r = await runBootstrapMediation(X, M, Y, 300, 0.05, 42);
    expect(r).not.toBeNull();
    expect(Number.isFinite(r.lo)).toBe(true);
    expect(Number.isFinite(r.hi)).toBe(true);
    expect(r.dist?.length).toBeGreaterThan(20);
  });

  it('runPowerANOVA matches sync with same seed', async () => {
    const asyncPw = await runPowerANOVA(0.25, 3, 20, 0.05, 42);
    const syncPw = powerANOVA(0.25, 3, 20, 0.05, 42);
    expect(asyncPw).toBeCloseTo(syncPw, 5);
  });

  it('runPowerChi matches sync', async () => {
    const asyncPw = await runPowerChi(0.3, 4, 100, 0.05);
    const syncPw = powerChi(0.3, 4, 100, 0.05);
    expect(asyncPw).toBeCloseTo(syncPw, 5);
  });

  it('runPowerLogistic matches sync', async () => {
    const asyncPw = await runPowerLogistic(2, 0.3, 50, 0.05);
    const syncPw = powerLogistic(2, 0.3, 50, 0.05);
    expect(asyncPw).toBeCloseTo(syncPw, 5);
  });

  it('runPowerMixed matches sync', async () => {
    const asyncPw = await runPowerMixed(0.05, 10, 15, 0.5, 0.05);
    const syncPw = powerMixed(0.05, 10, 15, 0.5, 0.05);
    expect(asyncPw).toBeCloseTo(syncPw, 5);
  });

  it('runPowerMediation matches sync with same seed', async () => {
    const asyncMc = await runPowerMediation(0.3, 0.4, 0.1, 0.1, 500, 0.05, 42);
    const syncMc = powerMediation(0.3, 0.4, 0.1, 0.1, 500, 0.05, 42);
    expect(asyncMc.powerMC).toBeCloseTo(syncMc.powerMC, 4);
    expect(asyncMc.powerAsymp).toBeCloseTo(syncMc.powerAsymp, 4);
  });
});
