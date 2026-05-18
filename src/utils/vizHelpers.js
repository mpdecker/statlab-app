import { corr, sampleSD } from '../math/core.js';

/** Tests whose QuickView should follow Inference variable selectors */
export const TESTS_USE_INFERENCE_GROUPS = new Set([
  't_welch', 't_paired', 'trimmed', 'sign', 'mwu', 'wilcoxon',
  'anova', 'welch_anova', 'twoway', 'ancova', 'rm_anova', 'kruskal', 'friedman',
  'cochranQ', 'homogeneity', 'levene', 'pointbis', 'prop2',
]);

export const TESTS_USE_INFERENCE_XY = new Set([
  'pearson', 'spearman', 'kendall', 'partial', 'ols_simple', 'ols_multi',
  'polynomial', 'hierarchical', 'logistic', 'mediation', 'med_bootstrap', 'moderation',
  'bootstrap', 'normality', 'grubbs', 'samplesize', 'did',
]);

export const TESTS_USE_INFERENCE_CATS = new Set([
  'chisq', 'fisher', 'mcnemar', 'kappa',
]);

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
};

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
  'Scatter+fit', 'Histogram', 'Box', 'Violin', 'Rain-cloud', 'ECDF',
  'Bubble', 'Interact. plot', 'Simp. slopes', 'Spotlight',
]);

export const EXPLORE_CHARTS_SIZE = new Set(['Bubble']);

export const EXPLORE_CHARTS_CAT_PAIR = new Set(['Mosaic', 'Stacked%', 'Diverg. Likert']);

/** Merge header Quick View vars with active Inference selectors */
export function resolveQuickViewVars(activeTest, header, inference) {
  const h = header || {};
  const inf = inference || {};
  if (TESTS_USE_INFERENCE_GROUPS.has(activeTest) && inf.grpVar && inf.tgtVar) {
    return {
      xVar: inf.tgtVar,
      yVar: inf.tgtVar,
      groupVar: inf.grpVar,
      catX: inf.cat1 || h.xVar,
      catY: inf.cat2 || h.yVar,
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

export function barGroupsFromResult(result, activeTest, data, groupVar, yVar) {
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
    const vals = data.filter(r => r[groupVar] === name).map(r => +r[yVar]).filter(v => !isNaN(v));
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

export function formatInferenceSummary(result, activeTest) {
  if (!result) return null;
  if (result.t != null && result.p != null) return `t = ${result.t}, p = ${result.p}`;
  if (result.F != null && result.p != null) return `F = ${result.F}, p = ${result.p}`;
  if (result.r != null && result.p != null) return `r = ${result.r}, p = ${result.p}`;
  if (result.r2 != null) return `R² = ${result.r2}`;
  if (result.alpha != null) return `α = ${result.alpha}`;
  if (result.test && result.p != null) return `${result.test}: p = ${result.p}`;
  if (activeTest === 'meta' && result.pooledD != null) return `d̂ = ${result.pooledD}`;
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
        const xs = data.map(r => +r[numVars[i]]).filter(v => !isNaN(v));
        const ys = data.map(r => +r[numVars[j]]).filter(v => !isNaN(v));
        const m = Math.min(xs.length, ys.length);
        if (m >= 3) pairs.push({ a: numVars[i], b: numVars[j], r: corr(xs.slice(0, m), ys.slice(0, m)) });
      }
    }
    const top = pairs.sort((a, b) => Math.abs(b.r) - Math.abs(a.r))[0];
    if (top) lines.push(`Strongest pair: ${top.a} × ${top.b}, r = ${top.r.toFixed(3)}.`);
  }
  if (chart === 'Scatter+fit' && xVar && yVar) {
    const xs = data.map(r => +r[xVar]).filter(v => !isNaN(v));
    const ys = data.map(r => +r[yVar]).filter(v => !isNaN(v));
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
