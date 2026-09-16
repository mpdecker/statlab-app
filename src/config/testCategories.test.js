import { describe, test, expect } from 'vitest';
import { TREE } from './tree.js';
import { CORE_CATEGORY_NAMES, TEST_CATEGORIES, TOTAL_TEST_COUNT } from './testCategories.js';

describe('testCategories', () => {
  test('CORE_CATEGORY_NAMES contains exactly the 13 headline category names', () => {
    expect(CORE_CATEGORY_NAMES.size).toBe(13);
    expect(CORE_CATEGORY_NAMES.has('COMPARE MEANS')).toBe(true);
    expect(CORE_CATEGORY_NAMES.has('ANALYSIS OF VARIANCE')).toBe(true);
    expect(CORE_CATEGORY_NAMES.has('NONPARAMETRIC')).toBe(true);
    expect(CORE_CATEGORY_NAMES.has('CORRELATION')).toBe(true);
    expect(CORE_CATEGORY_NAMES.has('REGRESSION')).toBe(true);
    expect(CORE_CATEGORY_NAMES.has('CATEGORICAL')).toBe(true);
    expect(CORE_CATEGORY_NAMES.has('EQUIVALENCE & BAYES')).toBe(true);
    expect(CORE_CATEGORY_NAMES.has('MULTIVARIATE')).toBe(true);
    expect(CORE_CATEGORY_NAMES.has('PSYCHOMETRICS')).toBe(true);
    expect(CORE_CATEGORY_NAMES.has('MULTILEVEL MODELS')).toBe(true);
    expect(CORE_CATEGORY_NAMES.has('CLUSTERING')).toBe(true);
    expect(CORE_CATEGORY_NAMES.has('NETWORK')).toBe(true);
    expect(CORE_CATEGORY_NAMES.has('META-ANALYSIS & CAUSAL')).toBe(true);
  });

  test('CORE_CATEGORY_NAMES only contains names that exist in TREE (guards against drift)', () => {
    const treeCatNames = new Set(TREE.map(c => c.cat));
    for (const name of CORE_CATEGORY_NAMES) {
      expect(treeCatNames.has(name)).toBe(true);
    }
  });

  test('a non-headline category is not in CORE_CATEGORY_NAMES', () => {
    expect(CORE_CATEGORY_NAMES.has('PRIVACY')).toBe(false);
    expect(CORE_CATEGORY_NAMES.has('DISTANCE & DEPENDENCE')).toBe(false);
  });

  test('TOTAL_TEST_COUNT and TEST_CATEGORIES are unaffected by this change', () => {
    expect(TOTAL_TEST_COUNT).toBe(TREE.reduce((s, c) => s + c.tests.length, 0));
    expect(TEST_CATEGORIES.length).toBe(14); // 13 headline rows + "DIAGNOSTICS & TOOLS"
  });
});
