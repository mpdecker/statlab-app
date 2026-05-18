import { describe, it, expect } from 'vitest';
import {
  pca, efa, cronbachAlpha, splitHalf, icc, cohensKappa,
  metaAnalysis, differencesInDifferences, convertEffectSize,
  manova, canonicalCorr, linearDiscriminant,
} from './multivariate.js';
import { expectKeys } from './__fixtures__/helpers.js';
import { mkTabular, mkMetaStudies } from './fixtures/core.js';
import { itemMatrix } from './fixtures/phase3.js';

const ROWS = mkTabular();
const VARS = ['item1', 'item2', 'item3', 'item4'];
const SCALE = itemMatrix(50, 6, 3);

describe('multivariate module contracts', () => {
  describe('pca / efa', () => {
    it('pca contract', () => {
      const r = pca(ROWS, VARS);
      expectKeys(r, ['test', 'eigenvalues', 'pctV', 'cumP', 'loadings', 'vars', 'apa']);
      expect(r.cumP.at(-1)).toBeCloseTo(100, 0);
    });
    it('efa communalities', () => {
      const r = efa(ROWS, VARS, 2);
      expect(r.loadings?.every(l => l.communality >= 0)).toBe(true);
    });
  });

  describe('reliability', () => {
    it('cronbach alpha in [0,1]', () => {
      const r = cronbachAlpha(SCALE);
      expect(r.alpha).toBeGreaterThan(0);
      expect(r.alpha).toBeLessThanOrEqual(1);
      expect(r.itc).toHaveLength(SCALE[0].length);
    });
    it('split-half', () => {
      const r = splitHalf(SCALE);
      expect(r.rHalf).toBeDefined();
    });
    it('icc matrix', () => {
      const r = icc(SCALE);
      expect(r.icc21).toBeDefined();
    });
    it('kappa agreement', () => {
      const r = cohensKappa(ROWS.map(r => r.cat1), ROWS.map(r => r.cat2));
      expect(r.kappa).toBeGreaterThanOrEqual(-1);
      expect(r.kappa).toBeLessThanOrEqual(1);
    });
  });

  describe('manova / cca / lda', () => {
    it('manova uses prob not p for omnibus', () => {
      const r = manova(ROWS, ['item1', 'item2'], 'group');
      expect(r.prob).toBeDefined();
      expect(r.ndep).toBe(2);
    });
    it('canonical correlation roots', () => {
      const r = canonicalCorr(ROWS, ['item1', 'item2'], ['x', 'y']);
      expect(r.correlations?.length).toBeGreaterThan(0);
    });
    it('lda accuracy', () => {
      const r = linearDiscriminant(ROWS, 'group', ['x', 'y']);
      expect(r.accuracyTrain).toBeGreaterThan(0);
    });
  });

  describe('meta / did / effectconv', () => {
    it('meta random effects', () => {
      const r = metaAnalysis(mkMetaStudies());
      expectKeys(r, ['test', 'dRE', 'seRE', 'ci', 'I2', 'k', 'studies', 'apa']);
    });
    it('DiD estimator', () => {
      const r = differencesInDifferences([10, 11], [12, 13], [15, 16], [18, 19]);
      expect(r.did).toBeDefined();
    });
    it('effect size converter round-trip d', () => {
      const r = convertEffectSize('d', 0.5);
      expect(r.d).toBeCloseTo(0.5, 3);
      expect(r.r).toBeGreaterThan(0);
    });
  });
});
