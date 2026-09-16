// @vitest-environment happy-dom
import { describe, test, expect } from 'vitest';
import {
  fitOLS, getChartInsight, resolveQuickViewVars, barGroupsFromResult,
  loadingFromResult, formatInferenceSummary, exploreChartLabel, CHART_MODE_LABELS,
  explorePanelChartFromMode, normalizeExplorePanelChart, resolveExplorePanelChart,
  EXPLORE_PANEL_DEFAULT_CHART, EXPLORE_PANEL_CHART_FOR_MODE,
  exportSvgFromCanvas, exportCanvasAsPng, clampCanvasSize,
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

  test('resolveQuickViewVars uses inference XY for pearson', () => {
    const r = resolveQuickViewVars('pearson', { xVar: 'a', yVar: 'b' }, {
      xVar: 'weight', yVar: 'height', grpVar: '',
    });
    expect(r.usingInference).toBe(true);
    expect(r.xVar).toBe('weight');
    expect(r.yVar).toBe('height');
  });

  test('resolveQuickViewVars handles XY with empty groupVar fallback', () => {
    const r = resolveQuickViewVars('ols_simple', { xVar: 'a', yVar: 'b' }, {
      xVar: 'x1', yVar: 'x2',
    });
    expect(r.xVar).toBe('x1');
  });

  test('resolveQuickViewVars uses CATS for chisq', () => {
    const r = resolveQuickViewVars('chisq', {}, { cat1: 'gender', cat2: 'outcome' });
    expect(r.usingInference).toBe(true);
    expect(r.xVar).toBe('gender');
    expect(r.yVar).toBe('outcome');
  });

  test('resolveQuickViewVars CATS with missing cat2 falls back to cat1', () => {
    const r = resolveQuickViewVars('fisher', {}, { cat1: 'group' });
    expect(r.yVar).toBe('group');
  });

  test('barGroupsFromResult returns empty for missing groupVar', () => {
    const groups = barGroupsFromResult(null, 'anova', [], null, 'y');
    expect(groups).toEqual([]);
  });

  test('loadingFromResult returns null for unrelated test', () => {
    expect(loadingFromResult({ someOther: true }, 't_welch')).toBeNull();
  });

  test('formatInferenceSummary canonical correlation', () => {
    const s = formatInferenceSummary({ test: 'Canonical Correlation', correlations: [0.8], pCanon: 0.01 }, 'cancorr');
    expect(s).toContain('\u03c1c');
  });

  test('formatInferenceSummary returns null for unrecognized', () => {
    expect(formatInferenceSummary({ test: 'Unknown' }, 'unknown')).toBeNull();
  });

  test('formatInferenceSummary returns null for null result', () => {
    expect(formatInferenceSummary(null, 't_welch')).toBeNull();
  });

  test('getChartInsight Bar+CI with groupVar', () => {
    const data = Array.from({ length: 12 }, (_, i) => ({ g: i % 3 === 0 ? 'A' : 'B', val: i }));
    const msg = getChartInsight('Bar+CI', { data, groupVar: 'g', yVar: 'val' });
    expect(msg).toContain('groups');
  });

  test('getChartInsight PCA biplot with numVars', () => {
    const data = Array.from({ length: 10 }, (_, i) => ({ v1: i, v2: i * 2, v3: i * 3 }));
    const msg = getChartInsight('PCA biplot', { data, numVars: ['v1', 'v2', 'v3'] });
    expect(msg).toContain('PC1');
  });

  test('getChartInsight Mosaic with x/y vars', () => {
    const data = Array.from({ length: 5 }, (_, i) => ({ a: 'X', b: 'Y' }));
    const msg = getChartInsight('Mosaic', { data, xVar: 'a', yVar: 'b' });
    expect(msg).toContain('proportional');
  });

  test('getChartInsight fallback for unknown chart', () => {
    const data = Array.from({ length: 7 }, (_, i) => ({ x: i }));
    const msg = getChartInsight('UnknownChart', { data });
    expect(msg).toContain('n = 7');
  });

  test('getChartInsight returns null for empty data', () => {
    expect(getChartInsight('Scatter+fit', { data: [] })).toBeNull();
  });

  test('exportSvgFromCanvas returns false for empty container', () => {
    const div = document.createElement('div');
    expect(exportSvgFromCanvas(div, 'test.svg')).toBe(false);
  });

  test('exportSvgFromCanvas returns false for null container', () => {
    expect(exportSvgFromCanvas(null, 'test.svg')).toBe(false);
  });

  test('exportSvgFromCanvas triggers download for valid SVG', () => {
    const div = document.createElement('div');
    div.innerHTML = '<svg width="100" height="100"><rect/></svg>';
    const result = exportSvgFromCanvas(div, 'test.svg');
    expect(result).toBe(true);
  });

  test('exportSvgFromCanvas merges multiple SVGs', () => {
    const div = document.createElement('div');
    div.innerHTML = '<svg width="100" height="50"><circle/></svg><svg width="100" height="50"><rect/></svg>';
    const result = exportSvgFromCanvas(div, 'merged.svg');
    expect(result).toBe(true);
  });

  test('exportCanvasAsPng returns false for null container', async () => {
    const result = await exportCanvasAsPng(null, 'test.png');
    expect(result).toBe(false);
  });

  test('exportCanvasAsPng returns false for container without SVG', async () => {
    const div = document.createElement('div');
    const result = await exportCanvasAsPng(div, 'test.png');
    expect(result).toBe(false);
  });

  test('clampCanvasSize subtracts padding when the result stays above both floors', () => {
    const size = clampCanvasSize(1000, 600, { minW: 320, minH: 240, padW: 24, padH: 80 });
    expect(size).toEqual({ w: 976, h: 520 });
  });

  test('clampCanvasSize clamps to the width floor when padded width would fall below it', () => {
    const size = clampCanvasSize(300, 600, { minW: 320, minH: 240, padW: 24, padH: 80 });
    // 300 - 24 = 276, below minW 320, so w is clamped to the floor
    expect(size.w).toBe(320);
    expect(size.h).toBe(520);
  });

  test('clampCanvasSize clamps to the height floor when padded height would fall below it', () => {
    const size = clampCanvasSize(1000, 280, { minW: 320, minH: 240, padW: 24, padH: 80 });
    // 280 - 80 = 200, below minH 240, so h is clamped to the floor
    expect(size.w).toBe(976);
    expect(size.h).toBe(240);
  });

  test('clampCanvasSize floors fractional pixel measurements after subtracting padding', () => {
    const size = clampCanvasSize(1000.7, 600.9, { minW: 320, minH: 240, padW: 24.2, padH: 80.4 });
    expect(size).toEqual({ w: Math.floor(1000.7 - 24.2), h: Math.floor(600.9 - 80.4) });
  });

  test('clampCanvasSize clamps both dimensions at once when both fall below their floors', () => {
    const size = clampCanvasSize(100, 100, { minW: 320, minH: 240, padW: 24, padH: 80 });
    expect(size).toEqual({ w: 320, h: 240 });
  });
});
