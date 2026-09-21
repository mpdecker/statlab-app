import { useState, useEffect } from 'react';
import { corr, sampleSD, fmtP } from '@statlab/core/math/core';

/** Tests whose QuickView should follow Inference variable selectors */
export const TESTS_USE_INFERENCE_GROUPS = new Set([
  't_welch', 't_paired', 'trimmed', 'sign', 'mwu', 'wilcoxon',
  'anova', 'welch_anova', 'twoway', 'ancova', 'rm_anova', 'kruskal', 'friedman',
  'cochranQ', 'homogeneity', 'levene', 'pointbis', 'prop2',
  'manova', 'lda',
]);

export const TESTS_USE_INFERENCE_XY = new Set([
  'pearson', 'spearman', 'kendall', 'partial', 'ols_simple', 'ols_multi',
  'polynomial', 'hierarchical', 'logistic', 'mediation', 'med_bootstrap', 'moderation',
  'bootstrap', 'normality', 'grubbs', 'samplesize', 'did',
]);

export const TESTS_USE_INFERENCE_CATS = new Set([
  'chisq', 'fisher', 'mcnemar', 'kappa',
]);

/** Single source of truth for Explore / Quick View chart mode labels */
export const CHART_MODE_LABELS = {
  violin: 'Violin',
  scatter: 'Scatter',
  scatterfit: 'Scatter + fit',
  histogram: 'Histogram',
  barci: 'Bar + CI',
  heatmap: 'Correlogram',
  mosaic: 'Mosaic',
  loading: 'Loadings',
  forest: 'Forest',
  path: 'Path',
  qq: 'Q-Q',
  scree: 'Scree',
  residual: 'Residuals',
  boot: 'Bootstrap',
  power: 'Power',
  slopes: 'Simple slopes',
  box: 'Box plot',
  irtplot: 'IRT curves',
  lca: 'LCA profiles',
  spaghetti: 'Spaghetti',
  caterpillar: 'Caterpillar',
  its: 'ITS',
  rddplot: 'RDD',
  sociogram: 'Sociogram',
  mdsplot: 'MDS',
  timeseries: 'Time Series',
};

export function exploreChartLabel(mode) {
  return CHART_MODE_LABELS[mode] ?? 'Scatter + fit';
}

/** Explore tab chart ids (match ExplorePanel switch cases) */
export const EXPLORE_PANEL_DEFAULT_CHART = 'Scatter+fit';

/** Quick View / Inference chart mode → Explore tab chart id */
export const EXPLORE_PANEL_CHART_FOR_MODE = {
  violin: 'Violin',
  histogram: 'Histogram',
  scatter: 'Scatter+fit',
  scatterfit: 'Scatter+fit',
  barci: 'Bar+CI',
  heatmap: 'Correlogram',
  mosaic: 'Mosaic',
  loading: 'Load. heatmap',
  forest: 'Forest',
  path: 'Scatter+fit',
  qq: 'ECDF',
  scree: 'PCA biplot',
  residual: 'Scatter+fit',
  boot: 'Bootstrap',
  power: 'Histogram',
  slopes: 'Simp. slopes',
  box: 'Box',
  irtplot: 'IRT',
  lca: 'Mosaic',
  spaghetti: 'Violin',
  caterpillar: 'Caterpillar',
  its: 'Time series',
  rddplot: 'RDD',
  sociogram: 'Dendrogram',
  mdsplot: 'PCA biplot',
  survival: 'Survival',
  correlogram: 'Bar+CI',
  timeseries: 'Time series',
  decomposition: 'Scatter+fit',
  impulse: 'Scatter+fit',
  blandaltman: 'Scatter+fit',
  envelope: 'Scatter+fit',
  spectrum: 'Scatter+fit',
  spectrogram: 'Histogram',
  lorenz: 'Line',
  manhattan: 'Bar+CI',
  circular: 'Scatter+fit',
  threshold: 'Scatter+fit',
  variogram: 'Scatter+fit',
};

const EXPLORE_PANEL_LABEL_ALIASES = {
  'Scatter + fit': 'Scatter+fit',
  'Bar + CI': 'Bar+CI',
  'Loadings': 'Load. heatmap',
  'Simple slopes': 'Simp. slopes',
  'Correlogram': 'Correlogram',
};

export function explorePanelChartFromMode(mode) {
  return EXPLORE_PANEL_CHART_FOR_MODE[mode] ?? EXPLORE_PANEL_DEFAULT_CHART;
}

/** Map display labels from exploreChartLabel to Explore tab ids */
export function normalizeExplorePanelChart(label) {
  if (!label) return EXPLORE_PANEL_DEFAULT_CHART;
  return EXPLORE_PANEL_LABEL_ALIASES[label] ?? label;
}

export function resolveExplorePanelChart(seed) {
  if (seed?.chartType) return explorePanelChartFromMode(seed.chartType);
  if (seed?.chartLabel) return normalizeExplorePanelChart(seed.chartLabel);
  return EXPLORE_PANEL_DEFAULT_CHART;
}

/** Simple OLS fit for scatter overlays */
export function fitOLS(xs, ys) {
  const n = xs.length;
  if (n < 3) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  const sxx = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  const sxy = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
  if (!sxx) return null;
  const b1 = sxy / sxx;
  const b0 = my - b1 * mx;
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const line = [
    { x: minX, y: b0 + b1 * minX },
    { x: maxX, y: b0 + b1 * maxX },
  ];
  const r = corr(xs, ys);
  return { b0, b1, r, line, n };
}

export const EXPLORE_CHARTS_XY = new Set([
  'Scatter+fit', 'Line', 'Histogram', 'Box', 'Violin', 'Rain-cloud', 'ECDF', 'Q-Q',
  'Bubble', 'Interact. plot', 'Simp. slopes', 'Spotlight',
]);

export const EXPLORE_CHARTS_SIZE = new Set(['Bubble']);

export const EXPLORE_CHARTS_CAT_PAIR = new Set(['Mosaic', 'Stacked%', 'Diverg. Likert']);

/** Merge header Quick View vars with active Inference selectors */
export function resolveQuickViewVars(activeTest, header, inference) {
  const h = header || {};
  const inf = inference || {};
  if (
    TESTS_USE_INFERENCE_GROUPS.has(activeTest) &&
    inf.grpVar &&
    inf.tgtVar &&
    !['manova', 'lda'].includes(activeTest)
  ) {
    return {
      xVar: inf.tgtVar,
      yVar: inf.tgtVar,
      groupVar: inf.grpVar,
      catX: inf.cat1 || h.xVar,
      catY: inf.cat2 || h.yVar,
      usingInference: true,
    };
  }
  if (
    TESTS_USE_INFERENCE_GROUPS.has(activeTest) &&
    activeTest === 'manova' &&
    inf.grpVar &&
    (inf.scaleVars?.length ?? 0) >= 2
  ) {
    const vx = inf.scaleVars[0];
    const vy = inf.scaleVars[1];
    return {
      xVar: vx,
      yVar: vy,
      groupVar: inf.grpVar,
      catX: inf.cat1 || vx,
      catY: vy,
      usingInference: true,
    };
  }
  if (
    TESTS_USE_INFERENCE_GROUPS.has(activeTest) &&
    activeTest === 'lda' &&
    inf.grpVar &&
    (inf.preds?.length ?? 0) >= 2
  ) {
    return {
      xVar: inf.preds[0],
      yVar: inf.preds[1],
      groupVar: inf.grpVar,
      catX: inf.cat1,
      catY: inf.cat2,
      usingInference: true,
    };
  }
  if (activeTest === 'cancorr' && (inf.scaleVars?.length ?? 0) >= 2) {
    const sv = inf.scaleVars;
    const mid = Math.max(1, Math.floor(sv.length / 2));
    return {
      xVar: sv[0],
      yVar: sv[mid],
      groupVar: inf.grpVar && inf.grpVar !== '' ? inf.grpVar : h.groupVar,
      catX: inf.cat1,
      catY: inf.cat2,
      usingInference: true,
    };
  }
  if (TESTS_USE_INFERENCE_XY.has(activeTest) && inf.xVar && inf.yVar) {
    return {
      xVar: inf.xVar,
      yVar: inf.yVar,
      groupVar: inf.grpVar && inf.grpVar !== '' ? inf.grpVar : h.groupVar,
      catX: inf.cat1,
      catY: inf.cat2,
      usingInference: true,
    };
  }
  if (TESTS_USE_INFERENCE_CATS.has(activeTest) && inf.cat1) {
    return {
      xVar: inf.cat1,
      yVar: inf.cat2 || inf.cat1,
      groupVar: inf.cat1,
      catX: inf.cat1,
      catY: inf.cat2 || inf.cat1,
      usingInference: true,
    };
  }
  return {
    xVar: h.xVar,
    yVar: h.yVar,
    groupVar: h.groupVar,
    catX: h.xVar,
    catY: h.yVar,
    usingInference: false,
  };
}

/** Pure arithmetic behind useCanvasSize's ResizeObserver callback: clamp a
 *  measured element size down to a usable canvas size, subtracting fixed
 *  padding and never going below the given floors. */
export function clampCanvasSize(width, height, { minW, minH, padW, padH }) {
  return {
    w: Math.max(minW, Math.floor(width - padW)),
    h: Math.max(minH, Math.floor(height - padH)),
  };
}

export function useCanvasSize(ref, { minW = 320, minH = 240, padW = 24, padH = 80, initialW = minW, initialH = minH } = {}) {
  const [size, setSize] = useState({ w: initialW, h: initialH });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setSize(clampCanvasSize(width, height, { minW, minH, padW, padH }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [minW, minH, padW, padH]);
  return size;
}

export function seriesFromResult(result, activeTest) {
  if (!result) return null;
  const t = activeTest || '';

  if (t.startsWith('sced_')) {
    const s = [];
    if (result.baseline?.length) s.push({ name: 'Baseline', data: result.baseline });
    if (result.intervention?.length) s.push({ name: 'Intervention', data: result.intervention });
    if (s.length) return s;
  }
  if (t.startsWith('bandit_')) {
    const hist = result.history;
    if (Array.isArray(hist) && hist.length) {
      const reward = hist.map(h => h?.reward).filter(v => v != null);
      const arm = hist.map(h => h?.arm).filter(v => v != null);
      if (reward.length) return [{ name: 'Reward', data: reward }];
      if (arm.length) return [{ data: arm }];
      const fld = Object.keys(hist[0]).find(k => typeof hist[0][k] === 'number');
      if (fld) return [{ data: hist.map(h => h[fld]) }];
    }
  }
  if (t.startsWith('abm_diffusion')) {
    const hist = result.history;
    if (Array.isArray(hist) && hist.length) {
      const infected = hist.map(h => h?.nInfected).filter(v => v != null);
      if (infected.length) return [{ data: infected }];
    }
  }
  if (t === 'ram_cusum' && Array.isArray(result.cusum)) return [{ data: result.cusum }];
  if (t === 'ram_vlad' && Array.isArray(result.vlad)) return [{ data: result.vlad }];
  if (t === 'ram_sprt' && Array.isArray(result.llr)) return [{ data: result.llr }];
  if (t === 'ram_cchart' && Array.isArray(result.points)) return [{ data: result.points.map(p => p.observed) }];

  if (t === 'sens_forecast') {
    const s = [];
    if (result.actual?.length) s.push({ name: 'Actual', data: result.actual });
    if (result.combined?.length) s.push({ name: 'Combined', data: result.combined });
    if (s.length) return s;
  }

  // generic: scan result for first number[] field
  for (const k of Object.keys(result)) {
    if (k === 'test' || k === 'apa') continue;
    const v = result[k];
    if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'number') return [{ data: v }];
  }
  return null;
}

export function barGroupsFromResult(result, activeTest, data, groupVar, yVar) {
  if (result?.effects?.length) {
    return result.effects.map((e, i) => ({
      name: e.param ?? e.factor ?? `X${i + 1}`,
      mean: e.muStar ?? e.mu ?? e.sensitivity ?? 0,
      se: 0,
    }));
  }
  if (result?.Si?.length) {
    return result.Si.map((v, i) => ({ name: `X${i + 1}`, mean: v, se: 0 }));
  }
  if (result?.totalIndices?.length) {
    return result.totalIndices.map((v, i) => ({ name: `X${i + 1}`, mean: v, se: 0 }));
  }
  if (result?.indices?.length) {
    return result.indices.map(e => ({
      name: `F${e.factor}`,
      mean: e.sensitivity ?? e.r ?? 0,
      se: 0,
    }));
  }
  if (result?.results?.length) {
    return result.results.map(r => ({
      name: r.name ?? String(r.index ?? ''),
      mean: r.prr ?? r.rate ?? 0,
      se: 0,
    }));
  }
  if (result?.summaries?.length) {
    return result.summaries.map(s => ({
      name: s.variable ?? s.var ?? s.name ?? '',
      mean: s.mean ?? 0,
      se: (s.sd ?? 0) / Math.sqrt((s.n || 1)),
    }));
  }
  if (result?.values?.length) {
    return result.values.map(v => ({
      name: v.name ?? '',
      mean: v.mean ?? 0,
      se: (v.sd ?? 0) / Math.sqrt((v.n || 1)),
    }));
  }
  if (result?.influence?.length) {
    return result.influence.map(e => ({
      name: String(e.index ?? ''),
      mean: e.value ?? 0,
      se: 0,
    }));
  }
  if (result?.gMeans?.length) {
    return result.gMeans.map(g => ({
      name: g.name,
      mean: g.mean ?? g.adj,
      se: (g.sd ?? 0) / Math.sqrt(g.n || 1),
    }));
  }
  if (result?.adjMeans?.length) {
    return result.adjMeans.map(g => ({
      name: g.name,
      mean: g.adj,
      se: 0,
    }));
  }
  if (!groupVar || groupVar === '(none)' || !yVar || !data?.length) return [];
  return [...new Set(data.map(r => r[groupVar]))].slice(0, 8).map(name => {
    const vals = data.filter(r => r[groupVar] === name).map(r => +r[yVar]).filter(Number.isFinite);
    const n = vals.length;
    const mean = vals.reduce((a, b) => a + b, 0) / (n || 1);
    return { name: String(name), mean, se: sampleSD(vals) / Math.sqrt(n || 1) };
  });
}

export function loadingFromResult(result, activeTest, varLabels) {
  if (result?.loadings?.length && result.loadings[0]?.length) {
    const cols = result.vars || varLabels || result.loadings[0].map((_, i) => `V${i + 1}`);
    const rows = result.loadings.length;
    return { matrix: result.loadings, rowLabels: Array.from({ length: rows }, (_, i) => `F${i + 1}`), colLabels: cols };
  }
  if (activeTest === 'cronbach' && result?.itc?.length) {
    const cols = varLabels?.length === result.itc.length ? varLabels : result.itc.map((_, i) => `I${i + 1}`);
    return {
      matrix: [result.itc, result.aDel],
      rowLabels: ['r_it', 'α_del'],
      colLabels: cols,
    };
  }
  return null;
}

export function computeCorrMatrix(data, vars) {
  return vars.map(v1 => vars.map(v2 => {
    if (v1 === v2) return 1;
    const xs = data.map(r => +r[v1]).filter(Number.isFinite);
    const ys = data.map(r => +r[v2]).filter(Number.isFinite);
    const n = Math.min(xs.length, ys.length);
    if (n < 2) return 0;
    return corr(xs.slice(0, n), ys.slice(0, n));
  }));
}

const fmt3 = v => Number.isFinite(v) ? (+v).toFixed(3) : v;

export function formatInferenceSummary(result, activeTest) {
  if (!result) return null;
  if (result.t != null && result.p != null) return `t = ${fmt3(result.t)}, ${fmtP(result.p)}`;
  if (result.F != null && result.p != null) return `F = ${fmt3(result.F)}, ${fmtP(result.p)}`;
  if (result.r != null && result.p != null) return `r = ${fmt3(result.r)}, ${fmtP(result.p)}`;
  if (result.r2 != null) return `R² = ${fmt3(result.r2)}`;
  if (result.alpha != null) return `α = ${fmt3(result.alpha)}`;
  if (result.test && result.p != null) return `${result.test}: ${fmtP(result.p)}`;
  if (result.test === 'MANOVA' && result.wilksLambda != null && result.prob != null) {
    return `Wilks Λ = ${fmt3(result.wilksLambda)}, ${fmtP(result.prob)}`;
  }
  if (result.test === 'Canonical Correlation' && result.correlations?.length && result.pCanon != null) {
    return `ρc(max) ≈ ${fmt3(result.correlations[0])}, ${fmtP(result.pCanon)}`;
  }
  if (result.test === 'LDA' && result.accuracyTrain != null) {
    return `LDA training accuracy = ${fmt3(result.accuracyTrain)}%`;
  }
  return null;
}

export function getChartInsight(chart, { data, xVar, yVar, groupVar, numVars }) {
  if (!data?.length) return null;
  const n = data.length;
  const lines = [];
  if (chart === 'Correlogram' && numVars?.length >= 2) {
    lines.push(`Click any cell to run Pearson r in Inference.`);
    const pairs = [];
    for (let i = 0; i < numVars.length; i++) {
      for (let j = i + 1; j < numVars.length; j++) {
        const xs = data.map(r => +r[numVars[i]]).filter(Number.isFinite);
        const ys = data.map(r => +r[numVars[j]]).filter(Number.isFinite);
        const m = Math.min(xs.length, ys.length);
        if (m >= 3) pairs.push({ a: numVars[i], b: numVars[j], r: corr(xs.slice(0, m), ys.slice(0, m)) });
      }
    }
    const top = pairs.sort((a, b) => Math.abs(b.r) - Math.abs(a.r))[0];
    if (top) lines.push(`Strongest pair: ${top.a} × ${top.b}, r = ${top.r.toFixed(3)}.`);
  }
  if (chart === 'Scatter+fit' && xVar && yVar) {
    const xs = data.map(r => +r[xVar]).filter(Number.isFinite);
    const ys = data.map(r => +r[yVar]).filter(Number.isFinite);
    const fit = xs.length === ys.length ? fitOLS(xs, ys) : null;
    if (fit) lines.push(`OLS: y = ${fit.b0.toFixed(2)} + ${fit.b1.toFixed(3)}x · r = ${fit.r.toFixed(3)} · n = ${fit.n}`);
  }
  if (['Bar+CI', 'Dot+CI', 'Strip+mean'].includes(chart) && groupVar && groupVar !== '(none)' && yVar) {
    const groups = [...new Set(data.map(r => r[groupVar]))];
    lines.push(`${groups.length} groups · n = ${n}. Compare means with uncertainty bands.`);
  }
  if (chart === 'PCA biplot' && numVars?.length >= 2) {
    lines.push(`Biplot shows PC1 × PC2 scores with variable loading arrows (n = ${n}).`);
  }
  if (chart === 'Mosaic' && xVar && yVar) {
    lines.push(`Tile areas are proportional to joint category counts.`);
  }
  if (!lines.length) lines.push(`n = ${n} observations.`);
  return lines.join(' ');
}

export function exportSvgFromCanvas(container, filename) {
  if (!container) return false;
  const svgs = container.querySelectorAll('svg');
  if (!svgs.length) return false;
  const svg = svgs.length === 1 ? svgs[0] : mergeSvgs(svgs);
  const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}

/** Rasterize first SVG in container to PNG (for Recharts-heavy exports) */
export function exportCanvasAsPng(container, filename, scale = 2) {
  if (!container) return Promise.resolve(false);
  const svg = container.querySelector('svg');
  if (!svg) return Promise.resolve(false);
  const w = parseFloat(svg.getAttribute('width')) || container.clientWidth || 560;
  const h = parseFloat(svg.getAttribute('height')) || container.clientHeight || 360;
  const serialized = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = w * scale;
      canvas.height = h * scale;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#0d0d0d';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob(pngBlob => {
        if (!pngBlob) { resolve(false); return; }
        const pngUrl = URL.createObjectURL(pngBlob);
        const a = document.createElement('a');
        a.href = pngUrl;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(pngUrl);
        resolve(true);
      }, 'image/png');
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(false); };
    img.src = url;
  });
}

function mergeSvgs(svgList) {
  const first = svgList[0];
  const w = Math.max(...[...svgList].map(s => parseFloat(s.getAttribute('width')) || 400));
  const h = [...svgList].reduce((sum, s) => sum + (parseFloat(s.getAttribute('height')) || 200), 0);
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  g.setAttribute('width', w);
  g.setAttribute('height', h);
  g.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  let yOff = 0;
  svgList.forEach(s => {
    const inner = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    inner.setAttribute('transform', `translate(0, ${yOff})`);
    [...s.childNodes].forEach(node => inner.appendChild(node.cloneNode(true)));
    g.appendChild(inner);
    yOff += parseFloat(s.getAttribute('height')) || 200;
  });
  return g;
}
