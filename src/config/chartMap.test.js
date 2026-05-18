import { describe, test, expect } from 'vitest';
import { CHART_FOR_TEST } from './chartMap.js';

describe('CHART_FOR_TEST', () => {
  test('maps t_welch to violin', () => {
    expect(CHART_FOR_TEST.t_welch).toBe('violin');
  });

  test('maps pearson to scatterfit', () => {
    expect(CHART_FOR_TEST.pearson).toBe('scatterfit');
  });

  test('maps chisq to mosaic', () => {
    expect(CHART_FOR_TEST.chisq).toBe('mosaic');
  });
});
