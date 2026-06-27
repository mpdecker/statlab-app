import { avg } from '../math/core.js';

// Shannon Diversity
export function shannonDiversity(counts) {
  if (!counts || counts.length < 2) return null;
  const total = counts.reduce((s, v) => s + v, 0);
  if (!total) return null;
  const H = -counts.reduce((s, v) => { if (v > 0) { const p = v / total; return s + p * Math.log(p); } return s; }, 0);
  const evenness = counts.filter(c => c > 0).length > 1 ? H / Math.log(counts.filter(c => c > 0).length) : 0;
  return { test: 'Shannon Diversity', shannon: +H.toFixed(4), evenness: +evenness.toFixed(4), richness: counts.filter(c => c > 0).length, n: total, apa: `H' = ${H.toFixed(3)}, J = ${evenness.toFixed(3)}` };
}

// Simpson Diversity
export function simpsonDiversity(counts) {
  if (!counts || counts.length < 2) return null;
  const total = counts.reduce((s, v) => s + v, 0);
  if (!total) return null;
  const D = 1 - counts.reduce((s, v) => s + (v / total) ** 2, 0);
  const invD = 1 / (1 - D);
  return { test: 'Simpson Diversity', simpson: +D.toFixed(4), invSimpson: +invD.toFixed(2), n: total, apa: `D = ${D.toFixed(3)}, 1/D = ${invD.toFixed(1)}` };
}

// Chao1 Richness
export function chao1Richness(counts) {
  if (!counts || counts.length < 2) return null;
  const Sobs = counts.filter(c => c > 0).length;
  const singletons = counts.filter(c => c === 1).length;
  const doubletons = counts.filter(c => c === 2).length;
  const chao1 = Sobs + (singletons * (singletons - 1)) / (2 * (doubletons + 1));
  return { test: 'Chao1 Richness', chao1: +(Math.round(chao1)) .toFixed(0), sobs: Sobs, singletons, doubletons, apa: `Chao1 = ${Math.round(chao1)}, Sobs = ${Sobs}` };
}

// Species Accumulation
export function speciesAccumulation(data, { nPerm = 50 } = {}) {
  if (!data || !data.length) return null;
  const n = data.length;
  const curve = [];
  for (let i = 0; i < n; i++) {
    const seen = new Set();
    for (let j = 0; j <= i; j++) seen.add(data[j]);
    curve.push({ n: i + 1, species: seen.size });
  }
  return { test: 'Species Accumulation', curve, n, apa: `Accumulation: ${curve[curve.length - 1].species} spp in ${n} samples` };
}

// Rarefaction
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
