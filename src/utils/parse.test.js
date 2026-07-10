import { describe, it, expect } from 'vitest';
import { parseFinite, finiteNums, barHeightPct, parseNumList, rowFinite } from './parse.js';

describe('parse utils', () => {
  it('parseFinite keeps 0', () => {
    expect(parseFinite('0', 0.05)).toBe(0);
  });

  it('parseFinite uses fallback for invalid', () => {
    expect(parseFinite('', 0.05)).toBe(0.05);
    expect(parseFinite('abc', 1)).toBe(1);
  });

  it('finiteNums drops Infinity', () => {
    expect(finiteNums([1, Infinity, 2, NaN])).toEqual([1, 2]);
  });

  it('barHeightPct avoids divide-by-zero', () => {
    expect(barHeightPct(0, 0)).toBe('0%');
    expect(barHeightPct(5, 10)).toBe('50%');
  });

  it('parseNumList drops invalid tokens', () => {
    expect(parseNumList('1, bad, 3')).toEqual([1, 3]);
  });

  it('rowFinite rejects Infinity', () => {
    expect(rowFinite({ x: Infinity, y: 1 }, ['x', 'y'])).toBe(false);
    expect(rowFinite({ x: 1, y: 2 }, ['x', 'y'])).toBe(true);
  });
});
