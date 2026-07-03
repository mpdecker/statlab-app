import { avg, sampleSD, sampleVar, fmtP } from '../math/core.js';
import { lngamma, normalCDF, normalINV, chiPVal, digamma, trigamma } from '../math/distributions.js';
import { mulberry32 } from '../math/rng.js';

function qqPoints(sorted, invFn) {
  const n = sorted.length;
  const result = [];
  for (let i = 0; i < n; i++) {
    const p = (i + 0.5) / n;
    result.push({ theoretical: +invFn(p).toFixed(6), empirical: sorted[i] });
  }
  return result;
}

function aicBic(logLik, k, n) {
  return { AIC: +(-2 * logLik + 2 * k).toFixed(2), BIC: +(-2 * logLik + k * Math.log(n)).toFixed(2) };
}

export function fitNormal(sample) {
  if (!sample || sample.length < 3) return null;
  const n = sample.length, m = avg(sample), sd = sampleSD(sample);
  const seMean = sd / Math.sqrt(n), seSd = sd / Math.sqrt(2 * (n - 1));
  const logLik = -0.5 * n * Math.log(2 * Math.PI * sd * sd) - sample.reduce((s, x) => s + (x - m) ** 2, 0) / (2 * sd * sd);
  const info = aicBic(logLik, 2, n);
  const sorted = [...sample].sort((a, b) => a - b);
  return {
    distribution: 'Normal',
    parameters: { mean: +m.toFixed(6), sd: +sd.toFixed(6), seMean: +seMean.toFixed(6), seSd: +seSd.toFixed(6) },
    logLikelihood: +logLik.toFixed(4), ...info, n,
    qqData: qqPoints(sorted, (p) => m + sd * normalINV(p)),
    cdf: (x) => normalCDF((x - m) / sd),
    pdf: (x) => Math.exp(-0.5 * ((x - m) / sd) ** 2) / (sd * Math.sqrt(2 * Math.PI)),
    apa: `Normal(μ = ${m.toFixed(3)}, σ = ${sd.toFixed(3)}), n = ${n}`,
  };
}

export function fitExponential(sample) {
  if (!sample || sample.length < 3) return null;
  const n = sample.length, rate = 1 / avg(sample);
  if (rate <= 0) return null;
  const seRate = rate / Math.sqrt(n);
  const logLik = n * Math.log(rate) - rate * sample.reduce((s, x) => s + x, 0);
  const info = aicBic(logLik, 1, n);
  const sorted = [...sample].sort((a, b) => a - b);
  return {
    distribution: 'Exponential',
    parameters: { rate: +rate.toFixed(6), seRate: +seRate.toFixed(6) },
    logLikelihood: +logLik.toFixed(4), ...info, n,
    qqData: qqPoints(sorted, (p) => -Math.log(1 - p) / rate),
    cdf: (x) => x <= 0 ? 0 : 1 - Math.exp(-rate * x),
    pdf: (x) => x <= 0 ? 0 : rate * Math.exp(-rate * x),
    apa: `Exponential(λ = ${rate.toFixed(3)}), n = ${n}`,
  };
}

export function fitGamma(sample) {
  if (!sample || sample.length < 3 || sample.some(x => x <= 0)) return null;
  const n = sample.length, xbar = avg(sample);
  const logx = avg(sample.map(x => Math.log(x)));
  const s = Math.log(xbar) - logx;
  let shape = (3 - s + Math.sqrt((s - 3) ** 2 + 24 * s)) / (12 * s + 1e-10);
  if (!Number.isFinite(shape) || shape <= 0) shape = 1;
  let rate = shape / xbar;
  for (let iter = 0; iter < 50; iter++) {
    const digamma = Math.log(shape) - 1 / (2 * shape) - 1 / (12 * shape * shape);
    const trigamma = 1 / shape + 1 / (2 * shape * shape) + 1 / (6 * shape * shape * shape);
    const grad = n * (Math.log(rate) - digamma + logx) - rate * sample.reduce((s, x) => s + x, 0);
    const dshape = n * trigamma;
    const newShape = shape + (Math.log(xbar) - logx - Math.log(shape) + digamma) / (shape * trigamma + 1e-10);
    if (Math.abs(newShape - shape) < 1e-6) break;
    shape = Math.max(0.001, newShape);
    rate = shape / xbar;
  }
  const logLik = n * shape * Math.log(rate) - n * lngamma(shape) + (shape - 1) * sample.reduce((s, x) => s + Math.log(x), 0) - rate * sample.reduce((s, x) => s + x, 0);
  const seShape = Math.sqrt(shape / n) / rate;
  const seRate = Math.sqrt(rate * rate / (n * shape));
  const info = aicBic(logLik, 2, n);
  const sorted = [...sample].sort((a, b) => a - b);
  const gamCDF = (x) => {
    if (x <= 0) return 0;
    const s = shape, r = rate;
    let sum = 0, term = 1;
    for (let k = 0; k < 200; k++) { term *= r * x / (s + k); sum += term / Math.exp(lngamma(s + k + 1) - lngamma(s) - k * Math.log(r * x)); if (term < 1e-10) break; }
    return Math.min(1, Math.exp(-r * x + s * Math.log(r * x) - lngamma(s)) * (Math.exp(r * x) - 1 < 1 ? Math.exp(lngamma(s)) * sum : 0));
  };
  return {
    distribution: 'Gamma',
    parameters: { shape: +shape.toFixed(6), rate: +rate.toFixed(6), seShape: +seShape.toFixed(6), seRate: +seRate.toFixed(6) },
    logLikelihood: +logLik.toFixed(4), ...info, n,
    qqData: qqPoints(sorted, (p) => { let x = shape / rate; for (let tt = 0; tt < 30; tt++) { const fx = normalCDF((x - shape / rate) / Math.sqrt(shape / (rate * rate))); x -= (fx - p) / (Math.exp(-0.5 * ((x - shape / rate) / Math.sqrt(shape / (rate * rate))) ** 2) / Math.sqrt(2 * Math.PI * shape / (rate * rate)) + 1e-10); } return x; }),
    cdf: gamCDF,
    pdf: (x) => x <= 0 ? 0 : Math.exp(-rate * x + (shape - 1) * Math.log(x) + shape * Math.log(rate) - lngamma(shape)),
    apa: `Gamma(α = ${shape.toFixed(3)}, β = ${rate.toFixed(3)}), n = ${n}`,
  };
}

export function fitPoisson(sample) {
  if (!sample || sample.length < 3 || sample.some(x => !Number.isInteger(x) || x < 0)) return null;
  const n = sample.length, lambda = avg(sample);
  const seLambda = Math.sqrt(lambda / n);
  const logLik = sample.reduce((s, x) => s + x * Math.log(lambda + 1e-10) - lambda - lngamma(x + 1), 0);
  const info = aicBic(logLik, 1, n);
  const sorted = [...sample].sort((a, b) => a - b);
  const poisInv = (p) => { let x = Math.max(0, Math.floor(lambda)); let cp = 0; for (let k = 0; k < 500; k++) { cp += Math.exp(k * Math.log(lambda + 1e-10) - lambda - lngamma(k + 1)); if (cp >= p) return k; } return Math.floor(lambda); };
  return {
    distribution: 'Poisson',
    parameters: { lambda: +lambda.toFixed(6), seLambda: +seLambda.toFixed(6) },
    logLikelihood: +logLik.toFixed(4), ...info, n,
    qqData: qqPoints(sorted, poisInv),
    cdf: (x) => { let cp = 0; for (let k = 0; k <= Math.floor(x); k++) cp += Math.exp(k * Math.log(lambda + 1e-10) - lambda - lngamma(k + 1)); return Math.min(1, cp); },
    pdf: (x) => Number.isInteger(x) && x >= 0 ? Math.exp(x * Math.log(lambda + 1e-10) - lambda - lngamma(x + 1)) : 0,
    apa: `Poisson(λ = ${lambda.toFixed(3)}), n = ${n}`,
  };
}

export function fitBinomial(successes, trials) {
  if (!Number.isFinite(successes) || !Number.isFinite(trials) || trials < 1 || successes < 0 || successes > trials) return null;
  const p = successes / trials, seP = Math.sqrt(p * (1 - p) / trials);
  const logLik = successes * Math.log(p + 1e-10) + (trials - successes) * Math.log(1 - p + 1e-10) + lngamma(trials + 1) - lngamma(successes + 1) - lngamma(trials - successes + 1);
  const info = aicBic(logLik, 1, trials);
  return {
    distribution: 'Binomial',
    parameters: { p: +p.toFixed(6), seP: +seP.toFixed(6), n: trials },
    logLikelihood: +logLik.toFixed(4), ...info, n: trials,
    qqData: null,
    cdf: (x) => { let cp = 0; for (let k = 0; k <= Math.floor(x); k++) cp += Math.exp(lngamma(trials + 1) - lngamma(k + 1) - lngamma(trials - k + 1) + k * Math.log(p + 1e-10) + (trials - k) * Math.log(1 - p + 1e-10)); return Math.min(1, cp); },
    pdf: (x) => Number.isInteger(x) && x >= 0 && x <= trials ? Math.exp(lngamma(trials + 1) - lngamma(x + 1) - lngamma(trials - x + 1) + x * Math.log(p + 1e-10) + (trials - x) * Math.log(1 - p + 1e-10)) : 0,
    apa: `Binomial(p = ${p.toFixed(3)}, n = ${trials}), successes = ${successes}`,
  };
}

export function fitLogNormal(sample) {
  if (!sample || sample.length < 3 || sample.some(x => x <= 0)) return null;
  const logSample = sample.map(x => Math.log(x));
  const fit = fitNormal(logSample);
  if (!fit) return null;
  const n = sample.length;
  const mu = fit.parameters.mean, sigma = fit.parameters.sd;
  const seMu = sigma / Math.sqrt(n), seSigma = sigma / Math.sqrt(2 * (n - 1));
  const logLik = fit.logLikelihood - sample.reduce((s, x) => s + Math.log(x), 0);
  const info = aicBic(logLik, 2, n);
  const sorted = [...sample].sort((a, b) => a - b);
  return {
    distribution: 'Log-normal',
    parameters: { mu: +mu.toFixed(6), sigma: +sigma.toFixed(6), seMu: +seMu.toFixed(6), seSigma: +seSigma.toFixed(6) },
    logLikelihood: +logLik.toFixed(4), ...info, n,
    qqData: qqPoints(sorted, (p) => Math.exp(mu + sigma * normalINV(p))),
    cdf: (x) => x <= 0 ? 0 : normalCDF((Math.log(x) - mu) / sigma),
    pdf: (x) => x <= 0 ? 0 : Math.exp(-0.5 * ((Math.log(x) - mu) / sigma) ** 2) / (x * sigma * Math.sqrt(2 * Math.PI)),
    apa: `Log-normal(μ = ${mu.toFixed(3)}, σ = ${sigma.toFixed(3)}), n = ${n}`,
  };
}

export function fitWeibull(sample) {
  if (!sample || sample.length < 3 || sample.some(x => x <= 0)) return null;
  const n = sample.length;
  let shape = 1, scale = avg(sample);
  for (let iter = 0; iter < 80; iter++) {
    let gradS = 0, gradSc = 0, hessSS = 0, hessScSc = 0, hessSSc = 0;
    for (let i = 0; i < n; i++) {
      const x = sample[i], r = x / scale, logr = Math.log(r + 1e-10), rk = Math.pow(r, shape);
      gradS += 1 / shape + Math.log(x) - Math.log(scale) - logr * rk;
      gradSc += -shape / scale + shape * rk / scale;
      hessSS += -1 / (shape * shape) - rk * logr * logr;
      hessScSc += shape / (scale * scale) - shape * (shape + 1) * rk / (scale * scale);
      hessSSc += -1 / scale + rk / scale + shape * rk * logr / scale;
    }
    const grad = [gradS, gradSc];
    const det = hessSS * hessScSc - hessSSc * hessSSc;
    if (Math.abs(det) < 1e-10) break;
    const stepS = (grad[0] * hessScSc - grad[1] * hessSSc) / det;
    const stepSc = (grad[1] * hessSS - grad[0] * hessSSc) / det;
    shape -= stepS; scale -= stepSc;
    if (shape < 0.001) shape = 0.001;
    if (scale < 0.001) scale = 0.001;
    if (Math.abs(stepS) + Math.abs(stepSc) < 1e-6) break;
  }
  const logLik = sample.reduce((s, x) => s + Math.log(shape) + (shape - 1) * Math.log(x + 1e-10) - shape * Math.log(scale) - Math.pow(x / scale, shape), 0);
  const seShape = Math.sqrt(shape / n) / scale;
  const seScale = scale / Math.sqrt(n * shape);
  const info = aicBic(logLik, 2, n);
  const sorted = [...sample].sort((a, b) => a - b);
  return {
    distribution: 'Weibull',
    parameters: { shape: +shape.toFixed(6), scale: +scale.toFixed(6), seShape: +seShape.toFixed(6), seScale: +seScale.toFixed(6) },
    logLikelihood: +logLik.toFixed(4), ...info, n,
    qqData: qqPoints(sorted, (p) => scale * Math.pow(-Math.log(1 - p), 1 / shape)),
    cdf: (x) => x <= 0 ? 0 : 1 - Math.exp(-Math.pow(x / scale, shape)),
    pdf: (x) => x <= 0 ? 0 : (shape / scale) * Math.pow(x / scale, shape - 1) * Math.exp(-Math.pow(x / scale, shape)),
    apa: `Weibull(k = ${shape.toFixed(3)}, λ = ${scale.toFixed(3)}), n = ${n}`,
  };
}

export function fitUniform(sample) {
  if (!sample || sample.length < 3) return null;
  const n = sample.length, sorted = [...sample].sort((a, b) => a - b);
  const min = sorted[0], max = sorted[n - 1];
  const range = max - min;
  if (range <= 0) return null;
  const biasMin = min - range / (2 * n), biasMax = max + range / (2 * n);
  const seMin = range / (n * Math.sqrt(3)), seMax = range / (n * Math.sqrt(3));
  const logLik = -n * Math.log(range + 1e-10);
  const info = aicBic(logLik, 2, n);
  return {
    distribution: 'Uniform',
    parameters: { min: +biasMin.toFixed(6), max: +biasMax.toFixed(6), seMin: +seMin.toFixed(6), seMax: +seMax.toFixed(6) },
    logLikelihood: +logLik.toFixed(4), ...info, n,
    qqData: qqPoints(sorted, (p) => biasMin + p * (biasMax - biasMin)),
    cdf: (x) => x <= biasMin ? 0 : x >= biasMax ? 1 : (x - biasMin) / (biasMax - biasMin),
    pdf: (x) => x < biasMin || x > biasMax ? 0 : 1 / (biasMax - biasMin),
    apa: `Uniform[min = ${biasMin.toFixed(3)}, max = ${biasMax.toFixed(3)}], n = ${n}`,
  };
}

export function distributionGoF(sample, fitted, { test = 'KS', B = 999 } = {}) {
  if (!sample || sample.length < 5 || !fitted || !fitted.cdf) return null;
  const n = sample.length;
  const rng = mulberry32(42);

  function computeStat(cdfFn, data) {
    const sorted = [...data].sort((a, b) => a - b);
    if (test === 'KS') {
      let D = 0;
      for (let i = 0; i < n; i++) {
        D = Math.max(D, Math.abs((i + 1) / n - cdfFn(sorted[i])), Math.abs(i / n - cdfFn(sorted[i])));
      }
      return D;
    }
    let A2 = -n;
    for (let i = 0; i < n; i++) {
      const z = cdfFn(sorted[i]);
      A2 -= (2 * i + 1) * (Math.log(z + 1e-15) + Math.log(1 - cdfFn(sorted[n - 1 - i]) + 1e-15)) / n;
    }
    return A2;
  }

  const observed = computeStat(fitted.cdf, sample);
  const nullCDFs = Array.from({ length: B }, () => {
    const bootSample = Array.from({ length: n }, () => {
      const u = rng();
      let lo = fitted.parameters.min ?? 0, hi = fitted.parameters.max ?? fitted.parameters.mean + 10 * (fitted.parameters.sd ?? 1);
      for (let it = 0; it < 50; it++) {
        const mid = (lo + hi) / 2;
        if (fitted.cdf(mid) < u) lo = mid; else hi = mid;
      }
      return (lo + hi) / 2;
    });
    const cloned = { ...fitted, cdf: fitted.cdf };
    const refit = fitted.distribution === 'Normal' ? fitNormal(bootSample) :
      fitted.distribution === 'Exponential' ? fitExponential(bootSample) :
      fitted.distribution === 'Gamma' ? fitGamma(bootSample) :
      fitted.distribution === 'Poisson' ? fitPoisson(bootSample.map(Math.round)) :
      fitted.distribution === 'Log-normal' ? fitLogNormal(bootSample) :
      fitted.distribution === 'Weibull' ? fitWeibull(bootSample) :
      fitted.distribution === 'Uniform' ? fitUniform(bootSample) : null;
    return refit?.cdf ? computeStat(refit.cdf, bootSample) : 0;
  });
  let nExtreme = 1;
  for (const nullStat of nullCDFs) if (nullStat >= observed) nExtreme++;
  const pVal = nExtreme / (B + 1);
  return {
    test: `${test === 'KS' ? 'Kolmogorov-Smirnov' : 'Anderson-Darling'} GoF (bootstrap)`,
    statistic: +observed.toFixed(6),
    p: +pVal.toFixed(6),
    B,
    apa: `${test} = ${observed.toFixed(4)}, ${fmtP(pVal)}, B = ${B}`,
  };
}

export function fitBeta(sample) {
  if (!sample || sample.length < 3 || sample.some(x => x <= 0 || x >= 1)) return null;
  const n = sample.length;
  const xbar = avg(sample);
  const s2 = sample.reduce((s, x) => s + (x - xbar) ** 2, 0) / n;
  if (s2 <= 0 || s2 >= xbar * (1 - xbar)) return null;
  let alpha = xbar * (xbar * (1 - xbar) / s2 - 1);
  let beta = (1 - xbar) * (xbar * (1 - xbar) / s2 - 1);
  if (alpha <= 0.001) alpha = 0.001;
  if (beta <= 0.001) beta = 0.001;

  // Newton-Raphson on the Beta log-likelihood score equations
  // ∂ℓ/∂α = n·[ψ(α+β) − ψ(α) + mean(ln x)] = 0,
  // ∂ℓ/∂β = n·[ψ(α+β) − ψ(β) + mean(ln(1−x))] = 0,
  // using the real digamma/trigamma functions. The previous code used the
  // crude large-x asymptotic approximation ψ(x)≈ln(x)−1/(2x) directly (valid
  // only for x≫1), which is badly wrong for the α,β≈1–10 range typical of
  // Beta-fitted proportion data — the resulting wrong Hessian sent Newton's
  // method to a wildly divergent step, e.g. α≈290000 instead of the true
  // MLE α≈3.88 on a simple test sample (verified against scipy.stats.beta.fit).
  const gA = avg(sample.map(x => Math.log(x)));
  const gB = avg(sample.map(x => Math.log(1 - x)));
  for (let iter = 0; iter < 100; iter++) {
    const digAB = digamma(alpha + beta);
    const gradA = n * (gA - digamma(alpha) + digAB);
    const gradB = n * (gB - digamma(beta) + digAB);
    const trigAB = trigamma(alpha + beta);
    const hessAA = n * (trigAB - trigamma(alpha));
    const hessBB = n * (trigAB - trigamma(beta));
    const hessAB = n * trigAB;
    const detH = hessAA * hessBB - hessAB * hessAB;
    if (Math.abs(detH) < 1e-12) break;
    let stepA = (gradA * hessBB - gradB * hessAB) / detH;
    let stepB = (gradB * hessAA - gradA * hessAB) / detH;
    // Damp any step that would more than halve or double a parameter, to
    // avoid Newton overshoot when starting far from the optimum.
    const maxStep = 0.5 * Math.max(alpha, beta, 1);
    const stepNorm = Math.max(Math.abs(stepA), Math.abs(stepB));
    if (stepNorm > maxStep) { stepA *= maxStep / stepNorm; stepB *= maxStep / stepNorm; }
    alpha -= stepA; beta -= stepB;
    if (alpha < 0.001) alpha = 0.001;
    if (beta < 0.001) beta = 0.001;
    if (Math.abs(stepA) + Math.abs(stepB) < 1e-8) break;
  }
  const logLik = n * (Math.log(Math.exp(-(alpha + beta)) + 1e-10) - alpha * Math.log(beta + 1e-10)) + (alpha - 1) * sample.reduce((s, x) => s + Math.log(x + 1e-10), 0) + (beta - 1) * sample.reduce((s, x) => s + Math.log(1 - x + 1e-10), 0);
  const seAlpha = Math.sqrt(alpha / n) / beta;
  const seBeta = Math.sqrt(beta / n) / alpha;
  const info = { AIC: +(-2 * logLik + 4).toFixed(2), BIC: +(-2 * logLik + 2 * Math.log(n)).toFixed(2) };
  const sorted = [...sample].sort((a, b) => a - b);
  return {
    distribution: 'Beta',
    parameters: { alpha: +alpha.toFixed(6), beta: +beta.toFixed(6), seAlpha: +seAlpha.toFixed(6), seBeta: +seBeta.toFixed(6) },
    logLikelihood: +logLik.toFixed(4), ...info, n,
    qqData: null,
    cdf: (x) => x <= 0 ? 0 : x >= 1 ? 1 : Math.min(1, Math.exp(alpha * Math.log(x) + beta * Math.log(1 - x)) / Math.exp(alpha * Math.log(alpha) + beta * Math.log(beta) - Math.log(alpha + beta))),
    pdf: (x) => {
      if (x <= 0 || x >= 1) return 0;
      return Math.exp((alpha - 1) * Math.log(x) + (beta - 1) * Math.log(1 - x) + lngamma(alpha + beta) - lngamma(alpha) - lngamma(beta));
    },
    apa: `Beta(α = ${alpha.toFixed(3)}, β = ${beta.toFixed(3)}), n = ${n}`,
  };
}

// ── Anderson-Darling Test ──────────────────────────────────────────────────
export function andersonDarling(data, { distribution = 'normal' } = {}) {
  if (!data || data.length < 5) return null;
  const n = data.length;
  const sorted = [...data].sort((a, b) => a - b);
  let A2 = 0;

  if (distribution === 'exponential') {
    const lambda = n / sorted.reduce((s, v) => s + v, 0);
    for (let i = 0; i < n; i++) {
      const zi = 1 - Math.exp(-lambda * sorted[i]);
      const ri = 1 - Math.exp(-lambda * sorted[n - 1 - i]);
      A2 -= (2 * i + 1) * (Math.log(Math.max(zi, 1e-15)) + Math.log(Math.max(1 - ri, 1e-15)));
    }
    A2 = A2 / n - n;
    A2 *= (1 + 1.0 / n);
  } else {
    const mu = sorted.reduce((s, v) => s + v, 0) / n;
    const sig = Math.sqrt(sorted.reduce((s, v) => s + (v - mu) ** 2, 0) / n);
    if (!sig) return null;
    for (let i = 0; i < n; i++) {
      const zi = (sorted[i] - mu) / sig;
      const ri = (sorted[n - 1 - i] - mu) / sig;
      const cdf = 0.5 * (1 + erf(zi / Math.SQRT2));
      const cdfR = 0.5 * (1 + erf(ri / Math.SQRT2));
      A2 -= (2 * i + 1) * (Math.log(Math.max(cdf, 1e-15)) + Math.log(Math.max(1 - cdfR, 1e-15)));
    }
    A2 = A2 / n - n;
    A2 *= (1 + 0.75 / n + 2.25 / (n * n));
  }

  const p = A2 > 1.092 ? 0.01 : A2 > 0.752 ? 0.05 : A2 > 0.631 ? 0.10 : 0.5;
  const sig = p <= 0.01 ? '***' : p <= 0.05 ? '**' : p <= 0.10 ? '*' : 'n.s.';

  return {
    test: 'Anderson-Darling', statistic: +A2.toFixed(4), pValue: p, significance: sig, distribution, n,
    apa: `A-D = ${A2.toFixed(3)} [${sig}], ${distribution}, n = ${n}`,
  };
}

function erf(x) {
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return sign * y;
}

// ── Shapiro-Wilk ───────────────────────────────────────────────────────────
export function shapiroWilk(data) {
  if (!data || data.length < 4 || data.length > 5000) return null;
  const n = data.length;
  const sorted = [...data].sort((a, b) => a - b);
  const mu = sorted.reduce((s, v) => s + v, 0) / n;
  let ss = 0;
  for (const x of sorted) ss += (x - mu) ** 2;
  if (!ss) return null;

  // Blom scores for expected order statistics
  const m = Array(n).fill(0);
  for (let i = 0; i < n; i++) m[i] = normalScore((i + 1 - 0.375) / (n + 0.25));

  let sumM2 = 0;
  for (const mi of m) sumM2 += mi * mi;

  let sumXM = 0;
  for (let i = 0; i < n; i++) sumXM += m[i] * sorted[i];

  const W = sumM2 > 0 ? sumXM * sumXM / (ss * sumM2) : 0;

  // Royston p-value approximation
  let y = Math.log(1 - W);
  const muY = -1.5861 - 0.31082 * Math.log(n) - 0.083751 * Math.pow(Math.log(n), 2) + 0.0038915 * Math.pow(Math.log(n), 3);
  const sigmaY = Math.exp(0.4803 - 0.082676 * Math.log(n) + 0.0030302 * Math.pow(Math.log(n), 2));
  const z = (y - muY) / sigmaY;
  // P-value via normal approximation on z
  const p = Math.min(1, Math.max(0.0001, 0.5 * (1 - erf(z / Math.SQRT2))));

  return {
    test: 'Shapiro-Wilk', W: +W.toFixed(4), p, n,
    apa: `W = ${W.toFixed(4)}, ${p < 0.05 ? 'significant' : 'not significant'} (n = ${n})`,
  };
}

function normalScore(p) {
  let x = Math.sqrt(-2 * Math.log(Math.min(p, 1 - p)));
  x -= (2.515517 + 0.802853 * x + 0.010328 * x * x) / (1 + 1.432788 * x + 0.189269 * x * x + 0.001308 * x * x * x);
  return p < 0.5 ? -x : x;
}

// ── Cramér-von Mises ──────────────────────────────────────────────────────
export function cramerVonMises(data, { distribution = 'normal' } = {}) {
  if (!data || data.length < 5) return null;
  const n = data.length;
  const sorted = [...data].sort((a, b) => a - b);
  let w2 = 1 / (12 * n);

  const mu = sorted.reduce((s, v) => s + v, 0) / n;
  const sig = Math.sqrt(sorted.reduce((s, v) => s + (v - mu) ** 2, 0) / n);
  if (!sig) return null;

  for (let i = 0; i < n; i++) {
    const zi = (sorted[i] - mu) / sig;
    const cdf = 0.5 * (1 + erf(zi / Math.SQRT2));
    w2 += (cdf - (2 * i + 1) / (2 * n)) ** 2;
  }

  const p = w2 > 0.178 ? 0.01 : w2 > 0.126 ? 0.05 : w2 > 0.104 ? 0.10 : 0.5;
  const sigStr = p <= 0.01 ? '***' : p <= 0.05 ? '**' : p <= 0.10 ? '*' : 'n.s.';

  return {
    test: 'Cramér-von Mises', statistic: +w2.toFixed(4), pValue: p, significance: sigStr, distribution, n,
    apa: `CvM = ${w2.toFixed(3)} [${sigStr}], ${distribution}, n = ${n}`,
  };
}

// ── Lilliefors Test ───────────────────────────────────────────────────────
export function lilliefors(data) {
  if (!data || data.length < 5) return null;
  const n = data.length;
  const sorted = [...data].sort((a, b) => a - b);
  const mu = sorted.reduce((s, v) => s + v, 0) / n;
  const sig = Math.sqrt(sorted.reduce((s, v) => s + (v - mu) ** 2, 0) / n);
  if (!sig) return null;

  let D = 0;
  for (let i = 0; i < n; i++) {
    const zi = (sorted[i] - mu) / sig;
    const cdf = 0.5 * (1 + erf(zi / Math.SQRT2));
    const ecdf1 = (i + 1) / n;
    const ecdf0 = i / n;
    D = Math.max(D, Math.abs(ecdf1 - cdf), Math.abs(cdf - ecdf0));
  }

  const p = D > 0.886 / Math.sqrt(n) ? 0.05 : D > 0.805 / Math.sqrt(n) ? 0.10 : 0.5;

  return {
    test: 'Lilliefors', D: +D.toFixed(4), pValue: p, n,
    apa: `Lilliefors D = ${D.toFixed(3)}, ${p < 0.05 ? 'significant' : 'n.s.'}, n = ${n}`,
  };
}

// ── Chi-Square GOF ────────────────────────────────────────────────────────
export function chiSquareGOF(observed, { expected = null, nBins = null } = {}) {
  if (!observed || observed.length < 2) return null;
  const n = observed.length;

  if (expected) {
    if (expected.length !== n) return null;
    let chi2 = 0;
    for (let i = 0; i < n; i++) {
      if (expected[i] < 0.5 && chi2 < 1e9) { chi2 += 0; continue; }
      if (expected[i] > 0) chi2 += (observed[i] - expected[i]) ** 2 / expected[i];
    }
    const df = n - 1;
    const p = chiPVal(Math.max(0, chi2), Math.max(1, df));
    return {
      test: 'Chi-Square GOF', chi2: +chi2.toFixed(4), df, p, n,
      apa: `χ²(${df}) = ${chi2.toFixed(2)}, ${p < 0.05 ? 'significant' : 'n.s.'}, n = ${n}`,
    };
  }

  if (nBins) {
    const sorted = observed.slice().sort((a, b) => a - b);
    const mu = sorted.reduce((s, v) => s + v, 0) / n;
    const sig = Math.sqrt(sorted.reduce((s, v) => s + (v - mu) ** 2, 0) / n);
    if (!sig) return null;
    const counts = Array(nBins).fill(0);
    const edges = Array.from({ length: nBins - 1 }, (_, i) => mu + sig * (-3 + 6 * (i + 1) / nBins));
    for (const x of observed) {
      let idx = nBins - 1;
      for (let j = 0; j < edges.length; j++) if (x <= edges[j]) { idx = j; break; }
      counts[idx]++;
    }
    const expBin = n / nBins;
    if (expBin < 0.5) return null;
    let chi2 = 0;
    for (const c of counts) chi2 += (c - expBin) ** 2 / expBin;
    const df = nBins - 3;
    if (df < 1) return null;
    const p = chiPVal(Math.max(0, chi2), df);
    return {
      test: 'Chi-Square GOF', chi2: +chi2.toFixed(4), df, p, n,
      apa: `χ²(${df}) = ${chi2.toFixed(2)}, ${p < 0.05 ? 'significant' : 'n.s.'}, n = ${n}`,
    };
  }

  return null;
}

// ── Q-Q Correlation ───────────────────────────────────────────────────────
export function qqCorrelation(data, { distribution = 'normal' } = {}) {
  if (!data || data.length < 5) return null;
  const n = data.length;
  const sorted = [...data].sort((a, b) => a - b);
  const mu = sorted.reduce((s, v) => s + v, 0) / n;
  const sig = Math.sqrt(sorted.reduce((s, v) => s + (v - mu) ** 2, 0) / n);
  if (!sig) return null;

  const theoretical = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    const p = (i + 1 - 0.5) / n;
    theoretical[i] = erfInv(2 * p - 1) * Math.SQRT2;
  }

  let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
  for (let i = 0; i < n; i++) { sx += sorted[i]; sy += theoretical[i]; }
  const mx = sx / n, my = sy / n;
  for (let i = 0; i < n; i++) {
    sxx += (sorted[i] - mx) ** 2;
    syy += (theoretical[i] - my) ** 2;
    sxy += (sorted[i] - mx) * (theoretical[i] - my);
  }
  const r = sxy / Math.sqrt(Math.max(sxx * syy, 1e-10));
  const crit = 0.9 + 0.08 / Math.pow(n, 0.5);

  return {
    test: 'Q-Q Correlation', r: +r.toFixed(4), criticalR: +crit.toFixed(4), significant: r >= crit, distribution, n,
    apa: `Q-Q r = ${r.toFixed(3)} (critical = ${crit.toFixed(3)}), ${r >= crit ? 'normal' : 'non-normal'}, n = ${n}`,
  };
}

function erfInv(x) {
  const a = 0.147;
  const y = Math.log(1 - x * x);
  const z = 2 / (Math.PI * a) + y / 2;
  return Math.sqrt(Math.sqrt(z * z - y / a) - z) * Math.sign(x);
}
