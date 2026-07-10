# StatLab — Inference Engine

A modular statistical analysis application built in React, powered by the
[`statlab`](https://www.npmjs.com/package/statlab) statistics engine.

---

## Architecture

```
statlab-app/
├── index.html                  Vite entry HTML
├── index.jsx                   Root entry
└── src/
    ├── App.jsx                 Root component: header, sidebar, InferencePanel
    ├── palette.js               Color tokens, fonts, global CSS
    │
    ├── data/
    │   └── datasets.js         Built-in: Iris (150), Diamonds (200), Gapminder (33)
    │
    ├── config/
    │   ├── tree.js              Navigator — UI-accessible tests with labels + tags
    │   ├── methodNotes.js       Per-test methodology documentation
    │   ├── contracts.test.js    Integration test: TREE ids vs. statlab runners
    │   └── fixtures/            Local test harness (runners over the statlab package)
    │
    └── components/
        ├── ui.jsx               Chip, Sel, Inp, TA, CheckList, Toggle, APABlock, etc.
        ├── charts.jsx            TDistViz, QQPlot, ResidualPlot, Scree, Forest, etc.
        ├── InferenceConfig.jsx  Per-test parameter control panel
        ├── InferenceResults.jsx Result renderer — chips, tables, plots, APA output
        └── InferencePanel.jsx   Orchestrator: Navigator + Config + Results
```

All statistical computation comes from the [`statlab`](https://www.npmjs.com/package/statlab)
npm package ([source](https://github.com/mpdecker/statlab)) — 84+ method modules, 1,000+
functions, imported by namespaced subpath (e.g. `import { tWelch } from 'statlab/methods/means'`).
This app has zero statistical code of its own; it's a UI over the published library.

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
    "recharts": "^2.12.7",
    "papaparse": "^5.5.3",
    "statlab": "^0.1.0"
  }
}
```

All statistical mathematics (distributions, matrix algebra, eigen-decomposition,
bootstrap, normality tests, power functions) lives in the
[`statlab`](https://www.npmjs.com/package/statlab) npm package, which itself has
zero runtime dependencies. This app's own deps are React for rendering, Recharts
for charts, and PapaParse for CSV parsing.

---

## Testing

```bash
pnpm test              # app unit & integration tests, 0 failures
pnpm test:coverage     # coverage report
```

Heavy resampling (`bootstrap`, `med_bootstrap`, power Monte Carlo) uses a Web
Worker when `B ≥ 400` and `Worker` is available; set **RNG seed** and **B** in
the config panel for reproducible bootstrap CIs.

## Adding a new test

New statistical functions are added to the
[`statlab`](https://github.com/mpdecker/statlab) library, not this repo. To
expose an existing `statlab` function in this app's UI:

1. Add an entry to `src/config/tree.js` under the appropriate category,
   referencing the function's TREE id.
2. Add a runner for that id in `src/config/fixtures/runners.js` (used by the
   `contracts.test.js` integration test) and wire the real call in the
   `result` `useMemo` inside `InferencePanel.jsx`.
3. Add config controls to the `configMap` object in `InferenceConfig.jsx`.
4. Add result rendering to `InferenceResults.jsx` (chips, tables, plots).
5. Bump the `statlab` dependency in `package.json` if the function shipped
   in a newer library version.

---

## Runbook

See **[RUNBOOK.md](./RUNBOOK.md)** for comprehensive developer documentation including:
- Setup and development commands
- Full project structure
- Step-by-step guide for adding new functions
- Test patterns and code style rules
- Math layer import reference
- CLI helper usage (docs:list, docs:show, docs:search)
- Troubleshooting common errors
- Version history
