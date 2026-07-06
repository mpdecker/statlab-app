import { avg, sampleSD, corr, fmtP } from '../math/core.js';
import { mulberry32, boxMullerN } from '../math/rng.js';
import { matInv } from '../math/matrix.js';
import { ibeta, lowerIncGamma } from '../math/distributions.js';

// Exact quantile (inverse CDF) of Beta(a,b) via bisection on the regularized
// incomplete beta CDF `ibeta`. Used for exact (skew-aware) credible intervals
// instead of a symmetric ±1.96·SD normal approximation, which can be
// meaningfully wrong for skewed posteriors (small counts/trials).
function betaQuantile(p, a, b) {
  let lo = 0, hi = 1;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (ibeta(a, b, mid) < p) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

// Exact quantile of Gamma(shape, rate) via bisection on the regularized lower
// incomplete gamma CDF: CDF(x) = lowerIncGamma(shape, rate·x).
function gammaQuantile(p, shape, rate) {
  let lo = 0, hi = Math.max(10, (shape / rate) * 20);
  while (lowerIncGamma(shape, rate * hi) < p) hi *= 2;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (lowerIncGamma(shape, rate * mid) < p) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/** @param {(params: number[]) => number} logPosterior @param {number[]} initialParams */
export function mcmc(logPosterior, initialParams, { nIter = 10000, nBurnin = 2000, stepSize = null } = {}) {
  if (!logPosterior || !initialParams || initialParams.length < 1) return null;
  if (nIter < nBurnin + 100) return null;
  const k = initialParams.length;
  const rng = mulberry32(42);
  const chains = Array.from({ length: k }, () => []);
  let current = [...initialParams];
  let currentLP = logPosterior(current);
  if (!Number.isFinite(currentLP)) return null;
  let acceptCount = 0;
  let adaptCov = Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => i === j ? 1 : 0));
  let adaptMean = [...current];
  let adaptN = 0;

  function propose(mean) {
    const z = boxMullerN(() => rng());
    const sd = (stepSize != null ? stepSize : 0.2) * (adaptN > 20 ? Math.sqrt(adaptCov[0][0]) : 1);
    return mean + z * sd;
  }

  for (let iter = -nBurnin; iter < nIter; iter++) {
    const proposal = current.map((v, j) => {
      if (stepSize != null) {
        const z = boxMullerN(() => rng());
        return v + z * stepSize;
      }
      if (adaptN > 20) {
        const z = Array.from({ length: k }, () => boxMullerN(() => rng()));
        return v + z[0] * Math.sqrt(Math.max(adaptCov[0][0], 0.01)) * 2.38 / Math.sqrt(k);
      }
      const z = boxMullerN(() => rng());
      return v + z * 0.2;
    });
    const proposalLP = logPosterior(proposal);
    if (Number.isFinite(proposalLP)) {
      const logAlpha = proposalLP - currentLP;
      if (Math.log(rng() + 1e-15) < logAlpha) {
        current = proposal;
        currentLP = proposalLP;
        if (iter >= 0) acceptCount++;
      }
    }
    if (iter >= 0) {
      for (let j = 0; j < k; j++) chains[j].push(current[j]);
    }
    if (iter < 0 && iter >= -nBurnin / 2) {
      adaptN++;
      const delta = current.map((v, j) => v - adaptMean[j]);
      for (let j = 0; j < k; j++) {
        adaptMean[j] += delta[j] / adaptN;
        for (let i = 0; i < k; i++) {
          adaptCov[i][j] += (delta[i] * delta[j] - adaptCov[i][j]) / adaptN;
        }
      }
    }
  }
  const acceptRate = acceptCount / nIter;
  return { chains, acceptRate: +acceptRate.toFixed(4), nIter, nBurnin };
}

/** @param {number[]} samples */
export function posteriorSummary(samples) {
  if (!samples || samples.length < 10) return null;
  const n = samples.length;
  const sorted = [...samples].sort((a, b) => a - b);
  const mean = avg(samples);
  const sd = sampleSD(samples);
  return {
    mean: +mean.toFixed(6),
    sd: +sd.toFixed(6),
    median: +sorted[Math.floor(n / 2)].toFixed(6),
    q025: +sorted[Math.floor(n * 0.025)].toFixed(6),
    q975: +sorted[Math.floor(n * 0.975)].toFixed(6),
    n,
  };
}

/** @param {number} [prob] @param {number[]} samples */
export function hpdInterval(samples, prob = 0.95) {
  if (!samples || samples.length < 10) return null;
  const sorted = [...samples].sort((a, b) => a - b);
  const n = sorted.length;
  const windowSize = Math.floor(prob * n);
  if (windowSize < 2) return null;
  let bestLo = 0, bestWidth = Infinity;
  for (let i = 0; i + windowSize <= n; i++) {
    const width = sorted[i + windowSize - 1] - sorted[i];
    if (width < bestWidth) { bestWidth = width; bestLo = i; }
  }
  return { lo: +sorted[bestLo].toFixed(6), hi: +sorted[bestLo + windowSize - 1].toFixed(6), prob };
}

/** @param {object} mcmcResult @param {(params: number[]) => number[]} logLikFn @param {number} nObservations */
export function waic(mcmcResult, logLikFn, nObservations) {
  if (!mcmcResult || !mcmcResult.chains || !mcmcResult.chains.length || !logLikFn || !nObservations) return null;
  const { chains } = mcmcResult;
  const S = chains[0].length;
  if (S < 10) return null;
  const n = nObservations;
  const lppd = Array(n).fill(0);
  const pWAIC = Array(n).fill(0);
  const sumLl = Array(n).fill(0);  // accumulate raw log-likelihoods for variance
  for (let s = 0; s < S; s++) {
    const params = chains.map(c => c[s]);
    for (let i = 0; i < n; i++) {
      const ll = logLikFn(i, params);
      const expLl = Math.exp(Math.min(ll, 50));
      lppd[i] += expLl;
      pWAIC[i] += ll * ll;
      sumLl[i] += ll;
    }
  }
  for (let i = 0; i < n; i++) {
    const avgExp = lppd[i] / S;
    lppd[i] = Math.log(Math.max(avgExp, 1e-15));
    const avgSq = pWAIC[i] / S;
    const meanLl = sumLl[i] / S;  // mean of raw log-likelihoods (not log-mean-exp)
    pWAIC[i] = avgSq - meanLl * meanLl;
  }
  const sumLppd = lppd.reduce((a, b) => a + b, 0);
  const sumPwaic = Math.max(0, pWAIC.reduce((a, b) => a + b, 0));
  const waicVal = -2 * sumLppd + 2 * sumPwaic;
  return { waic: +waicVal.toFixed(2), pWAIC: +sumPwaic.toFixed(2), lppd: +sumLppd.toFixed(2), n, s: S, apa: `WAIC = ${waicVal.toFixed(1)} (pWAIC = ${sumPwaic.toFixed(1)})` };
}

/** @param {number[]} data @param {number} priorMean @param {number} priorSD @param {number} knownSigma */
export function normalNormalPosterior(data, priorMean, priorSD, knownSigma) {
  if (!data || data.length < 1 || knownSigma <= 0) return null;
  const n = data.length, xbar = avg(data);
  const priorPrec = 1 / (priorSD * priorSD), dataPrec = n / (knownSigma * knownSigma);
  const postPrec = priorPrec + dataPrec;
  const postSD = 1 / Math.sqrt(postPrec);
  const postMean = (priorPrec * priorMean + dataPrec * xbar) / postPrec;
  return {
    posteriorMean: +postMean.toFixed(6),
    posteriorSD: +postSD.toFixed(6),
    credible95: [+(postMean - 1.96 * postSD).toFixed(6), +(postMean + 1.96 * postSD).toFixed(6)],
    n,
  };
}

/** @param {number[]} y @param {number[][]} X @param {number} [a0] @param {number} [b0] */
export function normalInverseGammaPosterior(y, X, a0 = 0.001, b0 = 0.001) {
  if (!y || !X || y.length < 2 || !X.length || X[0].length < 1) return null;
  const n = y.length, k = X[0].length;
  const XtX = Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) =>
    X.reduce((s, row) => s + row[i] * row[j], 0)));
  const XtY = Array.from({ length: k }, (_, i) => X.reduce((s, row, j) => s + row[i] * y[j], 0));
  const priorPrec = Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => i === j ? 1e-6 : 0));
  const postPrec = Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => XtX[i][j] + priorPrec[i][j]));
  const postPrecInv = matInv(postPrec);
  if (!postPrecInv) return null;
  const postMean = Array.from({ length: k }, (_, i) => postPrecInv.reduce((s, row, j) => s + row[i] * XtY[j], 0));
  const yty = y.reduce((s, v) => s + v * v, 0);
  const btXty = Array.from({ length: k }, (_, i) => postMean.reduce((s, v, j) => s + v * XtX[j][i], 0))
    .reduce((s, v, i) => s + v * postMean[i], 0);
  const aStar = a0 + n / 2;
  const bStar = b0 + 0.5 * (yty - btXty);
  const postSigma2 = bStar / (aStar - 1);
  const se = postMean.map((_, j) => Math.sqrt(postSigma2 * postPrecInv[j][j]));
  const coeffs = Array.from({ length: k }, (_, j) => ({
    posteriorMean: +postMean[j].toFixed(6),
    posteriorSD: +se[j].toFixed(6),
    credible95: [+(postMean[j] - 1.96 * se[j]).toFixed(6), +(postMean[j] + 1.96 * se[j]).toFixed(6)],
  }));
  return { coefficients: coeffs, sigma2: +postSigma2.toFixed(6), aStar, bStar, n, k };
}

/** @param {number} [priorAlpha] @param {number} [priorBeta] @param {number} successes @param {number} trials */
export function betaBinomialPosterior(successes, trials, priorAlpha = 1, priorBeta = 1) {
  if (!Number.isFinite(successes) || !Number.isFinite(trials) || trials < 1 || successes < 0 || successes > trials) return null;
  const postAlpha = priorAlpha + successes;
  const postBetaPrior = priorBeta + (trials - successes);
  const postMean = postAlpha / (postAlpha + postBetaPrior);
  const postVar = (postAlpha * postBetaPrior) / ((postAlpha + postBetaPrior) ** 2 * (postAlpha + postBetaPrior + 1));
  const postSD = Math.sqrt(postVar);
  // Exact 95% credible interval from the Beta(postAlpha, postBeta) quantiles
  // (previously a symmetric normal approximation, which is measurably wrong for
  // skewed posteriors — e.g. small trial counts — and can even fall outside [0,1]).
  const credible95 = [betaQuantile(0.025, postAlpha, postBetaPrior), betaQuantile(0.975, postAlpha, postBetaPrior)];
  return {
    posteriorAlpha: +postAlpha.toFixed(4),
    posteriorBeta: +postBetaPrior.toFixed(4),
    posteriorMean: +postMean.toFixed(6),
    posteriorSD: +postSD.toFixed(6),
    credible95: credible95.map(v => +v.toFixed(6)),
    successes, trials,
  };
}

/** @param {number} [priorShape] @param {number} [priorRate] @param {number[]} counts */
export function gammaPoissonPosterior(counts, priorShape = 1, priorRate = 1) {
  if (!counts || counts.length < 1) return null;
  const n = counts.length;
  const sumX = counts.reduce((s, v) => s + v, 0);
  const postShape = priorShape + sumX;
  const postRate = priorRate + n;
  const postMean = postShape / postRate;
  const postVar = postShape / (postRate * postRate);
  const postSD = Math.sqrt(postVar);
  // Exact 95% credible interval from the Gamma(postShape, postRate) quantiles
  // (previously a symmetric normal approximation, wrong for the right-skewed
  // Gamma posterior typical with small counts).
  const credible95 = [gammaQuantile(0.025, postShape, postRate), gammaQuantile(0.975, postShape, postRate)];
  return {
    posteriorShape: +postShape.toFixed(4),
    posteriorRate: +postRate.toFixed(4),
    posteriorMean: +postMean.toFixed(6),
    posteriorSD: +postSD.toFixed(6),
    credible95: credible95.map(v => +v.toFixed(6)),
    n, sumX,
  };
}

/** @param {number[]} counts @param {number[]|null} [priorAlpha] */
export function dirichletMultinomialPosterior(counts, priorAlpha = null) {
  if (!counts || counts.length < 1) return null;
  const sum = counts.reduce((s, v) => s + v, 0);
  const k = counts.length;
  const alpha = priorAlpha || Array(k).fill(1);
  if (alpha.length !== k) return null;
  const postAlpha = counts.map((c, i) => alpha[i] + c);
  const alpha0 = postAlpha.reduce((s, v) => s + v, 0);
  return {
    posteriorAlpha: postAlpha,
    posteriorMean: postAlpha.map(a => +(a / alpha0).toFixed(6)),
    posteriorSD: postAlpha.map(a => +Math.sqrt((a * (alpha0 - a)) / (alpha0 * alpha0 * (alpha0 + 1))).toFixed(6)),
    k, sum,
  };
}

/** @param {number[]} y @param {number[][]} X */
export function bayesianLinearRegression(y, X, { nIter = 0, nBurnin = 2000 } = {}) {
  if (!y || !X || y.length < 2 || !X.length || X[0].length < 1) return null;
  const n = y.length, k = X[0].length;

  if (nIter <= 0) {
    const conjugate = normalInverseGammaPosterior(y, X);
    if (!conjugate) return null;
    return {
      method: 'conjugate (Normal-Inverse-Gamma)',
      ...conjugate,
      apa: `Bayesian OLS: ${conjugate.coefficients.map((c, i) => `β${i} = ${c.posteriorMean.toFixed(4)} (${c.posteriorSD.toFixed(4)})`).join(', ')}, σ² = ${conjugate.sigma2.toFixed(4)}`,
    };
  }

  const XtX = Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) =>
    X.reduce((s, row) => s + row[i] * row[j], 0)));
  const XtY = Array.from({ length: k }, (_, i) => X.reduce((s, row, j) => s + row[i] * y[j], 0));
  const yty = y.reduce((s, v) => s + v * v, 0);
  const betaHat = Array(k).fill(0);
  if (k === 1) betaHat[0] = XtY[0] / (XtX[0][0] || 1);
  else {
    const XtXinv = matInv(XtX);
    if (XtXinv) for (let i = 0; i < k; i++) betaHat[i] = XtXinv[i].reduce((s, v, j) => s + v * XtY[j], 0);
  }

  function logPosterior(beta) {
    const pred = y.map((_, i) => X[i].reduce((s, x, j) => s + beta[j] * x, 0));
    const ssr = y.reduce((s, v, i) => s + (v - pred[i]) ** 2, 0);
    const logLike = -0.5 * n * Math.log(2 * Math.PI) - 0.5 * n * Math.log(ssr / n) - 0.5 * n;
    const logPrior = beta.reduce((s, b) => s - 0.5 * b * b * 0.001, 0);
    return logLike + logPrior;
  }

  const mcmcResult = mcmc(logPosterior, betaHat, { nIter, nBurnin });
  if (!mcmcResult) return null;
  const summaries = mcmcResult.chains.map(chain => posteriorSummary(chain));
  const intervals = mcmcResult.chains.map(chain => hpdInterval(chain));
  return {
    method: 'MCMC (adaptive Metropolis-Hastings)',
    coefficients: summaries.map((s, i) => ({
      posteriorMean: s.mean, posteriorSD: s.sd, posteriorMedian: s.median,
      credible95: intervals[i] ? [intervals[i].lo, intervals[i].hi] : null,
    })),
    acceptRate: mcmcResult.acceptRate,
    nIter, nBurnin, n, k,
    apa: `Bayesian OLS (MCMC): ${summaries.map((s, i) => `β${i} = ${s.mean.toFixed(4)} (${s.sd.toFixed(4)})`).join(', ')}, acc. = ${mcmcResult.acceptRate}`,
  };
}

// ── Bayes Factor (BIC approximation) ──────────────────────────────

/** @param {number} n @param {number} logLik0 @param {number} logLik1 @param {number} k0 @param {number} k1 */
export function bicBayesFactor(logLik0, logLik1, n, k0, k1) {
  if (!Number.isFinite(logLik0) || !Number.isFinite(logLik1) || n < 2) return null;
  const BIC0 = -2 * logLik0 + k0 * Math.log(n);
  const BIC1 = -2 * logLik1 + k1 * Math.log(n);
  const BF10 = Math.exp((BIC0 - BIC1) / 2);
  return {
    test: 'Bayes Factor (BIC approximation)',
    BF10: +BF10.toFixed(4),
    logBF10: +Math.log(BF10 + 1e-10).toFixed(4),
    BIC0: +BIC0.toFixed(2),
    BIC1: +BIC1.toFixed(2),
    interpretation: BF10 > 100 ? 'Decisive evidence for H1' : BF10 > 10 ? 'Strong evidence for H1' : BF10 > 3 ? 'Moderate evidence for H1' : BF10 > 1 ? 'Anecdotal evidence for H1' : BF10 > 1 / 3 ? 'Anecdotal evidence for H0' : BF10 > 1 / 10 ? 'Moderate evidence for H0' : BF10 > 1 / 100 ? 'Strong evidence for H0' : 'Decisive evidence for H0',
    apa: `BFâ‚â‚â‚€â‚Ž = ${BF10.toFixed(2)}${BF10 > 1 ? ' (H1 favored)' : ' (H0 favored)'}`,
  };
}

// ── Bayes Factor (Savage-Dickey) ──────────────────────────────────

/** @param {number[]} mcmcChain @param {number} nullValue @param {(x: number) => number} priorDensityFn */
export function savageDickeyBF(mcmcChain, nullValue, priorDensityFn) {
  if (!mcmcChain || mcmcChain.length < 10 || !priorDensityFn) return null;
  const n = mcmcChain.length;
  const priorDensity = priorDensityFn(nullValue);
  if (!Number.isFinite(priorDensity) || priorDensity <= 0) return null;

  const bw = 1.06 * sampleSD(mcmcChain) * Math.pow(n, -0.2) || 0.1;
  let postDensity = 0;
  for (let i = 0; i < n; i++) {
    const z = (nullValue - mcmcChain[i]) / bw;
    postDensity += Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI) / bw;
  }
  postDensity /= n;
  if (postDensity <= 0) return null;
  const BF01 = priorDensity / postDensity;
  const BF10 = 1 / BF01;

  return {
    test: 'Bayes Factor (Savage-Dickey)',
    BF10: +BF10.toFixed(4),
    logBF10: +Math.log(BF10 + 1e-10).toFixed(4),
    priorDensity: +priorDensity.toFixed(6),
    posteriorDensity: +postDensity.toFixed(6),
    interpretation: BF10 > 100 ? 'Decisive evidence for H1' : BF10 > 10 ? 'Strong evidence for H1' : BF10 > 3 ? 'Moderate evidence for H1' : BF10 > 1 ? 'Anecdotal evidence for H1' : BF10 > 1 / 3 ? 'Anecdotal evidence for H0' : BF10 > 1 / 10 ? 'Moderate evidence for H0' : BF10 > 1 / 100 ? 'Strong evidence for H0' : 'Decisive evidence for H0',
    apa: `BFâ‚â‚â‚€â‚Ž = ${BF10.toFixed(2)} (Savage-Dickey)${BF10 > 1 ? ' (H1 favored)' : ' (H0 favored)'}`,
  };
}

// ── Bayesian One-Way ANOVA ────────────────────────────────────────

/** @param {number[][]} groups */
export function bayesianANOVA(groups, { nIter = 2000, nBurnin = 500 } = {}) {
  if (!groups || groups.length < 2) return null;
  const J = groups.length;
  const ys = groups.flat();
  if (ys.length < J + 5) return null;
  const grandMean = avg(ys);
  const init = [grandMean, ...groups.map(avg), 1.0, sampleSD(ys) || 1.0];

  function logPosterior(theta) {
    const mu = theta[0];
    const mus = theta.slice(1, J + 1);
    const tau = Math.abs(theta[J + 1]) + 0.001;
    const sigma = Math.abs(theta[J + 2]) + 0.001;
    let ll = 0;
    for (let j = 0; j < J; j++) {
      for (const y of groups[j]) {
        const resid = (y - mus[j]) / sigma;
        ll += -0.5 * resid * resid - Math.log(sigma);
      }
      ll += -0.5 * ((mus[j] - mu) / tau) ** 2 - Math.log(tau);
    }
    ll += -0.5 * (mu / 10) ** 2;
    ll += -Math.log(tau + 0.001) - 0.5 / (tau * tau);
    ll += -Math.log(sigma + 0.001) - 0.5 / (sigma * sigma);
    return ll;
  }

  const mcmcResult = mcmc(logPosterior, init, { nIter, nBurnin });
  if (!mcmcResult) return null;
  const summaries = mcmcResult.chains.map(chain => posteriorSummary(chain));
  const intervals = mcmcResult.chains.map(chain => hpdInterval(chain));
  return {
    test: 'Bayesian One-Way ANOVA',
    grandMean: +summaries[0].mean.toFixed(4),
    groupMeans: summaries.slice(1, J + 1).map(s => +s.mean.toFixed(4)),
    tau: +summaries[J + 1].mean.toFixed(4),
    sigma: +summaries[J + 2].mean.toFixed(4),
    groupHDIs: intervals.slice(1, J + 1).map(int => int ? [int.lo, int.hi] : null),
    acceptRate: mcmcResult.acceptRate,
    nIter, nBurnin, J, N: ys.length,
    apa: `Bayesian ANOVA: grandMu = ${summaries[0].mean.toFixed(2)}, tau = ${summaries[J + 1].mean.toFixed(2)} (J = ${J}, N = ${ys.length})`,
  };
}

// ── Bayesian Mixed Model (RI) ─────────────────────────────────────

/** @param {number[]} y @param {number[][]} X @param {number[]} groupIdx */
export function bayesianMixedModel(y, X, groupIdx, { nIter = 2000, nBurnin = 500 } = {}) {
  if (!y || !X || !groupIdx || y.length < 5 || X.length !== y.length || X[0].length < 1) return null;
  const n = y.length, k = X[0].length;
  const groups = [...new Set(groupIdx)];
  const J = groups.length;
  if (J < 2) return null;

  const betaInit = Array(k).fill(0);
  const uInit = Array(J).fill(0);
  const init = [...betaInit, ...uInit, 1.0, sampleSD(y) || 1.0];

  function logPosterior(theta) {
    const beta = theta.slice(0, k);
    const u = theta.slice(k, k + J);
    const tau = Math.abs(theta[k + J]) + 0.001;
    const sigma = Math.abs(theta[k + J + 1]) + 0.001;
    let ll = 0;
    for (let i = 0; i < n; i++) {
      let pred = u[groups.indexOf(groupIdx[i])];
      for (let ij = 0; ij < k; ij++) pred += beta[ij] * X[i][ij];
      const resid = (y[i] - pred) / sigma;
      ll += -0.5 * resid * resid - Math.log(sigma);
    }
    for (let j = 0; j < J; j++) {
      ll += -0.5 * (u[j] / tau) ** 2 - Math.log(tau);
    }
    for (let j = 0; j < k; j++) ll += -0.5 * (beta[j] / 10) ** 2;
    ll += -Math.log(tau + 0.001) - 0.5 / (tau * tau);
    ll += -Math.log(sigma + 0.001) - 0.5 / (sigma * sigma);
    return ll;
  }

  const mcmcResult = mcmc(logPosterior, init, { nIter, nBurnin });
  if (!mcmcResult) return null;
  const summaries = mcmcResult.chains.map(chain => posteriorSummary(chain));
  const intervals = mcmcResult.chains.map(chain => hpdInterval(chain));
  const betaSummaries = summaries.slice(0, k).map((s, i) => ({
    posteriorMean: s.mean, posteriorSD: s.sd,
    credible95: intervals[i] ? [intervals[i].lo, intervals[i].hi] : null,
  }));
  return {
    test: 'Bayesian Mixed Model (RI)',
    method: 'MCMC',
    coefficients: betaSummaries,
    tau: +summaries[k + J].mean.toFixed(4),
    sigma: +summaries[k + J + 1].mean.toFixed(4),
    acceptRate: mcmcResult.acceptRate,
    nIter, nBurnin, n, k, J,
    apa: `Bayesian Mixed Model: b0 = ${betaSummaries[0].posteriorMean.toFixed(3)}, tau = ${summaries[k + J].mean.toFixed(3)} (J = ${J}, N = ${n})`,
  };
}

/** @param {number[]} y @param {number[][]} X */
export function bayesianLogisticRegression(y, X, { nIter = 5000, nBurnin = 1000, priorScale = 2.5 } = {}) {
  if (!y || !X || y.length < 10 || !X.length || X[0].length < 1) return null;
  if (y.some(v => v !== 0 && v !== 1)) return null;
  const n = y.length, k = X[0].length;
  const Xmat = X.map(row => [1, ...row]);
  const kFull = k + 1;

  const init = Array(kFull).fill(0);
  const logPosterior = (beta) => {
    let ll = 0;
    for (let i = 0; i < n; i++) {
      const xb = beta.reduce((s, b, j) => s + b * Xmat[i][j], 0);
      ll += y[i] * xb - Math.log(1 + Math.exp(xb));
    }
    let lp = 0;
    for (let j = 1; j < kFull; j++) lp -= 0.5 * beta[j] * beta[j] / (priorScale * priorScale);
    return ll + lp;
  };

  const mcmcResult = mcmc(logPosterior, init, { nIter, nBurnin });
  if (!mcmcResult) return null;
  const summaries = mcmcResult.chains.map(chain => posteriorSummary(chain));
  const intervals = mcmcResult.chains.map(chain => hpdInterval(chain));
  return {
    method: 'MCMC (logistic)',
    coefficients: summaries.map((s, i) => ({
      posteriorMean: s.mean, posteriorSD: s.sd, posteriorMedian: s.median,
      credible95: intervals[i] ? [intervals[i].lo, intervals[i].hi] : null,
    })),
    acceptRate: mcmcResult.acceptRate,
    nIter, nBurnin, n, k: kFull,
    apa: `Bayesian logistic regression: ${summaries.map((s, i) => `β${i} = ${s.mean.toFixed(4)} (${s.sd.toFixed(4)})`).join(', ')}, acc. = ${mcmcResult.acceptRate}`,
  };
}

/** @param {number[]} y @param {number[][]} X */
export function bayesianPoissonRegression(y, X, { nIter = 5000, nBurnin = 1000, priorScale = 2.5 } = {}) {
  if (!y || !X || y.length < 10 || !X.length || X[0].length < 1) return null;
  const n = y.length, k = X[0].length;
  const Xmat = X.map(row => [1, ...row]);
  const kFull = k + 1;

  const init = Array(kFull).fill(0);
  const logPosterior = (beta) => {
    let ll = 0;
    for (let i = 0; i < n; i++) {
      const xb = beta.reduce((s, b, j) => s + b * Xmat[i][j], 0);
      const lambda = Math.exp(xb);
      ll += y[i] * Math.log(lambda + 1e-10) - lambda;
    }
    let lp = 0;
    for (let j = 1; j < kFull; j++) lp -= 0.5 * beta[j] * beta[j] / (priorScale * priorScale);
    return ll + lp;
  };

  const mcmcResult = mcmc(logPosterior, init, { nIter, nBurnin });
  if (!mcmcResult) return null;
  const summaries = mcmcResult.chains.map(chain => posteriorSummary(chain));
  const intervals = mcmcResult.chains.map(chain => hpdInterval(chain));
  return {
    method: 'MCMC (Poisson)',
    coefficients: summaries.map((s, i) => ({
      posteriorMean: s.mean, posteriorSD: s.sd, posteriorMedian: s.median,
      credible95: intervals[i] ? [intervals[i].lo, intervals[i].hi] : null,
    })),
    acceptRate: mcmcResult.acceptRate,
    nIter, nBurnin, n, k: kFull,
    apa: `Bayesian Poisson regression: ${summaries.map((s, i) => `\u03B2${i} = ${s.mean.toFixed(4)} (${s.sd.toFixed(4)})`).join(', ')}, acc. = ${mcmcResult.acceptRate}`,
  };
}

// ── JZS Bayes Factor t-test ───────────────────────────────────────
/** @param {number[]} a @param {number[]} b */
export function jszBayesFactorT(a, b, { r = Math.SQRT1_2 } = {}) {
  if (!a || !b || a.length < 2 || b.length < 2) return null;
  const n1 = a.length, n2 = b.length;
  const m1 = avg(a), m2 = avg(b);
  const s1 = a.reduce((s, v) => s + (v - m1) ** 2, 0) / (n1 - 1);
  const s2 = b.reduce((s, v) => s + (v - m2) ** 2, 0) / (n2 - 1);
  const sp = Math.sqrt(((n1 - 1) * s1 + (n2 - 1) * s2) / (n1 + n2 - 2));
  if (!sp) return null;
  const t = (m1 - m2) / (sp * Math.sqrt(1 / n1 + 1 / n2));
  const nEff = n1 * n2 / (n1 + n2);
  const df = n1 + n2 - 2;
  const N = 100;
  let num = 0, den = 0;
  for (let i = 0; i < N; i++) {
    const u = (i + 0.5) / N;
    const g = Math.tan(Math.PI * (u - 0.5));
    const delta = g * r;
    const ncp = delta * Math.sqrt(nEff);
    const likeNum = Math.exp(-0.5 * (t - ncp) ** 2);
    const likeDen = Math.exp(-0.5 * t ** 2);
    const prior = 1 / (Math.PI * r * (1 + (delta / r) ** 2));
    const jacobian = Math.PI * (1 + g * g);
    num += likeNum * prior * jacobian / N;
    den += likeDen * prior * jacobian / N;
  }
  const bf10 = den > 0 ? num / den : 1;
  const bf01 = bf10 > 0 ? 1 / bf10 : Infinity;
  let label = bf10 > 100 ? 'decisive H1' : bf10 > 30 ? 'very strong H1' : bf10 > 10 ? 'strong H1' : bf10 > 3 ? 'moderate H1' : bf10 > 1 ? 'anecdotal H1' : bf01 > 100 ? 'decisive H0' : bf01 > 30 ? 'very strong H0' : bf01 > 10 ? 'strong H0' : bf01 > 3 ? 'moderate H0' : 'anecdotal';
  return {
    test: 'JZS Bayes Factor t-test',
    bf10: +bf10.toFixed(4),
    bf01: +bf01.toFixed(4),
    t: +t.toFixed(4),
    nEff: +nEff.toFixed(1),
    r,
    label,
    apa: `BF10 = ${bf10.toFixed(2)} [${label}], t(${df}) = ${t.toFixed(2)}, n1 = ${n1}, n2 = ${n2}`,
  };
}

// ── Bayesian DIC ──────────────────────────────────────────────────
/** @param {number[]} logLik @param {number} nParams @param {number[][]|null} [posteriorSamples] */
export function bayesianDIC(logLik, nParams, posteriorSamples = null) {
  if (!Number.isFinite(nParams) || nParams < 0) return null;
  if (!posteriorSamples) {
    if (!Number.isFinite(logLik)) return null;
    const dev = -2 * logLik;
    const pd = nParams;
    const dic = dev + pd;
    const dicAlt = dev + 2 * pd;
    return {
      test: 'Bayesian DIC',
      dic: +dic.toFixed(2),
      pd: +pd.toFixed(1),
      meanDeviance: +dev.toFixed(2),
      dicAlt: +dicAlt.toFixed(2),
      apa: `DIC = ${dic.toFixed(1)}, pD = ${pd.toFixed(1)}`,
    };
  }
  if (typeof logLik !== 'function') return null;
  const logLiks = posteriorSamples.map(s => {
    try { return logLik(s); } catch (e) { return null; }
  }).filter(v => Number.isFinite(v));
  if (!logLiks.length) return null;
  const meanDev = -2 * logLiks.reduce((s, v) => s + v, 0) / logLiks.length;
  // Use posterior mean parameters for devAtMean
  const meanParams = posteriorSamples[0].map((_, j) =>
    posteriorSamples.reduce((s, samp) => s + samp[j], 0) / posteriorSamples.length
  );
  const devAtMean = typeof logLik(meanParams) === 'number' ? -2 * logLik(meanParams) : meanDev;
  const pd = meanDev - devAtMean;
  const dic = meanDev + pd;
  return {
    test: 'Bayesian DIC',
    dic: +dic.toFixed(2),
    pd: +pd.toFixed(1),
    meanDeviance: +meanDev.toFixed(2),
    dicAlt: +(-2 * devAtMean + 2 * pd).toFixed(2),
    apa: `DIC = ${dic.toFixed(1)}, pD = ${pd.toFixed(1)}`,
  };
}

// ── Posterior Predictive Check ────────────────────────────────────
/** @param {number[]} yObs @param {number[][]} yRep */
export function posteriorPredictiveCheck(yObs, yRep, { stat = 'mean' } = {}) {
  if (!yObs || !yObs.length || !yRep || !yRep.length || yRep[0].length !== yObs.length) return null;
  if (yRep.length < 10) return null;
  const nObs = yObs.length;
  const nRep = yRep.length;
  let Tobs;
  if (stat === 'mean') Tobs = yObs.reduce((s, v) => s + v, 0) / nObs;
  else if (stat === 'max') Tobs = Math.max(...yObs);
  else if (stat === 'variance') {
    const m = yObs.reduce((s, v) => s + v, 0) / nObs;
    Tobs = yObs.reduce((s, v) => s + (v - m) ** 2, 0) / (nObs - 1);
  } else return null;
  const Treps = yRep.map(rep => {
    if (stat === 'mean') return rep.reduce((s, v) => s + v, 0) / nObs;
    if (stat === 'max') return Math.max(...rep);
    const m = rep.reduce((s, v) => s + v, 0) / nObs;
    return rep.reduce((s, v) => s + (v - m) ** 2, 0) / (nObs - 1);
  });
  const pRaw = Treps.filter(tv => tv >= Tobs).length / nRep;
  const ppp = Math.min(pRaw, 1 - pRaw) * 2;
  const sorted = [...Treps].sort((a, b) => a - b);
  return {
    test: 'Posterior Predictive Check',
    stat,
    ppp: +ppp.toFixed(4),
    obsStat: +Tobs.toFixed(4),
    repStats: {
      min: +sorted[0].toFixed(4),
      median: +sorted[Math.floor(nRep / 2)].toFixed(4),
      max: +sorted[nRep - 1].toFixed(4),
    },
    nRep,
    apa: `PPP = ${ppp.toFixed(3)} (${stat}), nRep = ${nRep}`,
  };
}

// ── BMA Regression ────────────────────────────────────────────────
/** @param {Array<Record<string, any>>} data @param {string} yVar @param {string[]} xCandidates */
export function bmaRegression(data, yVar, xCandidates, { nModels = null, seed = 42 } = {}) {
  if (!data || data.length < 15 || !yVar || !xCandidates || xCandidates.length < 2) return null;
  const n = data.length; const k = xCandidates.length;
  const maxM = nModels || Math.min(64, Math.pow(2, k));
  const y = data.map(r => +r[yVar]);
  const models = [];
  // Enumerate all or random subset
  for (let m = 0; m < maxM; m++) {
    const idx = Array.from({ length: k }, (_, i) => i).filter(i => (m >> i) & 1);
    if (!idx.length) continue;
    const vars = idx.map(i => xCandidates[i]);
    const X = vars.map(v => data.map(r => +r[v]));
    const p = vars.length;
    const XtX = Array.from({ length: p }, (_, i) =>
      Array.from({ length: p }, (_, j) =>
        X[i].reduce((s, _, a) => s + X[i][a] * X[j][a], 0)));
    const XtY = Array.from({ length: p }, (_, i) =>
      X[i].reduce((s, _, a) => s + X[i][a] * y[a], 0));
    const inv = matInv(XtX);
    if (!inv) continue;
    const beta = inv.map(row => row.reduce((s, v, j) => s + v * XtY[j], 0));
    const resid = y.map((yi, i) => yi - beta.reduce((s, b, j) => s + b * X[j][i], 0));
    const rss = resid.reduce((s, e) => s + e * e, 0);
    const bic = n * Math.log(rss / n) + (idx.length + 1) * Math.log(n);
    models.push({ vars, beta: beta.map(v => +v.toFixed(4)), bic, r2: 1 - rss / y.reduce((s, yi) => s + (yi - avg(y)) ** 2, 0) });
    if (maxM < Math.pow(2, k) && models.length >= maxM) break;
  }
  if (!models.length) return null;
  const minBic = Math.min(...models.map(m => m.bic));
  const weights = models.map(m => Math.exp(-(m.bic - minBic) / 2));
  const sumW = weights.reduce((s, v) => s + v, 0);
  models.forEach((m, i) => { m.weight = +(weights[i] / sumW).toFixed(4); });
  return { test: 'BMA Regression', models, nModels: models.length, n, apa: `BMA: ${models.length} models, n = ${n}` };
}

// ── Posterior Inclusion Probabilities ─────────────────────────────
/** @param {object} bmaResult */
export function posteriorInclusionProbs(bmaResult) {
  if (!bmaResult || !bmaResult.models) return null;
  const allVars = new Set(bmaResult.models.flatMap(m => m.vars));
  const pips = [...allVars].map(v => {
    const totalW = bmaResult.models.filter(m => m.vars.includes(v)).reduce((s, m) => s + m.weight, 0);
    return { variable: v, pip: +totalW.toFixed(4) };
  }).sort((a, b) => b.pip - a.pip);
  return { test: 'Posterior Inclusion Probabilities', pips, apa: `PIP: ${pips.slice(0, 3).map(p => `${p.variable}=${p.pip.toFixed(2)}`).join(', ')}` };
}

// ── BMA Predict ───────────────────────────────────────────────────
/** @param {object} bmaResult @param {Array<Record<string, any>>} newData */
export function bmaPredict(bmaResult, newData) {
  if (!bmaResult || !bmaResult.models || !newData) return null;
  const models = bmaResult.models;
  let pred = 0;
  models.forEach(m => {
    const x = m.vars.map(v => +newData[v] || 0);
    const yHat = m.beta.reduce((s, b, j) => s + b * x[j], 0);
    pred += m.weight * yHat;
  });
  return { test: 'BMA Prediction', prediction: +pred.toFixed(4), apa: `BMA pred = ${pred.toFixed(3)}` };
}

// ── BMA Summary ───────────────────────────────────────────────────
/** @param {object} bmaResult */
export function bmaSummary(bmaResult) {
  if (!bmaResult || !bmaResult.models || !bmaResult.models.length) return null;
  const allVars = new Set(bmaResult.models.flatMap(m => m.vars));
  const coefs = [...allVars].map(v => {
    const relevant = bmaResult.models.filter(m => m.vars.includes(v));
    const pip = relevant.reduce((s, m) => s + m.weight, 0);
    const postMean = relevant.reduce((s, m) => {
      const j = m.vars.indexOf(v);
      return s + m.weight * (m.beta[j] || 0);
    }, 0);
    const postSD = Math.sqrt(relevant.reduce((s, m) => {
      const j = m.vars.indexOf(v);
      return s + m.weight * ((m.beta[j] || 0) - postMean) ** 2;
    }, 0));
    return { variable: v, postMean: +postMean.toFixed(4), postSD: +postSD.toFixed(4), pip: +pip.toFixed(4) };
  });
  return { test: 'BMA Summary', coefficients: coefs, apa: `BMA: ${coefs.length} vars` };
}
