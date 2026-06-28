import { matInv } from './matrix.js';

/**
 * Central-difference gradient of a scalar function f(theta).
 * Step ~ eps·max(|θ|,1) (eps≈cube-root of machine precision) to balance
 * truncation against round-off.
 */
export function numericGradient(theta, f, eps = 1e-6) {
  const k = theta.length, g = Array(k).fill(0);
  for (let i = 0; i < k; i++) {
    const h = eps * Math.max(Math.abs(theta[i]), 1);
    const tp = theta.slice(), tm = theta.slice();
    tp[i] += h; tm[i] -= h;
    g[i] = (f(tp) - f(tm)) / (2 * h);
  }
  return g;
}

/**
 * Central-difference Hessian of a scalar function f(theta).
 * Step ~ eps·max(|θ|,1) with eps≈4th-root of machine precision; using a step
 * that does not collapse to eps² when a parameter is 0 avoids catastrophic
 * cancellation in the second difference.
 */
export function numericHessian(theta, f, eps = 1e-4) {
  const k = theta.length;
  const H = Array.from({ length: k }, () => Array(k).fill(0));
  for (let i = 0; i < k; i++) {
    const hi = eps * Math.max(Math.abs(theta[i]), 1);
    for (let j = i; j < k; j++) {
      const hj = eps * Math.max(Math.abs(theta[j]), 1);
      const tpp = theta.slice(), tpm = theta.slice(), tmp = theta.slice(), tmm = theta.slice();
      tpp[i] += hi; tpp[j] += hj;
      tpm[i] += hi; tpm[j] -= hj;
      tmp[i] -= hi; tmp[j] += hj;
      tmm[i] -= hi; tmm[j] -= hj;
      const v = (f(tpp) - f(tpm) - f(tmp) + f(tmm)) / (4 * hi * hj);
      H[i][j] = v; H[j][i] = v;
    }
  }
  return H;
}

/**
 * Maximum-likelihood fit by damped Newton-Raphson on a negative log-likelihood.
 * Returns { theta, cov, se, converged } where cov is the inverse observed
 * information (asymptotic covariance) and se = sqrt(diag(cov)).
 *
 * @param theta0    initial parameter vector
 * @param negLogLik function θ → −log L(θ) to minimise
 */
export function mleFit(theta0, negLogLik, { maxIter = 60, tol = 1e-7, ridge = 1e-8 } = {}) {
  let theta = theta0.slice();
  let bestNLL = negLogLik(theta);
  let converged = false;
  for (let iter = 0; iter < maxIter; iter++) {
    const g = numericGradient(theta, negLogLik);
    const H = numericHessian(theta, negLogLik);
    for (let d = 0; d < H.length; d++) H[d][d] += ridge; // keep PD
    const inv = matInv(H);
    if (!inv) break;
    const fullStep = inv.map(row => row.reduce((s, v, j) => s + v * g[j], 0));
    // Backtracking line search to guarantee descent of the NLL.
    let lambda = 1, accepted = false;
    for (let ls = 0; ls < 20; ls++) {
      const cand = theta.map((t, j) => t - lambda * fullStep[j]);
      const nll = negLogLik(cand);
      if (Number.isFinite(nll) && nll <= bestNLL + 1e-12) {
        const md = Math.max(...fullStep.map((s, j) => Math.abs(lambda * s)));
        theta = cand; bestNLL = nll; accepted = true;
        if (md < tol) converged = true;
        break;
      }
      lambda *= 0.5;
    }
    if (!accepted || converged) break;
  }
  const H = numericHessian(theta, negLogLik);
  const cov = matInv(H);
  const se = cov ? cov.map((r, i) => Math.sqrt(Math.max(0, r[i]))) : theta.map(() => NaN);
  return { theta, cov, se, converged };
}
