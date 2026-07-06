import { avg } from '../math/core.js';

// ── Gini Coefficient ──────────────────────────────────────────────
/** @param {number[]} data */
export function giniCoefficient(data) {
  if (!data || data.length < 5) return null;
  const n = data.length;
  const sorted = [...data].sort((a, b) => a - b);
  let sumDif = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) sumDif += Math.abs(sorted[i] - sorted[j]);
  }
  const mean = avg(sorted);
  const gini = mean > 0 ? sumDif / (2 * n * n * mean) : 0;
  return { test: 'Gini Coefficient', gini: +gini.toFixed(4), n, apa: `Gini = ${gini.toFixed(3)}, n = ${n}` };
}

// ── Lorenz Curve ──────────────────────────────────────────────────
/** @param {number[]} data */
export function lorenzCurve(data) {
  if (!data || data.length < 5) return null;
  const n = data.length;
  const sorted = [...data].sort((a, b) => a - b);
  const total = sorted.reduce((s, v) => s + v, 0);
  if (!total) return null;
  const points = [];
  let cum = 0;
  for (let i = 0; i < n; i++) {
    cum += sorted[i];
    points.push({ pct: +((i + 1) / n).toFixed(4), cumPct: +(cum / total).toFixed(4) });
  }
  return { test: 'Lorenz Curve', points, n, apa: `Lorenz: ${n} points, total = ${total.toFixed(2)}` };
}

// ── Theil Index (GE(1)) ───────────────────────────────────────────
// GE(1) = (1/n)·Σ (v_i/mean)·ln(v_i/mean). The weight term was missing its
// division by `mean` (used `v` instead of `v/mean`), inflating the index by
// exactly a factor of `mean` — e.g. 21.5x too large on a dataset with mean
// 21.5. x·ln(x)→0 as x→0+, so v_i=0 contributes 0 (guarded explicitly since
// JS's 0*(-Infinity) is NaN, not 0).
/** @param {number[]} data */
export function theilIndex(data, { groupVals = null, groupSizes = null } = {}) {
  if (!data || data.length < 5) return null;
  const n = data.length;
  const mean = avg(data);
  if (!mean) return null;
  let theil = 0;
  for (const v of data) { const r = v / mean; theil += r > 0 ? r * Math.log(r) : 0; }
  theil /= n;
  if (groupVals && groupSizes) {
    // Between-group component
    let between = 0;
    const totalSize = groupSizes.reduce((s, v) => s + v, 0);
    for (let g = 0; g < groupVals.length; g++) {
      if (groupVals[g] > 0) {
        between += groupSizes[g] * (groupVals[g] / mean) * Math.log(groupVals[g] / mean);
      }
    }
    between /= totalSize;
    return { test: 'Theil Index', theil: +theil.toFixed(4), between, within: theil - between, n, apa: `Theil = ${theil.toFixed(3)}` };
  }
  return { test: 'Theil Index', theil: +theil.toFixed(4), n, apa: `Theil = ${theil.toFixed(3)}` };
}

// ── Atkinson Index ────────────────────────────────────────────────
/** @param {number[]} data */
export function atkinsonIndex(data, { epsilon = 1 } = {}) {
  if (!data || data.length < 5) return null;
  const n = data.length;
  const mean = avg(data);
  if (!mean) return null;
  if (Math.abs(epsilon - 1) < 0.001) {
    const prod = data.reduce((p, v) => p * Math.pow(v / mean, 1 / n), 1);
    return { test: 'Atkinson Index', atkinson: +(1 - prod).toFixed(4), epsilon, n, apa: `Atkinson(1) = ${(1 - prod).toFixed(3)}` };
  }
  let sum = 0;
  for (const v of data) sum += Math.pow(v / mean, 1 - epsilon);
  const atk = 1 - Math.pow(sum / n, 1 / (1 - epsilon));
  return { test: 'Atkinson Index', atkinson: +atk.toFixed(4), epsilon, n, apa: `Atkinson(${epsilon}) = ${atk.toFixed(3)}` };
}

// ── Concentration Index (health) ──────────────────────────────────
/** @param {number[]} health @param {number[]} rank */
export function concentrationIndex(health, rank) {
  if (!health || !rank || health.length < 5 || health.length !== rank.length) return null;
  const n = health.length;
  const mu = avg(health);
  if (!mu) return null;
  const sorted = rank.map((r, i) => ({ r, h: health[i] })).sort((a, b) => a.r - b.r);
  let num = 0;
  for (let i = 0; i < n; i++) {
    const ri = (i + 1) / n;
    num += 2 * (sorted[i].h - mu) * (ri - 0.5);
  }
  const ci = num / (n * mu);
  return { test: 'Concentration Index', ci: +ci.toFixed(4), n, apa: `CI = ${ci.toFixed(3)}, n = ${n}` };
}

// ── Hoover Index (Robin Hood Index) ───────────────────────────────
/** @param {number[]} data */
export function hooverIndex(data) {
  if (!data || data.length < 3) return null;
  const n = data.length;
  const total = data.reduce((s, v) => s + v, 0);
  if (total <= 0) return null;
  const mean = total / n;
  let sumAbs = 0;
  for (const v of data) sumAbs += Math.abs(v - mean);
  const H = sumAbs / (2 * total);
  return { test: 'Hoover Index', H: +H.toFixed(4), n, apa: `Hoover = ${H.toFixed(3)}` };
}

// ── Palma Ratio ───────────────────────────────────────────────────
/** @param {number[]} data */
export function palmaRatio(data) {
  if (!data || data.length < 10) return null;
  const n = data.length;
  const sorted = [...data].sort((a, b) => a - b);
  const top10 = sorted.slice(Math.floor(n * 0.9));
  const bottom40 = sorted.slice(0, Math.floor(n * 0.4));
  const topSum = top10.reduce((s, v) => s + v, 0);
  const bottomSum = bottom40.reduce((s, v) => s + v, 0);
  const ratio = bottomSum > 0 ? topSum / bottomSum : 0;
  return { test: 'Palma Ratio', ratio: +ratio.toFixed(4), n, apa: `Palma = ${ratio.toFixed(2)}` };
}

// ── Inequality Decomposition (Theil within/between) ───────────────
/** @param {number[]} data @param {Array<string|number>} groups */
export function decomposition(data, groups) {
  if (!data || !groups || data.length < 3 || data.length !== groups.length) return null;
  const n = data.length;
  const uniqueGroups = [...new Set(groups)];
  let Tbetween = 0;
  const groupMeans = {};
  for (const g of uniqueGroups) {
    const gData = data.filter((_, i) => groups[i] === g);
    groupMeans[g] = avg(gData);
  }
  const grandMean = avg(data);
  for (const g of uniqueGroups) {
    const gData = data.filter((_, i) => groups[i] === g);
    if (gData.length) Tbetween += gData.length * (groupMeans[g] / grandMean) * Math.log(groupMeans[g] / Math.max(grandMean, 0.01));
  }
  Tbetween /= n;
  let Twithin = 0;
  for (const g of uniqueGroups) {
    const gData = data.filter((_, i) => groups[i] === g);
    if (gData.length < 1) continue;
    const gMean = groupMeans[g];
    Twithin += (gData.length / n) * (gMean / grandMean) * gData.reduce((s, v) => s + (v / Math.max(gMean, 0.01)) * Math.log(v / Math.max(gMean, 0.01)), 0);
  }
  return { test: 'Inequality Decomposition', Tbetween: +Tbetween.toFixed(4), Twithin: +Twithin.toFixed(4), Ttotal: +(Tbetween + Twithin).toFixed(4), n, apa: `Theil within=${Twithin.toFixed(3)}, between=${Tbetween.toFixed(3)}` };
}
