# Batch 6 — Robust Statistics + Bayesian Inference + Missing Data

## Overview
Wire 27 tests across 4 modules into the UI.

## New Categories (3)

| Category | Color | Tests | Module(s) |
|----------|-------|-------|-----------|
| ROBUST STATISTICS | `#f59e0b` (amber) | 10 | `robust.js` (8) + `outlier.js` (2) |
| BAYESIAN INFERENCE | `#3b82f6` (blue) | 10 | `bayesian.js` |
| MISSING DATA | `#e879f9` (fuchsia) | 7 | `missing.js` |

## Module Breakdown

### robust.js (8)
All have unique `test:` keys, all take standard data inputs:

| # | id | func | test key | inputs |
|---|-----|------|----------|--------|
| 1 | `theil_sen` | `theilSenSlope(x,y)` | Theil-Sen | xy pair |
| 2 | `mm_estimator` | `mmEstimator(x,y,seed)` | MM Estimator | xy pair |
| 3 | `mad_scale` | `madScale(data)` | MAD Scale | single numeric var |
| 4 | `hampel_m` | `hampelM(data,{a,b,c})` | Hampel M | single numeric var |
| 5 | `mcd_cov` | `mcdCovariance(data,vars,{alpha,nStarts,seed})` | MCD Covariance | CheckList vars |
| 6 | `s_estimator` | `sEstimator(x,y,{bdp,maxIter})` | S-Estimator | xy pair |
| 7 | `lts_reg` | `ltsRegression(x,y,{seed,h})` | LTS Regression | xy pair |
| 8 | `qq_band` | `qqConfidence(data,{nSim})` | QQ Confidence Band | single numeric var |

### outlier.js (2)
Matrix-based implementations — **different** from `learning.js` column-based versions. Use import aliases `outlierLOF` and `outlierIForest`.

| # | id | func | test key | inputs |
|---|-----|------|----------|--------|
| 9 | `outlier_lof` | `localOutlierFactor(X,{k})` | Local Outlier Factor | CheckList → matrix (row-major) |
| 10 | `outlier_iforest` | `isolationForest(X,{seed,nTrees,sampleSize})` | Isolation Forest | CheckList → matrix (row-major) |

### bayesian.js (10)
Selection: prioritize conjugate/analytical methods. Skip raw MCMC utilities (`mcmc`, `posteriorSummary`, `hpdInterval`, `waic`) and already-wired `jszBayesFactorT` (duplicate of `bayes_t`). Skip `savageDickeyBF` (requires MCMC chain) and `bayesianANOVA` / `bayesianMixedModel` (slow MCMC, complex group structures).

| # | id | func | test key | inputs |
|---|-----|------|----------|--------|
| 11 | `bic_bf` | `bicBayesFactor(logLik0,logLik1,n,k0,k1)` | Bayes Factor (BIC) | text Inp |
| 12 | `beta_binom_post` | `betaBinomialPosterior(s,t,a,b)` | — (no key) → needs wrapper | text Inp |
| 13 | `gamma_pois_post` | `gammaPoissonPosterior(counts,shape,rate)` | — (no key) → needs wrapper | single numeric var |
| 14 | `norm_norm_post` | `normalNormalPosterior(data,μ₀,σ₀,σ)` | — (no key) → needs wrapper | single numeric var + Inp |
| 15 | `nig_post` | `normalInverseGammaPosterior(y,X,a0,b0)` | — (no key) → needs wrapper | CheckList X + Sel Y |
| 16 | `bayes_linreg` | `bayesianLinearRegression(y,X,{nIter,nBurnin})` | — (no key) → wrapper | CheckList X + Sel Y |
| 17 | `bayes_logit` | `bayesianLogisticRegression(y,X,{nIter,nBurnin,priorScale})` | — (no key) → wrapper | X + binary y |
| 18 | `bayes_pois` | `bayesianPoissonRegression(y,X,{nIter,nBurnin,priorScale})` | — (no key) → wrapper | X + count y |
| 19 | `bayes_dic` | `bayesianDIC(logLik,nParams)` | Bayesian DIC | text Inp |
| 20 | `bma_reg` | `bmaRegression(data,yVar,xCandidates,{seed})` | BMA Regression | tabular Sel Y + CheckList X |

**Wrapper strategy for no-test-key bayesian functions**: The computation branch enumerates the returned object keys into a `{ test: 'Bayesian ...', ...result, apa: '...' }` structure. This is the same pattern used elsewhere (e.g., `normality` combines DP+SW into one test object).

**MCMC-heavy functions use `nIter=0` (conjugate mode)** by default to avoid slow UI stalls. `bayesianLinearRegression` with `nIter=0` delegates to `normalInverseGammaPosterior`. For `bayesianLogisticRegression`/`bayesianPoissonRegression`, use reduced `nIter=2000, nBurnin=500`.

### missing.js (7)

| # | id | func | test key | inputs |
|---|-----|------|----------|--------|
| 21 | `little_mcar` | `littlesMCAR(data)` | Little's MCAR Test | full dataset (auto-detect numeric cols) |
| 22 | `mice_imp` | `mice(data,vars,{m,maxIter,seed})` | MICE | CheckList vars |
| 23 | `rubin_pool` | `rubinPool(datasets,analysisFn)` | Rubin's Pooling | post-hoc (needs MICE result) |
| 24 | `fmi` | `fmi(pooledResult)` | Fraction of Missing Information | post-hoc (needs Rubin) |
| 25 | `em_impute` | `emImpute(data,vars,{maxIter,tolerance})` | — (no key) → wrapper | CheckList vars |
| 26 | `miss_patt` | `missingnessPattern(data)` | — (no key) → wrapper | full dataset |
| 27 | `complete_cases` | `completeCases(data,vars)` | — (no key) → wrapper | CheckList vars |

Skip: `meanImpute` and `regressionImpute` (pure transforms, no diagnostic output).

## Tree IDs

### ROBUST STATISTICS (10)
| id | label | tag |
|----|-------|-----|
| theil_sen | Theil-Sen Slope | robust median pairwise slopes |
| mm_estimator | MM Estimator | S-init · Tukey bisquare · high BDP |
| mad_scale | MAD Scale | median absolute deviation |
| hampel_m | Hampel M-Estimator | 3-part psi-function location |
| mcd_cov | MCD Covariance | robust scatter · fast-MCD |
| s_estimator | S-Estimator | high-breakdown regression |
| lts_reg | LTS Regression | least trimmed squares |
| qq_band | QQ Confidence Band | normal-theory 95% envelope |
| outlier_lof | LOF (Matrix) | local outlier factor · matrix input |
| outlier_iforest | iForest (Matrix) | isolation forest · matrix input |

### BAYESIAN INFERENCE (10)
| id | label | tag |
|----|-------|-----|
| bic_bf | Bayes Factor (BIC) | BIC approximation · BF10 |
| beta_binom_post | Beta-Binomial Posterior | conjugate · successes/trials |
| gamma_pois_post | Gamma-Poisson Posterior | conjugate · count data |
| norm_norm_post | Normal-Normal Posterior | conjugate · known σ² |
| nig_post | NIG Posterior | conjugate · Normal-Inverse-Gamma |
| bayes_linreg | Bayesian Linear Reg | conjugate/MCMC · β posterior |
| bayes_logit | Bayesian Logistic Reg | MCMC · β posterior |
| bayes_pois | Bayesian Poisson Reg | MCMC · β posterior |
| bayes_dic | DIC | deviance information criterion |
| bma_reg | BMA Regression | Bayesian model averaging |

### MISSING DATA (7)
| id | label | tag |
|----|-------|-----|
| little_mcar | Little's MCAR Test | missing-completely-at-random · χ² |
| mice_imp | MICE Imputation | chained equations · m datasets |
| rubin_pool | Rubin's Pooling | combine MI estimates |
| fmi | Fraction Missing Info | per-parameter FMI |
| em_impute | EM Imputation | multivariate normal · converged |
| miss_patt | Missingness Pattern | per-variable · pattern table |
| complete_cases | Complete Cases | listwise deletion summary |

## Signature Categories

### Type A — xy vectors (xy pair selectors)
`theilSenSlope(x, y)`, `mmEstimator(x, y, seed)`, `sEstimator(x, y, {bdp})`, `ltsRegression(x, y, {seed,h})`

**UI:** Reuse existing `xVar`/`yVar` Sel → build `xy` object.

### Type B — single numeric vector
`madScale(data)`, `hampelM(data, {a,b,c})`, `qqConfidence(data, {nSim})`, `gammaPoissonPosterior(counts, ...)`, `normalNormalPosterior(data, ...)`

**UI:** Single Sel for variable → array of values.

### Type C — matrix from CheckList
`mcdCovariance(data, vars, {...})`, `outlierLOF(X, {k})`, `outlierIForest(X, {...})`, `normalInverseGammaPosterior(y, X, ...)`, `bayesianLinearRegression(y, X, {...})`, `bayesianLogisticRegression(y, X, ...)`, `bayesianPoissonRegression(y, X, ...)`, `mice(data, vars, {...})`, `emImpute(data, vars, {...})`, `completeCases(data, vars)`

**UI:** CheckList variables → build matrix. Some also need a separate outcome Sel.

### Type D — scalar/text inputs
`bicBayesFactor(logLik0, logLik1, n, k0, k1)`, `betaBinomialPosterior(s,t,a,b)`, `bayesianDIC(logLik, nParams)`

**UI:** Inp fields only, no column selectors.

### Type E — full dataset (auto-detect)
`littlesMCAR(data)`, `missingnessPattern(data)`

**UI:** No user selections needed; runs on all numeric cols automatically.

### Type F — tabular data + column names
`bmaRegression(data, yVar, xCandidates, {seed})`

**UI:** Sel for Y + CheckList for X candidates.

### Type G — post-hoc (requires prior result)
`rubinPool(datasets, analysisFn)`, `fmi(pooledResult)`

**UI:** Run MICE first, then optionally run these. Could show as sub-buttons below the MICE result.

## Config State Variables

### Robust
- `robSeed` — shared seed for stochastic methods
- `robAlpha` — MCD alpha
- `robH` — LTS h (subset size)
- `robBdp` — S-estimator breakdown point
- `robA`, `robB`, `robC` — Hampel M tuning constants
- `robNSim` — QQ band simulations

### Outlier
- `outlierK` — LOF k-neighbors
- `outlierNTrees` — iForest tree count
- `outlierSampleSize` — iForest sample size

### Bayesian
- `bayesNIter`, `bayesNBurnin` — MCMC settings
- `bayesPriorScale` — logistic/poisson prior scale
- `bayesLogLik0`, `bayesLogLik1`, `bayesN`, `bayesK0`, `bayesK1` — BIC inputs
- `bayesS`, `bayesT`, `bayesPriorA`, `bayesPriorB` — beta-binomial inputs
- `bayesPriorShape`, `bayesPriorRate` — gamma-poisson inputs
- `bayesPriorMean`, `bayesPriorSD`, `bayesKnownSigma` — normal-normal inputs
- `bayesA0`, `bayesB0` — NIG prior params
- `bayesDicLogLik`, `bayesDicNParams` — DIC inputs

### Missing
- `missVars` — CheckList for imputation
- `missM`, `missMaxIterMICE` — MICE imputation count + iterations
- `missMaxIterEM`, `missTolEM` — EM imputation params

## Implementation Notes

- **Import aliases**: `outlier.js` exports conflict with `learning.js`:
  ```js
  import { localOutlierFactor as outlierLOF, isolationForest as outlierIForest } from '../tests/outlier.js';
  ```
- **bayesian wrappers**: Functions like `normalNormalPosterior` and `betaBinomialPosterior` return plain objects without `test:` keys. The computation branch wraps them:
  ```js
  const r = normalNormalPosterior(data, priorMean, priorSD, knownSigma);
  if (!r) return null;
  return { test: 'Normal-Normal Posterior', ...r, apa: `...` };
  ```
- **MCMC default**: Set `bayesNIter=0` default for `bayesianLinearRegression` to use fast conjugate mode. For logistic/poisson, default to `nIter=2000, nBurnin=500` (reasonable tradeoff).
- **XY pair methods** reuse existing `xVar`/`yVar`/`xy` state pattern — same as `ols_simple`/`polynomial`/`p_spline`.
- **rubinPool post-hoc**: Cannot run standalone; needs prior MICE result `{estimates: [{name, estimate, se}]}`. For the contract runner, wrap by calling `mice()` first then `rubinPool` with a simple OLS analysis lambda. In the UI, show as a secondary button below the MICE output.
- **`fmi` post-hoc**: Similarly depends on `rubinPool` output. Chain in runner: `mice` → `rubinPool` → `fmi`. In UI, show as tertiary button.

### Runner strategy for chained functions
```js
rubin_pool: () => {
  const miceRes = mice(ROWS, ['x','y','z'], { m: 3, seed: 42 });
  if (!miceRes) return null;
  const analysisFn = (imputedDs) => {
    const xs = imputedDs.map(r => r.x), ys = imputedDs.map(r => r.y);
    let sx=0,sy=0,sxx=0,sxy=0;
    const n = xs.length;
    for (let i=0;i<n;i++){sx+=xs[i];sy+=ys[i];sxx+=xs[i]*xs[i];sxy+=xs[i]*ys[i];}
    const slope = (n*sxy-sx*sy)/Math.max(n*sxx-sx*sx,1);
    return { estimates: [{ name: 'slope', estimate: slope, se: 0.1 }] };
  };
  return rubinPool(miceRes.imputedDatasets, analysisFn);
},
fmi: () => {
  const poolRes = RUNNERS.rubin_pool();
  if (!poolRes) return null;
  return fmi(poolRes);
},
```
```

## Execution Order
1. tree.js — add 3 categories (ROBUST STATISTICS, BAYESIAN INFERENCE, MISSING DATA)
2. chartMap.js — add 27 entries
3. methodNotes.js — add 27 METHOD_NOTES + IMPL_NOTES
4. runners.js — add imports + 27 runners
5. InferencePanel.jsx — imports, state, useMemos, computation branches, deps, configState
6. InferenceConfig.jsx — configMap entries
7. Test counts: 266→293
8. InferenceConfig.test.jsx — mockState
9. `npx vitest run` → 0 failures

## Verification
- `npx vitest run` → 0 failures
- contracts.test.js: 266→293
- chartMap.test.js: 266→293
- methodNotes.test.js: all entries have description, usage, assumptions, cite
