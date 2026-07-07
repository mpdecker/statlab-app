import { avg, sampleVar, fmtP } from '../math/core.js';
import { fPVal, tPVal } from '../math/distributions.js';
import { matInv, jacobiEigen } from '../math/matrix.js';
import { mulberry32 } from '../math/rng.js';

let __rng = mulberry32(42); // reseeded per stochastic call for reproducibility

function sourceRow(source, df, ss, ms, F, p) {
  return {
    source,
    df: df != null ? +df.toFixed(2) : null,
    ss: ss != null ? +ss.toFixed(4) : null,
    ms: ms != null ? +ms.toFixed(4) : null,
    F: F != null ? +F.toFixed(4) : null,
    p: p != null ? p : null,
  };
}

// ── Randomized Block ANOVA ────────────────────────────────────────

/** @param {Array<Record<string, any>>} data @param {{treatment?: string, block?: string, response?: string}} [options] */
export function randomizedBlockANOVA(data, { treatment, block, response } = {}) {
  if (!data || data.length < 4 || !treatment || !block || !response) return null;
  const gAvg = avg(data.map(r => +r[response]));
  const tLevels = [...new Set(data.map(r => r[treatment]))];
  const bLevels = [...new Set(data.map(r => r[block]))];
  const k = tLevels.length, b = bLevels.length, N = data.length;
  if (k < 2 || b < 2) return null;
  const ssTotal = data.reduce((s, r) => s + (+r[response] - gAvg) ** 2, 0);
  const tMeans = tLevels.map(t => avg(data.filter(r => r[treatment] === t).map(r => +r[response])));
  const ssTreat = tLevels.reduce((s, t, i) => s + data.filter(r => r[treatment] === t).length * (tMeans[i] - gAvg) ** 2, 0);
  const bMeans = bLevels.map(b => avg(data.filter(r => r[block] === b).map(r => +r[response])));
  const ssBlock = bLevels.reduce((s, bl, i) => s + data.filter(r => r[block] === bl).length * (bMeans[i] - gAvg) ** 2, 0);
  const ssError = ssTotal - ssTreat - ssBlock;
  const dfTreat = k - 1, dfBlock = b - 1, dfError = (k - 1) * (b - 1);
  const msTreat = ssTreat / dfTreat, msBlock = ssBlock / dfBlock, msError = ssError / dfError;
  const Ft = msTreat / msError, Fb = msBlock / msError;
  const sources = [
    sourceRow('Treatment', dfTreat, ssTreat, msTreat, Ft, fPVal(Ft, dfTreat, dfError)),
    sourceRow('Block', dfBlock, ssBlock, msBlock, Fb, fPVal(Fb, dfBlock, dfError)),
    sourceRow('Error', dfError, ssError, msError),
    sourceRow('Total', N - 1, ssTotal, null),
  ];
  return {
    test: 'Randomized Block ANOVA',
    sources,
    apa: `Randomized block: F(Treatment, ${dfTreat},${dfError}) = ${Ft.toFixed(2)}, ${fmtP(fPVal(Ft, dfTreat, dfError))}`,
  };
}

// ── Latin Square ANOVA ────────────────────────────────────────────

/** @param {number[][]} matrix */
export function latinSquareANOVA(matrix) {
  if (!matrix || !matrix.length || !matrix[0]?.length) return null;
  const r = matrix.length, c = matrix[0].length;
  if (r !== c || r < 3) return null;
  const all = matrix.flat();
  const gAvg = avg(all);
  const N = r * c;
  const ssTotal = all.reduce((s, v) => s + (v - gAvg) ** 2, 0);
  const rowMeans = matrix.map(row => avg(row));
  const ssRows = r * rowMeans.reduce((s, rm) => s + (rm - gAvg) ** 2, 0);
  const colMeans = Array.from({ length: c }, (_, j) => avg(matrix.map(row => row[j])));
  const ssCols = c * colMeans.reduce((s, cm) => s + (cm - gAvg) ** 2, 0);
  const tLevels = [...new Set(matrix.flatMap(row => row))];
  const k = tLevels.length;
  if (k < 2) return null;
  const tMeans = tLevels.map(t => {
    const vals = [];
    for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) if (matrix[i][j] === t) vals.push(matrix[i][j]);
    return avg(vals.length ? vals : [0]);
  });
  const ssTreat = k * tMeans.reduce((s, tm) => s + (tm - gAvg) ** 2, 0);
  const ssError = ssTotal - ssRows - ssCols - ssTreat;
  const dfR = r - 1, dfC = c - 1, dfT = k - 1, dfE = (r - 1) * (c - 1) - (k - 1);
  const msR = ssRows / dfR, msC = ssCols / dfC, msT = ssTreat / dfT, msE = ssError / Math.max(1, dfE);
  const sources = [
    sourceRow('Rows', dfR, ssRows, msR, msR / msE, fPVal(msR / msE, dfR, dfE)),
    sourceRow('Columns', dfC, ssCols, msC, msC / msE, fPVal(msC / msE, dfC, dfE)),
    sourceRow('Treatment', dfT, ssTreat, msT, msT / msE, fPVal(msT / msE, dfT, dfE)),
    sourceRow('Error', Math.max(1, dfE), ssError, msE),
    sourceRow('Total', N - 1, ssTotal, null),
  ];
  return {
    test: 'Latin Square ANOVA',
    sources,
    apa: `Latin square: F(Treatment, ${dfT},${dfE}) = ${(msT / msE).toFixed(2)}, ${fmtP(fPVal(msT / msE, dfT, dfE))}`,
  };
}

// ── Split-Plot ANOVA ──────────────────────────────────────────────

/** @param {Array<Record<string, any>>} data @param {{between?: string, within?: string, subject?: string, response?: string}} [options] */
export function splitPlotANOVA(data, { between, within, subject, response } = {}) {
  if (!data || data.length < 6 || !between || !within || !subject || !response) return null;
  const gAvg = avg(data.map(r => +r[response]));
  const bLevels = [...new Set(data.map(r => r[between]))];
  const wLevels = [...new Set(data.map(r => r[within]))];
  const subjects = [...new Set(data.map(r => r[subject]))];
  const a = bLevels.length, b = wLevels.length, s = subjects.length;
  if (a < 2 || b < 2 || s < 4) return null;
  const N = data.length;
  const ssTotal = data.reduce((s, r) => s + (+r[response] - gAvg) ** 2, 0);

  const bMeans = bLevels.map(bl => avg(data.filter(r => r[between] === bl).map(r => +r[response])));
  const nPerB = bLevels.map(bl => data.filter(r => r[between] === bl).length);
  const ssBetween = bLevels.reduce((ss, bl, i) => ss + nPerB[i] * (bMeans[i] - gAvg) ** 2, 0);

  const subMeans = subjects.map(sid => avg(data.filter(r => r[subject] === sid).map(r => +r[response])));
  const subGroups = subjects.map(sid => data.find(r => r[subject] === sid)?.[between]);
  let ssWholePlotError = 0;
  for (const bl of bLevels) {
    const groupSubs = subjects.filter((_, i) => subGroups[i] === bl);
    const gpMean = bMeans[bLevels.indexOf(bl)];
    for (const sid of groupSubs) {
      const sm = subMeans[subjects.indexOf(sid)];
      const nObs = s / a;
      ssWholePlotError += nObs * (sm - gpMean) ** 2;
    }
  }

  const wMeans = wLevels.map(wl => avg(data.filter(r => r[within] === wl).map(r => +r[response])));
  const nPerW = wLevels.map(wl => data.filter(r => r[within] === wl).length);
  const ssWithin = wLevels.reduce((ss, wl, i) => ss + nPerW[i] * (wMeans[i] - gAvg) ** 2, 0);

  let ssInteraction = 0;
  for (const bl of bLevels) for (const wl of wLevels) {
    const cellMean = avg(data.filter(r => r[between] === bl && r[within] === wl).map(r => +r[response]));
    const cellN = data.filter(r => r[between] === bl && r[within] === wl).length;
    ssInteraction += cellN * (cellMean - bMeans[bLevels.indexOf(bl)] - wMeans[wLevels.indexOf(wl)] + gAvg) ** 2;
  }

  const ssSubPlotError = ssTotal - ssBetween - ssWithin - ssWholePlotError - ssInteraction;
  const dfB = a - 1, dfWP = a * (s / a - 1), dfW = b - 1, dfI = (a - 1) * (b - 1), dfSP = N - a * b - dfWP;
  const msB = ssBetween / dfB, msWP = ssWholePlotError / dfWP, msW = ssWithin / dfW, msI = ssInteraction / dfI, msSP = ssSubPlotError / Math.max(1, dfSP);

  const sources = [
    sourceRow('Between (Treatment)', dfB, ssBetween, msB, msB / msWP, fPVal(msB / msWP, dfB, dfWP)),
    sourceRow('Whole-plot Error', dfWP, ssWholePlotError, msWP),
    sourceRow('Within (Time)', dfW, ssWithin, msW, msW / msSP, fPVal(msW / msSP, dfW, dfSP)),
    sourceRow('Interaction (B×W)', dfI, ssInteraction, msI, msI / msSP, fPVal(msI / msSP, dfI, dfSP)),
    sourceRow('Sub-plot Error', Math.max(1, dfSP), ssSubPlotError, msSP),
    sourceRow('Total', N - 1, ssTotal, null),
  ];
  return {
    test: 'Split-Plot ANOVA',
    sources,
    apa: `Split-plot: F(Between, ${dfB},${dfWP}) = ${(msB / msWP).toFixed(2)}, F(Within, ${dfW},${dfSP}) = ${(msW / msSP).toFixed(2)}`,
  };
}

// ── Crossover ANOVA ───────────────────────────────────────────────

/** @param {Array<Record<string, any>>} data @param {{subject?: string, period?: string, treatment?: string, response?: string, sequence?: string}} [options] */
export function crossoverANOVA(data, { subject, period, treatment, response, sequence } = {}) {
  if (!data || data.length < 4 || !subject || !period || !treatment || !response) return null;
  const gAvg = avg(data.map(r => +r[response]));
  const subs = [...new Set(data.map(r => r[subject]))];
  const periods = [...new Set(data.map(r => r[period]))];
  const treats = [...new Set(data.map(r => r[treatment]))];
  const N = data.length, s = subs.length, p = periods.length, t = treats.length;
  if (s < 2 || p < 2 || t < 2) return null;

  const ssTotal = data.reduce((ss, r) => ss + (+r[response] - gAvg) ** 2, 0);

  const subMeans = subs.map(sid => avg(data.filter(r => r[subject] === sid).map(r => +r[response])));
  const ssSubject = p * subMeans.reduce((ss, sm) => ss + (sm - gAvg) ** 2, 0);

  const pMeans = periods.map(per => avg(data.filter(r => r[period] === per).map(r => +r[response])));
  const ssPeriod = s * pMeans.reduce((ss, pm) => ss + (pm - gAvg) ** 2, 0);

  const tMeans = treats.map(trt => avg(data.filter(r => r[treatment] === trt).map(r => +r[response])));
  const ssTreat = treats.reduce((ss, trt, i) => ss + data.filter(r => r[treatment] === trt).length * (tMeans[i] - gAvg) ** 2, 0);

  let ssSeq = 0;
  if (sequence) {
    const seqs = [...new Set(data.map(r => r[sequence]))];
    const seqMeans = seqs.map(sq => avg(data.filter(r => r[sequence] === sq).map(r => +r[response])));
    ssSeq = seqs.reduce((ss, sq, i) => ss + data.filter(r => r[sequence] === sq).length * (seqMeans[i] - gAvg) ** 2, 0);
  }
  const dfS = s - 1, dfP = p - 1, dfT = t - 1, dfSeq = sequence ? [...new Set(data.map(r => r[sequence]))].length - 1 : 0;
  const dfE = N - dfS - dfP - dfT - dfSeq - 1;
  const ssError = ssTotal - ssSubject - ssPeriod - ssTreat - ssSeq;
  const msS = ssSubject / dfS, msP = ssPeriod / dfP, msT = ssTreat / dfT, msE = ssError / Math.max(1, dfE);
  const msSeq = dfSeq > 0 ? ssSeq / dfSeq : null;

  const sources = [];
  if (sequence && dfSeq > 0) sources.push(sourceRow('Sequence', dfSeq, ssSeq, msSeq, msSeq / msS, fPVal(msSeq / msS, dfSeq, dfS)));
  sources.push(sourceRow('Subject(Seq)', dfS, ssSubject, msS));
  sources.push(sourceRow('Period', dfP, ssPeriod, msP, msP / msE, fPVal(msP / msE, dfP, dfE)));
  sources.push(sourceRow('Treatment', dfT, ssTreat, msT, msT / msE, fPVal(msT / msE, dfT, dfE)));
  sources.push(sourceRow('Error', Math.max(1, dfE), ssError, msE));
  sources.push(sourceRow('Total', N - 1, ssTotal, null));

  return {
    test: 'Crossover ANOVA',
    sources,
    apa: `Crossover: F(Treatment, ${dfT},${dfE}) = ${(msT / msE).toFixed(2)}, ${fmtP(fPVal(msT / msE, dfT, dfE))}`,
  };
}

/** @param {Array<Record<string, any>>} data @param {{factors?: string[], response?: string}} [options] */
export function factorialANOVA(data, { factors, response } = {}) {
  if (!data || data.length < 4 || !factors || factors.length < 1 || !response) return null;
  const N = data.length;
  const gAvg = avg(data.map(r => +r[response]));
  const ssTotal = data.reduce((s, r) => s + (+r[response] - gAvg) ** 2, 0);

  function subsets(arr) {
    const result = [];
    for (let mask = 1; mask < (1 << arr.length); mask++) {
      const subset = [];
      for (let i = 0; i < arr.length; i++) if (mask & (1 << i)) subset.push(arr[i]);
      result.push(subset);
    }
    return result.sort((a, b) => a.length - b.length || a.join(':').localeCompare(b.join(':')));
  }

  const allTerms = subsets(factors);
  const termSS = {};
  const termDF = {};

  function calcTermSS(term) {
    const levels = term.map(f => [...new Set(data.map(r => r[f]))].sort());
    const combinations = levels.reduce((acc, lvls) => acc.flatMap(c => lvls.map(l => [...c, l])), [[]]);
    let ss = 0;
    for (const combo of combinations) {
      const subset = data.filter(r => term.every((f, i) => r[f] === combo[i]));
      if (!subset.length) continue;
      const cellMean = avg(subset.map(r => +r[response]));
      let adj = gAvg;
      for (const subTerm of allTerms) {
        if (subTerm === term) continue;
        if (subTerm.every(f => term.includes(f)) && subTerm.length < term.length) {
          if (termSS[subTerm.join(':')] !== undefined) continue;
          const subKey = subTerm.join(':');
          const subLevels = subTerm.map(f => combo[term.indexOf(f)]);
          const subSubset = data.filter(r => subTerm.every((f, i) => r[f] === subLevels[i]));
          if (subSubset.length) adj += avg(subSubset.map(r => +r[response])) - gAvg;
        }
      }
      ss += subset.length * (cellMean - gAvg) ** 2;
    }
    return ss;
  }

  for (const term of allTerms) {
    const key = term.join(':');
    termDF[key] = term.reduce((d, f) => d * ([...new Set(data.map(r => r[f]))].length - 1), 1);
    termSS[key] = calcTermSS(term);
    for (const subTerm of allTerms) {
      if (subTerm === term) continue;
      if (subTerm.every(f => term.includes(f)) && subTerm.length < term.length) {
        const subKey = subTerm.join(':');
        termSS[key] -= termSS[subKey] || 0;
      }
    }
  }

  let errorDF = N - 1;
  const sources = [];
  for (const term of allTerms) {
    const key = term.join(':');
    const df = termDF[key];
    const ss = Math.max(0, termSS[key]);
    const ms = ss / df;
    errorDF -= df;
    sources.push({ key, df, ss: +ss.toFixed(4), ms: +ms.toFixed(4) });
  }
  const errorSS = ssTotal - sources.reduce((s, src) => s + src.ss, 0);
  const msError = errorDF > 0 ? errorSS / errorDF : 1;
  const finalSources = sources.map(src => ({
    ...src,
    F: msError > 0 ? +(src.ms / msError).toFixed(4) : null,
    p: msError > 0 ? fPVal(src.ms / msError, src.df, errorDF) : null,
  }));
  const errorSrc = { key: 'Error', df: Math.max(1, errorDF), ss: +errorSS.toFixed(4), ms: +msError.toFixed(4), F: null, p: null };
  const sourcesRows = [...finalSources, errorSrc, { key: 'Total', df: N - 1, ss: +ssTotal.toFixed(4), ms: null, F: null, p: null }]
    .map(s => sourceRow(s.key, s.df, s.ss, s.ms, s.F, s.p));

  const treatTerm = finalSources[0];
  return {
    test: `${factors.length}-Way Factorial ANOVA`,
    sources: sourcesRows,
    apa: `Factorial ${factors.length}-way ANOVA: ${finalSources.map(s => `F(${s.key}) = ${s.F?.toFixed(2)}`).join(', ')}`,
  };
}

// ── Nested ANOVA ──────────────────────────────────────────────────────────────
/** @param {Array<Record<string, any>>} data @param {{primary?: string, nested?: string, response?: string}} [options] */
export function nestedANOVA(data, { primary, nested, response } = {}) {
  if (!data || data.length < 12 || !primary || !nested || !response) return null;
  const valid = data.filter(r => r[primary] != null && r[nested] != null && Number.isFinite(+r[response]));
  if (valid.length < 12) return null;
  const pLevels = [...new Set(valid.map(r => r[primary]))];
  if (pLevels.length < 2) return null;
  const nLevels = [...new Set(valid.map(r => r[nested]))];
  if (nLevels.length < 2) return null;

  const gAvg = avg(valid.map(r => +r[response]));
  const N = valid.length;
  const J = pLevels.length;
  const K = nLevels.length;
  const ssTotal = valid.reduce((s, r) => s + (+r[response] - gAvg) ** 2, 0);

  const pMeans = pLevels.map(pl => avg(valid.filter(r => r[primary] === pl).map(r => +r[response])));
  const ssPrimary = pLevels.reduce((s, pl, i) => {
    const group = valid.filter(r => r[primary] === pl);
    return s + group.length * (pMeans[i] - gAvg) ** 2;
  }, 0);

  const nWithin = pLevels.map(pl => [...new Set(valid.filter(r => r[primary] === pl).map(r => r[nested]))]);
  const nestedMeans = [];
  let ssNested = 0;
  for (let pi = 0; pi < pLevels.length; pi++) {
    for (const nl of nWithin[pi]) {
      const cell = valid.filter(r => r[primary] === pLevels[pi] && r[nested] === nl);
      if (!cell.length) continue;
      const cellMean = avg(cell.map(r => +r[response]));
      nestedMeans.push({ primary: pLevels[pi], nested: nl, mean: cellMean, n: cell.length });
      ssNested += cell.length * (cellMean - pMeans[pi]) ** 2;
    }
  }

  const ssError = ssTotal - ssPrimary - ssNested;
  const dfPrimary = J - 1;
  const dfNested = J * (K - 1);
  const dfError = N - J * K;
  if (dfError < 1) return null;

  const msPrimary = ssPrimary / dfPrimary;
  const msNested = ssNested / Math.max(1, dfNested);
  const msError = ssError / dfError;

  const Fprimary = msPrimary / Math.max(msNested, 1e-10);
  const Fnested = msNested / Math.max(msError, 1e-10);

  const sources = [
    sourceRow(primary, dfPrimary, ssPrimary, msPrimary, Fprimary, fPVal(Fprimary, dfPrimary, dfNested)),
    sourceRow(`${nested}(${primary})`, dfNested, ssNested, msNested, Fnested, fPVal(Fnested, dfNested, dfError)),
    sourceRow('Error', dfError, ssError, msError),
    sourceRow('Total', N - 1, ssTotal, null),
  ];

  return {
    test: 'Nested ANOVA',
    sources,
    n: N, J, K,
    apa: `Nested ANOVA: ${primary} F(${dfPrimary},${dfNested}) = ${Fprimary.toFixed(2)}, ${fmtP(fPVal(Fprimary, dfPrimary, dfNested))}`,
  };
}

// ── Repeated Measures (GLM / Profile Analysis) ────────────────────────────────
/** @param {Array<Record<string, any>>} data @param {{within?: string, subject?: string, response?: string}} [options] */
export function repeatedMeasuresGLM(data, { within, subject, response } = {}) {
  if (!data || data.length < 6 || !within || !subject || !response) return null;
  const valid = data.filter(r => r[within] != null && r[subject] != null && Number.isFinite(+r[response]));
  if (valid.length < 6) return null;
  const subs = [...new Set(valid.map(r => r[subject]))];
  const conds = [...new Set(valid.map(r => r[within]))];
  const k = conds.length;
  const n = subs.length;
  if (n < 3 || k < 2) return null;

  // Check balanced: each subject has each condition
  for (const sub of subs) {
    const subData = valid.filter(r => r[subject] === sub);
    if (subData.length !== k) return null;
    for (const cond of conds) {
      if (!subData.some(r => r[within] === cond)) return null;
    }
  }

  // Reshape into wide format
  const wide = subs.map(sub => conds.map(cond => {
    const row = valid.find(r => r[subject] === sub && r[within] === cond);
    return row ? +row[response] : null;
  }));

  // Any NaN => unbalanced
  if (wide.some(r => r.some(v => v == null || !Number.isFinite(v)))) return null;

  // Compute successive difference contrasts (profile analysis)
  const contrasts = wide.map(row => {
    const diffs = [];
    for (let j = 0; j < k - 1; j++) diffs.push(row[j] - row[j + 1]);
    return diffs;
  });

  const contrastMeans = contrasts[0].map((_, j) => avg(contrasts.map(r => r[j])));
  const contrastCov = Array.from({ length: k - 1 }, (_, i) =>
    Array.from({ length: k - 1 }, (_, j) => {
      const m_i = contrastMeans[i], m_j = contrastMeans[j];
      let s = 0;
      for (let t = 0; t < n; t++) s += (contrasts[t][i] - m_i) * (contrasts[t][j] - m_j);
      return s / (n - 1);
    })
  );

  // Hotelling's T²: T² = n * d̄' * S⁻¹ * d̄
  const invCov = matInv(contrastCov);
  if (!invCov) return null;
  let T2 = 0;
  for (let i = 0; i < k - 1; i++) {
    for (let j = 0; j < k - 1; j++) {
      T2 += contrastMeans[i] * invCov[i][j] * contrastMeans[j];
    }
  }
  T2 *= n;

  const df1 = k - 1;
  const df2 = n - k + 1;
  if (df2 <= 0) return null;
  const F = T2 * df2 / ((n - 1) * df1);
  const pFlat = fPVal(Math.abs(F), df1, df2);

  // Greenhouse-Geisser epsilon
  const evals = jacobiEigen(contrastCov).eigenvalues.filter(e => e > 1e-10);
  const sumEval = evals.reduce((s, e) => s + e, 0);
  const sumEvalSq = evals.reduce((s, e) => s + e * e, 0);
  const epsilon = evals.length > 1 ? sumEval * sumEval / ((k - 1) * sumEvalSq) : 1;
  const ggEps = Math.min(1, Math.max(1 / (k - 1), epsilon));

  const df1GG = df1 * ggEps;
  const df2GG = df2 * ggEps;
  const pGG = fPVal(Math.abs(F), df1GG, df2GG);

  // Multivariate tests: Pillai's trace & Wilks' lambda
  const H = outerVec(contrastMeans, n); // Hypothesis SSCP
  const E = contrastCov.map(r => r.map(v => v * (n - 1))); // Error SSCP
  const Tmat = Array.from({ length: k - 1 }, (_, i) =>
    Array.from({ length: k - 1 }, (_, j) => H[i][j] + E[i][j])
  );
  const invTmat = matInv(Tmat);
  let pillai = 0, wilks = 1;
  if (invTmat) {
    const HE = Array.from({ length: k - 1 }, (_, i) =>
      Array.from({ length: k - 1 }, (_, j) => {
        let s = 0;
        for (let t = 0; t < k - 1; t++) s += invTmat[i][t] * H[t][j];
        return s;
      })
    );
    const heEvals = jacobiEigen(HE).eigenvalues.filter(e => e > 1e-10);
    pillai = heEvals.reduce((s, e) => s + e, 0);
    for (const e of heEvals) wilks *= 1 / (1 + e);
  }
  const sPE = k - 1, sPH = 1, s = Math.min(sPE, sPH);
  const mPE = (k - 2) / 2, mPH = 0;
  const pillaiF = df2 > s ? (pillai / (s - pillai)) * ((df2 + sPE - s) / sPE) : 0;
  const pillaiP = pillaiF > 0 ? fPVal(pillaiF, s * sPE, s * (df2 + sPE - s)) : 1;
  const wilksF = df2 > 1 ? ((1 - wilks) / wilks) * (df2 / sPE) : 0;
  const wilksP = wilksF > 0 ? fPVal(wilksF, sPE, df2) : 1;

  return {
    test: 'Repeated Measures GLM',
    k, n,
    flatProfile: { t2: +T2.toFixed(4), f: +F.toFixed(4), df1, df2, p: pFlat, ggEpsilon: +ggEps.toFixed(4), ggP: pGG },
    multivariate: { pillai: +pillai.toFixed(4), pillaiF: +pillaiF.toFixed(4), pillaiP, wilks: +wilks.toFixed(4), wilksF: +wilksF.toFixed(4), wilksP },
    apa: `Repeated measures (${k} conditions, n=${n}): F(${df1},${df2}) = ${F.toFixed(2)}, ${fmtP(pFlat)}, GG-ε = ${ggEps.toFixed(3)}`,
  };
}

function outerVec(v, scalar = 1) {
  const n = v.length;
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => v[i] * v[j] * scalar)
  );
}

// ── Equivalence ANOVA ─────────────────────────────────────────────────────────
/** @param {number} [alpha] @param {number[][]} groups @param {number} dL @param {number} dU */
export function equivalenceANOVA(groups, dL, dU, alpha = 0.05) {
  if (!groups || groups.length < 2) return null;
  if (groups.some(g => !g || g.length < 3)) return null;
  if (dL >= dU) return null;

  const k = groups.length;
  const means = groups.map(g => avg(g));
  const vars = groups.map(g => sampleVar(g));
  const ns = groups.map(g => g.length);
  const tCrit = (() => {
    // TOST uses one-sided critical value at alpha
    const df = groups.reduce((s, g, i) => s + (vars[i] / ns[i]) ** 2 / (ns[i] - 1), 0);
    const denom = groups.reduce((s, g, i) => s + (vars[i] / ns[i]) ** 2 / (ns[i] - 1) ** 2 / (ns[i] - 1), 0);
    const dfWelch = denom > 0 ? df ** 2 / denom : ns[0] * 2 - 2;
    return tInvApprox(alpha, Math.floor(dfWelch));
  })();

  const pairs = [];
  let allEquivalent = true;
  for (let i = 0; i < k; i++) {
    for (let j = i + 1; j < k; j++) {
      const diff = means[i] - means[j];
      const se = Math.sqrt(vars[i] / ns[i] + vars[j] / ns[j]);
      const tLow = (diff - dL) / se;
      const tHigh = (dU - diff) / se;
      const dfW = Math.floor((vars[i] / ns[i] + vars[j] / ns[j]) ** 2 /
        ((vars[i] / ns[i]) ** 2 / (ns[i] - 1) + (vars[j] / ns[j]) ** 2 / (ns[j] - 1)));
      const pLow = tPVal(tLow, dfW);
      const pHigh = tPVal(tHigh, dfW);
      const equivalent = tLow > Math.abs(tCrit) && tHigh > Math.abs(tCrit);
      if (!equivalent) allEquivalent = false;
      pairs.push({ g1: i + 1, g2: j + 1, diff: +diff.toFixed(4), se: +se.toFixed(4),
        tLow: +tLow.toFixed(4), tHigh: +tHigh.toFixed(4), pLow, pHigh, equivalent });
    }
  }

  return {
    test: 'Equivalence ANOVA (TOST)',
    dL, dU, alpha,
    pairs,
    allEquivalent,
    apa: `Equivalence ANOVA: ${allEquivalent ? 'All pairs equivalent' : 'Not all pairs equivalent'} (dL=${dL}, dU=${dU}, α=${alpha})`,
  };
}

function tInvApprox(p, df) {
  if (df < 1) df = 1;
  if (p <= 0) return 10;
  if (p >= 1) return -10;
  return 1.96 + 2.38 / df;
}

// ── Central Composite Design ────────────────────────────────────────────────
/** @param {{name: string}[]} factors */
export function centralCompositeDesign(factors, { alpha = null, centerPoints = 2 } = {}) {
  if (!factors || factors.length < 2 || factors.length > 6) return null;
  const f = factors.length;
  const alphaVal = alpha != null ? alpha : Math.pow(f, 0.25);
  const runs = [];

  // Cube points: 2^f full factorial
  const nCube = Math.pow(2, f);
  for (let i = 0; i < nCube; i++) {
    const run = { type: 'cube' };
    factors.forEach((fac, j) => {
      const level = (i >> j) & 1 ? 1 : -1;
      run[fac.name] = level;
    });
    runs.push(run);
  }

  // Axial points: 2f
  for (let j = 0; j < f; j++) {
    factors.forEach((fac, k) => {
      const run1 = { type: 'axial' };
      const run2 = { type: 'axial' };
      factors.forEach((fac2, k2) => {
        run1[fac2.name] = k === k2 ? alphaVal : k2 === j ? -0 : 0;
        run2[fac2.name] = k === k2 ? -alphaVal : 0;
      });
      if (k === j) {
        runs.push(run1);
        runs.push(run2);
      }
    });
  }

  // Center points
  for (let i = 0; i < centerPoints; i++) {
    const run = { type: 'center' };
    factors.forEach(fac => { run[fac.name] = 0; });
    runs.push(run);
  }

  // Clean up axial: only set +-alpha on the axis, 0 on others
  // Rebuild axial properly
  runs.length = nCube;
  for (let j = 0; j < f; j++) {
    const posRun = { type: 'axial' };
    const negRun = { type: 'axial' };
    factors.forEach((fac, k) => {
      posRun[fac.name] = k === j ? alphaVal : 0;
      negRun[fac.name] = k === j ? -alphaVal : 0;
    });
    runs.push(posRun);
    runs.push(negRun);
  }
  for (let i = 0; i < centerPoints; i++) {
    const run = { type: 'center' };
    factors.forEach(fac => { run[fac.name] = 0; });
    runs.push(run);
  }

  const rotatable = Math.abs(alphaVal - Math.pow(nCube, 0.25)) < 0.01;

  return {
    test: 'Central Composite Design',
    runs,
    nRuns: runs.length,
    rotatable,
    nFactors: f,
    apa: `CCD: ${runs.length} runs (${nCube} cube + ${2*f} axial + ${centerPoints} center), ${f} factors, α = ${alphaVal.toFixed(2)}`,
  };
}

// ── D-Optimal Design ────────────────────────────────────────────────────────
/** @param {{name: string}[]} factors @param {number} nRuns */
export function optimalDesign(factors, nRuns, { model = 'linear+interaction', seed = 42 } = {}) {
  if (!factors || factors.length < 2 || nRuns < 2) return null;
  const f = factors.length;
  let nParams;
  if (model === 'linear') nParams = f + 1;
  else nParams = f + 1 + f * (f - 1) / 2;
  if (nRuns < nParams) return null;

  const rand = (s) => { let x = s; return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 2 ** 32; }; };
  const rng = rand(seed);

  // Start with random design
  const design = Array.from({ length: nRuns }, () => {
    const run = {};
    factors.forEach(fac => { run[fac.name] = (rng() - 0.5) * 2; });
    return run;
  });

  // Point exchange: iterate to maximize det(X'X)
  function modelMatrix(runs) {
    return runs.map(run => {
      const row = [1];
      factors.forEach(fac => row.push(run[fac.name]));
      if (model === 'linear+interaction') {
        for (let i = 0; i < f; i++) for (let j = i + 1; j < f; j++) row.push(run[factors[i].name] * run[factors[j].name]);
      }
      return row;
    });
  }

  for (let iter = 0; iter < 50; iter++) {
    let bestDet = -1, bestI = -1, bestRun = null;
    const X = modelMatrix(design);
    const XtX = X[0].map((_, j) => X[0].map((_, k) => X.reduce((s, r, a) => s + r[j] * r[k], 0)));
    const det0 = matInv(XtX) ? 1 / Math.abs(matInv(XtX).reduce((d, r, i) => d * r[i], 1)) : 0;

    for (let i = 0; i < nRuns; i++) {
      const newRun = {};
      factors.forEach(fac => { newRun[fac.name] = (rng() - 0.5) * 2; });
      const newDesign = design.map((r, k) => k === i ? newRun : r);
      const newX = modelMatrix(newDesign);
      const newXtX = newX[0].map((_, j) => newX[0].map((_, k) => newX.reduce((s, r, a) => s + r[j] * r[k], 0)));
      const inv = matInv(newXtX);
      if (inv) {
        let det = 1;
        for (let d = 0; d < inv.length; d++) det *= inv[d][d];
        if (det > bestDet) { bestDet = det; bestI = i; bestRun = newRun; }
      }
    }
    if (bestI >= 0 && bestRun) design[bestI] = bestRun;
    if (bestDet === 0) break;
  }

  const Xfinal = modelMatrix(design);
  const XtXf = Xfinal[0].map((_, j) => Xfinal[0].map((_, k) => Xfinal.reduce((s, r, a) => s + r[j] * r[k], 0)));
  const invF = matInv(XtXf);
  let dEff = 0;
  if (invF) { dEff = Math.pow(Math.abs(invF.reduce((d, r, i) => d * r[i], 1)), -1 / nParams); }

  return {
    test: 'Optimal Design',
    runs: design,
    dEfficiency: +dEff.toFixed(4),
    nRuns,
    nFactors: f,
    model,
    apa: `D-optimal: ${nRuns} runs, ${f} factors, D-eff = ${dEff.toFixed(2)}`,
  };
}

// ── Plackett-Burman Design ────────────────────────────────────────
/** @param {{name: string}[]} factors */
export function plackettBurman(factors) {
  if (!factors || factors.length < 2 || factors.length > 20) return null;
  const k = factors.length;
  // Use first k columns from standard PB array
  const base = [1, 1, -1, 1, 1, 1, -1, -1, -1, 1, -1, -1, -1, 1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1, -1, -1, 1, 1, 1, -1, -1];
  const N = Math.max(k + 1, (Math.floor(k / 4) + 1) * 4);
  const runs = [];
  for (let i = 0; i < N - 1; i++) {
    const run = { type: 'pb' };
    factors.forEach((f, j) => { run[f.name] = base[(i + j) % base.length]; });
    runs.push(run);
  }
  runs.push(factors.reduce((obj, f) => ({ ...obj, [f.name]: -1, type: 'pb' }), {}));
  return { test: 'Plackett-Burman', runs, nRuns: runs.length, nFactors: k, apa: `PB: ${runs.length} runs, ${k} factors` };
}

// ── Taguchi L-Array ───────────────────────────────────────────────
/** @param {{name: string}[]} factors @param {number[]} levels */
export function taguchiLArray(factors, levels) {
  if (!factors || factors.length < 2 || !levels || levels.length < 2) return null;
  const k = factors.length, L = levels.length;
  const nRuns = L ** Math.ceil(Math.log(k * (L - 1) + 1) / Math.log(L));
  if (nRuns > 500) return null;
  const runs = [];
  for (let i = 0; i < nRuns; i++) {
    const run = { type: 'taguchi' };
    let idx = i;
    factors.forEach(f => {
      run[f.name] = idx % L + 1;
      idx = Math.floor(idx / L);
    });
    runs.push(run);
  }
  return { test: 'Taguchi L-Array', runs, nRuns, nFactors: k, nLevels: L, apa: `L-array: ${nRuns} runs, ${k} factors at ${L} levels` };
}

// ── DOE Power ─────────────────────────────────────────────────────
/** @param {number} nFactors @param {number} [alpha] @param {number} nRuns @param {number} effectSize */
export function doePower(nFactors, nRuns, effectSize, alpha = 0.05) {
  if (!nFactors || nFactors < 2 || nRuns < nFactors + 2) return null;
  const dfError = nRuns - nFactors - 1;
  if (dfError < 1) return null;
  const ncp = nRuns * effectSize * effectSize / 4;
  const fCrit = 2.5;
  const power = Math.min(1, Math.max(0.05, (1 - Math.exp(-ncp / 2)) * (1 - 0.5 * Math.exp(-fCrit / 2))));
  return { test: 'DOE Power', power: +power.toFixed(4), nFactors, nRuns, effectSize, alpha, apa: `DOE power = ${power.toFixed(3)} for ${nFactors} factors, ${nRuns} runs` };
}

// ── Definitive Screening Design ───────────────────────────────────
/** @param {{name: string}[]} factors */
export function definitiveScreening(factors) {
  if (!factors || factors.length < 3) return null;
  const k = factors.length;
  const N = 2 * k + 1;
  const runs = [];
  for (let i = 0; i < k; i++) {
    const runP = { type: 'dsd' }, runN = { type: 'dsd' };
    factors.forEach((f, j) => {
      runP[f.name] = i === j ? 1 : 0;
      runN[f.name] = i === j ? -1 : 0;
    });
    runs.push(runP, runN);
  }
  runs.push(factors.reduce((obj, f) => ({ ...obj, [f.name]: 0, type: 'dsd' }), {}));
  return { test: 'Definitive Screening', runs, nRuns: runs.length, nFactors: k, apa: `DSD: ${runs.length} runs, ${k} factors` };
}

// ── Latin Hypercube Sampling ──────────────────────────────────────
/** @param {number} n @param {number} d */
export function latinHypercube(n, d, { seed = 42, range = [0, 1] } = {}) {
  __rng = mulberry32(seed);
  if (n < 2 || d < 1 || d > 10) return null;
  const samples = Array.from({length: n}, (_, i) => Array(d).fill(0));
  for (let j = 0; j < d; j++) {
    const perm = [...Array(n).keys()].sort(() => __rng() - 0.5);
    for (let i = 0; i < n; i++) {
      samples[i][j] = +((range[0] + (perm[i] + __rng()) * (range[1] - range[0]) / n).toFixed(4));
    }
  }
  return { test: 'Latin Hypercube', samples, n, d, apa: `LHS: ${n} points, ${d} dim` };
}

// ── Gaussian Process Emulator ─────────────────────────────────────
/** @param {number[][]} X @param {number[]} y */
export function gpEmulator(X, y, { lengthScale = 1, noiseVar = 0.01 } = {}) {
  if (!X || !y || X.length < 5 || y.length < 5) return null;
  const n = X.length;
  const K = Array.from({length: n}, (_, i) => Array.from({length: n}, (_, j) => {
    let s = 0;
    for (let k = 0; k < X[i].length; k++) s += (X[i][k] - X[j][k]) ** 2;
    return Math.exp(-0.5 * s / (lengthScale * lengthScale)) + (i === j ? noiseVar : 0);
  }));
  // GP posterior weights α = K⁻¹y (was a row-normalised K·y, not a linear solve).
  const Kinv = matInv(K);
  const alpha = Kinv ? Kinv.map(row => row.reduce((s, v, j) => s + v * y[j], 0))
    : K.map((row) => row.reduce((s, v, j) => s + v * y[j], 0) / Math.max(row.reduce((r, v) => r + v, 0), 1));
  const pred = X.map((xi, i) => {
    let s = 0;
    for (let j = 0; j < n; j++) {
      let d2 = 0;
      for (let k = 0; k < xi.length; k++) d2 += (xi[k] - X[j][k]) ** 2;
      s += alpha[j] * Math.exp(-0.5 * d2 / (lengthScale * lengthScale));
    }
    return +s.toFixed(4);
  });
  const rmse = Math.sqrt(pred.reduce((s, p, i) => s + (p - y[i]) ** 2, 0) / n);
  return { test: 'GP Emulator', predictions: pred.slice(0, 15), rmse: +rmse.toFixed(4), n, apa: `GP: RMSE=${rmse.toFixed(2)}, n=${n}` };
}

// ── Expected Improvement ──────────────────────────────────────────
/** @param {number[]} gpMean @param {number[]} gpStd @param {number} bestObserved */
export function expectedImprovement(gpMean, gpStd, bestObserved) {
  if (!gpMean || !gpStd || gpMean.length < 2) return null;
  const n = gpMean.length;
  const ei = gpMean.map((mu, i) => {
    const sig = Math.max(gpStd[i] || 0.01, 0.001);
    const z = (mu - bestObserved) / sig;
    const phi = Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
    return +((mu - bestObserved) * (0.5 + 0.5 * Math.tanh(z / Math.SQRT2)) + sig * phi).toFixed(6);
  });
  const bestIdx = ei.indexOf(Math.max(...ei));
  return { test: 'Expected Improvement', ei, bestIdx, bestObserved, n, apa: `EI: best index = ${bestIdx}` };
}
