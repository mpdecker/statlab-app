import { describe, it, expect } from 'vitest';
import {
  oneWayANOVA, welchANOVA, twoWayANOVA, ancova, rmANOVA, friedman, kruskalWallis, cochranQ,
} from './anova.js';
import { expectKeys, expectPInRange } from './__fixtures__/helpers.js';
import { mkGroups, mkTabular, mkRmMatrix } from './fixtures/core.js';

const ROWS = mkTabular();
const GROUPS = mkGroups();
const RM = mkRmMatrix(ROWS);

describe('anova module contracts', () => {
  describe('oneWayANOVA', () => {
    it('null for one group', () => expect(oneWayANOVA([GROUPS[0]])).toBeNull());
    it('contract', () => {
      const r = oneWayANOVA(GROUPS);
      expectKeys(r, ['test', 'F', 'dfB', 'dfW', 'p', 'eta2', 'omega2', 'gMeans', 'apa']);
      expectPInRange(r.p);
      expect(r.eta2).toBeGreaterThanOrEqual(0);
      expect(r.eta2).toBeLessThanOrEqual(1);
    });
  });

  describe('welchANOVA', () => {
    it('contract', () => {
      const r = welchANOVA(GROUPS);
      expectKeys(r, ['test', 'F', 'df1', 'df2', 'p', 'apa']);
      expectPInRange(r.p);
    });
  });

  describe('twoWayANOVA', () => {
    it('contract with interaction', () => {
      const r = twoWayANOVA(ROWS, 'cat1', 'cat2', 'y');
      expect(r).not.toBeNull();
      expectKeys(r, ['test', 'FA', 'FB', 'FAB', 'pA', 'pB', 'pAB', 'cellMeans', 'apa']);
    });
  });

  describe('ancova', () => {
    it('returns adjusted means', () => {
      const cov = GROUPS.map(g => ROWS.filter(r => r.group === g.name).map(r => r.x));
      const r = ancova(GROUPS, cov);
      expect(r.adjMeans?.length).toBe(GROUPS.length);
    });
  });

  describe('rmANOVA', () => {
    it('contract', () => {
      const r = rmANOVA(RM);
      expectKeys(r, ['test', 'F', 'dfBetween', 'dfError', 'p', 'ggEps', 'colMeans', 'apa']);
    });
  });

  describe('kruskalWallis', () => {
    it('nonparametric contract', () => {
      const r = kruskalWallis(GROUPS);
      expectKeys(r, ['test', 'H', 'df', 'p', 'eta2', 'apa']);
    });
  });

  describe('friedman', () => {
    it('contract', () => {
      const r = friedman(RM);
      expect(r).not.toBeNull();
      expect(r.test).toContain('Friedman');
    });
  });

  describe('cochranQ', () => {
    it('binary RM matrix', () => {
      const bin = RM.map(row => row.map(v => (v > 42 ? 1 : 0)));
      const r = cochranQ(bin);
      expect(r).not.toBeNull();
      expect(r.test).toContain('Cochran');
    });
  });
});
