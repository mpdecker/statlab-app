# Plan: Wire 34 Ghost Tests into Navigator

## Goal

Add tree.js entries for 34 fully-implemented but hidden tests. These have compute cases, config UI, chartMap entries, and methodNotes — they're invisible only because they lack navigator IDs.

## Discovery

CHART_MODE_LABELS and EXPLORE_PANEL_CHART_FOR_MODE are keyed by **chart mode** (not test ID). All chart modes used by ghost tests (`scatterfit`, `histogram`, `qq`, `barci`, `heatmap`, `power`) already have entries. No vizHelpers.js changes needed.

## Scope

Single file change: `src/config/tree.js` — add 4 new sections with 33 test IDs.

## Test IDs by Section

### ROBUST STATISTICS (10 tests) — color: `#f97316`

| ID | Label | Tag | Chart Mode |
|----|-------|-----|-----------|
| theil_sen | Theil-Sen Slope | median pairwise · nonparametric | scatterfit |
| mm_estimator | MM-Estimator | high breakdown · S/M iterative | scatterfit |
| mad_scale | MAD Scale | median absolute deviation · robust σ | histogram |
| hampel_m | Hampel M-Estimator | redescending psi · location | histogram |
| mcd_cov | MCD Covariance | minimum covariance determinant · robust Σ | heatmap |
| s_estimator | S-Estimator | bisquare rho · high bdp | scatterfit |
| lts_reg | LTS Regression | least trimmed squares · robust OLS | scatterfit |
| qq_band | QQ Confidence Bands | simulated envelope · normality check | qq |
| outlier_lof | LOF Outlier Detection | local outlier factor · k-NN density | histogram |
| outlier_iforest | Isolation Forest | anomaly score · random splits | histogram |

### BAYESIAN MODELING (10 tests) — color: `#a855f7`

| ID | Label | Tag | Chart Mode |
|----|-------|-----|-----------|
| bic_bf | BIC Bayes Factor | model comparison · Schwartz approx | histogram |
| beta_binom_post | Beta-Binomial Posterior | conjugate update · proportion | histogram |
| gamma_pois_post | Gamma-Poisson Posterior | count data · conjugate | histogram |
| norm_norm_post | Normal-Normal Posterior | known σ · conjugate μ | histogram |
| nig_post | NIG Posterior | Normal-Inverse-Gamma · regression | histogram |
| bayes_linreg | Bayesian Linear Reg | conjugate/MCMC · coeff posterior | scatterfit |
| bayes_logit | Bayesian Logistic Reg | MCMC · binary outcome | histogram |
| bayes_pois | Bayesian Poisson Reg | MCMC · count outcome | histogram |
| bayes_dic | Bayesian DIC | deviance · information criterion | histogram |
| bma_reg | BMA Regression | model averaging · BIC weights | histogram |

### MISSING DATA (7 tests) — color: `#eab308`

| ID | Label | Tag | Chart Mode |
|----|-------|-----|-----------|
| little_mcar | Little's MCAR Test | missing completely at random · χ² | histogram |
| mice_imp | MICE Imputation | multiple imputation · chained equations | histogram |
| rubin_pool | Rubin's Rules | pooled estimates · between/within variance | histogram |
| fmi | Fraction Missing Info | λ · proportion of missing information | histogram |
| em_impute | EM Imputation | expectation-maximization · MVN | histogram |
| miss_patt | Missingness Pattern | visual map · . = present X = missing | histogram |
| complete_cases | Complete Cases | listwise deletion · complete rows | histogram |

### DIAGNOSTICS (7 tests) — color: `#0ea5e9`

| ID | Label | Tag | Chart Mode |
|----|-------|-----|-----------|
| normality | Normality Tests | Shapiro-Wilk · D'Agostino-Pearson | qq |
| homogeneity | Homogeneity Tests | Levene · Bartlett · variance equality | barci |
| grubbs | Grubbs' Test | single outlier detection · α | histogram |
| sensitivity | Sensitivity Analysis (LOO) | leave-one-out · influence | barci |
| effectconv | Effect Size Conversion | d ↔ r ↔ η² · Cohen's conventions | histogram |
| corrections | Multiple Comparisons | Bonferroni · Holm · Benjamini-Hochberg | histogram |
| samplesize | Sample Size Calculator | power · d · r · α required N | power |

## Placement in tree.js

Insert before the batch 9 sections (ABM, Bandit, etc.) — these are more foundational/methodological. Suggested order among the 4:

1. DIAGNOSTICS (after EXISTING CATEGORIES, before ROBUST)
2. ROBUST STATISTICS
3. BAYESIAN MODELING (near "EQUIVALENCE & BAYES")
4. MISSING DATA (near "PREPROCESSING")

## Files Changed

| File | Changes |
|------|---------|
| `src/config/tree.js` | Add 4 new category sections with 33 test ID entries |

## Implementation Order

1. Add 4 new sections + 33 test IDs to `src/config/tree.js`
2. Run `npx vitest run` — full suite must pass
3. Run `npx vitest run src/config/chartMap.test.js` — chart mode validation must pass

## Validation

- chartMap.test.js line 59 validates every QuickView mode has an Explore mapping.
- Full test suite passes with no regressions.
- Manual smoke: click each new test, verify config UI loads, verify compute runs, verify chart renders in QuickView.
- Manual smoke: switch to Explore tab — verify seeded chart shows correctly.
