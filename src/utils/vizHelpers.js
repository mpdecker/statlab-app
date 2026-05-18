import { corr } from '../math/core.js';

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
