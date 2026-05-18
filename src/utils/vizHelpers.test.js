import { describe, test, expect } from 'vitest';
import {
  fitOLS, getChartInsight, resolveQuickViewVars, barGroupsFromResult,
  loadingFromResult, formatInferenceSummary, exploreChartLabel, CHART_MODE_LABELS,
  explorePanelChartFromMode, normalizeExplorePanelChart, resolveExplorePanelChart,
  EXPLORE_PANEL_DEFAULT_CHART, EXPLORE_PANEL_CHART_FOR_MODE,
} from './vizHelpers.js';

describe('vizHelpers', () => {
  test('exploreChartLabel uses CHART_MODE_LABELS with fallback', () => {
    expect(exploreChartLabel('scatter')).toBe(CHART_MODE_LABELS.scatter);
    expect(exploreChartLabel('boot')).toBe('Bootstrap');
    expect(exploreChartLabel('unknown_mode')).toBe('Scatter + fit');
  });

  test('explorePanelChartFromMode maps Quick View modes to Explore ids', () => {
    expect(explorePanelChartFromMode('scatterfit')).toBe('Scatter+fit');
    expect(explorePanelChartFromMode('heatmap')).toBe('Correlogram');
    expect(explorePanelChartFromMode('parallel')).toBe(EXPLORE_PANEL_DEFAULT_CHART);
    expect(explorePanelChartFromMode('slopes')).toBe('Simp. slopes');
  });

  test('normalizeExplorePanelChart maps display labels', () => {
    expect(normalizeExplorePanelChart('Scatter + fit')).toBe('Scatter+fit');
    expect(normalizeExplorePanelChart('Bar + CI')).toBe('Bar+CI');
  });

  test('resolveExplorePanelChart prefers chartType over chartLabel', () => {
    expect(resolveExplorePanelChart({ chartType: 'heatmap', chartLabel: 'Scatter+fit' })).toBe('Correlogram');
    expect(resolveExplorePanelChart({ chartLabel: 'Scatter + fit' })).toBe('Scatter+fit');
    expect(resolveExplorePanelChart(null)).toBe(EXPLORE_PANEL_DEFAULT_CHART);
  });

  test('every EXPLORE_PANEL_CHART_FOR_MODE value is a non-empty string', () => {
    Object.values(EXPLORE_PANEL_CHART_FOR_MODE).forEach(v => {
      expect(typeof v).toBe('string');
      expect(v.length).toBeGreaterThan(0);
    });
  });

  test('fitOLS returns regression line', () => {
    const xs = [1, 2, 3, 4, 5];
    const ys = [2, 4, 5, 4, 5];
    const fit = fitOLS(xs, ys);
    expect(fit).toBeTruthy();
    expect(fit.line).toHaveLength(2);
    expect(Math.abs(fit.r)).toBeGreaterThan(0);
  });

  test('fitOLS null for short series', () => {
    expect(fitOLS([1], [2])).toBeNull();
  });

  test('getChartInsight returns text for correlogram', () => {
    const data = Array.from({ length: 10 }, (_, i) => ({ a: i, b: i * 2 }));
    const msg = getChartInsight('Correlogram', { data, numVars: ['a', 'b'] });
    expect(msg).toContain('Pearson');
  });

  test('getChartInsight scatter+fit with x/y', () => {
    const data = Array.from({ length: 12 }, (_, i) => ({ x: i, y: i * 2 + 1 }));
    const msg = getChartInsight('Scatter+fit', { data, xVar: 'x', yVar: 'y' });
    expect(msg).toMatch(/OLS|r =/);
  });

  test('resolveQuickViewVars uses inference group vars for ANOVA', () => {
    const r = resolveQuickViewVars('anova', { xVar: 'a', yVar: 'b', groupVar: 'c' }, {
      grpVar: 'sex', tgtVar: 'wage',
    });
    expect(r.usingInference).toBe(true);
    expect(r.groupVar).toBe('sex');
    expect(r.yVar).toBe('wage');
  });

  test('resolveQuickViewVars MANOVA uses scaleVars', () => {
    const r = resolveQuickViewVars('manova', {}, {
      grpVar: 'group', scaleVars: ['v1', 'v2', 'v3'],
    });
    expect(r.usingInference).toBe(true);
    expect(r.xVar).toBe('v1');
    expect(r.yVar).toBe('v2');
  });

  test('resolveQuickViewVars LDA uses preds', () => {
    const r = resolveQuickViewVars('lda', {}, {
      grpVar: 'class', preds: ['a', 'b', 'c'],
    });
    expect(r.xVar).toBe('a');
    expect(r.yVar).toBe('b');
  });

  test('resolveQuickViewVars cancorr splits scaleVars', () => {
    const r = resolveQuickViewVars('cancorr', {}, {
      scaleVars: ['x1', 'x2', 'y1', 'y2'],
    });
    expect(r.usingInference).toBe(true);
    expect(r.xVar).toBe('x1');
    expect(r.yVar).toBe('y1');
  });

  test('resolveQuickViewVars falls back to header', () => {
    const r = resolveQuickViewVars('pearson', { xVar: 'a', yVar: 'b', groupVar: 'g' }, {});
    expect(r.usingInference).toBe(false);
    expect(r.xVar).toBe('a');
  });

  test('barGroupsFromResult prefers gMeans from ANOVA output', () => {
    const groups = barGroupsFromResult({
      gMeans: [{ name: 'A', mean: 1.2, sd: 0.3, n: 10 }],
    }, 'anova', [], 'g', 'y');
    expect(groups[0].name).toBe('A');
    expect(groups[0].mean).toBe(1.2);
  });

  test('barGroupsFromResult builds from raw data', () => {
    const data = [
      { g: 'A', y: 1 }, { g: 'A', y: 3 },
      { g: 'B', y: 5 }, { g: 'B', y: 7 },
    ];
    const groups = barGroupsFromResult(null, 'anova', data, 'g', 'y');
    expect(groups).toHaveLength(2);
    expect(groups[0].se).toBeGreaterThanOrEqual(0);
  });

  test('loadingFromResult builds cronbach matrix', () => {
    const load = loadingFromResult({ itc: [0.5, 0.6], aDel: [0.7, 0.65] }, 'cronbach', ['i1', 'i2']);
    expect(load.matrix).toHaveLength(2);
    expect(load.colLabels).toEqual(['i1', 'i2']);
  });

  test('loadingFromResult PCA loadings', () => {
    const load = loadingFromResult({
      loadings: [[0.8, 0.2], [0.3, 0.9]],
      vars: ['x', 'y'],
    }, 'pca', []);
    expect(load.colLabels).toEqual(['x', 'y']);
  });

  test('formatInferenceSummary formats t-test', () => {
    expect(formatInferenceSummary({ t: 2.1, p: 0.04 }, 't_welch')).toContain('t = 2.1');
  });

  test('formatInferenceSummary MANOVA', () => {
    const s = formatInferenceSummary({ test: 'MANOVA', wilksLambda: 0.8, prob: 0.03 }, 'manova');
    expect(s).toContain('Wilks');
  });

  test('formatInferenceSummary LDA', () => {
    expect(formatInferenceSummary({ test: 'LDA', accuracyTrain: 88 }, 'lda')).toContain('88');
  });
});
