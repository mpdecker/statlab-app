// src/tests/categorical.test.js
import { describe, it, expect } from 'vitest';
import {
  chiSquare, chiGoF, fisherExact, mcnemar, binomialTest, onePropZ, twoPropZ,
} from './categorical.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

const cat = ref.categorical;

const mk2x2Data = (a, b, c, d) => [
  ...Array(a).fill({ col1: 'A', col2: 'X' }),
  ...Array(b).fill({ col1: 'A', col2: 'Y' }),
  ...Array(c).fill({ col1: 'B', col2: 'X' }),
  ...Array(d).fill({ col1: 'B', col2: 'Y' }),
];

describe('chiSquare', () => {
  it('returns null for empty data', () =>
    expect(chiSquare([], 'col1', 'col2')).toBeNull());
  it('chi2 matches R chisq.test() for 2×2 table', () => {
    const data = mk2x2Data(10, 20, 30, 40);
    const res = chiSquare(data, 'col1', 'col2');
    expect(res.chi2).toBeCloseTo(cat.chiSquare_2x2.chi2, 1);
    expect(res.p).toBeCloseTo(cat.chiSquare_2x2.p, 2);
  });
  it('Cramér V is between 0 and 1', () => {
    const data = mk2x2Data(10, 5, 3, 20);
    const res = chiSquare(data, 'col1', 'col2');
    expect(res.V).toBeGreaterThanOrEqual(0);
    expect(res.V).toBeLessThanOrEqual(1);
  });
  it('lowExp flag set when expected cell < 5', () => {
    const data = mk2x2Data(1, 1, 1, 1);
    const res = chiSquare(data, 'col1', 'col2');
    expect(res.lowExp).toBe(true);
  });
  it('lowExp is false for large balanced table', () => {
    const data = mk2x2Data(50, 50, 50, 50);
    expect(chiSquare(data, 'col1', 'col2').lowExp).toBe(false);
  });
});

describe('chiGoF', () => {
  it('returns null for mismatched lengths', () =>
    expect(chiGoF([10, 20], [33])).toBeNull());
  it('perfect fit → chi2=0', () =>
    expect(chiGoF([10, 20], [10, 20]).chi2).toBeCloseTo(0, 8));
  it('chi2 > 0 for imperfect fit', () => {
    const res = chiGoF([10, 20, 30], [20, 20, 20]);
    expect(res.chi2).toBeGreaterThan(0);
    expect(res.p).toBeLessThanOrEqual(1);
  });
  it('df = k-1', () => {
    expect(chiGoF([10, 20, 30], [20, 20, 20]).df).toBe(2);
  });
});

describe('fisherExact', () => {
  it('p matches R fisher.test() for [[5,2],[1,8]]', () => {
    const res = fisherExact(5, 2, 1, 8);
    expect(res.p).toBeCloseTo(cat.fisher_2x2.p, 2);
  });
  it('OR matches R fisher.test()', () => {
    const res = fisherExact(5, 2, 1, 8);
    expect(res.OR).toBeCloseTo(cat.fisher_2x2.OR, 0);
  });
  it('returns warning object when n > 500', () => {
    const res = fisherExact(200, 200, 200, 200);
    expect(res.warning).toBeDefined();
    expect(res.p).toBeNull();
  });
  it('OR ≈ 1 for balanced table', () => {
    const res = fisherExact(10, 10, 10, 10);
    expect(res.OR).toBeCloseTo(1, 3);
  });
  it('result has orCI property', () => {
    const res = fisherExact(5, 2, 1, 8);
    expect(Array.isArray(res.orCI)).toBe(true);
  });
});

describe('mcnemar', () => {
  it('returns null when b+c < 10', () =>
    expect(mcnemar(2, 3)).toBeNull());
  it('chi2 matches R mcnemar.test() for b=3, c=7', () => {
    const res = mcnemar(3, 7);
    expect(res.chi2).toBeCloseTo(cat.mcnemar_basic.chi2, 1);
    expect(res.p).toBeCloseTo(cat.mcnemar_basic.p, 1);
  });
  it('chi2 is small (continuity correction gives 1/(b+c)) when b=c', () => {
    const res = mcnemar(10, 10);
    // (|10-10|-1)^2/20 = 1/20 = 0.05 with continuity correction
    expect(res.chi2).toBeCloseTo(0.05, 4);
  });
});

describe('binomialTest', () => {
  it('pHat = k/n', () => {
    const res = binomialTest(3, 10, 0.5);
    expect(res.pHat).toBeCloseTo(0.3, 4);
  });
  it('p is small for extreme k with p0=0.5', () => {
    const res = binomialTest(0, 20, 0.5);
    expect(res.p).toBeLessThan(0.01);
  });
  it('CI[0] < pHat < CI[1]', () => {
    const res = binomialTest(4, 10, 0.5);
    expect(res.ci95[0]).toBeLessThan(res.pHat);
    expect(res.ci95[1]).toBeGreaterThan(res.pHat);
  });
  it('result shape has k, n, p0 fields', () => {
    const res = binomialTest(5, 10, 0.5);
    expect(res.k).toBe(5);
    expect(res.n).toBe(10);
    expect(res.p0).toBe(0.5);
  });
});

describe('onePropZ', () => {
  it('z≈0 when ph=p0', () => {
    const res = onePropZ(50, 100, 0.5);
    expect(res.z).toBeCloseTo(0, 4);
    expect(res.p).toBeCloseTo(1, 1);
  });
  it('large |z| for extreme proportion', () => {
    const res = onePropZ(90, 100, 0.5);
    expect(Math.abs(res.z)).toBeGreaterThan(5);
    expect(res.p).toBeLessThan(0.001);
  });
  it('result has ph and h fields', () => {
    const res = onePropZ(40, 100, 0.5);
    expect(res).toHaveProperty('ph');
    expect(res).toHaveProperty('h');
  });
});

describe('twoPropZ', () => {
  it('z≈0 when p1=p2', () => {
    const res = twoPropZ(50, 100, 50, 100);
    expect(res.z).toBeCloseTo(0, 4);
  });
  it('RR and OR are positive', () => {
    const res = twoPropZ(30, 100, 15, 100);
    expect(res.RR).toBeGreaterThan(0);
    expect(res.OR).toBeGreaterThan(0);
  });
  it('ARR = p1 - p2', () => {
    const res = twoPropZ(30, 100, 15, 100);
    expect(res.ARR).toBeCloseTo(0.15, 4);
  });
});
