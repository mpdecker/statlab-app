# StatLab v6 — Social Science Inference Engine

A modular, production-grade statistical analysis application built in React.
No external stats libraries — all mathematics implemented from scratch.

---

## Architecture

```
statlab/
├── index.jsx                   Root entry (re-exports App)
└── src/
    ├── App.jsx                 Root component: header, QuickView sidebar, InferencePanel
    ├── palette.js              Color tokens, fonts, global CSS
    │
    ├── math/
    │   ├── core.js             Descriptive stats, effect size labels, ranking, fmtP
    │   ├── distributions.js    Normal/t/F/χ² CDFs, PDFs, inversions; bootstrap; normality tests
    │   └── matrix.js           matMul, matTrans, matInv, jacobiEigen (PCA backbone)
    │
    ├── tests/
    │   ├── means.js            t-tests, Yuen, z-test, sign test
    │   ├── anova.js            One-way ANOVA, Welch ANOVA, two-way ANOVA, ANCOVA, RM ANOVA,
    │   │                       Friedman, Kruskal-Wallis, Cochran's Q
    │   ├── regression.js       Pearson/Spearman/Kendall/partial/point-biserial correlations,
    │   │                       simple/multiple/polynomial/hierarchical OLS, logistic regression,
    │   │                       mediation (Baron-Kenny+Sobel+bootstrap), moderation (interaction)
    │   ├── categorical.js      Chi-square (independence + GoF), Fisher's exact, McNemar,
    │   │                       binomial exact, one/two proportion z, Mann-Whitney U,
    │   │                       Wilcoxon signed-rank, TOST, Bayes factors (t, correlation),
    │   │                       Grubbs outlier, Levene, Bartlett, multiple comparison
    │   │                       corrections (Bonferroni, Holm, BH-FDR), LOO sensitivity
    │   └── multivariate.js     PCA, EFA (varimax rotation), Cronbach's α, split-half,
    │                           ICC(2,1), Cohen's κ, random-effects meta-analysis (DL),
    │                           difference-in-differences, effect size converter
    │
    ├── data/
    │   └── datasets.js         Built-in: Iris (150), Diamonds (200), Gapminder (33);
    │                           CSV auto-detection
    │
    ├── config/
    │   └── tree.js             Navigator tree — all 84 test entries with labels + tags
    │   └── methodNotes.js      Per-test methods / simplification disclaimers
    │
    └── components/
        ├── ui.jsx              Chip, Sel, Inp, TA, CheckList, Toggle, NormBadge,
        │                       APABlock, SigBadge, SectionHead, CTip, ActionBtn, LinkBtn
        ├── charts.jsx          TDistViz, QQPlot, ResidualPlot, PowerCurve, ScreePlot,
        │                       ForestPlot, PathDiagram, BootstrapHist, QuickScatter
        ├── InferenceConfig.jsx Per-test parameter control panel (220px left column)
        ├── InferenceResults.jsx Result renderer — chips, tables, plots, APA output
        └── InferencePanel.jsx  Orchestrator: Navigator + Config + Results + all state
```

---

## Test inventory (84 tests)

Navigator categories: Compare Means (6), ANOVA (8), Nonparametric (2), Correlation (5), Regression (11), Categorical (7), Equivalence & Bayes (3), Multivariate (9), Psychometrics (5), Multilevel (3), Clustering (3), Network (3), Meta & Causal (6), Diagnostics & Tools (13).

### Legacy summary (core 55)

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

### Regression (8)
| ID | Test | Key outputs |
|----|------|-------------|
| `ols_simple` | Simple OLS | b, β, SE, t, p, R², adj.R², Durbin-Watson |
| `ols_multi` | Multiple OLS | β, VIF, adj.R², F, residuals |
| `polynomial` | Polynomial regression | degree 2–4 |
| `hierarchical` | Hierarchical OLS | M1 vs M2, ΔR², F-change |
| `logistic` | Logistic regression | OR, AIC, BIC, McFadden R², confusion matrix, F1 |
| `mediation` | Mediation (Baron-Kenny) | a, b, c, c', a×b, Sobel z, % mediated, path diagram |
| `med_bootstrap` | Bootstrap mediation | percentile CI for indirect effect, B=1999 |
| `moderation` | Moderation | X×Z interaction, simple slopes at Z±1SD |

### Categorical (7)
| ID | Test | Key outputs |
|----|------|-------------|
| `chisq` | Chi-Square independence | χ², df, p, Cramér's V, obs/exp table |
| `chigof` | Chi-Square goodness-of-fit | χ², p, Cohen's w |
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

### Multivariate (6)
| ID | Test | Key outputs |
|----|------|-------------|
| `pca` | PCA | eigenvalues, loadings, % variance, scree plot, scores |
| `efa` | EFA (varimax) | rotated loadings, communalities, uniqueness |
| `cronbach` | Cronbach's α | α, item-total r, α-if-deleted |
| `splithalf` | Split-Half | Spearman-Brown corrected ρ |
| `icc` | ICC(2,1) | ICC(2,1), ICC(1,1), label |
| `kappa` | Cohen's κ | κ, SE, z, p, label |

### Meta-Analysis & Causal (2)
| ID | Test | Key outputs |
|----|------|-------------|
| `meta` | Random-Effects Meta (DL) | d_RE, 95% CI, PI, Q, I², τ, forest plot |
| `did` | Difference-in-Differences | DiD estimator, t, p |

### Diagnostics & Tools (8)
| ID | Tool | Key outputs |
|----|------|-------------|
| `grubbs` | Grubbs Outlier Test | G, p, outlier value |
| `normality` | Normality Tests | D'Agostino-Pearson K², Shapiro-Wilk W, QQ plot |
| `homogeneity` | Homogeneity of Variance | Levene F, Bartlett B |
| `samplesize` | Sample Size Calculator | n for t-test (d), N for correlation (r), power curves |
| `effectconv` | Effect Size Converter | d ↔ r ↔ OR ↔ η² ↔ f |
| `corrections` | Multiple Comparisons | Bonferroni, Holm-Bonferroni, BH-FDR |
| `bootstrap` | Bootstrap CI | mean/median/SD with B=1999, distribution histogram |
| `sensitivity` | LOO Sensitivity | leave-one-out robustness, prop. significant |

---

## Automatic diagnostics (shown alongside results)

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
npm test              # 887+ unit & contract tests
npm run test:coverage # math/tests/utils coverage (≥90% lines)
node scripts/generate-reference.mjs  # refresh regression oracle snapshots
```

Heavy resampling (`bootstrap`, `med_bootstrap`, power Monte Carlo) uses a Web Worker when `B ≥ 400` and `Worker` is available; set **RNG seed** and **B** in the config panel for reproducible bootstrap CIs.

## Adding a new test

1. Implement the test function in the appropriate `src/tests/*.js` file.
   Return `{ test: "Name", ..., apa: "APA sentence" }`.
2. Add an entry to `src/config/tree.js` under the appropriate category.
3. Add config controls to the `configMap` object in `InferenceConfig.jsx`.
4. Add result rendering to `InferenceResults.jsx` (chips, tables, plots).
5. Wire the test call in the `result` `useMemo` inside `InferencePanel.jsx`.
