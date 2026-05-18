import { avg, sampleSD, sampleVar, corr, rank, effR, effD, fmtP, sig } from '../math/core.js';
import { tPVal, fPVal, normalCDF, tInv2, lnBinom } from '../math/distributions.js';
import { matTrans, matMul, matInv } from '../math/matrix.js';

// ── Pearson r ─────────────────────────────────────────────────────────────────
export function pearsonTest(xs, ys) {
  if (xs.length < 3) return null;
  const n = xs.length, r = corr(xs, ys), t = r * Math.sqrt((n - 2) / (1 - r ** 2 + 1e-14));
  const df = n - 2, p = tPVal(t, df), r2 = r ** 2;
  const z = Math.atanh(r);
  const ciL = Math.tanh(z - 1.96 / Math.sqrt(n - 3)), ciH = Math.tanh(z + 1.96 / Math.sqrt(n - 3));
  return {
    test: "Pearson r", r: +r.toFixed(4), t: +t.toFixed(4), df, p, r2: +r2.toFixed(4),
    ciLo: +ciL.toFixed(4), ciHi: +ciH.toFixed(4), effR: effR(r), n,
    apa: `r(${df}) = ${r.toFixed(3)}, ${fmtP(p)}, r² = ${r2.toFixed(3)} [${effR(r)}], 95% CI [${ciL.toFixed(3)}, ${ciH.toFixed(3)}]`,
  };
}

// ── Spearman ρ ────────────────────────────────────────────────────────────────
export function spearman(xs, ys) {
  if (xs.length < 3) return null;
  const n = xs.length, rx = rank(xs), ry = rank(ys), rho = corr(rx, ry);
  const t = rho * Math.sqrt((n - 2) / (1 - rho ** 2 + 1e-14)), df = n - 2, p = tPVal(t, df);
  return {
    test: "Spearman ρ", rho: +rho.toFixed(4), t: +t.toFixed(4), df, p, effR: effR(rho), n,
    apa: `ρ(${df}) = ${rho.toFixed(3)}, ${fmtP(p)} [${effR(rho)}]`,
  };
}

// ── Kendall τ-b ───────────────────────────────────────────────────────────────
export function kendallTau(xs, ys) {
  if (xs.length < 3) return null;
  const n = xs.length; let C = 0, D = 0, Tx = 0, Ty = 0;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const dx = xs[i] - xs[j], dy = ys[i] - ys[j];
    if (dx === 0) Tx++;
    else if (dy === 0) Ty++;
    else if ((dx > 0 && dy > 0) || (dx < 0 && dy < 0)) C++;
    else D++;
  }
  const tau = (C - D) / Math.sqrt((C + D + Tx) * (C + D + Ty));
  const z = (3 * tau * Math.sqrt(n * (n - 1))) / Math.sqrt(2 * (2 * n + 5));
  const p = 2 * (1 - normalCDF(Math.abs(z)));
  return {
    test: "Kendall τ-b", tau: +tau.toFixed(4), z: +z.toFixed(4), p, C, D, n,
    apa: `τ = ${tau.toFixed(3)}, z = ${z.toFixed(2)}, ${fmtP(p)}`,
  };
}

// ── Partial correlation (controlling for Z) ───────────────────────────────────
export function partialCorr(xs, ys, zs) {
  if (xs.length < 4) return null;
  const r_xy = corr(xs, ys), r_xz = corr(xs, zs), r_yz = corr(ys, zs);
  const rp = (r_xy - r_xz * r_yz) / (Math.sqrt(1 - r_xz ** 2) * Math.sqrt(1 - r_yz ** 2) || 1);
  const n = xs.length, t = rp * Math.sqrt((n - 3) / (1 - rp ** 2 + 1e-14)), df = n - 3, p = tPVal(t, df);
  const semiX = (r_xy - r_xz * r_yz) / Math.sqrt(1 - r_xz ** 2) || 0;
  return {
    test: "Partial Correlation", rPartial: +rp.toFixed(4), rSemiX: +semiX.toFixed(4),
    r_xy: +r_xy.toFixed(4), r_xz: +r_xz.toFixed(4), r_yz: +r_yz.toFixed(4),
    t: +t.toFixed(4), df, p, n,
    apa: `Partial r = ${rp.toFixed(3)}, t(${df}) = ${t.toFixed(2)}, ${fmtP(p)} [controlling for Z]`,
  };
}

// ── Point-biserial r ──────────────────────────────────────────────────────────
export function pointBiserial(binary, cont) {
  if (binary.length < 3) return null;
  const n = binary.length;
  const groups = [0, 1].map(g => cont.filter((_, i) => binary[i] === g));
  const M0 = avg(groups[0]), M1 = avg(groups[1]);
  const sAll = Math.sqrt(sampleVar(cont));
  const p_ = groups[1].length / n, q_ = 1 - p_;
  const rpb = (M1 - M0) / (sAll || 1) * Math.sqrt(p_ * q_);
  const t = rpb * Math.sqrt((n - 2) / (1 - rpb ** 2 + 1e-14)), pv = tPVal(t, n - 2);
  return {
    test: "Point-Biserial r", rpb: +rpb.toFixed(4), t: +t.toFixed(4), df: n - 2, p: pv,
    n0: groups[0].length, n1: groups[1].length, M0: +M0.toFixed(4), M1: +M1.toFixed(4),
    effR: effR(rpb),
    apa: `r_pb = ${rpb.toFixed(3)}, t(${n - 2}) = ${t.toFixed(2)}, ${fmtP(pv)} [${effR(rpb)}]`,
  };
}

// ── Simple OLS ────────────────────────────────────────────────────────────────
export function simpleOLS(xs, ys) {
  const n = xs.length; if (n < 3) return null;
  const mx = avg(xs), my = avg(ys);
  const sxx = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  const sxy = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
  if (!sxx) return null;
  const b1 = sxy / sxx, b0 = my - b1 * mx;
  const fitted = xs.map(x => b1 * x + b0);
  const ssRes = ys.reduce((s, y, i) => s + (y - fitted[i]) ** 2, 0);
  const ssTot = ys.reduce((s, y) => s + (y - my) ** 2, 0);
  const r2 = ssTot ? 1 - ssRes / ssTot : 0;
  const adj = 1 - (1 - r2) * (n - 1) / (n - 2);
  const mse = ssRes / (n - 2), se = Math.sqrt(mse / sxx), t = b1 / se;
  const p = tPVal(t, n - 2), ci = tInv2(.05, n - 2) * se;
  const beta = (b1 * sampleSD(xs)) / (sampleSD(ys) || 1);
  const residuals = ys.map((y, i) => y - fitted[i]);
  const dw = residuals.slice(1).reduce((s, r, i) => s + (r - residuals[i]) ** 2, 0) /
    (residuals.reduce((s, r) => s + r ** 2, 0) || 1e-9);
  return {
    test: "Simple OLS", b0: +b0.toFixed(5), b1: +b1.toFixed(5), beta: +beta.toFixed(4),
    se: +se.toFixed(5), t: +t.toFixed(3), p, ci95: +ci.toFixed(5),
    r2: +r2.toFixed(4), adj: +adj.toFixed(4), r: +(Math.sqrt(Math.abs(r2)) * Math.sign(b1)).toFixed(4),
    n, mse: +mse.toFixed(5), durbinWatson: +dw.toFixed(4), residuals, fitted,
    coeffs: [
      { name: "Intercept", b: +b0.toFixed(5), se: +Math.sqrt(mse * (1 / n + mx * mx / sxx)).toFixed(5), t: null, p: null, sig: false },
      { name: "X", b: +b1.toFixed(5), beta: +beta.toFixed(4), se: +se.toFixed(5), t: +t.toFixed(3), p, sig: sig(p) },
    ],
    apa: `b = ${b1.toFixed(4)}, β = ${beta.toFixed(3)}, SE = ${se.toFixed(4)}, t(${n - 2}) = ${t.toFixed(2)}, ${fmtP(p)}, R² = ${r2.toFixed(3)}`,
  };
}

// ── Multiple OLS (with VIF, standardised β) ───────────────────────────────────
export function multipleOLS(Y, Xraw, names = []) {
  const n = Y.length, p = Xraw[0].length;
  if (n < p + 2) return null;
  const X = Xraw.map(r => [1, ...r]);
  const Xt = matTrans(X), XtX = matMul(Xt, X), XtXi = matInv(XtX);
  if (!XtXi) return null;
  const XtY = matMul(Xt, Y.map(v => [v])), beta = matMul(XtXi, XtY).map(b => b[0]);
  const fitted = X.map(row => row.reduce((s, x, j) => s + x * beta[j], 0));
  const ssRes = Y.reduce((s, y, i) => s + (y - fitted[i]) ** 2, 0);
  const ssTot = Y.reduce((s, y) => s + (y - avg(Y)) ** 2, 0);
  const r2 = ssTot ? 1 - ssRes / ssTot : 0;
  const adj = 1 - (1 - r2) * (n - 1) / (n - p - 1);
  const mse = ssRes / (n - p - 1);
  const sdY = sampleSD(Y), sdX = Xraw[0].map((_, j) => sampleSD(Xraw.map(r => r[j])));
  // VIF per predictor
  const vif = Xraw[0].map((_, j) => {
    if (p < 2) return 1;
    const Xj = Xraw.map(r => r[j]);
    const Xr = Xraw.map(r => r.filter((_, k) => k !== j));
    const rv = multipleOLS(Xj, Xr);
    return rv ? +(1 / (1 - rv.r2 + 1e-9)).toFixed(3) : 1;
  });
  const coeffs = beta.map((b, j) => {
    const se = Math.sqrt(mse * XtXi[j][j]), t = b / se, pv = tPVal(t, n - p - 1);
    const bs = j === 0 ? null : +(b * (sdX[j - 1] || 1) / sdY).toFixed(4);
    return { name: j === 0 ? "Intercept" : (names[j - 1] || `X${j}`), b: +b.toFixed(5), beta: bs, se: +se.toFixed(5), t: +t.toFixed(3), p: pv, sig: sig(pv), vif: j > 0 ? vif[j - 1] : null };
  });
  const F = (r2 / p) / ((1 - r2) / (n - p - 1)), pF = fPVal(F, p, n - p - 1);
  const residuals = Y.map((y, i) => y - fitted[i]);
  const dw = residuals.slice(1).reduce((s, r, i) => s + (r - residuals[i]) ** 2, 0) /
    (residuals.reduce((s, r) => s + r ** 2, 0) || 1e-9);
  return {
    test: "Multiple OLS", coeffs, r2: +r2.toFixed(4), adj: +adj.toFixed(4),
    F: +F.toFixed(4), df1: p, df2: n - p - 1, pF, mse: +mse.toFixed(5),
    n, residuals, fitted, durbinWatson: +dw.toFixed(4),
    apa: `R² = ${r2.toFixed(3)}, adj.R² = ${adj.toFixed(3)}, F(${p},${n - p - 1}) = ${F.toFixed(2)}, ${fmtP(pF)}`,
  };
}

// ── Polynomial regression ─────────────────────────────────────────────────────
export function polynomialOLS(xs, ys, degree = 2) {
  const Xraw = xs.map(x => Array.from({ length: degree }, (_, i) => x ** (i + 1)));
  const res = multipleOLS(ys, Xraw, Array.from({ length: degree }, (_, i) => `X^${i + 1}`));
  return res ? { ...res, test: `Polynomial OLS (deg ${degree})` } : null;
}

// ── Hierarchical regression (model comparison) ────────────────────────────────
export function hierarchicalOLS(Y, X1raw, X2raw, n1, n2) {
  const m1 = multipleOLS(Y, X1raw, n1);
  const combined = X1raw.map((r, i) => [...r, ...X2raw[i]]);
  const m2 = multipleOLS(Y, combined, [...n1, ...n2]);
  if (!m1 || !m2) return null;
  const dr2 = m2.r2 - m1.r2, dfChange = X2raw[0].length, dfErr = Y.length - X1raw[0].length - X2raw[0].length - 1;
  const F_change = (dr2 / dfChange) / ((1 - m2.r2) / dfErr), p_change = fPVal(F_change, dfChange, dfErr);
  return {
    test: "Hierarchical OLS",
    model1: { r2: m1.r2, adj: m1.adj, F: m1.F, p: m1.pF },
    model2: { r2: m2.r2, adj: m2.adj, F: m2.F, p: m2.pF },
    deltaR2: +dr2.toFixed(4), F_change: +F_change.toFixed(4),
    dfChange, dfErr, p_change, coeffsM2: m2.coeffs,
    residuals: m2.residuals, fitted: m2.fitted,
    apa: `ΔR² = ${dr2.toFixed(3)}, F(${dfChange},${dfErr}) = ${F_change.toFixed(2)}, ${fmtP(p_change)}`,
  };
}

// ── Logistic regression (Newton-Raphson) ──────────────────────────────────────
export function logisticReg(Y, Xraw, names = []) {
  const n = Y.length, p = Xraw[0].length;
  if (n < p + 5) return null;
  const X = Xraw.map(r => [1, ...r]);
  let beta = Array(p + 1).fill(0);
  const sig_ = z => 1 / (1 + Math.exp(-Math.max(-20, Math.min(20, z))));
  for (let it = 0; it < 200; it++) {
    const grad = Array(p + 1).fill(0);
    const H = Array.from({ length: p + 1 }, () => Array(p + 1).fill(0));
    X.forEach((row, i) => {
      const mu = sig_(row.reduce((s, x, j) => s + x * beta[j], 0));
      const e = Y[i] - mu, w = mu * (1 - mu);
      row.forEach((x, j) => { grad[j] += x * e; row.forEach((x2, k) => { H[j][k] -= x * x2 * w; }); });
    });
    const Hi = matInv(H); if (!Hi) break;
    const step = matMul(Hi, grad.map(g => [g])).map(v => v[0]);
    const ml = Math.max(...step.map(Math.abs));
    const lr = ml > 1 ? 1 / ml : 1;
    beta = beta.map((b, j) => b - lr * step[j]);
    if (step.every(s => Math.abs(s) < 1e-6)) break;
  }
  const ll = X.reduce((s, row, i) => {
    const pr = sig_(row.reduce((a, x, j) => a + x * beta[j], 0));
    return s + Y[i] * Math.log(pr + 1e-12) + (1 - Y[i]) * Math.log(1 - pr + 1e-12);
  }, 0);
  const ll0 = Y.reduce((s, y) => { const pm = avg(Y); return s + y * Math.log(pm + 1e-12) + (1 - y) * Math.log(1 - pm + 1e-12); }, 0);
  const McF = 1 - ll / ll0, AIC = -2 * ll + 2 * (p + 1), BIC = -2 * ll + (p + 1) * Math.log(n);
  const fitted = X.map(row => sig_(row.reduce((s, x, j) => s + x * beta[j], 0)));
  const pred = fitted.map(pr => pr >= .5 ? 1 : 0);
  const acc = pred.filter((pr, i) => pr === Y[i]).length / n;
  const TP = pred.filter((pr, i) => pr === 1 && Y[i] === 1).length;
  const FP = pred.filter((pr, i) => pr === 1 && Y[i] === 0).length;
  const FN = pred.filter((pr, i) => pr === 0 && Y[i] === 1).length;
  const TN = pred.filter((pr, i) => pr === 0 && Y[i] === 0).length;
  const precision = TP / (TP + FP || 1), recall = TP / (TP + FN || 1);
  const f1 = 2 * precision * recall / (precision + recall || 1);
  const coeffs = beta.map((b, j) => ({ name: j === 0 ? "Intercept" : (names[j - 1] || `X${j}`), b: +b.toFixed(4), OR: +Math.exp(b).toFixed(4) }));
  return {
    test: "Logistic Regression", coeffs, McFaddenR2: +McF.toFixed(4), AIC: +AIC.toFixed(2), BIC: +BIC.toFixed(2),
    ll: +ll.toFixed(4), acc: +acc.toFixed(4), precision: +precision.toFixed(4),
    recall: +recall.toFixed(4), f1: +f1.toFixed(4), confMatrix: { TP, FP, FN, TN }, n,
    apa: `Logistic: pseudo-R²(McF) = ${McF.toFixed(3)}, AIC = ${AIC.toFixed(1)}, accuracy = ${(acc * 100).toFixed(1)}%, F1 = ${f1.toFixed(3)}`,
  };
}

// ── Mediation (Baron-Kenny + Sobel) ──────────────────────────────────────────
export function mediation(X, M, Y) {
  if (!X.length || X.length !== M.length || X.length !== Y.length) return null;
  const c = simpleOLS(X, Y), a = simpleOLS(X, M);
  const n = X.length, mx = avg(X), mm = avg(M), my = avg(Y);
  const sXX = X.reduce((s, x) => s + (x - mx) ** 2, 0);
  const sMM = M.reduce((s, m) => s + (m - mm) ** 2, 0);
  const sXM = X.reduce((s, x, i) => s + (x - mx) * (M[i] - mm), 0);
  const sXY = X.reduce((s, x, i) => s + (x - mx) * (Y[i] - my), 0);
  const sMY = M.reduce((s, m, i) => s + (m - mm) * (Y[i] - my), 0);
  const det = sXX * sMM - sXM ** 2; if (!det) return null;
  const b_c = (sXX * sMY - sXM * sXY) / det, cp = (sMM * sXY - sXM * sMY) / det;
  const int_cp = my - cp * mx - b_c * mm;
  const fit_cp = X.map((x, i) => int_cp + cp * x + b_c * M[i]);
  const ssRes = Y.reduce((s, y, i) => s + (y - fit_cp[i]) ** 2, 0);
  const ssTot = Y.reduce((s, y) => s + (y - my) ** 2, 0);
  const r2_cp = ssTot ? 1 - ssRes / ssTot : 0, mse_cp = ssRes / (n - 3);
  const se_b = Math.sqrt(mse_cp * sXX / det), se_cp = Math.sqrt(mse_cp * sMM / det);
  const t_b = b_c / se_b, t_cp = cp / se_cp;
  const ab = (a?.b1 || 0) * b_c;
  const se_ab = Math.sqrt(b_c ** 2 * (a?.se || 0) ** 2 + (a?.b1 || 0) ** 2 * se_b ** 2);
  const z_sob = se_ab ? ab / se_ab : 0, p_sob = 2 * (1 - normalCDF(Math.abs(z_sob)));
  const propMed = c?.b1 ? ab / c.b1 : null;
  return {
    test: "Mediation (Baron-Kenny)", c_total: c?.b1, c_p: c?.p,
    a_path: a?.b1, a_se: a?.se, a_p: a?.p,
    b_path: +b_c.toFixed(5), b_se: +se_b.toFixed(5), b_p: tPVal(t_b, n - 3),
    cp_direct: +cp.toFixed(5), cp_se: +se_cp.toFixed(5), cp_p: tPVal(t_cp, n - 3),
    ab: +ab.toFixed(5), ab_se: +se_ab.toFixed(5), z_sobel: +z_sob.toFixed(4),
    p_sobel: p_sob, propMed: propMed != null ? +propMed.toFixed(4) : null,
    r2_cp: +r2_cp.toFixed(4), n,
    steps: { cSig: sig(c?.p || 1), aSig: sig(a?.p || 1), bSig: sig(tPVal(t_b, n - 3)), cpSig: sig(tPVal(t_cp, n - 3)) },
    apa: `a×b = ${ab.toFixed(4)}, Sobel z = ${z_sob.toFixed(2)}, ${fmtP(p_sob)}${propMed != null ? `, %mediated = ${(propMed * 100).toFixed(1)}%` : ""}`,
  };
}

export function bootstrapMediation(X, M, Y, B = 1999, alpha = .05) {
  const n = X.length, ab_obs = mediation(X, M, Y)?.ab || 0, samples = [];
  for (let b = 0; b < B; b++) {
    const idx = Array.from({ length: n }, () => Math.floor(Math.random() * n));
    const res = mediation(idx.map(i => X[i]), idx.map(i => M[i]), idx.map(i => Y[i]));
    if (res) samples.push(res.ab);
  }
  samples.sort((a, b) => a - b);
  return { ab: ab_obs, lo: samples[Math.floor(alpha / 2 * B)], hi: samples[Math.floor((1 - alpha / 2) * B)], B, sig: samples[Math.floor(alpha / 2 * B)] > 0 || samples[Math.floor((1 - alpha / 2) * B)] < 0, dist: samples };
}

// ── Moderation (interaction X×Z) ─────────────────────────────────────────────
export function moderation(X, Z, Y, xL = "X", zL = "Z") {
  if (!X.length || X.length !== Z.length || X.length !== Y.length) return null;
  const xZ = X.map((x, i) => x * Z[i]);
  const Xraw = X.map((x, i) => [x, Z[i], xZ[i]]);
  const res = multipleOLS(Y, Xraw, [xL, zL, `${xL}×${zL}`]);
  if (!res) return null;
  const ic = res.coeffs.find(c => c.name.includes("×"));
  const mZ = avg(Z), sdZ = sampleSD(Z);
  const ss = [-1, 0, 1].map(k => {
    const zv = mZ + k * sdZ, bx = res.coeffs[1]?.b || 0, bi = ic?.b || 0;
    return { z: k === 0 ? "Z̄" : `Z${k > 0 ? "+" : "-"}1SD`, zVal: +zv.toFixed(3), slope: +(bx + bi * zv).toFixed(4) };
  });
  return { ...res, test: "Moderation (Interaction)", intCoeff: ic, simpleSlopes: ss, xL, zL, apa: `${xL}×${zL}: b = ${ic?.b.toFixed(4)}, t = ${ic?.t?.toFixed(2)}, ${fmtP(ic?.p || 1)}, R² = ${res.r2.toFixed(3)}` };
}
