import { describe, test, expect } from 'vitest';
import { mulberry32, boxMullerN, bootstrapIndices, randGamma, randBeta } from './rng.js';

describe('rng', () => {
  test('mulberry32 is reproducible', () => {
    const a = mulberry32(7);
    const b = mulberry32(7);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  test('bootstrapIndices uses rand stream', () => {
    const r = mulberry32(99);
    expect(bootstrapIndices(r, 5)).toEqual(bootstrapIndices(mulberry32(99), 5));
  });

  test('boxMullerN is finite', () => {
    const r = mulberry32(1);
    const z = boxMullerN(r);
    expect(Number.isFinite(z)).toBe(true);
  });
});

describe('randBeta (real Beta sampler)', () => {
  test('sample mean and variance match Beta(a,b)', () => {
    const rand = mulberry32(7);
    const a = 2, b = 8, N = 20000;
    let s = 0, s2 = 0;
    for (let i = 0; i < N; i++) { const x = randBeta(rand, a, b); s += x; s2 += x * x; }
    const mean = s / N, varr = s2 / N - mean * mean;
    expect(mean).toBeCloseTo(a / (a + b), 1);                         // 0.2
    expect(varr).toBeCloseTo((a * b) / ((a + b) ** 2 * (a + b + 1)), 2); // 0.0145
  });
  test('randGamma mean ~ shape', () => {
    const rand = mulberry32(3);
    let s = 0; const N = 20000, k = 4;
    for (let i = 0; i < N; i++) s += randGamma(rand, k);
    expect(s / N).toBeCloseTo(k, 0);
  });
});
