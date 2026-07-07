# Sub-batch 8c — Data Engineering & Evaluation (68 exports, 8 modules)

## Status After 8b

- TREE count: 429, chartMap count: 469
- All contracts/component tests pass (899 tests, 0 failures)

## Verified Exports (ground-truth from source files)

### preprocessing.js (10)
| # | Function | Signature |
|---|----------|-----------|
| 1 | `standardize` | `(data, { method = 'zscore' } = {})` |
| 2 | `iqrOutliers` | `(data, { multiplier = 1.5 } = {})` |
| 3 | `madOutliers` | `(data, { threshold = 3.5 } = {})` |
| 4 | `oneHotEncode` | `(data, column)` |
| 5 | `equalWidthBinning` | `(data, nBins = 5)` |
| 6 | `winsorize` | `(data, { lower = 0.05, upper = 0.05 } = {})` |
| 7 | `frequencyEncode` | `(data, column)` |
| 8 | `smote` | `(X, y, { seed = 42, k = 5, multiplier = 1 } = {})` |
| 9 | `adasyn` | `(X, y, { seed = 42, k = 5, beta = 0.5 } = {})` |
| 10 | `randomUnderSample` | `(X, y, seed = 42)` |

### fitting.js (16)
| # | Function | Signature |
|---|----------|-----------|
| 1 | `fitNormal` | `(sample)` |
| 2 | `fitExponential` | `(sample)` |
| 3 | `fitGamma` | `(sample)` |
| 4 | `fitPoisson` | `(sample)` |
| 5 | `fitBinomial` | `(successes, trials)` |
| 6 | `fitLogNormal` | `(sample)` |
| 7 | `fitWeibull` | `(sample)` |
| 8 | `fitUniform` | `(sample)` |
| 9 | `distributionGoF` | `(sample, fitted, { test = 'KS', B = 999 } = {})` |
| 10 | `fitBeta` | `(sample)` |
| 11 | `andersonDarling` | `(data, { distribution = 'normal' } = {})` |
| 12 | `shapiroWilk` | `(data)` |
| 13 | `cramerVonMises` | `(data, { distribution = 'normal' } = {})` |
| 14 | `lilliefors` | `(data)` |
| 15 | `chiSquareGOF` | `(observed, { expected = null, nBins = null } = {})` |
| 16 | `qqCorrelation` | `(data, { distribution = 'normal' } = {})` |

### metrics.js (8)
| # | Function | Signature |
|---|----------|-----------|
| 1 | `psnr` | `(img1, img2, { maxVal = 255 } = {})` |
| 2 | `ssim` | `(img1, img2, { L = 255, k1 = 0.01, k2 = 0.03 } = {})` |
| 3 | `iou` | `(box1, box2)` |
| 4 | `bleuScore` | `(candidate, references, { n = 4 } = {})` |
| 5 | `rougeL` | `(candidate, reference)` |
| 6 | `perplexity` | `(logLik, nTokens)` |
| 7 | `matthewsCorrelation` | `(tp, fp, tn, fn)` |
| 8 | `precisionRecallCurve` | `(scores, labels, { nThresholds = 10 } = {})` |

### info.js (6)
| # | Function | Signature |
|---|----------|-----------|
| 1 | `shannonEntropy` | `(data, { discrete = true, bins = null } = {})` |
| 2 | `mutualInformation` | `(x, y, { discrete = true, bins = 10 } = {})` |
| 3 | `klDivergence` | `(p, q, { smoothing = 1e-10 } = {})` |
| 4 | `jensenShannonDivergence` | `(p, q)` |
| 5 | `aicc` | `(logLik, nParams, n)` |
| 6 | `bicWeights` | `(models)` |

### distance.js (7)
| # | Function | Signature |
|---|----------|-----------|
| 1 | `distanceMatrix` | `(x)` |
| 2 | `distanceCovariance` | `(x, y)` |
| 3 | `distanceCorrelation` | `(x, y)` |
| 4 | `energyTest` | `(x, y, { permutations = 199, seed = 42 } = {})` |
| 5 | `partialDistanceCorr` | `(x, y, z)` |
| 6 | `mahalanobisDistance` | `(x, y, cov)` |
| 7 | `gowerDistance` | `(x, y)` |

### mds.js (5)
| # | Function | Signature |
|---|----------|-----------|
| 1 | `classicalMDS` | `(data, vars, { nDimensions = 2 } = {})` |
| 2 | `sammonMapping` | `(data, vars, { seed = 42, nDimensions = 2, maxIter = 50 } = {})` |
| 3 | `nonMetricMDS` | `(data, vars, { seed = 42, nDimensions = 2, maxIter = 100, dissimilarities = null } = {})` |
| 4 | `sammonMappingDM` | `(D, { seed = 42, nDim = 2, maxIter = 50, lr = 0.1 } = {})` |
| 5 | `landmarkMDS` | `(D, { seed = 42, nLandmarks = 10, nDim = 2 } = {})` |

### ordination.js (9)
| # | Function | Signature |
|---|----------|-----------|
| 1 | `permanova` | `(data, vars, groupVar, { seed = 42, permutations = 999 } = {})` |
| 2 | `anosim` | `(data, vars, groupVar, { seed = 42, permutations = 999 } = {})` |
| 3 | `mantelTest` | `(matrix1, matrix2, { seed = 42, permutations = 999 } = {})` |
| 4 | `simperAnalysis` | `(data, vars, groupVar)` |
| 5 | `procrustes` | `(X, Y)` |
| 6 | `ccaPrep` | `(data, envVars, speciesVars)` |
| 7 | `envfit` | `(ordination, envData, envVar, { permutations = 999, seed = 42 } = {})` |
| 8 | `varpart` | `(R2total, R2part)` |
| 9 | `mso` | `(distanceMatrix)` |

### pls.js (7)
| # | Function | Signature |
|---|----------|-----------|
| 1 | `pls1` | `(X, y, nComponents = 2)` |
| 2 | `pls2` | `(X, Y, nComponents = 2)` |
| 3 | `vipScores` | `(plsModel)` |
| 4 | `rda` | `(Y, X, { permutations = 199, seed = 42 } = {})` |
| 5 | `dbRDA` | `(D, X, { permutations = 199 } = {})` |
| 6 | `sPLSRegression` | `(X, y, { nComp = 2, lambda = 0.5, maxIter = 20 } = {})` |
| 7 | `sparsePLS` | `(X, y, { nComp = 2, keepX = null } = {})` |

---

## Name Conflict Mitigations

### shapiroWilk
The file `fitting.js` exports `shapiroWilk` which conflicts with `math/distributions.js`'s `shapiroWilk` (already imported in runners.js line 5 and InferencePanel.jsx line 6). **Alias as `shapiroWilkFit` in both `runners.js` and `InferencePanel.jsx`.**

### simperAnalysis
The file `ordination.js` exports `simperAnalysis` which conflicts with `ecology.js`'s `simperAnalysis` (already imported in runners.js line 82 and InferencePanel.jsx line 126). **Alias as `simperAnalysisOrd` in both `runners.js` and `InferencePanel.jsx`.**

### distanceMatrix
Both `distance.js` and `ordination.js` export `distanceMatrix`. Import `distanceMatrix` from `distance.js` only; ordination.js's version is a local helper.

---

## Tree ID Definitions

### PREPROCESSING (color: `#f97316`)
| ID | Label | Tag |
|----|-------|-----|
| `prep_standardize` | Standardize | z-score · min-max · mean-center |
| `prep_iqr` | IQR Outliers | interquartile · 1.5× · boxplot |
| `prep_mad` | MAD Outliers | median absolute · robust · 3.5σ |
| `prep_onehot` | One-Hot Encode | dummy · indicator · categorical |
| `prep_binning` | Equal-Width Binning | discretize · intervals · histogram |
| `prep_winsorize` | Winsorize | clip · tails · percentiles |
| `prep_freqencode` | Frequency Encode | count · categorical → numeric |
| `prep_smote` | SMOTE | synthetic · oversampling · k-NN |
| `prep_adasyn` | ADASYN | adaptive · synthetic · density |
| `prep_undersample` | Random Undersample | majority · down-sample · balanced |

### DISTRIBUTION FITTING (color: `#06b6d4`)
| ID | Label | Tag |
|----|-------|-----|
| `fit_normal` | Fit Normal | μ · σ² · MLE |
| `fit_exponential` | Fit Exponential | λ · rate · MLE |
| `fit_gamma` | Fit Gamma | α · β · Newton |
| `fit_poisson` | Fit Poisson | λ · count · MLE |
| `fit_binomial` | Fit Binomial | n · p · successes |
| `fit_lognormal` | Fit Log-Normal | μ_log · σ_log · MLE |
| `fit_weibull` | Fit Weibull | λ · k · Newton |
| `fit_uniform` | Fit Uniform | min · max · MoM |
| `fit_distgof` | Distribution GoF | bootstrap · KS · CvM |
| `fit_beta` | Fit Beta | α · β · Newton |
| `fit_anderson` | Anderson-Darling | A² · normal · EDF |
| `fit_shapiro` | Shapiro-Wilk (fit) | W · normality · Blom scores |
| `fit_cvm` | Cramér-von Mises | ω² · EDF · goodness-of-fit |
| `fit_lilliefors` | Lilliefors | D · normality · EDF |
| `fit_chisqgof` | Chi-Square GoF | observed · expected · bins |
| `fit_qqcorr` | QQ Correlation | quantile · normal · linearity |

### METRICS (color: `#a3e635`)
| ID | Label | Tag |
|----|-------|-----|
| `met_psnr` | PSNR | peak signal · noise · decibels |
| `met_ssim` | SSIM | structural · luminance · contrast |
| `met_iou` | IoU | intersection · union · bounding |
| `met_bleu` | BLEU Score | n-gram · precision · brevity |
| `met_rougel` | ROUGE-L | recall · LCS · summary |
| `met_perplexity` | Perplexity | log-likelihood · tokens · NLP |
| `met_mcc` | Matthews Corr | MCC · confusion · imbalanced |
| `met_prcurve` | PR Curve | precision · recall · thresholds |

### INFORMATION THEORY (color: `#facc15`)
| ID | Label | Tag |
|----|-------|-----|
| `info_entropy` | Shannon Entropy | bits · uncertainty · discrete |
| `info_mutual` | Mutual Information | dependency · bins · MI |
| `info_kl` | KL Divergence | relative entropy · asymmetry |
| `info_js` | Jensen-Shannon | symmetric · bounded · divergence |
| `info_aicc` | AICc | corrected · small-sample · penalty |
| `info_bicweights` | BIC Weights | model probability · delta · evidence |

### DISTANCE (color: `#c084fc`)
| ID | Label | Tag |
|----|-------|-----|
| `dist_matrix` | Distance Matrix | Euclidean · pairwise · n×n |
| `dist_dcov` | Distance Covariance | dCov · dependence · V |
| `dist_dcorr` | Distance Correlation | dCor · nonlinear · independence |
| `dist_energy` | Energy Test | permutation · E-statistic · equality |
| `dist_pdc` | Partial Distance Corr | conditional · dCor · control |
| `dist_maha` | Mahalanobis Distance | cov · multivariate · outlier |
| `dist_gower` | Gower Distance | mixed · categorical · numeric |

### MDS (color: `#f472b6`)
| ID | Label | Tag |
|----|-------|-----|
| `mds_classical` | Classical MDS | PCoA · eigendecomposition · distances |
| `mds_sammon` | Sammon Mapping | stress · iterative · NMDS-like |
| `mds_nonmetric` | Non-Metric MDS | rank · monotone · Shepard |
| `mds_sammondm` | Sammon Mapping DM | distance matrix · stress · embedding |
| `mds_landmark` | Landmark MDS | fast · landmark · large-scale |

### ORDINATION (color: `#38bdf8`)
| ID | Label | Tag |
|----|-------|-----|
| `ord_permanova` | PERMANOVA | pseudo-F · distance · partitions |
| `ord_anosim` | ANOSIM | rank · dissimilarity · R-statistic |
| `ord_mantel` | Mantel Test | matrix correlation · permutation · Z |
| `ord_simper` | SIMPER (ord) | contribution · dissimilarity · group |
| `ord_procrustes` | Procrustes | rotation · scaling · alignment |
| `ord_cca` | CCA Prep | canonical · correspondence · dual |
| `ord_envfit` | Envfit | vector fitting · correlation · permutation |
| `ord_varpart` | Variation Partition | R² · unique · shared |
| `ord_mso` | MSO | Moran spectral · eigenvector · spatial |

### PLS (color: `#e879f9`)
| ID | Label | Tag |
|----|-------|-----|
| `pls_pls1` | PLS1 | single y · NIPALS · latent |
| `pls_pls2` | PLS2 | multivariate · X→Y · components |
| `pls_vip` | VIP Scores | variable importance · projection |
| `pls_rda` | RDA | redundancy · constrained · axes |
| `pls_dbrda` | db-RDA | distance-based · PCoA · constrained |
| `pls_spls` | Sparse PLS | sPLS · L1 · variable selection |
| `pls_splsreg` | Sparse PLS Regression | regularization · components · prediction |

---

## Chart Modes

| Module | Chart mode |
|--------|-----------|
| preprocessing (all 10) | `'histogram'` |
| fitting (all 16) | `'histogram'` |
| metrics (all 8) | `'barci'` (except met_prcurve = `'scatterfit'`) |
| info (all 6) | `'barci'` |
| distance (all 7) | `'heatmap'` (dist_matrix → barci, dist_dcorr/dcov → barci, dist_energy → histogram) |
| mds (all 5) | `'scatter'` |
| ordination (all 9) | `'barci'` (ord_cca → scatter, ord_procrustes → scatter, ord_mso → heatmap) |
| pls (all 7) | `'barci'` (pls_rda/dbrda → scatter) |

### Exact chartMap entries

```
// PREPROCESSING — all histogram
prep_standardize: 'histogram',
prep_iqr: 'histogram',
prep_mad: 'histogram',
prep_onehot: 'heatmap',
prep_binning: 'histogram',
prep_winsorize: 'histogram',
prep_freqencode: 'barci',
prep_smote: 'scatter',
prep_adasyn: 'scatter',
prep_undersample: 'histogram',

// DISTRIBUTION FITTING — all histogram
fit_normal: 'histogram', fit_exponential: 'histogram', fit_gamma: 'histogram',
fit_poisson: 'histogram', fit_binomial: 'histogram', fit_lognormal: 'histogram',
fit_weibull: 'histogram', fit_uniform: 'histogram', fit_distgof: 'histogram',
fit_beta: 'histogram', fit_anderson: 'histogram', fit_shapiro: 'histogram',
fit_cvm: 'histogram', fit_lilliefors: 'histogram', fit_chisqgof: 'histogram',
fit_qqcorr: 'scatterfit',

// METRICS
met_psnr: 'barci', met_ssim: 'barci', met_iou: 'barci',
met_bleu: 'barci', met_rougel: 'barci', met_perplexity: 'barci',
met_mcc: 'barci', met_prcurve: 'scatterfit',

// INFORMATION THEORY
info_entropy: 'barci', info_mutual: 'barci', info_kl: 'barci',
info_js: 'barci', info_aicc: 'barci', info_bicweights: 'barci',

// DISTANCE
dist_matrix: 'heatmap', dist_dcov: 'barci', dist_dcorr: 'barci',
dist_energy: 'histogram', dist_pdc: 'barci', dist_maha: 'heatmap',
dist_gower: 'heatmap',

// MDS
mds_classical: 'scatter', mds_sammon: 'scatter', mds_nonmetric: 'scatter',
mds_sammondm: 'scatter', mds_landmark: 'scatter',

// ORDINATION
ord_permanova: 'barci', ord_anosim: 'barci', ord_mantel: 'barci',
ord_simper: 'barci', ord_procrustes: 'scatter', ord_cca: 'scatter',
ord_envfit: 'barci', ord_varpart: 'barci', ord_mso: 'heatmap',

// PLS
pls_pls1: 'barci', pls_pls2: 'barci', pls_vip: 'barci',
pls_rda: 'scatter', pls_dbrda: 'scatter', pls_spls: 'barci',
pls_splsreg: 'barci',
```

---

## Approximate Tests (APPROXIMATE_TESTS + IMPL_NOTES)

| Test ID | Reason |
|---------|--------|
| `prep_smote` | Random k-NN sampling |
| `prep_adasyn` | Random sampling with density weights |
| `fit_gamma` | Iterative Newton MLE |
| `fit_weibull` | Newton fitting |
| `fit_beta` | Newton fitting |
| `fit_distgof` | Bootstrap p-value |
| `info_mutual` | Binned approximation of MI |
| `info_bicweights` | Model selection heuristic |
| `mds_sammon` | Iterative stress minimization |
| `mds_nonmetric` | Iterative NMDS |
| `mds_landmark` | Landmark approximation |
| `ord_permanova` | Permutation-based p-value |
| `ord_anosim` | Permutation-based R-statistic |
| `ord_mantel` | Permutation-based correlation |
| `ord_envfit` | Permutation-based vector fitting |

Total approximate: 15 tests.

The remaining 53 tests get educational METHOD_NOTES entries.

---

## State Vars

### Minimal set (avoid over-engineering; reuse existing selectors where possible)

```
// preprocessing
prepColumn (column selector for oneHotEncode/frequencyEncode/equalWidthBinning)
prepMethod (standardize method: zscore/minmax/meanc)
prepMultiplier (IQR multiplier)
prepThreshold (MAD threshold)
prepLower, prepUpper (winsorize bounds)
prepNBins (equalWidthBinning)
prepSeed (SMOTE/ADASYN/RUS)
prepK (SMOTE/ADASYN k-neighbors)
prepBeta (ADASYN beta)
prepMult (SMOTE multiplier)

// fitting — most take single sample/number arrays, no config needed
fitDistType (andersonDarling, cramerVonMises, qqCorrelation)
fitGoFTest (distributionGoF test: KS/CvM)
fitGoFB (distributionGoF bootstrap resamples)
fitNBins (chiSquareGOF)
fitSuccesses, fitTrials (fitBinomial)

// metrics — input-driven, mostly no config
metMaxVal (PSNR)
metL, metK1, metK2 (SSIM)
metN (BLEU)
metNThresholds (PR curve)

// info — minimal
infoBins (mutualInformation/shannonEntropy)
infoDiscrete (toggle discrete/continuous)
infoLogLik, infoNParams, infoN (aicc)

// distance — minimal
distPerms, distSeed (energyTest)

// mds
mdsNDim, mdsSeed, mdsMaxIter, mdsNLandmarks

// ordination
ordGroupVar, ordPerms, ordSeed, ordEnvVar

// pls
plsNComp, plsSeed, plsLambda, plsMaxIter, plsKeepX
```

---

## Runner Patterns

### preprocessing.js runners
Most take simple data arrays. Use `XS` for numeric vectors, `SCALE` for matrices.

```
prep_standardize: () => standardize(XS.slice(0, 30)),
prep_iqr: () => iqrOutliers(XS.slice(0, 30)),
prep_mad: () => madOutliers(XS.slice(0, 30)),
prep_onehot: () => oneHotEncode(ROWS.slice(0, 20), 'cat2'),
prep_binning: () => equalWidthBinning(XS.slice(0, 30), 5),
prep_winsorize: () => winsorize(XS.slice(0, 30)),
prep_freqencode: () => frequencyEncode(ROWS.slice(0, 20), 'cat2'),
prep_smote: () => smote(SCALE.slice(0, 20), YS.slice(0, 20)),
prep_adasyn: () => adasyn(SCALE.slice(0, 20), YS.slice(0, 20)),
prep_undersample: () => randomUnderSample(SCALE.slice(0, 20), YS.slice(0, 20)),
```

### fitting.js runners
Take sample arrays (XS, YS, or slices thereof).

```
fit_normal: () => fitNormal(XS.slice(0, 30)),
fit_exponential: () => fitExponential(XS.slice(0, 30).map(Math.abs)),
fit_gamma: () => fitGamma(XS.slice(0, 30).map(Math.abs)),
fit_poisson: () => fitPoisson(ZS.map(Math.abs).slice(0, 30)),
fit_binomial: () => fitBinomial(15, 50),
fit_lognormal: () => fitLogNormal(XS.slice(0, 30).map(v => Math.exp(Math.abs(v) / 10))),
fit_weibull: () => fitWeibull(XS.slice(0, 30).map(Math.abs)),
fit_uniform: () => fitUniform(XS.slice(0, 30)),
fit_distgof: () => { const s = XS.slice(0, 30); const f = fitNormal(s); return distributionGoF(s, f); },
fit_beta: () => fitBeta(XS.slice(0, 30).map(v => Math.abs(v) / 10 + 0.001).filter(v => v < 1)),
fit_anderson: () => andersonDarling(XS.slice(0, 30)),
fit_shapiro: () => shapiroWilkFit(XS.slice(0, 30)),
fit_cvm: () => cramerVonMises(XS.slice(0, 30)),
fit_lilliefors: () => lilliefors(XS.slice(0, 30)),
fit_chisqgof: () => chiSquareGOF(XS.slice(0, 30).map(Math.abs)),
fit_qqcorr: () => qqCorrelation(XS.slice(0, 30)),
```

### metrics.js runners
Mixed inputs — some take arrays, some take scalars.

```
met_psnr: () => psnr(GROUP_A, GROUP_B),
met_ssim: () => ssim(GROUP_A.map(v => v * 10), GROUP_B.map(v => v * 9 + 2)),
met_iou: () => iou([0, 0, 5, 5], [2, 2, 7, 7]),
met_bleu: () => bleuScore('the quick brown fox', ['a quick brown fox jumps', 'the fast brown fox leaps']),
met_rougel: () => rougeL('the quick brown fox', 'a quick brown fox jumps'),
met_perplexity: () => perplexity(-50, 20),
met_mcc: () => matthewsCorrelation(30, 5, 10, 55),
met_prcurve: () => precisionRecallCurve(YS.slice(0, 30), ZS.slice(0, 30).map(v => v >= 3 ? 1 : 0)),
```

### info.js runners
```
info_entropy: () => shannonEntropy(ROWS, { column: 'cat2' }),
...or simpler: info_entropy: () => shannonEntropy(ZS.map(Math.round)),
```

Hmm, looking at the function signature: `shannonEntropy(data, { discrete = true, bins = null } = {})`. The `data` parameter - is it an array of values or tabular data? Let me check... The function takes `data` as the first parameter. Looking at the plan's fixture patterns, there's no "column" parameter in the function signature, so `data` is an array.

```
info_entropy: () => shannonEntropy(ZS.map(v => Math.round(Math.abs(v)))),
info_mutual: () => mutualInformation(XS.slice(0, 30), YS.slice(0, 30)),
info_kl: () => klDivergence(XS.slice(0, 20).map(Math.abs), YS.slice(0, 20).map(Math.abs)),
info_js: () => jensenShannonDivergence(XS.slice(0, 20).map(Math.abs), YS.slice(0, 20).map(Math.abs)),
info_aicc: () => aicc(-100, 3, 50),
info_bicweights: () => bicWeights([{ bic: 100, name: 'M1' }, { bic: 95, name: 'M2' }, { bic: 105, name: 'M3' }]),
```

### distance.js runners
Take arrays/matrices.

```
dist_matrix: () => distanceMatrix(SCALE.slice(0, 10)),
dist_dcov: () => distanceCovariance(XS.slice(0, 30), YS.slice(0, 30)),
dist_dcorr: () => distanceCorrelation(XS.slice(0, 30), YS.slice(0, 30)),
dist_energy: () => energyTest(GROUP_A, GROUP_B),
dist_pdc: () => partialDistanceCorr(XS.slice(0, 30), YS.slice(0, 30), ZS.slice(0, 30)),
dist_maha: () => mahalanobisDistance(GROUP_A, GROUP_B, [[1, 0.5], [0.5, 1]]),  // wait - x, y are vectors?
dist_gower: () => gowerDistance(XS.slice(0, 20), YS.slice(0, 20)),
```

Wait: `mahalanobisDistance(x, y, cov)` — x and y might be vectors or matrices. Looking at the signature, x and y are likely 1D vectors (observations), and cov is a matrix. So:
```
dist_maha: () => mahalanobisDistance([2, 3, 4], [5, 6, 7], [[1, 0.5, 0], [0.5, 1, 0], [0, 0, 1]]),
```
Or simpler: use 2D data from GROUPs:
```
dist_maha: () => { const x = [GROUP_A[0], GROUP_A[1]]; const y = [GROUP_B[0], GROUP_B[1]]; const cov = [[1, 0.5], [0.5, 1]]; return mahalanobisDistance(x, y, cov); },
```

### mds.js runners
Take tabular data with column names or distance matrices.

```
mds_classical: () => classicalMDS(ROWS.slice(0, 20), ['x', 'y', 'z']),
mds_sammon: () => sammonMapping(ROWS.slice(0, 20), ['x', 'y', 'z']),
mds_nonmetric: () => nonMetricMDS(ROWS.slice(0, 20), ['x', 'y', 'z']),
mds_sammondm: () => { const D = distanceMatrix(SCALE.slice(0, 10)); return sammonMappingDM(D); },
mds_landmark: () => { const D = distanceMatrix(SCALE.slice(0, 15)); return landmarkMDS(D); },
```

### ordination.js runners
Take tabular data with group variable.

```
ord_permanova: () => permanova(ROWS.slice(0, 30), ['x', 'y', 'z'], 'group'),
ord_anosim: () => anosim(ROWS.slice(0, 30), ['x', 'y', 'z'], 'group'),
ord_mantel: () => { const m1 = distanceMatrix(SCALE.slice(0, 10)); const m2 = distanceMatrix(SCALE.slice(0, 10).map(r => r.map(v => v + 1))); return mantelTest(m1, m2); },
ord_simper: () => simperAnalysisOrd(ROWS.slice(0, 30), ['x', 'y', 'z'], 'group'),
ord_procrustes: () => procrustes(SCALE.slice(0, 10), SCALE.slice(0, 10).map(r => r.map(v => v * 2 + 1))),
ord_cca: () => ccaPrep(ROWS.slice(0, 30), ['x', 'z'], ['y', 'm']),
ord_envfit: () => { const ord = { points: SCALE.slice(0, 20).map(r => [r[0], r[1]]) }; return envfit(ord, ROWS.slice(0, 20), 'm'); },
ord_varpart: () => varpart([0.3, 0.2, 0.1], [0.1, 0.05, 0.1]),
ord_mso: () => { const D = distanceMatrix(SCALE.slice(0, 10)); return mso(D); },
```

Note: `envfit` takes `(ordination, envData, envVar, options)`. The `ordination` is a result object with `points`. We create a minimal valid ordination result.

### pls.js runners
Take matrices X, Y.

```
pls_pls1: () => pls1(SCALE.slice(0, 25, 3), YS.slice(0, 25)),
```
Wait: `pls1(X, y, nComponents = 2)`. X is a matrix, y is a vector. So:
```
pls_pls1: () => pls1(SCALE.slice(0, 25), YS.slice(0, 25)),
pls_pls2: () => pls2(SCALE.slice(0, 25), SCALE.slice(0, 25).map(r => [r[0] + r[1], r[2] + r[3]]), 2),
pls_vip: () => { const model = pls1(SCALE.slice(0, 25), YS.slice(0, 25), 2); return vipScores(model); },
pls_rda: () => rda(YS.slice(0, 25), SCALE.slice(0, 25)),
pls_dbrda: () => { const D = distanceMatrix(SCALE.slice(0, 15)); return dbRDA(D, SCALE.slice(0, 15).map(r => [r[0], r[1]])); },
pls_spls: () => sparsePLS(SCALE.slice(0, 20), YS.slice(0, 20)),
pls_splsreg: () => sPLSRegression(SCALE.slice(0, 20), YS.slice(0, 20)),
```

---

## Name Conflict Aliases

### runners.js
```js
import { shapiroWilk as shapiroWilkFit } from '../fitting.js';
import { simperAnalysis as simperAnalysisOrd } from '../ordination.js';
```

### InferencePanel.jsx
```js
import { shapiroWilk as shapiroWilkFit } from '../tests/fitting.js';
import { simperAnalysis as simperAnalysisOrd } from '../tests/ordination.js';
```

Use `shapiroWilkFit(...)` and `simperAnalysisOrd(...)` in runners and computation branches.

---

## Implementation Order

1. **Read all 8 source files** for ground-truth signatures (already done — verified 68 exports)
2. **`tree.js`** — add 8 categories (68 test IDs) before closing `];`
3. **`chartMap.js`** — add 68 chart entries before closing `};`
4. **`methodNotes.js`** — add 68 METHOD_NOTES + 15 IMPL_NOTES + 15 APPROXIMATE_TESTS
5. **`runners.js`** — add 8 imports (with 2 aliases) + 68 runners
6. **`InferencePanel.jsx`** — 8 imports (with 2 aliases), state vars, useMemo, computation branches, deps, configState
7. **`InferenceConfig.jsx`** — destructured vars, configMap JSX entries
8. **`contracts.test.js`** — update `TREE_IDS.length` to 497
9. **`chartMap.test.js`** — update `Object.keys(CHART_FOR_TEST).length` to 537
10. **`npx vitest run`** — verify all new tests pass

---

## Validation

After implementation:
```
npx vitest run src/tests/contracts.test.js src/config/chartMap.test.js src/config/methodNotes.test.js
npx vitest run src/components/InferenceConfig.test.jsx src/components/InferencePanel.test.jsx
```

Expected: 0 failures, TREE count 497, chartMap count 537, total tests 899 + 136 = 1035.
