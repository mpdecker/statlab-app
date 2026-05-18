import { describe, it, expect } from 'vitest';
import { tWelch, tOne, tPaired, yuentTest, zTestKnownSD, signTest } from './means.js';
import { expectKeys, expectPInRange } from './__fixtures__/helpers.js';
import { GROUP_A, GROUP_B, GROUP_C } from './fixtures/core.js';

const WELCH_KEYS = ['test', 't', 'df', 'p', 'd', 'g', 'power', 'reqN', 'apa', 'ma', 'mb', 'na', 'nb'];

describe('means module contracts', () => {
  describe('tWelch', () => {
    it('null guards', () => {
      expect(tWelch([1], GROUP_B)).toBeNull();
      expect(tWelch(GROUP_A, [1])).toBeNull();
      expect(tWelch([5, 5, 5], [5, 5, 5])).toBeNull();
    });
    it('full contract', () => {
      const r = tWelch(GROUP_B, GROUP_C);
      expectKeys(r, WELCH_KEYS);
      expectPInRange(r.p);
      expect(Math.abs(r.d)).toBeGreaterThan(0);
    });
    it('apa contains t and p', () => {
      expect(tWelch(GROUP_B, GROUP_C).apa).toMatch(/t\(/);
    });
  });

  describe('tOne', () => {
    it('contract fields', () => {
      const r = tOne(GROUP_A, 5);
      expectKeys(r, ['test', 't', 'df', 'p', 'd', 'apa', 'm', 'mu0', 'n']);
      expectPInRange(r.p);
    });
    it('null when n<2', () => expect(tOne([3])).toBeNull());
  });

  describe('tPaired', () => {
    it('null on length mismatch', () => expect(tPaired(GROUP_A, [1, 2])).toBeNull());
    it('null when all paired diffs are identical', () => {
      expect(tPaired(GROUP_A, GROUP_B)).toBeNull();
    });
    it('contract', () => {
      const a = [1, 2, 3, 4, 5, 6, 7];
      const b = [2, 3, 5, 4, 6, 8, 9];
      const r = tPaired(a, b);
      expectKeys(r, ['test', 't', 'df', 'p', 'd', 'apa']);
    });
  });

  describe('yuentTest', () => {
    it('returns result for valid groups', () => {
      const r = yuentTest(GROUP_A, GROUP_B);
      expect(r).not.toBeNull();
      expect(r.test).toContain('Yuen');
    });
  });

  describe('zTestKnownSD', () => {
    it('contract', () => {
      const r = zTestKnownSD(6, 5, 2, 10);
      expectKeys(r, ['test', 'z', 'p', 'apa']);
      expectPInRange(r.p);
    });
  });

  describe('signTest', () => {
    it('contract', () => {
      const r = signTest(GROUP_A, 4);
      expectKeys(r, ['test', 'p', 'apa']);
      expectPInRange(r.p);
    });
  });
});
