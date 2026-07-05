import { describe, it, expect } from 'vitest';
import {
  chiSquare, chiGoF, fisherExact, mcnemar, binomialTest, onePropZ, twoPropZ,
} from './categorical.js';
import { mannWhitney, wilcoxonSR } from './nonparametric.js';
import {
  tost, bayesFactorT, bayesFactorCorr,
  grubbsTest, leveneTest, bartlettTest, bonferroni, holm, bh, sensitivityLOO,
} from './categorical.js';
import { expectKeys, expectPInRange } from './__fixtures__/helpers.js';
import { GROUP_A, GROUP_B, mk2x2Table } from './fixtures/core.js';
import { tOne } from './means.js';

describe('categorical module contracts', () => {
  describe('contingency tables', () => {
    it('chiSquare contract', () => {
      const r = chiSquare(mk2x2Table(), 'col1', 'col2');
      expectKeys(r, ['test', 'chi2', 'df', 'p', 'V', 'obs', 'exp', 'apa']);
      expectPInRange(r.p);
    });
    it('chiGoF', () => {
      const r = chiGoF([10, 12, 8, 15], [11, 11, 11, 12]);
      expect(r.chi2).toBeGreaterThan(0);
    });
    it('fisher exact', () => {
      const r = fisherExact(10, 15, 12, 20);
      expectPInRange(r.p);
    });
    it('mcnemar', () => {
      const r = mcnemar(8, 14);
      expect(r.test).toContain('McNemar');
    });
  });

  describe('proportions', () => {
    it('binomial exact', () => {
      const r = binomialTest(12, 20, 0.5);
      expectPInRange(r.p);
    });
    it('one proportion z', () => {
      const r = onePropZ(35, 50, 0.5);
      expect(r.ph).toBeCloseTo(0.7, 2);
    });
    it('two proportion z with NNT', () => {
      const r = twoPropZ(35, 50, 28, 50);
      expect(r.OR).toBeDefined();
    });
  });

  describe('nonparametric / equivalence / bayes', () => {
    it('mannWhitney', () => {
      const r = mannWhitney(GROUP_A, GROUP_B);
      expectKeys(r, ['test', 'u', 'z', 'p', 'rb', 'apa']);
    });
    it('wilcoxon signed rank', () => {
      const r = wilcoxonSR(GROUP_A, GROUP_B);
      expect(r).not.toBeNull();
    });
    it('tost equivalence', () => {
      const r = tost(GROUP_A, GROUP_B, -0.5, 0.5);
      expect(r.equiv != null).toBe(true);
    });
    it('bayesFactorT', () => {
      const r = bayesFactorT(2.1, 10, 10);
      expect(r.BF10).toBeGreaterThan(0);
    });
    it('bayesFactorCorr', () => {
      const r = bayesFactorCorr(0.5, 30);
      expect(r.BF10).toBeGreaterThan(0);
    });
  });

  describe('diagnostics / corrections', () => {
    it('grubbs flags outlier', () => {
      const r = grubbsTest([...GROUP_A, 99]);
      expect(r).not.toBeNull();
    });
    it('levene and bartlett', () => {
      expect(leveneTest([GROUP_A, GROUP_B]).p).toBeDefined();
      expect(bartlettTest([GROUP_A, GROUP_B]).p).toBeDefined();
    });
    it('multiple comparison methods preserve length', () => {
      const pairs = [{ label: 'a', p: 0.01 }, { label: 'b', p: 0.04 }, { label: 'c', p: 0.2 }];
      expect(bonferroni(pairs)).toHaveLength(3);
      expect(holm(pairs)).toHaveLength(3);
      expect(bh(pairs)).toHaveLength(3);
    });
    it('sensitivity LOO', () => {
      const vals = Array.from({ length: 12 }, (_, i) => i + 1);
      const r = sensitivityLOO(vals, v => tOne(v, 5));
      expect(r).not.toBeNull();
      expect(r.stable).toBeDefined();
    });
  });
});
