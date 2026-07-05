import { describe, it, expect } from 'vitest';
import {
  pearsonTest, spearman, kendallTau, partialCorr, pointBiserial,
  simpleOLS, multipleOLS, polynomialOLS, hierarchicalOLS, logisticReg,
  ordinalLogisticRegression, poissonRegression, negativeBinomialRegression,
  mediation, moderation,
} from './regression.js';
import { expectKeys, expectPInRange } from './__fixtures__/helpers.js';
import { mkTabular } from './fixtures/core.js';

const ROWS = mkTabular();
const XS = ROWS.map(r => r.x);
const YS = ROWS.map(r => r.y);
const ZS = ROWS.map(r => r.z);
const MS = ROWS.map(r => r.m);

describe('regression module contracts', () => {
  describe('correlation family', () => {
    it('pearson contract', () => {
      const r = pearsonTest(XS, YS);
      expectKeys(r, ['test', 'r', 't', 'df', 'p', 'ciLo', 'ciHi', 'apa']);
      expectPInRange(r.p);
      expect(Math.abs(r.r)).toBeLessThanOrEqual(1);
    });
    it('spearman contract', () => {
      const r = spearman(XS, YS);
      expectKeys(r, ['test', 'rho', 't', 'p', 'apa']);
    });
    it('kendall contract', () => {
      const r = kendallTau(XS, YS);
      expect(r.tau).toBeDefined();
      expect(r.p).toBeGreaterThanOrEqual(0);
      expect(r.p).toBeLessThanOrEqual(1);
    });
    it('partial correlation', () => {
      const r = partialCorr(XS, MS, YS);
      expect(r).not.toBeNull();
      expect(Number.isFinite(r.rPartial)).toBe(true);
    });
    it('point-biserial', () => {
      const r = pointBiserial(ROWS.map(r => (r.cat1 === 'yes' ? 1 : 0)), YS);
      expect(r.rpb).toBeDefined();
    });
  });

  describe('OLS family', () => {
    it('simpleOLS contract', () => {
      const r = simpleOLS(XS, YS);
      expectKeys(r, ['test', 'b0', 'b1', 'r2', 'adj', 'coeffs', 'apa']);
      expect(r.r2).toBeGreaterThanOrEqual(0);
      expect(r.r2).toBeLessThanOrEqual(1);
    });
    it('multipleOLS with VIF', () => {
      const r = multipleOLS(YS, ROWS.map(r => [r.x, r.z]), ['x', 'z']);
      expect(r.coeffs?.length).toBeGreaterThan(1);
    });
    it('polynomialOLS degree 2', () => {
      const r = polynomialOLS(XS, YS, 2);
      expect(r.test).toContain('Polynomial');
    });
    it('hierarchicalOLS delta R2', () => {
      const r = hierarchicalOLS(YS, ROWS.map(r => [r.x]), ROWS.map(r => [r.z]), ['x'], ['z']);
      expect(r.deltaR2).toBeDefined();
    });
  });

  describe('GLM family', () => {
    it('logistic confusion matrix', () => {
      const Y = ROWS.map(r => (r.y > 14 ? 1 : 0));
      const r = logisticReg(Y, ROWS.map(r => [r.x]), ['x']);
      expect(r.confMatrix).toBeDefined();
      expect(r.acc).toBeGreaterThanOrEqual(0);
      expect(r.acc).toBeLessThanOrEqual(1);
    });
    it('ordinal logistic', () => {
      const yOrd = ROWS.map(r => 1 + Math.min(4, Math.floor(r.y / 4)));
      const r = ordinalLogisticRegression(yOrd, ROWS.map(r => [r.x]), ['x']);
      expect(r).not.toBeNull();
    });
    it('poisson regression', () => {
      const r = poissonRegression(ROWS.map(r => Math.max(0, Math.round(r.y / 2))), ROWS.map(r => [r.x]), ['x']);
      expect(r).not.toBeNull();
    });
    it('negative binomial', () => {
      const r = negativeBinomialRegression(ROWS.map(r => Math.max(0, Math.round(r.y / 2))), ROWS.map(r => [r.x]), ['x']);
      expect(r).not.toBeNull();
    });
  });

  describe('mediation / moderation', () => {
    it('mediation paths', () => {
      const r = mediation(XS, MS, YS);
      expectKeys(r, ['test', 'a_path', 'b_path', 'c_total', 'ab', 'p_sobel', 'apa']);
    });
    it('moderation interaction', () => {
      const r = moderation(XS, ZS, YS);
      expect(r.intCoeff).toBeDefined();
      expect(r.simpleSlopes?.length).toBeGreaterThan(0);
    });
  });
});
