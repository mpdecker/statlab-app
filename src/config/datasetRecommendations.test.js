import { describe, test, expect } from 'vitest';
import { TREE } from './tree.js';
import { BUILTIN } from '../data/datasets.js';
import { RECOMMENDED_DATASETS, getRecommendedDatasets } from './datasetRecommendations.js';

const TREE_IDS = new Set(TREE.flatMap(c => c.tests.map(t => t.id)));

describe('datasetRecommendations', () => {
  test('every mapped test id exists in TREE', () => {
    const missing = Object.keys(RECOMMENDED_DATASETS).filter(id => !TREE_IDS.has(id));
    expect(missing, `unknown test ids: ${missing.join(', ')}`).toHaveLength(0);
  });

  test('every referenced dataset key exists in BUILTIN', () => {
    const allKeys = Object.values(RECOMMENDED_DATASETS).flat();
    const missing = allKeys.filter(key => !BUILTIN[key]);
    expect(missing, `unknown dataset keys: ${missing.join(', ')}`).toHaveLength(0);
  });

  test('mcnemar and kappa are deliberately unmapped', () => {
    expect(RECOMMENDED_DATASETS.mcnemar).toBeUndefined();
    expect(RECOMMENDED_DATASETS.kappa).toBeUndefined();
  });

  test('getRecommendedDatasets returns the mapped array for a known test', () => {
    expect(getRecommendedDatasets('efa')).toEqual(['lifesat']);
  });

  test('getRecommendedDatasets returns an empty array for an unmapped test', () => {
    expect(getRecommendedDatasets('pow_anova')).toEqual([]);
  });
});
