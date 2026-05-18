import { describe, test, expect } from 'vitest';
import { mulberry32, boxMullerN, bootstrapIndices } from './rng.js';

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
