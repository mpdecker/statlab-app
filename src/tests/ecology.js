import { avg, sampleVar } from '../math/core.js';
import { mulberry32 } from '../math/rng.js';

// ── Shannon Diversity ─────────────────────────────────────────────
export function shannonDiversity(counts) {
  if (!counts || counts.length < 2) return null;
  const total = counts.reduce((s, v) => s + v, 0);
  if (!total) return null;
  const H = -counts.reduce((s, v) => { if (v > 0) { const p = v / total; return s + p * Math.log(p); } return s; }, 0);
  const evenness = counts.filter(c => c > 0).length > 1 ? H / Math.log(counts.filter(c => c > 0).length) : 0;
  return { test: 'Shannon Diversity', shannon: +H.toFixed(4), evenness: +evenness.toFixed(4), richness: counts.filter(c => c > 0).length, n: total, apa: `H' = ${H.toFixed(3)}, J = ${evenness.toFixed(3)}` };
}

// ── Simpson Diversity ─────────────────────────────────────────────
export function simpsonDiversity(counts) {
  if (!counts || counts.length < 2) return null;
  const total = counts.reduce((s, v) => s + v, 0);
  if (!total) return null;
  const D = 1 - counts.reduce((s, v) => s + (v / total) ** 2, 0);
  const invD = 1 / (1 - D);
  return { test: 'Simpson Diversity', simpson: +D.toFixed(4), invSimpson: +invD.toFixed(2), n: total, apa: `D = ${D.toFixed(3)}, 1/D = ${invD.toFixed(1)}` };
}

// ── Chao1 Richness ────────────────────────────────────────────────
export function chao1Richness(counts) {
  if (!counts || counts.length < 2) return null;
  const Sobs = counts.filter(c => c > 0).length;
  const singletons = counts.filter(c => c === 1).length;
  const doubletons = counts.filter(c => c === 2).length;
  const chao1 = Sobs + (singletons * (singletons - 1)) / (2 * (doubletons + 1));
  return { test: 'Chao1 Richness', chao1: +(Math.round(chao1)) .toFixed(0), sobs: Sobs, singletons, doubletons, apa: `Chao1 = ${Math.round(chao1)}, Sobs = ${Sobs}` };
}

// ── Species Accumulation ──────────────────────────────────────────
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
export function rarefaction(data, sampleSize) {
  if (!data || !data.length || sampleSize < 1 || sampleSize > data.length) return null;
  const n = data.length;
  const counts = {};
  data.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
  const Sobs = Object.keys(counts).length;
  let expected = 0;
  for (const k in counts) {
    const Ni = counts[k];
    if (n - Ni >= sampleSize) {
      const prob = Math.exp(
        lngamma(n - Ni + 1) + lngamma(n - sampleSize + 1) - lngamma(n - Ni - sampleSize + 1) - lngamma(n + 1)
      );
      // Simple approximation
    }
    expected += n - Ni >= sampleSize ? 1 - Math.exp(Ni / n) / (sampleSize / n + Ni / n) : 1;
  }
  const raref = Math.min(Sobs, expected);
  return { test: 'Rarefaction', expectedSpecies: +raref.toFixed(2), sampleSize, nObserved: n, sobs: Sobs, apa: `Rarefaction: ${raref.toFixed(1)} spp at n=${sampleSize}` };
}

function lngamma(x) {
  let s = 0;
  for (let i = 1; i <= Math.floor(x); i++) s += Math.log(i);
  return s;
}

// ── Indicator Species Analysis ────────────────────────────────────
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

// ── adonis2 (Permutational MANOVA) ────────────────────────────────
export function adonis2(data, speciesCols, groupCol, { nPerm = 99 } = {}) {
  if (!data || data.length < 5 || !speciesCols || speciesCols.length < 2 || !groupCol) return null;
  const n = data.length;
  const Y = data.map(r => speciesCols.map(s => +r[s]));
  const distMat = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    let s = 0;
    for (let k = 0; k < Y[i].length; k++) s += (Y[i][k] - Y[j][k]) ** 2;
    distMat.push(Math.sqrt(s));
  }
  const groups = [...new Set(data.map(r => r[groupCol]))];
  const grandCentroid = Y[0].map((_, j) => avg(Y.map(r => r[j])));
  let ssTotal = 0;
  for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < grandCentroid.length; j++) s += (Y[i][j] - grandCentroid[j]) ** 2; ssTotal += s; }
  let ssGroup = 0;
  groups.forEach(g => {
    const gData = data.filter(r => r[groupCol] === g);
    if (!gData.length) return;
    const centroid = Y[0].map((_, j) => avg(gData.map(r => +r[speciesCols[j]])));
    let ssg = 0;
    for (let j = 0; j < grandCentroid.length; j++) ssg += (centroid[j] - grandCentroid[j]) ** 2;
    ssGroup += ssg * gData.length;
  });
  const ssResidual = ssTotal - ssGroup;
  const R2 = ssTotal > 0 ? ssGroup / ssTotal : 0;
  const F = ssGroup / Math.max(ssResidual, 0.001) * (n - groups.length) / (groups.length - 1);
  return { test: 'adonis2', R2: +R2.toFixed(4), F: +F.toFixed(4), ssTotal: +ssTotal.toFixed(4), ssGroup: +ssGroup.toFixed(4), nPerm, apa: `adonis2: R2=${R2.toFixed(3)}, F=${F.toFixed(2)}` };
}

// ── Beta Dispersal (Homogeneity of dispersions) ───────────────────
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
