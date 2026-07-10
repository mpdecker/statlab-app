import { describe, test, expect } from 'vitest';
import { CHART_FOR_TEST } from './chartMap.js';
import { EXPLORE_PANEL_CHART_FOR_MODE } from '../utils/vizHelpers.js';
import { TREE } from './tree.js';

const TREE_TEST_IDS = TREE.flatMap(c => c.tests.map(t => t.id));

const PHASE3_CHARTS = {
  omega: 'barci',
  parallel: 'scree',
  irt_1pl: 'irtplot',
  irt_2pl: 'irtplot',
  scale_score: 'histogram',
  kmeans: 'histogram',
  hclust: 'histogram',
  lca: 'lca',
  hlm_ri: 'caterpillar',
  hlm_rs: 'spaghetti',
  icc_ml: 'barci',
  psm: 'scatterfit',
  iv2sls: 'scatterfit',
  its: 'its',
  rdd: 'rddplot',
  centrality: 'histogram',
  community: 'barci',
  sociogram: 'sociogram',
};

const CORE_CHARTS = {
  t_welch: 'violin',
  pearson: 'scatterfit',
  chisq: 'mosaic',
  moderation: 'slopes',
  manova: 'scatterfit',
  cancorr: 'heatmap',
  lda: 'scatterfit',
  pow_anova: 'power',
  pow_med: 'power',
  meta: 'forest',
  pca: 'scree',
  bootstrap: 'boot',
};

describe('CHART_FOR_TEST', () => {
  test('every TREE test id has a QuickView chart mode', () => {
    const missing = TREE_TEST_IDS.filter(id => CHART_FOR_TEST[id] == null);
    expect(missing, `missing: ${missing.join(', ')}`).toHaveLength(0);
  });

  test('has exactly 214 mappings', () => {
    expect(Object.keys(CHART_FOR_TEST).length).toBe(214);
  });

  test('all chart mode strings are non-empty', () => {
    Object.values(CHART_FOR_TEST).forEach(mode => {
      expect(typeof mode).toBe('string');
      expect(mode.length).toBeGreaterThan(0);
    });
  });

  test('every chart mode maps to an Explore panel chart id', () => {
    const modes = [...new Set(Object.values(CHART_FOR_TEST))];
    modes.forEach(mode => {
      expect(EXPLORE_PANEL_CHART_FOR_MODE[mode], `missing Explore map for ${mode}`).toBeTruthy();
    });
  });

  Object.entries(CORE_CHARTS).forEach(([id, mode]) => {
    test(`${id} → ${mode}`, () => {
      expect(CHART_FOR_TEST[id]).toBe(mode);
    });
  });

  Object.entries(PHASE3_CHARTS).forEach(([id, mode]) => {
    test(`${id} → ${mode}`, () => {
      expect(CHART_FOR_TEST[id]).toBe(mode);
    });
  });

  test('each category has at least one chart mapping', () => {
    TREE.forEach(cat => {
      cat.tests.forEach(t => {
        expect(CHART_FOR_TEST[t.id], `${cat.cat}/${t.id}`).toBeTruthy();
      });
    });
  });
});
