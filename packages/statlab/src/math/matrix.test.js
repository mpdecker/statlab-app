// src/math/matrix.test.js
import { describe, it, expect } from 'vitest';
import { matMul, matTrans, matInv, jacobiEigen, solveNormalEquations } from './matrix.js';

describe('solveNormalEquations', () => {
  it('solves correlated-predictor OLS exactly (not a diagonal approximation)', () => {
    // y = 1*x1 + 2*x2 with correlated columns x1=[1,2,3,4], x2=[1,1,2,2].
    // XtX=[[30,17],[17,10]], XtY=[64,37]; true beta=[1,2].
    // A diagonal-only solve (XtY[i]/XtX[i][i]) gives [2.133, 3.7] — wrong.
    const beta = solveNormalEquations([[30, 17], [17, 10]], [64, 37]);
    expect(beta[0]).toBeCloseTo(1, 6);
    expect(beta[1]).toBeCloseTo(2, 6);
  });

  it('falls back to the diagonal solve when XtX is singular', () => {
    // Singular XtX (rank 1); helper must not throw and returns a finite vector.
    const beta = solveNormalEquations([[4, 4], [4, 4]], [8, 8]);
    expect(beta.every(Number.isFinite)).toBe(true);
  });
});

describe('matMul', () => {
  it('2x2 identity × identity = identity', () => {
    const I = [[1,0],[0,1]];
    expect(matMul(I, I)).toEqual([[1,0],[0,1]]);
  });
  it('2x2 known result', () => {
    const A = [[1,2],[3,4]], B = [[5,6],[7,8]];
    expect(matMul(A, B)).toEqual([[19, 22], [43, 50]]);
  });
  it('2x3 × 3x2', () => {
    const A = [[1,2,3],[4,5,6]], B = [[7,8],[9,10],[11,12]];
    expect(matMul(A, B)).toEqual([[58,64],[139,154]]);
  });
});

describe('matTrans', () => {
  it('transposes 2x3 to 3x2', () => {
    const A = [[1,2,3],[4,5,6]];
    expect(matTrans(A)).toEqual([[1,4],[2,5],[3,6]]);
  });
  it('double transpose returns original', () => {
    const A = [[1,2],[3,4],[5,6]];
    expect(matTrans(matTrans(A))).toEqual(A);
  });
});

describe('matInv', () => {
  it('2x2 inverse of [[1,2],[3,4]]', () => {
    const A = [[1,2],[3,4]], inv = matInv(A);
    expect(inv[0][0]).toBeCloseTo(-2, 6);
    expect(inv[0][1]).toBeCloseTo(1, 6);
    expect(inv[1][0]).toBeCloseTo(1.5, 6);
    expect(inv[1][1]).toBeCloseTo(-0.5, 6);
  });
  it('A × A⁻¹ = identity', () => {
    const A = [[2,1],[5,3]];
    const prod = matMul(A, matInv(A));
    expect(prod[0][0]).toBeCloseTo(1, 8);
    expect(prod[0][1]).toBeCloseTo(0, 8);
    expect(prod[1][0]).toBeCloseTo(0, 8);
    expect(prod[1][1]).toBeCloseTo(1, 8);
  });
  it('returns null for singular matrix', () => {
    expect(matInv([[1,2],[2,4]])).toBeNull();
  });
  it('3x3 inverse round-trip', () => {
    const A = [[1,2,0],[0,1,3],[2,0,1]];
    const prod = matMul(A, matInv(A));
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++)
        expect(prod[i][j]).toBeCloseTo(i === j ? 1 : 0, 8);
  });
});

describe('jacobiEigen', () => {
  it('identity matrix has eigenvalues [1,1]', () => {
    const { eigenvalues } = jacobiEigen([[1,0],[0,1]]);
    expect(eigenvalues[0]).toBeCloseTo(1, 8);
    expect(eigenvalues[1]).toBeCloseTo(1, 8);
  });
  it('diagonal matrix: eigenvalues sorted desc', () => {
    const { eigenvalues } = jacobiEigen([[3,0],[0,7]]);
    expect(eigenvalues[0]).toBeCloseTo(7, 6);
    expect(eigenvalues[1]).toBeCloseTo(3, 6);
  });
  it('known symmetric matrix [[4,2],[2,3]]: eigenvalues ≈ 5.562, 1.438', () => {
    const { eigenvalues } = jacobiEigen([[4,2],[2,3]]);
    expect(eigenvalues[0]).toBeCloseTo(5.5616, 3);
    expect(eigenvalues[1]).toBeCloseTo(1.4384, 3);
  });
  it('eigenvalues are sorted descending', () => {
    const { eigenvalues } = jacobiEigen([[1,0.5],[0.5,2]]);
    expect(eigenvalues[0]).toBeGreaterThan(eigenvalues[1]);
  });
  it('A*v = λ*v for all eigenpairs', () => {
    const A = [[4,2],[2,3]];
    const { eigenvalues, eigenvectors } = jacobiEigen(A);
    for (let k = 0; k < 2; k++) {
      const v = eigenvectors[k];
      const Av = A.map(r => r.reduce((s, a, j) => s + a * v[j], 0));
      const lv = v.map(x => eigenvalues[k] * x);
      Av.forEach((val, i) => expect(val).toBeCloseTo(lv[i], 5));
    }
  });
});

describe('jacobiEigen handles equal diagonal entries (th=0)', () => {
  it('eigenvalues of [[13,-13],[-13,13]] are 26 and 0', () => {
    const { eigenvalues } = jacobiEigen([[13, -13], [-13, 13]]);
    const sorted = [...eigenvalues].sort((a, b) => b - a);
    expect(sorted[0]).toBeCloseTo(26, 6);
    expect(sorted[1]).toBeCloseTo(0, 6);
  });
});
