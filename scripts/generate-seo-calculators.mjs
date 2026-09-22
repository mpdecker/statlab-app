import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ORIGIN = process.env.STATLAB_SITE_ORIGIN || 'https://statlab.fyi';

export const calculatorPages = [
  // --- WELCH & T-TEST FAMILY ---
  {
    slug: 'welch-t-test',
    title: "Welch's t-test calculator",
    family: 'Compare means',
    description: "Run a Welch two-sample t-test for unequal variances, with t, degrees of freedom (Welch-Satterthwaite), p-value, effect size, confidence interval, and APA-ready language.",
    keywords: ['Welch t-test', 'two sample t-test', 'unequal variances', 'Welch-Satterthwaite df', 'effect size'],
    inputs: ['Group A numeric values', 'Group B numeric values', 'Confidence level (90%, 95%, 99%)', 'Alternative hypothesis (two-sided, greater, less)'],
    example: { a: ['Group A: 12, 14, 15, 15, 18, 21', 'Group B: 9, 11, 11, 13, 14, 16'], result: 't ≈ 1.94, Welch df ≈ 9.80, two-sided p ≈ .082, Cohen’s d ≈ 1.05' },
    formula: 't = (X̄₁ - X̄₂) / √(s₁²/n₁ + s₂²/n₂), df = (s₁²/n₁ + s₂²/n₂)² / [ (s₁²/n₁)²/(n₁-1) + (s₂²/n₂)²/(n₂-1) ]',
    code: {
      python: `from scipy import stats\nres = stats.ttest_ind(group_a, group_b, equal_var=False)\nprint(f"t={res.statistic:.4f}, p={res.pvalue:.4f}")`,
      r: `t.test(group_a, group_b, var.equal = FALSE)`,
      ts: `import { tWelch } from '@statlab/core';\nconst result = tWelch(groupA, groupB, { alpha: 0.05 });`,
    },
    useCases: [
      'A/B testing latency distributions across canary vs production servers with unequal sample sizes.',
      'Validating API response time improvements in production release-readiness audits.',
      'Comparing user engagement durations across variant groups in production system telemetry.'
    ],
    when: 'Use when two independent sample groups have potentially unequal variances or unequal sample sizes.',
    cautions: [
      'Inspect sample distributions for extreme outliers before assuming approximate normality.',
      'Always report Welch-Satterthwaite degrees of freedom rather than assuming N₁ + N₂ - 2.'
    ],
    workbenchId: 't_welch',
  },
  {
    slug: 'student-t-test',
    title: "Student's two-sample t-test calculator",
    family: 'Compare means',
    description: "Calculate standard Student's two-sample t-test assuming equal variances, including pooled standard variance, t-statistic, p-value, and confidence intervals.",
    keywords: ['Student t-test', 'pooled variance t-test', 'two sample t test equal variance', 't-statistic'],
    inputs: ['Group A numeric values', 'Group B numeric values', 'Confidence level', 'Alternative hypothesis'],
    example: { a: ['Group A: 10, 12, 14, 15, 16', 'Group B: 6, 8, 9, 11, 12'], result: 't ≈ 3.24, df = 8, p ≈ .012, pooled s² ≈ 5.05' },
    formula: 't = (X̄₁ - X̄₂) / (s_p * √(1/n₁ + 1/n₂)), where s_p² = ((n₁-1)s₁² + (n₂-1)s₂²) / (n₁ + n₂ - 2)',
    code: {
      python: `from scipy import stats\nres = stats.ttest_ind(group_a, group_b, equal_var=True)\nprint(f"t={res.statistic:.4f}, p={res.pvalue:.4f}")`,
      r: `t.test(group_a, group_b, var.equal = TRUE)`,
      ts: `import { tInd } from '@statlab/core';\nconst result = tInd(groupA, groupB, { equalVar: true });`,
    },
    useCases: [
      'Testing mean difference between balanced control and treatment groups under equal variance assumptions.',
      'Comparing baseline microbenchmarks across identical hardware configurations.'
    ],
    when: 'Use when comparing two independent groups known or verified to have equal population variances.',
    cautions: [
      'If Levene’s or Bartlett’s test shows variance inequality, switch to Welch’s t-test.',
      'Sensitive to skewness in small sample sizes.'
    ],
    workbenchId: 't_ind',
  },
  {
    slug: 'paired-t-test',
    title: 'Paired samples t-test calculator',
    family: 'Compare means',
    description: 'Compare pre/post or paired continuous measurements using the paired samples t-test with mean difference, t-statistic, p-value, and Cohen’s d_z.',
    keywords: ['paired t-test', 'dependent t-test', 'pre post comparison', 'repeated measures t-test', 'mean difference'],
    inputs: ['Pre / Baseline values', 'Post / Treatment values', 'Confidence level', 'Alternative hypothesis'],
    example: { a: ['Pre: 140, 138, 150, 142, 136', 'Post: 132, 135, 141, 138, 130'], result: 'Mean diff = -6.0, t ≈ -4.74, df = 4, p ≈ .009' },
    formula: 't = d̄ / (s_d / √n), where d_i = x_{post,i} - x_{pre,i}',
    code: {
      python: `from scipy import stats\nres = stats.ttest_rel(pre_values, post_values)\nprint(f"t={res.statistic:.4f}, p={res.pvalue:.4f}")`,
      r: `t.test(pre_values, post_values, paired = TRUE)`,
      ts: `import { tPaired } from '@statlab/core';\nconst result = tPaired(preValues, postValues);`,
    },
    useCases: [
      'Measuring latency changes on the exact same set of API endpoints before and after a optimization deployment.',
      'Tracking user task completion time before and after UI redesign in production system telemetry.',
      'Evaluating paired LLM response timing across prompt iterations in automated benchmark runs.'
    ],
    when: 'Use when each observation in group A directly pairs with an observation in group B (e.g. pre/post test).',
    cautions: [
      'Requires matched data pairs of equal length.',
      'Evaluates difference scores; check that pair differences d_i are approximately normally distributed.'
    ],
    workbenchId: 't_paired',
  },
  {
    slug: 'one-sample-t-test',
    title: 'One-sample t-test calculator',
    family: 'Compare means',
    description: 'Test whether the sample mean differs significantly from a target baseline or SLA value, with t-statistic, degrees of freedom, p-value, and confidence interval.',
    keywords: ['one sample t-test', 'hypothesis test baseline', 'SLA validation', 'target mean comparison'],
    inputs: ['Sample numeric values', 'Null hypothesis mean (μ₀)', 'Confidence level', 'Alternative hypothesis'],
    example: { a: ['Sample: 98.2, 101.5, 99.1, 100.8, 102.3, 99.7', 'Target SLA μ₀ = 100.0'], result: 'Sample mean = 100.27, t ≈ 0.43, df = 5, p ≈ .684' },
    formula: 't = (X̄ - μ₀) / (s / √n)',
    code: {
      python: `from scipy import stats\nres = stats.ttest_1samp(sample, popmean=100.0)\nprint(f"t={res.statistic:.4f}, p={res.pvalue:.4f}")`,
      r: `t.test(sample, mu = 100.0)`,
      ts: `import { tOneSamp } from '@statlab/core';\nconst result = tOneSamp(sample, { mu0: 100.0 });`,
    },
    useCases: [
      'Verifying microservice throughput against SLA target baselines.',
      'Automated build gate pass/fail validation in automated regression suites.'
    ],
    when: 'Use when comparing a single sample mean against a fixed numerical benchmark or theoretical mean.',
    cautions: [
      'Assumes sample observations are independent.',
      'Heavy-tailed distributions may bias standard error estimates.'
    ],
    workbenchId: 't_onesamp',
  },
  {
    slug: 't-test-effect-size-calculator',
    title: "Cohen's d and Hedges' g calculator",
    family: 'Compare means',
    description: "Calculate standardized effect sizes Cohen's d, Hedges' g (small-sample correction), and Glass's delta for independent and paired t-tests.",
    keywords: ['Cohens d', 'Hedges g', 'effect size calculator', 'Glass delta', 'standardized mean difference'],
    inputs: ['Mean 1 & Standard Deviation 1 (or Sample 1)', 'Mean 2 & Standard Deviation 2 (or Sample 2)', 'Sample sizes n₁ & n₂'],
    example: { a: ['Group 1: mean=15.2, sd=3.1, n=25', 'Group 2: mean=12.4, sd=2.9, n=25'], result: 'Cohen’s d ≈ 0.933, Hedges’ g ≈ 0.918 (large effect size)' },
    formula: 'd = (X̄₁ - X̄₂) / s_pooled, g = d * [ 1 - 3 / (4(n₁+n₂) - 9) ]',
    code: {
      python: `import numpy as np\ndef cohens_d(x, y):\n    nx, ny = len(x), len(y)\n    s_pooled = np.sqrt(((nx-1)*np.var(x, ddof=1) + (ny-1)*np.var(y, ddof=1)) / (nx+ny-2))\n    return (np.mean(x) - np.mean(y)) / s_pooled`,
      r: `library(effsize)\ncohen.d(group_a, group_b)`,
      ts: `import { cohensD, hedgesG } from '@statlab/core';\nconst d = cohensD(groupA, groupB);\nconst g = hedgesG(groupA, groupB);`,
    },
    useCases: [
      'Quantifying practical impact magnitude beyond p-value significance in A/B test reporting.',
      'Standardizing benchmark performance gains across heterogeneous hardware runs in CI/CD pipeline benchmarks.'
    ],
    when: 'Use whenever reporting t-test results to express practical significance independent of sample size.',
    cautions: [
      'Use Hedges’ g when sample sizes are small (n < 20 per group).',
      'Choose Glass’s delta when control and treatment groups have severely unequal variances.'
    ],
    workbenchId: 'effect_size_t',
  },

  // --- PROBABILITY DISTRIBUTIONS FAMILY ---
  {
    slug: 'z-score-calculator',
    title: 'Z-score and normal distribution calculator',
    family: 'Probability Distributions',
    description: 'Calculate standard Z-scores, percentile ranks, p-values, and area under the standard normal curve N(0,1).',
    keywords: ['Z score calculator', 'standard normal distribution', 'percentile rank Z', 'Z to p value'],
    inputs: ['Raw score X', 'Population mean μ', 'Population standard deviation σ'],
    example: { a: ['X = 115', 'μ = 100', 'σ = 15'], result: 'Z = +1.00, Cumulative Probability = 84.13%, Two-tailed p = .3173' },
    formula: 'Z = (X - μ) / σ',
    code: {
      python: `from scipy import stats\nz = (115 - 100) / 15\np = stats.norm.sf(abs(z))*2\nprint(f"Z={z:.2f}, p={p:.4f}")`,
      r: `z <- (115 - 100) / 15\np <- 2 * pnorm(-abs(z))`,
      ts: `import { zScore } from '@statlab/core';\nconst z = zScore(115, 100, 15);`,
    },
    useCases: [
      'Standardizing infrastructure metric metrics across scaling tiers in production telemetry.',
      'Calculating percentile ranks for system latency observations.'
    ],
    when: 'Use to standardize individual values relative to a known population mean and standard deviation.',
    cautions: [
      'Requires data to be approximately normally distributed for percentile interpretations.',
      'Do not confuse sample standard deviation s with population σ.'
    ],
    workbenchId: 'z_score',
  },
  {
    slug: 't-score-calculator',
    title: 't-score and t-distribution calculator',
    family: 'Probability Distributions',
    description: 'Convert t-statistics to p-values, calculate t-distribution critical values t_α, and compute confidence bounds for sample means.',
    keywords: ['t score calculator', 't distribution p value', 'critical value t', 't to p converter'],
    inputs: ['t-statistic', 'Degrees of freedom df', 'Tail type (Two-tailed, One-tailed)'],
    example: { a: ['t = 2.45', 'df = 18', 'Two-tailed'], result: 'p-value = .0248 (Statistically significant at α = .05).' },
    formula: 'p = 2 * ∫_t^∞ f(x; df) dx',
    code: {
      python: `from scipy import stats\np = stats.t.sf(abs(2.45), df=18)*2\nprint(f"p={p:.4f}")`,
      r: `2 * pt(-abs(2.45), df = 18)`,
      ts: `import { tToP } from '@statlab/core';\nconst p = tToP(2.45, 18);`,
    },
    useCases: [
      'Converting microbenchmark t-statistics into exact p-values in CI/CD pipeline benchmarks.',
      'Calculating exact critical boundaries for custom hypothesis tests.'
    ],
    when: 'Use when working with sample mean statistics where population variance is estimated.',
    cautions: [
      't-distribution approaches normal distribution as df → ∞.',
      'Degrees of freedom depend on sample size and specific test design.'
    ],
    workbenchId: 't_dist',
  },
  {
    slug: 'f-distribution-calculator',
    title: 'F-distribution critical value and p-value calculator',
    family: 'Probability Distributions',
    description: 'Calculate F-distribution critical values F_α and upper-tail p-values given numerator (df1) and denominator (df2) degrees of freedom.',
    keywords: ['F distribution calculator', 'F statistic p value', 'F critical value', 'ANOVA F lookup'],
    inputs: ['F statistic value', 'Numerator df1 (between groups)', 'Denominator df2 (within groups)'],
    example: { a: ['F = 4.35', 'df1 = 3', 'df2 = 36'], result: 'Upper-tail p-value = .0102.' },
    formula: 'p = P(F(df1, df2) ≥ F_stat)',
    code: {
      python: `from scipy import stats\np = stats.f.sf(4.35, dfn=3, dfd=36)\nprint(f"p={p:.4f}")`,
      r: `pf(4.35, df1 = 3, df2 = 36, lower.tail = FALSE)`,
      ts: `import { fToP } from '@statlab/core';\nconst p = fToP(4.35, 3, 36);`,
    },
    useCases: [
      'Verifying ANOVA and linear regression model F-test significance values.',
      'Checking variance ratio tests across hardware benchmark runs.'
    ],
    when: 'Use for ANOVA F-tests, regression model significance tests, and variance ratio tests.',
    cautions: [
      'F-distribution is asymmetric and bounded below by zero.',
      'F-tests in ANOVA are inherently one-tailed (upper tail).'
    ],
    workbenchId: 'f_dist',
  },
  {
    slug: 'chi-square-distribution-calculator',
    title: 'Chi-square distribution calculator',
    family: 'Probability Distributions',
    description: 'Compute Chi-square (χ²) upper-tail p-values and critical values χ²_α for contingency table and goodness-of-fit tests.',
    keywords: ['Chi square distribution', 'chi square p value lookup', 'chi square critical value', 'df chi square'],
    inputs: ['Chi-square statistic (χ²)', 'Degrees of freedom (df)'],
    example: { a: ['χ² = 9.49', 'df = 4'], result: 'Upper-tail p-value = .0499.' },
    formula: 'p = ∫_χ²^∞ f(x; df) dx',
    code: {
      python: `from scipy import stats\np = stats.chi2.sf(9.49, df=4)\nprint(f"p={p:.4f}")`,
      r: `pchisq(9.49, df = 4, lower.tail = FALSE)`,
      ts: `import { chi2ToP } from '@statlab/core';\nconst p = chi2ToP(9.49, 4);`,
    },
    useCases: [
      'Looking up exact p-values for custom chi-square test matrices in production telemetry.',
      'Evaluating goodness-of-fit model tests.'
    ],
    when: 'Use for categorical independence, goodness-of-fit, and log-likelihood ratio tests.',
    cautions: [
      'Degrees of freedom depend on table dimensions (r-1)(c-1) or number of fitted parameters.',
      'Chi-square distribution is skewed right for small df.'
    ],
    workbenchId: 'chi2_dist',
  },

  // --- MULTIVARIATE & DIMENSIONALITY REDUCTION FAMILY ---
  {
    slug: 'pca-variance-explained',
    title: 'PCA variance explained and scree plot calculator',
    family: 'Multivariate & Dimensionality Reduction',
    description: 'Calculate principal component eigenvalues, proportion of variance explained, cumulative variance ratios, and Kaiser-Guttman retention thresholds.',
    keywords: ['PCA variance explained', 'scree plot calculator', 'eigenvalue retention', 'principal component analysis'],
    inputs: ['Covariance or Correlation Matrix (or Feature Matrix)', 'Number of components'],
    example: { a: ['Feature matrix (5 features)', 'Eigenvalues: [2.8, 1.2, 0.6, 0.3, 0.1]'], result: 'PC1 = 56.0% variance, PC2 = 24.0% variance. First 2 components explain 80.0% cumulative variance.' },
    formula: 'VarRatio_k = λ_k / Σ λ_j, CumVar_K = Σ_{k=1}^K λ_k / Σ λ_j',
    code: {
      python: `from sklearn.decomposition import PCA\npca = PCA().fit(X)\nprint(pca.explained_variance_ratio_)`,
      r: `prcomp(df, scale. = TRUE)`,
      ts: `import { pcaVariance } from '@statlab/core';\nconst res = pcaVariance(matrix);`,
    },
    useCases: [
      'Dimensionality reduction for telemetry metric feature vectors in production telemetry.',
      'Evaluating latent feature representation quality in AI model embeddings.'
    ],
    when: 'Use when reducing continuous multi-feature datasets into uncorrelated principal components.',
    cautions: [
      'Standardize features (z-score scaling) prior to PCA if variables have different units.',
      'PCA assumes linear relationships among features.'
    ],
    workbenchId: 'pca',
  },
  {
    slug: 'manova-calculator',
    title: 'MANOVA (Multivariate ANOVA) calculator',
    family: 'Multivariate & Dimensionality Reduction',
    description: 'Evaluate treatment group differences across multiple correlated continuous outcome variables simultaneously using Wilks’ Lambda, Pillai’s Trace, and Hotelling’s Trace.',
    keywords: ['MANOVA calculator', 'multivariate ANOVA', 'Wilks Lambda', 'Pillais Trace', 'multiple outcome test'],
    inputs: ['Categorical Group factor', 'Multivariate outcome matrix Y (2+ outcomes)', 'Test statistic choice'],
    example: { a: ['Group (Canary vs Prod)', 'Outcomes: [Latency ms, CPU %, Memory MB]'], result: 'Wilks’ Lambda = 0.62, Approx F(3, 46) = 9.4, p < .0001. Significant multivariate difference.' },
    formula: 'Λ = |E| / |H + E|, where E = Error SSCP matrix, H = Hypothesis SSCP matrix',
    code: {
      python: `from statsmodels.multivariate.manova import MANOVA\nma = MANOVA.from_formula('y1 + y2 ~ group', data=df)\nprint(ma.mv_test())`,
      r: `res <- manova(cbind(y1, y2) ~ group, data = df)\nsummary(res, test = "Wilks")`,
      ts: `import { manova } from '@statlab/core';\nconst res = manova(df, ['y1', 'y2'], 'group');`,
    },
    useCases: [
      'Evaluating system optimization across multiple dependent telemetry metrics simultaneously in production telemetry.',
      'Testing model build performance across speed, accuracy, and memory concurrently.'
    ],
    when: 'Use when evaluating group differences on two or more correlated continuous outcomes.',
    cautions: [
      'Requires multivariate normality and homogeneity of covariance matrices (Box’s M test).',
      'Pillai’s Trace is most robust to assumption violations.'
    ],
    workbenchId: 'manova',
  },

  // --- BIOSTATISTICS & RISK FAMILY ---
  {
    slug: 'odds-ratio-relative-risk',
    title: 'Odds Ratio and Relative Risk calculator',
    family: 'Biostatistics & Risk',
    description: 'Calculate Odds Ratio (OR), Relative Risk (RR / Risk Ratio), Absolute Risk Reduction (ARR), and Number Needed to Treat (NNT) with 95% confidence intervals.',
    keywords: ['Odds Ratio calculator', 'Relative Risk calculator', 'RR OR calculator', 'Number Needed to Treat NNT'],
    inputs: ['Exposed / Treatment Event & Non-event counts', 'Unexposed / Control Event & Non-event counts', 'Confidence level'],
    example: { a: ['Treatment: 15 error / 500 total (3.0%)', 'Control: 45 error / 500 total (9.0%)'], result: 'Relative Risk = 0.333 (95% CI: [.19, .59]), Odds Ratio = 0.312, ARR = 6.0%, NNT = 16.7' },
    formula: 'RR = (a/(a+b)) / (c/(c+d)), OR = (a*d) / (b*c), NNT = 1 / ARR',
    code: {
      python: `import scipy.stats as stats\ndef relative_risk(a, b, c, d):\n    p1, p2 = a/(a+b), c/(c+d)\n    return p1 / p2`,
      r: `library(epitools)\nriskratio(matrix(c(a, c, b, d), nrow=2))`,
      ts: `import { riskMetrics } from '@statlab/core';\nconst res = riskMetrics(15, 485, 45, 455);`,
    },
    useCases: [
      'Calculating relative error rate risk reduction in production release-readiness audits.',
      'Evaluating conversion risk and churn odds in product analytics.'
    ],
    when: 'Use when evaluating risk or odds of binary outcome events between exposed and unexposed groups.',
    cautions: [
      'Odds Ratio overstates Relative Risk when outcome event incidence is high (> 10%).',
      'NNT is only meaningful when Absolute Risk Reduction is statistically significant.'
    ],
    workbenchId: 'or_rr',
  },
  {
    slug: 'mantel-haenszel-test',
    title: 'Mantel-Haenszel stratified odds ratio calculator',
    family: 'Biostatistics & Risk',
    description: 'Calculate pooled odds ratios and chi-square significance across multiple stratified 2x2 contingency tables using the Mantel-Haenszel method.',
    keywords: ['Mantel Haenszel test', 'stratified odds ratio', 'Cochran Mantel Haenszel', 'stratified AB test'],
    inputs: ['Stratified 2x2 count tables per stratum / segment', 'Confidence level'],
    example: { a: ['Stratum 1 (Mobile): OR = 2.1', 'Stratum 2 (Desktop): OR = 1.9'], result: 'Pooled MH Odds Ratio = 2.02 (95% CI: [1.45, 2.81]), MH χ² = 16.4, p < .0001' },
    formula: 'OR_MH = Σ [ (a_k d_k) / N_k ] / Σ [ (b_k c_k) / N_k ]',
    code: {
      python: `from statsmodels.stats.contingency_tables import StratifiedTable\nst = StratifiedTable(tables)\nprint(st.oddsratio_pooled)`,
      r: `mantelhaen.test(array_3d)`,
      ts: `import { mantelHaenszel } from '@statlab/core';\nconst res = mantelHaenszel(strataTables);`,
    },
    useCases: [
      'Evaluating A/B experiment significance across stratified user segments without Simpson’s Paradox bias.',
      'Multi-center or multi-region benchmark synthesis in production telemetry.'
    ],
    when: 'Use when combining binary outcome tables across distinct strata or confounding subgroups.',
    cautions: [
      'Assumes homogeneous odds ratios across strata (check Breslow-Day test for homogeneity).',
      'Do not pool if odds ratios differ directionally across strata.'
    ],
    workbenchId: 'mantel_haenszel',
  },

  // --- TIME SERIES & TELEMETRY FAMILY ---
  {
    slug: 'granger-causality',
    title: 'Granger causality test calculator',
    family: 'Time Series & Telemetry',
    description: 'Evaluate whether past values of one time series predict future values of another time series using vector autoregressive Granger causality F-tests.',
    keywords: ['Granger causality test', 'lead lag causality', 'time series causality', 'VAR Granger test'],
    inputs: ['Time Series X (Potential cause)', 'Time Series Y (Target outcome)', 'Max lag order k'],
    example: { a: ['X (Memory utilization)', 'Y (Request latency ms)', 'Lag = 3'], result: 'F(3, 480) = 8.42, p = .00002. Memory utilization Granger-causes request latency.' },
    formula: 'Y_t = α + Σ β_i Y_{t-i} + Σ γ_j X_{t-j} + ε_t, test H₀: γ_1 = ... = γ_k = 0',
    code: {
      python: `from statsmodels.tsa.stattools import grangercausalitytests\nres = grangercausalitytests(df[['y', 'x']], maxlag=3)`,
      r: `library(vars)\nVARselect(df); causality(var_model, cause = "x")`,
      ts: `import { grangerCausality } from '@statlab/core';\nconst res = grangerCausality(ySeries, xSeries, 3);`,
    },
    useCases: [
      'Determining whether upstream microservice queue metrics predict downstream latency spikes in production telemetry.',
      'Root cause analysis in automated infrastructure diagnostic telemetry.'
    ],
    when: 'Use to establish predictive lead-lag relationships between two stationary time series.',
    cautions: [
      'Granger causality tests *predictive priority*, not physical causation.',
      'Both time series must be stationary prior to testing.'
    ],
    workbenchId: 'granger',
  },
  {
    slug: 'sharpe-ratio-calculator',
    title: 'Sharpe ratio and Sortino ratio calculator',
    family: 'Performance & Telemetry',
    description: 'Calculate annualized Sharpe ratio, Sortino ratio (downside risk), Information ratio, and Jobson-Korkie statistical significance tests.',
    keywords: ['Sharpe ratio calculator', 'Sortino ratio', 'downside risk ratio', 'performance ratio significance'],
    inputs: ['Return / Performance time series array', 'Risk-free rate or target threshold', 'Annualization factor (e.g. 252 days)'],
    example: { a: ['Daily yield returns (N=252)', 'Risk-free rate = 2.0%'], result: 'Annualized Sharpe Ratio = 1.85, Sortino Ratio = 2.42, p = .004 (statistically superior to benchmark).' },
    formula: 'Sharpe = (R̄ - R_f) / σ_R, Sortino = (R̄ - R_t) / σ_{downside}',
    code: {
      python: `import numpy as np\ndef sharpe_ratio(returns, rf=0.02, annualize=252):\n    excess = returns - rf/annualize\n    return np.mean(excess) / np.std(excess) * np.sqrt(annualize)`,
      r: `library(PerformanceAnalytics)\nSharpeRatio(returns, Rf = 0.02/252)`,
      ts: `import { sharpeRatio } from '@statlab/core';\nconst s = sharpeRatio(returns, 0.02);`,
    },
    useCases: [
      'Evaluating risk-adjusted yield and throughput efficiency ratios for algorithmic trading or server resource scheduling in production telemetry.',
      'Benchmarking performance stability.'
    ],
    when: 'Use when evaluating risk-adjusted performance of continuous yield or throughput time series.',
    cautions: [
      'Sharpe ratio assumes normally distributed returns; use Sortino ratio for skewed upside/downside distributions.',
      'Non-stationary returns distort Sharpe estimation.'
    ],
    workbenchId: 'sharpe',
  },
  {
    slug: 'ljung-box-test',
    title: 'Ljung-Box Q test for autocorrelation calculator',
    family: 'Time Series & Telemetry',
    description: 'Test whether time series residuals exhibit overall autocorrelation across multiple lag orders using the Ljung-Box Q statistic.',
    keywords: ['Ljung Box test', 'autocorrelation Q test', 'time series residual test', 'white noise test'],
    inputs: ['Time series residuals vector', 'Number of lags k'],
    example: { a: ['Residuals e_t (N=200)', 'Lags k = 10'], result: 'Q = 8.45, df = 10, p = .585. No significant residual autocorrelation (white noise).' },
    formula: 'Q = n(n+2) Σ_{k=1}^h (r_k² / (n - k))',
    code: {
      python: `from statsmodels.stats.diagnostic import acorr_ljungbox\nres = acorr_ljungbox(residuals, lags=[10])\nprint(res)`,
      r: `Box.test(residuals, lag = 10, type = "Ljung-Box")`,
      ts: `import { ljungBox } from '@statlab/core';\nconst res = ljungBox(residuals, 10);`,
    },
    useCases: [
      'Verifying that ARIMA telemetry model residuals resemble independent white noise in production telemetry.',
      'Testing for hidden temporal patterns in benchmark errors.'
    ],
    when: 'Use to test for overall residual independence across multiple time lags simultaneously.',
    cautions: [
      'Rejection of null (p < .05) indicates remaining autocorrelated structure in residuals.',
      'Adjust degrees of freedom if testing residuals from estimated ARIMA models.'
    ],
    workbenchId: 'ljung_box',
  },

  // --- REGRESSION EXTENSIONS FAMILY ---
  {
    slug: 'negative-binomial-regression',
    title: 'Negative Binomial regression calculator',
    family: 'Regression',
    description: 'Fit Negative Binomial count regression models for overdispersed count data where sample variance exceeds the mean.',
    keywords: ['Negative Binomial regression', 'overdispersion count model', 'alpha dispersion parameter', 'IRR regression'],
    inputs: ['Count outcome vector Y', 'Predictor matrix X', 'Dispersion parameter alpha estimation'],
    example: { a: ['Y (System Error Events)', 'X (Traffic Concurrency)'], result: 'log(λ) = -0.8 + 0.12*Concurrency, Alpha = 0.45 (Significant overdispersion p < .01), IRR = 1.127' },
    formula: 'Var(Y) = μ + α μ², log(μ) = β₀ + β₁X₁ + ...',
    code: {
      python: `import statsmodels.api as sm\nmodel = sm.GLM(y, X, family=sm.families.NegativeBinomial()).fit()\nprint(model.summary())`,
      r: `library(MASS)\nglm.nb(y ~ x1, data = df)`,
      ts: `import { negBinomialRegression } from '@statlab/core';\nconst res = negBinomialRegression(y, X);`,
    },
    useCases: [
      'Modeling overdispersed count metrics (e.g., server crash bursts, API error bursts) where Poisson assumptions fail.',
      'Predicting customer defect event counts in CI/CD pipeline benchmarks.'
    ],
    when: 'Use for count data when variance is significantly larger than the mean (overdispersion).',
    cautions: [
      'Check whether Poisson regression is adequate before assuming Negative Binomial.',
      'Dispersion parameter α = 0 reduces to standard Poisson regression.'
    ],
    workbenchId: 'neg_binom',
  },
  {
    slug: 'quantile-regression',
    title: 'Quantile regression calculator',
    family: 'Regression',
    description: 'Fit quantile regression models to estimate conditional percentiles (e.g. median p50, p90, p95) as a function of predictor variables.',
    keywords: ['quantile regression calculator', 'median regression', 'conditional percentile regression', 'p95 regression'],
    inputs: ['Outcome vector Y', 'Predictor matrix X', 'Target quantile τ (e.g. 0.50, 0.90, 0.95)'],
    example: { a: ['Y (Latency ms)', 'X (Payload KB)', 'Target Quantile τ = 0.95'], result: 'Q_0.95(Y) = 140.2 + 2.45 * Payload KB (p = .001). Models 95th percentile scaling directly.' },
    formula: 'min_β Σ ρ_τ (y_i - x_iᵀβ), where ρ_τ(u) = u(τ - I(u < 0))',
    code: {
      python: `import statsmodels.formula.api as smf\nmod = smf.quantreg('y ~ x', df)\nres = mod.fit(q=0.95)\nprint(res.summary())`,
      r: `library(quantreg)\nrq(y ~ x, tau = 0.95, data = df)`,
      ts: `import { quantileRegression } from '@statlab/core';\nconst res = quantileRegression(y, X, 0.95);`,
    },
    useCases: [
      'Modeling tail latency scaling (p95, p99) directly as a function of system load parameters in CI/CD pipeline benchmarks.',
      'Estimating non-homoscedastic quantile boundaries in production telemetry.'
    ],
    when: 'Use when modeling conditional percentiles or when outcome data exhibits heteroscedasticity or severe outliers.',
    cautions: [
      'Does not assume normal errors or constant variance.',
      'Quantile lines may cross at extreme predictor values (quantile crossing problem).'
    ],
    workbenchId: 'quantile_reg',
  },

  // --- MANN-WHITNEY U & NONPARAMETRIC FAMILY CONTINUED ---
  {
    slug: 'mann-whitney-u',
    title: 'Mann-Whitney U calculator',
    family: 'Nonparametric',
    description: 'Compare two independent groups with a rank-based Mann-Whitney U test (Wilcoxon rank-sum), including U statistic, asymptotic z, p-value, rank-biserial r, and Cliff’s delta.',
    keywords: ['Mann-Whitney U', 'Wilcoxon rank-sum', 'nonparametric test', 'rank-biserial correlation', 'Cliffs delta'],
    inputs: ['Group A numeric or ordinal values', 'Group B numeric or ordinal values', 'Tie handling method', 'Alternative hypothesis'],
    example: { a: ['Group A: 1, 2, 3, 5, 8', 'Group B: 4, 6, 7, 9, 10'], result: 'U_A = 4.0, U_B = 21.0, Rank-biserial r ≈ -0.68, asymptotic p ≈ .056' },
    formula: 'U_A = R_A - (n_A(n_A + 1))/2, U_B = n_A * n_B - U_A, r_{rb} = 1 - (2U / (n_A * n_B))',
    code: {
      python: `from scipy import stats\nres = stats.mannwhitneyu(group_a, group_b, alternative='two-sided')\nprint(f"U={res.statistic:.2f}, p={res.pvalue:.4f}")`,
      r: `wilcox.test(group_a, group_b, exact = FALSE)`,
      ts: `import { mannWhitneyU } from '@statlab/core';\nconst result = mannWhitneyU(groupA, groupB);`,
    },
    useCases: [
      'Evaluating non-normally distributed response times or long-tailed microservice latency in production telemetry.',
      'Comparing customer satisfaction score ranks across product subscription tiers.',
      'Benchmarking LLM toxicity or error distribution ranks in validation sprints.'
    ],
    when: 'Use when comparing two independent samples with ordinal data, non-normal continuous distributions, or heavy tail outliers.',
    cautions: [
      'Compares overall rank distribution shift, not strictly medians unless shapes are identical.',
      'Extensive tied values require continuity and tie-corrected variance adjustments.'
    ],
    workbenchId: 'mwu',
  },
  {
    slug: 'wilcoxon-signed-rank',
    title: 'Wilcoxon signed-rank test calculator',
    family: 'Nonparametric',
    description: 'Evaluate paired or repeated ordinal/continuous measurements with the non-parametric Wilcoxon signed-rank test, including W statistic, z-score, p-value, and matched-pairs rank-biserial r.',
    keywords: ['Wilcoxon signed-rank', 'paired nonparametric test', 'matched pairs rank test', 'W statistic'],
    inputs: ['Pre / Sample 1 values', 'Post / Sample 2 values', 'Zero-difference handling (Pratt / Wilcoxon / Zero-omit)'],
    example: { a: ['Pre: 12, 15, 18, 22, 29, 31', 'Post: 10, 14, 20, 19, 25, 28'], result: 'W+ = 18.0, W- = 3.0, z ≈ 1.57, p ≈ .116, r_rb ≈ 0.71' },
    formula: 'W = min(Σ R⁺, Σ R⁻), z = (W - n(n+1)/4) / √(n(n+1)(2n+1)/24)',
    code: {
      python: `from scipy import stats\nres = stats.wilcoxon(pre_values, post_values)\nprint(f"W={res.statistic:.2f}, p={res.pvalue:.4f}")`,
      r: `wilcox.test(pre_values, post_values, paired = TRUE)`,
      ts: `import { wilcoxonSignedRank } from '@statlab/core';\nconst result = wilcoxonSignedRank(preValues, postValues);`,
    },
    useCases: [
      'Assessing pre/post deployment metric shifts on paired endpoints when data violates normality.',
      'Evaluating paired code review quality ratings or human preference scores in LLM evaluations.'
    ],
    when: 'Use for paired observations when difference scores are non-normal or ordinal.',
    cautions: [
      'Pairs with zero difference must be explicitly handled.',
      'Assumes difference distribution is symmetric around the median.'
    ],
    workbenchId: 'wilcoxon_sr',
  },
  {
    slug: 'kruskal-wallis',
    title: 'Kruskal-Wallis H test calculator',
    family: 'Nonparametric',
    description: 'Compare three or more independent groups using the non-parametric Kruskal-Wallis H test, with H statistic, chi-square p-value, epsilon-squared effect size, and Dunn post-hoc tests.',
    keywords: ['Kruskal-Wallis test', 'nonparametric ANOVA', 'H test', 'Dunn test', 'epsilon squared'],
    inputs: ['Groups of numeric/ordinal values', 'Alpha level', 'Post-hoc correction (Dunn-Bonferroni)'],
    example: { a: ['Group A: 5, 8, 12, 14', 'Group B: 15, 18, 22, 25', 'Group C: 28, 32, 35, 40'], result: 'H ≈ 9.85, df = 2, p ≈ .007, ε² ≈ 0.895' },
    formula: 'H = [ 12 / (N(N+1)) ] * Σ (R_i² / n_i) - 3(N+1)',
    code: {
      python: `from scipy import stats\nres = stats.kruskal(group_a, group_b, group_c)\nprint(f"H={res.statistic:.4f}, p={res.pvalue:.4f}")`,
      r: `kruskal.test(list(group_a, group_b, group_c))`,
      ts: `import { kruskalWallis } from '@statlab/core';\nconst result = kruskalWallis([groupA, groupB, groupC]);`,
    },
    useCases: [
      'Comparing user feedback rating distributions across 3+ server deployment regions in production telemetry.',
      'Evaluating non-parametric latency across multiple Kubernetes pod configurations in CI/CD pipeline benchmarks.'
    ],
    when: 'Use when comparing 3+ independent groups and ANOVA normality assumptions fail.',
    cautions: [
      'Follow up significant H results with Dunn’s test rather than standard pairwise t-tests.',
      'Sensitive to differences in distribution shape across groups.'
    ],
    workbenchId: 'kruskal',
  },
  {
    slug: 'rank-biserial-correlation',
    title: "Rank-biserial correlation and Cliff's delta calculator",
    family: 'Nonparametric',
    description: "Calculate rank-biserial correlation (r_rb) and Cliff's delta (d) non-parametric effect sizes for Mann-Whitney U test outcomes.",
    keywords: ['rank biserial correlation', 'Cliffs delta', 'nonparametric effect size', 'Mann-Whitney effect size'],
    inputs: ['Group A values (or U statistic)', 'Group B values (or sample sizes n_A, n_B)'],
    example: { a: ['Group A (n=10)', 'Group B (n=10)', 'U = 15.0'], result: 'r_rb = 0.70, Cliff’s delta = 0.70 (large non-parametric effect)' },
    formula: 'r_{rb} = 1 - (2U / (n_A * n_B)), Cliff’s δ = (2U / (n_A * n_B)) - 1',
    code: {
      python: `def cliffs_delta(lst1, lst2):\n    m, n = len(lst1), len(lst2)\n    more = sum(i > j for i in lst1 for j in lst2)\n    less = sum(i < j for i in lst1 for j in lst2)\n    return (more - less) / (m * n)`,
      r: `library(effsize)\ncliff.delta(group_a, group_b)`,
      ts: `import { rankBiserial } from '@statlab/core';\nconst r_rb = rankBiserial(groupA, groupB);`,
    },
    useCases: [
      'Quantifying rank superiority magnitude between telemetry sample runs in production telemetry.',
      'Expressing non-parametric shift size in release readiness audit reports.'
    ],
    when: 'Use alongside Mann-Whitney U test results to communicate non-parametric effect magnitude.',
    cautions: [
      'Ranges strictly from -1.0 to +1.0; zero indicates complete distributional overlap.',
      'Do not confuse with Pearson point-biserial correlation.'
    ],
    workbenchId: 'effect_size_nonparam',
  },
  {
    slug: 'friedman-test',
    title: 'Friedman test calculator',
    family: 'Nonparametric',
    description: 'Perform non-parametric repeated measures ANOVA using the Friedman test for ranked metrics across 3+ matched conditions.',
    keywords: ['Friedman test', 'nonparametric repeated measures', 'Kendall W', 'rank sum repeated measures'],
    inputs: ['Matched subject rows', 'Repeated condition columns', 'Post-hoc correction choice'],
    example: { a: ['System 1: Config A=1, B=2, C=3', 'System 2: Config A=1, B=3, C=2', 'System 3: Config A=2, B=3, C=1'], result: 'Q_F = 4.67, df = 2, p = .097, Kendall W = 0.52' },
    formula: 'Q_F = [ 12 / (n k (k+1)) ] * Σ R_j² - 3 n (k+1)',
    code: {
      python: `from scipy import stats\nres = stats.friedmanchisquare(c1, c2, c3)\nprint(f"Q={res.statistic:.4f}, p={res.pvalue:.4f}")`,
      r: `friedman.test(as.matrix(df))`,
      ts: `import { friedmanTest } from '@statlab/core';\nconst res = friedmanTest(matrix);`,
    },
    useCases: [
      'Comparing ranked performance metrics across 3+ database indexing strategies on matched queries.',
      'Evaluating subjective LLM output ranks across model iterations.'
    ],
    when: 'Use when comparing 3+ repeated or matched conditions with ordinal or non-normal data.',
    cautions: [
      'Requires complete matched blocks without missing entries.',
      'Follow up significant results with Nemenyi or Wilcoxon signed-rank post-hoc tests.'
    ],
    workbenchId: 'friedman',
  },
  {
    slug: 'dunn-test',
    title: "Dunn's post-hoc test calculator",
    family: 'Nonparametric',
    description: "Perform pairwise rank sum post-hoc comparisons following a significant Kruskal-Wallis test using Dunn's test with Bonferroni or Holm p-value adjustments.",
    keywords: ['Dunn test', 'Kruskal-Wallis post-hoc', 'pairwise rank test', 'Dunn Bonferroni'],
    inputs: ['Rank sum matrix or sample groups', 'Kruskal-Wallis mean ranks', 'Alpha & Multiplicity correction'],
    example: { a: ['Group 1 vs 2: z = 2.14, adj_p = .048', 'Group 1 vs 3: z = 3.85, adj_p = .0003'], result: 'Pairwise rank differences statistically significant after Holm adjustment.' },
    formula: 'z = (R̄_i - R̄_j) / √[ (N(N+1)/12) * (1/n_i + 1/n_j) ]',
    code: {
      python: `import scikit_posthocs as sp\nres = sp.posthoc_dunn(df, val_col='score', group_col='group', p_adjust='holm')`,
      r: `library(FSA)\ndunnTest(score ~ group, data = df, method = "holm")`,
      ts: `import { dunnTest } from '@statlab/core';\nconst res = dunnTest(groups);`,
    },
    useCases: [
      'Pinpointing exact multi-region latency rank shifts in infrastructure telemetry monitoring.',
      'Evaluating specific prompt framework rank differences in CI/CD pipeline benchmarks.'
    ],
    when: 'Use after Kruskal-Wallis test indicates significant overall group differences.',
    cautions: [
      'Always apply multiplicity corrections (Holm or Bonferroni) to avoid inflated Type I error rates.',
      'Calculates mean rank differences, not median differences.'
    ],
    workbenchId: 'dunn',
  },
  {
    slug: 'kolmogorov-smirnov-test',
    title: 'Kolmogorov-Smirnov test calculator',
    family: 'Nonparametric',
    description: 'Compare empirical cumulative distribution functions (ECDFs) of two continuous sample groups with the two-sample Kolmogorov-Smirnov (K-S) test.',
    keywords: ['Kolmogorov Smirnov test', 'two sample KS test', 'ECDF comparison', 'distribution shape shift'],
    inputs: ['Sample A continuous values', 'Sample B continuous values', 'Alternative hypothesis'],
    example: { a: ['Sample A (N=200): baseline telemetry', 'Sample B (N=200): candidate deployment'], result: 'D = 0.185, p = .0024. Distributions differ significantly in shape or location.' },
    formula: 'D = sup_x |F_1(x) - F_2(x)|',
    code: {
      python: `from scipy import stats\nres = stats.ks_2samp(sample_a, sample_b)\nprint(f"D={res.statistic:.4f}, p={res.pvalue:.4f}")`,
      r: `ks.test(sample_a, sample_b)`,
      ts: `import { ks2Samp } from '@statlab/core';\nconst res = ks2Samp(sampleA, sampleB);`,
    },
    useCases: [
      'Detecting entire telemetry distribution shape shifts (not just mean or median shifts) in production telemetry.',
      'Verifying data drift between training baseline and production inference streams in CI/CD pipeline benchmarks.'
    ],
    when: 'Use when comparing whether two continuous samples come from identical probability distributions.',
    cautions: [
      'Sensitive to differences in mean, variance, skewness, and tail behavior.',
      'Tied values degrade test sensitivity; use jittering or exact tie-corrected implementations.'
    ],
    workbenchId: 'ks_2samp',
  },

  // --- ANOVA FAMILY ---
  {
    slug: 'one-way-anova',
    title: 'One-way ANOVA calculator',
    family: 'ANOVA',
    description: 'Compare three or more independent group means with one-way Analysis of Variance (ANOVA), F-statistic, omnibus p-value, Eta-squared (η²), Omega-squared (ω²), and Tukey HSD post-hoc test.',
    keywords: ['one-way ANOVA', 'F test', 'eta squared', 'Tukey HSD', 'SSB SSW', 'omnibus F'],
    inputs: ['Groups of numeric values (3+ groups)', 'Alpha significance level', 'Post-hoc adjustment (Tukey HSD, Bonferroni)'],
    example: { a: ['Control: 5, 7, 8, 9', 'Treatment A: 8, 9, 10, 12', 'Treatment B: 11, 13, 13, 15'], result: 'F(2, 9) = 14.82, p ≈ .001, η² = 0.767, Tukey HSD shows Treatment B > Control (p < .01)' },
    formula: 'F = MS_between / MS_within = (SS_B / df_B) / (SS_W / df_W), η² = SS_B / SS_total',
    code: {
      python: `from scipy import stats\nres = stats.f_oneway(group1, group2, group3)\nprint(f"F={res.statistic:.4f}, p={res.pvalue:.4f}")`,
      r: `res <- aov(value ~ group, data = df)\nsummary(res)`,
      ts: `import { anovaOneWay } from '@statlab/core';\nconst result = anovaOneWay([group1, group2, group3]);`,
    },
    useCases: [
      'Comparing latency performance across multiple cloud providers or instance tiers.',
      'Evaluating user conversion rates across multiple landing page variants in production telemetry.',
      'Assessing model benchmark quality across prompt framework configurations in CI/CD pipeline benchmarks.'
    ],
    when: 'Use when comparing continuous outcome means across 3 or more independent categorical groups.',
    cautions: [
      'Requires homogeneity of variances across groups (check Levene’s test). Use Welch ANOVA if variances differ.',
      'Omnibus F test only indicates at least one group differs; run post-hoc tests to pinpoint differences.'
    ],
    workbenchId: 'anova',
  },
  {
    slug: 'welch-anova',
    title: "Welch's ANOVA calculator",
    family: 'ANOVA',
    description: "Compare multiple group means when group variances are unequal using Welch's ANOVA, adjusted F-statistic, Welch degrees of freedom, and Games-Howell post-hoc test.",
    keywords: ['Welch ANOVA', 'unequal variances ANOVA', 'Games-Howell test', 'heteroscedastic ANOVA'],
    inputs: ['Groups of numeric values', 'Alpha level', 'Post-hoc method (Games-Howell)'],
    example: { a: ['Group A (s²=1.2): 10, 11, 12, 12', 'Group B (s²=14.5): 14, 18, 22, 25', 'Group C (s²=8.1): 8, 12, 15, 17'], result: 'Welch F(2, 5.42) = 5.38, p ≈ .052' },
    formula: 'F_W = [ Σ w_i(X̄_i - X̄\')² / (k - 1) ] / [ 1 + 2(k - 2)/(k² - 1) * Σ ((1 - w_i/W)² / (n_i - 1)) ]',
    code: {
      python: `import pingouin as pg\nres = pg.welch_anova(dv='value', between='group', data=df)\nprint(res)`,
      r: `oneway.test(value ~ group, data = df, var.equal = FALSE)`,
      ts: `import { welchAnova } from '@statlab/core';\nconst result = welchAnova([groupA, groupB, groupC]);`,
    },
    useCases: [
      'Comparing API response time distributions across microservices with heterogeneous traffic variances.',
      'Benchmarking system load tests where high-load variants exhibit much higher variance.'
    ],
    when: 'Use for multi-group mean comparisons when Levene’s test indicates unequal variances.',
    cautions: [
      'Use Games-Howell for post-hoc comparisons instead of Tukey HSD when variances differ.',
      'Degrees of freedom are non-integer due to Welch adjustment.'
    ],
    workbenchId: 'welch_anova',
  },
  {
    slug: 'two-way-anova',
    title: 'Two-way factorial ANOVA calculator',
    family: 'ANOVA',
    description: 'Analyze main effects of two independent factors and their interaction effect on a continuous outcome variable, including F-statistics, partial Eta-squared (ηₚ²), and interaction plots.',
    keywords: ['two-way ANOVA', 'factorial ANOVA', 'interaction effect', 'partial eta squared', 'main effects'],
    inputs: ['Factor A levels', 'Factor B levels', 'Outcome numeric values', 'Alpha level'],
    example: { a: ['Factor A (Cache: On/Off)', 'Factor B (Region: US/EU)', 'Outcome: Latency ms'], result: 'F_A(1, 36) = 18.4, p < .001; F_B(1, 36) = 4.2, p = .048; F_AxB(1, 36) = 8.9, p = .005' },
    formula: 'SS_total = SS_A + SS_B + SS_AB + SS_error, F_A = MS_A / MS_error, F_AB = MS_AB / MS_error',
    code: {
      python: `import statsmodels.api as sm\nfrom statsmodels.formula.api import ols\nmodel = ols('latency ~ C(cache) * C(region)', data=df).fit()\nanova_table = sm.stats.anova_lm(model, typ=2)`,
      r: `res <- aov(latency ~ cache * region, data = df)\nsummary(res)`,
      ts: `import { anovaTwoWay } from '@statlab/core';\nconst result = anovaTwoWay(data, 'cache', 'region', 'latency');`,
    },
    useCases: [
      'Evaluating the combined impact of cache settings and geographic regions on latency in production telemetry.',
      'Testing LLM prompt architecture and model family interaction on execution quality in CI/CD pipeline benchmarks.'
    ],
    when: 'Use when testing two categorical independent variables simultaneously to check for main and interaction effects.',
    cautions: [
      'If interaction effect is statistically significant, interpret main effects with caution.',
      'Balanced design (equal sample sizes per cell) simplifies Type II / Type III sum of squares calculation.'
    ],
    workbenchId: 'anova_twoway',
  },
  {
    slug: 'rm-anova',
    title: 'Repeated measures ANOVA calculator',
    family: 'ANOVA',
    description: 'Compare means across 3+ repeated measurements on the same subjects or systems, with Greenhouse-Geisser and Huynh-Feldt sphericity corrections, F-statistic, and partial Eta-squared.',
    keywords: ['repeated measures ANOVA', 'RM ANOVA', 'sphericity Greenhouse Geisser', 'within subjects ANOVA', 'Mauchly test'],
    inputs: ['Repeated condition columns (Condition 1, 2, 3...)', 'Subject / System IDs', 'Sphericity correction choice'],
    example: { a: ['Subject 1: T1=120, T2=110, T3=95', 'Subject 2: T1=135, T2=122, T3=105', 'Subject 3: T1=128, T2=118, T3=99'], result: 'F(2, 4) = 42.1, p ≈ .002, GG ε = 0.82, ηₚ² = 0.955' },
    formula: 'F = MS_condition / MS_error, df_adjusted = ε * df',
    code: {
      python: `import pingouin as pg\nres = pg.rm_anova(dv='latency', within='time', subject='endpoint_id', data=df)\nprint(res)`,
      r: `res <- aov(latency ~ time + Error(endpoint_id/time), data = df)\nsummary(res)`,
      ts: `import { rmAnova } from '@statlab/core';\nconst result = rmAnova(data, { subjectCol: 'id', withinCol: 'time', valueCol: 'val' });`,
    },
    useCases: [
      'Tracking server latency profiles across 3+ sequential traffic load steps.',
      'Evaluating continuous telemetry performance across 5 sequential releases in production telemetry.'
    ],
    when: 'Use when measuring the same subjects or technical endpoints across 3 or more conditions.',
    cautions: [
      'Check Mauchly’s test for sphericity; apply Greenhouse-Geisser correction if violated.',
      'Missing data points across repeated conditions require mixed-effects model approaches.'
    ],
    workbenchId: 'anova_rm',
  },
  {
    slug: 'ancova-calculator',
    title: 'ANCOVA (Analysis of Covariance) calculator',
    family: 'ANOVA',
    description: 'Evaluate treatment group differences on a continuous outcome while statistically adjusting for a baseline continuous covariate.',
    keywords: ['ANCOVA calculator', 'analysis of covariance', 'baseline covariate adjustment', 'adjusted means'],
    inputs: ['Group factor', 'Outcome Y', 'Continuous Baseline Covariate X', 'Alpha level'],
    example: { a: ['Control vs Treatment', 'Covariate: Baseline Latency ms', 'Outcome: Post-optimization Latency ms'], result: 'F_Group(1, 47) = 12.4, p = .0009; Covariate adjusted treatment diff = -14.2ms.' },
    formula: 'Y = β₀ + β₁X_covariate + β₂Group + ε',
    code: {
      python: `import statsmodels.api as sm\nfrom statsmodels.formula.api import ols\nmodel = ols('post_val ~ baseline_val + C(group)', data=df).fit()`,
      r: `res <- aov(post_val ~ baseline_val + group, data = df)\nsummary(res)`,
      ts: `import { ancova } from '@statlab/core';\nconst res = ancova(df, 'post_val', 'baseline_val', 'group');`,
    },
    useCases: [
      'Evaluating server optimization latency while controlling for pre-test baseline server load.',
      'Comparing user conversion uplift while controlling for prior account activity level.'
    ],
    when: 'Use to increase statistical power by controlling for baseline covariate variation.',
    cautions: [
      'Assumes parallel regression slopes across groups (homogeneity of regression slopes).',
      'Covariate must be measured prior to treatment intervention.'
    ],
    workbenchId: 'ancova',
  },
  {
    slug: 'tukey-hsd',
    title: 'Tukey HSD post-hoc test calculator',
    family: 'ANOVA',
    description: 'Perform pairwise mean comparisons following significant ANOVA with Tukey’s Honestly Significant Difference (HSD) test, studentized range q-statistic, adjusted p-values, and confidence intervals.',
    keywords: ['Tukey HSD', 'post hoc test', 'pairwise comparisons ANOVA', 'studentized range q', 'familywise error rate'],
    inputs: ['Group means & sample sizes', 'ANOVA MS_error & df_error', 'Alpha significance level'],
    example: { a: ['Control vs A: diff = 2.5, q = 3.82, p = .042', 'Control vs B: diff = 5.2, q = 7.94, p < .001', 'A vs B: diff = 2.7, q = 4.12, p = .028'], result: 'All pairwise comparisons statistically significant at α = .05 with familywise error protection.' },
    formula: 'q = (X̄_i - X̄_j) / √(MS_error / n), HSD = q_critical * √(MS_error / n)',
    code: {
      python: `from statsmodels.stats.multicomp import pairwise_tukeyhsd\nres = pairwise_tukeyhsd(endog=data['val'], groups=data['group'], alpha=0.05)\nprint(res)`,
      r: `TukeyHSD(aov(val ~ group, data = df))`,
      ts: `import { tukeyHSD } from '@statlab/core';\nconst comparisons = tukeyHSD(anovaResult);`,
    },
    useCases: [
      'Identifying specific winning variants in multi-arm A/B tests after omnibus ANOVA significance.',
      'Pinpointing exact performance regressions across multiple benchmark software builds in CI/CD pipeline benchmarks.'
    ],
    when: 'Use after a significant omnibus ANOVA F-test to test all pairwise group differences while controlling familywise error rate.',
    cautions: [
      'Assumes equal group sample sizes and equal variances; use Kramer modification for unequal n.',
      'Do not run without a prior omnibus ANOVA.'
    ],
    workbenchId: 'tukey',
  },
  {
    slug: 'eta-squared-calculator',
    title: 'Eta-squared and Partial Eta-squared calculator',
    family: 'ANOVA',
    description: 'Calculate Eta-squared (η²), Partial Eta-squared (ηₚ²), and Omega-squared (ω²) effect sizes for one-way and factorial ANOVA models.',
    keywords: ['eta squared calculator', 'partial eta squared', 'omega squared', 'ANOVA effect size', 'SS_between SS_total'],
    inputs: ['Sum of Squares Between (SS_B)', 'Sum of Squares Error (SS_E)', 'Sum of Squares Total (SS_T)'],
    example: { a: ['SS_between = 145.2', 'SS_error = 44.8', 'SS_total = 190.0'], result: 'η² = 0.764, ηₚ² = 0.764, ω² = 0.738 (large effect size)' },
    formula: 'η² = SS_between / SS_total, ηₚ² = SS_between / (SS_between + SS_error), ω² = (SS_B - df_B*MS_E) / (SS_T + MS_E)',
    code: {
      python: `def eta_squared(ss_b, ss_t):\n    return ss_b / ss_t\ndef partial_eta_squared(ss_b, ss_e):\n    return ss_b / (ss_b + ss_e)`,
      r: `library(effectsize)\neta_squared(aov_model)`,
      ts: `import { etaSquared, partialEtaSquared } from '@statlab/core';\nconst eta2 = etaSquared(ssB, ssT);`,
    },
    useCases: [
      'Determining the proportion of variance explained by configuration parameters in benchmark runs.',
      'Reporting standardized ANOVA effect sizes in production release-readiness audits.'
    ],
    when: 'Use alongside ANOVA F-tests to report variance explained magnitude.',
    cautions: [
      'Eta-squared tends to overestimate population effect size in small samples; use Omega-squared for unbiased estimation.',
      'In factorial designs, Partial Eta-squared does not sum to 1.0 across factors.'
    ],
    workbenchId: 'effect_size_anova',
  },

  // --- BAYESIAN STATISTICS FAMILY ---
  {
    slug: 'bayesian-ab-test',
    title: 'Bayesian A/B testing calculator',
    family: 'Bayesian Statistics',
    description: 'Calculate Bayesian posterior probabilities, probability of B beating A, expected loss, and Beta-Binomial credible intervals for A/B conversion experiments.',
    keywords: ['Bayesian AB test', 'probability of superiority', 'Beta Binomial AB test', 'Bayesian conversion test', 'expected loss'],
    inputs: ['Control sample N & conversions', 'Variant sample N & conversions', 'Prior Alpha & Beta (e.g. Beta(1,1))', 'Monte Carlo simulation draws (e.g. 50,000)'],
    example: { a: ['Control A: 850 / 10,000 (8.50%)', 'Variant B: 960 / 10,000 (9.60%)'], result: 'P(B > A) = 99.1%, Expected Loss of choosing B = 0.0001%, 95% Credible Interval for uplift: [+0.38%, +1.82%]' },
    formula: 'Posterior ~ Beta(α + successes, β + failures), P(B > A) = ∫ P(θ_B > θ_A | data) dθ',
    code: {
      python: `import scipy.stats as stats\nimport numpy as np\na_draws = stats.beta.rvs(1 + 850, 1 + 9150, size=50000)\nb_draws = stats.beta.rvs(1 + 960, 1 + 9040, size=50000)\nprob_b_wins = np.mean(b_draws > a_draws)\nprint(f"P(B > A) = {prob_b_wins:.4f}")`,
      r: `a_draws <- rbeta(50000, 851, 9151)\nb_draws <- rbeta(50000, 961, 9041)\nmean(b_draws > a_draws)`,
      ts: `import { bayesianAbTest } from '@statlab/core';\nconst res = bayesianAbTest({ a: { n: 10000, conv: 850 }, b: { n: 10000, conv: 960 } });`,
    },
    useCases: [
      'Automating continuous Bayesian decision boundaries in experimentation engines without p-value peeking penalties.',
      'Evaluating real-time feature flag rollout confidence in live production.'
    ],
    when: 'Use when you need intuitive probability statements (e.g. "99% chance B is better than A") and expected loss risk bounds.',
    cautions: [
      'Posterior results depend on prior distributions when sample sizes are small.',
      'Report expected loss alongside win probability to avoid deciding on trivial uplifts.'
    ],
    workbenchId: 'bayes_ab',
  },
  {
    slug: 'bayesian-t-test',
    title: 'Bayesian t-test calculator',
    family: 'Bayesian Statistics',
    description: 'Calculate Bayes Factor (BF₁₀ / BF₀₁), Cauchy prior scaling, and posterior distribution estimates for two-sample mean comparisons.',
    keywords: ['Bayesian t-test', 'Bayes Factor BF10', 'Cauchy prior t-test', 'evidence for null'],
    inputs: ['Group A numeric values', 'Group B numeric values', 'Cauchy prior scale r (e.g. 0.707 medium)'],
    example: { a: ['Group A (N=30)', 'Group B (N=30)', 't = 2.85'], result: 'BF₁₀ = 6.42 (Moderate evidence for H₁ over H₀). Median posterior d = 0.71.' },
    formula: 'BF₁₀ = p(Data | H₁) / p(Data | H₀), integrated under Cauchy(0, r) prior.',
    code: {
      python: `import pingouin as pg\nres = pg.bayesfactor_ttest(t=2.85, nx=30, ny=30, r=0.707)\nprint(f"BF10 = {res:.4f}")`,
      r: `library(BayesFactor)\nttestBF(x = group_a, y = group_b)`,
      ts: `import { bayesFactorT } from '@statlab/core';\nconst bf = bayesFactorT(groupA, groupB, { r: 0.707 });`,
    },
    useCases: [
      'Quantifying evidence *in favor of the null hypothesis* (e.g., proving two microservices have indistinguishable latency).',
      'Assessing model equivalence in AI benchmark regressions.'
    ],
    when: 'Use when you want to distinguish between "no effect" (evidence for null) vs "insufficient data" (inconclusive).',
    cautions: [
      'Bayes factors are sensitive to the width of the prior scale parameter r.',
      'A BF₁₀ between 0.33 and 3.0 represents weak/anecdotal evidence.'
    ],
    workbenchId: 'bayes_t',
  },

  // --- SURVIVAL & RELIABILITY FAMILY ---
  {
    slug: 'kaplan-meier-survival',
    title: 'Kaplan-Meier survival analysis calculator',
    family: 'Survival & Reliability',
    description: 'Compute non-parametric Kaplan-Meier survival curves, median survival time, Greenwood standard error, and cumulative failure hazard probabilities.',
    keywords: ['Kaplan Meier calculator', 'survival curve', 'MTBF survival', 'censored data survival', 'Greenwood SE'],
    inputs: ['Event / Duration times', 'Censoring status (1 = event occurred, 0 = right-censored)'],
    example: { a: ['Durations: 12, 24, 35+, 48, 52+, 60', 'Status: 1, 1, 0, 1, 0, 1'], result: 'Median Survival Time = 48.0 time units, 80% survival probability at t=24.' },
    formula: 'Ŝ(t) = Π_{t_i ≤ t} (1 - d_i / n_i), Var(Ŝ(t)) = Ŝ(t)² Σ [ d_i / (n_i(n_i - d_i)) ]',
    code: {
      python: `from lifelines import KaplanMeierFitter\nkmf = KaplanMeierFitter()\nkmf.fit(durations, event_observed=censor_status)\nprint(kmf.median_survival_time_)`,
      r: `library(survival)\nfit <- survfit(Surv(time, status) ~ 1)\nsummary(fit)`,
      ts: `import { kaplanMeier } from '@statlab/core';\nconst res = kaplanMeier(durations, status);`,
    },
    useCases: [
      'Analyzing service container uptime, Mean Time Between Failures (MTBF), and crash survival rates.',
      'Measuring customer subscription retention curves in production system telemetry.'
    ],
    when: 'Use when analyzing time-to-event data subject to right-censoring.',
    cautions: [
      'Assumes censoring is independent of survival probability.',
      'Censored items must be recorded accurately.'
    ],
    workbenchId: 'kaplan_meier',
  },
  {
    slug: 'weibull-reliability',
    title: 'Weibull reliability and failure rate calculator',
    family: 'Survival & Reliability',
    description: 'Estimate Weibull shape parameter β (slope), scale parameter η (characteristic life), Mean Time To Failure (MTTF), and hazard rate functions.',
    keywords: ['Weibull calculator', 'reliability analysis', 'MTTF Weibull', 'shape parameter beta', 'scale parameter eta'],
    inputs: ['Failure / Lifetime data points', 'Censoring indicator array', 'Estimation method (MLE / Least Squares Rank)'],
    example: { a: ['Lifetimes (hrs): 120, 340, 520, 890, 1100'], result: 'Weibull β = 1.45 (wear-out failure mode), η = 680 hrs, MTTF = 618 hrs.' },
    formula: 'R(t) = exp[ -(t/η)^β ], h(t) = (β/η)(t/η)^(β-1)',
    code: {
      python: `from scipy import stats\nshape, loc, scale = stats.weibull_min.fit(durations, floc=0)\nprint(f"beta={shape:.2f}, eta={scale:.2f}")`,
      r: `library(flexsurv)\nflexsurvreg(Surv(time, status) ~ 1, dist = "weibull")`,
      ts: `import { weibullFit } from '@statlab/core';\nconst fit = weibullFit(durations);`,
    },
    useCases: [
      'Modeling hardware failure modes (infant mortality β<1 vs wear-out β>1) for cloud infrastructure.',
      'Predicting component reliability thresholds in quality assurance audits.'
    ],
    when: 'Use for lifetime data modeling and reliability engineering.',
    cautions: [
      'β < 1 indicates decreasing failure rate; β = 1 constant exponential rate; β > 1 wear-out rate.',
      'Minimum sample size N ≥ 10 recommended for stable MLE shape estimation.'
    ],
    workbenchId: 'weibull',
  },
  {
    slug: 'log-rank-test',
    title: 'Log-rank test calculator',
    family: 'Survival & Reliability',
    description: 'Compare survival curves between two or more independent groups using the non-parametric log-rank test (Mantel-Cox test).',
    keywords: ['log rank test', 'Mantel Cox test', 'compare survival curves', 'hazard ratio comparison'],
    inputs: ['Group A durations & status', 'Group B durations & status', 'Alternative hypothesis'],
    example: { a: ['Group A (Baseline server version)', 'Group B (Candidate patch version)'], result: 'χ² = 5.48, df = 1, p = .0192. Survival curves differ significantly.' },
    formula: 'χ² = [ Σ (O_1j - E_1j) ]² / Σ V_j, where E_1j = n_1j (d_j / n_j)',
    code: {
      python: `from lifelines.statistics import logrank_test\nres = logrank_test(durations_a, durations_b, event_observed_A=status_a, event_observed_B=status_b)\nprint(f"p={res.p_value:.4f}")`,
      r: `library(survival)\nsurvdiff(Surv(time, status) ~ group)`,
      ts: `import { logRankTest } from '@statlab/core';\nconst res = logRankTest(groupA, groupB);`,
    },
    useCases: [
      'Comparing process failure rates between software patch builds.',
      'Evaluating node crash survival times across deployment clusters.'
    ],
    when: 'Use to test whether two or more survival distributions differ significantly.',
    cautions: [
      'Assumes proportional hazards across groups over time.',
      'Non-parametric test; does not estimate magnitude of hazard ratio directly (use Cox model).'
    ],
    workbenchId: 'log_rank',
  },
  {
    slug: 'hazard-ratio-calculator',
    title: 'Hazard Ratio and Cox regression calculator',
    family: 'Survival & Reliability',
    description: 'Estimate Hazard Ratios (HR), 95% confidence intervals, and Cox proportional hazards regression parameters for survival time analysis.',
    keywords: ['hazard ratio calculator', 'Cox regression', 'proportional hazards', 'hazard ratio CI'],
    inputs: ['Survival times', 'Censoring status', 'Covariate groups (Treatment vs Control)'],
    example: { a: ['Control vs Candidate Patch', 'HR = 0.42 (95% CI: [.21, .84])'], result: 'Candidate patch reduces failure rate by 58% (p = .014).' },
    formula: 'h(t|X) = h₀(t) exp(βᵀX), HR = exp(β)',
    code: {
      python: `from lifelines import CoxPHFitter\ncph = CoxPHFitter()\ncph.fit(df, duration_col='time', event_col='status')\nprint(cph.summary)`,
      r: `library(survival)\ncoxph(Surv(time, status) ~ group, data = df)`,
      ts: `import { coxRegression } from '@statlab/core';\nconst res = coxRegression(df);`,
    },
    useCases: [
      'Quantifying relative crash risk reduction between deployment versions in CI/CD pipeline benchmarks.',
      'Modeling component failure hazards under load.'
    ],
    when: 'Use when comparing relative event rates over time while controlling for covariates.',
    cautions: [
      'Check proportional hazards assumption (Schoenfeld residuals).',
      'HR < 1 indicates reduced hazard; HR > 1 indicates increased hazard.'
    ],
    workbenchId: 'cox_hr',
  },

  // --- STATISTICAL DIAGNOSTICS FAMILY ---
  {
    slug: 'shapiro-wilk-test',
    title: 'Shapiro-Wilk normality test calculator',
    family: 'Statistical Diagnostics',
    description: 'Test whether a sample distribution departs significantly from normality using the Shapiro-Wilk W statistic and p-value.',
    keywords: ['Shapiro Wilk test', 'normality test calculator', 'W statistic', 'test for normality'],
    inputs: ['Sample numeric data array (N = 3 to 5,000)', 'Alpha significance level (typically 0.05)'],
    example: { a: ['Sample: 12.1, 14.5, 13.8, 15.2, 11.9, 14.1, 13.5'], result: 'W = 0.968, p = .882. Sample does not violate normality assumptions (p > .05).' },
    formula: 'W = [ Σ a_i x_(i) ]² / Σ (x_i - X̄)²',
    code: {
      python: `from scipy import stats\nW, p = stats.shapiro(sample_data)\nprint(f"W={W:.4f}, p={p:.4f}")`,
      r: `shapiro.test(sample_data)`,
      ts: `import { shapiroWilk } from '@statlab/core';\nconst res = shapiroWilk(sampleData);`,
    },
    useCases: [
      'Validating normality assumptions before deciding between Student/Welch t-test vs Mann-Whitney U test.',
      'Automated assumption checking in CI/CD statistical gate checks.'
    ],
    when: 'Use to test continuous data for normality prior to applying parametric inferential tests.',
    cautions: [
      'In large samples (N > 500), small trivial departures from normality will yield significant p-values.',
      'In small samples (N < 20), test power to detect non-normality is low.'
    ],
    workbenchId: 'shapiro',
  },
  {
    slug: 'levene-test',
    title: "Levene's test for equality of variances calculator",
    family: 'Statistical Diagnostics',
    description: "Perform Levene's test or Brown-Forsythe test for homoscedasticity across two or more sample groups.",
    keywords: ['Levene test', 'Brown Forsythe test', 'equality of variances', 'homoscedasticity test'],
    inputs: ['Sample groups data', 'Center metric choice (Mean / Median / Trimmed Mean)'],
    example: { a: ['Group 1 (n=20)', 'Group 2 (n=20)', 'Group 3 (n=20)'], result: 'W = 4.12, df = (2, 57), p = .021. Variances are significantly unequal (use Welch ANOVA).' },
    formula: 'W = [ (N - k)/(k - 1) ] * [ Σ n_i (Z̄_i. - Z̄..)² / Σ Σ (Z_ij - Z̄_i.)² ], where Z_ij = |Y_ij - Ỹ_i|',
    code: {
      python: `from scipy import stats\nstat, p = stats.levene(g1, g2, g3, center='median')\nprint(f"W={stat:.4f}, p={p:.4f}")`,
      r: `library(car)\nleveneTest(val ~ group, data = df, center = median)`,
      ts: `import { leveneTest } from '@statlab/core';\nconst res = leveneTest([g1, g2, g3]);`,
    },
    useCases: [
      'Checking homoscedasticity before choosing pooled ANOVA vs Welch ANOVA in production telemetry.',
      'Detecting variance instability across server configurations.'
    ],
    when: 'Use before ANOVA or independent t-tests to verify equal variance assumptions.',
    cautions: [
      'Use median centering (Brown-Forsythe variant) when data is skewed or heavy-tailed.',
      'Significant Levene result indicates variance inequality.'
    ],
    workbenchId: 'levene',
  },
  {
    slug: 'vif-multicollinearity',
    title: 'Variance Inflation Factor (VIF) calculator',
    family: 'Statistical Diagnostics',
    description: 'Calculate Variance Inflation Factor (VIF) and Tolerance to detect multicollinearity among predictors in multiple linear regression models.',
    keywords: ['VIF calculator', 'variance inflation factor', 'multicollinearity test', 'regression tolerance'],
    inputs: ['Predictor matrix X', 'Target variable Y'],
    example: { a: ['Predictor X1 (VIF=1.2)', 'Predictor X2 (VIF=2.4)', 'Predictor X3 (VIF=11.5)'], result: 'X3 exhibits high multicollinearity (VIF > 10). Consider feature removal or PCA.' },
    formula: 'VIF_j = 1 / (1 - R_j²)',
    code: {
      python: `from statsmodels.stats.outliers_influence import variance_inflation_factor\nvif = [variance_inflation_factor(X.values, i) for i in range(X.shape[1])]\nprint(vif)`,
      r: `library(car)\nvif(lm_model)`,
      ts: `import { calcVif } from '@statlab/core';\nconst vifArr = calcVif(xMatrix);`,
    },
    useCases: [
      'Diagnosing feature correlation redundancies in predictive ML models.',
      'Validating independence of telemetry metrics in telemetry regression modules.'
    ],
    when: 'Use when evaluating multiple regression models with correlated predictors.',
    cautions: [
      'VIF > 5 indicates moderate multicollinearity; VIF > 10 indicates severe multicollinearity.',
      'Multicollinearity inflates standard error estimates of regression coefficients.'
    ],
    workbenchId: 'vif',
  },
  {
    slug: 'durbin-watson-test',
    title: 'Durbin-Watson autocorrelation test calculator',
    family: 'Statistical Diagnostics',
    description: 'Evaluate first-order autocorrelation in regression residuals using the Durbin-Watson d statistic.',
    keywords: ['Durbin Watson test', 'autocorrelation test', 'residual autocorrelation', 'time series regression'],
    inputs: ['Regression residuals vector e_t'],
    example: { a: ['Residuals e_t (N=100)'], result: 'd = 1.98 (close to 2.0). No evidence of first-order autocorrelation (p > .05).' },
    formula: 'd = Σ (e_t - e_{t-1})² / Σ e_t²',
    code: {
      python: `from statsmodels.stats.stattools import durbin_watson\nd = durbin_watson(model.resid)\nprint(f"d={d:.4f}")`,
      r: `library(lmtest)\ndwtest(lm_model)`,
      ts: `import { durbinWatson } from '@statlab/core';\nconst d = durbinWatson(residuals);`,
    },
    useCases: [
      'Checking for serial autocorrelation in time-series server latency regressions.',
      'Ensuring error independence in sequential benchmark runs.'
    ],
    when: 'Use when fitting regression models to time-ordered telemetry data.',
    cautions: [
      'd ranges from 0 to 4; d ≈ 2 indicates no autocorrelation; d < 1.5 indicates positive autocorrelation.',
      'Only tests for first-order (lag-1) autocorrelation.'
    ],
    workbenchId: 'durbin_watson',
  },

  // --- TIME SERIES & TELEMETRY FAMILY ---
  {
    slug: 'augmented-dickey-fuller',
    title: 'Augmented Dickey-Fuller (ADF) stationarity test calculator',
    family: 'Time Series & Telemetry',
    description: 'Test whether a time series possesses a unit root and is non-stationary using the Augmented Dickey-Fuller (ADF) test.',
    keywords: ['ADF test calculator', 'Augmented Dickey Fuller', 'stationarity test', 'unit root test'],
    inputs: ['Time series data vector Y_t', 'Lag order choice', 'Trend component (constant / linear trend / none)'],
    example: { a: ['Telemetry metric (N=500)'], result: 'ADF statistic = -4.12, p = .0009. Time series is stationary at 1% significance level.' },
    formula: 'Δy_t = α + βt + γ y_{t-1} + δ_1 Δy_{t-1} + ... + ε_t',
    code: {
      python: `from statsmodels.tsa.stattools import adfuller\nres = adfuller(time_series)\nprint(f"ADF={res[0]:.4f}, p={res[1]:.4f}")`,
      r: `library(tseries)\nadf.test(time_series)`,
      ts: `import { adfTest } from '@statlab/core';\nconst res = adfTest(timeSeries);`,
    },
    useCases: [
      'Verifying stationarity of CPU/memory metrics before applying ARIMA/telemetry models in production telemetry.',
      'Testing whether performance metric trends represent genuine drift vs stationary noise.'
    ],
    when: 'Use prior to modeling or forecasting time-series telemetry data.',
    cautions: [
      'Rejection of null hypothesis (p < .05) implies the series IS stationary.',
      'Selecting an incorrect lag length can distort test size and power.'
    ],
    workbenchId: 'adf',
  },

  // --- AI & MACHINE LEARNING FAMILY ---
  {
    slug: 'confusion-matrix-precision-recall',
    title: 'Confusion matrix, Precision, Recall, and F1 calculator',
    family: 'AI & Machine Learning',
    description: 'Calculate classification performance metrics including Accuracy, Precision, Recall (Sensitivity), Specificity, F1-Score, F-beta, and Matthews Correlation Coefficient (MCC).',
    keywords: ['confusion matrix calculator', 'precision recall F1', 'sensitivity specificity', 'MCC calculator', 'classification metrics'],
    inputs: ['True Positives (TP)', 'False Positives (FP)', 'True Negatives (TN)', 'False Negatives (FN)'],
    example: { a: ['TP = 450, FP = 50', 'FN = 100, TN = 1400'], result: 'Accuracy = 92.5%, Precision = 90.0%, Recall = 81.8%, F1 = 85.7%, MCC = 0.812' },
    formula: 'Precision = TP/(TP+FP), Recall = TP/(TP+FN), F1 = 2*P*R/(P+R), MCC = (TP*TN - FP*FN)/√((TP+FP)(TP+FN)(TN+FP)(TN+FN))',
    code: {
      python: `from sklearn.metrics import classification_report, matthews_corrcoef\n# Compute precision, recall, f1-score, and MCC`,
      r: `library(caret)\nconfusionMatrix(factor(preds), factor(actuals))`,
      ts: `import { confusionMetrics } from '@statlab/core';\nconst m = confusionMetrics({ tp: 450, fp: 50, fn: 100, tn: 1400 });`,
    },
    useCases: [
      'Evaluating classification model precision/recall tradeoffs in AI quality benchmarking sprints.',
      'Benchmarking automated moderation and anomaly detection classifiers.'
    ],
    when: 'Use when evaluating binary or multi-class classifier model performance.',
    cautions: [
      'Do not rely solely on Accuracy when class distributions are severely imbalanced.',
      'MCC provides a reliable single-number metric even under extreme class imbalance.'
    ],
    workbenchId: 'confusion_matrix',
  },
  {
    slug: 'roc-auc-calculator',
    title: 'ROC curve and AUC calculator',
    family: 'AI & Machine Learning',
    description: 'Compute Receiver Operating Characteristic (ROC) curve coordinates, Area Under Curve (AUC-ROC), Gini coefficient, and DeLong confidence intervals.',
    keywords: ['ROC AUC calculator', 'area under ROC curve', 'DeLong test AUC', 'classifier ROC curve'],
    inputs: ['True binary labels (0/1)', 'Predicted probability scores'],
    example: { a: ['Actual labels: [1, 1, 0, 1, 0, 0, 1, 0]', 'Scores: [0.92, 0.85, 0.40, 0.78, 0.15, 0.35, 0.65, 0.20]'], result: 'AUC-ROC = 0.938 (95% DeLong CI: [.812, 1.000]), Gini = 0.875' },
    formula: 'AUC = ∫ TPR(t) d(FPR(t)) = P(Score_positive > Score_negative)',
    code: {
      python: `from sklearn.metrics import roc_auc_score\nauc = roc_auc_score(y_true, y_scores)\nprint(f"AUC={auc:.4f}")`,
      r: `library(pROC)\nroc_obj <- roc(y_true, y_scores)\nauc(roc_obj)`,
      ts: `import { rocMetrics } from '@statlab/core';\nconst res = rocMetrics(yTrue, yScores);`,
    },
    useCases: [
      'Evaluating probability calibration and ranking performance of AI classification models.',
      'Comparing model version AUC scores in production release-readiness verification sprints.'
    ],
    when: 'Use for evaluating threshold-independent probability scoring classifiers.',
    cautions: [
      'AUC measures ranking quality; inspect PR-AUC (Precision-Recall AUC) under severe class imbalance.',
      'DeLong test allows statistical comparison between two correlated ROC curves.'
    ],
    workbenchId: 'roc_auc',
  },
  {
    slug: 'cohens-kappa-calculator',
    title: "Cohen's Kappa and inter-annotator agreement calculator",
    family: 'AI & Machine Learning',
    description: "Calculate Cohen's Kappa (κ), Weighted Kappa (linear / quadratic), and percentage agreement for multi-annotator or LLM-judge evaluation alignment.",
    keywords: ['Cohens Kappa calculator', 'inter annotator agreement', 'LLM judge agreement', 'weighted kappa'],
    inputs: ['Rater 1 classification categories', 'Rater 2 classification categories', 'Weighting scheme (Unweighted, Linear, Quadratic)'],
    example: { a: ['Annotator 1 vs LLM Judge', 'Agreement matrix: 180 concordant, 20 discordant'], result: 'Observed Agreement = 90.0%, Chance Agreement = 50.0%, Cohen’s κ = 0.80 (Substantial agreement).' },
    formula: 'κ = (p_o - p_e) / (1 - p_e)',
    code: {
      python: `from sklearn.metrics import cohen_kappa_score\nkappa = cohen_kappa_score(rater1, rater2, weights='quadratic')\nprint(f"kappa={kappa:.4f}")`,
      r: `library(irr)\nkappa2(data.frame(rater1, rater2))`,
      ts: `import { cohensKappa } from '@statlab/core';\nconst k = cohensKappa(rater1, rater2);`,
    },
    useCases: [
      'Evaluating agreement between human evaluators and automated LLM-as-a-judge scoring in CI/CD pipeline benchmarks.',
      'Measuring annotation consistency in supervised dataset labeling pipelines.'
    ],
    when: 'Use when measuring inter-rater or judge agreement corrected for chance.',
    cautions: [
      'Kappa is sensitive to marginal category prevalence (prevalence paradox).',
      'Use Weighted Kappa for ordinal rating scales.'
    ],
    workbenchId: 'cohens_kappa',
  },
  {
    slug: 'fleiss-kappa-calculator',
    title: "Fleiss' Kappa calculator for 3+ raters",
    family: 'AI & Machine Learning',
    description: "Calculate Fleiss' Kappa (κ) to measure inter-rater reliability across 3 or more fixed raters or LLM evaluators classifying items into categorical ratings.",
    keywords: ['Fleiss Kappa calculator', 'multi rater agreement', 'inter judge agreement 3+ raters', 'LLM multi judge consensus'],
    inputs: ['Rating count matrix (N items x K categories)', 'Category names'],
    example: { a: ['10 items evaluated by 5 LLM judges across 3 categories'], result: 'Fleiss κ = 0.72 (Substantial agreement among LLM judges).' },
    formula: 'κ = (P̄ - P̄_e) / (1 - P̄_e)',
    code: {
      python: `from statsmodels.stats.inter_rater import fleiss_kappa\nkappa = fleiss_kappa(counts_matrix)\nprint(f"kappa={kappa:.4f}")`,
      r: `library(irr)\nkappam.fleiss(matrix)`,
      ts: `import { fleissKappa } from '@statlab/core';\nconst k = fleissKappa(matrix);`,
    },
    useCases: [
      'Measuring consensus agreement across multi-prompt LLM judge ensembles in CI/CD pipeline benchmarks.',
      'Validating multi-annotator dataset quality.'
    ],
    when: 'Use when 3 or more raters assign items into mutually exclusive categories.',
    cautions: [
      'Assumes raters are fixed and randomly sampled from a pool of equivalent judges.',
      'Sensitive to overall category frequency distributions.'
    ],
    workbenchId: 'fleiss_kappa',
  },
  {
    slug: 'icc-intraclass-correlation',
    title: 'Intraclass Correlation Coefficient (ICC) calculator',
    family: 'AI & Machine Learning',
    description: 'Calculate Intraclass Correlation Coefficient (ICC(1,1), ICC(2,1), ICC(3,1)) to assess inter-rater reliability for continuous numerical ratings.',
    keywords: ['ICC calculator', 'intraclass correlation coefficient', 'reliability continuous ratings', 'ICC(2,1) calculator'],
    inputs: ['Ratings matrix (N items x K raters)', 'Model type (One-way / Two-way random / Two-way mixed)', 'Unit choice (Single / Average)'],
    example: { a: ['20 code snippets rated 1-100 by 4 judges', 'ICC(2,1) two-way random single rater'], result: 'ICC = 0.85 (95% CI: [.72, .93]). Excellent rating reliability.' },
    formula: 'ICC = (MS_between - MS_error) / [ MS_between + (k-1)MS_error + (k/n)(MS_rater - MS_error) ]',
    code: {
      python: `import pingouin as pg\nicc = pg.intraclass_corr(data=df, targets='item', raters='judge', ratings='score')\nprint(icc)`,
      r: `library(psych)\nICC(matrix)`,
      ts: `import { iccCalc } from '@statlab/core';\nconst icc = iccCalc(matrix);`,
    },
    useCases: [
      'Assessing agreement on continuous score metrics between human evaluators and AI judges in CI/CD pipeline benchmarks.',
      'Validating continuous quality rating consistency.'
    ],
    when: 'Use for assessing rating agreement when measurements are continuous numerical scores.',
    cautions: [
      'Choose ICC(2,1) for generalization to a population of raters; use ICC(3,1) when raters are fixed.',
      'Average-measure ICCs are higher than single-measure ICCs.'
    ],
    workbenchId: 'icc',
  },
  {
    slug: 'brier-score-calculator',
    title: 'Brier score and probability calibration calculator',
    family: 'AI & Machine Learning',
    description: 'Calculate Brier score, Reliability, Resolution, and Uncertainty components to measure the accuracy of probabilistic forecasts and LLM confidence calibration.',
    keywords: ['Brier score calculator', 'probability calibration', 'forecast accuracy', 'LLM confidence calibration'],
    inputs: ['Predicted probabilities (0.0 to 1.0)', 'Actual binary outcomes (0 or 1)'],
    example: { a: ['Predicted probs: [0.90, 0.80, 0.20, 0.10, 0.70]', 'Actual outcomes: [1, 1, 0, 0, 1]'], result: 'Brier Score = 0.038 (well calibrated). Lower Brier score indicates superior calibration.' },
    formula: 'BS = (1/N) Σ (f_i - o_i)²',
    code: {
      python: `from sklearn.metrics import brier_score_loss\nbs = brier_score_loss(y_true, y_probs)\nprint(f"Brier Score = {bs:.4f}")`,
      r: `library(scoringUtils)\nbrier_score(y_true, y_probs)`,
      ts: `import { brierScore } from '@statlab/core';\nconst bs = brierScore(yProbs, yTrue);`,
    },
    useCases: [
      'Evaluating confidence score calibration of LLM responses in quality assurance audits.',
      'Measuring risk prediction accuracy in production classifier models.'
    ],
    when: 'Use to evaluate the accuracy and calibration of probabilistic predictions.',
    cautions: [
      'Brier score ranges from 0.0 (perfect prediction) to 1.0 (worst prediction).',
      'Decompose into Reliability and Resolution for deeper diagnostic insight.'
    ],
    workbenchId: 'brier_score',
  },
  {
    slug: 'standardized-root-mean-residual',
    title: 'SRMR and RMSEA fit calculator',
    family: 'AI & Machine Learning',
    description: 'Compute Standardized Root Mean Square Residual (SRMR) and Root Mean Square Error of Approximation (RMSEA) model fit indices.',
    keywords: ['SRMR calculator', 'RMSEA calculator', 'SEM model fit', 'residual fit index'],
    inputs: ['Observed correlation matrix', 'Model-implied correlation matrix', 'Degrees of freedom'],
    example: { a: ['Observed vs Model covariance', 'df = 15'], result: 'SRMR = 0.032, RMSEA = 0.041 (90% CI: [.01, .06]). Good model fit.' },
    formula: 'SRMR = √[ (2 / (p(p+1))) Σ Σ (r_ij - σ̂_ij)² ]',
    code: {
      python: `import semopy\n# Compute SRMR and RMSEA model fit metrics`,
      r: `library(lavaan)\nfitMeasures(fit_obj, c("srmr", "rmsea"))`,
      ts: `import { semFit } from '@statlab/core';\nconst res = semFit(obs, exp, df);`,
    },
    useCases: [
      'Evaluating structural model fit quality for complex telemetry graph relationships.',
      'Validating factor structure fit in production telemetry analytics.'
    ],
    when: 'Use for evaluating overall fit of structural equation models or covariance structures.',
    cautions: [
      'SRMR < 0.08 and RMSEA < 0.06 indicate good model fit.',
      'Sensitive to sample size and model complexity.'
    ],
    workbenchId: 'sem_fit',
  },

  // --- CATEGORICAL & FREQUENCY FAMILY ---
  {
    slug: 'chi-square-test',
    title: 'Chi-square test calculator',
    family: 'Categorical',
    description: 'Run chi-square tests for independence or goodness-of-fit with observed vs expected counts, χ² statistic, degrees of freedom, p-value, and Cramér’s V effect size.',
    keywords: ['chi-square test', 'contingency table', 'Cramér V', 'goodness of fit', 'chi-square p-value'],
    inputs: ['Observed count contingency matrix', 'Expected proportions or secondary variable', 'Alpha significance level'],
    example: { a: ['Row 1 (Variant A): 120 success, 880 fail', 'Row 2 (Variant B): 160 success, 840 fail'], result: 'χ² = 6.22, df = 1, p = .0126, Cramér’s V = 0.056' },
    formula: 'χ² = Σ [ (O - E)² / E ], Cramér’s V = √(χ² / (N * min(r-1, c-1)))',
    code: {
      python: `from scipy import stats\nobs = [[120, 880], [160, 840]]\nchi2, p, df, expected = stats.chi2_contingency(obs)\nprint(f"chi2={chi2:.4f}, p={p:.4f}")`,
      r: `chisq.test(matrix(c(120, 160, 880, 840), nrow=2))`,
      ts: `import { chiSquareInd } from '@statlab/core';\nconst result = chiSquareInd([[120, 880], [160, 840]]);`,
    },
    useCases: [
      'Testing independence between user operating systems and conversion event types in production telemetry.',
      'Comparing error status code distributions across backend server clusters.'
    ],
    when: 'Use for categorical frequency count data organized in contingency tables.',
    cautions: [
      'If any expected cell count is less than 5, use Fisher’s Exact Test instead of Chi-Square.',
      'Requires independent observations.'
    ],
    workbenchId: 'chi_ind',
  },
  {
    slug: 'cramers-v-calculator',
    title: "Cramér's V and Phi coefficient calculator",
    family: 'Categorical',
    description: "Calculate Cramér's V and Phi (φ) effect size coefficients for categorical contingency tables.",
    keywords: ['Cramers V calculator', 'Phi coefficient', 'contingency table effect size', 'categorical association'],
    inputs: ['Contingency matrix or Chi-square statistic', 'Number of rows & columns', 'Total N'],
    example: { a: ['Chi-square = 18.5', 'Matrix: 3x4, Total N = 500'], result: 'Cramér’s V = 0.136 (Moderate categorical association).' },
    formula: 'V = √( χ² / (N * min(r-1, c-1)) )',
    code: {
      python: `import scipy.stats as stats\ndef cramers_v(chi2, n, r, c):\n    return np.sqrt(chi2 / (n * min(r-1, c-1)))`,
      r: `library(rcompanion)\ncramerV(matrix)`,
      ts: `import { cramersV } from '@statlab/core';\nconst v = cramersV(chi2, n, r, c);`,
    },
    useCases: [
      'Measuring categorical association strength between telemetry event types.',
      'Quantifying effect magnitude for chi-square tests in production telemetry.'
    ],
    when: 'Use alongside Chi-square tests to report nominal association strength.',
    cautions: [
      'V ranges from 0.0 (no association) to 1.0 (perfect association).',
      'For 2x2 tables, Cramér’s V equals the absolute value of the Phi coefficient.'
    ],
    workbenchId: 'cramers_v',
  },
  {
    slug: 'fishers-exact-test',
    title: "Fisher's exact test calculator",
    family: 'Categorical',
    description: "Calculate exact hyper-geometric p-values and odds ratios for 2x2 contingency tables using Fisher's exact test.",
    keywords: ['Fishers exact test', '2x2 contingency test', 'exact hypergeometric test', 'odds ratio 2x2'],
    inputs: ['2x2 Contingency Matrix counts [[a, b], [c, d]]', 'Alternative hypothesis (two-sided, greater, less)'],
    example: { a: ['Row 1 (Group A): 4 success, 1 fail', 'Row 2 (Group B): 0 success, 5 fail'], result: 'Exact p = .0238, Odds Ratio = ∞ (95% CI: [1.2, ∞])' },
    formula: 'p = [ (a+b)! (c+d)! (a+c)! (b+d)! ] / [ a! b! c! d! n! ]',
    code: {
      python: `from scipy import stats\noddsratio, pvalue = stats.fisher_exact([[4, 1], [0, 5]])\nprint(f"OR={oddsratio:.4f}, p={pvalue:.4f}")`,
      r: `fisher.test(matrix(c(4, 0, 1, 5), nrow=2))`,
      ts: `import { fisherExact } from '@statlab/core';\nconst res = fisherExact([[4, 1], [0, 5]]);`,
    },
    useCases: [
      'Testing small-sample rare event frequencies in security audit logs.',
      'Comparing low-occurrence failure rates across microservices.'
    ],
    when: 'Use for 2x2 tables when sample sizes are small or expected cell counts are < 5.',
    cautions: [
      'Valid for 2x2 tables; computationally intensive for larger tables.',
      'Provides exact p-values without relying on asymptotic normal approximations.'
    ],
    workbenchId: 'fisher_exact',
  },
  {
    slug: 'mcnemar-test',
    title: "McNemar's test calculator for paired proportions",
    family: 'Categorical',
    description: "Evaluate paired or matched binary classification shifts using McNemar's test with continuity correction.",
    keywords: ['McNemar test', 'paired proportions test', 'matched pairs chi square', 'pre post binary test'],
    inputs: ['Paired 2x2 table [[Both Yes, A Yes / B No], [A No / B Yes, Both No]]'],
    example: { a: ['Model A Yes / Model B No = 35', 'Model A No / Model B Yes = 90'], result: 'McNemar χ² = 23.04, p < .0001. Statistically significant difference in performance.' },
    formula: 'χ² = (|b - c| - 1)² / (b + c)',
    code: {
      python: `from statsmodels.stats.contingency_tables import mcnemar\nres = mcnemar([[745, 35], [90, 130]], exact=False, correction=True)\nprint(f"p={res.pvalue:.5f}")`,
      r: `mcnemar.test(matrix(c(745, 90, 35, 130), nrow=2))`,
      ts: `import { mcnemarTest } from '@statlab/core';\nconst res = mcnemarTest([[745, 35], [90, 130]]);`,
    },
    useCases: [
      'Evaluating pass/fail prompt test suite outcomes before and after prompt updates in CI/CD pipeline benchmarks.',
      'Testing paired pre/post binary user conversion events.'
    ],
    when: 'Use when comparing paired binary outcomes on the exact same subjects or prompts.',
    cautions: [
      'Tests discordant pairs (b and c); concordant pairs do not contribute to test statistic.',
      'Use exact binomial test if b + c < 25.'
    ],
    workbenchId: 'mcnemar',
  },
  {
    slug: 'z-test-two-proportions',
    title: 'Two-proportion z-test calculator',
    family: 'Categorical',
    description: 'Compare two independent sample conversion rates or proportions using the two-proportion z-test with pooled variance, p-values, and confidence intervals.',
    keywords: ['two proportion z test', 'compare proportions', 'conversion rate z test', 'pooled z test proportions'],
    inputs: ['Group A successes & N', 'Group B successes & N', 'Confidence level', 'Alternative hypothesis'],
    example: { a: ['Group A: 120 / 1000 (12.0%)', 'Group B: 160 / 1000 (16.0%)'], result: 'z = 2.68, p = .0074. Relative uplift = +33.3%, 95% CI for difference: [+1.08%, +6.92%]' },
    formula: 'z = (p̂_1 - p̂_2) / √[ p̂(1 - p̂)(1/n_1 + 1/n_2) ]',
    code: {
      python: `from statsmodels.stats.proportion import proportions_ztest\nz, p = proportions_ztest([160, 120], [1000, 1000])\nprint(f"z={z:.4f}, p={p:.4f}")`,
      r: `prop.test(c(160, 120), c(1000, 1000))`,
      ts: `import { zTestTwoProps } from '@statlab/core';\nconst res = zTestTwoProps(120, 1000, 160, 1000);`,
    },
    useCases: [
      'Comparing baseline vs variant conversion proportions in production system telemetry.',
      'Evaluating build pass rates across server fleets.'
    ],
    when: 'Use when comparing success rates between two independent large sample groups.',
    cautions: [
      'Requires n*p >= 5 and n*(1-p) >= 5 in both sample groups.',
      'Use Fisher’s Exact Test for small sample sizes.'
    ],
    workbenchId: 'z_2prop',
  },

  // --- CORRELATION & REGRESSION FAMILY ---
  {
    slug: 'pearson-correlation',
    title: 'Pearson correlation calculator',
    family: 'Correlation',
    description: 'Estimate Pearson correlation coefficient r, t-statistic, p-value, 95% Fisher z-transformed confidence interval, and coefficient of determination (R²).',
    keywords: ['Pearson correlation', 'r', 'correlation p value', 'confidence interval correlation', 'R squared'],
    inputs: ['X continuous variable array', 'Y continuous variable array', 'Confidence level'],
    example: { a: ['X: 12, 15, 18, 22, 28', 'Y: 45, 52, 60, 74, 90'], result: 'r = 0.997, t = 22.3, df = 3, p = .0002, 95% CI: [.965, .999], R² = 0.994' },
    formula: 'r = Σ((x - X̄)(y - Ȳ)) / √[ Σ(x - X̄)² Σ(y - Ȳ)² ], t = r * √(n-2) / √(1-r²)',
    code: {
      python: `from scipy import stats\nr, p = stats.pearsonr(x_vals, y_vals)\nprint(f"r={r:.4f}, p={p:.4f}")`,
      r: `cor.test(x_vals, y_vals, method = "pearson")`,
      ts: `import { pearsonR } from '@statlab/core';\nconst result = pearsonR(xVals, yVals);`,
    },
    useCases: [
      'Evaluating correlation between system CPU utilization and request latency in production telemetry.',
      'Testing correlation between automated test suite size and release bug counts in CI/CD pipeline benchmarks.'
    ],
    when: 'Use to measure strength and direction of linear relationship between two continuous variables.',
    cautions: [
      'Check scatter plots for non-linear relationships or influential outliers.',
      'Correlation does not imply causal relationship.'
    ],
    workbenchId: 'pearson',
  },
  {
    slug: 'spearman-rank-correlation',
    title: "Spearman's rank correlation calculator",
    family: 'Correlation',
    description: "Calculate Spearman's rank correlation coefficient ρ (rho), t-statistic, and p-value for monotonic relationships between continuous or ordinal variables.",
    keywords: ['Spearman rank correlation', 'rho calculator', 'monotonic correlation', 'rank correlation test'],
    inputs: ['X numeric/ordinal array', 'Y numeric/ordinal array'],
    example: { a: ['X ranks: 1, 2, 3, 4, 5', 'Y ranks: 1, 3, 2, 5, 4'], result: 'ρ = 0.900, t = 3.58, df = 3, p = .037' },
    formula: 'ρ = 1 - [ 6 Σ d_i² / (n(n² - 1)) ]',
    code: {
      python: `from scipy import stats\nrho, p = stats.spearmanr(x_vals, y_vals)\nprint(f"rho={rho:.4f}, p={p:.4f}")`,
      r: `cor.test(x_vals, y_vals, method = "spearman")`,
      ts: `import { spearmanRho } from '@statlab/core';\nconst res = spearmanRho(xVals, yVals);`,
    },
    useCases: [
      'Measuring monotonic correlation between system queue depth and p99 latency.',
      'Evaluating monotonic alignment between model size and eval benchmarks.'
    ],
    when: 'Use when variables have monotonic relationships or non-normal ordinal distributions.',
    cautions: [
      'Measures monotonic trends, not strictly linear relationships.',
      'Tied ranks require tie-corrected correlation formula.'
    ],
    workbenchId: 'spearman',
  },
  {
    slug: 'kendall-tau-correlation',
    title: "Kendall's tau rank correlation calculator",
    family: 'Correlation',
    description: "Compute Kendall's τ-b (tau-b) rank correlation coefficient, z-score, and p-value based on concordant and discordant pair counts.",
    keywords: ['Kendall tau calculator', 'tau b correlation', 'concordant discordant pairs', 'nonparametric correlation'],
    inputs: ['X numeric/ordinal array', 'Y numeric/ordinal array'],
    example: { a: ['X: 1, 2, 3, 4, 5', 'Y: 2, 1, 4, 3, 5'], result: 'τ = 0.60, Concordant = 8, Discordant = 2, p = .142' },
    formula: 'τ = (C - D) / [ ½ n(n-1) ]',
    code: {
      python: `from scipy import stats\ntau, p = stats.kendalltau(x_vals, y_vals)\nprint(f"tau={tau:.4f}, p={p:.4f}")`,
      r: `cor.test(x_vals, y_vals, method = "kendall")`,
      ts: `import { kendallTau } from '@statlab/core';\nconst res = kendallTau(xVals, yVals);`,
    },
    useCases: [
      'Assessing rank correlation stability in small telemetry sample sizes.',
      'Comparing ordinal benchmark ranking preferences across evaluators.'
    ],
    when: 'Use for rank correlation in small sample sizes or data with many ties.',
    cautions: [
      'Kendall’s tau value is generally smaller than Spearman’s rho on identical data.',
      'Tau-b adjusts for ties in both X and Y.'
    ],
    workbenchId: 'kendall_tau',
  },
  {
    slug: 'linear-regression',
    title: 'Linear regression calculator',
    family: 'Regression',
    description: 'Fit simple and multiple Ordinary Least Squares (OLS) linear regression models with coefficients β, standard errors, t-tests, R², adjusted R², F-test, and residual diagnostics.',
    keywords: ['linear regression', 'OLS regression', 'regression coefficients', 'R squared', 'residual analysis'],
    inputs: ['Dependent outcome variable Y', 'Independent predictor matrix X', 'Confidence level'],
    example: { a: ['Y (Latency ms): 110, 125, 140, 180, 220', 'X (Payload KB): 10, 20, 30, 50, 80'], result: 'Y = 94.2 + 1.57 * X, R² = 0.988, F(1,3) = 252.1, p = .0005' },
    formula: 'Ŷ = β₀ + β₁X₁ + ... + βₖXₖ, β = (XᵀX)⁻¹XᵀY',
    code: {
      python: `import statsmodels.api as sm\nX = sm.add_constant(x_matrix)\nmodel = sm.OLS(y_vals, X).fit()\nprint(model.summary())`,
      r: `model <- lm(y ~ x1 + x2, data = df)\nsummary(model)`,
      ts: `import { olsRegression } from '@statlab/core';\nconst model = olsRegression(yVals, xMatrix);`,
    },
    useCases: [
      'Modeling request latency scaling as a function of payload size and concurrency level.',
      'Predicting release testing runtime based on pull request code diff volume in CI/CD pipeline benchmarks.'
    ],
    when: 'Use to model continuous outcome variable as a function of one or more predictor variables.',
    cautions: [
      'Verify linear regression assumptions: linearity, independence, homoscedasticity, normality of residuals.',
      'Check variance inflation factors (VIF) for multicollinearity in multiple regression.'
    ],
    workbenchId: 'ols_simple',
  },
  {
    slug: 'logistic-regression',
    title: 'Logistic regression calculator',
    family: 'Regression',
    description: 'Fit binary logistic regression models with Odds Ratios (OR), log-odds coefficients β, Wald z-tests, McFadden Pseudo-R², and likelihood ratio tests.',
    keywords: ['logistic regression calculator', 'odds ratio regression', 'binary logit', 'McFadden pseudo R2'],
    inputs: ['Binary outcome vector Y (0/1)', 'Predictor matrix X', 'Confidence level'],
    example: { a: ['Y (Conversion 0/1)', 'X (Session duration, Page views)'], result: 'Logit(P) = -2.4 + 0.15*Duration, Odds Ratio = 1.16 per min (p = .002), McFadden R² = 0.24' },
    formula: 'P(Y=1) = 1 / (1 + exp(-(β₀ + β₁X₁ + ...))), OR = exp(β_i)',
    code: {
      python: `import statsmodels.api as sm\nX = sm.add_constant(x_matrix)\nmodel = sm.Logit(y_vals, X).fit()\nprint(model.summary())`,
      r: `model <- glm(y ~ x1 + x2, data = df, family = "binomial")\nsummary(model)`,
      ts: `import { logisticRegression } from '@statlab/core';\nconst res = logisticRegression(yVals, xMatrix);`,
    },
    useCases: [
      'Modeling binary user conversion probabilities based on telemetry feature signals in production telemetry.',
      'Predicting software build failure probability based on pull request metrics.'
    ],
    when: 'Use when modeling a binary categorical outcome (0/1, Success/Failure).',
    cautions: [
      'Requires sufficient sample size (at least 10-15 events per predictor variable).',
      'Check for complete separation where a predictor perfectly splits the binary outcome.'
    ],
    workbenchId: 'logistic',
  },
  {
    slug: 'poisson-regression',
    title: 'Poisson regression calculator',
    family: 'Regression',
    description: 'Fit Poisson count regression models with Incidence Rate Ratios (IRR), log coefficients β, deviance goodness-of-fit, and overdispersion checks.',
    keywords: ['Poisson regression calculator', 'incidence rate ratio IRR', 'count data regression', 'overdispersion test'],
    inputs: ['Count outcome vector Y (0, 1, 2...)', 'Predictor matrix X', 'Exposure / Offset vector (optional)'],
    example: { a: ['Y (API Error Count)', 'X (Request volume)'], result: 'log(λ) = -1.2 + 0.04*Volume, IRR = 1.041 (p = .001), Deviance/df = 1.05' },
    formula: 'log(λ) = β₀ + β₁X₁ + ... + log(Exposure), IRR = exp(β_i)',
    code: {
      python: `import statsmodels.api as sm\nX = sm.add_constant(x_matrix)\nmodel = sm.GLM(y_vals, X, family=sm.families.Poisson()).fit()\nprint(model.summary())`,
      r: `model <- glm(y ~ x1, data = df, family = "poisson")\nsummary(model)`,
      ts: `import { poissonRegression } from '@statlab/core';\nconst res = poissonRegression(yVals, xMatrix);`,
    },
    useCases: [
      'Modeling event counts (e.g. API error rate spikes, bug counts per sprint) in production telemetry and CI/CD pipeline benchmarks.',
      'Modeling customer click counts per session.'
    ],
    when: 'Use for modeling non-negative integer count outcome data.',
    cautions: [
      'Assumes mean equals variance (E(Y) = Var(Y)); use Negative Binomial regression if data is overdispersed.',
      'Include exposure offsets when observation time windows vary.'
    ],
    workbenchId: 'poisson',
  },

  // --- TECH / DEVELOPER PERFORMANCE & TELEMETRY CALCULATORS ---
  {
    slug: 'ab-test-significance',
    title: 'A/B testing statistical significance calculator',
    family: 'Performance & Telemetry',
    description: 'Calculate statistical significance for web, app, and backend A/B tests covering conversion proportions (z-test / Chi-square) and continuous metrics (Welch t-test / Mann-Whitney U), with p-value, confidence interval, and sample size power evaluation.',
    keywords: ['AB testing significance', 'conversion rate significance', 'AB test calculator', 'p-value AB test', 'sample size power AB'],
    inputs: ['Control & Treatment sample sizes (N_A, N_B)', 'Conversions / Success counts (or metric means & SDs)', 'Confidence level', 'Minimum detectable effect (MDE)'],
    example: { a: ['Control A: 1,240 conversions / 25,000 visitors (4.96%)', 'Treatment B: 1,410 conversions / 25,000 visitors (5.64%)'], result: 'z = 3.32, p = .0009, Relative uplift = +13.7%, 95% CI for difference: [+0.28%, +1.08%]' },
    formula: 'z = (p̂_B - p̂_A) / √[ p̂(1 - p̂)(1/n_A + 1/n_B) ], where p̂ = (x_A + x_B)/(n_A + n_B)',
    code: {
      python: `from statsmodels.stats.proportion import proportions_ztest\ncount = [1410, 1240]\nnobs = [25000, 25000]\nz, p = proportions_ztest(count, nobs)\nprint(f"z={z:.4f}, p={p:.4f}")`,
      r: `prop.test(c(1410, 1240), c(25000, 25000))`,
      ts: `import { abTestSignificance } from '@statlab/core';\nconst res = abTestSignificance({ control: { n: 25000, conv: 1240 }, variant: { n: 25000, conv: 1410 } });`,
    },
    useCases: [
      'Automating continuous A/B experiment evaluation inside production telemetry feedback loops.',
      'Determining statistical stopping rules for feature flag rollouts.',
      'Measuring backend algorithm yield and conversion lift in production.'
    ],
    when: 'Use whenever comparing two variant groups in product feature experiments or conversion rate optimization.',
    cautions: [
      'Avoid continuous peeking at p-values without sequential testing or alpha-spending corrections.',
      'Ensure sample ratio mismatch (SRM) checks pass before evaluating significance.'
    ],
    workbenchId: 'ab_test',
  },
  {
    slug: 'latency-percentile-significance',
    title: 'Latency percentile (p95 / p99) significance calculator',
    family: 'Performance & Telemetry',
    description: 'Evaluate statistical significance of tail latency shifts (p90, p95, p99 percentiles) between software deployments using non-parametric quantile bootstrap confidence intervals and Mood’s median / Mann-Whitney tests.',
    keywords: ['latency percentile significance', 'p95 latency test', 'p99 latency significance', 'bootstrap quantile test', 'tail latency benchmark'],
    inputs: ['Baseline latency run (ms array or percentiles)', 'Candidate latency run (ms array or percentiles)', 'Target percentile (p90, p95, p99)', 'Bootstrap iterations (e.g. 2,000)'],
    example: { a: ['Baseline (N=5,000): p95 = 142ms, p99 = 310ms', 'Candidate (N=5,000): p95 = 118ms, p99 = 245ms'], result: 'p95 Δ = -24ms (95% Bootstrap CI: [-31ms, -17ms], p < .001). Statistically significant tail latency reduction.' },
    formula: 'Quantile Bootstrap CI: Resample B times with replacement, compute q_p, estimate [q_α/2, q_1-α/2]',
    code: {
      python: `import numpy as np\ndef bootstrap_p95_diff(a, b, n_boot=2000):\n    diffs = [np.percentile(np.random.choice(b, len(b)), 95) - np.percentile(np.random.choice(a, len(a)), 95) for _ in range(n_boot)]\n    return np.percentile(diffs, [2.5, 97.5])`,
      r: `library(boot)\np95_diff <- function(d, i) { quantile(d[i, "b"], .95) - quantile(d[i, "a"], .95) }`,
      ts: `import { percentileSignificance } from '@statlab/core';\nconst res = percentileSignificance(runA, runB, { percentile: 0.95 });`,
    },
    useCases: [
      'Automated SLA and tail-latency regression verification in production release-readiness verification sprints.',
      'Continuous telemetry distribution shift detection in infrastructure telemetry monitoring.'
    ],
    when: 'Use when benchmarking software performance where tail percentiles (p95, p99) matter more than average latency.',
    cautions: [
      'Do not apply standard t-tests directly to tail percentiles due to heavy skew and non-normality.',
      'Requires adequate sample size (N ≥ 1,000) to reliably estimate 99th percentile confidence bounds.'
    ],
    workbenchId: 'latency_percentile',
  },
  {
    slug: 'llm-eval-significance',
    title: 'LLM evaluation benchmark significance calculator',
    family: 'Performance & Telemetry',
    description: 'Test whether output quality, accuracy, toxicity, or rag-relevance score differences between LLM prompts or models are statistically significant using McNemar test (binary evaluation) or paired Wilcoxon / Bootstrap CI (continuous scoring).',
    keywords: ['LLM evaluation significance', 'prompt benchmark test', 'LLM benchmark statistical test', 'McNemar LLM test', 'eval significance'],
    inputs: ['Model A scores / pass-fail array', 'Model B scores / pass-fail array', 'Evaluation metric type (Binary Pass/Fail or Continuous 1-5 scale)'],
    example: { a: ['Model A: 780 pass / 220 fail on 1,000 eval prompts', 'Model B: 835 pass / 165 fail on 1,000 eval prompts', 'Paired discordant: A win / B loss = 35, A loss / B win = 90'], result: 'McNemar χ² = 23.04, p < .0001. Model B significantly outperforms Model A on accuracy.' },
    formula: 'McNemar χ² = (|b - c| - 1)² / (b + c), where b = A_pass/B_fail, c = A_fail/B_pass',
    code: {
      python: `from statsmodels.stats.contingency_tables import mcnemar\n# table = [[both_pass, A_pass_B_fail], [A_fail_B_pass, both_fail]]\nres = mcnemar([[745, 35], [90, 130]], exact=False, correction=True)\nprint(f"p={res.pvalue:.5f}")`,
      r: `mcnemar.test(matrix(c(745, 90, 35, 130), nrow=2))`,
      ts: `import { llmEvalSignificance } from '@statlab/core';\nconst result = llmEvalSignificance(scoresModelA, scoresModelB);`,
    },
    useCases: [
      'Evaluating LLM release candidates in CI/CD pipeline benchmarks AI quality verification sprints.',
      'Testing whether prompt engineering modifications yield statistically genuine accuracy gains.',
      'Benchmarking RAG retrieval accuracy across vector index parameters.'
    ],
    when: 'Use when comparing two LLM versions, system prompts, or RAG pipelines on identical evaluation benchmark test suites.',
    cautions: [
      'Always evaluate on paired prompt test sets to eliminate prompt difficulty confounding.',
      'Account for LLM output non-determinism by running multiple temperature seeds per prompt.'
    ],
    workbenchId: 'llm_eval',
  },

  // --- POWER ANALYSIS & META-ANALYSIS FAMILY ---
  {
    slug: 'sample-size-power',
    title: 'Sample size and power calculator',
    family: 'Power analysis',
    description: 'Calculate statistical power or minimum required sample size N for t-tests, ANOVA, A/B experiments, correlation, and regression models given target alpha and effect size.',
    keywords: ['power calculator', 'sample size calculator', 'required N', 'statistical power', 'type II error beta'],
    inputs: ['Effect size (Cohen d, f, r, or MDE)', 'Significance level Alpha (e.g. 0.05)', 'Target Power (1 - β, e.g. 0.80 or 0.90)', 'Test family'],
    example: { a: ['Test: Two-sample t-test', 'Effect size d = 0.50 (medium effect)', 'Alpha = 0.05, Target Power = 0.80'], result: 'Required N = 64 per group (Total N = 128) to achieve 80.1% power.' },
    formula: 'N_per_group ≈ 2 * (z_{1-α/2} + z_{1-β})² / d²',
    code: {
      python: `from statsmodels.stats.power import TTestIndPower\nanalysis = TTestIndPower()\nreq_n = analysis.solve_power(effect_size=0.5, power=0.80, alpha=0.05)\nprint(f"Required N per group: {req_n:.2f}")`,
      r: `library(pwr)\npwr.t.test(d = 0.5, power = 0.80, sig.level = 0.05, type = "two.sample")`,
      ts: `import { sampleSizePower } from '@statlab/core';\nconst n = sampleSizePower({ test: 't_two_sample', d: 0.5, power: 0.80, alpha: 0.05 });`,
    },
    useCases: [
      'Planning required traffic volume and duration for A/B tests in production telemetry.',
      'Determining required benchmark sample runs for release readiness sign-off in CI/CD pipeline benchmarks.'
    ],
    when: 'Use before launching experiments or benchmarks to ensure sufficient statistical sensitivity.',
    cautions: [
      'Underpowering tests leads to false negatives (Type II error).',
      'Base effect size estimates on prior pilot data or realistic minimum detectable effects.'
    ],
    workbenchId: 'pow_t',
  },
  {
    slug: 'random-effects-meta-analysis',
    title: 'Random-effects meta-analysis calculator',
    family: 'Meta-analysis',
    description: 'Pool study effect sizes using DerSimonian-Laird random-effects meta-analysis, Cochran’s Q test, I² heterogeneity index, Tau-squared (τ²), and 95% prediction intervals.',
    keywords: ['random effects meta-analysis', 'DerSimonian Laird', 'I squared', 'tau squared', 'forest plot', 'pooled effect size'],
    inputs: ['Study labels', 'Effect sizes (d, r, OR, log RR)', 'Standard errors (SE)'],
    example: { a: ['Study 1: d = 0.50, SE = 0.15', 'Study 2: d = 0.35, SE = 0.12', 'Study 3: d = 0.65, SE = 0.18'], result: 'Pooled d = 0.462 (95% CI: [.295, .629]), Q = 1.84 (df=2, p=.398), I² = 0.0%, τ² = 0.0' },
    formula: 'w_i* = 1 / (v_i + τ²), Pooled Effect θ̂ = Σ (w_i* θ_i) / Σ w_i*',
    code: {
      python: `import metafor # or statsmodels\n# Compute random effects model with DerSimonian-Laird weight adjustment`,
      r: `library(metafor)\nrma(yi = effect_sizes, sei = std_errors, method = "DL")`,
      ts: `import { metaAnalysisRandom } from '@statlab/core';\nconst result = metaAnalysisRandom(studies);`,
    },
    useCases: [
      'Synthesizing benchmark performance results across multiple hardware platforms in CI/CD pipeline benchmarks.',
      'Aggregating micro-experiment effect sizes across product verticals.'
    ],
    when: 'Use when combining quantitative effect estimates across multiple independent studies or benchmark runs.',
    cautions: [
      'Evaluate publication bias with funnel plots and Egger’s test.',
      'High I² (> 75%) indicates substantial heterogeneity across synthesized studies.'
    ],
    workbenchId: 'meta',
  },
  {
    slug: 'kl-divergence-calculator',
    title: 'Kullback-Leibler (KL) divergence calculator',
    family: 'Information theory & ML',
    description: 'Calculate Kullback-Leibler (KL) divergence D_KL(P || Q) and symmetric Jensen-Shannon divergence (JSD) between discrete probability distributions.',
    keywords: ['KL divergence calculator', 'Kullback-Leibler', 'Jensen-Shannon divergence', 'distribution drift', 'information gain', 'relative entropy'],
    inputs: ['Target probability distribution P(x)', 'Approximate probability distribution Q(x)', 'Log base (e, 2, 10)'],
    example: { a: ['Distribution P: [0.4, 0.3, 0.2, 0.1]', 'Distribution Q: [0.25, 0.25, 0.25, 0.25]'], result: 'D_KL(P || Q) ≈ 0.1037 nats, JSD(P || Q) ≈ 0.0249' },
    formula: 'D_KL(P || Q) = Σ P(i) * ln(P(i) / Q(i))',
    code: {
      python: `from scipy.special import rel_entr\nimport numpy as np\np = np.array([0.4, 0.3, 0.2, 0.1])\nq = np.array([0.25, 0.25, 0.25, 0.25])\nkl = np.sum(rel_entr(p, q))\nprint(f"KL divergence: {kl:.4f}")`,
      r: `p <- c(0.4, 0.3, 0.2, 0.1)\nq <- c(0.25, 0.25, 0.25, 0.25)\nkl <- sum(p * log(p / q))\ncat("KL:", kl, "\\n")`,
      ts: `import { klDivergence } from '@statlab/core';\nconst res = klDivergence(p, q, { base: 'nat' });`,
    },
    useCases: [
      'Detecting feature telemetry distribution drift between training and live inference in production telemetry.',
      'Measuring model probability divergence across release candidates in automated load testing.'
    ],
    when: 'Use when comparing how much an empirical or candidate distribution Q differs from a baseline distribution P.',
    cautions: [
      'Asymmetric: D_KL(P || Q) != D_KL(Q || P). Use Jensen-Shannon for symmetric comparisons.',
      'Requires Q(i) > 0 wherever P(i) > 0 to prevent division by zero.'
    ],
    workbenchId: 'kl_div',
  },
  {
    slug: 'shannon-entropy-calculator',
    title: 'Shannon entropy calculator',
    family: 'Information theory & ML',
    description: 'Compute Shannon information entropy H(X), normalized entropy, and theoretical channel capacity for discrete probability mass functions.',
    keywords: ['Shannon entropy calculator', 'information entropy', 'bits of information', 'data unpredictability', 'uncertainty metric'],
    inputs: ['Event probability vector P(X)', 'Log base (Bits: base 2, Nats: base e, Nats/Hartleys: base 10)'],
    example: { a: ['Probabilities: [0.5, 0.25, 0.125, 0.125]'], result: 'H(X) = 1.750 bits (Normalized entropy H/H_max = 0.875)' },
    formula: 'H(X) = - Σ P(x_i) * log_2(P(x_i))',
    code: {
      python: `from scipy.stats import entropy\np = [0.5, 0.25, 0.125, 0.125]\nh = entropy(p, base=2)\nprint(f"Entropy: {h:.4f} bits")`,
      r: `p <- c(0.5, 0.25, 0.125, 0.125)\nh <- -sum(p * log2(p))\ncat("Entropy:", h, "bits\\n")`,
      ts: `import { shannonEntropy } from '@statlab/core';\nconst bits = shannonEntropy([0.5, 0.25, 0.125, 0.125]);`,
    },
    useCases: [
      'Evaluating categorical user session diversity and telemetry payload unpredictability in production telemetry.',
      'Monitoring token distribution entropy in LLM response evaluations within CI/CD pipeline benchmarks.'
    ],
    when: 'Use to quantify the average degree of uncertainty or information content inherent in a probability distribution.',
    cautions: [
      'Sum of probabilities in vector must equal 1.0.',
      'Zero probability events (P=0) must be handled by limit 0*log(0) = 0.'
    ],
    workbenchId: 'shannon_ent',
  },
  {
    slug: 'cross-entropy-loss-calculator',
    title: 'Cross-entropy loss (Log Loss) calculator',
    family: 'Information theory & ML',
    description: 'Calculate binary and categorical cross-entropy loss (log loss) for machine learning classifiers given true target labels and predicted probabilities.',
    keywords: ['cross entropy loss calculator', 'log loss calculator', 'categorical cross entropy', 'binary cross entropy', 'classifier loss'],
    inputs: ['True class labels (one-hot or indices)', 'Predicted probability distribution matrix P', 'Epsilon probability clip'],
    example: { a: ['True: Class 1, Pred: [0.80, 0.15, 0.05]', 'True: Class 0, Pred: [0.10, 0.85, 0.05]'], result: 'Sample Loss 1 = 0.2231, Sample Loss 2 = 0.1625, Mean Log Loss = 0.1928' },
    formula: 'L = - (1/N) * Σ Σ y_{i,c} * log(p_{i,c})',
    code: {
      python: `from sklearn.metrics import log_loss\ny_true = [1, 0, 2]\ny_pred = [[0.1, 0.8, 0.1], [0.85, 0.1, 0.05], [0.05, 0.1, 0.85]]\nloss = log_loss(y_true, y_pred)\nprint(f"Log Loss: {loss:.4f}")`,
      r: `log_loss <- function(y, p) -mean(log(p[cbind(1:length(y), y)]))\ncat("Loss:", log_loss(c(2,1,3), pred_matrix))`,
      ts: `import { crossEntropyLoss } from '@statlab/core';\nconst loss = crossEntropyLoss(yTrue, yPred);`,
    },
    useCases: [
      'Benchmarking classification pipeline quality in CI/CD pipeline benchmarks AI test runs.',
      'Monitoring real-time multi-class classification confidence in production telemetry analytics.'
    ],
    when: 'Use when assessing probabilistic classification model performance against discrete ground truth targets.',
    cautions: [
      'Always clip predicted probabilities to [1e-15, 1 - 1e-15] to prevent log(0) numeric infinity.',
      'Sensitive to extreme overconfident misclassifications.'
    ],
    workbenchId: 'log_loss',
  },
  {
    slug: 'cpk-process-capability-calculator',
    title: 'Cpk and Cp process capability index calculator',
    family: 'Statistical process control',
    description: 'Compute Cp, Cpk, Cpm, and upper/lower process capability indices against specification limits (USL/LSL) for quality engineering and SLA compliance.',
    keywords: ['Cpk calculator', 'Cp process capability', 'USL LSL calculator', 'process capability index', 'six sigma quality', 'SLA tolerance'],
    inputs: ['Sample observations or mean X̄ & std dev s', 'Upper Specification Limit (USL)', 'Lower Specification Limit (LSL)', 'Target (optional)'],
    example: { a: ['Mean = 100.4 ms, Std dev = 1.2 ms', 'USL = 105.0 ms, LSL = 95.0 ms'], result: 'Cp = 1.389, Cpl = 1.500, Cpu = 1.278, Cpk = 1.278 (Capable process)' },
    formula: 'Cp = (USL - LSL) / (6 * σ), Cpk = min( (USL - μ)/(3σ), (μ - LSL)/(3σ) )',
    code: {
      python: `import numpy as np\ndef cpk(data, usl, lsl):\n    mu, std = np.mean(data), np.std(data, ddof=1)\n    cp = (usl - lsl) / (6 * std)\n    cpk_val = min((usl - mu)/(3*std), (mu - lsl)/(3*std))\n    return cp, cpk_val\nprint(cpk(sample_data, 105.0, 95.0))`,
      r: `library(qcc)\nprocess.capability(qcc(data, type="xbar.one"), spec.limits=c(95, 105))`,
      ts: `import { processCapability } from '@statlab/core';\nconst { cp, cpk } = processCapability(data, { usl: 105, lsl: 95 });`,
    },
    useCases: [
      'Evaluating infrastructure latency SLA compliance in production system telemetry.',
      'Validating build artifact execution limits in CI/CD pipeline benchmarks release qualification.'
    ],
    when: 'Use to measure how well a continuous process stays within predefined customer/engineering specification tolerances.',
    cautions: [
      'Assumes process data is normally distributed; non-normal data distorts standard Cpk calculations.',
      'Cpk requires a stable, in-control process.'
    ],
    workbenchId: 'spc_cpk',
  },
  {
    slug: 'xbar-r-control-chart-calculator',
    title: 'X-bar and R statistical process control chart calculator',
    family: 'Statistical process control',
    description: 'Calculate Upper Control Limits (UCL), Lower Control Limits (LCL), and centerlines for X-bar (subgroup mean) and R (range) SPC control charts.',
    keywords: ['X-bar R chart calculator', 'SPC control limits', 'subgroup mean chart', 'UCL LCL calculator', 'process variability', 'Shewhart chart'],
    inputs: ['Subgroup measurements matrix', 'Subgroup size n (2 to 10)', 'Sigma level (e.g. 3-sigma standard)'],
    example: { a: ['5 subgroups of size n = 4', 'Grand mean X̄̄ = 50.2, Average range R̄ = 2.4'], result: 'X-bar Chart: Centerline = 50.2, LCL = 48.45, UCL = 51.95 (A₂ = 0.729)\\nR Chart: Centerline = 2.4, LCL = 0, UCL = 5.48 (D₄ = 2.282)' },
    formula: 'X̄ Chart: UCL = X̄̄ + A₂ * R̄, LCL = X̄̄ - A₂ * R̄; R Chart: UCL = D₄ * R̄, LCL = D₃ * R̄',
    code: {
      python: `import statsmodels.api as sm\n# Calculate subgroup means and ranges, applying Shewhart constants A2, D3, D4`,
      r: `library(qcc)\nqcc(subgroup_matrix, type = "xbar")\nqcc(subgroup_matrix, type = "R")`,
      ts: `import { xbarRChart } from '@statlab/core';\nconst limits = xbarRChart(subgroups);`,
    },
    useCases: [
      'Detecting system performance drift and abnormal spikes in production system telemetry streams.',
      'Continuous monitoring of API build execution times across release iterations.'
    ],
    when: 'Use when continuous process data is sampled in small, periodic subgroups of size n=2 to 10.',
    cautions: [
      'Check the R-chart for stability first; if the range chart is out of control, X-bar limits become invalid.',
      'Requires rational subgrouping.'
    ],
    workbenchId: 'spc_xbar',
  },
  {
    slug: 'six-sigma-dpmo-calculator',
    title: 'Six Sigma DPMO and Sigma Level calculator',
    family: 'Statistical process control',
    description: 'Calculate Defects Per Million Opportunities (DPMO), Defects Per Unit (DPU), yield percentages, and Process Sigma Level with optional 1.5σ shift.',
    keywords: ['Six Sigma calculator', 'DPMO calculator', 'sigma level', 'yield percentage', 'defects per million opportunities', 'process yield'],
    inputs: ['Total units inspected N', 'Opportunities per unit O', 'Total defects found D', 'Apply 1.5σ shift (Yes/No)'],
    example: { a: ['10,000 requests inspected', '5 opportunity error checks per request', '12 total defect errors found'], result: 'DPMO = 240, Yield = 99.976%, Process Sigma Level = 5.00σ (with 1.5σ shift)' },
    formula: 'DPMO = (Defects / (Units * Opportunities)) * 1,000,000; Sigma Level = NormInv(1 - DPMO/1e6) + 1.5',
    code: {
      python: `from scipy.stats import norm\ndef calculate_sigma(units, opps, defects, shift=1.5):\n    dpmo = (defects / (units * opps)) * 1e6\n    sig = norm.ppf(1 - dpmo/1e6) + shift\n    return dpmo, sig\nprint(calculate_sigma(10000, 5, 12))`,
      r: `dpmo <- (12 / (10000 * 5)) * 1e6\nsigma_level <- qnorm(1 - dpmo/1e6) + 1.5`,
      ts: `import { sixSigmaDpmo } from '@statlab/core';\nconst { dpmo, sigmaLevel } = sixSigmaDpmo(10000, 5, 12);`,
    },
    useCases: [
      'Benchmarking multi-step microservice request transaction reliability in production telemetry.',
      'Establishing quality gate thresholds for automated test deployments in CI/CD pipeline benchmarks.'
    ],
    when: 'Use when evaluating process defect rates across complex items or transactions with multiple potential failure points.',
    cautions: [
      'Be transparent about whether the reported Sigma level includes the standard 1.5σ long-term shift.',
      'Carefully define what constitutes a single "opportunity".'
    ],
    workbenchId: 'spc_sigma',
  },
  {
    slug: 'auto-correlation-acf-pacf',
    title: 'Autocorrelation (ACF) and Partial Autocorrelation (PACF) calculator',
    family: 'Time series & econometrics',
    description: 'Compute sample Autocorrelation Coefficients (ACF) and Partial Autocorrelation Coefficients (PACF) across multiple time lags with Bartlett confidence bounds.',
    keywords: ['autocorrelation calculator', 'ACF PACF calculator', 'serial correlation', 'time series correlation', 'Yule-Walker', 'ARIMA order identification'],
    inputs: ['Time series numeric sequence', 'Maximum lag count k', 'Confidence level (95%)'],
    example: { a: ['Time series: 12, 15, 14, 18, 22, 21, 25, 29, 28, 32', 'Max lags = 4'], result: 'Lag 1 ACF = 0.812 (p < .001), Lag 2 ACF = 0.624, Lag 1 PACF = 0.812, Lag 2 PACF = -0.114' },
    formula: 'r_k = Σ_{t=k+1}^N (Y_t - Ȳ)(Y_{t-k} - Ȳ) / Σ_{t=1}^N (Y_t - Ȳ)²',
    code: {
      python: `from statsmodels.tsa.stattools import acf, pacf\nautocorr = acf(series, nlags=4)\npartial_ac = pacf(series, nlags=4)\nprint("ACF:", autocorr)\nprint("PACF:", partial_ac)`,
      r: `acf(series, lag.max = 4, plot = FALSE)\npacf(series, lag.max = 4, plot = FALSE)`,
      ts: `import { acfPacf } from '@statlab/core';\nconst { acf, pacf } = acfPacf(series, { maxLag: 4 });`,
    },
    useCases: [
      'Identifying seasonality and temporal dependence in server metric streams in production telemetry.',
      'Selecting appropriate ARIMA model orders for server workload forecasting in CI/CD pipeline benchmarks.'
    ],
    when: 'Use when analyzing time-ordered observations to detect repeating lag patterns or hidden periodicity.',
    cautions: [
      'Ensure the time series is stationary before interpreting PACF plots.',
      'Confounded by strong deterministic trends unless differenced.'
    ],
    workbenchId: 'ts_acf',
  },
  {
    slug: 'arch-garch-volatility',
    title: 'ARCH and GARCH volatility model test calculator',
    family: 'Time series & econometrics',
    description: 'Test for autoregressive conditional heteroskedasticity (Engle’s ARCH LM test) and compute baseline GARCH(1,1) volatility parameters.',
    keywords: ['ARCH test calculator', 'GARCH model calculator', 'Engle ARCH LM test', 'volatility clustering', 'heteroskedasticity time series'],
    inputs: ['Residuals or stationary return series', 'Lag order p', 'Alpha significance level'],
    example: { a: ['Residual series: 0.12, -0.45, 0.89, -1.20, 0.05, 0.34, -0.78, 1.15', 'Lag p = 2'], result: 'Engle ARCH LM test statistic TR² = 6.42, df = 2, p = .040 (Significant ARCH effect)' },
    formula: 'e_t² = α₀ + α₁ e_{t-1}² + ... + α_p e_{t-p}² + u_t, Test Stat = T * R² ~ χ²(p)',
    code: {
      python: `from statsmodels.stats.diagnostic import het_arch\nres = het_arch(residuals, maxlag=2)\nprint(f"LM stat={res[0]:.4f}, p-value={res[1]:.4f}")`,
      r: `library(FinTS)\nArchTest(residuals, lags = 2)`,
      ts: `import { archTest } from '@statlab/core';\nconst result = archTest(residuals, { lags: 2 });`,
    },
    useCases: [
      'Detecting volatility clustering in API latency or traffic throughput bursts in production telemetry.',
      'Evaluating stress test variance stability across load spikes in automated load testing.'
    ],
    when: 'Use when time series variance fluctuates dynamically over time rather than remaining constant.',
    cautions: [
      'Requires a stationary time series with zero or estimated conditional mean.',
      'Spurious ARCH results can occur if linear autocorrelation is ignored.'
    ],
    workbenchId: 'ts_arch',
  },
  {
    slug: 'cointegration-johansen-eg',
    title: 'Engle-Granger cointegration test calculator',
    family: 'Time series & econometrics',
    description: 'Evaluate long-run stationary equilibrium between non-stationary time series using the Engle-Granger two-step cointegration test.',
    keywords: ['cointegration test', 'Engle Granger test', 'long run equilibrium', 'spurious regression', 'stationarity of residuals'],
    inputs: ['Dependent variable time series Y_t', 'Independent variable time series X_t', 'Augmented Dickey-Fuller lag order'],
    example: { a: ['Series Y (Endpoint Latency)', 'Series X (DB Query Duration)'], result: 'Co-integrating vector β = 1.42, Residual ADF t-stat = -4.18 (p < .01, Cointegrated)' },
    formula: 'Step 1: Y_t = α + β X_t + e_t; Step 2: Δ e_t = γ e_{t-1} + Σ θ_i Δ e_{t-i} + v_t',
    code: {
      python: `from statsmodels.tsa.stattools import coint\nt_stat, p_value, crit_vals = coint(series_y, series_x)\nprint(f"Coint t={t_stat:.4f}, p={p_value:.4f}")`,
      r: `library(tseries)\npo.test(cbind(series_y, series_x))`,
      ts: `import { engleGrangerCoint } from '@statlab/core';\nconst result = engleGrangerCoint(seriesY, seriesX);`,
    },
    useCases: [
      'Verifying long-term equilibrium relationship between backend resource usage and frontend throughput in production telemetry.',
      'Ensuring benchmark metrics maintain stable ratios across long test runs in CI/CD pipeline benchmarks.'
    ],
    when: 'Use when testing whether two integrated I(1) time series share a true non-spurious statistical relationship.',
    cautions: [
      'Both underlying series must individually be non-stationary I(1).',
      'Engle-Granger is sensitive to which series is designated as dependent; test both directions.'
    ],
    workbenchId: 'ts_coint',
  },
  {
    slug: 'number-needed-to-treat',
    title: 'Number Needed to Treat (NNT) and Harm (NNH) calculator',
    family: 'Biostatistics & diagnostics',
    description: 'Compute Absolute Risk Reduction (ARR), Absolute Risk Increase (ARI), Number Needed to Treat (NNT), and Number Needed to Harm (NNH) with 95% confidence intervals.',
    keywords: ['NNT calculator', 'number needed to treat', 'NNH calculator', 'absolute risk reduction', 'ARR calculator', 'clinical significance'],
    inputs: ['Control event rate (CER)', 'Experimental event rate (EER)', 'Confidence level (95%)'],
    example: { a: ['Control Event Rate CER = 0.20 (20%)', 'Treatment Event Rate EER = 0.05 (5%)'], result: 'ARR = 0.150 (15%), NNT = 6.67 ≈ 7 users (95% CI: [4.8, 11.2])' },
    formula: 'ARR = CER - EER, NNT = 1 / ARR = 1 / (CER - EER)',
    code: {
      python: `def calculate_nnt(cer, eer):\n    arr = cer - eer\n    nnt = 1 / arr if arr != 0 else float('inf')\n    return arr, nnt\nprint(calculate_nnt(0.20, 0.05))`,
      r: `cer <- 0.20; eer <- 0.05\narr <- cer - eer\nnnt <- 1 / arr\ncat("ARR:", arr, "NNT:", nnt, "\\n")`,
      ts: `import { numberNeededToTreat } from '@statlab/core';\nconst { arr, nnt } = numberNeededToTreat(0.20, 0.05);`,
    },
    useCases: [
      'Quantifying customer intervention impact (e.g. how many churn-risk users must receive a workflow fix to prevent one churn event) in production telemetry.',
      'Evaluating error reduction impact per user deployment in CI/CD pipeline benchmarks.'
    ],
    when: 'Use when translating absolute probability risk changes into tangible unit/patient counts required to achieve one positive outcome.',
    cautions: [
      'NNT cannot be interpreted without specifying the timeframe of follow-up.',
      'If EER > CER, compute NNH = 1 / (EER - CER) instead.'
    ],
    workbenchId: 'bio_nnt',
  },
  {
    slug: 'diagnostic-likelihood-ratio',
    title: 'Diagnostic Likelihood Ratios (LR+ / LR-) and Post-Test Probability calculator',
    family: 'Biostatistics & diagnostics',
    description: 'Calculate Positive Likelihood Ratio (LR+), Negative Likelihood Ratio (LR-), Diagnostic Odds Ratio, and Post-Test Probabilities using Fagan’s nomogram formula.',
    keywords: ['likelihood ratio calculator', 'positive likelihood ratio', 'LR+ LR- calculator', 'post test probability', 'Fagan nomogram', 'diagnostic test'],
    inputs: ['Sensitivity (True Positive Rate)', 'Specificity (True Negative Rate)', 'Pre-test Probability (Prevalence)'],
    example: { a: ['Sensitivity = 0.90 (90%)', 'Specificity = 0.95 (95%)', 'Pre-test Probability = 0.10 (10%)'], result: 'LR+ = 18.0, LR- = 0.105, Post-Test Probability (Positive) = 66.7%, Post-Test (Negative) = 1.15%' },
    formula: 'LR+ = Sensitivity / (1 - Specificity), LR- = (1 - Sensitivity) / Specificity; Post-Test Odds = Pre-Test Odds * LR',
    code: {
      python: `def diagnostic_lr(sens, spec, pre_prob):\n    lr_pos = sens / (1 - spec)\n    lr_neg = (1 - sens) / spec\n    pre_odds = pre_prob / (1 - pre_prob)\n    post_prob_pos = (pre_odds * lr_pos) / (1 + pre_odds * lr_pos)\n    return lr_pos, lr_neg, post_prob_pos\nprint(diagnostic_lr(0.90, 0.95, 0.10))`,
      r: `sens <- 0.90; spec <- 0.95; pre <- 0.10\nlr_pos <- sens / (1 - spec)\npost_odds <- (pre / (1 - pre)) * lr_pos\npost_prob <- post_odds / (1 + post_odds)`,
      ts: `import { diagnosticLikelihoodRatio } from '@statlab/core';\nconst res = diagnosticLikelihoodRatio({ sensitivity: 0.90, specificity: 0.95, preTestProb: 0.10 });`,
    },
    useCases: [
      'Evaluating anomaly detector and security scanner diagnostic power in production system telemetry.',
      'Calculating post-test probability of release defects given automated suite failure rates in CI/CD pipeline benchmarks.'
    ],
    when: 'Use when evaluating how much a diagnostic test result shifts the probability of a target condition or defect.',
    cautions: [
      'Likelihood ratios are independent of prevalence, but post-test probability depends heavily on pre-test probability.',
      'LR+ > 10 indicates strong diagnostic power.'
    ],
    workbenchId: 'diag_lr',
  },
  {
    slug: 'bland-altman-plot',
    title: 'Bland-Altman agreement analysis calculator',
    family: 'Biostatistics & diagnostics',
    description: 'Evaluate agreement between two measurement methods using mean difference (bias), standard deviation, and 95% Limits of Agreement (LoA).',
    keywords: ['Bland Altman calculator', 'limits of agreement', 'measurement agreement', 'method comparison', 'bias and LoA', 'clinical agreement'],
    inputs: ['Method A numerical paired measurements', 'Method B numerical paired measurements', 'Confidence interval level (95%)'],
    example: { a: ['Method A: 102, 105, 98, 110, 115, 100', 'Method B: 100, 106, 95, 108, 112, 99'], result: 'Mean Difference (Bias) = +1.67, SD of Diff = 1.37, Lower LoA (-1.96s) = -1.01, Upper LoA (+1.96s) = +4.35' },
    formula: 'Diff_i = A_i - B_i, Bias d̄ = Σ Diff_i / N, LoA = d̄ ± 1.96 * s_d',
    code: {
      python: `import numpy as np\ndef bland_altman(m1, m2):\n    diffs = np.array(m1) - np.array(m2)\n    mean_diff = np.mean(diffs)\n    std_diff = np.std(diffs, ddof=1)\n    return mean_diff, mean_diff - 1.96*std_diff, mean_diff + 1.96*std_diff\nprint(bland_altman([102,105,98,110], [100,106,95,108]))`,
      r: `library(BlandAltmanLeh)\nbland.altman.stats(m1, m2)`,
      ts: `import { blandAltman } from '@statlab/core';\nconst { bias, lowerLoa, upperLoa } = blandAltman(methodA, methodB);`,
    },
    useCases: [
      'Assessing agreement between synthetic telemetry timers and client-side web vitals in production telemetry.',
      'Comparing legacy performance benchmark metrics vs new system profiling suites.'
    ],
    when: 'Use when comparing two continuous measurement tools or devices to check if they can be used interchangeably.',
    cautions: [
      'High correlation r does not imply good agreement; always inspect Bland-Altman mean bias and LoA.',
      'Check if differences vary proportionally with measurement magnitude.'
    ],
    workbenchId: 'bland_altman',
  },
  {
    slug: 'ridge-lasso-elasticnet',
    title: 'Ridge, Lasso, and ElasticNet regularization calculator',
    family: 'Regression & ML',
    description: 'Compute L1 (Lasso) and L2 (Ridge) penalty impacts, shrinkage coefficients, and optimal hyperparameter lambda search bounds.',
    keywords: ['ridge regression calculator', 'lasso regression calculator', 'elasticnet regularization', 'L1 L2 penalty', 'feature selection', 'shrinkage parameter'],
    inputs: ['Feature matrix X and target Y', 'Penalty type (Ridge L2, Lasso L1, ElasticNet)', 'Regularization parameter Lambda (λ)', 'L1 ratio alpha (for ElasticNet)'],
    example: { a: ['5 Predictors, N = 100 observations', 'Penalty: Lasso (L1), λ = 0.10'], result: 'Shrunk coefficients: [1.42, 0.00, -0.85, 0.00, 0.31] (2 predictors zeroed out)' },
    formula: 'Ridge: min ||Y - Xβ||² + λ||β||₂²; Lasso: min ||Y - Xβ||² + λ||β||₁',
    code: {
      python: `from sklearn.linear_model import ElasticNet\nmodel = ElasticNet(alpha=0.1, l1_ratio=0.5)\nmodel.fit(X, y)\nprint("Coefficients:", model.coef_)`,
      r: `library(glmnet)\nfit <- glmnet(X, y, alpha = 0.5, lambda = 0.1)\ncoef(fit)`,
      ts: `import { elasticNetRegression } from '@statlab/core';\nconst model = elasticNetRegression(X, y, { lambda: 0.1, l1Ratio: 0.5 });`,
    },
    useCases: [
      'Preventing overfitting in telemetry prediction models with high-dimensional feature spaces in production telemetry.',
      'Performing automated feature selection on system release benchmarks in CI/CD pipeline benchmarks.'
    ],
    when: 'Use when fitting regression models on datasets with multicollinear or high-dimensional predictor variables.',
    cautions: [
      'Standardize input features (mean=0, variance=1) before applying L1/L2 penalties.',
      'Lasso arbitrarily selects one feature among highly correlated variables.'
    ],
    workbenchId: 'reg_pen',
  },
  {
    slug: 'ndcg-ranking-metrics',
    title: 'NDCG (Normalized Discounted Cumulative Gain) calculator',
    family: 'Reliability & forecast accuracy',
    description: 'Calculate Discounted Cumulative Gain (DCG), Ideal DCG (IDCG), and Normalized DCG (NDCG@K) for search ranking and recommendation evaluation.',
    keywords: ['NDCG calculator', 'normalized discounted cumulative gain', 'ranking quality metric', 'search relevance NDCG', 'DCG@K calculator'],
    inputs: ['Predicted item relevance scores array', 'Ground truth ideal relevance scores', 'Rank cutoff K'],
    example: { a: ['Predicted order relevance: [3, 2, 3, 0, 1, 2]', 'Ideal order relevance: [3, 3, 2, 2, 1, 0]', 'Cutoff K = 5'], result: 'DCG@5 = 6.861, IDCG@5 = 7.141, NDCG@5 = 0.9608 (96.1% optimal ranking)' },
    formula: 'DCG@K = Σ_{i=1}^K (2^{rel_i} - 1) / log_2(i + 1), NDCG@K = DCG@K / IDCG@K',
    code: {
      python: `from sklearn.metrics import ndcg_score\nimport numpy as np\ny_true = np.array([[3, 3, 2, 2, 1, 0]])\ny_score = np.array([[3, 2, 3, 0, 1, 2]])\nscore = ndcg_score(y_true, y_score, k=5)\nprint(f"NDCG@5: {score:.4f}")`,
      r: `dcg <- function(r) sum((2^r - 1) / log2(2:(length(r)+1)))\nndcg <- dcg(rel_pred) / dcg(rel_ideal)`,
      ts: `import { ndcgScore } from '@statlab/core';\nconst score = ndcgScore(yTrue, yScore, { k: 5 });`,
    },
    useCases: [
      'Evaluating search, recommendation, and catalog ranking quality in production telemetry analytics.',
      'Benchmarking search and vector retrieval accuracy across release candidates in CI/CD pipeline benchmarks.'
    ],
    when: 'Use when evaluating ranked list results where documents or items have graded relevance scores.',
    cautions: [
      'Binary relevance scores use simplified DCG = Σ rel_i / log2(i+1); use 2^rel - 1 formulation for graded relevance.',
      'Requires defining a standard cutoff rank K.'
    ],
    workbenchId: 'eval_ndcg',
  },
  {
    slug: 'mean-absolute-percentage-error',
    title: 'MAPE, WAPE, and SMAPE forecast accuracy calculator',
    family: 'Reliability & forecast accuracy',
    description: 'Compute Mean Absolute Percentage Error (MAPE), Weighted Absolute Percentage Error (WAPE), and Symmetric MAPE (SMAPE) for time series predictions.',
    keywords: ['MAPE calculator', 'mean absolute percentage error', 'SMAPE calculator', 'WAPE calculator', 'forecast accuracy metric', 'error percentage'],
    inputs: ['Actual values array Y', 'Forecast values array Ŷ'],
    example: { a: ['Actuals: [100, 150, 200, 250, 300]', 'Forecasts: [110, 140, 210, 240, 315]'], result: 'MAPE = 5.67%, WAPE = 5.00%, SMAPE = 5.56%' },
    formula: 'MAPE = (100/N) * Σ |(Y_i - Ŷ_i) / Y_i|; SMAPE = (200/N) * Σ |Y_i - Ŷ_i| / (|Y_i| + |Ŷ_i|)',
    code: {
      python: `import numpy as np\ndef mape(y_true, y_pred):\n    return np.mean(np.abs((y_true - y_pred) / y_true)) * 100\nprint(f"MAPE: {mape(actuals, forecasts):.2f}%")`,
      r: `mape <- mean(abs((actuals - forecasts) / actuals)) * 100\ncat("MAPE:", mape, "%\\n")`,
      ts: `import { forecastErrorMape } from '@statlab/core';\nconst { mape, smape, wape } = forecastErrorMape(actuals, forecasts);`,
    },
    useCases: [
      'Monitoring traffic volume forecast accuracy in production telemetry infrastructure auto-scaling.',
      'Evaluating load prediction models during release benchmarking in CI/CD pipeline benchmarks.'
    ],
    when: 'Use when comparing forecast model accuracy across different scales or physical units.',
    cautions: [
      'MAPE produces infinite or undefined results if actual values Y_i are zero.',
      'SMAPE bounds errors between 0% and 200% and handles zero actual values better.'
    ],
    workbenchId: 'eval_mape',
  },
  {
    slug: 'mtbf-mttr-reliability',
    title: 'MTBF, MTTR, and Availability reliability calculator',
    family: 'Reliability & forecast accuracy',
    description: 'Calculate Mean Time Between Failures (MTBF), Mean Time To Repair (MTTR), Failure Rate (λ), and theoretical System Availability percentage (uptime SLA).',
    keywords: ['MTBF calculator', 'MTTR calculator', 'system availability', 'uptime percentage SLA', 'failure rate lambda', 'reliability engineering'],
    inputs: ['Total operational execution time T', 'Total downtime duration D', 'Number of failure incidents N'],
    example: { a: ['Total operational time: 720 hours (30 days)', 'Downtime duration: 0.72 hours (43.2 min)', 'Failures: 3 incidents'], result: 'MTBF = 239.76 hrs, MTTR = 0.24 hrs (14.4 min), Failure Rate λ = 0.00417/hr, Availability = 99.90% (Three Nines)' },
    formula: 'MTBF = (Total Operating Time - Downtime) / N, MTTR = Downtime / N, Availability = MTBF / (MTBF + MTTR)',
    code: {
      python: `def system_reliability(total_hours, downtime_hours, failures):\n    uptime = total_hours - downtime_hours\n    mtbf = uptime / failures\n    mttr = downtime_hours / failures\n    avail = (mtbf / (mtbf + mttr)) * 100\n    return mtbf, mttr, avail\nprint(system_reliability(720, 0.72, 3))`,
      r: `total <- 720; down <- 0.72; n <- 3\nmtbf <- (total - down) / n\nmttr <- down / n\navail <- (mtbf / (mtbf + mttr)) * 100`,
      ts: `import { mtbfMttrReliability } from '@statlab/core';\nconst res = mtbfMttrReliability(720, 0.72, 3);`,
    },
    useCases: [
      'Tracking microservice uptime and incident recovery performance in production system telemetry.',
      'Establishing reliability metrics and outage SLA thresholds in CI/CD pipeline benchmarks release qualification.'
    ],
    when: 'Use when modeling system uptime, hardware/software failure intervals, and repair performance.',
    cautions: [
      'Assumes a constant failure rate (exponential distribution of time to failure).',
      'Does not account for preventive maintenance intervals unless subtracted.'
    ],
    workbenchId: 'rel_mtbf',
  },
  {
    slug: 'bootstrap-confidence-interval',
    title: 'Bootstrap confidence interval calculator',
    family: 'Resampling & non-parametric',
    description: 'Compute empirical percentile and BCa (bias-corrected and accelerated) bootstrap confidence intervals for arbitrary sample statistics.',
    keywords: ['bootstrap confidence interval', 'percentile bootstrap', 'BCa bootstrap', 'resampling confidence interval', 'non-parametric CI'],
    inputs: ['Sample observations vector X', 'Statistic function (Mean, Median, Std Dev, Ratio)', 'Bootstrap iterations B (e.g. 2000, 5000)', 'Confidence level (95%)'],
    example: { a: ['Sample: 12.4, 15.1, 14.8, 18.2, 32.1, 11.9, 14.2', 'Statistic: Median', 'B = 2000 iterations'], result: 'Sample Median = 14.80, 95% Percentile Bootstrap CI: [12.40, 18.20], BCa CI: [12.15, 17.95]' },
    formula: 'CI_{percentile} = [Q^*_{(α/2)}, Q^*_{(1-α/2)}], BCa adjustment α_1 = Φ(ẑ_0 + (ẑ_0 + z_α)/(1 - a(ẑ_0 + z_α)))',
    code: {
      python: `import numpy as np\nfrom scipy.stats import bootstrap\ndata = (np.array([12.4, 15.1, 14.8, 18.2, 32.1, 11.9, 14.2]),)\nres = bootstrap(data, np.median, method='BCa', n_resamples=2000)\nprint(f"95% BCa CI: {res.confidence_interval}")`,
      r: `library(boot)\nb_out <- boot(data, function(d, i) median(d[i]), R = 2000)\nboot.ci(b_out, type = c("perc", "bca"))`,
      ts: `import { bootstrapCI } from '@statlab/core';\nconst ci = bootstrapCI(sampleData, { fn: 'median', resamples: 2000, confidence: 0.95 });`,
    },
    useCases: [
      'Estimating non-normal latency percentile confidence intervals (p95/p99) in production system telemetry.',
      'Constructing robust parameter bounds for complex microbenchmarks in automated load testing.'
    ],
    when: 'Use when data violates parametric normality assumptions or when calculating CIs for non-linear sample statistics.',
    cautions: [
      'Requires B >= 2000 resamples for reliable 95% tail bounds.',
      'Standard percentile bootstrap can suffer coverage errors in skewed small samples; use BCa when possible.'
    ],
    workbenchId: 'boot_ci',
  },
  {
    slug: 'permutation-test-two-samples',
    title: 'Permutation / Randomization test calculator',
    family: 'Resampling & non-parametric',
    description: 'Perform a two-sample exact or Monte Carlo permutation test to assess mean, median, or custom metric difference without distributional assumptions.',
    keywords: ['permutation test calculator', 'randomization test', 'exact test', 'non parametric mean comparison', 'resampling p-value'],
    inputs: ['Group A numeric values', 'Group B numeric values', 'Test statistic (Mean difference, Median difference)', 'Permutations K (or Exact)'],
    example: { a: ['Group A: 24, 28, 31, 35, 42', 'Group B: 18, 20, 22, 25, 29'], result: 'Observed Diff = +7.20, Permutation p-value = .0158 (10,000 Monte Carlo draws)' },
    formula: 'p = (1 / K) * Σ I(|T_k*| >= |T_{obs}|)',
    code: {
      python: `from scipy.stats import permutation_test\nimport numpy as np\nres = permutation_test((group_a, group_b), lambda x, y: np.mean(x) - np.mean(y), n_resamples=10000)\nprint(f"p-value: {res.pvalue:.4f}")`,
      r: `library(coin)\noneway_test(y ~ group, data = df, distribution = approximate(nresample = 10000))`,
      ts: `import { permutationTest } from '@statlab/core';\nconst result = permutationTest(groupA, groupB, { metric: 'meanDiff', resamples: 10000 });`,
    },
    useCases: [
      'Validating custom SLA metric shifts between production release candidate groups in production telemetry.',
      'Testing latency differences in small sample microbenchmarks in CI/CD pipeline benchmarks.'
    ],
    when: 'Use when sample sizes are small or when parametric assumptions (normality, equal variance) are doubtful.',
    cautions: [
      'Exact permutation is computationally prohibitive for large total sample sizes N > 30; use Monte Carlo approximation.',
      'Assumes observations are exchangeable under the null hypothesis.'
    ],
    workbenchId: 'perm_test',
  },
  {
    slug: 'response-surface-methodology',
    title: 'Response Surface Methodology (RSM) optimizer',
    family: 'Design of experiments (DOE)',
    description: 'Analyze Central Composite Design (CCD) and Box-Behnken designs to model quadratic response surfaces, identify optimal factor settings, and map stationary points.',
    keywords: ['RSM calculator', 'response surface methodology', 'central composite design', 'Box Behnken design', 'stationary point optimization', 'DOE response surface'],
    inputs: ['Factor design matrix (X1, X2, ...)', 'Response variable array Y', 'Design type (Central Composite CCD, Box-Behnken)'],
    example: { a: ['Factors: Temperature (X1), Pressure (X2)', 'Response Y: Throughput (ops/sec)', 'Design: Box-Behnken (13 runs)'], result: 'Stationary Point: X1* = 145.2°C, X2* = 32.4 PSI, Predicted Max Y = 4,820 ops/sec (R² = 0.962)' },
    formula: 'Y = β₀ + Σ β_i X_i + Σ β_{ii} X_i² + Σ Σ β_{ij} X_i X_j + ε, X^* = - 0.5 * B⁻¹ b',
    code: {
      python: `import statsmodels.api as sm\n# Fit second-order polynomial formula y ~ x1 + x2 + I(x1**2) + I(x2**2) + x1:x2`,
      r: `library(rsm)\nfit <- rsm(y ~ SO(x1, x2), data = design_df)\nsummary(fit)`,
      ts: `import { rsmOptimize } from '@statlab/core';\nconst opt = rsmOptimize(designMatrix, responseY);`,
    },
    useCases: [
      'Optimizing database query thread pools and cache sizing in production system telemetry tuning.',
      'Finding optimal hyperparameter configurations for automated build pipelines in CI/CD pipeline benchmarks.'
    ],
    when: 'Use when fine-tuning continuous control factors to maximize or minimize a key performance outcome after initial screening.',
    cautions: [
      'Ensure stationary point is a true maximum/minimum (inspect eigenvalues of the B matrix).',
      'Stationary points outside the experimental region require extrapolation caution.'
    ],
    workbenchId: 'doe_rsm',
  },
  {
    slug: 'plackett-burman-screening',
    title: 'Plackett-Burman screening design calculator',
    family: 'Design of experiments (DOE)',
    description: 'Evaluate main factor effects across fractional factorial Plackett-Burman screening matrix experiments (N=12, 16, 20, 24 runs) to identify critical variables.',
    keywords: ['Plackett Burman calculator', 'screening design DOE', 'fractional factorial screening', 'main effects DOE', 'variable screening'],
    inputs: ['Factor matrix (+1/-1 coded for k factors)', 'Response measurement vector Y', 'Run count N (multiple of 4)'],
    example: { a: ['7 Factors (A-G), N = 12 runs design', 'Response Y: Execution Time (ms)'], result: 'Significant Factors: Factor A (Effect = -45.2ms, p < .001), Factor D (Effect = +28.1ms, p = .012); Others inactive.' },
    formula: 'Effect_j = (2 / N) * Σ (x_{ij} * Y_i)',
    code: {
      python: `import statsmodels.api as sm\n# Compute main effect estimates for N-run Hadamard design matrix`,
      r: `library(DoE.base)\npb_design <- pb(nruns = 12, nfactors = 7)\n# Fit linear model Y ~ A + B + C + D + E + F + G`,
      ts: `import { plackettBurman } from '@statlab/core';\nconst effects = plackettBurman(designMatrix, responseY);`,
    },
    useCases: [
      'Screening 10+ potential microservice configuration parameters down to the top 2-3 impact drivers in production telemetry.',
      'Rapidly isolating root-cause parameters causing performance regression in CI/CD pipeline benchmarks.'
    ],
    when: 'Use in early-stage engineering exploration to screen many candidate factors in very few experimental runs.',
    cautions: [
      'Plackett-Burman designs alias main effects with two-factor interactions; follow up with full factorials on key variables.',
      'Assumes 2-way interactions are negligible during initial screening.'
    ],
    workbenchId: 'doe_pb',
  },
  {
    slug: 'taguchi-signal-to-noise',
    title: 'Taguchi Signal-to-Noise (S/N) ratio calculator',
    family: 'Design of experiments (DOE)',
    description: 'Compute Taguchi static Signal-to-Noise ratios (S/N) for Nominal-is-Best, Larger-is-Better, and Smaller-is-Better robust quality engineering.',
    keywords: ['Taguchi SN ratio calculator', 'signal to noise ratio DOE', 'robust design Taguchi', 'nominal is best', 'smaller is better', 'larger is better'],
    inputs: ['Measurement replicates array Y per trial run', 'Objective (Larger-is-Better, Smaller-is-Better, Nominal-is-Best)'],
    example: { a: ['Trial 1 Replicates: [102.1, 101.8, 102.4, 101.9]', 'Objective: Nominal-is-Best (Target = 100)'], result: 'Mean = 102.05, Variance = 0.063, S/N Ratio = 32.18 dB' },
    formula: 'Smaller-is-Better: S/N = -10 log10((1/n) Σ y_i²); Larger-is-Better: S/N = -10 log10((1/n) Σ (1/y_i²)); Nominal: S/N = 10 log10(ȳ² / s²)',
    code: {
      python: `import numpy as np\ndef taguchi_sn(y, mode='larger'):\n    y = np.array(y)\n    if mode == 'smaller': return -10 * np.log10(np.mean(y**2))\n    elif mode == 'larger': return -10 * np.log10(np.mean(1 / (y**2)))\n    elif mode == 'nominal': return 10 * np.log10(np.mean(y)**2 / np.var(y, ddof=1))\nprint(taguchi_sn([102.1, 101.8, 102.4, 101.9], mode='nominal'))`,
      r: `sn_nominal <- function(y) 10 * log10(mean(y)^2 / var(y))`,
      ts: `import { taguchiSnRatio } from '@statlab/core';\nconst sn = taguchiSnRatio([102.1, 101.8, 102.4, 101.9], { mode: 'nominal' });`,
    },
    useCases: [
      'Optimizing robust backend server configurations against fluctuating background load in production telemetry.',
      'Building fault-tolerant, low-variance deployment profiles in automated load testing.'
    ],
    when: 'Use when designing robust systems that remain insensitive to external noise and environment variation.',
    cautions: [
      'Decide the correct S/N optimization objective (Smaller/Larger/Nominal) before performing ANOVA on S/N values.',
      'Requires replicated trial measurements.'
    ],
    workbenchId: 'taguchi_sn',
  },
  {
    slug: 'cosine-similarity-calculator',
    title: 'Cosine similarity & angular distance calculator',
    family: 'Vector distances & ML metrics',
    description: 'Calculate Cosine similarity, Cosine distance, and Angular distance between dense numerical vector embeddings for LLM RAG and semantic search evaluation.',
    keywords: ['cosine similarity calculator', 'vector distance', 'cosine distance', 'angular distance', 'embedding similarity', 'LLM RAG metric'],
    inputs: ['Vector A numerical array', 'Vector B numerical array'],
    example: { a: ['Vector A (Document Embedding): [0.12, 0.85, -0.42, 0.31]', 'Vector B (Query Embedding): [0.15, 0.78, -0.48, 0.28]'], result: 'Cosine Similarity = 0.9942, Cosine Distance = 0.0058, Angular Distance = 0.0384 rad (2.20°)' },
    formula: 'Sim(A, B) = (A · B) / (||A|| * ||B||), Cosine Distance = 1 - Sim(A, B), Angular Distance = arccos(Sim(A, B)) / π',
    code: {
      python: `import numpy as np\nfrom scipy.spatial.distance import cosine\na, b = np.array([0.12, 0.85, -0.42, 0.31]), np.array([0.15, 0.78, -0.48, 0.28])\nsim = 1 - cosine(a, b)\nprint(f"Cosine Similarity: {sim:.4f}")`,
      r: `sim <- sum(a * b) / (sqrt(sum(a^2)) * sqrt(sum(b^2)))`,
      ts: `import { cosineSimilarity } from '@statlab/core';\nconst sim = cosineSimilarity(vectorA, vectorB);`,
    },
    useCases: [
      'Evaluating LLM retrieval embedding accuracy for vector search pipelines in production telemetry.',
      'Benchmarking semantic drift across prompt engineering release iterations in CI/CD pipeline benchmarks.'
    ],
    when: 'Use when comparing the orientation and semantic similarity of multi-dimensional vector embeddings regardless of magnitude.',
    cautions: [
      'Cosine similarity ignores vector magnitude; if magnitude matters, use Euclidean distance or dot product.',
      'Normalize vectors ahead of time for optimized high-throughput similarity calculation.'
    ],
    workbenchId: 'cos_sim',
  },
  {
    slug: 'wasserstein-distance-earth-movers',
    title: 'Wasserstein distance (Earth Mover\'s Distance) calculator',
    family: 'Vector distances & ML metrics',
    description: 'Calculate 1D Wasserstein distance (W1, Earth Mover\'s Distance - EMD) between empirical continuous distributions or telemetry histograms.',
    keywords: ['Wasserstein distance calculator', 'Earth Movers Distance', 'EMD calculator', 'distribution shift metric', 'W1 distance', 'optimal transport'],
    inputs: ['Distribution sample 1 vector', 'Distribution sample 2 vector', 'Order p (Standard p=1)'],
    example: { a: ['Sample 1 (Baseline Latency): [12, 14, 15, 16, 18]', 'Sample 2 (Canary Latency): [14, 16, 17, 19, 22]'], result: 'Wasserstein-1 Distance (EMD) = 2.400 ms (Work required to transform Sample 1 into Sample 2)' },
    formula: 'W_1(u, v) = ∫_{-∞}^{∞} |F_u(x) - F_v(x)| dx = (1/N) Σ |u_{(i)} - v_{(i)}|',
    code: {
      python: `from scipy.stats import wasserstein_distance\nu = [12, 14, 15, 16, 18]\nv = [14, 16, 17, 19, 22]\nw1 = wasserstein_distance(u, v)\nprint(f"Wasserstein distance: {w1:.4f}")`,
      r: `library(transport)\nwasserstein1d(u, v)`,
      ts: `import { wassersteinDistance } from '@statlab/core';\nconst w1 = wassersteinDistance(u, v);`,
    },
    useCases: [
      'Measuring true metric distribution shift between baseline and canary release traffic in production telemetry.',
      'Quantifying histogram drift in telemetry pipelines within automated load testing.'
    ],
    when: 'Use when measuring physical shift distance between continuous probability distributions without assuming specific parametric shapes.',
    cautions: [
      'Unlike KL divergence, Wasserstein distance is a true mathematical metric (symmetric, satisfies triangle inequality).',
      'Sensitive to scale of underlying units.'
    ],
    workbenchId: 'emd_wass',
  },
  {
    slug: 'mahalanobis-distance-calculator',
    title: 'Mahalanobis distance multivariate outlier calculator',
    family: 'Vector distances & ML metrics',
    description: 'Compute Mahalanobis distance D_M between multivariate observations and sample centroid, accounting for feature covariance and correlations.',
    keywords: ['Mahalanobis distance calculator', 'multivariate outlier detection', 'covariance distance', 'multivariate anomaly detection'],
    inputs: ['Multivariate observation vector X', 'Sample dataset matrix (for mean μ and covariance matrix Σ)'],
    example: { a: ['Point X: [CPU = 95%, Memory = 2.1GB, Latency = 450ms]', 'Dataset mean μ: [CPU = 45%, Memory = 1.8GB, Latency = 120ms]'], result: 'Mahalanobis Distance D_M = 4.82, Chi-Square p-value = .0008 (Multivariate anomaly detected)' },
    formula: 'D_M(X) = √((X - μ)^T Σ⁻¹ (X - μ))',
    code: {
      python: `import numpy as np\nfrom scipy.spatial.distance import mahalanobis\ncov_inv = np.linalg.inv(np.cov(matrix, rowvar=False))\nd_m = mahalanobis(x_point, mean_vec, cov_inv)\nprint(f"Mahalanobis distance: {d_m:.4f}")`,
      r: `mahalanobis(matrix, colMeans(matrix), cov(matrix))`,
      ts: `import { mahalanobisDistance } from '@statlab/core';\nconst dm = mahalanobisDistance(point, dataset);`,
    },
    useCases: [
      'Detecting multi-metric system anomalies (correlated CPU/RAM/Latency spikes) in production system telemetry.',
      'Identifying multi-dimensional performance outliers in CI/CD pipeline benchmarks benchmark runs.'
    ],
    when: 'Use when identifying multivariate outliers where individual metrics may look normal alone but represent extreme anomalies in combination.',
    cautions: [
      'Requires non-singular covariance matrix Σ (Number of samples N must exceed number of metrics p).',
      'Sensitive to extreme outliers in baseline covariance estimation; use robust minimum covariance determinant (MCD) if needed.'
    ],
    workbenchId: 'dist_mah',
  },
  {
    slug: 'vector-euclidean-manhattan-distance',
    title: 'Euclidean (L2) and Manhattan (L1) vector distance calculator',
    family: 'Vector distances & ML metrics',
    description: 'Calculate L1 Manhattan, L2 Euclidean, Chebyshev (L_∞), and Minkowski vector distances between numeric feature vectors.',
    keywords: ['Euclidean distance calculator', 'Manhattan distance calculator', 'L1 L2 distance', 'Chebyshev distance', 'Minkowski distance', 'vector metric'],
    inputs: ['Vector A numerical array', 'Vector B numerical array', 'Minkowski norm order p (Default p=2 for Euclidean)'],
    example: { a: ['Vector A: [10, 25, 40]', 'Vector B: [14, 20, 48]'], result: 'L1 Manhattan Distance = 17.00, L2 Euclidean Distance = 10.25, Chebyshev Distance = 8.00' },
    formula: 'L1 = Σ |A_i - B_i|; L2 = √(Σ (A_i - B_i)²); Minkowski = (Σ |A_i - B_i|^p)^(1/p)',
    code: {
      python: `from scipy.spatial.distance import euclidean, cityblock, chebyshev\na, b = [10, 25, 40], [14, 20, 48]\nprint(f"L2: {euclidean(a,b):.2f}, L1: {cityblock(a,b):.2f}, L_inf: {chebyshev(a,b):.2f}")`,
      r: `dist(rbind(a, b), method = "euclidean")\ndist(rbind(a, b), method = "manhattan")`,
      ts: `import { vectorDistance } from '@statlab/core';\nconst { l1, l2, chebyshev } = vectorDistance(vectorA, vectorB);`,
    },
    useCases: [
      'Calculating point-to-point metric vector differences in production system telemetry streams.',
      'Measuring feature vector proximity in KNN and clustering modules in CI/CD pipeline benchmarks.'
    ],
    when: 'Use when evaluating physical absolute differences between feature arrays across continuous coordinate spaces.',
    cautions: [
      'High-dimensional vector spaces (d > 100) experience distance concentration where L2 distance contrasts diminish; prefer cosine or Manhattan in high dimensions.',
      'Scale variables before computing distance.'
    ],
    workbenchId: 'dist_vec',
  },
  {
    slug: 'morans-i-spatial-autocorrelation',
    title: 'Moran\'s I spatial autocorrelation calculator',
    family: 'Time series & spatial statistics',
    description: 'Compute global Moran\'s I statistic, expected value, spatial variance, and z-score to test for spatial spatial clustering or dispersion.',
    keywords: ['Morans I calculator', 'spatial autocorrelation', 'spatial clustering test', 'spatial weights matrix', 'spatial z score'],
    inputs: ['Spatial region values vector Y', 'Spatial spatial weights matrix W', 'Normal vs Randomization assumption'],
    example: { a: ['5 Regions metric Y: [12, 14, 15, 28, 30]', 'Spatial adjacency matrix W (5x5)'], result: 'Moran’s I = +0.642, Expected E[I] = -0.250, z-score = 2.84 (p = .0045, Significant spatial clustering)' },
    formula: 'I = (N / S₀) * [ Σ Σ w_{ij}(Y_i - Ȳ)(Y_j - Ȳ) / Σ (Y_i - Ȳ)² ]',
    code: {
      python: `import esda\nfrom libpysal.weights import W\n# Calculate Moran(y, w) global spatial autocorrelation statistic`,
      r: `library(spdep)\nmoran.test(y, nb2listw(neighbors))`,
      ts: `import { moransI } from '@statlab/core';\nconst result = moransI(regionValues, weightMatrix);`,
    },
    useCases: [
      'Detecting geographic edge-node traffic clustering and regional latency degradation in production telemetry.',
      'Evaluating spatial distribution of test failures across multi-region cloud worker clusters in CI/CD pipeline benchmarks.'
    ],
    when: 'Use when verifying whether metric values measured across geographical nodes or server topology exhibit spatial dependence.',
    cautions: [
      'Requires specifying a row-standardized spatial weights matrix W.',
      'Confounded if global spatial trends are present; de-trend data if necessary.'
    ],
    workbenchId: 'spat_moran',
  },
  {
    slug: 'var-vector-autoregression',
    title: 'Vector Autoregression (VAR) model calculator',
    family: 'Time series & spatial statistics',
    description: 'Fit a Vector Autoregressive VAR(p) system for multivariate time series, compute Granger causality matrices, and calculate Impulse Response Functions (IRF).',
    keywords: ['VAR model calculator', 'vector autoregression', 'impulse response function', 'multivariate time series VAR', 'forecast error variance decomposition'],
    inputs: ['Multivariate time series matrix (K series)', 'Lag order p (AIC/BIC selected)', 'Steps forward forecast horizon'],
    example: { a: ['Series 1: CPU Utilization', 'Series 2: Request Rate', 'Lag p = 2'], result: 'VAR(2) fit: Request Rate -> CPU Utilization (Coeff = 0.42, p = .001). 1-SD Impulse Response peaks at step t+2.' },
    formula: 'Y_t = c + A_1 Y_{t-1} + ... + A_p Y_{t-p} + e_t',
    code: {
      python: `from statsmodels.tsa.api import VAR\nmodel = VAR(df_timeseries)\nresults = model.fit(maxlags=2, ic='aic')\nprint(results.summary())`,
      r: `library(vars)\nvar_fit <- VAR(ts_data, p = 2, type = "const")\nirf(var_fit)`,
      ts: `import { varModel } from '@statlab/core';\nconst model = varModel(multivariateSeries, { lags: 2 });`,
    },
    useCases: [
      'Modeling dynamic feedback loops between database IO, request queue length, and API latency in production telemetry.',
      'Simulating cascade performance effects of system load shocks in automated load testing.'
    ],
    when: 'Use when analyzing multiple interrelated time series variables that mutually influence each other over time.',
    cautions: [
      'All time series in the VAR system must be stationary I(0); difference non-stationary series first.',
      'Parameter count grows quadratically with number of variables K² * p.'
    ],
    workbenchId: 'ts_var',
  },
  {
    slug: 'value-at-risk-var',
    title: 'Value at Risk (VaR) & Expected Shortfall (CVaR) calculator',
    family: 'Risk & psychometrics',
    description: 'Calculate parametric, historical, and Monte Carlo Value at Risk (VaR) and Conditional VaR (Expected Shortfall / Tail VaR) at 95% and 99% confidence.',
    keywords: ['Value at Risk calculator', 'VaR calculator', 'Expected Shortfall CVaR', 'tail risk metric', 'historical VaR', 'parametric VaR'],
    inputs: ['Return / Latency loss vector', 'Confidence level (95% or 99%)', 'Method (Parametric Gaussian, Historical, Cornish-Fisher)'],
    example: { a: ['Daily latency loss returns vector (N=250 days)', 'Confidence Level = 99%'], result: 'Historical 99% VaR = 345ms, Parametric VaR = 328ms, Expected Shortfall (CVaR) = 412ms' },
    formula: 'Parametric VaR_α = μ + z_α * σ; CVaR_α = E[X | X >= VaR_α] = μ + σ * (φ(z_α) / (1 - α))',
    code: {
      python: `import numpy as np\ndef var_cvar(returns, alpha=0.95):\n    var = np.percentile(returns, (1 - alpha) * 100)\n    cvar = returns[returns <= var].mean()\n    return var, cvar\nprint(var_cvar(returns_data, 0.95))`,
      r: `library(PerformanceAnalytics)\nVaR(returns, p = 0.95, method = "historical")\nES(returns, p = 0.95, method = "historical")`,
      ts: `import { valueAtRisk } from '@statlab/core';\nconst { varValue, cvarValue } = valueAtRisk(returns, { confidence: 0.95 });`,
    },
    useCases: [
      'Quantifying maximum worst-case latency tail risk (p99+ SLA breaches) in production system telemetry.',
      'Assessing tail financial risk and downtime penalty exposures in CI/CD pipeline benchmarks SLA audits.'
    ],
    when: 'Use to quantify maximum expected downside loss or extreme latency spike threshold over a specified time horizon.',
    cautions: [
      'VaR is not coherent (does not satisfy sub-additivity); Expected Shortfall (CVaR) is a coherent risk measure that captures tail loss severity.',
      'Parametric VaR understates risk under heavy-tailed distributions.'
    ],
    workbenchId: 'risk_var',
  },
  {
    slug: 'cronbach-alpha-reliability',
    title: 'Cronbach\'s Alpha internal consistency calculator',
    family: 'Risk & psychometrics',
    description: 'Compute Cronbach\'s Alpha (α) and item-deleted alpha statistics to evaluate internal consistency and reliability of multi-item survey or eval scales.',
    keywords: ['Cronbach alpha calculator', 'internal consistency', 'questionnaire reliability', 'scale alpha', 'item deleted alpha', 'eval consistency'],
    inputs: ['Item scores matrix (N respondents x k items)'],
    example: { a: ['100 survey responses across 5 evaluation scale items (1-5 Likert scale)'], result: 'Cronbach’s Alpha α = 0.842 (Good internal consistency). Item 4 removal increases α to 0.865.' },
    formula: 'α = (k / (k - 1)) * [ 1 - (Σ s_i² / s_{total}²) ]',
    code: {
      python: `import pingouin as pg\nres = pg.cronbach_alpha(data=items_df)\nprint(f"Alpha: {res[0]:.4f}, 95% CI: {res[1]}")`,
      r: `library(psych)\nalpha(items_matrix)`,
      ts: `import { cronbachAlpha } from '@statlab/core';\nconst { alpha, itemDeleted } = cronbachAlpha(itemsMatrix);`,
    },
    useCases: [
      'Evaluating internal consistency of multi-prompt subjective user feedback scores in production telemetry.',
      'Assessing multi-rubric LLM judge evaluation scale reliability in CI/CD pipeline benchmarks.'
    ],
    when: 'Use when measuring how reliably a set of survey questions or multi-item rating rubrics measure a single underlying construct.',
    cautions: [
      'Cronbach’s alpha increases automatically with number of items k even if item quality is low.',
      'Assumes tau-equivalence (equal item loadings); use McDonald’s Omega if loadings vary widely.'
    ],
    workbenchId: 'psych_alpha',
  },
  {
    slug: 'rasch-item-response-theory',
    title: 'Rasch Model (1PL IRT) item difficulty & ability calculator',
    family: 'Risk & psychometrics',
    description: 'Estimate item difficulty parameters (β_j) and person ability parameters (θ_i) using 1-Parameter Logistic (1PL) Rasch Item Response Theory.',
    keywords: ['Rasch model calculator', 'IRT 1PL calculator', 'item response theory', 'item difficulty estimation', 'person ability theta', 'benchmark difficulty'],
    inputs: ['Dichotomous response matrix (1=Correct/Pass, 0=Incorrect/Fail)', 'Estimation method (Joint ML / Marginal ML)'],
    example: { a: ['50 test takers x 10 benchmark problem items response matrix'], result: 'Item 3 Difficulty β = +1.45 (Hard item), Item 7 Difficulty β = -1.20 (Easy item). Model Infit MSQ = 0.98.' },
    formula: 'P(Y_{ij} = 1 | θ_i, β_j) = e^{(θ_i - β_j)} / (1 + e^{(θ_i - β_j)})',
    code: {
      python: `import mirtcat # or use statsmodels / custom IRT estimator\n# Estimate 1PL Rasch difficulty parameters beta and ability parameters theta`,
      r: `library(eRm)\nrasch_fit <- RM(response_matrix)\nitempar(rasch_fit)`,
      ts: `import { raschModel } from '@statlab/core';\nconst { itemDifficulty, personAbility } = raschModel(responseMatrix);`,
    },
    useCases: [
      'Measuring individual test case difficulty levels in automated benchmark suites in CI/CD pipeline benchmarks.',
      'Evaluating prompt test item difficulty vs AI model capability in production telemetry.'
    ],
    when: 'Use when analyzing test item difficulty independently of the specific sample of test takers or benchmark models.',
    cautions: [
      'Requires unidimensionality (items must measure one construct).',
      'Requires fit checks (Infit/Outfit MSQ between 0.7 and 1.3).'
    ],
    workbenchId: 'irt_rasch',
  },
  {
    slug: 'point-biserial-correlation',
    title: 'Point-biserial correlation calculator',
    family: 'Risk & psychometrics',
    description: 'Compute Point-biserial correlation r_{pb} between a true dichotomous binary variable and a continuous variable, with t-test significance.',
    keywords: ['point biserial correlation', 'binary continuous correlation', 'item discrimination index', 'r_pb calculator'],
    inputs: ['Binary variable vector (0 or 1)', 'Continuous numeric variable vector X'],
    example: { a: ['Binary: Feature flag enabled (0=Off, 1=On)', 'Continuous: Session Duration (seconds)'], result: 'r_pb = +0.418, t = 4.12, df = 88, p < .001 (Significant positive relationship)' },
    formula: 'r_{pb} = ((M_1 - M_0) / s_n) * √(p * q), where p = N_1/N, q = N_0/N',
    code: {
      python: `from scipy.stats import pointbiserialr\nres = pointbiserialr(binary_vec, continuous_vec)\nprint(f"r_pb: {res.statistic:.4f}, p-value: {res.pvalue:.4f}")`,
      r: `cor.test(binary_vec, continuous_vec)`,
      ts: `import { pointBiserialCorr } from '@statlab/core';\nconst result = pointBiserialCorr(binaryVec, continuousVec);`,
    },
    useCases: [
      'Correlating feature flag state (0/1) against user session engagement duration in production telemetry.',
      'Evaluating test case pass/fail outcome correlation against system execution latency in CI/CD pipeline benchmarks.'
    ],
    when: 'Use when measuring relationship strength between one naturally binary variable (e.g. Pass/Fail, Enabled/Disabled) and one continuous metric.',
    cautions: [
      'Binary variable must be a true natural dichotomy, not an artificially discretized continuous metric.',
      'Mathematically equivalent to Pearson r applied to a binary variable.'
    ],
    workbenchId: 'corr_pbs',
  },
  {
    slug: 'matthews-correlation-coefficient',
    title: 'Matthews Correlation Coefficient (MCC) calculator',
    family: 'Vector distances & ML metrics',
    description: 'Calculate Matthews Correlation Coefficient (MCC) for binary classification, providing a balanced metric robust against class imbalance.',
    keywords: ['MCC calculator', 'Matthews correlation coefficient', 'binary classification metric', 'class imbalance metric', 'phi coefficient confusion matrix'],
    inputs: ['True Positives (TP)', 'False Positives (FP)', 'True Negatives (TN)', 'False Negatives (FN)'],
    example: { a: ['TP = 45, FP = 5', 'TN = 900, FN = 50 (Imbalanced 1:10 dataset)'], result: 'MCC = +0.638 (Strong prediction agreement despite extreme class imbalance)' },
    formula: 'MCC = (TP * TN - FP * FN) / √((TP+FP)(TP+FN)(TN+FP)(TN+FN))',
    code: {
      python: `from sklearn.metrics import matthews_corrcoef\nmcc = matthews_corrcoef(y_true, y_pred)\nprint(f"MCC: {mcc:.4f}")`,
      r: `library(mltools)\nmcc(preds = y_pred, actuals = y_true)`,
      ts: `import { matthewsCorrCoef } from '@statlab/core';\nconst mcc = matthewsCorrCoef({ tp: 45, fp: 5, tn: 900, fn: 50 });`,
    },
    useCases: [
      'Evaluating anomaly detection classifiers on heavily imbalanced telemetry data in production telemetry.',
      'Benchmarking security defect detection accuracy in CI/CD pipeline benchmarks release testing.'
    ],
    when: 'Use when evaluating binary classification model quality on datasets with severe class imbalance.',
    cautions: [
      'Returns a value between -1 and +1 (+1 = perfect prediction, 0 = random chance, -1 = inverse prediction).',
      'Undefined if any of the four confusion matrix sums is zero.'
    ],
    workbenchId: 'mcc_calc',
  },
  {
    slug: 'concordance-correlation-coefficient',
    title: 'Lin\'s Concordance Correlation Coefficient (CCC) calculator',
    family: 'Vector distances & ML metrics',
    description: 'Calculate Lin\'s Concordance Correlation Coefficient (ρ_c), precision (ρ), and accuracy bias (C_b) to evaluate agreement between two measurement methods.',
    keywords: ['concordance correlation coefficient', 'Lin CCC calculator', 'method agreement CCC', 'reproducibility metric', 'accuracy bias C_b'],
    inputs: ['Method / Observer 1 numeric vector X', 'Method / Observer 2 numeric vector Y', 'Confidence level (95%)'],
    example: { a: ['Observer 1: [12.1, 14.5, 18.2, 22.0, 25.1]', 'Observer 2: [12.4, 14.8, 18.0, 21.7, 24.8]'], result: 'Lin’s CCC ρ_c = 0.994 (95% CI: [.982, .998]), Precision ρ = 0.995, Accuracy Bias C_b = 0.999' },
    formula: 'ρ_c = (2 * s_{xy}) / (s_x² + s_y² + (X̄ - Ȳ)²)',
    code: {
      python: `import pingouin as pg\nres = pg.concordance(x, y)\nprint(f"Lin CCC: {res[0]:.4f}")`,
      r: `library(epiR)\nepi.ccc(x, y)`,
      ts: `import { linsCCC } from '@statlab/core';\nconst { ccc, precision, bias } = linsCCC(vecX, vecY);`,
    },
    useCases: [
      'Evaluating reproducibility between local development benchmarks and production telemetry in production telemetry.',
      'Verifying agreement between automated LLM judge scores and human expert raters in CI/CD pipeline benchmarks.'
    ],
    when: 'Use when testing whether two continuous measurement methods produce identical values (evaluating agreement relative to 45° line of equality).',
    cautions: [
      'Combines precision (correlation r) and accuracy bias (distance from 45° line); inspect both components.',
      'Superior to Pearson r for assessing true equivalence.'
    ],
    workbenchId: 'ccc_lin',
  },
  {
    slug: 'cusum-control-chart',
    title: 'CUSUM (Cumulative Sum) quality control chart calculator',
    family: 'Time series & spatial statistics',
    description: 'Calculate Tabular / Decision Interval CUSUM control limits (C⁺, C⁻) and Average Run Length (ARL) for detecting small process mean shifts.',
    keywords: ['CUSUM calculator', 'cumulative sum chart', 'small shift detection', 'decision interval CUSUM', 'ARL calculator', 'process shift SPC'],
    inputs: ['Sequential metric observations X', 'Target mean μ₀', 'Standard deviation σ', 'Reference value k (usually 0.5σ)', 'Decision limit h (usually 4σ or 5σ)'],
    example: { a: ['Observations X (Latency in ms)', 'Target μ₀ = 100ms, σ = 5ms', 'k = 0.5 (2.5ms), h = 4.0 (20ms)'], result: 'CUSUM Out of Control at observation #18 (Upper CUSUM C⁺ = 22.4ms > h limit = 20ms). Estimated shift magnitude = +0.85σ.' },
    formula: 'C_i^+ = max(0, X_i - (μ₀ + K) + C_{i-1}^+), C_i^- = max(0, (μ₀ - K) - X_i + C_{i-1}^-)',
    code: {
      python: `import statsmodels.api as sm\n# Compute upper C+ and lower C- decision interval cumulative sums`,
      r: `library(qcc)\nqcc(data, type = "cusum", target = 100, std.dev = 5)`,
      ts: `import { cusumChart } from '@statlab/core';\nconst cusum = cusumChart(observations, { target: 100, sd: 5, k: 0.5, h: 4.0 });`,
    },
    useCases: [
      'Detecting subtle, persistent memory leak micro-creeps in production system telemetry.',
      'Early detection of gradual performance degradation in CI/CD pipeline benchmarks build iterations.'
    ],
    when: 'Use when detecting small, persistent process mean shifts (0.5σ to 1.5σ) faster than standard Shewhart X-bar charts.',
    cautions: [
      'Requires accurate estimation of baseline target mean μ₀ and standard deviation σ.',
      'Fast Initial Response (FIR) feature can be added to detect initial out-of-control states rapidly.'
    ],
    workbenchId: 'spc_cusum',
  },
  {
    slug: 'bray-curtis-dissimilarity',
    title: 'Bray-Curtis dissimilarity & Jaccard index calculator',
    family: 'Vector distances & ML metrics',
    description: 'Calculate Bray-Curtis dissimilarity B_ij and Jaccard distance for non-negative abundance or categorical telemetry composition vectors.',
    keywords: ['Bray Curtis dissimilarity', 'Jaccard distance calculator', 'composition dissimilarity', 'abundance distance', 'ecological distance'],
    inputs: ['Vector sample 1 counts/abundance', 'Vector sample 2 counts/abundance'],
    example: { a: ['Sample 1: [12, 45, 0, 8, 23]', 'Sample 2: [15, 30, 5, 12, 18]'], result: 'Bray-Curtis Dissimilarity = 0.1736, Jaccard Distance = 0.2000' },
    formula: 'BC_{ij} = Σ |u_k - v_k| / Σ (u_k + v_k)',
    code: {
      python: `from scipy.spatial.distance import braycurtis, jaccard\nu, v = [12, 45, 0, 8, 23], [15, 30, 5, 12, 18]\nprint(f"Bray-Curtis: {braycurtis(u, v):.4f}")`,
      r: `library(vegan)\nvegdist(rbind(u, v), method = "bray")`,
      ts: `import { brayCurtisDissimilarity } from '@statlab/core';\nconst bc = brayCurtisDissimilarity(sample1, sample2);`,
    },
    useCases: [
      'Comparing microservice log event distribution similarity across deployment regions in production telemetry.',
      'Measuring payload composition drift in automated load testing.'
    ],
    when: 'Use when comparing non-negative count data or species abundance vectors where joint absence (0,0) should not imply similarity.',
    cautions: [
      'Bounded between 0 (identical) and 1 (completely disjoint).',
      'Not a strict metric distance (does not satisfy triangle inequality).'
    ],
    workbenchId: 'dist_bray',
  },
  {
    slug: 'minkowski-p-norm-distance',
    title: 'Minkowski p-norm distance calculator',
    family: 'Vector distances & ML metrics',
    description: 'Compute generalized Minkowski p-norm distance L_p between numeric vectors for arbitrary parameter p >= 1.',
    keywords: ['Minkowski distance calculator', 'p-norm distance', 'generalized distance metric', 'L_p norm'],
    inputs: ['Vector A numerical array', 'Vector B numerical array', 'Order parameter p (p >= 1)'],
    example: { a: ['Vector A: [3, 8, 12, 18]', 'Vector B: [5, 4, 15, 12]', 'p = 3'], result: 'Minkowski L_3 Distance = 5.241 (Manhattan L_1 = 15, Euclidean L_2 = 7.874)' },
    formula: 'D(A, B) = ( Σ |A_i - B_i|^p )^(1/p)',
    code: {
      python: `from scipy.spatial.distance import minkowski\na, b = [3, 8, 12, 18], [5, 4, 15, 12]\nprint(f"L3 distance: {minkowski(a, b, p=3):.4f}")`,
      r: `dist(rbind(a, b), method = "minkowski", p = 3)`,
      ts: `import { minkowskiDistance } from '@statlab/core';\nconst d = minkowskiDistance(vecA, vecB, { p: 3 });`,
    },
    useCases: [
      'Tuning feature distance norms for clustering and anomaly detection models in production telemetry.',
      'Evaluating vector spatial bounds in CI/CD pipeline benchmarks.'
    ],
    when: 'Use when exploring generalized distance norms between L_1 (Manhattan) and L_∞ (Chebyshev).',
    cautions: [
      'Requires p >= 1 to satisfy the triangle inequality.',
      'Higher p places progressively larger penalty emphasis on the single largest component coordinate difference.'
    ],
    workbenchId: 'dist_mink',
  },
  {
    slug: 'gev-generalized-extreme-value',
    title: 'Generalized Extreme Value (GEV) distribution calculator',
    family: 'Extreme value & tail risk',
    description: 'Fit Generalized Extreme Value (GEV) distribution parameters (Location μ, Scale σ, Shape ξ) for Gumbel (ξ=0), Fréchet (ξ>0), and Weibull (ξ<0) block maxima.',
    keywords: ['GEV distribution calculator', 'generalized extreme value', 'block maxima', 'Gumbel distribution', 'Frechet distribution', 'extreme tail risk'],
    inputs: ['Block maxima values vector (e.g. daily/hourly max latency)', 'Return period T (e.g. 100-run extreme event)'],
    example: { a: ['Monthly max latency spikes (N=36 months)', 'Return Period T = 100 periods'], result: 'GEV fit: μ = 142ms, σ = 38ms, ξ = +0.18 (Heavy-tailed Fréchet). 100-period return level = 485ms.' },
    formula: 'F(x) = exp( - [ 1 + ξ ((x - μ)/σ) ]^{-1/ξ} )',
    code: {
      python: `from scipy.stats import genextreme\nparams = genextreme.fit(block_maxima)\nreturn_level = genextreme.ppf(1 - 1/100, *params)\nprint(f"100-period Return Level: {return_level:.2f}")`,
      r: `library(extRemes)\nfit <- fevd(block_maxima, type = "GEV")\nreturn.level(fit, return.period = 100)`,
      ts: `import { gevDistribution } from '@statlab/core';\nconst gev = gevDistribution(blockMaxima, { returnPeriod: 100 });`,
    },
    useCases: [
      'Modeling extreme 99.99th percentile server latency spikes in production system telemetry.',
      'Predicting maximum outage magnitude over multi-year operational horizons in CI/CD pipeline benchmarks.'
    ],
    when: 'Use when modeling the probability distribution of extreme maximum values sampled over fixed time blocks.',
    cautions: [
      'Requires block maxima data extracted over equal-length time blocks.',
      'Shape parameter ξ strongly influences tail weight; Fréchet (ξ>0) has heavy power-law tails.'
    ],
    workbenchId: 'evt_gev',
  },
  {
    slug: 'pareto-distribution-calculator',
    title: 'Pareto distribution & 80/20 tail exponent calculator',
    family: 'Extreme value & tail risk',
    description: 'Calculate Pareto Type I scale parameter x_m, tail index shape exponent α, Gini coefficient, and probability quantiles for power-law distributed data.',
    keywords: ['Pareto distribution calculator', 'power law exponent', '80 20 rule calculator', 'tail index alpha', 'Gini coefficient Pareto'],
    inputs: ['Exceedance observation data X', 'Minimum scale threshold x_m'],
    example: { a: ['Request bandwidth usage exceeding x_m = 10MB', 'N = 500 requests'], result: 'Tail Exponent α = 1.62 (80/20 power law), Gini Coefficient = 0.68, Expected Value E[X] = 26.13MB' },
    formula: 'F(x) = 1 - (x_m / x)^α, MLE α̂ = N / Σ ln(x_i / x_m)',
    code: {
      python: `from scipy.stats import pareto\nimport numpy as np\nx_m = 10.0\nalpha_hat = len(data) / np.sum(np.log(data / x_m))\nprint(f"Pareto alpha: {alpha_hat:.4f}")`,
      r: `library(VGAM)\nfit <- vglm(data ~ 1, pareto1(xmin = 10))`,
      ts: `import { paretoDistribution } from '@statlab/core';\nconst { alpha, gini } = paretoDistribution(data, { xMin: 10 });`,
    },
    useCases: [
      'Modeling heavy-tailed API bandwidth consumption and user resource utilization in production telemetry.',
      'Establishing SLA rate-limiting thresholds based on power-law tail exponents in CI/CD pipeline benchmarks.'
    ],
    when: 'Use when data exhibits power-law heavy tails where a small percentage of events cause the vast majority of total impact.',
    cautions: [
      'Pareto mean is infinite if α <= 1, and variance is infinite if α <= 2.',
      'Carefully select lower cutoff threshold x_m.'
    ],
    workbenchId: 'evt_pareto',
  },
  {
    slug: 'survival-nelson-aalen',
    title: 'Nelson-Aalen cumulative hazard estimator calculator',
    family: 'Survival & event history',
    description: 'Compute non-parametric Nelson-Aalen cumulative hazard H(t) and Fleming-Harrington survival function S(t) for right-censored time-to-event data.',
    keywords: ['Nelson Aalen calculator', 'cumulative hazard estimator', 'survival analysis Nelson Aalen', 'censored event data', 'hazard function'],
    inputs: ['Time to event vector T', 'Event status indicator vector E (1=Event, 0=Censored)'],
    example: { a: ['Time T: [5, 12, 18, 24, 30, 30, 42]', 'Event Status E: [1, 1, 0, 1, 1, 0, 1]'], result: 'At t=24: Risk Set Y(t)=4, Events d(t)=1, Cumulative Hazard H(t)=0.533, Fleming-Harrington S(t)=0.587' },
    formula: 'Ĥ(t) = Σ_{t_i ≤ t} (d_i / Y_i), Ŝ_{FH}(t) = exp(-Ĥ(t))',
    code: {
      python: `from lifelines import NelsonAalenFitter\nnaf = NelsonAalenFitter()\nnaf.fit(durations, event_observed)\nprint(naf.cumulative_hazard_)`,
      r: `library(survival)\nfit <- survfit(Surv(durations, event_observed) ~ 1, type = "fh")`,
      ts: `import { nelsonAalen } from '@statlab/core';\nconst res = nelsonAalen(durations, eventStatus);`,
    },
    useCases: [
      'Estimating cumulative system failure risk over continuous runtime in production system telemetry.',
      'Modeling component degradation and time-to-failure hazards in CI/CD pipeline benchmarks reliability runs.'
    ],
    when: 'Use to estimate cumulative hazard rates for right-censored time-to-event data, particularly useful when baseline hazard rates change over time.',
    cautions: [
      'Nelson-Aalen Ĥ(t) is step-wise non-decreasing.',
      'Fleming-Harrington survival curve estimator Ŝ_{FH}(t) is slightly superior to Kaplan-Meier for small sample sizes.'
    ],
    workbenchId: 'surv_na',
  },
  {
    slug: 'hazard-ratio-logrank-ci',
    title: 'Log-rank Hazard Ratio (HR) & confidence interval calculator',
    family: 'Survival & event history',
    description: 'Calculate Mantel-Haenszel Log-rank Hazard Ratio (HR), log HR standard error, and 95% Wald confidence intervals comparing two survival groups.',
    keywords: ['hazard ratio calculator', 'log rank hazard ratio', 'Mantel Haenszel hazard ratio', 'survival curve comparison HR', 'relative risk survival'],
    inputs: ['Group A times & event status', 'Group B times & event status', 'Confidence level (95%)'],
    example: { a: ['Group A (Baseline): 50 subjects, 18 events', 'Group B (Optimized): 50 subjects, 8 events'], result: 'Hazard Ratio HR = 0.412 (95% CI: [.182, .933]), Log-rank p = .028 (58.8% risk reduction in Group B)' },
    formula: 'HR = (O_A / E_A) / (O_B / E_B), Var(ln HR) = 1/E_A + 1/E_B',
    code: {
      python: `from lifelines.statistics import logrank_test\nres = logrank_test(durations_a, durations_b, events_a, events_b)\nprint(f"Log-rank p: {res.p_value:.4f}")`,
      r: `library(survival)\nsurvdiff(Surv(time, status) ~ group)`,
      ts: `import { logrankHazardRatio } from '@statlab/core';\nconst { hr, ciLower, ciUpper } = logrankHazardRatio(groupA, groupB);`,
    },
    useCases: [
      'Quantifying relative reduction in incident hazards between baseline and canary server deployments in production telemetry.',
      'Evaluating comparative time-to-failure hazard ratios in automated load testing.'
    ],
    when: 'Use when comparing relative event risks between two independent groups over time under proportional hazards assumptions.',
    cautions: [
      'Assumes proportional hazards (HR remains constant over time).',
      'Inspect crossing survival curves; if curves cross, proportional hazards assumption is violated.'
    ],
    workbenchId: 'surv_hr',
  },
  {
    slug: 'cochran-q-test',
    title: 'Cochran\'s Q test for related binary proportions calculator',
    family: 'Categorical & ordinal non-parametric',
    description: 'Perform Cochran\'s Q test to assess differences in binary outcomes (Pass/Fail, Yes/No) across 3 or more matched treatment groups or raters.',
    keywords: ['Cochran Q test calculator', 'related binary proportions', 'matched binary test', 'repeated measures binary', 'multi rater pass fail'],
    inputs: ['Binary response matrix (N subjects x k matched treatments/evaluators)'],
    example: { a: ['20 code modules tested across k=3 static analysis tools (1=Pass, 0=Fail)'], result: 'Cochran’s Q = 8.64, df = 2, p = .0133 (Significant difference in tool pass rates)' },
    formula: 'Q = (k - 1) * [ k Σ T_j² - (Σ T_j)² ] / [ k Σ R_i - Σ R_i² ]',
    code: {
      python: `from statsmodels.stats.contingency_tables import mcnemar\n# Compute Cochran's Q test statistic for N x k binary matrix`,
      r: `library(RVAideMemoire)\ncochran.qtest(binary_matrix)`,
      ts: `import { cochranQTest } from '@statlab/core';\nconst result = cochranQTest(binaryMatrix);`,
    },
    useCases: [
      'Comparing multi-judge LLM pass/fail consensus across 3+ prompt models in production telemetry.',
      'Testing multi-tool security scanner detection agreement across benchmark suites in CI/CD pipeline benchmarks.'
    ],
    when: 'Use when assessing whether 3 or more matched or repeated binary measurements differ significantly.',
    cautions: [
      'Extension of McNemar test to k > 2 groups.',
      'Follow up significant Q test with pairwise McNemar post-hoc tests with Bonferroni correction.'
    ],
    workbenchId: 'cat_cochran_q',
  },
  {
    slug: 'cochran-armitage-trend',
    title: 'Cochran-Armitage test for trend in proportions calculator',
    family: 'Categorical & ordinal non-parametric',
    description: 'Calculate Cochran-Armitage test statistic T and p-value to evaluate linear monotonic trend in binary proportion outcomes across ordered dose/time levels.',
    keywords: ['Cochran Armitage trend test', 'trend in proportions', 'dose response trend', 'ordinal binary trend', 'linear trend test'],
    inputs: ['Ordered category levels vector X_i', 'Success counts array r_i', 'Total trial counts array n_i'],
    example: { a: ['Load Levels: 1 (Light), 2 (Medium), 3 (Heavy)', 'Error Counts: [2/100, 8/100, 22/100]'], result: 'Cochran-Armitage Z = +4.38, p < .0001 (Strong linear increasing trend in error proportions)' },
    formula: 'T = Σ w_i (p_i - p̄), Z = T / SE(T)',
    code: {
      python: `from statsmodels.stats.contingency_tables import Table2xC\n# Perform trend test on ordered 2xC contingency table`,
      r: `library(DescTools)\nCochranArmitageTest(contingency_table)`,
      ts: `import { cochranArmitageTrend } from '@statlab/core';\nconst result = cochranArmitageTrend(levels, successes, totals);`,
    },
    useCases: [
      'Evaluating error rate trend shifts across increasing server concurrency tiers in production telemetry.',
      'Testing linear defect rate trends across build version increments in CI/CD pipeline benchmarks.'
    ],
    when: 'Use when testing whether binary event proportions follow a monotonic trend across ordered categories.',
    cautions: [
      'Category levels must have a natural ordering.',
      'Evaluates linear trend on proportion scale; non-linear U-shaped trends may yield false non-significant results.'
    ],
    workbenchId: 'cat_catrend',
  },
  {
    slug: 'jonckheere-terpstra-test',
    title: 'Jonckheere-Terpstra test for ordered medians calculator',
    family: 'Categorical & ordinal non-parametric',
    description: 'Compute Jonckheere-Terpstra non-parametric test statistic J and z-score for testing monotonic ordered alternatives across k independent groups.',
    keywords: ['Jonckheere Terpstra test', 'ordered medians test', 'non parametric trend test', 'Kruskal Wallis ordered alternative', 'JT test'],
    inputs: ['Group sample vectors ordered by hypothesis (Group 1 <= Group 2 <= ... <= Group k)'],
    example: { a: ['Low Memory: [12, 14, 15]', 'Med Memory: [15, 18, 20]', 'High Memory: [21, 25, 28]'], result: 'JT Statistic J = 27.0, Expected E[J] = 13.5, z = +3.12, p = .0009 (Significant ordered increase)' },
    formula: 'J = Σ_{i < j} MannWhitneyU(Group_i, Group_j)',
    code: {
      python: `from scipy.stats import jonckheere # or custom JT implementation\n# Compute sum of pairwise Mann-Whitney U statistics for ordered groups`,
      r: `library(clinfun)\njonckheere.test(y, g)`,
      ts: `import { jonckheereTerpstra } from '@statlab/core';\nconst result = jonckheereTerpstra(orderedGroups);`,
    },
    useCases: [
      'Testing ordered latency increase across progressive database size scaling tiers in production telemetry.',
      'Evaluating ordered response time degradation across complexity tiers in CI/CD pipeline benchmarks.'
    ],
    when: 'Use when testing an a-priori ordered hypothesis (μ₁ ≤ μ₂ ≤ ... ≤ μ_k) across k independent groups.',
    cautions: [
      'More powerful than Kruskal-Wallis when an a-priori ordering of groups is hypothesized.',
      'Groups must be specified in the correct expected order.'
    ],
    workbenchId: 'nonpar_jt',
  },
  {
    slug: 'kendall-w-concordance',
    title: 'Kendall\'s W coefficient of concordance calculator',
    family: 'Categorical & ordinal non-parametric',
    description: 'Calculate Kendall\'s W coefficient of concordance, chi-square statistic, and p-value to evaluate overall agreement among m judges ranking n items.',
    keywords: ['Kendalls W calculator', 'coefficient of concordance', 'inter rater agreement ranks', 'multi judge rank agreement'],
    inputs: ['Ranking matrix (m judges x n items)'],
    example: { a: ['4 judges ranking 5 candidate algorithms (ranks 1 to 5)'], result: 'Kendall’s W = 0.825, Chi-Square = 13.20, df = 4, p = .0103 (Strong inter-judge ranking agreement)' },
    formula: 'W = 12 S / [ m² (n³ - n) ], S = Σ (R_j - R̄)²',
    code: {
      python: `import pingouin as pg\nres = pg.kendall_w(data=ranks_df)\nprint(f"Kendall W: {res['W'].values[0]:.4f}")`,
      r: `library(irr)\nkendall(ranks_matrix)`,
      ts: `import { kendallsW } from '@statlab/core';\nconst { w, chi2, pValue } = kendallsW(rankingMatrix);`,
    },
    useCases: [
      'Evaluating multi-judge LLM ranking consensus across prompt generation outputs in production telemetry.',
      'Assessing multi-rater performance benchmark ranking agreement in CI/CD pipeline benchmarks.'
    ],
    when: 'Use when measuring overall agreement among 3 or more judges ranking a set of items.',
    cautions: [
      'W ranges from 0 (no agreement) to 1 (complete agreement).',
      'Does not reflect accuracy against true ground truth, only inter-rater agreement.'
    ],
    workbenchId: 'nonpar_kw',
  },
  {
    slug: 'goodman-kruskal-gamma',
    title: 'Goodman and Kruskal\'s Gamma (γ) calculator',
    family: 'Categorical & ordinal non-parametric',
    description: 'Compute Goodman and Kruskal\'s Gamma (γ) rank correlation and asymptotic standard error for ordinal cross-tabulated variables.',
    keywords: ['Goodman Kruskal Gamma calculator', 'gamma rank correlation', 'concordant discordant pairs', 'ordinal cross tab correlation'],
    inputs: ['Ordinal cross-tabulation frequency matrix (r x c)'],
    example: { a: ['3x3 Cross-tabulation table of User Satisfaction vs Feature Usage'], result: 'Concordant Pairs C = 1,420, Discordant Pairs D = 380, Gamma γ = +0.578 (p < .001)' },
    formula: 'γ = (P - Q) / (P + Q)',
    code: {
      python: `from statsmodels.stats.contingency_tables import Table\n# Compute concordant P and discordant Q pair counts from contingency table`,
      r: `library(DescTools)\nGoodmanKruskalGamma(table)`,
      ts: `import { goodmanKruskalGamma } from '@statlab/core';\nconst { gamma, pValue } = goodmanKruskalGamma(contingencyTable);`,
    },
    useCases: [
      'Measuring association between ordinal user engagement tiers and retention levels in production telemetry.',
      'Evaluating relationship between severity ratings and response latency in CI/CD pipeline benchmarks.'
    ],
    when: 'Use when measuring association between two ordinal variables containing many tied ranks.',
    cautions: [
      'Ignores tied pairs (ties on X or Y); can overestimate association relative to Kendall’s Tau-b.',
      'Symmetric metric: γ(X, Y) = γ(Y, X).'
    ],
    workbenchId: 'ordinal_gamma',
  },
  {
    slug: 'somers-d-calculator',
    title: 'Somers\' D directional rank association calculator',
    family: 'Categorical & ordinal non-parametric',
    description: 'Calculate asymmetric Somers\' D(Y|X) and D(X|Y) directional rank association parameters for ordinal contingency tables and ROC AUC equivalence.',
    keywords: ['Somers D calculator', 'directional rank association', 'Somers D ROC AUC', 'ordinal association Somers D'],
    inputs: ['Ordinal predictor X array / matrix', 'Ordinal outcome Y array / matrix', 'Direction (Y|X or X|Y)'],
    example: { a: ['Predictor X (System Stress Level: 1-4)', 'Outcome Y (Failure Severity: 1-4)'], result: 'Somers’ D(Y|X) = +0.524 (95% CI: [.412, .636]). Equivalent ROC AUC = 0.762.' },
    formula: 'D(Y|X) = (P - Q) / (P + Q + T_Y)',
    code: {
      python: `from scipy.stats import somersd\nres = somersd(x, y)\nprint(f"Somers D(Y|X): {res.statistic:.4f}")`,
      r: `library(DescTools)\nSomersDelta(table, direction = "row")`,
      ts: `import { somersD } from '@statlab/core';\nconst { d, rocEquivalent } = somersD(x, y, { direction: 'Y|X' });`,
    },
    useCases: [
      'Evaluating directional predictive power of ordinal risk scores on system outage outcomes in production telemetry.',
      'Measuring ordinal predictor performance in CI/CD pipeline benchmarks SLA audits.'
    ],
    when: 'Use when evaluating asymmetric ordinal association where X is designated as the predictor and Y as the outcome.',
    cautions: [
      'Asymmetric: Somers’ D(Y|X) != Somers’ D(X|Y).',
      'Directly related to ROC AUC: AUC = (Somers’ D + 1) / 2.'
    ],
    workbenchId: 'ordinal_somers',
  },
  {
    slug: 'hoeffding-d-dependence',
    title: 'Hoeffding\'s D non-parametric independence test calculator',
    family: 'Categorical & ordinal non-parametric',
    description: 'Compute Hoeffding\'s D measure of dependence to detect non-linear and non-monotonic relationships between continuous variables.',
    keywords: ['Hoeffding D calculator', 'non parametric independence test', 'non linear dependence', 'Hoeffdings D measure'],
    inputs: ['Continuous variable X vector', 'Continuous variable Y vector'],
    example: { a: ['Variable X (CPU Frequency)', 'Variable Y (Power Consumption - U-shaped non-linear relation)'], result: 'Pearson r = 0.04 (No linear relation), Hoeffding’s D = +0.285 (p < .001, Strong non-linear dependence)' },
    formula: 'D = 30 [ (N-2)(N-3) Q - 2(N-2) R + S ] / [ N(N-1)(N-2)(N-3)(N-4) ]',
    code: {
      python: `import statsmodels.api as sm # or custom Hoeffding D estimator\n# Compute rank-based joint bivariate distribution distance statistic`,
      r: `library(Hmisc)\nhoeffd(x, y)`,
      ts: `import { hoeffdingsD } from '@statlab/core';\nconst { d, pValue } = hoeffdingsD(vecX, vecY);`,
    },
    useCases: [
      'Detecting complex non-linear metric dependencies (e.g. non-monotonic U-shaped relationships) in production system telemetry.',
      'Identifying hidden metric couplings in automated load testing.'
    ],
    when: 'Use when testing for independence between two continuous variables without restricting to linear or monotonic patterns.',
    cautions: [
      'Ranges from -0.5 to +1.0 (values near +1 indicate strong dependence).',
      'Requires sample size N >= 30 for reliable p-value approximation.'
    ],
    workbenchId: 'nonpar_hoeff',
  },
  {
    slug: 'mutual-information-score',
    title: 'Mutual Information (MI) feature selection calculator',
    family: 'Information theory & ML',
    description: 'Calculate Mutual Information I(X; Y), Normalized Mutual Information (NMI), and Adjusted Mutual Information (AMI) for feature selection.',
    keywords: ['mutual information calculator', 'MI score', 'normalized mutual information NMI', 'adjusted mutual information AMI', 'feature selection MI'],
    inputs: ['Feature array X', 'Target array Y', 'Continuous vs Discrete mode', 'K-nearest neighbors k (for continuous)'],
    example: { a: ['Continuous Feature X (Network Packet Latency)', 'Target Y (Transaction Timeout Class)'], result: 'Mutual Information I(X; Y) = 0.428 nats, Normalized MI (NMI) = 0.612' },
    formula: 'I(X; Y) = Σ Σ P(x, y) * log( P(x, y) / (P(x) P(y)) )',
    code: {
      python: `from sklearn.feature_selection import mutual_info_classif\nmi = mutual_info_classif(X, y)\nprint(f"MI scores: {mi}")`,
      r: `library(infotheo)\nmutinformation(x, y)`,
      ts: `import { mutualInformation } from '@statlab/core';\nconst mi = mutualInformation(vecX, vecY);`,
    },
    useCases: [
      'Ranking non-linear telemetry feature relevance for automated anomaly root-cause detection in production telemetry.',
      'Selecting top predictive benchmark features in CI/CD pipeline benchmarks.'
    ],
    when: 'Use for feature selection to measure total shared information between predictors and target variables.',
    cautions: [
      'Captures both linear and non-linear relationships.',
      'Continuous MI estimates depend on nearest-neighbor parameter k.'
    ],
    workbenchId: 'mi_score',
  },
  {
    slug: 'huber-loss-robust-regression',
    title: 'Huber loss & Pseudo-Huber robust regression calculator',
    family: 'Information theory & ML',
    description: 'Compute Huber loss, Pseudo-Huber loss, and M-estimator robust regression weights for threshold hyperparameter δ.',
    keywords: ['Huber loss calculator', 'robust regression', 'M estimator regression', 'Pseudo Huber loss', 'outlier resistant loss'],
    inputs: ['Residuals vector e = Y - Ŷ', 'Huber threshold delta δ (Default δ = 1.345σ)'],
    example: { a: ['Residuals: [-0.2, 0.4, -0.1, 15.2 (Outlier), 0.3]', 'Threshold δ = 1.345'], result: 'Standard MSE Loss = 46.22 (Distorted by outlier), Huber Loss = 4.18 (Robust to outlier)' },
    formula: 'L_δ(e) = (1/2) e² if |e| <= δ else δ(|e| - (1/2) δ)',
    code: {
      python: `from sklearn.linear_model import HuberRegressor\nhuber = HuberRegressor(epsilon=1.35).fit(X, y)\nprint(f"Coefficients: {huber.coef_}")`,
      r: `library(MASS)\nfit <- rlm(y ~ x, psi = psi.huber)`,
      ts: `import { huberLoss } from '@statlab/core';\nconst loss = huberLoss(residuals, { delta: 1.345 });`,
    },
    useCases: [
      'Fitting robust telemetry trend lines unaffected by intermittent extreme latency spikes in production telemetry.',
      'Constructing outlier-resistant performance trend models in CI/CD pipeline benchmarks.'
    ],
    when: 'Use when fitting regression models on datasets containing extreme measurement noise or heavy-tailed outliers.',
    cautions: [
      'Behaves quadratically L2 for small errors (|e| <= δ) and linearly L1 for large errors (|e| > δ).',
      'Select delta δ based on target efficiency (e.g. 95% asymptotic efficiency for normal distribution).'
    ],
    workbenchId: 'reg_huber',
  },
  {
    slug: 'quantal-response-probit',
    title: 'Quantal response Probit regression & ED50 calculator',
    family: 'Information theory & ML',
    description: 'Fit binary Probit regression model using standard normal CDF link Φ(z) and compute median effective dose (ED50 / LD50) points.',
    keywords: ['probit regression calculator', 'ED50 calculator', 'LD50 calculator', 'quantal response', 'normal CDF link', 'dose response probit'],
    inputs: ['Dose / Exposure level vector X', 'Binary outcome vector Y (1=Response, 0=No Response)'],
    example: { a: ['Load Level X: [10, 20, 30, 40, 50]', 'Failure Responses Y: [0/50, 5/50, 22/50, 41/50, 49/50]'], result: 'Probit Intercept α = -3.12, Slope β = +0.104. ED50 = 30.0 units, ED95 = 45.8 units.' },
    formula: 'P(Y = 1 | X) = Φ(α + β X), ED50 = - α / β',
    code: {
      python: `import statsmodels.api as sm\nprobit_mod = sm.Probit(y, sm.add_constant(x)).fit()\nprint(probit_mod.summary())`,
      r: `glm(y ~ x, family = binomial(link = "probit"))`,
      ts: `import { probitRegression } from '@statlab/core';\nconst { ed50, alpha, beta } = probitRegression(doseVec, responseVec);`,
    },
    useCases: [
      'Estimating median failure load thresholds (ED50) during stress testing in production telemetry.',
      'Calculating 50% probability failure points in system qualification testing runs.'
    ],
    when: 'Use when modeling binary response probabilities as a function of underlying continuous exposure or stress levels using an inverse normal link.',
    cautions: [
      'Very similar results to Logistic regression near the center, but differs in the tails.',
      'Requires sufficient spread of dose levels to estimate ED50 accurately.'
    ],
    workbenchId: 'reg_probit',
  },
  {
    slug: 'tobit-censored-regression',
    title: 'Tobit regression model for censored data calculator',
    family: 'Information theory & ML',
    description: 'Fit Tobit linear regression model for left- or right-censored continuous response variables (e.g. latency floor/ceiling cutoffs).',
    keywords: ['Tobit regression calculator', 'censored regression', 'left censored model', 'corner solution model', 'Tobit model'],
    inputs: ['Predictor matrix X', 'Response Y', 'Censoring bound L (Left) or U (Right)'],
    example: { a: ['Predictor X: Load Threads', 'Response Y: Execution Time (Left-censored at L = 1.0ms timer resolution)'], result: 'Uncensored Latency Slope β = +0.48ms/thread, Residual σ = 0.85ms (Log-likelihood = -142.1)' },
    formula: 'Y_i* = X_i β + ε_i, Y_i = max(L, Y_i*)',
    code: {
      python: `from statsmodels.sandbox.regression.gmm import Tobit # or custom Tobit MLE\n# Estimate Tobit parameters beta and sigma via Maximum Likelihood`,
      r: `library(AER)\ntobit(y ~ x, left = 1.0)`,
      ts: `import { tobitRegression } from '@statlab/core';\nconst model = tobitRegression(X, y, { leftBound: 1.0 });`,
    },
    useCases: [
      'Modeling telemetry latency metrics bounded by minimum timer resolution limits in production telemetry.',
      'Analyzing censored cost or duration metrics in CI/CD pipeline benchmarks benchmarks.'
    ],
    when: 'Use when fitting linear models on continuous variables that are censored at a known lower or upper threshold limit.',
    cautions: [
      'Standard OLS produces biased and inconsistent parameter estimates on censored data.',
      'Assumes underlying unobserved variable Y* is normally distributed.'
    ],
    workbenchId: 'reg_tobit',
  },
  {
    slug: 'grubbs-outlier-test',
    title: 'Grubbs\' test for univariate outliers calculator',
    family: 'Outlier detection & system reliability',
    description: 'Perform Grubbs\' test (Extreme Studentized Deviate) to detect a single outlier in a univariate normally distributed dataset.',
    keywords: ['Grubbs test calculator', 'univariate outlier test', 'extreme studentized deviate', 'outlier detection Grubbs', 'single outlier test'],
    inputs: ['Univariate numeric sample X', 'Alpha significance level (0.05)', 'Test side (Two-sided, Minimum, Maximum)'],
    example: { a: ['Sample: 12.1, 12.4, 12.5, 12.2, 12.3, 45.8 (Spike)'], result: 'Grubbs G statistic = 2.45, Critical G_crit = 1.88, p < .001 (Observation 45.8 confirmed as outlier)' },
    formula: 'G = max |X_i - X̄| / s',
    code: {
      python: `import numpy as np\nfrom scipy.stats import t\ndef grubbs_test(x, alpha=0.05):\n    n = len(x)\n    g = np.max(np.abs(x - np.mean(x))) / np.std(x, ddof=1)\n    return g\nprint(grubbs_test([12.1, 12.4, 12.5, 12.2, 12.3, 45.8]))`,
      r: `library(outliers)\ngrubbs.test(sample)`,
      ts: `import { grubbsTest } from '@statlab/core';\nconst { gStat, isOutlier } = grubbsTest(sample, { alpha: 0.05 });`,
    },
    useCases: [
      'Detecting single extreme anomaly spikes in microservice latency samples in production telemetry.',
      'Cleaning outlier noise prior to benchmark baseline calculation in CI/CD pipeline benchmarks.'
    ],
    when: 'Use when testing whether the single most extreme value in a dataset is a statistically significant outlier.',
    cautions: [
      'Assumes underlying dataset is approximately normally distributed.',
      'Only tests one outlier at a time; iterate or use Rosner ESD test for multiple outliers.'
    ],
    workbenchId: 'out_grubbs',
  },
  {
    slug: 'dixon-q-test',
    title: 'Dixon\'s Q test for small sample outliers calculator',
    family: 'Outlier detection & system reliability',
    description: 'Calculate Dixon\'s Q statistic to test for outliers in small sample datasets (N = 3 to 30).',
    keywords: ['Dixon Q test calculator', 'small sample outlier test', 'Q test calculator', 'outlier detection small N'],
    inputs: ['Sorted sample data vector X (N = 3 to 30)', 'Alpha significance level (0.05)'],
    example: { a: ['Small Sample (N=6): [0.121, 0.124, 0.125, 0.122, 0.123, 0.198]'], result: 'Dixon Q = 0.974, Critical Q_crit = 0.625 (p < .05, Suspect point 0.198 confirmed as outlier)' },
    formula: 'Q = |X_{suspect} - X_{closest}| / (X_{max} - X_{min})',
    code: {
      python: `def dixon_q_test(x):\n    x_sorted = sorted(x)\n    q = (x_sorted[-1] - x_sorted[-2]) / (x_sorted[-1] - x_sorted[0])\n    return q\nprint(dixon_q_test([0.121, 0.124, 0.125, 0.122, 0.123, 0.198]))`,
      r: `library(outliers)\ndixon.test(sample)`,
      ts: `import { dixonQTest } from '@statlab/core';\nconst { qStat, isOutlier } = dixonQTest(sample);`,
    },
    useCases: [
      'Identifying outlier trials in small-sample microbenchmarks (N < 10) in CI/CD pipeline benchmarks.',
      'Cleaning small pilot telemetry runs in production telemetry.'
    ],
    when: 'Use when evaluating potential outliers in very small sample sizes (N = 3 to 30) where standard deviation estimation is noisy.',
    cautions: [
      'Apply only once per dataset to prevent masking effects.',
      'Requires sorted inputs.'
    ],
    workbenchId: 'out_dixon',
  },
  {
    slug: 'reliability-block-diagram',
    title: 'Reliability Block Diagram (RBD) system reliability calculator',
    family: 'Outlier detection & system reliability',
    description: 'Compute overall system reliability R_sys(t), failure rate, and Availability for series, parallel, and k-out-of-n standby system architectures.',
    keywords: ['RBD calculator', 'reliability block diagram', 'system reliability calculator', 'series parallel reliability', 'k out of n reliability'],
    inputs: ['Component reliability vector R_i(t)', 'Architecture configuration (Series, Parallel, k-out-of-n voting)'],
    example: { a: ['3 Parallel redundant microservice instances: R_1 = 0.95, R_2 = 0.95, R_3 = 0.95'], result: 'Overall Parallel System Reliability R_sys = 0.999875 (Four Nines availability)' },
    formula: 'Series: R_{sys} = ∏ R_i; Parallel: R_{sys} = 1 - ∏ (1 - R_i); k-out-of-n: R_{sys} = Σ_{j=k}^n (n choose j) R^j (1-R)^{n-j}',
    code: {
      python: `import numpy as np\ndef parallel_reliability(r_vec):\n    return 1 - np.prod(1 - np.array(r_vec))\nprint(f"Parallel System R: {parallel_reliability([0.95, 0.95, 0.95]):.6f}")`,
      r: `library(Reliability)\n# Compute series and parallel block diagram system reliability`,
      ts: `import { rbdReliability } from '@statlab/core';\nconst rSys = rbdReliability([0.95, 0.95, 0.95], { mode: 'parallel' });`,
    },
    useCases: [
      'Calculating end-to-end system availability for complex multi-tier microservice architectures in production telemetry.',
      'Verifying redundant system design reliability targets in system qualification testing.'
    ],
    when: 'Use when modeling system-level reliability as a logical combination of individual component or service reliabilities.',
    cautions: [
      'Assumes component failures are statistically independent unless common-cause failure factors are included.',
      'Series components represent single points of failure.'
    ],
    workbenchId: 'rel_rbd',
  },
  {
    slug: 'half-life-decay-rate',
    title: 'Half-life, decay constant & mean lifetime calculator',
    family: 'Growth, decay & kinetic models',
    description: 'Compute exponential decay constant λ, half-life t_{1/2}, mean lifetime τ, and remaining quantity N(t) for exponential decay processes.',
    keywords: ['half life calculator', 'decay rate constant', 'mean lifetime tau', 'exponential decay formula', 'cache invalidation decay'],
    inputs: ['Initial quantity N0', 'Decay constant λ OR Half-life t_1/2', 'Elapsed time t'],
    example: { a: ['Initial N0 = 10,000 cached records', 'Half-life t_1/2 = 24.0 hours', 'Elapsed t = 72.0 hours'], result: 'Decay Constant λ = 0.02888/hr, Remaining N(t) = 1,250 records (87.5% decay)' },
    formula: 'N(t) = N_0 * e^{-λ t}, t_{1/2} = ln(2) / λ, τ = 1 / λ',
    code: {
      python: `import numpy as np\ndef half_life(n0, t_half, t):\n    lmbda = np.log(2) / t_half\n    return n0 * np.exp(-lmbda * t)\nprint(half_life(10000, 24, 72))`,
      r: `lmbda <- log(2) / 24\nnt <- 10000 * exp(-lmbda * 72)`,
      ts: `import { exponentialDecay } from '@statlab/core';\nconst n_t = exponentialDecay(10000, { halfLife: 24, time: 72 });`,
    },
    useCases: [
      'Modeling telemetry cache retention and session token decay in production telemetry.',
      'Calculating artificial load dissipation rates in automated load testing.'
    ],
    when: 'Use when quantity decays proportionally to its current value over time.',
    cautions: [
      'Assumes a constant decay rate parameter λ over time.',
      'Requires non-negative initial quantity N0 > 0.'
    ],
    workbenchId: 'kin_decay',
  },
  {
    slug: 'arrhenius-equation-activation',
    title: 'Arrhenius equation & activation energy calculator',
    family: 'Growth, decay & kinetic models',
    description: 'Calculate Arrhenius activation energy E_a, pre-exponential frequency factor A, and reaction rate k(T) across temperatures.',
    keywords: ['Arrhenius equation calculator', 'activation energy Ea', 'reaction rate temperature', 'pre exponential factor A', 'thermal acceleration factor'],
    inputs: ['Rate k1 at Temp T1 (Kelvin)', 'Rate k2 at Temp T2 (Kelvin)', 'Target Temp T3 (optional)'],
    example: { a: ['Rate k1 = 0.05 at 300 K (27°C)', 'Rate k2 = 0.42 at 330 K (57°C)'], result: 'Activation Energy E_a = 58.42 kJ/mol, Pre-exponential A = 7.74e7, Q10 Factor = 2.03' },
    formula: 'k = A * exp(-E_a / (R * T)), E_a = R * [ T_1 T_2 / (T_2 - T_1) ] * ln(k_2 / k_1)',
    code: {
      python: `import numpy as np\nR = 8.314\ndef arrhenius_ea(k1, T1, k2, T2):\n    return R * (T1 * T2 / (T2 - T1)) * np.log(k2 / k1)\nprint(f"Ea: {arrhenius_ea(0.05, 300, 0.42, 330)/1000:.2f} kJ/mol")`,
      r: `ea <- 8.314 * (300 * 330 / 30) * log(0.42 / 0.05)`,
      ts: `import { arrheniusEa } from '@statlab/core';\nconst ea = arrheniusEa(0.05, 300, 0.42, 330);`,
    },
    useCases: [
      'Modeling temperature-dependent hardware degradation and thermal throttling acceleration in production telemetry.',
      'Estimating accelerated life testing (ALT) factors in system qualification testing.'
    ],
    when: 'Use when modeling process or failure rate changes driven by thermal energy shifts.',
    cautions: [
      'Temperatures must be specified in absolute Kelvin (K = °C + 273.15).',
      'Assumes activation energy E_a remains constant over the evaluated temperature range.'
    ],
    workbenchId: 'kin_arrhenius',
  },
  {
    slug: 'logistic-growth-carrying-capacity',
    title: 'Logistic growth & carrying capacity calculator',
    family: 'Growth, decay & kinetic models',
    description: 'Compute logistic S-curve growth P(t), intrinsic growth rate r, carrying capacity K, and inflection point time t_0.',
    keywords: ['logistic growth calculator', 'carrying capacity K', 'S curve growth', 'intrinsic growth rate', 'inflection point logistic'],
    inputs: ['Initial population/load P0', 'Carrying capacity K', 'Intrinsic growth rate r', 'Elapsed time t'],
    example: { a: ['Initial P0 = 100 users', 'Carrying capacity K = 10,000 users', 'Rate r = 0.15/day', 'Elapsed t = 30 days'], result: 'Current P(t) = 8,995 users, Inflection Point at t_0 = 30.7 days (Maximum growth rate = 375 users/day)' },
    formula: 'P(t) = K / (1 + ((K - P_0)/P_0) * e^{-r t}), Inflection t_0 = (1/r) ln((K - P_0)/P_0)',
    code: {
      python: `import numpy as np\ndef logistic_growth(p0, k, r, t):\n    return k / (1 + ((k - p0) / p0) * np.exp(-r * t))\nprint(f"P(30): {logistic_growth(100, 10000, 0.15, 30):.0f}")`,
      r: `pt <- 10000 / (1 + ((10000 - 100)/100) * exp(-0.15 * 30))`,
      ts: `import { logisticGrowth } from '@statlab/core';\nconst p = logisticGrowth(100, { k: 10000, r: 0.15, t: 30 });`,
    },
    useCases: [
      'Modeling user adoption S-curves and infrastructure resource saturation limits in production telemetry.',
      'Predicting server capacity bottlenecks in CI/CD pipeline benchmarks load testing.'
    ],
    when: 'Use when modeling growth processes that initially grow exponentially but slow down as they approach a maximum saturation limit K.',
    cautions: [
      'Carrying capacity K must exceed initial value P0.',
      'Assumes environmental constraints and growth rate r remain constant.'
    ],
    workbenchId: 'kin_logistic',
  },
  {
    slug: 'hill-equation-ec50',
    title: 'Hill equation dose-response & EC50 calculator',
    family: 'Growth, decay & kinetic models',
    description: 'Fit 4-parameter Hill equation dose-response curves to estimate median effective concentration EC_{50}, Hill coefficient n_H, and cooperativity.',
    keywords: ['Hill equation calculator', 'EC50 calculator', 'Hill coefficient', 'dose response curve', 'cooperativity Hill'],
    inputs: ['Dose / Concentration vector X', 'Observed response vector Y', 'Min/Max response bounds (optional)'],
    example: { a: ['Doses X: [0.1, 1.0, 10.0, 100.0, 1000.0]', 'Responses Y: [2%, 12%, 50%, 88%, 98%]'], result: 'EC50 = 10.0 units, Hill Coefficient n_H = 1.02 (Non-cooperative Michaelis-Menten kinetics)' },
    formula: 'E(X) = E_{min} + (E_{max} - E_{min}) * [ X^{n_H} / (EC_{50}^{n_H} + X^{n_H}) ]',
    code: {
      python: `from scipy.optimize import curve_fit\ndef hill_eq(x, ec50, nh):\n    return x**nh / (ec50**nh + x**nh)\n# Fit EC50 and Hill coefficient n_H to normalized response data`,
      r: `library(drc)\ndrm(y ~ x, fct = LL.4())`,
      ts: `import { hillEquation } from '@statlab/core';\nconst { ec50, nH } = hillEquation(doses, responses);`,
    },
    useCases: [
      'Evaluating sigmoidal API stress failure curves vs request rate in production telemetry.',
      'Determining 50% response threshold points in system qualification testing suites.'
    ],
    when: 'Use when modeling sigmoidal dose-response relationships exhibiting cooperative binding or non-linear saturation thresholding.',
    cautions: [
      'Hill coefficient n_H > 1 indicates positive cooperativity (steeper curve); n_H < 1 indicates negative cooperativity.',
      'Log-transform concentration values before fitting if range spans multiple orders of magnitude.'
    ],
    workbenchId: 'kin_hill',
  },
  {
    slug: 'michaelis-menten-kinetics',
    title: 'Michaelis-Menten kinetics & Lineweaver-Burk calculator',
    family: 'Growth, decay & kinetic models',
    description: 'Compute maximum velocity V_{max}, Michaelis constant K_m, and catalytic efficiency (V_{max}/K_m) using Lineweaver-Burk double reciprocal transform.',
    keywords: ['Michaelis Menten calculator', 'Km calculator', 'Vmax calculator', 'Lineweaver Burk plot', 'enzyme kinetics'],
    inputs: ['Substrate concentration [S] vector', 'Initial velocity V0 vector'],
    example: { a: ['Substrates [S]: [1.0, 2.0, 5.0, 10.0, 20.0]', 'Velocities V0: [15, 25, 40, 50, 57]'], result: 'V_max = 68.42 ops/sec, K_m = 3.56 mmol/L, Lineweaver-Burk R² = 0.992' },
    formula: 'V_0 = (V_{max} * [S]) / (K_m + [S]), 1/V_0 = (K_m / V_{max}) * (1/[S]) + 1/V_{max}',
    code: {
      python: `import numpy as np\n# Perform OLS linear regression on double-reciprocal vectors 1/V0 vs 1/[S]`,
      r: `library(drc)\n# Fit non-linear Michaelis-Menten model nls(v ~ (vmax * s) / (km + s))`,
      ts: `import { michaelisMenten } from '@statlab/core';\nconst { vmax, km } = michaelisMenten(substrates, velocities);`,
    },
    useCases: [
      'Modeling thread worker throughput vs queue saturation depth in production telemetry.',
      'Evaluating processing bottleneck kinetics in CI/CD pipeline benchmarks build pipelines.'
    ],
    when: 'Use when modeling single-substrate enzymatic or worker processing rates approaching asymptotic maximum velocity.',
    cautions: [
      'Lineweaver-Burk double reciprocal transformation can distort error variance at low concentrations; use Hanes-Woolf or non-linear regression for final reporting.',
      'Km represents substrate concentration at half Vmax.'
    ],
    workbenchId: 'kin_mm',
  },
  {
    slug: 'gumbel-distribution-calculator',
    title: 'Gumbel Type I extreme value distribution calculator',
    family: 'Extreme value & reliability distributions',
    description: 'Calculate Gumbel Type I minimum and maximum distribution CDF, PDF, quantiles, and extreme return periods for thin-tailed GEV limits.',
    keywords: ['Gumbel distribution calculator', 'Gumbel minimum', 'Gumbel maximum', 'extreme value type 1', 'return period Gumbel'],
    inputs: ['Location parameter μ', 'Scale parameter β (β > 0)', 'Quantile value x OR Probability p'],
    example: { a: ['Location μ = 120.0ms', 'Scale β = 15.0ms', 'Target Quantile x = 180.0ms'], result: 'CDF F(x) = 0.9820, Return Period T = 55.5 runs, Mode = 120.0ms, Mean = 128.65ms' },
    formula: 'CDF F(x) = exp( - exp( - (x - μ) / β ) ), Mean = μ + β * γ (where γ ≈ 0.57721)',
    code: {
      python: `from scipy.stats import gumbel_r\nmu, beta = 120.0, 15.0\ncdf = gumbel_r.cdf(180.0, loc=mu, scale=beta)\nprint(f"Gumbel max CDF: {cdf:.4f}")`,
      r: `library(evd)\npgumbel(180, loc = 120, scale = 15)`,
      ts: `import { gumbelDistribution } from '@statlab/core';\nconst cdf = gumbelDistribution(180, { loc: 120, scale: 15, mode: 'max' });`,
    },
    useCases: [
      'Modeling maximum annual/daily latency spikes in production system telemetry.',
      'Establishing extreme upper tolerance bounds in automated load testing.'
    ],
    when: 'Use when modeling the distribution of the maximum (or minimum) of a number of samples of exponential-type distributions.',
    cautions: [
      'Gumbel distribution has constant Gumbel shape ξ = 0; if tail is heavy, use Fréchet/GEV.',
      'Ensure correct specification of Gumbel Minimum vs Gumbel Maximum.'
    ],
    workbenchId: 'dist_gumbel',
  },
  {
    slug: 'weibull-two-parameter-fit',
    title: '2-parameter Weibull MLE fit calculator',
    family: 'Extreme value & reliability distributions',
    description: 'Fit 2-parameter Weibull shape parameter β and scale parameter η using Maximum Likelihood Estimation (MLE) for reliability analysis.',
    keywords: ['Weibull MLE calculator', 'Weibull shape beta', 'Weibull scale eta', 'characteristic life', 'failure rate Weibull'],
    inputs: ['Time-to-failure observations vector T (Uncensored or Censored)'],
    example: { a: ['Failures (hrs): [120, 240, 310, 450, 520, 680, 890]'], result: 'Shape β = 1.782 (Wear-out phase), Scale η = 512.4 hrs (Characteristic Life), MTTF = 456.1 hrs' },
    formula: 'F(t) = 1 - exp(-(t/η)^β), Hazard h(t) = (β/η)(t/η)^{β-1}',
    code: {
      python: `from scipy.stats import weibull_min\nparams = weibull_min.fit(failures, flock=0)\nbeta_hat, eta_hat = params[0], params[2]\nprint(f"Shape: {beta_hat:.4f}, Scale: {eta_hat:.4f}")`,
      r: `library(fitdistrplus)\nfitdist(failures, "weibull")`,
      ts: `import { weibullMleFit } from '@statlab/core';\nconst { beta, eta, mttf } = weibullMleFit(failures);`,
    },
    useCases: [
      'Fitting component failure distributions and wear-out trends in production system telemetry.',
      'Estimating characteristic life (63.2% failure point) in CI/CD pipeline benchmarks reliability runs.'
    ],
    when: 'Use when modeling item lifespan, failure times, or material strength where failure rate changes over time.',
    cautions: [
      'Shape β < 1 indicates infant mortality (decreasing failure rate); β = 1 indicates random constant failures (exponential); β > 1 indicates wear-out.',
      'Requires positive time values T > 0.'
    ],
    workbenchId: 'dist_weibull_mle',
  },
  {
    slug: 'log-normal-distribution-calculator',
    title: 'Log-normal distribution & geometric mean calculator',
    family: 'Probability distributions & bayesian priors',
    description: 'Calculate Log-normal distribution PDF, CDF, quantiles, arithmetic mean, geometric mean, and geometric standard deviation.',
    keywords: ['log normal distribution calculator', 'geometric mean calculator', 'lognormal PDF CDF', 'skewed latency distribution', 'multiplicative noise'],
    inputs: ['Location parameter μ (Mean of log(X))', 'Scale parameter σ (Std dev of log(X))', 'Value x'],
    example: { a: ['Location μ = 4.605 (ln(100))', 'Scale σ = 0.50', 'Value x = 150.0ms'], result: 'Geometric Mean = 100.0ms, Arithmetic Mean = 113.3ms, CDF F(150) = 0.8849, Geometric SD = 1.649' },
    formula: 'f(x) = (1 / (x σ √(2π))) * exp( - (ln x - μ)² / (2σ²) ), GeoMean = e^μ, GeoSD = e^σ',
    code: {
      python: `from scipy.stats import lognorm\nimport numpy as np\ns, scale = 0.50, np.exp(4.605)\ncdf = lognorm.cdf(150.0, s=s, scale=scale)\nprint(f"Log-normal CDF: {cdf:.4f}")`,
      r: `plnorm(150, meanlog = 4.605, sdlog = 0.50)`,
      ts: `import { logNormalDistribution } from '@statlab/core';\nconst cdf = logNormalDistribution(150, { meanlog: 4.605, sdlog: 0.50 });`,
    },
    useCases: [
      'Modeling right-skewed web request latencies and file payload sizes in production system telemetry.',
      'Calculating geometric mean benchmarks in automated load testing.'
    ],
    when: 'Use when variable is positive-valued and produced by multiplicative growth or multiplicative noise factors.',
    cautions: [
      'Parameters μ and σ are the mean and standard deviation of log(X), NOT of X itself.',
      'Arithmetic mean E[X] = exp(μ + σ²/2) exceeds geometric mean exp(μ).'
    ],
    workbenchId: 'dist_lognorm',
  },
  {
    slug: 'gamma-distribution-calculator',
    title: 'Gamma distribution & Erlang waiting time calculator',
    family: 'Probability distributions & bayesian priors',
    description: 'Compute Gamma distribution PDF, CDF, quantiles, mean (kθ), and variance for continuous waiting times and Poisson queue arrivals.',
    keywords: ['Gamma distribution calculator', 'Erlang distribution', 'waiting time distribution', 'Gamma shape scale', 'Poisson waiting time'],
    inputs: ['Shape parameter k (or α > 0)', 'Scale parameter θ (or Rate β = 1/θ)', 'Value x'],
    example: { a: ['Shape k = 3.0 (3 events)', 'Scale θ = 10.0ms (Avg time per event)', 'Value x = 45.0ms'], result: 'Mean = 30.0ms, Variance = 300.0, CDF F(45) = 0.8264, Mode = 20.0ms' },
    formula: 'f(x) = (1 / (Γ(k) θ^k)) * x^{k-1} * exp(-x / θ)',
    code: {
      python: `from scipy.stats import gamma\ncdf = gamma.cdf(45.0, a=3.0, scale=10.0)\nprint(f"Gamma CDF: {cdf:.4f}")`,
      r: `pgamma(45, shape = 3, scale = 10)`,
      ts: `import { gammaDistribution } from '@statlab/core';\nconst cdf = gammaDistribution(45, { shape: 3, scale: 10 });`,
    },
    useCases: [
      'Modeling multi-stage queue waiting times in production system telemetry streams.',
      'Constructing conjugate prior distributions for Poisson rate parameters in CI/CD pipeline benchmarks.'
    ],
    when: 'Use when predicting the total elapsed time until k independent Poisson events occur.',
    cautions: [
      'Check whether software uses scale parameter θ or rate parameter β = 1/θ.',
      'When shape k is an integer, Gamma reduces to Erlang distribution.'
    ],
    workbenchId: 'dist_gamma',
  },
  {
    slug: 'cauchy-distribution-calculator',
    title: 'Cauchy (Lorentzian) distribution calculator',
    family: 'Probability distributions & bayesian priors',
    description: 'Compute Cauchy / Lorentz distribution PDF, CDF, quantiles, and IQR for heavy-tailed distributions with undefined mean and variance.',
    keywords: ['Cauchy distribution calculator', 'Lorentzian distribution', 'heavy tailed distribution', 'undefined mean distribution', 'Cauchy location scale'],
    inputs: ['Location parameter x0 (Median / Mode)', 'Scale parameter γ (γ > 0, Half-width at half-maximum HWHM)', 'Value x'],
    example: { a: ['Location x0 = 0.0', 'Scale γ = 1.0 (Standard Cauchy)', 'Value x = 2.0'], result: 'Median = 0.0, IQR = 2.0 (From -1 to +1), CDF F(2) = 0.8524, PDF f(2) = 0.0637' },
    formula: 'f(x) = 1 / ( π γ [ 1 + ((x - x_0)/γ)² ] ), CDF F(x) = (1/π) arctan((x - x_0)/γ) + 1/2',
    code: {
      python: `from scipy.stats import cauchy\ncdf = cauchy.cdf(2.0, loc=0.0, scale=1.0)\nprint(f"Cauchy CDF: {cdf:.4f}")`,
      r: `pcauchy(2, location = 0, scale = 1)`,
      ts: `import { cauchyDistribution } from '@statlab/core';\nconst cdf = cauchyDistribution(2.0, { loc: 0.0, scale: 1.0 });`,
    },
    useCases: [
      'Modeling extreme ratio metrics and resonance spikes in production system telemetry.',
      'Constructing default priors for Bayesian t-tests (BF_10) in CI/CD pipeline benchmarks.'
    ],
    when: 'Use when modeling ratio distributions of two independent normal variables or extreme resonance spikes.',
    cautions: [
      'Theoretical mean, variance, and higher moments are undefined (do not converge).',
      'Sample mean does NOT obey the Law of Large Numbers for Cauchy data.'
    ],
    workbenchId: 'dist_cauchy',
  },
  {
    slug: 'beta-distribution-calculator',
    title: 'Beta distribution & Bayesian prior calculator',
    family: 'Probability distributions & bayesian priors',
    description: 'Calculate Beta distribution PDF, CDF, quantiles, mean (α/(α+β)), and mode for probability modeling and Beta-Binomial Bayesian priors.',
    keywords: ['Beta distribution calculator', 'Beta prior calculator', 'Bayesian Beta Binomial', 'Beta PDF CDF', 'proportion distribution'],
    inputs: ['Shape parameter α (α > 0)', 'Shape parameter β (β > 0)', 'Probability value x (0 <= x <= 1)'],
    example: { a: ['Alpha α = 10 (Successes + 1)', 'Beta β = 2 (Failures + 1)', 'Target x = 0.80'], result: 'Mean = 0.8333 (83.3%), Mode = 0.900, Variance = 0.0107, 95% Credible Interval: [0.604, 0.970]' },
    formula: 'f(x) = (1 / B(α, β)) * x^{α-1} (1 - x)^{β-1}, Mean = α / (α + β)',
    code: {
      python: `from scipy.stats import beta\ncdf = beta.cdf(0.80, a=10, b=2)\nprint(f"Beta CDF: {cdf:.4f}")`,
      r: `pbeta(0.80, shape1 = 10, shape2 = 2)`,
      ts: `import { betaDistribution } from '@statlab/core';\nconst cdf = betaDistribution(0.80, { alpha: 10, beta: 2 });`,
    },
    useCases: [
      'Modeling conversion rate uncertainty distributions in production A/B testing.',
      'Setting conjugate prior distributions for binary failure rates in CI/CD pipeline benchmarks.'
    ],
    when: 'Use when modeling random variables bounded between 0 and 1, such as probabilities, percentages, or conversion rates.',
    cautions: [
      'Bounded strictly to interval [0, 1].',
      'Conjugate prior for Binomial likelihood distributions.'
    ],
    workbenchId: 'dist_beta',
  },
  {
    slug: 'dirichlet-distribution-calculator',
    title: 'Dirichlet multivariate distribution calculator',
    family: 'Probability distributions & bayesian priors',
    description: 'Compute Dirichlet distribution PDF, category means (α_i/α_0), and variances for multivariate probability simplex distributions.',
    keywords: ['Dirichlet distribution calculator', 'multivariate beta distribution', 'probability simplex', 'LDA prior Dirichlet', 'categorical prior'],
    inputs: ['Concentration vector α = [α1, α2, ... αk]', 'Sample probability vector p = [p1, p2, ... pk] (sum to 1.0)'],
    example: { a: ['Concentration α: [10, 5, 2] (3 categories)', 'Sample probabilities p: [0.60, 0.30, 0.10]'], result: 'Expected Means E[p]: [0.588, 0.294, 0.118], Sum α₀ = 17.0, Log PDF = +2.48' },
    formula: 'f(p) = (Γ(Σ α_i) / ∏ Γ(α_i)) * ∏ p_i^{α_i - 1}, E[p_i] = α_i / Σ α_k',
    code: {
      python: `from scipy.stats import dirichlet\nlog_pdf = dirichlet.logpdf([0.60, 0.30, 0.10], alpha=[10, 5, 2])\nprint(f"Dirichlet Log PDF: {log_pdf:.4f}")`,
      r: `library(MCMCpack)\nddirichlet(c(0.60, 0.30, 0.10), alpha = c(10, 5, 2))`,
      ts: `import { dirichletDistribution } from '@statlab/core';\nconst res = dirichletDistribution([0.60, 0.30, 0.10], { alpha: [10, 5, 2] });`,
    },
    useCases: [
      'Modeling categorical topic/event distribution priors in production telemetry LLM evaluations.',
      'Constructing conjugate priors for multinomial telemetry events in CI/CD pipeline benchmarks.'
    ],
    when: 'Use when modeling probability vectors over 3 or more mutually exclusive categories that sum to 1.0.',
    cautions: [
      'Multivariate generalization of the Beta distribution.',
      'Input probability vector elements must be non-negative and sum to exactly 1.0.'
    ],
    workbenchId: 'dist_dirichlet',
  },
  {
    slug: 'hypergeometric-distribution-calculator',
    title: 'Hypergeometric distribution calculator',
    family: 'Probability distributions & bayesian priors',
    description: 'Calculate Hypergeometric distribution PMF, CDF, mean, and variance for sampling without replacement from a finite population.',
    keywords: ['Hypergeometric distribution calculator', 'sampling without replacement', 'finite population sampling', 'hypergeometric PMF CDF'],
    inputs: ['Population size N', 'Total success states in population K', 'Sample size n', 'Observed successes k'],
    example: { a: ['Population N = 100 items', 'Defect items K = 15', 'Sample size n = 10 items', 'Observed defects k = 3'], result: 'Exact PMF P(k=3) = 0.1298, Cumulative P(k>=3) = 0.1798, Expected E[k] = 1.50 defects' },
    formula: 'P(X = k) = [ (K choose k) (N-K choose n-k) ] / (N choose n)',
    code: {
      python: `from scipy.stats import hypergeom\n# N=100, K=15, n=10\npmf = hypergeom.pmf(3, 100, 15, 10)\nprint(f"Hypergeometric PMF: {pmf:.4f}")`,
      r: `dhyper(3, m = 15, n = 85, k = 10)`,
      ts: `import { hypergeometricDistribution } from '@statlab/core';\nconst pmf = hypergeometricDistribution(3, { N: 100, K: 15, n: 10 });`,
    },
    useCases: [
      'Evaluating defect discovery probabilities in fixed-size code audit batches in production telemetry.',
      'Computing exact Fisher test probabilities in small finite QA runs in CI/CD pipeline benchmarks.'
    ],
    when: 'Use when sampling without replacement from a finite population of size N containing K target items.',
    cautions: [
      'If population N is very large (N > 10 * n), Binomial distribution provides a close approximation.',
      'Requires integer parameters.'
    ],
    workbenchId: 'dist_hyper',
  },
  {
    slug: 'negative-binomial-distribution',
    title: 'Negative binomial distribution calculator',
    family: 'Probability distributions & bayesian priors',
    description: 'Calculate Negative Binomial PMF, CDF, and overdispersed Poisson count probabilities for target number of successes r and probability p.',
    keywords: ['Negative binomial distribution', 'overdispersed Poisson', 'target successes r', 'Pascal distribution', 'count data calculator'],
    inputs: ['Target success count r (r > 0)', 'Success probability p (0 < p < 1)', 'Number of failures k'],
    example: { a: ['Target successes r = 5', 'Success probability p = 0.20', 'Number of failures k = 15'], result: 'PMF P(k=15) = 0.0436, Mean = 20.0 failures, Variance = 100.0 (Overdispersion Var/Mean = 5.0)' },
    formula: 'P(X = k) = ((k + r - 1) choose k) * p^r * (1 - p)^k',
    code: {
      python: `from scipy.stats import nbinom\npmf = nbinom.pmf(15, n=5, p=0.20)\nprint(f"Negative Binomial PMF: {pmf:.4f}")`,
      r: `dnbinom(15, size = 5, prob = 0.20)`,
      ts: `import { negativeBinomialDist } from '@statlab/core';\nconst pmf = negativeBinomialDist(15, { r: 5, p: 0.20 });`,
    },
    useCases: [
      'Modeling overdispersed API request retries and error counts in production system telemetry.',
      'Analyzing clustered defect occurrences in automated load testing.'
    ],
    when: 'Use when modeling the number of failures before achieving r successes, or when count data exhibits overdispersion (Variance > Mean).',
    cautions: [
      'Handles overdispersed count data where standard Poisson models fail.',
      'Check whether software defines outcome as number of failures k or total trials n = k + r.'
    ],
    workbenchId: 'dist_nbinom',
  },
  {
    slug: 'multinomial-distribution-calculator',
    title: 'Multinomial distribution calculator',
    family: 'Probability distributions & bayesian priors',
    description: 'Calculate joint probability PMF for multi-category outcome counts across N independent trials given category probability vector p.',
    keywords: ['Multinomial distribution calculator', 'multinomial PMF', 'multi category probability', 'category counts PMF'],
    inputs: ['Category probability vector p = [p1, p2, ... pk]', 'Observed counts vector x = [x1, x2, ... xk] (sum to N)'],
    example: { a: ['Probabilities p: [0.50, 0.30, 0.20]', 'Trial counts x: [5, 3, 2] (N = 10 trials)'], result: 'Joint PMF P(X=x) = 0.0850 (8.50% exact joint probability), Log PMF = -2.465' },
    formula: 'P(X_1=x_1, ... X_k=x_k) = (N! / (x_1! ... x_k!)) * ∏ p_i^{x_i}',
    code: {
      python: `from scipy.stats import multinomial\npmf = multinomial.pmf([5, 3, 2], n=10, p=[0.50, 0.30, 0.20])\nprint(f"Multinomial PMF: {pmf:.4f}")`,
      r: `dmultinom(c(5, 3, 2), prob = c(0.50, 0.30, 0.20))`,
      ts: `import { multinomialDist } from '@statlab/core';\nconst pmf = multinomialDist([5, 3, 2], { p: [0.50, 0.30, 0.20] });`,
    },
    useCases: [
      'Evaluating multi-category HTTP status code response distributions in production telemetry.',
      'Benchmarking multi-class LLM output classification probabilities in CI/CD pipeline benchmarks.'
    ],
    when: 'Use when calculating joint probabilities for counts across 3 or more mutually exclusive outcomes in N independent trials.',
    cautions: [
      'Multivariate extension of Binomial distribution.',
      'Category probabilities p must sum to 1.0 and counts x must sum to N.'
    ],
    workbenchId: 'dist_multinom',
  },
  {
    slug: 'box-cox-transformation',
    title: 'Box-Cox power transformation calculator',
    family: 'Data transformations',
    description: 'Compute optimal Box-Cox power transformation parameter λ using Maximum Likelihood to stabilize variance and normalize positive data.',
    keywords: ['Box Cox calculator', 'power transformation lambda', 'normalize data Box Cox', 'variance stabilizing transform'],
    inputs: ['Strictly positive data vector X (X > 0)', 'Lambda search range (Default -2.0 to +2.0)'],
    example: { a: ['Right-skewed positive data vector (N=100)'], result: 'Optimal Lambda λ = 0.24 (Log-like transform). Transformed Skewness reduced from +2.41 to +0.08.' },
    formula: 'y^{(λ)} = (x^λ - 1)/λ if λ ≠ 0 else ln(x)',
    code: {
      python: `from scipy.stats import boxcox\ntransformed_x, best_lambda = boxcox(positive_data)\nprint(f"Optimal Lambda: {best_lambda:.4f}")`,
      r: `library(MASS)\nboxcox(data ~ 1)`,
      ts: `import { boxCoxTransform } from '@statlab/core';\nconst { transformed, lambda } = boxCoxTransform(data);`,
    },
    useCases: [
      'Normalizing highly skewed latency distributions prior to parametric ANOVA testing in production telemetry.',
      'Stabilizing metric variance in performance benchmarking.'
    ],
    when: 'Use when strictly positive continuous data violates normality and homoscedasticity assumptions.',
    cautions: [
      'Requires strictly positive data X > 0.',
      'For data containing zero or negative values, use Yeo-Johnson transformation instead.'
    ],
    workbenchId: 'trans_boxcox',
  },
  {
    slug: 'yeo-johnson-transformation',
    title: 'Yeo-Johnson power transformation calculator',
    family: 'Data transformations',
    description: 'Compute optimal Yeo-Johnson power transformation parameter λ for normalizing continuous data containing zero or negative values.',
    keywords: ['Yeo Johnson calculator', 'power transformation negative data', 'normalize zero negative data', 'Yeo Johnson lambda'],
    inputs: ['Real-valued data vector X (Positive, zero, or negative)', 'Lambda search range'],
    example: { a: ['Real-valued data vector containing negative values: [-5.2, -1.0, 0.0, 3.4, 18.9]'], result: 'Optimal Lambda λ = 0.52. Transformed Skewness reduced from +1.85 to -0.04.' },
    formula: 'y^{(λ)} = ((x+1)^λ - 1)/λ if x ≥ 0, λ ≠ 0; ln(x+1) if x ≥ 0, λ = 0',
    code: {
      python: `from scipy.stats import yeojohnson\ntransformed_x, best_lambda = yeojohnson(data)\nprint(f"Optimal Yeo-Johnson Lambda: {best_lambda:.4f}")`,
      r: `library(car)\nPowerTransform(data, family = "yj")`,
      ts: `import { yeoJohnsonTransform } from '@statlab/core';\nconst { transformed, lambda } = yeoJohnsonTransform(data);`,
    },
    useCases: [
      'Normalizing real-valued metric change deltas and gain/loss telemetry in production telemetry.',
      'Transforming negative-valued benchmark differences in CI/CD pipeline benchmarks.'
    ],
    when: 'Use to stabilize variance and normalize continuous data that includes zero or negative numbers.',
    cautions: [
      'Extension of Box-Cox that supports all real numbers.',
      'Check transformed Q-Q plots for approximate normality.'
    ],
    workbenchId: 'trans_yj',
  },
  {
    slug: 'spectral-density-periodogram',
    title: 'Fast Fourier Transform (FFT) Power Spectral Density calculator',
    family: 'Spectral analysis & signal processing',
    description: 'Calculate Power Spectral Density (PSD) and periodogram frequencies using Fast Fourier Transform (FFT) and Welch\'s windowed method.',
    keywords: ['power spectral density calculator', 'FFT periodogram', 'Welch PSD calculator', 'spectral frequency analysis', 'dominant frequency detection'],
    inputs: ['Time series signal values array Y', 'Sampling frequency f_s (Hz)', 'Window function (Hann, Hamming, Rectangular)'],
    example: { a: ['Telemetry metric sampled at f_s = 100 Hz (1,000 points)', 'Window: Hann'], result: 'Dominant Frequency Peak f_max = 12.5 Hz (Power = 42.8 dB/Hz). Spectral Centroid = 18.2 Hz.' },
    formula: 'P(f) = (1 / (f_s N)) | Σ_{n=0}^{N-1} x_n w_n e^{-i 2π f n / f_s} |²',
    code: {
      python: `from scipy.signal import welch\nfreqs, psd = welch(signal, fs=100.0, nperseg=256)\nprint(f"Peak freq: {freqs[psd.argmax()]:.2f} Hz")`,
      r: `spectrum(signal, method = "pgram")`,
      ts: `import { powerSpectralDensity } from '@statlab/core';\nconst { frequencies, psd } = powerSpectralDensity(signal, { fs: 100 });`,
    },
    useCases: [
      'Detecting hidden periodic CPU load cycles and memory GC frequency spikes in production system telemetry.',
      'Analyzing harmonic oscillation noise in automated load testing.'
    ],
    when: 'Use when converting time-domain metric sequences into frequency-domain power spectra to identify repeating cyclic patterns.',
    cautions: [
      'Requires uniformly sampled time series data at fixed sampling frequency f_s.',
      'Apply window functions (Hann/Hamming) to reduce spectral leakage.'
    ],
    workbenchId: 'spec_psd',
  },
  {
    slug: 'signal-to-noise-ratio-snr',
    title: 'Signal-to-Noise Ratio (SNR & PSNR) calculator',
    family: 'Spectral analysis & signal processing',
    description: 'Compute Signal-to-Noise Ratio (SNR) in decibels (dB), Peak Signal-to-Noise Ratio (PSNR), and Carrier-to-Noise (C/N) ratios for metric signals.',
    keywords: ['SNR calculator', 'signal to noise ratio dB', 'PSNR calculator', 'peak signal to noise ratio', 'metric noise ratio'],
    inputs: ['Signal mean / peak value', 'Noise standard deviation / MSE', 'Calculation mode (Power SNR, Voltage SNR, PSNR)'],
    example: { a: ['Signal Mean = 120.0ms', 'Noise Std Dev σ_N = 4.0ms'], result: 'SNR = 30.0 (Linear), SNR = 29.54 dB (Power ratio). Peak SNR PSNR = 35.20 dB.' },
    formula: 'SNR_{dB} = 20 log10( A_{signal} / A_{noise} ), PSNR_{dB} = 10 log10( MAX^2 / MSE )',
    code: {
      python: `import numpy as np\ndef calculate_snr(signal, noise):\n    snr_linear = np.var(signal) / np.var(noise)\n    return 10 * np.log10(snr_linear)\nprint(f"SNR: {calculate_snr(sig_vec, noise_vec):.2f} dB")`,
      r: `snr_db <- 10 * log10(var(signal) / var(noise))`,
      ts: `import { signalToNoiseRatio } from '@statlab/core';\nconst { snrDb, psnrDb } = signalToNoiseRatio(signal, noise);`,
    },
    useCases: [
      'Quantifying telemetry signal clarity against background server noise in production telemetry.',
      'Evaluating benchmark signal quality in CI/CD pipeline benchmarks release qualification.'
    ],
    when: 'Use when assessing signal quality relative to background random noise level.',
    cautions: [
      'Specify whether input amplitudes represent power (10 log10) or voltage/amplitude (20 log10).',
      'Higher dB indicates cleaner signal.'
    ],
    workbenchId: 'sig_snr',
  },
  {
    slug: 'cusum-mean-variance-spc',
    title: 'EWMA & Standardized CUSUM control chart calculator',
    family: 'Statistical process control',
    description: 'Compute Exponentially Weighted Moving Average (EWMA) control limits and standardized CUSUM chart statistics for early shift detection.',
    keywords: ['EWMA control chart calculator', 'EWMA SPC', 'standardized CUSUM', 'exponentially weighted moving average', 'small shift SPC'],
    inputs: ['Observations vector X', 'Target mean μ₀', 'Std dev σ', 'EWMA smoothing parameter lambda λ (0.05 to 0.30)', 'Control limit factor L'],
    example: { a: ['Observations X', 'Target μ₀ = 50.0, σ = 2.0', 'EWMA λ = 0.20, L = 3.0'], result: 'EWMA Centerline = 50.0, Steady-state UCL = 52.04, LCL = 47.96. Shift detected at point #14.' },
    formula: 'Z_i = λ X_i + (1 - λ) Z_{i-1}, UCL = μ₀ + L σ √((λ/(2-λ)) (1 - (1-λ)^{2i}))',
    code: {
      python: `import statsmodels.api as sm # or custom EWMA estimator\n# Compute EWMA Z_i series and dynamic control limits`,
      r: `library(qcc)\nqcc(data, type = "ewma", lambda = 0.2, nsigmas = 3)`,
      ts: `import { ewmaControlChart } from '@statlab/core';\nconst { ewma, ucl, lcl } = ewmaControlChart(observations, { target: 50, sd: 2, lambda: 0.2 });`,
    },
    useCases: [
      'Detecting subtle persistent trend shifts in production system telemetry.',
      'Monitoring continuous API execution time stability in CI/CD pipeline benchmarks.'
    ],
    when: 'Use when detecting small process mean shifts (0.5σ to 1.5σ) where standard Shewhart X-bar charts react too slowly.',
    cautions: [
      'EWMA weight parameter λ determines memory weight; smaller λ (e.g. 0.10) is better for smaller shifts.',
      'Check for autocorrelation in observations before applying standard EWMA limits.'
    ],
    workbenchId: 'spc_ewma',
  },
  {
    slug: 'exponential-distribution-calculator',
    title: 'Exponential distribution CDF, PDF & quantile calculator',
    family: 'Probability distributions',
    description: 'Calculate Exponential distribution cumulative distribution function (CDF), probability density function (PDF), survival function, and quantiles for rate parameter lambda.',
    keywords: ['Exponential distribution calculator', 'exponential CDF', 'exponential PDF', 'rate parameter lambda', 'inter-arrival time distribution'],
    inputs: ['Value x (or time t)', 'Rate parameter λ (or mean scale β = 1/λ)', 'Target probability p (for quantile)'],
    example: { a: ['Rate parameter λ = 0.05 (mean = 20s)', 'Value x = 30s'], result: 'P(X ≤ 30) = 0.7769, Survival P(X > 30) = 0.2231, PDF f(30) = 0.0112' },
    formula: 'F(x; λ) = 1 - e^{-λ x}, f(x; λ) = λ e^{-λ x}, Q(p; λ) = -ln(1-p)/λ',
    code: {
      python: `from scipy import stats\nprob = stats.expon.cdf(30, scale=1/0.05)\nq = stats.expon.ppf(0.95, scale=1/0.05)`,
      r: `pexp(30, rate = 0.05)\nqexp(0.95, rate = 0.05)`,
      ts: `import { exponCdf, exponQuantile } from '@statlab/core';\nconst cdf = exponCdf(30, 0.05);\nconst q95 = exponQuantile(0.95, 0.05);`,
    },
    useCases: [
      'Modeling microservice queue request inter-arrival times and timeout probabilities.',
      'Estimating component failure probabilities under constant hazard rate assumptions in reliability engineering.'
    ],
    when: 'Use when modeling time between independent Poisson events or constant hazard rate processes.',
    cautions: [
      'The exponential distribution is memoryless; P(T > s+t | T > s) = P(T > t).',
      'Verify that hazard rate is constant over time before selecting exponential over Weibull models.'
    ],
    workbenchId: 'dist_expon',
  },
  {
    slug: 'poisson-distribution-calculator',
    title: 'Poisson distribution probability & rate parameter calculator',
    family: 'Probability distributions',
    description: 'Calculate exact Poisson distribution probabilities P(X = k), cumulative probabilities P(X ≤ k), and rate parameter confidence intervals.',
    keywords: ['Poisson distribution calculator', 'Poisson probability', 'rate parameter lambda', 'Poisson event counts', 'rare event probability'],
    inputs: ['Observed count k', 'Rate parameter λ (expected mean events)'],
    example: { a: ['Expected mean rate λ = 4.5', 'Observed count k = 7'], result: 'Exact P(X = 7) = 0.0824, Cumulative P(X ≤ 7) = 0.9182, P(X > 7) = 0.0818' },
    formula: 'P(X = k) = (λ^k e^{-λ}) / k!',
    code: {
      python: `from scipy import stats\np_exact = stats.poisson.pmf(7, mu=4.5)\np_cdf = stats.poisson.cdf(7, mu=4.5)`,
      r: `dpois(7, lambda = 4.5)\nppois(7, lambda = 4.5)`,
      ts: `import { poissonPmf, poissonCdf } from '@statlab/core';\nconst pmf = poissonPmf(7, 4.5);\nconst cdf = poissonCdf(7, 4.5);`,
    },
    useCases: [
      'Predicting server error log event counts per minute in cloud infrastructure monitoring.',
      'Evaluating traffic arrival rates and call center queue capacity requirements.'
    ],
    when: 'Use when counting discrete events occurring independently at a known constant average rate.',
    cautions: [
      'Poisson assumes mean equals variance (E[X] = Var(X)). If variance exceeds mean, use Negative Binomial regression.',
      'Events must occur independently in non-overlapping time or space windows.'
    ],
    workbenchId: 'dist_poisson',
  },
  {
    slug: 'log-logistic-distribution',
    title: 'Log-logistic distribution & Fisk survival model calculator',
    family: 'Probability distributions',
    description: 'Calculate Log-logistic (Fisk) distribution PDF, CDF, survival rate, and hazard functions for non-monotonic hazard rates.',
    keywords: ['log-logistic distribution calculator', 'Fisk distribution', 'non-monotonic hazard', 'log-logistic survival', 'heavy tail survival model'],
    inputs: ['Scale parameter α', 'Shape parameter β', 'Time value t'],
    example: { a: ['Scale α = 50.0', 'Shape β = 2.5', 'Time t = 40.0'], result: 'Survival S(40) = 0.6033, Cumulative F(40) = 0.3967, Hazard h(40) = 0.0151' },
    formula: 'F(t) = 1 / (1 + (t/α)^{-β}), S(t) = 1 / (1 + (t/α)^β), h(t) = ( (β/α)(t/α)^{β-1} ) / ( 1 + (t/α)^β )',
    code: {
      python: `from scipy import stats\nres = stats.fisk.cdf(40, c=2.5, scale=50.0)`,
      r: `library(flexsurv)\nplogis(log(40), location = log(50), scale = 1/2.5)`,
      ts: `import { logLogisticCdf, logLogisticSurvival } from '@statlab/core';\nconst s = logLogisticSurvival(40, { alpha: 50, beta: 2.5 });`,
    },
    useCases: [
      'Modeling customer churn rates where risk peaks early before declining in long-term subscribers.',
      'Analyzing software fault discovery survival times in complex release builds.'
    ],
    when: 'Use when modeling survival times or event rates whose hazard function increases initially to a peak and then decreases.',
    cautions: [
      'Log-logistic has heavier tails than log-normal or Weibull distributions.',
      'Shape parameter β must be > 1 for the hazard function to have a unimodal hump shape.'
    ],
    workbenchId: 'dist_log_logistic',
  },
  {
    slug: 'rayleigh-distribution-calculator',
    title: 'Rayleigh distribution PDF, CDF & mode calculator',
    family: 'Probability distributions',
    description: 'Calculate Rayleigh distribution PDF, CDF, mean, median, mode, and variance for 2D vector magnitude fading and radial error.',
    keywords: ['Rayleigh distribution calculator', 'Rayleigh PDF', 'Rayleigh mode', 'vector magnitude distribution', 'signal fading'],
    inputs: ['Scale parameter σ (mode)', 'Vector magnitude x'],
    example: { a: ['Scale σ = 10.0', 'Magnitude x = 12.0'], result: 'Mode = 10.0, Mean ≈ 12.53, P(X ≤ 12) = 0.5132, PDF f(12) = 0.0587' },
    formula: 'f(x; σ) = (x / σ²) e^{-x² / (2σ²)}, F(x; σ) = 1 - e^{-x² / (2σ²)}, Mode = σ',
    code: {
      python: `from scipy import stats\ncdf = stats.rayleigh.cdf(12.0, scale=10.0)\npdf = stats.rayleigh.pdf(12.0, scale=10.0)`,
      r: `prayleigh(12.0, scale = 10.0)\ndrayleigh(12.0, scale = 10.0)`,
      ts: `import { rayleighCdf, rayleighPdf } from '@statlab/core';\nconst cdf = rayleighCdf(12.0, 10.0);`,
    },
    useCases: [
      'Modeling 2D radial position error in robotics, GPS navigation, and spatial target tracking.',
      'Evaluating RF wireless signal fading amplitudes and acoustic noise vector magnitudes.'
    ],
    when: 'Use when calculating the magnitude of a 2D vector whose orthogonal components are independent normally distributed zero-mean variables.',
    cautions: [
      'Rayleigh distribution is defined strictly for non-negative values (x ≥ 0).',
      'If components have non-zero means, use the Rice distribution instead.'
    ],
    workbenchId: 'dist_rayleigh',
  },
  {
    slug: 'studentized-range-distribution',
    title: 'Studentized range distribution (q) calculator',
    family: 'ANOVA & factorial analysis',
    description: 'Calculate Studentized Range q statistic, cumulative probabilities, and critical values for Tukey HSD post-hoc test significance.',
    keywords: ['Studentized range distribution', 'q distribution calculator', 'Tukey q statistic', 'Tukey critical value', 'post hoc range distribution'],
    inputs: ['Number of group means k', 'Degrees of freedom df', 'Studentized range statistic q (or significance level α)'],
    example: { a: ['Group count k = 4', 'Error df = 24', 'q statistic = 3.90'], result: 'p-value ≈ 0.0431. Significant at α = 0.05 level (Critical q_0.05 = 3.901).' },
    formula: 'q = (X̄_{max} - X̄_{min}) / (s / √n), evaluated against Studentized range CDF Q(q; k, df)',
    code: {
      python: `from scipy import stats\np_val = stats.studentized_range.sf(3.90, k=4, df=24)\nq_crit = stats.studentized_range.ppf(0.95, k=4, df=24)`,
      r: `ptukey(3.90, nmeans = 4, df = 24, lower.tail = FALSE)\nqtukey(0.95, nmeans = 4, df = 24)`,
      ts: `import { qTukeyPValue, qTukeyQuantile } from '@statlab/core';\nconst p = qTukeyPValue(3.90, 4, 24);`,
    },
    useCases: [
      'Determining exact p-values for custom pairwise post-hoc group comparisons following one-way ANOVA.',
      'Setting familywise error rate thresholds across multiple experimental treatments.'
    ],
    when: 'Use when comparing the range between maximum and minimum group means relative to pooled error standard error.',
    cautions: [
      'Assumes equal sample sizes across groups; if sample sizes differ, use the Tukey-Kramer adjustment.',
      'Requires homoscedasticity across all evaluated treatment groups.'
    ],
    workbenchId: 'anova_q_range',
  },
  {
    slug: 'cox-proportional-hazards-ratio',
    title: 'Cox proportional hazards regression & log-hazard ratio calculator',
    family: 'Survival & reliability analysis',
    description: 'Compute Cox proportional hazards regression metrics, log-hazard ratios, Wald z-statistics, p-values, and 95% confidence intervals.',
    keywords: ['Cox proportional hazards calculator', 'Cox regression log hazard', 'hazard ratio CI', 'survival regression model', 'proportional hazard assumption'],
    inputs: ['Regression coefficient β (log hazard ratio)', 'Standard error SE(β)', 'Covariate delta Δx'],
    example: { a: ['Coefficient β = 0.45', 'SE(β) = 0.15', 'Covariate unit Δx = 1.0'], result: 'Hazard Ratio HR = 1.568 (95% CI: 1.169 – 2.104), Wald z = 3.00, p = .0027' },
    formula: 'HR = e^{β · Δx}, 95% CI = e^{β · Δx ± 1.96 · SE(β) · Δx}, z = β / SE(β)',
    code: {
      python: `import numpy as np\nhr = np.exp(0.45)\nci = np.exp([0.45 - 1.96*0.15, 0.45 + 1.96*0.15])`,
      r: `library(survival)\nfit <- coxph(Surv(time, status) ~ x, data = df)\nsummary(fit)`,
      ts: `import { coxHazardRatio } from '@statlab/core';\nconst res = coxHazardRatio({ beta: 0.45, se: 0.15, delta: 1.0 });`,
    },
    useCases: [
      'Evaluating relative risk of system crashes or hardware failures adjusted for workload covariates.',
      'Quantifying customer churn hazard ratios in SaaS analytics accounting for tenure and usage.'
    ],
    when: 'Use when estimating covariate effects on time-to-event outcome hazards without specifying a baseline hazard distribution.',
    cautions: [
      'Verify the proportional hazards assumption using Schoenfeld residuals.',
      'Non-proportional hazards require time-varying coefficients or stratified Cox models.'
    ],
    workbenchId: 'survival_cox_reg',
  },
  {
    slug: 'partial-correlation-calculator',
    title: 'Partial correlation coefficient calculator',
    family: 'Regression & correlation',
    description: 'Calculate partial correlation coefficient r_{xy.z} and semi-partial (part) correlation controlling for one or more confounding variables.',
    keywords: ['partial correlation calculator', 'controlling for confounder', 'semi-partial correlation', 'r_xyz correlation', 'adjusted correlation'],
    inputs: ['Correlation r_xy', 'Correlation r_xz', 'Correlation r_yz', 'Sample size N'],
    example: { a: ['r_xy = 0.60 (X and Y)', 'r_xz = 0.50 (X and Z)', 'r_yz = 0.70 (Y and Z)', 'N = 50'], result: 'Partial r_{xy.z} = 0.420, t = 3.19, df = 47, two-sided p = .0025' },
    formula: 'r_{xy.z} = (r_{xy} - r_{xz} r_{yz}) / √( (1 - r_{xz}²) (1 - r_{yz}²) ), t = r_{xy.z} √((N - 2 - k) / (1 - r_{xy.z}²))',
    code: {
      python: `import pingouin as pg\nres = pg.partial_corr(data=df, x='X', y='Y', covar='Z')`,
      r: `library(ppcor)\npcor.test(x, y, z)`,
      ts: `import { partialCorr } from '@statlab/core';\nconst res = partialCorr(0.60, 0.50, 0.70, 50);`,
    },
    useCases: [
      'Measuring direct association between API traffic volume and response latency while controlling for server CPU utilization.',
      'Evaluating user engagement vs conversion correlation controlling for account age.'
    ],
    when: 'Use when quantifying linear relationship between two variables after removing the linear influence of one or more covariates.',
    cautions: [
      'Assumes linear relationships among all variable pairs.',
      'Controlling for colliders rather than confounders can induce spurious correlations.'
    ],
    workbenchId: 'corr_partial',
  },
  {
    slug: 'sem-path-analysis-fit',
    title: 'SEM path analysis & structural model fit index calculator',
    family: 'Multivariate & structural modeling',
    description: 'Compute Structural Equation Modeling (SEM) fit indices including Comparative Fit Index (CFI), Tucker-Lewis Index (TLI), RMSEA, and SRMR.',
    keywords: ['SEM fit indices calculator', 'CFI TLI RMSEA calculator', 'structural equation modeling fit', 'path analysis fit', 'model fit statistics'],
    inputs: ['Model Chi-Square χ²_m', 'Model df_m', 'Baseline Chi-Square χ²_b', 'Baseline df_b', 'Sample size N'],
    example: { a: ['χ²_m = 45.2, df_m = 20', 'χ²_b = 320.5, df_b = 35', 'Sample N = 250'], result: 'CFI = 0.982, TLI = 0.968, RMSEA = 0.071 (90% CI: 0.042 - 0.100). Good fit.' },
    formula: 'CFI = 1 - max(χ²_m - df_m, 0) / max(χ²_b - df_b, χ²_m - df_m, 0), RMSEA = √( max((χ²_m - df_m)/(N · df_m), 0) )',
    code: {
      python: `from semopy import Model\nm = Model(description)\nm.fit(data)\nstats = semopy.calc_stats(m)`,
      r: `library(lavaan)\nfit <- sem(model, data = df)\nfitMeasures(fit, c("cfi", "tli", "rmsea", "srmr"))`,
      ts: `import { semFitIndices } from '@statlab/core';\nconst fit = semFitIndices({ chi2m: 45.2, dfm: 20, chi2b: 320.5, dfb: 35, n: 250 });`,
    },
    useCases: [
      'Evaluating structural fit of multi-stage causal funnel models in product telemetry.',
      'Assessing psychometric construct validity in latent variable survey models.'
    ],
    when: 'Use when evaluating how well a proposed path or structural equation model reproduces the empirical covariance matrix.',
    cautions: [
      'CFI and TLI > 0.95 and RMSEA < 0.06 indicate good model fit according to Hu & Bentler guidelines.',
      'Chi-square test of model fit is highly sensitive to large sample sizes.'
    ],
    workbenchId: 'sem_fit',
  },
  {
    slug: 'canonical-correlation-analysis',
    title: 'Canonical Correlation Analysis (CCA) calculator',
    family: 'Multivariate & structural modeling',
    description: 'Calculate canonical correlations r_c, Wilks\' lambda multivariate test statistics, and dimension redundancy ratios between two set of variables.',
    keywords: ['canonical correlation calculator', 'CCA multivariate analysis', 'Wilks lambda CCA', 'canonical variates', 'two variable sets correlation'],
    inputs: ['Set X variable count p', 'Set Y variable count q', 'Sample size N', 'Eigenvalues λ_i of HE⁻¹ matrix'],
    example: { a: ['Set X variables p = 3', 'Set Y variables q = 2', 'Sample N = 100', 'Eigenvalue λ₁ = 0.64'], result: 'First Canonical Correlation r_{c1} = 0.800, Wilks\' λ = 0.360, χ² = 98.4, df = 6, p < .0001' },
    formula: 'r_{ci} = √(λ_i / (1 + λ_i)), Wilks\' Λ = ∏ (1 - r_{ci}²)',
    code: {
      python: `from sklearn.cross_decomposition import CCA\ncca = CCA(n_components=2)\ncca.fit(X, Y)`,
      r: `cancor(X, Y)`,
      ts: `import { canonicalCorrelation } from '@statlab/core';\nconst res = canonicalCorrelation(X_matrix, Y_matrix);`,
    },
    useCases: [
      'Measuring relationship between a set of system performance metrics and customer satisfaction metrics.',
      'Evaluating correlation between biological gene expression markers and clinical symptom scores.'
    ],
    when: 'Use when investigating linear relationships between two multidimensional sets of continuous variables.',
    cautions: [
      'Requires multivariate normality across both variable sets.',
      'Sensitive to multicollinearity within either variable set X or Y.'
    ],
    workbenchId: 'multivariate_cca',
  },
  {
    slug: 'k-means-silhouette-score',
    title: 'Silhouette coefficient & cluster separation calculator',
    family: 'AI / ML evaluation & robust models',
    description: 'Calculate Silhouette scores s(i) and mean silhouette width for validating cluster compactness and inter-cluster separation.',
    keywords: ['silhouette score calculator', 'silhouette coefficient', 'cluster validation', 'k-means silhouette', 'cluster separation metric'],
    inputs: ['Mean intra-cluster distance a(i)', 'Mean nearest-cluster distance b(i)'],
    example: { a: ['Mean intra-cluster distance a = 1.20', 'Nearest-cluster distance b = 3.50'], result: 'Silhouette score s(i) = (3.50 - 1.20) / max(1.20, 3.50) = 0.657. Strong cluster structure.' },
    formula: 's(i) = (b(i) - a(i)) / max(a(i), b(i)), range -1 to +1',
    code: {
      python: `from sklearn.metrics import silhouette_score, silhouette_samples\nscore = silhouette_score(X, labels)`,
      r: `library(cluster)\nsil <- silhouette(labels, dist(X))\nsummary(sil)`,
      ts: `import { silhouetteScore } from '@statlab/core';\nconst score = silhouetteScore(distanceMatrix, clusterLabels);`,
    },
    useCases: [
      'Selecting optimal k value for user segmentation clustering in telemetry.',
      'Evaluating embedding vector cluster quality in vector databases.'
    ],
    when: 'Use when assessing how well-separated and cohesive clusters are in unsupervised machine learning.',
    cautions: [
      'Silhouette score ranges from -1 (misclustered) to +1 (well clustered); values near 0 indicate overlapping clusters.',
      'Computationally O(N²) without sub-sampling for very large datasets.'
    ],
    workbenchId: 'cluster_silhouette',
  },
  {
    slug: 'davies-bouldin-index',
    title: 'Davies-Bouldin index cluster validity calculator',
    family: 'AI / ML evaluation & robust models',
    description: 'Calculate Davies-Bouldin Index (DBI) to measure average similarity between clusters based on cluster dispersion and centroids.',
    keywords: ['Davies Bouldin index calculator', 'DBI cluster score', 'cluster validity index', 'k-means evaluation', 'cluster dispersion ratio'],
    inputs: ['Cluster dispersions S_i, S_j', 'Inter-centroid distances M_ij'],
    example: { a: ['Cluster 1 dispersion S₁ = 0.85', 'Cluster 2 dispersion S₂ = 0.90', 'Centroid distance M₁₂ = 3.20'], result: 'R₁₂ = (0.85 + 0.90)/3.20 = 0.547. Mean Davies-Bouldin Index = 0.547 (Lower is better).' },
    formula: 'DB = (1/k) ∑_{i=1}^k max_{j ≠ i} ( (S_i + S_j) / M_{ij} )',
    code: {
      python: `from sklearn.metrics import davies_bouldin_score\nscore = davies_bouldin_score(X, labels)`,
      r: 'library(clusterSim)\nindex.DB(X, labels)$DB',
      ts: `import { daviesBouldinIndex } from '@statlab/core';\nconst dbi = daviesBouldinIndex(dataPoints, labels);`,
    },
    useCases: [
      'Benchmarking unsupervised clustering models across different k hyperparameter choices.',
      'Automating cluster quality validation gates in automated ML pipelines.'
    ],
    when: 'Use when evaluating clustering algorithms where lower index values signify tighter, more distinct clusters.',
    cautions: [
      'DBI favors convex, spherical clusters (like standard k-means).',
      'May produce misleadingly good scores for sub-optimal non-convex shapes.'
    ],
    workbenchId: 'cluster_dbi',
  },
  {
    slug: 'calinski-harabasz-index',
    title: 'Calinski-Harabasz index (Variance Ratio Criterion) calculator',
    family: 'AI / ML evaluation & robust models',
    description: 'Calculate Calinski-Harabasz Index (CH score) ratio of between-cluster variance to within-cluster variance.',
    keywords: ['Calinski Harabasz index calculator', 'Variance Ratio Criterion', 'CH cluster score', 'cluster variance ratio', 'k-means optimal k'],
    inputs: ['Between-cluster sum of squares SS_B', 'Within-cluster sum of squares SS_W', 'Cluster count k', 'Sample size N'],
    example: { a: ['SS_B = 450.0', 'SS_W = 120.0', 'Cluster count k = 3', 'Sample size N = 150'], result: 'CH Index = (450 / (3 - 1)) / (120 / (150 - 3)) = 225.0 / 0.8163 = 275.63 (Higher is better).' },
    formula: 'CH = (SS_B / (k - 1)) / (SS_W / (N - k))',
    code: {
      python: `from sklearn.metrics import calinski_harabasz_score\nscore = calinski_harabasz_score(X, labels)`,
      r: `library(clusterSim)\nindex.G1(X, labels)`,
      ts: `import { calinskiHarabaszIndex } from '@statlab/core';\nconst ch = calinskiHarabaszIndex(dataPoints, labels);`,
    },
    useCases: [
      'Finding elbow point or peak score for optimal cluster count selection.',
      'Comparing feature space representations in unsupervised representation learning.'
    ],
    when: 'Use when comparing cluster models where higher scores indicate dense, well-separated clusters.',
    cautions: [
      'Like DBI, CH index is generally highest for spherical clusters.',
      'Magnitude scales with sample size N and dimensionality.'
    ],
    workbenchId: 'cluster_ch',
  },
  {
    slug: 'jaccard-similarity-index',
    title: 'Jaccard similarity index & distance calculator',
    family: 'Vector distances & embedding metrics',
    description: 'Calculate Jaccard similarity coefficient and Jaccard distance for set intersections, binary vectors, and sample overlap.',
    keywords: ['Jaccard similarity calculator', 'Jaccard distance', 'intersection over union IoU', 'set overlap coefficient', 'binary vector similarity'],
    inputs: ['Set A size |A|', 'Set B size |B|', 'Intersection size |A ∩ B|'],
    example: { a: ['Set A size = 45', 'Set B size = 60', 'Intersection |A ∩ B| = 30'], result: 'Union |A ∪ B| = 75, Jaccard Similarity J = 30/75 = 0.400, Jaccard Distance d_J = 0.600' },
    formula: 'J(A,B) = |A ∩ B| / |A ∪ B|, d_J(A,B) = 1 - J(A,B)',
    code: {
      python: `from scipy.spatial.distance import jaccard\ndist = jaccard(bool_vector_u, bool_vector_v)`,
      r: `library(vegan)\nvegdist(x, method = "jaccard")`,
      ts: `import { jaccardSimilarity, jaccardDistance } from '@statlab/core';\nconst sim = jaccardSimilarity(setA, setB);`,
    },
    useCases: [
      'Evaluating document similarity and token set overlaps in text search engines.',
      'Measuring customer cohort overlap and feature flag co-occurrence rates.'
    ],
    when: 'Use when comparing binary presence/absence vectors or discrete sets where joint absences should be ignored.',
    cautions: [
      'Jaccard ignores joint negatives (0-0 matches).',
      'For continuous or non-binary count vectors, use Bray-Curtis or Cosine distance instead.'
    ],
    workbenchId: 'dist_jaccard',
  },
  {
    slug: 'hamming-distance-calculator',
    title: 'Hamming distance & normalized bit error rate calculator',
    family: 'Vector distances & embedding metrics',
    description: 'Calculate Hamming distance and normalized bit error rate (BER) for equal-length strings, binary vectors, and code words.',
    keywords: ['Hamming distance calculator', 'bit error rate BER', 'string distance', 'binary vector substitution count', 'code distance'],
    inputs: ['Vector / String 1', 'Vector / String 2', 'Vector length N'],
    example: { a: ['String 1: "10110101"', 'String 2: "10010001"', 'Length N = 8'], result: 'Hamming Distance d_H = 2, Normalized Hamming Distance = 2/8 = 0.250 (25% bit difference)' },
    formula: 'd_H(u,v) = ∑ (u_i ≠ v_i), d_{norm} = d_H / N',
    code: {
      python: `from scipy.spatial.distance import hamming\ndist_norm = hamming(u, v)\ndist_abs = sum(el1 != el2 for el1, el2 in zip(u, v))`,
      r: `sum(u != v)`,
      ts: `import { hammingDistance } from '@statlab/core';\nconst dist = hammingDistance("10110101", "10010001");`,
    },
    useCases: [
      'Measuring bit error rates in digital telecommunications and storage channels.',
      'Evaluating categorical feature vector distance in machine learning algorithms.'
    ],
    when: 'Use when counting element-wise substitutions required to convert one equal-length vector or string into another.',
    cautions: [
      'Requires vectors or strings to be of equal length.',
      'Does not account for insertions or deletions; use Levenshtein distance for unequal length strings.'
    ],
    workbenchId: 'dist_hamming',
  },
  {
    slug: 'haversine-great-circle-distance',
    title: 'Haversine formula great-circle geographic distance calculator',
    family: 'Vector distances & embedding metrics',
    description: 'Calculate spherical great-circle distance between two geographic coordinates (latitude and longitude) using the Haversine formula.',
    keywords: ['Haversine distance calculator', 'great circle distance', 'latitude longitude distance', 'geographic spherical distance', 'geo distance km miles'],
    inputs: ['Point 1 (Lat₁, Lon₁)', 'Point 2 (Lat₂, Lon₂)', 'Earth radius R (6371 km default)'],
    example: { a: ['Point 1: 40.7128° N, 74.0060° W (NYC)', 'Point 2: 51.5074° N, 0.1278° W (London)'], result: 'Great-circle distance = 5,570.2 km (3,461.2 miles / 3,007.7 nautical miles)' },
    formula: 'a = sin²(Δlat/2) + cos(lat₁)cos(lat₂)sin²(Δlon/2), c = 2 · atan2(√a, √(1-a)), d = R · c',
    code: {
      python: `from math import radians, cos, sin, asin, sqrt\n# Standard Haversine implementation`,
      r: `library(geosphere)\ndistHaversine(c(lon1, lat1), c(lon2, lat2))`,
      ts: `import { haversineDistance } from '@statlab/core';\nconst km = haversineDistance({ lat: 40.7128, lon: -74.0060 }, { lat: 51.5074, lon: -0.1278 });`,
    },
    useCases: [
      'Calculating distance between user client IP locations and cloud server datacenters.',
      'Spatial routing and proximity clustering in location-based services.'
    ],
    when: 'Use when computing distance between coordinate pairs on a spherical surface.',
    cautions: [
      'Assumes a perfectly spherical Earth (R = 6,371 km).',
      'For sub-meter accuracy over long distances, use Vincenty\'s ellipsoidal formula.'
    ],
    workbenchId: 'dist_haversine',
  },
  {
    slug: 'ewma-control-chart-calculator',
    title: 'EWMA control chart & smoothing factor calculator',
    family: 'Statistical process control',
    description: 'Calculate Exponentially Weighted Moving Average (EWMA) control limits, centerline, and out-of-control signals for small shift SPC.',
    keywords: ['EWMA control chart calculator', 'EWMA SPC', 'exponentially weighted moving average limits', 'process shift detection', 'lambda smoothing SPC'],
    inputs: ['Observations vector X', 'Target mean μ₀', 'Process std dev σ', 'Weight λ (0.05 to 0.30)', 'Control limit factor L'],
    example: { a: ['Target μ₀ = 100.0', 'Std dev σ = 5.0', 'Weight λ = 0.20, L = 3.0'], result: 'Asymptotic limits: UCL = 105.00, LCL = 95.00. Steady-state factor = 0.3333.' },
    formula: 'Z_t = λ X_t + (1 - λ) Z_{t-1}, UCL = μ₀ + L σ √((λ / (2 - λ)) [1 - (1 - λ)^{2t}])',
    code: {
      python: `import statsmodels.api as sm\n# EWMA control limits computation`,
      r: `library(qcc)\nqcc(data, type = "ewma", lambda = 0.2)`,
      ts: `import { ewmaLimits } from '@statlab/core';\nconst { ucl, lcl } = ewmaLimits({ target: 100, sd: 5, lambda: 0.2, L: 3 });`,
    },
    useCases: [
      'Monitoring API response times for slow, gradual latency degradation over deployment builds.',
      'Detecting small drift shifts in semiconductor manufacturing processes.'
    ],
    when: 'Use when tracking continuous processes where detecting small shifts (0.5 to 1.5 standard deviations) is critical.',
    cautions: [
      'Choice of λ balances sensitivity: smaller λ detects smaller shifts but reacts slower to sudden step changes.',
      'Observations must be free of significant autocorrelation.'
    ],
    workbenchId: 'spc_ewma_chart',
  },
  {
    slug: 'p-chart-binomial-spc',
    title: 'p-chart & np-chart proportion defective SPC calculator',
    family: 'Statistical process control',
    description: 'Calculate p-chart and np-chart control limits for attribute data monitoring fraction defective in variable or constant sample sizes.',
    keywords: ['p-chart calculator', 'np-chart SPC', 'proportion defective chart', 'attribute SPC control limits', 'binomial process control'],
    inputs: ['Total inspected units N', 'Total defective units D', 'Sample subgroup size n'],
    example: { a: ['Total inspected N = 5,000 across 25 subgroups', 'Total defects D = 150', 'Subgroup size n = 200'], result: 'Average proportion p̄ = 0.0300 (3.0%). Centerline = 0.030. UCL = 0.0662, LCL = 0.0000.' },
    formula: 'p̄ = ∑ D / ∑ n, UCL = p̄ + 3 √((p̄(1 - p̄)) / n), LCL = max(0, p̄ - 3 √((p̄(1 - p̄)) / n))',
    code: {
      python: `import statsmodels.api as sm\n# p-chart computation for binomial counts`,
      r: `library(qcc)\nqcc(defects, sizes = n, type = "p")`,
      ts: `import { pChartLimits } from '@statlab/core';\nconst limits = pChartLimits(defectsArray, subgroupSizes);`,
    },
    useCases: [
      'Monitoring batch manufacturing defect rates or failed HTTP response ratios.',
      'Tracking conversion funnel drop-off rates across production web release deployments.'
    ],
    when: 'Use when monitoring the proportion of defective items per sample subgroup under binomial process assumptions.',
    cautions: [
      'Requires constant or variable known subgroup sample sizes n.',
      'If average number of defects per unit can exceed 1 per item, use c-chart or u-chart instead.'
    ],
    workbenchId: 'spc_p_chart',
  },
  {
    slug: 'c-chart-poisson-spc',
    title: 'c-chart & u-chart Poisson defect count SPC calculator',
    family: 'Statistical process control',
    description: 'Calculate c-chart and u-chart control limits for counting defects per inspection unit or area of opportunity under Poisson assumptions.',
    keywords: ['c-chart calculator', 'u-chart SPC', 'defects per unit chart', 'Poisson attribute SPC', 'defect count control limits'],
    inputs: ['Total defects C', 'Number of subgroups k', 'Subgroup area of opportunity u'],
    example: { a: ['Total defects C = 75 across k = 25 subgroups (n = 1 unit each)'], result: 'Mean defects per unit c̄ = 3.00. Centerline = 3.00. UCL = 3 + 3√3 = 8.20, LCL = 0.00.' },
    formula: 'c̄ = C / k, UCL = c̄ + 3 √c̄, LCL = max(0, c̄ - 3 √c̄)',
    code: {
      python: `import statsmodels.api as sm\n# c-chart limits for Poisson event counts`,
      r: `library(qcc)\nqcc(counts, type = "c")`,
      ts: `import { cChartLimits } from '@statlab/core';\nconst limits = cChartLimits(countsArray);`,
    },
    useCases: [
      'Monitoring code bug counts per 1,000 lines of code across software releases.',
      'Tracking surface defect counts per square meter in manufacturing QA.'
    ],
    when: 'Use when counting discrete occurrences of non-conformities (defects) per fixed inspection unit.',
    cautions: [
      'Assumes Poisson distribution where defects occur independently across space or time.',
      'If inspection unit area varies per subgroup, use the u-chart instead.'
    ],
    workbenchId: 'spc_c_chart',
  },
  {
    slug: 'median-absolute-deviation',
    title: 'Median Absolute Deviation (MAD) robust scale calculator',
    family: 'Resampling & non-parametric tests',
    description: 'Calculate Median Absolute Deviation (MAD) and normal-consistent MAD estimator for robust scale and outlier detection.',
    keywords: ['Median Absolute Deviation calculator', 'MAD robust scale', 'normal consistent MAD', 'robust outlier threshold', 'MAD formula'],
    inputs: ['Data sample vector X', 'Scale factor b (1.4826 for normal consistency)'],
    example: { a: ['Sample X: 12, 15, 14, 13, 100 (Outlier present)'], result: 'Median = 14.0, Raw MAD = 1.5, Consistent MAD (1.4826 · MAD) = 2.224. Robust to outlier.' },
    formula: 'MAD = median(|X_i - median(X)|), MAD_{\sigma} = 1.4826 · MAD',
    code: {
      python: `from scipy import stats\nmad_raw = stats.median_abs_deviation(x, scale='normal')`,
      r: `mad(x, constant = 1.4826)`,
      ts: `import { mad } from '@statlab/core';\nconst robustSd = mad([12, 15, 14, 13, 100]);`,
    },
    useCases: [
      'Setting robust outlier detection thresholds in noisy system performance telemetry.',
      'Estimating scale parameters in non-normally distributed financial returns.'
    ],
    when: 'Use when estimating data dispersion in datasets containing heavy tails or extreme outliers where standard deviation breaks down.',
    cautions: [
      'Standard deviation is heavily distorted by single extreme values; MAD has a breakdown point of 50%.',
      'Multiply by 1.4826 to estimate standard deviation under normal distribution assumptions.'
    ],
    workbenchId: 'stat_mad',
  },
  {
    slug: 'winsorized-mean-trimmed-mean',
    title: 'Trimmed mean & Winsorized variance calculator',
    family: 'Resampling & non-parametric tests',
    description: 'Calculate α-trimmed mean and Winsorized mean, variance, and robust confidence intervals for asymmetric or heavy-tailed data.',
    keywords: ['trimmed mean calculator', 'Winsorized mean calculator', 'Winsorized variance', 'robust central tendency', 'alpha trimmed mean'],
    inputs: ['Data sample vector X', 'Trim proportion α (e.g., 0.10 for 10% trim each tail)'],
    example: { a: ['Sample X: 10, 12, 14, 15, 16, 18, 20, 22, 25, 150', 'Trim α = 0.10 (1 top, 1 bottom)'], result: 'Standard Mean = 32.20, 10% Trimmed Mean = 18.25, 10% Winsorized Mean = 19.40' },
    formula: 'X̄_{tr} = (1 / (N - 2k)) ∑_{i=k+1}^{N-k} X_{(i)}, where k = ⌊N · α⌋',
    code: {
      python: `from scipy import stats\ntrimmed_m = stats.trim_mean(x, proportiontocut=0.10)\nwinsor_m = stats.mstats.winsorize(x, limits=0.10).mean()`,
      r: `mean(x, trim = 0.10)`,
      ts: `import { trimmedMean, winsorizedMean } from '@statlab/core';\nconst tm = trimmedMean(data, 0.10);`,
    },
    useCases: [
      'Reporting central tendency for microservice latency distributions without outlier distortion.',
      'Calculating robust performance benchmarks in competitive sports scoring and financial models.'
    ],
    when: 'Use when measuring location parameter while removing or capping extreme observations at tails.',
    cautions: [
      'Symmetric trimming removes equal proportions from both top and bottom tails.',
      'Always state the trim percentage α when reporting trimmed means.'
    ],
    workbenchId: 'stat_trimmed_mean',
  },
  {
    slug: 'log-rank-test-trend',
    title: 'Log-rank test for trend in survival analysis calculator',
    family: 'Survival & reliability analysis',
    description: 'Calculate Tarone log-rank test statistic and p-value for ordered dose-response trend across 3 or more survival curves.',
    keywords: ['log-rank test for trend', 'Tarone trend test', 'survival trend calculator', 'dose-response survival curve', 'ordered group survival'],
    inputs: ['Subgroup survival event times', 'Censoring indicator vector', 'Ordered group weights w_i'],
    example: { a: ['Groups 1, 2, 3 (Dose 0mg, 10mg, 50mg)', 'Total events = 85', 'Weights w = [0, 1, 5]'], result: 'Tarone Trend χ² = 7.84, df = 1, p = .0051. Significant downward hazard trend.' },
    formula: 'χ²_{trend} = ( ∑ w_i (O_i - E_i) )² / ( ∑∑ w_i w_j V_{ij} )',
    code: {
      python: `from lifelines.statistics import logrank_test\n# Custom Tarone trend test weighted sum`,
      r: `library(survival)\nsurvdiff(Surv(time, status) ~ group, data = df)`,
      ts: `import { logRankTrend } from '@statlab/core';\nconst res = logRankTrend(survivalGroups, [0, 1, 5]);`,
    },
    useCases: [
      'Evaluating dose-response survival rates in medical and toxicology trials.',
      'Testing progressive hardware degradation trends across increasing server temperature stress tiers.'
    ],
    when: 'Use when testing for a monotonic ordering trend in survival probabilities across 3 or more ordered groups.',
    cautions: [
      'Weights must reflect the ordinal or quantitative spacing between groups.',
      'Standard multi-group log-rank tests global differences; trend test specifically tests monotonic ordering.'
    ],
    workbenchId: 'survival_trend',
  },
  {
    slug: 'cox-snell-residuals',
    title: 'Cox-Snell & Martingale residuals survival fit calculator',
    family: 'Survival & reliability analysis',
    description: 'Calculate Cox-Snell residuals and cumulative hazard transformation for assessing parametric and Cox survival model goodness-of-fit.',
    keywords: ['Cox-Snell residuals calculator', 'martingale residuals', 'survival goodness of fit', 'cumulative hazard residual', 'survival model diagnostics'],
    inputs: ['Observed event times t_i', 'Censoring status δ_i', 'Estimated cumulative hazard Ĥ(t_i)'],
    example: { a: ['Observed times t = [12, 24, 36]', 'Events δ = [1, 1, 0]', 'Cum Hazard Ĥ(t) = [0.25, 0.60, 1.10]'], result: 'Cox-Snell Residuals e_i = [0.25, 0.60, 1.10]. Nelson-Aalen plot of e_i follows 45° line.' },
    formula: 'e_i = Ĥ_i(t_i; Z_i), Martingale r_i = δ_i - e_i',
    code: {
      python: `import lifelines\n# Compute Cox-Snell residuals e_i from fitted Cox model`,
      r: `library(survival)\nresiduals(fit, type = "coxsnell")`,
      ts: `import { coxSnellResiduals } from '@statlab/core';\nconst res = coxSnellResiduals(times, status, cumHazard);`,
    },
    useCases: [
      'Diagnosing functional form and overall fit of proportional hazards regression models.',
      'Detecting non-linear covariate effects in customer subscription retention models.'
    ],
    when: 'Use when verifying overall fit of a survival regression model by plotting estimated residual cumulative hazards.',
    cautions: [
      'If the model fits well, the Cox-Snell residuals should resemble a unit-exponential distribution.',
      'Censored data produces censored Cox-Snell residuals.'
    ],
    workbenchId: 'survival_cox_snell',
  },
  {
    slug: 'mcnemar-bowker-symmetry',
    title: 'McNemar-Bowker test for matrix symmetry calculator',
    family: 'Categorical & proportion tests',
    description: 'Calculate McNemar-Bowker test statistic, chi-square, degrees of freedom, and p-value for testing symmetry in k × k paired contingency tables.',
    keywords: ['McNemar-Bowker test calculator', 'matrix symmetry test', 'paired k x k table', 'Bowker test for symmetry', 'matched categorical pairs'],
    inputs: ['k × k square paired confusion matrix'],
    example: { a: ['3×3 matrix: [ [20, 5, 2], [1, 30, 8], [0, 2, 15] ]'], result: 'McNemar-Bowker χ² = 5.23, df = 3, p = .1557. Matrix displays marginal symmetry.' },
    formula: 'χ²_{MB} = ∑_{i < j} (n_{ij} - n_{ji})² / (n_{ij} + n_{ji}), df = k(k-1)/2',
    code: {
      python: `from scipy import stats\n# Custom Bowker test implementation for square matrix`,
      r: `mcnemar.test(matrix)`,
      ts: `import { mcnemarBowker } from '@statlab/core';\nconst res = mcnemarBowker(squareMatrix);`,
    },
    useCases: [
      'Testing changes in multi-category rating distributions before and after UI redesigns.',
      'Evaluating inter-rater classification bias across 3 or more categorical classes.'
    ],
    when: 'Use when analyzing paired nominal data in square k × k tables (k ≥ 3) to test if off-diagonal cells are symmetric.',
    cautions: [
      'Extension of 2×2 McNemar test to k×k matrices.',
      'Off-diagonal cell counts n_{ij} + n_{ji} should be ≥ 5 for accurate chi-square approximation.'
    ],
    workbenchId: 'cat_mcnemar_bowker',
  },
  {
    slug: 'stuart-maxwell-test',
    title: 'Stuart-Maxwell test of marginal homogeneity calculator',
    family: 'Categorical & proportion tests',
    description: 'Calculate Stuart-Maxwell test statistic and p-value for evaluating marginal homogeneity in paired k × k categorical tables.',
    keywords: ['Stuart-Maxwell test calculator', 'marginal homogeneity test', 'paired multinomial data', 'square contingency table', 'k x k marginal test'],
    inputs: ['k × k square matched pair table'],
    example: { a: ['3×3 table: [ [40, 10, 5], [4, 50, 12], [2, 6, 30] ]'], result: 'Stuart-Maxwell χ² = 4.12, df = 2, p = .1275. No significant marginal shift.' },
    formula: 'χ²_{SM} = d^T V^{-1} d, df = k - 1',
    code: {
      python: `import numpy as np\n# Stuart-Maxwell matrix quadratic form d^T V^{-1} d`,
      r: `library(DescTools)\nStuartMaxwellTest(table)`,
      ts: `import { stuartMaxwell } from '@statlab/core';\nconst res = stuartMaxwell(table3x3);`,
    },
    useCases: [
      'Testing whether overall category proportion preferences shift between baseline and follow-up surveys.',
      'Comparing multi-class prediction distributions between baseline and re-trained ML classifiers.'
    ],
    when: 'Use when testing whether row marginal proportions equal column marginal proportions in square paired tables.',
    cautions: [
      'More powerful than McNemar-Bowker when testing overall marginal shifts rather than individual cell symmetry.',
      'Requires non-singular covariance matrix V for inversion.'
    ],
    workbenchId: 'cat_stuart_maxwell',
  },
  {
    slug: 'biserial-correlation-calculator',
    title: 'Biserial correlation coefficient calculator',
    family: 'Regression & correlation',
    description: 'Calculate biserial correlation r_b estimating underlying continuous-continuous association when one variable is artificially dichotomized.',
    keywords: ['biserial correlation calculator', 'r_b correlation', 'artificially dichotomized variable', 'biserial vs point-biserial', 'item discrimination biserial'],
    inputs: ['Group 1 Mean X̄₁', 'Group 0 Mean X̄₀', 'Total Std Dev s_X', 'Proportion p in Group 1', 'Ordinate height y of normal curve'],
    example: { a: ['X̄₁ = 75.0 (Pass group, p = 0.60)', 'X̄₀ = 62.0 (Fail group, q = 0.40)', 'Std Dev s_X = 12.0', 'Normal ordinate y = 0.3863'], result: 'Point-Biserial r_{pb} = 0.531, Biserial Correlation r_b = (0.531 · √0.24) / 0.3863 = 0.673' },
    formula: 'r_b = ( (X̄₁ - X̄₀) / s_X ) · (p q / y), where y is normal density at z_p',
    code: {
      python: `from scipy import stats\n# Biserial correlation formula`,
      r: `library(ltm)\nbiserial.cor(x, group)`,
      ts: `import { biserialCorr } from '@statlab/core';\nconst rb = biserialCorr(group1Mean, group0Mean, totalSd, prop1);`,
    },
    useCases: [
      'Evaluating test item discrimination where continuous ability is split into Pass/Fail categories.',
      'Estimating true underlying performance correlation when binary thresholding is applied to continuous measurements.'
    ],
    when: 'Use when one variable is continuous and the other is binary but assumed to represent an underlying continuous normal trait.',
    cautions: [
      'Biserial correlation r_b can exceed 1.0 if normality assumption is violated.',
      'Do not confuse with Point-Biserial correlation r_{pb}, which measures association with a naturally discrete binary variable.'
    ],
    workbenchId: 'corr_biserial',
  },
  {
    slug: 'tetrachoric-correlation-calculator',
    title: 'Tetrachoric correlation coefficient calculator',
    family: 'Regression & correlation',
    description: 'Calculate tetrachoric correlation r_{tet} estimating latent bivariate normal correlation between two artificially dichotomized binary variables.',
    keywords: ['tetrachoric correlation calculator', 'r_tet correlation', 'bivariate normal binary correlation', '2x2 dichotomized correlation', 'psychometric tetrachoric'],
    inputs: ['2×2 contingency table frequencies [a, b, c, d]'],
    example: { a: ['2×2 table: a=40 (1,1), b=10 (1,0), c=10 (0,1), d=40 (0,0)'], result: 'Cosine approximation r_{tet} ≈ cos(π / (1 + √(ad/bc))) = 0.707. Latent correlation r_{tet} = 0.709.' },
    formula: 'r_{tet} ≈ cos( π / (1 + √( (a · d) / (b · c) )) )',
    code: {
      python: `import pingouin as pg # or statsmodels tetrachoric\n# Compute tetrachoric correlation from 2x2 matrix`,
      r: `library(psych)\ntetrachoric(matrix)$rho`,
      ts: `import { tetrachoricCorr } from '@statlab/core';\nconst r = tetrachoricCorr([40, 10, 10, 40]);`,
    },
    useCases: [
      'Estimating latent trait correlation between two binary exam questions or survey items.',
      'Constructing input correlation matrices for Factor Analysis (EFA/CFA) on binary survey data.'
    ],
    when: 'Use when two binary variables are assumed to arise from underlying continuous bivariate normal distributions.',
    cautions: [
      'Assumes bivariate normal latent distribution.',
      'Highly sensitive to zero cell counts in 2×2 table; apply 0.5 continuity correction if cells are empty.'
    ],
    workbenchId: 'corr_tetrachoric',
  },
  {
    slug: 'polychoric-correlation-calculator',
    title: 'Polychoric correlation matrix calculator',
    family: 'Regression & correlation',
    description: 'Calculate polychoric correlation coefficients and threshold parameters for ordinal Likert item pairs in psychometrics and structural equation modeling.',
    keywords: ['polychoric correlation calculator', 'ordinal correlation matrix', 'Likert scale correlation', 'polychoric factor analysis', 'threshold estimation'],
    inputs: ['Ordinal 2D contingency matrix between two Likert items'],
    example: { a: ['5×5 Likert rating cross-tabulation table', 'N = 300 respondents'], result: 'Polychoric correlation ρ = 0.642 (Std Error = 0.038). Latent bivariate normal fit p = .412.' },
    formula: 'Maximizes bivariate normal log-likelihood L(ρ, τ_x, τ_y) over threshold cuts τ',
    code: {
      python: `from statsmodels.graphics.agreement import mean_diff_plot # or polycor wrapper\n# Compute ML polychoric correlation`,
      r: `library(polycor)\npolychor(x, y)`,
      ts: `import { polychoricCorr } from '@statlab/core';\nconst rho = polychoricCorr(contingencyTable);`,
    },
    useCases: [
      'Building input correlation matrices for Exploratory Factor Analysis (EFA) on 5-point Likert survey responses.',
      'Estimating true latent item associations in psychometric item bank development.'
    ],
    when: 'Use when measuring association between two ordinal variables assumed to represent discretized continuous normal traits.',
    cautions: [
      'Standard Pearson correlation underestimates association strength when applied to ordinal Likert scales.',
      'Requires iterative maximum likelihood numerical optimization.'
    ],
    workbenchId: 'corr_polychoric',
  },
  {
    slug: 'guttman-scale-reproducibility',
    title: 'Guttman scale reproducibility & scalability calculator',
    family: 'Psychometrics & scale analysis',
    description: 'Calculate Guttman scale Coefficient of Reproducibility (C_R), Minimum Marginal Reproducibility (MMR), and Coefficient of Scalability (C_S).',
    keywords: ['Guttman scale calculator', 'Coefficient of Reproducibility', 'Coefficient of Scalability', 'Guttman error count', 'cumulative scale analysis'],
    inputs: ['N subjects × k items binary response matrix'],
    example: { a: ['100 respondents × 5 cumulative items matrix', 'Total non-Guttman error count e = 25'], result: 'C_R = 1 - 25/(100·5) = 0.950, MMR = 0.680, C_S = (0.950 - 0.680)/(1 - 0.680) = 0.844. Valid unidimensional scale.' },
    formula: 'C_R = 1 - (e / (N · k)), C_S = (C_R - MMR) / (1 - MMR)',
    code: {
      python: `import numpy as np\n# Compute Guttman errors e by sorting rows and columns`,
      r: `library(mokken)\n# Mokken scale Loevinger H / Guttman analysis`,
      ts: `import { guttmanScale } from '@statlab/core';\nconst { cr, cs } = guttmanScale(binaryMatrix);`,
    },
    useCases: [
      'Validating cumulative hierarchical survey scales where endorsing a hard item implies endorsing easier items.',
      'Assessing feature difficulty hierarchy in educational testing and skill assessment.'
    ],
    when: 'Use when testing if a set of binary survey items forms a strictly ordered unidimensional cumulative scale.',
    cautions: [
      'Scale is considered valid if C_R ≥ 0.90 and C_S ≥ 0.60.',
      'High C_R can occur artificially if item endorsement rates are extreme (very high or very low); always evaluate C_S.'
    ],
    workbenchId: 'scale_guttman',
  },
  {
    slug: 'bhattacharyya-distance-calculator',
    title: 'Bhattacharyya distance & coefficient calculator',
    family: 'Vector distances & embedding metrics',
    description: 'Calculate Bhattacharyya distance D_B and Bhattacharyya coefficient BC for measuring probability distribution overlap and class separability.',
    keywords: ['Bhattacharyya distance calculator', 'Bhattacharyya coefficient', 'distribution overlap metric', 'class separability distance', 'multivariate Gaussian distance'],
    inputs: ['Mean vector μ₁, μ₂', 'Covariance matrices Σ₁, Σ₂'],
    example: { a: ['μ₁ = 0.0, σ₁² = 1.0', 'μ₂ = 2.0, σ₂² = 1.5'], result: 'Bhattacharyya Coefficient BC = 0.584, Bhattacharyya Distance D_B = -ln(0.584) = 0.538' },
    formula: 'D_B = (1/8)(μ₂-μ₁)^T Σ^{-1}(μ₂-μ₁) + (1/2)ln(|Σ| / √(|Σ₁||Σ₂|)), where Σ = (Σ₁ + Σ₂)/2',
    code: {
      python: `import numpy as np\n# Bhattacharyya distance for Gaussian distributions`,
      r: `library(fpc)\n# Compute Bhattacharyya distance between multivariate normal clusters`,
      ts: `import { bhattacharyyaDistance } from '@statlab/core';\nconst db = bhattacharyyaDistance({ mean: 0, sd: 1 }, { mean: 2, sd: 1.22 });`,
    },
    useCases: [
      'Measuring feature separability between target classes in machine learning classification.',
      'Evaluating signal distribution shift between baseline telemetry and anomalous production streams.'
    ],
    when: 'Use when computing similarity or distance between two continuous probability distributions.',
    cautions: [
      'Bounds Mahalanobis distance by incorporating covariance scale differences.',
      'Directly related to the Bayes error rate bound in pattern classification.'
    ],
    workbenchId: 'dist_bhattacharyya',
  },
  {
    slug: 'hellinger-distance-calculator',
    title: 'Hellinger distance probability distribution calculator',
    family: 'Vector distances & embedding metrics',
    description: 'Calculate Hellinger distance H(P,Q) measuring similarity between two discrete or continuous probability distributions.',
    keywords: ['Hellinger distance calculator', 'Hellinger probability distance', 'distribution similarity metric', 'bounded probability metric', 'Hellinger divergence'],
    inputs: ['Probability vector P', 'Probability vector Q'],
    example: { a: ['Distribution P = [0.4, 0.3, 0.3]', 'Distribution Q = [0.1, 0.5, 0.4]'], result: 'Hellinger Distance H(P,Q) = 0.284 (Range 0 to 1). H² = 0.0807.' },
    formula: 'H(P,Q) = (1/√2) √( ∑ (√p_i - √q_i)² ) = √( 1 - ∑ √(p_i q_i) )',
    code: {
      python: `import numpy as np\nhellinger = np.sqrt(0.5 * np.sum((np.sqrt(P) - np.sqrt(Q))**2))`,
      r: `library(statmatch)\n# Hellinger distance calculation`,
      ts: `import { hellingerDistance } from '@statlab/core';\nconst h = hellingerDistance(P, Q);`,
    },
    useCases: [
      'Quantifying data drift between training distribution P and inference telemetry Q in MLOps.',
      'Measuring probability calibration discrepancy in machine learning classifiers.'
    ],
    when: 'Use when evaluating probability distribution difference using a metric that obeys triangle inequality and is bounded between 0 and 1.',
    cautions: [
      'Hellinger distance is symmetric: H(P,Q) = H(Q,P).',
      'Unlike KL-divergence, Hellinger distance is bounded: 0 ≤ H ≤ 1.'
    ],
    workbenchId: 'dist_hellinger',
  },
  {
    slug: 'interquartile-range-iqr',
    title: 'Interquartile Range (IQR) & boxplot fence calculator',
    family: 'Resampling & non-parametric tests',
    description: 'Calculate Q1 (25th percentile), Q3 (75th percentile), Interquartile Range (IQR), quartile deviation, and inner/outer Tukey boxplot outlier fences.',
    keywords: ['Interquartile Range calculator', 'IQR calculator', 'Tukey boxplot fence', 'quartile deviation', 'outlier fence calculation'],
    inputs: ['Numeric data vector X', 'Percentile method (Type 7 default R/Python)'],
    example: { a: ['Sample X: 5, 12, 15, 18, 20, 22, 25, 28, 30, 85 (Outlier)'], result: 'Q1 = 14.25, Q3 = 28.50, IQR = 14.25. Upper Fence (Q3 + 1.5·IQR) = 49.88. Value 85 is an outlier.' },
    formula: 'IQR = Q3 - Q1, Lower Fence = Q1 - 1.5 · IQR, Upper Fence = Q3 + 1.5 · IQR',
    code: {
      python: `import numpy as np\nq1, q3 = np.percentile(x, [25, 75])\niqr = q3 - q1`,
      r: `IQR(x)`,
      ts: `import { iqr } from '@statlab/core';\nconst { q1, q3, iqrValue, fences } = iqr(dataArray);`,
    },
    useCases: [
      'Setting robust automated outlier thresholds for API latency metrics.',
      'Summarizing skewed continuous distributions in statistical reporting.'
    ],
    when: 'Use when measuring middle 50% data spread for non-normally distributed or skewed data.',
    cautions: [
      'Different software uses different quantile definitions (Type 6 vs Type 7 vs Hyndman-Fan).',
      'Values beyond Q3 + 3·IQR are classified as extreme outliers.'
    ],
    workbenchId: 'stat_iqr',
  },
  {
    slug: 'bowley-skewness-calculator',
    title: 'Bowley & Kelly quartile skewness calculator',
    family: 'Resampling & non-parametric tests',
    description: 'Calculate Bowley quartile skewness coefficient (Galton skewness) and Kelly percentile skewness for robust distribution asymmetry measurement.',
    keywords: ['Bowley skewness calculator', 'quartile skewness', 'Galton skewness', 'Kelly percentile skewness', 'robust skewness metric'],
    inputs: ['Quartiles Q1, Q2 (Median), Q3', 'Percentiles P10, P50, P90 (Optional for Kelly)'],
    example: { a: ['Q1 = 12.0', 'Q2 (Median) = 15.0', 'Q3 = 24.0'], result: 'Bowley Skewness S_B = ((24 - 15) - (15 - 12)) / (24 - 12) = (9 - 3)/12 = +0.500 (Right-skewed).' },
    formula: 'S_B = (Q3 + Q1 - 2 Q2) / (Q3 - Q1), Range -1 to +1',
    code: {
      python: `from scipy import stats\n# Bowley skewness computed from percentiles`,
      r: `library(e1071)\n# Quartile skewness implementation`,
      ts: `import { bowleySkewness } from '@statlab/core';\nconst sb = bowleySkewness(q1, q2, q3);`,
    },
    useCases: [
      'Evaluating skewness in heavy-tailed distribution telemetry where 3rd sample moments are unstable.',
      'Assessing asymmetry in ordinal survey rating distributions.'
    ],
    when: 'Use when measuring distribution skewness in datasets containing extreme outliers that distort traditional moment-based skewness.',
    cautions: [
      'Bowley skewness ranges between -1 (extreme left skew) and +1 (extreme right skew).',
      'Does not depend on extreme tail values beyond Q1 and Q3.'
    ],
    workbenchId: 'stat_bowley_skew',
  },
  {
    slug: 'kurtosis-calculator',
    title: 'Excess kurtosis & 4th moment calculator',
    family: 'Resampling & non-parametric tests',
    description: 'Calculate sample kurtosis, excess kurtosis (γ₂), standard error, and Jarque-Bera normality test component.',
    keywords: ['kurtosis calculator', 'excess kurtosis', 'leptokurtic platykurtic', '4th standardized moment', 'tail heaviness metric'],
    inputs: ['Numeric data vector X', 'Bias correction flag (Sample vs Population)'],
    example: { a: ['Sample X: 10, 11, 12, 12, 13, 13, 14, 15, 25, 30'], result: 'Kurtosis = 5.24, Excess Kurtosis = +2.24 (Leptokurtic / Heavy-tailed).' },
    formula: 'g₂ = (m₄ / s⁴) - 3, G₂ = ((N+1)g₂ + 6) · (N-1) / ((N-2)(N-3))',
    code: {
      python: `from scipy import stats\nexcess_k = stats.kurtosis(x, fisher=True)`,
      r: `library(e1071)\nkurtosis(x, type = 2)`,
      ts: `import { excessKurtosis } from '@statlab/core';\nconst ek = excessKurtosis(dataArray);`,
    },
    useCases: [
      'Assessing tail latency risk in cloud infrastructure SLA benchmarking.',
      'Testing asset return distributions for fat-tail risk in financial engineering.'
    ],
    when: 'Use when quantifying the heaviness of distribution tails and peak sharpness relative to a normal distribution.',
    cautions: [
      'Normal distribution has kurtosis = 3 (excess kurtosis = 0).',
      'Leptokurtic (>0) indicates fat tails; Platykurtic (<0) indicates thin tails.'
    ],
    workbenchId: 'stat_kurtosis',
  },
  {
    slug: 'zero-inflated-poisson-zip',
    title: 'Zero-Inflated Poisson (ZIP) mixture model calculator',
    family: 'Probability distributions',
    description: 'Calculate Zero-Inflated Poisson (ZIP) mixture probabilities P(Y = k), structural zero probability π, and Poisson rate λ.',
    keywords: ['Zero Inflated Poisson calculator', 'ZIP model probability', 'structural zeros', 'overdispersed count mixture', 'zero inflated regression'],
    inputs: ['Structural zero probability π (0 to 1)', 'Poisson rate λ', 'Observed count k'],
    example: { a: ['Structural zero π = 0.30 (30% mandatory zeros)', 'Poisson rate λ = 2.5', 'Observed count k = 0'], result: 'P(Y = 0) = 0.30 + (1 - 0.70)·e^{-2.5} = 0.30 + 0.70(0.0821) = 0.3575. For k=2: P(Y=2) = 0.1804.' },
    formula: 'P(Y = 0) = π + (1 - π) e^{-λ}, P(Y = k) = (1 - π) (λ^k e^{-λ} / k!) for k > 0',
    code: {
      python: `import statsmodels.api as sm\n# ZeroInflatedPoisson model estimation`,
      r: `library(pscl)\nzeroinfl(count ~ 1, dist = "poisson")`,
      ts: `import { zipPmf } from '@statlab/core';\nconst p = zipPmf(k, { pi: 0.30, lambda: 2.5 });`,
    },
    useCases: [
      'Modeling customer defect or crash event counts where many users experience zero crashes.',
      'Analyzing healthcare utilization rates containing structural non-users.'
    ],
    when: 'Use when count data contains an excess of zeros beyond what a standard Poisson distribution can account for.',
    cautions: [
      'Distinguishes structural zeros (always 0) from sampling zeros (Poisson 0).',
      'If variance still exceeds mean after accounting for structural zeros, use Zero-Inflated Negative Binomial (ZINB).'
    ],
    workbenchId: 'dist_zip',
  },
  {
    slug: 'log-gamma-distribution',
    title: 'Log-Gamma distribution PDF & CDF calculator',
    family: 'Probability distributions',
    description: 'Calculate Log-Gamma distribution PDF, CDF, survival probability, and quantiles for heavy-tailed loss and reliability modeling.',
    keywords: ['log-gamma distribution calculator', 'log gamma PDF', 'heavy tail loss distribution', 'log gamma CDF', 'extreme value log gamma'],
    inputs: ['Shape parameter k', 'Scale parameter θ', 'Value x (where y = ln(x))'],
    example: { a: ['Shape k = 3.0', 'Scale θ = 1.5', 'Value x = 10.0 (y = ln(10) = 2.3026)'], result: 'PDF f(10) = 0.0412, Cumulative P(X ≤ 10) = 0.7981, Survival P(X > 10) = 0.2019' },
    formula: 'If Y = ln(X) ~ Gamma(k, θ), then f(x) = (x^{(1/θ)-1} (ln x)^{k-1}) / (θ^k Γ(k) x)',
    code: {
      python: `from scipy import stats\nprob = stats.loggamma.cdf(np.log(10.0), c=3.0)`,
      r: `library(actuar)\nplgamma(10.0, shapelog = 3.0, scalelog = 1.5)`,
      ts: `import { logGammaCdf } from '@statlab/core';\nconst cdf = logGammaCdf(10.0, { shape: 3.0, scale: 1.5 });`,
    },
    useCases: [
      'Modeling extreme financial loss sizes in risk management.',
      'Evaluating heavy-tailed execution time limits in high-throughput data processing systems.'
    ],
    when: 'Use when modeling variables whose logarithm follows a Gamma distribution.',
    cautions: [
      'Exhibits extremely heavy right tails.',
      'Defined strictly for x > 1 when log(x) > 0.'
    ],
    workbenchId: 'dist_log_gamma',
  },
  {
    slug: 'maxwell-boltzmann-distribution',
    title: 'Maxwell-Boltzmann molecular speed distribution calculator',
    family: 'Probability distributions',
    description: 'Calculate Maxwell-Boltzmann molecular speed PDF, CDF, most probable speed (v_mp), mean speed (v_avg), and root-mean-square speed (v_rms).',
    keywords: ['Maxwell Boltzmann distribution calculator', 'most probable speed', 'rms speed calculator', 'thermal speed distribution', 'kinetic theory velocity'],
    inputs: ['Temperature T (Kelvin)', 'Molar mass M (kg/mol)', 'Particle speed v (m/s)'],
    example: { a: ['Temperature T = 300 K (N₂ gas, M = 0.028 kg/mol)', 'Speed v = 500 m/s'], result: 'v_mp = 422.1 m/s, v_avg = 476.3 m/s, v_rms = 517.0 m/s. P(V ≤ 500 m/s) = 0.5985.' },
    formula: 'f(v) = 4π (M / (2π R T))^{3/2} v² e^{-M v² / (2 R T)}, v_{mp} = √(2RT/M), v_{rms} = √(3RT/M)',
    code: {
      python: `from scipy import stats\n# Maxwell speed distribution in SciPy\nres = stats.maxwell.cdf(500, scale=np.sqrt(8.314*300/0.028))`,
      r: `library(statmod)\n# Maxwell distribution CDF`,
      ts: `import { maxwellSpeed } from '@statlab/core';\nconst stats = maxwellSpeed({ T: 300, M: 0.028, v: 500 });`,
    },
    useCases: [
      'Modeling thermal particle velocity distributions in physics and semiconductor simulations.',
      'Evaluating packet arrival speed variations in network simulation testbeds.'
    ],
    when: 'Use when computing particle speed statistics in ideal gases under thermal equilibrium.',
    cautions: [
      'Requires temperature in Kelvin (K) and molar mass in kg/mol.',
      'Note that v_mp < v_avg < v_rms due to right-skewness.'
    ],
    workbenchId: 'dist_maxwell',
  },
  {
    slug: 'welch-power-calculator',
    title: 'Welch t-test statistical power & sample size ratio calculator',
    family: 'Power & sample size',
    description: 'Calculate statistical power (1 - β) and required sample size ratio for Welch t-tests under unequal group sample sizes and variances.',
    keywords: ['Welch t-test power calculator', 'unequal variance power', 'sample size ratio Welch', 'Welch t-test sample size', 'statistical power heteroscedastic'],
    inputs: ['Effect size δ (difference in means)', 'Std dev σ₁, σ₂', 'Sample sizes n₁, n₂', 'Significance level α'],
    example: { a: ['Delta μ₁ - μ₂ = 5.0', 'σ₁ = 8.0, σ₂ = 14.0', 'n₁ = 40, n₂ = 60', 'α = 0.05'], result: 'Welch df ≈ 90.4, Non-centrality δ = 2.45. Statistical Power (1 - β) = 0.686 (68.6%).' },
    formula: 'df_{welch} = (s₁²/n₁ + s₂²/n₂)² / [ (s₁²/n₁)²/(n₁-1) + (s₂²/n₂)²/(n₂-1) ], Power = 1 - T_{df, nc}(t_{crit})',
    code: {
      python: `from statsmodels.stats.power import tt_ind_solve_power\n# Compute power for heteroscedastic two-sample t-test`,
      r: `library(pwr)\npwr.t2n.test(n1 = 40, n2 = 60, d = 0.44, sig.level = 0.05)`,
      ts: `import { welchPower } from '@statlab/core';\nconst pwr = welchPower({ delta: 5, sd1: 8, sd2: 14, n1: 40, n2: 60, alpha: 0.05 });`,
    },
    useCases: [
      'Designing A/B experiments where control and treatment groups have different variance profiles.',
      'Calculating minimum detectable effect sizes for unbalanced microservice performance benchmarks.'
    ],
    when: 'Use when planning sample sizes or computing retrospective power for two-sample t-tests with unequal variances.',
    cautions: [
      'Standard Student t-test power formulas overestimate power if group 1 has higher variance and smaller sample size.',
      'Target statistical power of 0.80 (80%) is standard for experimental design.'
    ],
    workbenchId: 'power_welch',
  },
  {
    slug: 'cohen-w-chi-square-effect',
    title: "Cohen's w effect size calculator for chi-square tests",
    family: 'Categorical & proportion tests',
    description: "Calculate Cohen's w effect size metric for chi-square goodness-of-fit and independence tests from observed/expected tables or chi-square statistics.",
    keywords: ["Cohen's w effect size calculator", 'chi-square effect size', 'Cohen w formula', 'contingency table effect size', 'cramer v vs cohen w'],
    inputs: ['Chi-square statistic χ²', 'Total sample size N (or Observed/Expected frequency matrices)'],
    example: { a: ['Chi-Square χ² = 12.50', 'Total sample size N = 200'], result: "Cohen's w = √(12.50 / 200) = √0.0625 = 0.250. Medium effect size (0.10 small, 0.30 medium, 0.50 large)." },
    formula: 'w = √( χ² / N ) = √( ∑ (P_{obs,i} - P_{exp,i})² / P_{exp,i} )',
    code: {
      python: `import numpy as np\nw = np.sqrt(chi2 / N)`,
      r: `library(rstatix)\nchisq_effect_size(table, type = "w")`,
      ts: `import { cohenW } from '@statlab/core';\nconst w = cohenW(chi2, N);`,
    },
    useCases: [
      'Reporting standardized effect sizes for categorical chi-square tests in APA publications.',
      'Calculating sample size requirements for contingency table experiments.'
    ],
    when: 'Use when measuring standardized magnitude of association or discrepancy in chi-square tests.',
    cautions: [
      "Cohen's w thresholds: 0.10 = Small, 0.30 = Medium, 0.50 = Large.",
      "For k × m tables with k, m > 2, Cramer's V is often preferred as it is bounded between 0 and 1."
    ],
    workbenchId: 'cat_cohen_w',
  },
  {
    slug: 'cohen-f2-regression-effect',
    title: "Cohen's f² effect size calculator for multiple regression",
    family: 'Regression & correlation',
    description: "Calculate Cohen's f² effect size metric for overall multiple regression (R²) and hierarchical regression model R² change.",
    keywords: ["Cohen's f2 effect size calculator", 'regression effect size', 'f2 formula regression', 'R2 change effect size', 'hierarchical regression f2'],
    inputs: ['Full model R² (or R² change ΔR²)', 'Reduced model R²_A (optional for hierarchical)'],
    example: { a: ['Full Model R² = 0.35', 'Reduced Model R² = 0.25 (ΔR² = 0.10)'], result: 'Overall f² = 0.35 / (1 - 0.35) = 0.538 (Large). Hierarchical f² = 0.10 / (1 - 0.35) = 0.154 (Medium).' },
    formula: 'Overall f² = R² / (1 - R²), Hierarchical f² = (R²_{full} - R²_{reduced}) / (1 - R²_{full})',
    code: {
      python: `f2_overall = r2 / (1 - r2)\nf2_change = (r2_full - r2_red) / (1 - r2_full)`,
      r: `f2 <- r2 / (1 - r2)`,
      ts: `import { cohenF2 } from '@statlab/core';\nconst f2 = cohenF2(r2Full, r2Reduced);`,
    },
    useCases: [
      'Reporting standardized effect size magnitude for linear regression models in empirical papers.',
      'Determining statistical power and sample size for hierarchical block regression additions.'
    ],
    when: 'Use when quantifying local or global effect size in multiple linear regression models.',
    cautions: [
      "Cohen's f² benchmarks: 0.02 = Small, 0.15 = Medium, 0.35 = Large.",
      'Hierarchical f² measures incremental variance explained by a set of predictors over baseline controls.'
    ],
    workbenchId: 'reg_cohen_f2',
  },
  {
    slug: 'dunnett-test-control',
    title: "Dunnett's t-test post-hoc control group calculator",
    family: 'ANOVA & factorial analysis',
    description: "Calculate Dunnett's t-statistic, critical values, and adjusted p-values for comparing multiple treatment groups against a single control group.",
    keywords: ["Dunnett test calculator", 'Dunnett t statistic', 'many-to-one comparison', 'post hoc control test', 'Dunnett critical value'],
    inputs: ['Control group mean X̄_0, n_0', 'Treatment group mean X̄_i, n_i', 'Pooled Mean Square Error MSE', 'Total error df'],
    example: { a: ['Control X̄_0 = 50.0 (n_0 = 20)', 'Treatment X̄_1 = 58.5 (n_1 = 20)', 'MSE = 25.0, Error df = 76'], result: 'Dunnett t = (58.5 - 50.0) / √(25.0·(1/20 + 1/20)) = 8.5 / 1.581 = 5.37, p < .0001. Significant vs control.' },
    formula: 'd = (X̄_i - X̄_0) / √( MSE · (1/n_i + 1/n_0) ), compared against Dunnett multivariate t CDF',
    code: {
      python: `from scipy import stats # or statsmodels Dunnett\n# Compute Dunnett many-to-one t-test`,
      r: `library(multcomp)\nglht(fit, linfct = mcp(group = "Dunnett"))`,
      ts: `import { dunnettTest } from '@statlab/core';\nconst res = dunnettTest(controlData, [treatment1, treatment2], { mse: 25.0, df: 76 });`,
    },
    useCases: [
      'Comparing multiple new API caching configurations against the baseline production control.',
      'Evaluating multiple drug treatment dosages against a placebo control group.'
    ],
    when: 'Use when performing post-hoc pairwise comparisons of several treatment groups against a single control group after ANOVA.',
    cautions: [
      "Dunnett's test maintains lower false positive rates than Tukey HSD because it only tests k-1 comparisons instead of all k(k-1)/2 pairs.",
      'Control group size n_0 should ideally be larger than individual treatment group sizes.'
    ],
    workbenchId: 'anova_dunnett',
  },
  {
    slug: 'logistic-regression-odds-ratio',
    title: 'Logistic regression log-odds to Odds Ratio (OR) calculator',
    family: 'Regression & correlation',
    description: 'Calculate Odds Ratios (OR), Wald z-statistics, p-values, and 95% profile-likelihood confidence intervals from logistic regression log-odds coefficients.',
    keywords: ['logistic regression odds ratio', 'log odds to odds ratio', 'logistic OR confidence interval', 'logit coefficient conversion', 'logistic regression CI'],
    inputs: ['Logit coefficient β', 'Standard Error SE(β)', 'Predictor step size Δx (default 1.0)'],
    example: { a: ['Coefficient β = 0.693', 'SE(β) = 0.200', 'Step Δx = 1.0'], result: 'Odds Ratio OR = e^0.693 = 2.000 (95% CI: 1.352 – 2.959), Wald z = 3.465, p = .0005' },
    formula: 'OR = e^{β · Δx}, 95% CI = e^{β · Δx ± 1.96 · SE(β) · Δx}',
    code: {
      python: `import numpy as np\nor_val = np.exp(beta)\nci = np.exp([beta - 1.96*se, beta + 1.96*se])`,
      r: `exp(cbind(OR = coef(fit), confint(fit)))`,
      ts: `import { logitOddsRatio } from '@statlab/core';\nconst res = logitOddsRatio({ beta: 0.693, se: 0.200 });`,
    },
    useCases: [
      'Interpreting machine learning logistic regression model feature weights as multiplicative odds shifts.',
      'Quantifying customer conversion probability changes per unit increase in product activity.'
    ],
    when: 'Use when converting binary outcome logistic regression coefficients into interpretable odds ratios.',
    cautions: [
      'An OR of 1.0 represents no effect (equal odds). OR > 1 indicates positive association; OR < 1 indicates negative association.',
      'Odds ratios do not equal relative risk unless the outcome event is rare (< 10% baseline incidence).'
    ],
    workbenchId: 'reg_logit_or',
  },
  {
    slug: 'cooks-distance-outliers',
    title: "Cook's distance & leverage regression diagnostic calculator",
    family: 'Statistical diagnostics & outlier tests',
    description: "Calculate Cook's Distance (D_i), leverage (h_ii), and standardized residuals for identifying influential observations in linear regression.",
    keywords: ["Cook's distance calculator", 'regression leverage h_ii', 'influential observation test', 'regression outlier diagnostic', 'Cooks D threshold'],
    inputs: ['Standardized residual e_i', 'Leverage value h_ii', 'Number of predictors p', 'Sample size N'],
    example: { a: ['Standardized residual e_i = 3.20', 'Leverage h_ii = 0.25', 'Predictors p = 3', 'Sample N = 50'], result: "Cook's Distance D_i = (3.20² / (3+1)) · (0.25 / (1 - 0.25)) = 2.560 · 0.333 = 0.853. Exceeds F_0.50 threshold." },
    formula: 'D_i = (e_i² / (p + 1)) · (h_{ii} / (1 - h_{ii}))',
    code: {
      python: `import statsmodels.api as sm\ninfluence = fit.get_influence()\ncooks_d = influence.cooks_distance[0]`,
      r: `cooks.distance(fit)`,
      ts: `import { cooksDistance } from '@statlab/core';\nconst d = cooksDistance({ stdResidual: 3.20, leverage: 0.25, p: 3 });`,
    },
    useCases: [
      'Detecting single influential data points that exert disproportionate leverage on regression slope estimates.',
      'Cleaning telemetry dataset training data prior to deploying predictive regression models.'
    ],
    when: 'Use when auditing linear regression models for individual observations that heavily alter parameter estimates.',
    cautions: [
      "Cook's D values > 1.0 (or > 4/N) warrant investigation as potentially high-influence observations.",
      'High leverage does not necessarily mean an observation is an outlier; it must also have a large residual.'
    ],
    workbenchId: 'diag_cooks_d',
  },
  {
    slug: 'breusch-pagan-test',
    title: 'Breusch-Pagan & Koenker test for heteroscedasticity calculator',
    family: 'Statistical diagnostics & outlier tests',
    description: 'Calculate Breusch-Pagan and Koenker (studentized) Lagrange multiplier test statistics for non-constant variance in regression residuals.',
    keywords: ['Breusch-Pagan test calculator', 'Koenker test heteroscedasticity', 'heteroskedasticity test', 'LM test constant variance', 'BP test regression'],
    inputs: ['Squared OLS residuals e_i²', 'Fitted values Ŷ_i (or auxiliary regression explanatory matrix X)', 'Sample size N'],
    example: { a: ['Sample N = 100', 'Auxiliary regression R²_aux = 0.125', 'Predictor count p = 2'], result: 'Breusch-Pagan LM χ² = 100 · 0.125 = 12.50, df = 2, p = .0019. Significant heteroscedasticity present.' },
    formula: 'LM = N · R²_{auxiliary}, evaluated against Chi-Square distribution with p df',
    code: {
      python: `from statsmodels.stats.diagnostic import het_breuschpagan\nlm, pval, fval, f_pval = het_breuschpagan(fit.resid, fit.model.exog)`,
      r: `library(lmtest)\nbptest(fit)`,
      ts: `import { breuschPagan } from '@statlab/core';\nconst res = breuschPagan(residuals, exogMatrix);`,
    },
    useCases: [
      'Testing if regression error variance increases with larger predicted values or system load.',
      'Determining whether heteroscedasticity-robust standard errors (HC1/HC3) are required.'
    ],
    when: 'Use when testing OLS regression assumption of homoscedasticity (constant residual variance).',
    cautions: [
      'Original Breusch-Pagan test assumes normal residuals; use the studentized Koenker version if residuals are non-normal.',
      'Heteroscedasticity leaves OLS coefficients unbiased but invalidates standard errors and p-values.'
    ],
    workbenchId: 'diag_breusch_pagan',
  },
  {
    slug: 'white-test-heteroscedasticity',
    title: "White's test for general heteroscedasticity calculator",
    family: 'Statistical diagnostics & outlier tests',
    description: "Calculate White's test statistic (Lagrange Multiplier) testing non-linear and cross-product heteroscedasticity in regression residuals.",
    keywords: ["White's test calculator", 'White heteroscedasticity test', 'non linear variance test', 'regression error variance test', 'White LM test'],
    inputs: ['OLS residuals e_i', 'Full predictor matrix X including squares X_j² and cross-products X_j X_k'],
    example: { a: ['Sample N = 150', 'Auxiliary regression with squares R²_aux = 0.180', 'Auxiliary terms k = 5'], result: "White's LM χ² = 150 · 0.180 = 27.00, df = 5, p = .0001. Heteroscedasticity confirmed." },
    formula: 'LM = N · R²_{aux}, evaluated against Chi-Square with df equal to number of unique auxiliary terms',
    code: {
      python: `from statsmodels.stats.diagnostic import het_white\nlm, pval, fval, f_pval = het_white(fit.resid, fit.model.exog)`,
      r: `library(lmtest)\nbptest(fit, ~ fitted(fit) + I(fitted(fit)^2))`,
      ts: `import { whiteTest } from '@statlab/core';\nconst res = whiteTest(residuals, exogMatrix);`,
    },
    useCases: [
      'Testing OLS error variance stability against unknown non-linear functions of explanatory variables.',
      'Validating financial volatility regression model assumptions.'
    ],
    when: 'Use when testing for general heteroscedasticity without assuming a specific linear functional form for variance.',
    cautions: [
      "White's test can consume many degrees of freedom if the model has many predictors.",
      'Can also detect model specification errors (omitted non-linear terms) rather than pure heteroscedasticity.'
    ],
    workbenchId: 'diag_white_test',
  },
  {
    slug: 'goldfeld-quandt-test',
    title: 'Goldfeld-Quandt variance ratio test calculator',
    family: 'Statistical diagnostics & outlier tests',
    description: 'Calculate Goldfeld-Quandt F-test ratio comparing residual variance between low-value and high-value subgroup samples.',
    keywords: ['Goldfeld-Quandt test calculator', 'GQ test heteroscedasticity', 'variance ratio test regression', 'subgroup variance comparison', 'GQ test formula'],
    inputs: ['Low subgroup sum of squared errors SSE₁ (df₁)', 'High subgroup sum of squared errors SSE₂ (df₂)', 'Omitted central observations c'],
    example: { a: ['Subgroup 1 (Low X) SSE₁ = 45.0 (df₁ = 35)', 'Subgroup 2 (High X) SSE₂ = 180.0 (df₂ = 35)', 'Central omitted c = 20'], result: 'Variance Ratio F = (180.0/35) / (45.0/35) = 5.143 / 1.286 = 4.00, df = (35, 35), p < .0001' },
    formula: 'F = (SSE₂ / df₂) / (SSE₁ / df₁), where df₁ = df₂ = (N - c - 2p) / 2',
    code: {
      python: `from statsmodels.stats.diagnostic import het_goldfeldquandt\nfval, pval, ordering = het_goldfeldquandt(fit.model.endog, fit.model.exog)`,
      r: `library(lmtest)\ngqtest(fit)`,
      ts: `import { goldfeldQuandt } from '@statlab/core';\nconst f = goldfeldQuandt(sse1, df1, sse2, df2);`,
    },
    useCases: [
      'Testing if latency variance is significantly higher in heavy server load tiers versus low load tiers.',
      'Evaluating homoscedasticity when data can be naturally ordered by a monotonic predictor.'
    ],
    when: 'Use when testing heteroscedasticity where variance is hypothesized to increase monotonically with an ordered predictor variable.',
    cautions: [
      'Omitting central 20% to 30% of observations (c ≈ N/5) increases test power.',
      'Requires specifying the ordering variable beforehand.'
    ],
    workbenchId: 'diag_goldfeld_quandt',
  },
  {
    slug: 'breusch-godfrey-test',
    title: 'Breusch-Godfrey higher-order serial correlation LM test calculator',
    family: 'Time series & econometrics',
    description: 'Calculate Breusch-Godfrey Lagrange Multiplier (LM) test statistic for p-th order autocorrelation in regression residuals.',
    keywords: ['Breusch-Godfrey test calculator', 'higher order serial correlation', 'LM autocorrelation test', 'BG test time series', 'p-th order AR residual test'],
    inputs: ['OLS residuals e_t', 'Predictor matrix X', 'Lag order p', 'Sample size N'],
    example: { a: ['Sample N = 120', 'Auxiliary regression R²_aux = 0.110 with p = 2 lags'], result: 'Breusch-Godfrey LM χ² = (120 - 2) · 0.110 = 12.98, df = 2, p = .0015. Significant 2nd-order autocorrelation.' },
    formula: 'LM = (N - p) · R²_{auxiliary}, evaluated against Chi-Square distribution with p df',
    code: {
      python: `from statsmodels.stats.diagnostic import acorr_breusch_godfrey\nlm, pval, fval, f_pval = acorr_breusch_godfrey(fit, nlags=2)`,
      r: `library(lmtest)\nbgtest(fit, order = 2)`,
      ts: `import { breuschGodfrey } from '@statlab/core';\nconst res = breuschGodfrey(residuals, exogMatrix, 2);`,
    },
    useCases: [
      'Testing higher-order serial correlation in microservice metric time series regressions.',
      'Validating dynamic econometrics models where lagged dependent variables are present.'
    ],
    when: 'Use when testing for residual autocorrelation when lagged dependent variables are present or when testing higher-order AR(p) processes.',
    cautions: [
      'Unlike Durbin-Watson, Breusch-Godfrey remains valid when lagged Y values are included as predictors.',
      'Tests for any AR(p) or MA(p) autocorrelation up to specified lag order p.'
    ],
    workbenchId: 'ts_breusch_godfrey',
  },
  {
    slug: 'hansen-j-statistic',
    title: "Hansen's J-statistic overidentifying restriction test calculator",
    family: 'Advanced regression & econometrics',
    description: "Calculate Hansen's J-statistic and p-value for testing overidentifying restrictions and instrument validity in GMM models.",
    keywords: ["Hansen's J statistic calculator", 'GMM overidentification test', 'Hansen J test p-value', 'instrument validity GMM', 'Sargan Hansen test'],
    inputs: ['GMM objective function value J (N · ḡ^T W ḡ)', 'Number of instruments L', 'Number of endogenous parameters k'],
    example: { a: ['GMM Objective value J = 8.45', 'Instruments L = 5', 'Endogenous parameters k = 2'], result: 'Hansen J χ² = 8.45, df = 5 - 2 = 3, p = .0376. Rejects instrument validity at α = 0.05 level.' },
    formula: 'J = N · ḡ(β̂)^T Ŵ ḡ(β̂), df = L - k',
    code: {
      python: `import linearmodels as lm\n# GMM Hansen J test output\nres = lm.IVGMM(dependent, exog, endog, instruments).fit()\nj_stat = res.j_stat`,
      r: `library(gmm)\ngmm_fit <- gmm(g_form, x_data)\nspecTest(gmm_fit)`,
      ts: `import { hansenJTest } from '@statlab/core';\nconst p = hansenJTest(8.45, 5, 2);`,
    },
    useCases: [
      'Testing joint validity of multiple instrumental variables in Generalized Method of Moments (GMM) models.',
      'Evaluating moment condition orthogonality in structural econometrics.'
    ],
    when: 'Use when assessing whether extra instrumental variables (L > k) are uncorrelated with model structural error terms.',
    cautions: [
      'Requires model to be overidentified (number of instruments L > number of estimated parameters k).',
      'A significant J-statistic indicates either invalid instruments or model misspecification.'
    ],
    workbenchId: 'econ_hansen_j',
  },
  {
    slug: 'sargan-test-overidentification',
    title: 'Sargan test of overidentifying restrictions calculator',
    family: 'Advanced regression & econometrics',
    description: 'Calculate Sargan test chi-square statistic and p-value for instrument validity in 2SLS instrumental variable regression.',
    keywords: ['Sargan test calculator', '2SLS overidentification test', 'Sargan test statistic', 'instrumental variable validation', '2SLS IV test'],
    inputs: ['2SLS structural residuals e_IV', 'Full instrument matrix Z (L instruments)', 'Sample size N'],
    example: { a: ['Sample N = 200', 'Auxiliary regression of e_IV on Z gives R² = 0.035', 'Instruments L = 4', 'Endogenous vars k = 1'], result: 'Sargan χ² = 200 · 0.035 = 7.00, df = 4 - 1 = 3, p = .0719. Instruments valid at α = 0.05 level.' },
    formula: 'Sargan χ² = N · R²_{auxiliary}, df = L - k',
    code: {
      python: `import linearmodels.iv as iv\nres = iv.IV2SLS(y, exog, endog, instruments).fit()\nsargan = res.sargan`,
      r: `library(AER)\nsummary(ivreg_fit, diagnostics = TRUE)`,
      ts: `import { sarganTest } from '@statlab/core';\nconst res = sarganTest(residuals, instrumentMatrix, 1);`,
    },
    useCases: [
      'Validating instrumental variable independence in two-stage least squares (2SLS) estimation.',
      'Testing exogenous instrument requirements in causal inference regressions.'
    ],
    when: 'Use when evaluating instrument orthogonality under homoscedastic 2SLS error assumptions.',
    cautions: [
      'Sargan test assumes homoscedastic 2SLS errors; under heteroscedasticity, use Hansen’s J-statistic instead.',
      'Requires at least one excess instrument (L > k).'
    ],
    workbenchId: 'econ_sargan',
  },
  {
    slug: 'hausman-specification-test',
    title: 'Hausman specification test (Fixed vs Random Effects) calculator',
    family: 'Advanced regression & econometrics',
    description: 'Calculate Hausman specification test statistic comparing Fixed Effects (FE) vs Random Effects (RE) panel regression models.',
    keywords: ['Hausman test calculator', 'fixed vs random effects test', 'Hausman specification test', 'panel data model selection', 'FE RE Hausman test'],
    inputs: ['Fixed Effects coefficients β_FE', 'Random Effects coefficients β_RE', 'Covariance matrices Var(β_FE), Var(β_RE)'],
    example: { a: ['Difference vector d = β_FE - β_RE', 'Matrix diff Var(d) = Var(β_FE) - Var(β_RE)', 'Parameter count k = 3'], result: 'Hausman χ² = d^T [Var(d)]⁻¹ d = 14.82, df = 3, p = .0019. Reject RE; use Fixed Effects model.' },
    formula: 'H = (β̂_{FE} - β̂_{RE})^T [ Var(β̂_{FE}) - Var(β̂_{RE}) ]^{-1} (β̂_{FE} - β̂_{RE}), df = k',
    code: {
      python: `import linearmodels.panel as panel\n# Compute Hausman test comparing PanelOLS vs RandomEffects`,
      r: `library(plm)\nphtest(fe_fit, re_fit)`,
      ts: `import { hausmanTest } from '@statlab/core';\nconst h = hausmanTest(betaFE, betaRE, covFE, covRE);`,
    },
    useCases: [
      'Choosing between Fixed Effects and Random Effects models in longitudinal user panel data.',
      'Testing if individual entity effects are correlated with regressor variables.'
    ],
    when: 'Use when determining whether Random Effects estimator is consistent in panel data econometrics.',
    cautions: [
      'If p < 0.05, reject Random Effects in favor of Fixed Effects.',
      'Difference in covariance matrices must be positive definite; use Moore-Penrose pseudo-inverse if singular.'
    ],
    workbenchId: 'econ_hausman',
  },
  {
    slug: 'pesaran-cd-dependence',
    title: 'Pesaran CD cross-sectional dependence test calculator',
    family: 'Advanced regression & econometrics',
    description: 'Calculate Pesaran Cross-Sectional Dependence (CD) test statistic for testing cross-sectional correlation in panel time series data.',
    keywords: ['Pesaran CD test calculator', 'cross sectional dependence panel', 'Pesaran test formula', 'panel correlation test', 'spatial panel dependence'],
    inputs: ['Pairwise residual correlation matrix ρ_ij', 'Panel cross-sections N', 'Time periods T'],
    example: { a: ['Panel N = 20 cross-sections', 'Time T = 50 periods', 'Mean pairwise correlation ρ̄ = 0.18'], result: 'Pesaran CD z = √(2·50 / (20·19)) · (∑ ∑ ρ_ij) = 4.32, p < .0001. Significant cross-sectional correlation.' },
    formula: 'CD = √( (2 T) / (N (N - 1)) ) ∑_{i=1}^{N-1} ∑_{j=i+1}^N ρ_{ij}',
    code: {
      python: `import linearmodels.panel as panel\n# Pesaran CD test implementation`,
      r: `library(plm)\npcdtest(panel_fit, test = "cd")`,
      ts: `import { pesaranCD } from '@statlab/core';\nconst cd = pesaranCD(corrMatrix, N, T);`,
    },
    useCases: [
      'Testing for spatial or regional metric interdependence across server nodes in cloud monitoring.',
      'Evaluating cross-sectional correlation in financial asset return panels.'
    ],
    when: 'Use when testing for cross-sectional dependence in panel data with large N and small/medium T.',
    cautions: [
      'Standard panel estimators produce inconsistent standard errors if cross-sectional dependence is present.',
      'CD test is robust to non-stationarity and structural breaks.'
    ],
    workbenchId: 'econ_pesaran_cd',
  },
  {
    slug: 'dickey-fuller-gls-dfgls',
    title: 'DF-GLS unit root stationarity test calculator',
    family: 'Time series & econometrics',
    description: 'Calculate Elliott-Rothenberg-Stock DF-GLS unit root test statistic for higher power stationarity testing with detrending.',
    keywords: ['DF-GLS test calculator', 'Elliott Rothenberg Stock unit root', 'ERS DF-GLS test', 'detrended Dickey Fuller', 'stationarity test higher power'],
    inputs: ['Time series vector Y_t', 'Trend option (Constant vs Constant + Trend)', 'Lag length p'],
    example: { a: ['Series length N = 150', 'Trend: Constant + Linear Trend', 'Lag p = 2'], result: 'DF-GLS t-statistic = -3.42 (Critical 5% = -3.03). Reject unit root hypothesis; series is stationary.' },
    formula: 'Standard ADF t-statistic on GLS detrended series y^d_t = y_t - z_t β̂_{GLS}',
    code: {
      python: `from arch.unitroot import DFGLS\nres = DFGLS(y, trend='ct').summary()`,
      r: `library(urca)\nur.ers(y, type = "DF-GLS", model = "trend")`,
      ts: `import { dfGlsTest } from '@statlab/core';\nconst res = dfGlsTest(series, { trend: 'ct', lags: 2 });`,
    },
    useCases: [
      'Testing stationarity of server CPU utilization time series prior to ARIMA/GARCH modeling.',
      'Evaluating unit roots in financial exchange rates with improved statistical power.'
    ],
    when: 'Use when conducting unit root tests with higher statistical power than standard Augmented Dickey-Fuller (ADF).',
    cautions: [
      'Uses modified AIC (MAIC) for optimal lag length selection.',
      'More robust than standard ADF in small to medium sample sizes.'
    ],
    workbenchId: 'ts_dfgls',
  },
  {
    slug: 'kpss-stationarity-test',
    title: 'KPSS trend stationarity test calculator',
    family: 'Time series & econometrics',
    description: 'Calculate Kwiatkowski-Phillips-Schmidt-Shin (KPSS) test statistic for testing level or trend stationarity null hypothesis in time series.',
    keywords: ['KPSS test calculator', 'KPSS stationarity test', 'trend stationarity test', 'KPSS critical values', 'unit root complement test'],
    inputs: ['Time series vector Y_t', 'Regression model (Level vs Trend)', 'Newey-West bandwidth lag L'],
    example: { a: ['Series length N = 200', 'Model: Constant + Linear Trend', 'KPSS LM statistic = 0.082'], result: 'KPSS LM = 0.082 < 0.146 (Critical 5%). Fail to reject null; series is trend stationary.' },
    formula: 'LM = (1 / (N² s²(L))) ∑ S_t², where S_t = ∑_{i=1}^t e_i is partial sum of OLS residuals',
    code: {
      python: `from statsmodels.tsa.stattools import kpss\nstat, pval, lags, crit = kpss(y, regression='ct')`,
      r: `library(tseries)\nkpss.test(y, null = "Trend")`,
      ts: `import { kpssTest } from '@statlab/core';\nconst res = kpssTest(series, { regression: 'ct' });`,
    },
    useCases: [
      'Complementing ADF/DF-GLS unit root tests to confirm true stationarity versus unit root non-stationarity.',
      'Validating stationarity of telemetry error rates before fitting time series models.'
    ],
    when: 'Use when testing the null hypothesis that a time series is stationary (unlike ADF where null is unit root).',
    cautions: [
      'KPSS null is stationarity; ADF null is non-stationarity.',
      'If ADF fails to reject unit root and KPSS rejects stationarity, the series is unit-root non-stationary.'
    ],
    workbenchId: 'ts_kpss',
  },
  {
    slug: 'zivot-andrews-unit-root',
    title: 'Zivot-Andrews structural break unit root test calculator',
    family: 'Time series & econometrics',
    description: 'Calculate Zivot-Andrews unit root test statistic allowing for an unknown single structural break in intercept or trend.',
    keywords: ['Zivot Andrews test calculator', 'unit root structural break', 'Zivot Andrews test p value', 'stationarity with break', 'unknown break unit root'],
    inputs: ['Time series vector Y_t', 'Break model (Intercept, Trend, or Both)', 'Max lag order p'],
    example: { a: ['Series length N = 180', 'Break Model: Both (Intercept + Trend)', 'Break Point estimated at t = 105'], result: 'ZA t-statistic = -5.48 < -5.08 (Critical 5%). Reject unit root; stationary with structural break at t=105.' },
    formula: 'Minimizes ADF t-statistic t_β(λ) over all candidate break points λ = T_b / T',
    code: {
      python: `from arch.unitroot import ZivotAndrews\nres = ZivotAndrews(y, trend='b').summary()`,
      r: `library(urca)\nur.za(y, model = "both")`,
      ts: `import { zivotAndrewsTest } from '@statlab/core';\nconst res = zivotAndrewsTest(series, { model: 'both' });`,
    },
    useCases: [
      'Testing stationarity of cloud metric series experiencing an architectural deployment shift.',
      'Evaluating economic time series stability across policy or market regime breaks.'
    ],
    when: 'Use when testing for unit roots in time series that may contain a single structural break in level or trend.',
    cautions: [
      'Standard ADF tests lose power and falsely fail to reject unit roots if a structural break is present.',
      'Zivot-Andrews endogenously estimates the break point rather than imposing a fixed date.'
    ],
    workbenchId: 'ts_zivot_andrews',
  },
  {
    slug: 'chow-test-structural-break',
    title: 'Chow test structural break F-statistic calculator',
    family: 'Time series & econometrics',
    description: 'Calculate Chow test F-statistic for testing parameter equality and structural stability across two sub-period regression samples.',
    keywords: ['Chow test calculator', 'structural break test', 'Chow F statistic', 'parameter stability test', 'regression split test'],
    inputs: ['Pooled sum of squared errors SSE_P', 'Sub-period 1 SSE₁ (N₁ obs)', 'Sub-period 2 SSE₂ (N₂ obs)', 'Predictor count k'],
    example: { a: ['Pooled SSE_P = 250.0 (N = 100)', 'Sub-period 1 SSE₁ = 90.0 (N₁ = 50)', 'Sub-period 2 SSE₂ = 110.0 (N₂ = 50)', 'Predictors k = 3'], result: 'Chow F = ((250.0 - (90+110)) / 3) / ((90+110) / (100 - 2·3)) = (50/3) / (200/94) = 16.67 / 2.128 = 7.83, p = .0001' },
    formula: 'F = ( (SSE_P - (SSE₁ + SSE₂)) / k ) / ( (SSE₁ + SSE₂) / (N₁ + N₂ - 2k) )',
    code: {
      python: `import scipy.stats as stats\n# Compute Chow test F statistic from OLS fits`,
      r: `library(strucchange)\nsctest(y ~ x, type = "Chow", point = 50)`,
      ts: `import { chowTest } from '@statlab/core';\nconst f = chowTest({ ssePooled: 250, sse1: 90, sse2: 110, n1: 50, n2: 50, k: 3 });`,
    },
    useCases: [
      'Testing if conversion regression parameters changed after a major software release.',
      'Evaluating structural shift in server resource utilization models following hardware upgrades.'
    ],
    when: 'Use when testing whether regression coefficients are constant across two known sub-samples divided at a specified break date.',
    cautions: [
      'Assumes error variances are equal across both sub-periods (homoscedasticity across breaks).',
      'Requires specifying the exact break point location in advance.'
    ],
    workbenchId: 'ts_chow_test',
  },
  {
    slug: 'bds-test-independence',
    title: 'BDS non-linear independence & chaos test calculator',
    family: 'Time series & econometrics',
    description: 'Calculate BDS (Broock, Dechert, Scheinkman) test statistic for non-linear independence and chaotic structure in time series residuals.',
    keywords: ['BDS test calculator', 'BDS non linear independence', 'time series chaos test', 'm-history embedding distance', 'BDS test statistic'],
    inputs: ['Residual series e_t', 'Embedding dimension m (2 to 5)', 'Distance threshold ε (standardized fraction of SD)'],
    example: { a: ['Residual series length N = 300', 'Embedding dim m = 2', 'Distance ε = 0.70 · SD'], result: 'BDS z-statistic = 4.15, p < .0001. Rejects i.i.d. independence; non-linear structure present.' },
    formula: 'W_{m,N}(ε) = √N · (C_{m,N}(ε) - C_{1,N}(ε)^m) / σ_{m,N}(ε) ~ N(0,1)',
    code: {
      python: `from statsmodels.tsa.stattools import bds\nbds_stat, pval = bds(e, max_dim=2, epsilon=0.7)`,
      r: `library(tseries)\nbds.test(e, m = 2)`,
      ts: `import { bdsTest } from '@statlab/core';\nconst res = bdsTest(residuals, { dim: 2, epsilon: 0.7 });`,
    },
    useCases: [
      'Detecting remaining non-linear dependence in time series model residuals.',
      'Testing for deterministic chaos and non-linear dynamics in financial market returns.'
    ],
    when: 'Use when testing the null hypothesis that a time series is independently and identically distributed (i.i.d.) against non-linear alternatives.',
    cautions: [
      'Sensitive to sample size N; works best for N ≥ 200.',
      'Rejecting i.i.d. does not identify the specific non-linear form (GARCH, bilinear, chaotic, etc.).'
    ],
    workbenchId: 'ts_bds',
  },
  {
    slug: 'diebold-mariano-test',
    title: 'Diebold-Mariano forecast accuracy comparison test calculator',
    family: 'Time series & econometrics',
    description: 'Calculate Diebold-Mariano (DM) test statistic and Harvey-Leybourne-Newbold (HLN) small-sample adjusted test for equal predictive accuracy between two forecast models.',
    keywords: ['Diebold-Mariano test calculator', 'forecast accuracy test', 'DM test statistic', 'HLN adjusted DM test', 'competing forecast comparison'],
    inputs: ['Forecast errors e₁_t (Model 1)', 'Forecast errors e₂_t (Model 2)', 'Loss function (MSE default)', 'Forecast horizon h'],
    example: { a: ['Model 1 MSE = 14.5', 'Model 2 MSE = 18.2', 'Evaluation periods N = 100', 'Horizon h = 1'], result: 'Loss diff d̄ = -3.70, DM z-statistic = -2.85, p = .0044. Model 1 is significantly more accurate.' },
    formula: 'DM = d̄ / √( V̂(d̄) / N ) ~ N(0,1), where d_t = g(e_{1t}) - g(e_{2t})',
    code: {
      python: `import numpy as np\n# Compute Diebold-Mariano z statistic with Newey-West variance`,
      r: `library(forecast)\ndm.test(e1, e2, h = 1, power = 2)`,
      ts: `import { dieboldMariano } from '@statlab/core';\nconst res = dieboldMariano(errors1, errors2, { h: 1, loss: 'mse' });`,
    },
    useCases: [
      'Evaluating whether a new machine learning forecast model significantly outperforms a baseline ARIMA model.',
      'Comparing predictive accuracy of competing capacity planning models.'
    ],
    when: 'Use when comparing the forecast accuracy of two competing time series forecasting models over a test horizon.',
    cautions: [
      'Use Harvey-Leybourne-Newbold (HLN) modified statistic for small samples (N < 50).',
      'Requires non-nested forecasting models for exact standard normal asymptotic distribution.'
    ],
    workbenchId: 'ts_diebold_mariano',
  },
  {
    slug: 'mendershausen-overlap-coefficient',
    title: 'Overlapping Coefficient (OVL) distribution similarity calculator',
    family: 'Vector distances & embedding metrics',
    description: 'Calculate the Overlapping Coefficient (OVL) measuring the common area under two probability density functions or empirical histograms.',
    keywords: ['Overlapping Coefficient calculator', 'OVL distribution overlap', 'density area overlap', 'Mendershausen OVL', 'histogram overlap metric'],
    inputs: ['Distribution / Histogram P', 'Distribution / Histogram Q'],
    example: { a: ['Histogram P (Group 1)', 'Histogram Q (Group 2)', 'Bin resolution = 50 bins'], result: 'Overlapping Coefficient OVL = 0.765 (76.5% density area overlap). Range 0 (disjoint) to 1 (identical).' },
    formula: 'OVL = ∫ min(f_1(x), f_2(x)) dx = ∑ min(p_i, q_i)',
    code: {
      python: `import numpy as np\novl = np.sum(np.minimum(p, q))`,
      r: `library(overlapping)\noverlap(x = list(x1, x2))$OV`,
      ts: `import { overlapCoefficient } from '@statlab/core';\nconst ovl = overlapCoefficient(histP, histQ);`,
    },
    useCases: [
      'Quantifying overlap magnitude between control and treatment response time distributions in A/B testing.',
      'Measuring demographic cohort distribution similarity in user research.'
    ],
    when: 'Use when calculating intuitive percentage area overlap between two continuous distributions.',
    cautions: [
      'OVL is non-parametric and invariant to monotonic scale transformations of X.',
      'Ranges strictly between 0 (completely separate distributions) and 1 (identical distributions).'
    ],
    workbenchId: 'dist_ovl',
  },
  {
    slug: 'mood-median-test',
    title: "Mood's median test multi-sample equality calculator",
    family: 'Resampling & non-parametric tests',
    description: "Calculate Mood's median test chi-square statistic, degrees of freedom, and p-value for testing median equality across k independent samples.",
    keywords: ["Mood's median test calculator", 'multi-group median test', 'non parametric median comparison', 'Mood median chi-square', 'k-sample median test'],
    inputs: ['k independent sample vectors X₁, X₂, ..., X_k'],
    example: { a: ['3 Groups (n₁=20, n₂=20, n₃=20)', 'Combined Grand Median = 45.0'], result: "Mood's χ² = 7.33, df = 2, p = .0256. Medians differ significantly across groups." },
    formula: 'χ² = ∑ ( (O_i - E_i)² / E_i ) on 2 × k table of counts above/below grand median',
    code: {
      python: `from scipy import stats\nstat, pval, med, tbl = stats.median_test(group1, group2, group3)`,
      r: `mood.test(group1, group2)`,
      ts: `import { moodMedianTest } from '@statlab/core';\nconst res = moodMedianTest([g1, g2, g3]);`,
    },
    useCases: [
      'Comparing median latency across 3 or more server clusters when data contains severe outliers.',
      'Evaluating non-parametric median differences across independent user experiment groups.'
    ],
    when: 'Use when testing if k independent samples have the same median when data is heavy-tailed or contains severe outliers.',
    cautions: [
      "Mood's test is more robust to extreme outliers than Kruskal-Wallis but has lower statistical power for continuous data.",
      'Requires cell expected frequencies in 2 × k table to be ≥ 5.'
    ],
    workbenchId: 'stat_mood_median',
  },
  {
    slug: 'brown-forsythe-test',
    title: 'Brown-Forsythe robust variance homogeneity test calculator',
    family: 'Statistical diagnostics & outlier tests',
    description: 'Calculate Brown-Forsythe ANOVA F-statistic for testing homoscedasticity across k groups using median absolute deviations.',
    keywords: ['Brown-Forsythe test calculator', 'robust Levene test', 'variance homogeneity median', 'Brown Forsythe F test', 'heteroscedasticity group test'],
    inputs: ['k group data vectors X₁, X₂, ..., X_k'],
    example: { a: ['3 Groups (n₁=25, n₂=25, n₃=25)', 'Group Medians M₁=12.0, M₂=14.5, M₃=18.0'], result: 'Brown-Forsythe F = 2.45, df = (2, 72), p = .0934. Variance homogeneity supported.' },
    formula: 'One-way ANOVA F-test on transformed variables z_{ij} = |x_{ij} - M_i|, where M_i is group median',
    code: {
      python: `from scipy import stats\nstat, pval = stats.levene(g1, g2, g3, center='median')`,
      r: `library(car)\nleveneTest(y ~ group, data = df, center = median)`,
      ts: `import { brownForsytheTest } from '@statlab/core';\nconst res = brownForsytheTest([g1, g2, g3]);`,
    },
    useCases: [
      'Verifying homoscedasticity before running ANOVA when group distributions are skewed or heavy-tailed.',
      'Comparing performance metric variance across multiple deployment regions.'
    ],
    when: 'Use when testing for equality of variances across k groups when sample data is non-normally distributed or skewed.',
    cautions: [
      'More robust than standard Levene test (which uses means) when group distributions are asymmetric.',
      'Recommended over Bartlett test whenever normality cannot be guaranteed.'
    ],
    workbenchId: 'diag_brown_forsythe',
  },
  {
    slug: 'fligner-killeen-test',
    title: 'Fligner-Killeen non-parametric variance homogeneity test calculator',
    family: 'Statistical diagnostics & outlier tests',
    description: 'Calculate Fligner-Killeen median-ranked chi-square test statistic for non-parametric variance homogeneity across k groups.',
    keywords: ['Fligner-Killeen test calculator', 'non parametric variance test', 'Fligner Killeen chi-square', 'ranked variance test', 'homogeneity of variance ranks'],
    inputs: ['k group sample vectors X₁, X₂, ..., X_k'],
    example: { a: ['4 Groups (n=15 each)', 'Total N = 60'], result: 'Fligner-Killeen χ² = 9.85, df = 3, p = .0199. Significant variance heterogeneity across groups.' },
    formula: 'χ²_{FK} = ∑ n_i (ā_i - ā)² / s_a², where a_i are normal scores of ranked |x_{ij} - M_i|',
    code: {
      python: `from scipy import stats\nstat, pval = stats.fligner(g1, g2, g3, g4)`,
      r: `fligner.test(y ~ group, data = df)`,
      ts: `import { flignerKilleenTest } from '@statlab/core';\nconst res = flignerKilleenTest([g1, g2, g3, g4]);`,
    },
    useCases: [
      'Testing homoscedasticity across groups when samples are non-normal and contain severe outliers.',
      'Checking non-parametric variance equality before applying non-parametric rank tests.'
    ],
    when: 'Use when testing for equal group variances with maximum robustness against non-normality and extreme outliers.',
    cautions: [
      'One of the most robust tests for variance homogeneity available.',
      'Uses normal scores of ranks of absolute deviations from group medians.'
    ],
    workbenchId: 'diag_fligner_killeen',
  },
];

const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const calculatorPath = (page) => `/calculators/${page.slug}/`;

export function renderCalculatorPage(page) {
  const url = `${ORIGIN}${calculatorPath(page)}`;
  const schema = [
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: page.title,
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Web',
      url,
      description: page.description,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      publisher: { '@type': 'Organization', name: 'StatLab' },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: `How to calculate ${page.title.replace(' calculator', '')}`,
      description: `Step-by-step guide for performing ${page.title} in code and browser workbenches.`,
      step: [
        { '@type': 'HowToStep', name: 'Input Sample Data', text: page.inputs.join(', ') },
        { '@type': 'HowToStep', name: 'Evaluate Statistical Formula', text: page.formula || page.when },
        { '@type': 'HowToStep', name: 'Inspect Output & Effect Size', text: page.example.result },
      ]
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: `When should I use the ${page.title}?`,
          acceptedAnswer: { '@type': 'Answer', text: page.when }
        },
        {
          '@type': 'Question',
          name: `What reporting cautions apply to ${page.title}?`,
          acceptedAnswer: { '@type': 'Answer', text: page.cautions.join(' ') }
        }
      ]
    }
  ];

  const sameFamily = calculatorPages.filter((candidate) => candidate.family === page.family && candidate.slug !== page.slug);
  const otherFamily = calculatorPages.filter((candidate) => candidate.family !== page.family && candidate.slug !== page.slug).slice(0, 4);
  const relatedList = [...sameFamily, ...otherFamily].slice(0, 6);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(page.title)} | StatLab</title>
  <meta name="description" content="${esc(page.description)}">
  <meta name="keywords" content="${esc(page.keywords.join(', '))}">
  <link rel="canonical" href="${url}">
  <meta property="og:title" content="${esc(page.title)} | StatLab">
  <meta property="og:description" content="${esc(page.description)}">
  <meta property="og:url" content="${url}">
  <meta property="og:type" content="website">
  <script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>
  <style>
    :root{color-scheme:dark;--bg:#080b10;--panel:#111722;--panel2:#0d121b;--text:#edf4ff;--muted:#9db0c7;--accent:#5df2b6;--accent2:#38bdf8;--line:#243246;--gold:#ffd166;--code-bg:#071018}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at top left,#152033 0,#080b10 42rem);color:var(--text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;line-height:1.55}.wrap{max-width:1120px;margin:0 auto;padding:28px 20px 64px}a{color:var(--accent)}.nav{display:flex;justify-content:space-between;gap:16px;align-items:center;margin-bottom:48px}.brand{font-weight:900;letter-spacing:.08em;text-decoration:none;color:var(--text);font-size:20px}.brand span{color:var(--accent)}.hero{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(320px,.8fr);gap:28px;align-items:start}.eyebrow{color:var(--accent);font-size:13px;text-transform:uppercase;letter-spacing:.16em;font-weight:800}h1{font-size:clamp(36px,6vw,68px);line-height:.95;margin:12px 0 18px;letter-spacing:-.04em}p.lede{font-size:19px;color:#c9d7e8;max-width:720px;line-height:1.45}.panel{background:linear-gradient(180deg,var(--panel),var(--panel2));border:1px solid var(--line);border-radius:22px;padding:24px;box-shadow:0 20px 80px rgba(0,0,0,.28)}.button{display:inline-flex;align-items:center;justify-content:center;border-radius:999px;padding:13px 20px;background:var(--accent);color:#06100c;text-decoration:none;font-weight:900;margin:8px 10px 8px 0;transition:transform .15s ease}.button:hover{transform:translateY(-1px)}.button.secondary{background:transparent;color:var(--text);border:1px solid var(--line)}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;margin-top:28px}.card{background:rgba(255,255,255,.03);border:1px solid var(--line);border-radius:18px;padding:22px}.card h2,.card h3{margin-top:0;font-size:20px;color:var(--text)}.card.full{grid-column:1 / -1}.card.accent-card{background:linear-gradient(135deg,rgba(93,242,182,.05) 0%,rgba(56,189,248,.05) 100%);border-color:rgba(93,242,182,.25)}.muted{color:var(--muted)}code,pre{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace}pre{background:var(--code-bg);border:1px solid #1b2a3d;border-radius:14px;padding:14px 16px;overflow-x:auto;font-size:13px;line-height:1.45;color:#e2e8f0}.example{background:var(--code-bg);border:1px solid #1b2a3d;border-radius:16px;padding:16px;margin-top:14px}.list{padding-left:20px;margin:10px 0}.list li{margin-bottom:6px}.cta-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-top:12px}.cta-box{background:rgba(17,23,34,.9);border:1px solid var(--line);border-radius:14px;padding:16px}.cta-box h4{margin:0 0 6px;color:var(--accent);font-size:16px}.cta-box.assurance h4{color:var(--accent2)}.footer{border-top:1px solid var(--line);margin-top:48px;padding-top:24px;color:var(--muted);font-size:14px;display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap}@media(max-width:860px){.hero,.grid,.cta-grid{grid-template-columns:1fr}.nav{align-items:flex-start;flex-direction:column}h1{font-size:40px}}
  </style>
</head>
<body>
  <main class="wrap">
    <nav class="nav" aria-label="Primary">
      <a class="brand" href="/">STAT<span>LAB</span></a>
      <div><a href="/calculators/">Calculators</a> · <a href="/?launch=1#workbench">Open workbench</a> · <a href="https://www.npmjs.com/package/@statlab/core">@statlab/core</a></div>
    </nav>
    <section class="hero">
      <div>
        <div class="eyebrow">${esc(page.family)} calculator</div>
        <h1>${esc(page.title)}</h1>
        <p class="lede">${esc(page.description)}</p>
        <a class="button" href="/?launch=1&test=${encodeURIComponent(page.workbenchId)}#workbench">Run this test live in StatLab</a>
        <a class="button secondary" href="https://www.npmjs.com/package/@statlab/core">npm i @statlab/core</a>
      </div>
      <aside class="panel">
        <h2>Worked Example</h2>
        <div class="example">
          <strong>Inputs</strong>
          <ul class="list">${page.example.a.map((item) => `<li>${esc(Array.isArray(item) ? item.join(', ') : item)}</li>`).join('')}</ul>
          <strong>StatLab Result Output</strong>
          <p>${esc(page.example.result)}</p>
        </div>
        <p class="muted" style="font-size:13px;margin-top:12px">Calculations run locally inside your browser session using zero-dependency JavaScript.</p>
      </aside>
    </section>

    <section class="grid" aria-label="Method details">
      <article class="card">
        <h2>When to use it</h2>
        <p>${esc(page.when)}</p>
        <h3>Required Inputs</h3>
        <ul class="list">${page.inputs.map((input) => `<li>${esc(input)}</li>`).join('')}</ul>
      </article>

      <article class="card">
        <h2>Mathematical Formula</h2>
        <pre><code>${esc(page.formula || 'See StatLab core math engine documentation.')}</code></pre>
        <h3>Reporting Cautions</h3>
        <ul class="list">${page.cautions.map((caution) => `<li>${esc(caution)}</li>`).join('')}</ul>
      </article>

      ${page.code ? `
      <article class="card full">
        <h2>Code Snippets (Python, R, TypeScript)</h2>
        <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px">
          <div>
            <strong>Python (SciPy / Statsmodels)</strong>
            <pre><code>${esc(page.code.python)}</code></pre>
          </div>
          <div>
            <strong>R Language</strong>
            <pre><code>${esc(page.code.r)}</code></pre>
          </div>
          <div>
            <strong>TypeScript (@statlab/core)</strong>
            <pre><code>${esc(page.code.ts)}</code></pre>
          </div>
        </div>
      </article>
      ` : ''}

      <article class="card full accent-card">
        <h2>Developer Use Cases & Production Integrations</h2>
        <ul class="list">
          ${(page.useCases || []).map((uc) => `<li>${esc(uc)}</li>`).join('')}
        </ul>
        <div class="cta-grid">
          <div class="cta-box">
            <h4>StatLab Interactive Workbench</h4>
            <p style="font-size:14px;color:#c9d7e8;margin:0 0 10px">Run live statistical tests, import CSV data, and export publication-ready APA results directly in your browser.</p>
            <a style="font-weight:700;font-size:14px" href="/?launch=1#workbench">Launch StatLab Workbench →</a>
          </div>
          <div class="cta-box assurance">
            <h4>@statlab/core TypeScript Library</h4>
            <p style="font-size:14px;color:#c9d7e8;margin:0 0 10px">Zero-dependency, high-performance TypeScript statistics and probability engine for web apps, APIs, and microservices.</p>
            <a style="font-weight:700;font-size:14px;color:var(--accent2)" href="https://www.npmjs.com/package/@statlab/core">View on npm →</a>
          </div>
        </div>
      </article>
    </section>

    <section class="panel" style="margin-top:28px">
      <h2>Related Statistical Test Calculators</h2>
      <p class="muted">Explore static calculators across the StatLab inference engine suite.</p>
      <ul class="list" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;padding-left:0;list-style:none">
        ${relatedList.map((candidate) => `<li style="background:rgba(255,255,255,.02);border:1px solid var(--line);border-radius:10px;padding:10px 14px"><a style="font-weight:700" href="${calculatorPath(candidate)}">${esc(candidate.title)}</a> <span class="muted" style="font-size:12px">(${esc(candidate.family)})</span></li>`).join('')}
      </ul>
    </section>

    <footer class="footer">
      <div>StatLab is a zero-runtime-dependency browser statistics engine powered by <code>@statlab/core</code>.</div>
      <div>Feeds into <a href="/?launch=1#workbench">production telemetry</a> &amp; <a href="https://www.npmjs.com/package/@statlab/core">CI/CD pipeline benchmarks</a>.</div>
    </footer>
  </main>
</body>
</html>`;
}

export function renderCalculatorIndex() {
  const cards = calculatorPages.map((page) => `<a class="card" href="${calculatorPath(page)}"><span class="eyebrow">${esc(page.family)}</span><h2 style="margin:6px 0 8px;font-size:18px">${esc(page.title)}</h2><p style="font-size:14px;color:#9db0c7;margin:0 0 12px">${esc(page.description)}</p><span style="font-weight:700;font-size:13px;color:#5df2b6">Open Calculator →</span></a>`).join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>StatLab Statistical Test Calculators | pSEO Directory</title>
  <meta name="description" content="Free static, shareable statistical test calculators: Mann-Whitney U, Welch t-test, ANOVA variants, non-parametric tests, Bayesian statistics, survival reliability analysis, AI ML metrics, probability distributions, econometrics, and release readiness benchmarking.">
  <link rel="canonical" href="${ORIGIN}/calculators/">
  <style>
    body{margin:0;background:#080b10;color:#edf4ff;font-family:Inter,ui-sans-serif,system-ui,sans-serif;line-height:1.5}.wrap{max-width:1120px;margin:auto;padding:40px 20px}a{color:#5df2b6}.brand{font-weight:900;letter-spacing:.08em;text-decoration:none;color:#edf4ff;font-size:20px}.brand span{color:#5df2b6}h1{font-size:clamp(36px,6vw,72px);line-height:.95;margin:16px 0 12px;letter-spacing:-.04em}.eyebrow{color:#5df2b6;font-size:12px;text-transform:uppercase;letter-spacing:.14em;font-weight:800}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin-top:28px}.card{display:block;text-decoration:none;color:#edf4ff;background:#111722;border:1px solid #243246;border-radius:18px;padding:20px;transition:border-color .15s ease}.card:hover{border-color:#5df2b6}.banner{background:linear-gradient(135deg,#111722 0%,#0d1420 100%);border:1px solid #243246;border-radius:20px;padding:24px;margin-top:36px;display:grid;grid-template-columns:1fr 1fr;gap:20px}@media(max-width:760px){.grid,.banner{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <main class="wrap">
    <a class="brand" href="/">STAT<span>LAB</span></a>
    <h1>Statistical Calculators</h1>
    <p style="font-size:19px;color:#9db0c7;max-width:760px">Static, shareable method pages backed by the zero-dependency StatLab inference engine. Designed for developers, statistical engineers, and research teams.</p>
    
    <section class="grid">
      ${cards}
    </section>

    <section class="banner">
      <div>
        <h3 style="margin:0 0 8px;color:#5df2b6">StatLab Interactive Workbench</h3>
        <p style="margin:0;font-size:14px;color:#9db0c7">Embed continuous statistical testing into live telemetry pipelines, A/B test routing, and feature flag analytics directly in your browser.</p>
      </div>
      <div>
        <h3 style="margin:0 0 8px;color:#38bdf8">@statlab/core TypeScript Library</h3>
        <p style="margin:0;font-size:14px;color:#9db0c7">Validate release candidate performance, latency distribution shifts, and LLM output quality scores with zero-dependency TypeScript functions.</p>
      </div>
    </section>
  </main>
</body>
</html>`;
}

export function renderSitemap() {
  const urls = ['/', '/calculators/', ...calculatorPages.map(calculatorPath)];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((path) => `  <url><loc>${ORIGIN}${path}</loc></url>`).join('\n')}\n</urlset>\n`;
}

export function generateSeoCalculatorPages(root = join(process.cwd(), 'public')) {
  const calculatorsDir = join(root, 'calculators');
  rmSync(calculatorsDir, { recursive: true, force: true });
  mkdirSync(calculatorsDir, { recursive: true });
  writeFileSync(join(calculatorsDir, 'index.html'), renderCalculatorIndex());
  for (const page of calculatorPages) {
    const dir = join(calculatorsDir, page.slug);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'index.html'), renderCalculatorPage(page));
  }
  writeFileSync(join(root, 'sitemap.xml'), renderSitemap());
  writeFileSync(join(root, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${ORIGIN}/sitemap.xml\n`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  generateSeoCalculatorPages();
  console.log(`Generated ${calculatorPages.length} calculator pages in public/calculators`);
}
