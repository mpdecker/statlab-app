import { avg, sampleSD, corr } from '../math/core.js';
import { normalCDF } from '../math/distributions.js';

// ── Reliable Change Index ──────────────────────────────────────────────────
export function reliableChangeIndex(baseline, followUp, { reliability = 0.8, sdBaseline = null } = {}) {
  if (!baseline || !followUp || baseline.length !== followUp.length || baseline.length < 3) return null;
  const n = baseline.length;
  const sd = sdBaseline || Math.sqrt(baseline.reduce((s, v) => s + (v - avg(baseline)) ** 2, 0) / (n - 1));
  const se = sd * Math.sqrt(2 * (1 - reliability));
  const indices = baseline.map((b, i) => {
    const diff = followUp[i] - b;
    const rci = diff / Math.max(se, 0.01);
    return { subject: i + 1, baseline: +b.toFixed(4), followUp: +followUp[i].toFixed(4), rci: +rci.toFixed(4), sig: Math.abs(rci) > 1.96 };
  });
  return { test: 'Reliable Change Index', rci: indices, se: +se.toFixed(4), n, nImproved: indices.filter(i => i.rci > 1.96).length, nDeteriorated: indices.filter(i => i.rci < -1.96).length, apa: `RCI: ${indices.filter(i => i.sig).length} changed, n = ${n}` };
}

// ── Minimal Important Difference ───────────────────────────────────────────
export function minimalImportantDifference(scores, anchors, { method = 'anchor' } = {}) {
  if (!scores || !anchors || scores.length < 5 || scores.length !== anchors.length) return null;
  const n = scores.length;
  const diffs = scores.slice(1).map((s, i) => s - scores[i]);
  const anchorMean = avg(anchors);
  const anchorSD = sampleSD(anchors) || 1;
  const low = scores.filter((_, i) => anchors[i] < anchorMean - 0.5 * anchorSD);
  const high = scores.filter((_, i) => anchors[i] > anchorMean + 0.5 * anchorSD);
  const mid = low.length && high.length ? avg(high) - avg(low) : 0;
  return { test: 'Minimal Important Difference', mid: +mid.toFixed(4), n, nLow: low.length, nHigh: high.length, apa: `MID = ${mid.toFixed(3)}, n = ${n}` };
}

// ── Responder Analysis ─────────────────────────────────────────────────────
export function responderAnalysis(data, baselineVar, followUpVar, threshold, { groupVar = null } = {}) {
  if (!data || !data.length || !baselineVar || !followUpVar) return null;
  const n = data.length;
  const responders = data.filter(r => (+r[followUpVar] || 0) - (+r[baselineVar] || 0) >= threshold).length;
  if (groupVar) {
    const groups = [...new Set(data.map(r => r[groupVar]))];
    const byGroup = groups.map(g => {
      const memb = data.filter(r => r[groupVar] === g);
      const nResp = memb.filter(r => (+r[followUpVar] || 0) - (+r[baselineVar] || 0) >= threshold).length;
      return { group: g, n: memb.length, responders: nResp, pct: +(100 * nResp / memb.length).toFixed(1) };
    });
    return { test: 'Responder Analysis', overall: { n, responders, pct: +(100 * responders / n).toFixed(1) }, byGroup, threshold, apa: `Responders: ${responders}/${n} (${(100 * responders / n).toFixed(0)}%)` };
  }
  return { test: 'Responder Analysis', n, responders, pct: +(100 * responders / n).toFixed(1), threshold, apa: `Responders: ${responders}/${n} (${(100 * responders / n).toFixed(0)}%)` };
}

// ── EQ-5D Utility ──────────────────────────────────────────────────────────
export function eq5dIndex(domainScores, { country = 'UK' } = {}) {
  if (!domainScores || domainScores.length < 5) return null;
  // Simple mapping: 1 is best in each domain
  const scores = domainScores.map(d => Math.min(5, Math.max(1, d)));
  const sum = scores.reduce((s, v) => s + v, 0);
  const index = 1 - (sum - 5) * 0.051;
  return { test: 'EQ-5D Index', index: +index.toFixed(4), domains: scores, country, apa: `EQ-5D = ${index.toFixed(3)}` };
}

// ── Standardized Response Mean ─────────────────────────────────────────────
export function standardizedResponseMean(baseline, followUp) {
  if (!baseline || !followUp || baseline.length < 3 || baseline.length !== followUp.length) return null;
  const n = baseline.length;
  const diffs = baseline.map((b, i) => followUp[i] - b);
  const meanD = avg(diffs);
  const sdD = sampleSD(diffs) || 1;
  const srm = meanD / sdD;
  return { test: 'Standardized Response Mean', srm: +srm.toFixed(4), n, apa: `SRM = ${srm.toFixed(3)}, n = ${n}` };
}
