import { avg, sampleVar } from '../math/core.js';
import { mulberry32 } from '../math/rng.js';
import { lngamma } from '../math/distributions.js';

// ── Shannon Diversity ─────────────────────────────────────────────
/** @param {number[]} counts */
export function shannonDiversity(counts) {
  if (!counts || counts.length < 2) return null;
  const total = counts.reduce((s, v) => s + v, 0);
  if (!total) return null;
  const H = -counts.reduce((s, v) => { if (v > 0) { const p = v / total; return s + p * Math.log(p); } return s; }, 0);
  const evenness = counts.filter(c => c > 0).length > 1 ? H / Math.log(counts.filter(c => c > 0).length) : 0;
  return { test: 'Shannon Diversity', shannon: +H.toFixed(4), evenness: +evenness.toFixed(4), richness: counts.filter(c => c > 0).length, n: total, apa: `H' = ${H.toFixed(3)}, J = ${evenness.toFixed(3)}` };
}

// ── Simpson Diversity ─────────────────────────────────────────────
/** @param {number[]} counts */
export function simpsonDiversity(counts) {
  if (!counts || counts.length < 2) return null;
  const total = counts.reduce((s, v) => s + v, 0);
  if (!total) return null;
  const D = 1 - counts.reduce((s, v) => s + (v / total) ** 2, 0);
  const invD = 1 / (1 - D);
  return { test: 'Simpson Diversity', simpson: +D.toFixed(4), invSimpson: +invD.toFixed(2), n: total, apa: `D = ${D.toFixed(3)}, 1/D = ${invD.toFixed(1)}` };
}

// ── Chao1 Richness ────────────────────────────────────────────────
/** @param {number[]} counts */
export function chao1Richness(counts) {
  if (!counts || counts.length < 2) return null;
  const Sobs = counts.filter(c => c > 0).length;
  const singletons = counts.filter(c => c === 1).length;
  const doubletons = counts.filter(c => c === 2).length;
  const chao1 = Sobs + (singletons * (singletons - 1)) / (2 * (doubletons + 1));
  return { test: 'Chao1 Richness', chao1: +(Math.round(chao1)) .toFixed(0), sobs: Sobs, singletons, doubletons, apa: `Chao1 = ${Math.round(chao1)}, Sobs = ${Sobs}` };
}

// ── Species Accumulation ──────────────────────────────────────────
/** @param {number[][]} data site × species matrix. */
export function speciesAccumulation(data, { nPerm = 50, seed = 42 } = {}) {
  if (!data || !data.length) return null;
  const n = data.length;
  const rand = mulberry32(seed);
  // Mean cumulative richness over random sample orderings (Mao Tau style).
  const acc = Array(n).fill(0);
  for (let p = 0; p < nPerm; p++) {
    const order = [...data];
    for (let k = n - 1; k > 0; k--) { const m = Math.floor(rand() * (k + 1)); [order[k], order[m]] = [order[m], order[k]]; }
    const seen = new Set();
    for (let i = 0; i < n; i++) { seen.add(order[i]); acc[i] += seen.size; }
  }
  const curve = acc.map(v => +(v / nPerm).toFixed(4));
  return { test: 'Species Accumulation', curve, n, apa: `Accumulation: ${curve[n - 1].toFixed(1)} spp in ${n} samples` };
}

// ── Rarefaction ───────────────────────────────────────────────────
/** @param {Array<Record<string, any>>} data @param {number} sampleSize */
export function rarefaction(data, sampleSize) {
  if (!data || !data.length || sampleSize < 1 || sampleSize > data.length) return null;
  const n = data.length;
  const counts = {};
  data.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
  const Sobs = Object.keys(counts).length;
  // Hurlbert rarefaction: E[S_m] = Σ_i [1 − C(N−Nᵢ, m)/C(N, m)], the expected
  // number of species in a random subsample of size m (= sampleSize) from N.
  const lnC = (a, b) => (a < b ? -Infinity : lngamma(a + 1) - lngamma(b + 1) - lngamma(a - b + 1));
  const lnCN = lnC(n, sampleSize);
  let expected = 0;
  for (const k in counts) {
    const Ni = counts[k];
    const pAbsent = (n - Ni >= sampleSize) ? Math.exp(lnC(n - Ni, sampleSize) - lnCN) : 0;
    expected += 1 - pAbsent;
  }
  const raref = expected;
  return { test: 'Rarefaction', expectedSpecies: +raref.toFixed(2), sampleSize, nObserved: n, sobs: Sobs, apa: `Rarefaction: ${raref.toFixed(1)} spp at n=${sampleSize}` };
}

// ── Indicator Species Analysis ────────────────────────────────────
/** @param {Array<Record<string, any>>} data @param {string} speciesCol @param {string} groupCol */
export function indicatorSpecies(data, speciesCol, groupCol) {
  if (!data || data.length < 5 || !speciesCol || !groupCol) return null;
  const groups = [...new Set(data.map(r => r[groupCol]))];
  const species = [...new Set(data.map(r => r[speciesCol]))];
  const n = data.length;
  const results = species.map(sp => {
    const spData = data.filter(r => r[speciesCol] === sp);
    const totalSp = spData.length;
    const groupSpecificity = groups.map(g => {
      const inGroup = spData.filter(r => r[groupCol] === g).length;
      const groupSize = data.filter(r => r[groupCol] === g).length;
      const A = totalSp > 0 ? inGroup / totalSp : 0;
      const B = groupSize > 0 ? inGroup / groupSize : 0;
      return { group: g, A: +A.toFixed(4), B: +B.toFixed(4), indVal: +(A * B).toFixed(4) };
    });
    const best = groupSpecificity.reduce((b, g) => g.indVal > b.indVal ? g : b, groupSpecificity[0]);
    return { species: sp, ...best };
  });
  return { test: 'Indicator Species', results, nSpecies: species.length, nGroups: groups.length, apa: `ISA: ${species.length} species, ${groups.length} groups` };
}

// ── SIMPER Analysis ───────────────────────────────────────────────
/** @param {Array<Record<string, any>>} data @param {string[]} speciesCols @param {string} groupCol */
export function simperAnalysis(data, speciesCols, groupCol) {
  if (!data || data.length < 5 || !speciesCols || speciesCols.length < 2 || !groupCol) return null;
  const groups = [...new Set(data.map(r => r[groupCol]))];
  if (groups.length < 2) return null;
  const g1Data = data.filter(r => r[groupCol] === groups[0]);
  const g2Data = data.filter(r => r[groupCol] === groups[1]);
  const contributions = speciesCols.map(sp => {
    const m1 = avg(g1Data.map(r => +r[sp]));
    const m2 = avg(g2Data.map(r => +r[sp]));
    const diff = Math.abs(m1 - m2);
    const sd = Math.sqrt((sampleVar(g1Data.map(r => +r[sp])) + sampleVar(g2Data.map(r => +r[sp]))) / 2);
    return { species: sp, diff: +diff.toFixed(4), sd: +sd.toFixed(4), ratio: sd > 0 ? +(diff / sd).toFixed(4) : 0 };
  }).sort((a, b) => b.ratio - a.ratio);
  const totalDiff = contributions.reduce((s, c) => s + Math.abs(c.diff), 0);
  const withPct = contributions.map(c => ({ ...c, contribution: totalDiff > 0 ? +(c.diff / totalDiff).toFixed(4) : 0 }));
  return { test: 'SIMPER Analysis', contributions: withPct, groupsCompared: groups.slice(0, 2), apa: `SIMPER: ${withPct.length} species, ${groups[0]} vs ${groups[1]}` };
}

// ── adonis2 (Permutational MANOVA; Anderson 2001) ─────────────────
// PERMANOVA on Euclidean distances: pseudo-F from the between/within
// sum-of-squares partition, with a free-permutation null distribution
// (permute group labels nPerm times) for the p-value.
/** @param {Array<Record<string, any>>} data @param {string[]} speciesCols @param {string} groupCol */
export function adonis2(data, speciesCols, groupCol, { nPerm = 999, seed = 12345 } = {}) {
  if (!data || data.length < 5 || !speciesCols || speciesCols.length < 2 || !groupCol) return null;
  const n = data.length;
  const Y = data.map(r => speciesCols.map(s => +r[s]));
  const grandCentroid = Y[0].map((_, j) => avg(Y.map(r => r[j])));
  let ssTotal = 0;
  for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < grandCentroid.length; j++) s += (Y[i][j] - grandCentroid[j]) ** 2; ssTotal += s; }
  const groups = [...new Set(data.map(r => r[groupCol]))];
  const a = groups.length;
  if (a < 2) return null;

  // Pseudo-F for an arbitrary label assignment over the fixed observation matrix Y.
  const pseudoF = (labels) => {
    let ssGroup = 0;
    for (const g of groups) {
      const idx = []; for (let i = 0; i < n; i++) if (labels[i] === g) idx.push(i);
      if (!idx.length) continue;
      for (let j = 0; j < grandCentroid.length; j++) {
        let c = 0; for (const i of idx) c += Y[i][j]; c /= idx.length;
        ssGroup += idx.length * (c - grandCentroid[j]) ** 2;
      }
    }
    const ssRes = Math.max(ssTotal - ssGroup, 1e-12);
    return { ssGroup, F: (ssGroup / (a - 1)) / (ssRes / (n - a)) };
  };

  const labels = data.map(r => r[groupCol]);
  const obs = pseudoF(labels);
  const R2 = ssTotal > 0 ? obs.ssGroup / ssTotal : 0;

  // Permutation null: shuffle labels, count F_perm ≥ F_obs. p = (b+1)/(nPerm+1).
  const rng = mulberry32(seed);
  let ge = 0;
  for (let p = 0; p < nPerm; p++) {
    const perm = labels.slice();
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
    if (pseudoF(perm).F >= obs.F - 1e-12) ge++;
  }
  const pValue = (ge + 1) / (nPerm + 1);

  return {
    test: 'adonis2', R2: +R2.toFixed(4), F: +obs.F.toFixed(4),
    ssTotal: +ssTotal.toFixed(4), ssGroup: +obs.ssGroup.toFixed(4),
    p: +pValue.toFixed(4), nPerm,
    apa: `adonis2: R²=${R2.toFixed(3)}, pseudo-F(${a - 1}, ${n - a})=${obs.F.toFixed(2)}, p=${pValue.toFixed(3)} (${nPerm} perms)`,
  };
}

// ── Beta Dispersal (Homogeneity of dispersions) ───────────────────
/** @param {Array<Record<string, any>>} data @param {string[]} speciesCols @param {string} groupCol */
export function betadisper(data, speciesCols, groupCol) {
  if (!data || data.length < 5 || !speciesCols || !groupCol) return null;
  const groups = [...new Set(data.map(r => r[groupCol]))];
  const dispersions = groups.map(g => {
    const gData = data.filter(r => r[groupCol] === g);
    if (gData.length < 2) return null;
    const Y = gData.map(r => speciesCols.map(s => +r[s]));
    const centroid = Y[0].map((_, j) => avg(Y.map(r => r[j])));
    const dists = Y.map(row => {
      let s = 0;
      for (let j = 0; j < centroid.length; j++) s += (row[j] - centroid[j]) ** 2;
      return Math.sqrt(s);
    });
    return { group: g, n: gData.length, distance: +avg(dists).toFixed(4), sd: +Math.sqrt(sampleVar(dists)).toFixed(4) };
  }).filter(Boolean);
  return { test: 'Beta Dispersal', dispersions, apa: `Betadisper: ${dispersions.length} groups` };
}
