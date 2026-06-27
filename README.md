# StatLab — Social Science Inference Engine

A modular, zero-dependency statistical analysis application built in React.
No external stats libraries — all mathematics implemented from scratch.

---

## Architecture

```
statlab/
├── index.jsx                   Root entry
└── src/
    ├── App.jsx                 Root component: header, sidebar, InferencePanel
    ├── palette.js              Color tokens, fonts, global CSS
    │
    ├── math/
    │   ├── core.js             Descriptive stats, effect size labels, ranking, fmtP
    │   ├── distributions.js    Normal/t/F/χ² CDFs, PDFs, inversions; bootstrap; normality
    │   └── matrix.js           matMul, matTrans, matInv, jacobiEigen (PCA backbone)
    │
    ├── tests/                  ** 85 statistical modules — 1,034 functions **
    │   ├── __fixtures__/       Test helpers, reference oracles
    │   ├── means.js            t-tests, Cohen's d, equivalence, sample size
    │   ├── anova.js            One/two-way ANOVA, ANCOVA, RM, Welch, Friedman, Kruskal
    │   ├── regression.js       OLS, logistic, Poisson, NB, quantile, zero-inflated,
    │   │                       mediation, moderation, model confidence sets
    │   ├── categorical.js      χ², Fisher, McNemar, CMH, Mann-Whitney, Wilcoxon,
    │   │                       FDR corrections, Cramér's V, relative risk
    │   ├── multivariate.js     PCA, EFA, MANOVA, CCA, LDA, meta-analysis, Cronbach,
    │   │                       ICC, κ, Procrustes rotation, RV coefficient, CPA
    │   ├── multilevel.js       Random intercept/slope, ICC, GLMM, GEE, REML, transition
    │   ├── bayesian.js         JZS t-test, Bayes factors, MCMC, GPR, BMA
    │   ├── causal.js           PSM, IV/2SLS, DiD, ITS, RDD, DML, synthetic control,
    │   │                       mediation (moderated, multi, longitudinal)
    │   ├── survival.js         Cox PH, KM, frailty, RMST, Fine-Gray, joint models
    │   ├── timeseries.js       ARIMA, Holt-Winters, GARCH, VAR, Kalman, state-space
    │   ├── clustering.js       k-means, hierarchical, DBSCAN, GMM, spectral, silhouette
    │   ├── network.js          Centrality, community, PageRank, power law fit
    │   ├── sem.js              Structural equation modeling
    │   ├── psychometrics.js    McDonald's ω, IRT 1PL/2PL, parallel analysis, reliability
    │   ├── power.js            t-test, ANOVA, χ², logistic, mixed, mediation power
    │   ├── bootstrap.js        Percentile, BCa, studentized
    │   ├── nonparametric.js    KS, Anderson-Darling, kernel regression, isotonic
    │   ├── spatial.js          Moran's I, Geary's C, kriging, IDW, Ripley's K, spatial models
    │   ├── experimental.js     Nested ANOVA, repeated GLM, equivalence, LHS, GP emulator
    │   ├── econometric.js      Tobit, Heckman, panel (FE/RE), SUR, 3SLS, GMM, cointegration
    │   ├── finance.js          Black-Scholes, Monte Carlo options, Greeks, VaR
    │   ├── signal.js           FFT, Welch PSD, STFT, wavelet, cepstrum, Mel
    │   ├── optimization.js     SA, GA, PSO, DE, grid search, BFGS, Nelder-Mead
    │   ├── learning.js         Random forest, gradient boosting, LOESS, lowess
    │   ├── text.js             TF-IDF, LDA, word2vec, BM25, sentiment, TextRank
    │   ├── circular.js         Circular statistics, von Mises
    │   ├── extreme.js          GPD, block maxima, peaks over threshold
    │   ├── doseResponse.js     4PL, EC50, Hill slope
    │   ├── fitting.js          Distribution fitting, MLE, KS estimation
    │   ├── ecology.js          Shannon/Simpson diversity, ISA, SIMPER, adonis2, betadisper
    │   ├── evolutionary.js     Genetic algorithms
    │   ├── privacy.js          Differential privacy, k-anonymity, l-diversity
    │   ├── bioinformatics.js   Enrichment analysis, volcano plots, FDR
    │   ├── deepLearning.js     Autoencoder, VAE, GAN, attention, transformer
    │   ├── nlp.js              Word2Vec, GloVe, NER, POS tagging, dependency parsing
    │   ├── compositional.js    CLR/ILR/ALR transforms, compositional PCA
    │   ├── conjoint.js         Part-worth utilities, attribute importance, choice sim
    │   ├── dimReduction.js     t-SNE, ISOMAP, LLE, UMAP
    │   ├── interpretability.js SHAP, LIME, partial dependence, ALE, permutation
    │   ├── recommendation.js   Collaborative filtering, matrix factorization
    │   ├── outlier.js          LOF, isolation forest
    │   ├── spatialEconometric.js SDM, spatial panel, Hausman, direct/indirect effects
    │   ├── reliability.js      Weibull analysis, ALT, repairable systems, competing risks
    │   ├── bandit.js           ε-greedy, UCB, Thompson, Q-learning, SARSA, DQN
    │   ├── and 30+ more...
    │
    ├── data/
    │   └── datasets.js         Built-in: Iris (150), Diamonds (200), Gapminder (33)
    │
    ├── config/
    │   ├── tree.js             Navigator — 84 UI-accessible tests with labels + tags
    │   └── methodNotes.js      Per-test methodology documentation
    │
    └── components/
        ├── ui.jsx              Chip, Sel, Inp, TA, CheckList, Toggle, APABlock, etc.
        ├── charts.jsx          TDistViz, QQPlot, ResidualPlot, Scree, Forest, etc.
        ├── InferenceConfig.jsx Per-test parameter control panel
        ├── InferenceResults.jsx Result renderer — chips, tables, plots, APA output
        └── InferencePanel.jsx  Orchestrator: Navigator + Config + Results
```

---

## Navigator categories (84 UI-accessible tests)

| Category | Count | Tests |
|----------|-------|-------|
| Compare Means | 6 | Welch t, one-sample t, paired t, Yuen trimmed, z-test, sign test |
| ANOVA | 8 | One/two-way, Welch, ANCOVA, RM, Kruskal-Wallis, Friedman, Cochran Q |
| Nonparametric | 2 | Mann-Whitney U, Wilcoxon Signed-Rank |
| Correlation | 5 | Pearson, Spearman, Kendall, partial, point-biserial |
| Regression | 11 | Simple OLS, multiple OLS, polynomial, hierarchical, logistic, ordinal, Poisson, NB, mediation, bootstrap mediation, moderation |
| Categorical | 7 | χ² independence, χ² GoF, Fisher, McNemar, binomial, one/two proportion z |
| Equivalence & Bayes | 3 | TOST, Bayesian t-test, Bayesian correlation |
| Multivariate | 9 | PCA, EFA, MANOVA, canonical correlation, LDA, Cronbach α, split-half, ICC, Cohen's κ |
| Psychometrics | 5 | McDonald's ω, parallel analysis, IRT 1PL, IRT 2PL, scale scoring |
| Multilevel Models | 3 | Random intercept, random slope, multilevel ICC |
| Clustering | 3 | k-Means, hierarchical, latent class analysis |
| Network | 3 | Centrality, community detection, sociogram |
| Meta-Analysis & Causal | 6 | Random-effects meta, DiD, PSM, IV/2SLS, ITS, RDD |
| Diagnostics & Tools | 13 | Grubbs, normality, homogeneity, sample size, ANOVA/χ²/logistic/mixed/mediation power, effect size converter, multiple comparison corrections, bootstrap CI, LOO sensitivity |

---

## Test inventory (complete)

### Compare Means (6)

| ID | Test | Key outputs |
|----|------|-------------|
| `t_welch` | Welch two-sample t-test | t, df, p, d, g, 95% CI, power, reqN |
| `t_one` | One-sample t-test | t, df, p, d |
| `t_paired` | Paired t-test | t, df, p, d, pre-post r |
| `trimmed` | Yuen's 20% trimmed t-test | t, df, p (robust to outliers) |
| `z_known` | z-test (known σ) | z, p, d, 95% CI |
| `sign` | Sign Test | pos, neg, p (minimal assumptions) |

### Analysis of Variance (8)

| ID | Test | Key outputs |
|----|------|-------------|
| `anova` | One-Way ANOVA | F, η², ω², f, Tukey HSD, Bonferroni |
| `welch_anova` | Welch's ANOVA | F, p (robust to unequal var) |
| `twoway` | Two-Way ANOVA | FA, FB, FAB, η² per effect, cell means |
| `ancova` | ANCOVA | F, p, η², adjusted group means, b_within |
| `rm_anova` | One-Way RM ANOVA | F, p, GG-corrected p, ε, η², ω² |
| `kruskal` | Kruskal-Wallis H | H, p, η² |
| `friedman` | Friedman Test | χ², p, Kendall's W |
| `cochranQ` | Cochran's Q | Q, p, proportions per condition |

### Nonparametric (2)

| ID | Test | Key outputs |
|----|------|-------------|
| `mwu` | Mann-Whitney U | U, z, p, rank-biserial r, Cliff's δ |
| `wilcoxon` | Wilcoxon Signed-Rank | W, z, p, r |

### Correlation (5)

| ID | Test | Key outputs |
|----|------|-------------|
| `pearson` | Pearson r | r, t, p, r², Fisher-z 95% CI |
| `spearman` | Spearman ρ | ρ, t, p |
| `kendall` | Kendall τ-b | τ, z, p |
| `partial` | Partial correlation | r_partial, sr (semi-partial), controlling for Z |
| `pointbis` | Point-biserial r | r_pb, t, p |

### Regression (11)

| ID | Test | Key outputs |
|----|------|-------------|
| `ols_simple` | Simple OLS | β, SE, t, R², Durbin-Watson |
| `ols_multi` | Multiple OLS | β, VIF, adj.R², F, residuals |
| `polynomial` | Polynomial regression | degree 2–4 |
| `hierarchical` | Hierarchical OLS | M1 vs M2, ΔR², F-change |
| `logistic` | Logistic regression | OR, AIC, BIC, McFadden R², confusion matrix, F1 |
| `ordinal` | Ordinal Logistic | proportional odds, OR, thresholds |
| `poisson` | Poisson Regression | IRR, deviance, dispersion |
| `negbinom` | Negative Binomial | IRR, θ, overdispersion |
| `mediation` | Mediation (Baron-Kenny) | a, b, c, c', a×b, Sobel z, % mediated, path diagram |
| `med_bootstrap` | Bootstrap mediation | percentile CI for indirect effect, B=1999 |
| `moderation` | Moderation | X×Z interaction, simple slopes at Z±1SD |

### Categorical (7)

| ID | Test | Key outputs |
|----|------|-------------|
| `chisq` | Chi-Square independence | χ², df, p, Cramér's V, obs/exp table |
| `chigof` | Chi-Square GoF | χ², p, Cohen's w |
| `fisher` | Fisher's Exact | p, OR, 95% CI OR, φ |
| `mcnemar` | McNemar's Test | χ², p |
| `binomial` | Binomial Exact Test | p̂, p, 95% CI |
| `prop1` | One-Proportion z | z, p, Cohen's h |
| `prop2` | Two-Proportion z | z, p, RR, OR, ARR, NNT |

### Equivalence & Bayes (3)

| ID | Test | Key outputs |
|----|------|-------------|
| `tost` | TOST Equivalence | t₁, t₂, p_equiv, verdict |
| `bayes_t` | Bayesian t-test (JZS) | BF₁₀, BF₀₁, log BF₁₀, label |
| `bayes_r` | Bayesian Correlation | BF₁₀ approx, label |

### Multivariate (9)

| ID | Test | Key outputs |
|----|------|-------------|
| `pca` | PCA | eigenvalues, loadings, % variance, scree plot, scores |
| `efa` | EFA (Varimax) | rotated loadings, communalities, uniqueness |
| `manova` | MANOVA | Wilks Λ, Pillai, Roy, Hotelling |
| `cancorr` | Canonical Correlation | Rc, loadings, χ² |
| `lda` | Linear Discriminant Analysis | coefficients, accuracy |
| `cronbach` | Cronbach's α | α, item-total r, α-if-deleted |
| `splithalf` | Split-Half | Spearman-Brown corrected ρ |
| `icc` | ICC(2,1) | ICC(2,1), ICC(1,1), label |
| `kappa` | Cohen's κ | κ, SE, z, p, label |

### Psychometrics (5)

| ID | Test | Key outputs |
|----|------|-------------|
| `omega` | McDonald's ω | ω_t, ω_h from factor model |
| `parallel` | Parallel Analysis | Monte Carlo scree, factor retention |
| `irt_1pl` | IRT Rasch (1PL) | difficulty, θ, ICC |
| `irt_2pl` | IRT 2PL | a, b, ICC curves |
| `scale_score` | Scale Scoring | sum/mean, reverse coding, subscales |

### Multilevel Models (3)

| ID | Test | Key outputs |
|----|------|-------------|
| `hlm_ri` | Random Intercept | variance compositions, ICC |
| `hlm_rs` | Random Slope | growth, slope variance |
| `icc_ml` | Multilevel ICC | between var, design effect |

### Clustering (3)

| ID | Test | Key outputs |
|----|------|-------------|
| `kmeans` | k-Means | k=2..8, silhouette |
| `hclust` | Hierarchical Cluster | Ward linkage, dendrogram |
| `lca` | Latent Class Analysis | 2–4 classes, EM, BIC |

### Network (3)

| ID | Test | Key outputs |
|----|------|-------------|
| `centrality` | Centrality Measures | degree, betweenness, eigenvector, closeness |
| `community` | Community Detection | modularity, greedy optimization |
| `sociogram` | Sociogram | force layout, adjacency |

### Meta-Analysis & Causal (6)

| ID | Test | Key outputs |
|----|------|-------------|
| `meta` | Random-Effects Meta (DL) | d_RE, 95% CI, PI, Q, I², τ |
| `did` | Diff-in-Differences | DiD estimator, t, p |
| `psm` | Propensity Score Matching | logistic PS, ATT, balance |
| `iv2sls` | IV / 2SLS | instrument, first-stage F |
| `its` | Interrupted Time Series | segmented regression |
| `rdd` | Regression Discontinuity | local linear, bandwidth |

### Diagnostics & Tools (13)

| ID | Test | Key outputs |
|----|------|-------------|
| `grubbs` | Grubbs Outlier Test | G, p, outlier value |
| `normality` | Normality Tests | D'Agostino-Pearson K², Shapiro-Wilk W, QQ plot |
| `homogeneity` | Homogeneity of Variance | Levene F, Bartlett B |
| `samplesize` | Sample Size Calculator | n for t-test, N for correlation |
| `pow_anova` | ANOVA Power | Cohen's f, n per group |
| `pow_chi` | Chi-Square Power | Cohen's w, df |
| `pow_logit` | Logistic Power | OR, event rate |
| `pow_mixed` | Mixed Models Power | ICC, design effect |
| `pow_med` | Mediation Power | Monte Carlo, ab paths |
| `effectconv` | Effect Size Converter | d ↔ r ↔ OR ↔ η² ↔ f |
| `corrections` | Multiple Comparisons | Bonferroni, Holm, BH-FDR |
| `bootstrap` | Bootstrap CI | mean/median/SD, B=1999 |
| `sensitivity` | LOO Sensitivity | leave-one-out robustness |

---

## Backend statistics library (85 modules, 1034 functions)

Beyond the 84 UI-accessible tests, StatLab includes an extensive
computational statistics library used internally and available for
direct import:

**Core inference:** `means`, `anova`, `regression`, `categorical`, `multivariate`, `multilevel`
**Advanced modeling:** `bayesian`, `survival`, `timeseries`, `causal`, `sem`, `econometric`
**Machine learning:** `learning`, `clustering`, `neural`, `deepLearning`, `bandit`, `optimization`
**Specialty domains:** `finance`, `signal`, `text`, `nlp`, `bioinformatics`, `reliability`
**Spatial:** `spatial`, `spatialTemporal`, `spatialEconometric`, `pointProcess`
**Quality & reliability:** `spc`, `reliability`, `raMonitor`
**Dimensionality:** `dimReduction`, `mds`, `ordination`, `compositional`, `conjoint`
**Model interpretation:** `interpretability`, `sensitivity`, `robust`
**Utilities:** `bootstrap`, `missing`, `fitting`, `preprocessing`, `distance`, `metrics`

All modules export `{ test, ..., apa }` formatted results and are covered by
contract tests validating key structure and edge-case behavior.

---

## Automatic diagnostics

Every test that compares groups automatically runs and displays:
- **D'Agostino-Pearson K²** normality test per group (n ≥ 8)
- **Levene's F** homogeneity of variance for 2-group tests
- **Welch correction notice** when variances are unequal
- **Low expected cell warning** for chi-square (E < 5)
- **VIF multicollinearity flag** for regression (VIF > 5)
- **Durbin-Watson** autocorrelation statistic for OLS

---

## APA 7 output

Every test generates a publication-ready APA 7th edition sentence,
copyable with the "copy" button. Examples:

```
t(48.3) = 4.21, p < .001, d = 0.87 [large], 95% CI [0.31, 0.89]
F(2,147) = 18.43, p < .001, η² = .201 [large], ω² = .190
d_RE = 0.523, 95% CI [0.341, 0.705], z = 5.62, p < .001, I² = 43.2%, τ = 0.187
```

---

## Dependencies

```json
{
  "dependencies": {
    "react": "^18",
    "recharts": "latest",
    "papaparse": "latest"
  }
}
```

All statistical mathematics (distributions, matrix algebra, eigen-decomposition,
bootstrap, normality tests, power functions) is implemented from scratch with no
external stats dependencies. The only runtime deps are React for rendering,
Recharts for charts, and PapaParse for CSV parsing.

---

## Testing

```bash
npm test              # 3,209 unit & contract tests, 0 failures
npm run test:coverage # math/tests/utils coverage (≥90% lines)
```

Heavy resampling (`bootstrap`, `med_bootstrap`, power Monte Carlo) uses a Web
Worker when `B ≥ 400` and `Worker` is available; set **RNG seed** and **B** in
the config panel for reproducible bootstrap CIs.

## Adding a new test

1. Implement the test function in the appropriate `src/tests/*.js` file.
   Return `{ test: "Name", ..., apa: "APA sentence" }`.
2. Add an entry to `src/config/tree.js` under the appropriate category.
3. Add config controls to the `configMap` object in `InferenceConfig.jsx`.
4. Add result rendering to `InferenceResults.jsx` (chips, tables, plots).
5. Wire the test call in the `result` `useMemo` inside `InferencePanel.jsx`.
