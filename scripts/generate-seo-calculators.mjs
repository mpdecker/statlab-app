import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ORIGIN = process.env.STATLAB_SITE_ORIGIN || 'https://statlab-3z6.pages.dev';

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
      'Validating API response time improvements in VoxelAssurance release-readiness sprints.',
      'Comparing user engagement durations across variant groups in VoxelPulse telemetry.'
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
      'Tracking user task completion time before and after UI redesign in VoxelPulse telemetry.',
      'Evaluating paired LLM response timing across prompt iterations in VoxelAssurance runs.'
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
      'Automated build gate pass/fail validation in VoxelAssurance regression suites.'
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
      'Standardizing benchmark performance gains across heterogeneous hardware runs in VoxelAssurance.'
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
      'Standardizing infrastructure metric metrics across scaling tiers in VoxelPulse.',
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
      'Converting microbenchmark t-statistics into exact p-values in VoxelAssurance.',
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
      'Looking up exact p-values for custom chi-square test matrices in VoxelPulse.',
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
      'Dimensionality reduction for telemetry metric feature vectors in VoxelPulse.',
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
      'Evaluating system optimization across multiple dependent telemetry metrics simultaneously in VoxelPulse.',
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
      'Calculating relative error rate risk reduction in VoxelAssurance release readiness audits.',
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
      'Multi-center or multi-region benchmark synthesis in VoxelPulse.'
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
      'Determining whether upstream microservice queue metrics predict downstream latency spikes in VoxelPulse.',
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
      'Evaluating risk-adjusted yield and throughput efficiency ratios for algorithmic trading or server resource scheduling in VoxelPulse.',
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
      'Verifying that ARIMA telemetry model residuals resemble independent white noise in VoxelPulse.',
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
      'Predicting customer defect event counts in VoxelAssurance.'
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
      'Modeling tail latency scaling (p95, p99) directly as a function of system load parameters in VoxelAssurance.',
      'Estimating non-homoscedastic quantile boundaries in VoxelPulse.'
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
      'Evaluating non-normally distributed response times or long-tailed microservice latency in VoxelPulse.',
      'Comparing customer satisfaction score ranks across product subscription tiers.',
      'Benchmarking LLM toxicity or error distribution ranks in VoxelAssurance validation sprints.'
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
      'Comparing user feedback rating distributions across 3+ server deployment regions in VoxelPulse.',
      'Evaluating non-parametric latency across multiple Kubernetes pod configurations in VoxelAssurance.'
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
      'Quantifying rank superiority magnitude between telemetry sample runs in VoxelPulse.',
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
      'Pinpointing exact multi-region latency rank shifts in VoxelPulse infrastructure monitoring.',
      'Evaluating specific prompt framework rank differences in VoxelAssurance.'
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
      'Detecting entire telemetry distribution shape shifts (not just mean or median shifts) in VoxelPulse.',
      'Verifying data drift between training baseline and production inference streams in VoxelAssurance.'
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
      'Evaluating user conversion rates across multiple landing page variants in VoxelPulse.',
      'Assessing model benchmark quality across prompt framework configurations in VoxelAssurance.'
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
      'Evaluating the combined impact of cache settings and geographic regions on latency in VoxelPulse.',
      'Testing LLM prompt architecture and model family interaction on execution quality in VoxelAssurance.'
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
      'Evaluating continuous telemetry performance across 5 sequential releases in VoxelPulse.'
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
      'Pinpointing exact performance regressions across multiple benchmark software builds in VoxelAssurance.'
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
      'Reporting standardized ANOVA effect sizes in VoxelAssurance release readiness audits.'
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
      'Automating continuous Bayesian decision boundaries in VoxelPulse experiment engines without p-value peeking penalties.',
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
      'Assessing model equivalence in VoxelAssurance AI benchmark regressions.'
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
      'Measuring customer subscription retention curves in VoxelPulse telemetry.'
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
      'Predicting component reliability thresholds in VoxelAssurance quality audits.'
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
      'Quantifying relative crash risk reduction between deployment versions in VoxelAssurance.',
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
      'Automated assumption checking in VoxelAssurance statistical pipeline gates.'
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
      'Checking homoscedasticity before choosing pooled ANOVA vs Welch ANOVA in VoxelPulse.',
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
      'Validating independence of telemetry metrics in VoxelPulse regression modules.'
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
      'Verifying stationarity of CPU/memory metrics before applying ARIMA/telemetry models in VoxelPulse.',
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
      'Evaluating classification model precision/recall tradeoffs in VoxelAssurance AI quality sprints.',
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
      'Comparing model version AUC scores in VoxelAssurance release readiness sprints.'
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
      'Evaluating agreement between human evaluators and automated LLM-as-a-judge scoring in VoxelAssurance.',
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
      'Measuring consensus agreement across multi-prompt LLM judge ensembles in VoxelAssurance.',
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
      'Assessing agreement on continuous score metrics between human evaluators and AI judges in VoxelAssurance.',
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
      'Evaluating confidence score calibration of LLM responses in VoxelAssurance quality audits.',
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
      'Validating factor structure fit in VoxelPulse analytics.'
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
      'Testing independence between user operating systems and conversion event types in VoxelPulse.',
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
      'Quantifying effect magnitude for chi-square tests in VoxelPulse.'
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
      'Evaluating pass/fail prompt test suite outcomes before and after prompt updates in VoxelAssurance.',
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
      'Comparing baseline vs variant conversion proportions in VoxelPulse telemetry.',
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
      'Evaluating correlation between system CPU utilization and request latency in VoxelPulse.',
      'Testing correlation between automated test suite size and release bug counts in VoxelAssurance.'
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
      'Predicting release testing runtime based on pull request code diff volume in VoxelAssurance.'
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
      'Modeling binary user conversion probabilities based on telemetry feature signals in VoxelPulse.',
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
      'Modeling event counts (e.g. API error rate spikes, bug counts per sprint) in VoxelPulse and VoxelAssurance.',
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
      'Automating continuous A/B experiment evaluation inside VoxelPulse feedback telemetry loops.',
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
      'Automated SLA and tail-latency regression verification in VoxelAssurance release readiness sprints.',
      'Continuous telemetry distribution shift detection in VoxelPulse infrastructure monitoring.'
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
      'Evaluating LLM release candidates in VoxelAssurance AI quality verification sprints.',
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
      'Planning required traffic volume and duration for A/B tests in VoxelPulse.',
      'Determining required benchmark sample runs for release readiness sign-off in VoxelAssurance.'
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
      'Synthesizing benchmark performance results across multiple hardware platforms in VoxelAssurance.',
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
      'Detecting feature telemetry distribution drift between training and live inference in VoxelPulse.',
      'Measuring model probability divergence across release candidates in VoxelAssurance testing.'
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
      'Evaluating categorical user session diversity and telemetry payload unpredictability in VoxelPulse.',
      'Monitoring token distribution entropy in LLM response evaluations within VoxelAssurance.'
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
      'Benchmarking classification pipeline quality in VoxelAssurance AI test runs.',
      'Monitoring real-time multi-class classification confidence in VoxelPulse analytics.'
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
      'Evaluating infrastructure latency SLA compliance in VoxelPulse telemetry.',
      'Validating build artifact execution limits in VoxelAssurance release qualification.'
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
      'Detecting system performance drift and abnormal spikes in VoxelPulse telemetry streams.',
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
      'Benchmarking multi-step microservice request transaction reliability in VoxelPulse.',
      'Establishing quality gate thresholds for automated test deployments in VoxelAssurance.'
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
      'Identifying seasonality and temporal dependence in server metric streams in VoxelPulse.',
      'Selecting appropriate ARIMA model orders for server workload forecasting in VoxelAssurance.'
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
      'Detecting volatility clustering in API latency or traffic throughput bursts in VoxelPulse.',
      'Evaluating stress test variance stability across load spikes in VoxelAssurance testing.'
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
      'Verifying long-term equilibrium relationship between backend resource usage and frontend throughput in VoxelPulse.',
      'Ensuring benchmark metrics maintain stable ratios across long test runs in VoxelAssurance.'
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
      'Quantifying customer intervention impact (e.g. how many churn-risk users must receive a workflow fix to prevent one churn event) in VoxelPulse.',
      'Evaluating error reduction impact per user deployment in VoxelAssurance.'
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
      'Evaluating anomaly detector and security scanner diagnostic power in VoxelPulse telemetry.',
      'Calculating post-test probability of release defects given automated suite failure rates in VoxelAssurance.'
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
      'Assessing agreement between synthetic telemetry timers and client-side web vitals in VoxelPulse.',
      'Comparing legacy performance benchmark metrics vs new VoxelAssurance profiling tools.'
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
      'Preventing overfitting in telemetry prediction models with high-dimensional feature spaces in VoxelPulse.',
      'Performing automated feature selection on system release benchmarks in VoxelAssurance.'
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
      'Evaluating search, recommendation, and catalog ranking quality in VoxelPulse analytics.',
      'Benchmarking search and vector retrieval accuracy across release candidates in VoxelAssurance.'
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
      'Monitoring traffic volume forecast accuracy in VoxelPulse infrastructure auto-scaling.',
      'Evaluating load prediction models during release benchmarking in VoxelAssurance.'
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
      'Tracking microservice uptime and incident recovery performance in VoxelPulse telemetry.',
      'Establishing reliability metrics and outage SLA thresholds in VoxelAssurance release qualification.'
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
      'Estimating non-normal latency percentile confidence intervals (p95/p99) in VoxelPulse telemetry.',
      'Constructing robust parameter bounds for complex microbenchmarks in VoxelAssurance testing.'
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
      'Validating custom SLA metric shifts between production release candidate groups in VoxelPulse.',
      'Testing latency differences in small sample microbenchmarks in VoxelAssurance.'
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
      'Optimizing database query thread pools and cache sizing in VoxelPulse telemetry tuning.',
      'Finding optimal hyperparameter configurations for automated build pipelines in VoxelAssurance.'
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
      'Screening 10+ potential microservice configuration parameters down to the top 2-3 impact drivers in VoxelPulse.',
      'Rapidly isolating root-cause parameters causing performance regression in VoxelAssurance.'
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
      'Optimizing robust backend server configurations against fluctuating background load in VoxelPulse.',
      'Building fault-tolerant, low-variance deployment profiles in VoxelAssurance testing.'
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
      'Evaluating LLM retrieval embedding accuracy for vector search pipelines in VoxelPulse.',
      'Benchmarking semantic drift across prompt engineering release iterations in VoxelAssurance.'
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
      'Measuring true metric distribution shift between baseline and canary release traffic in VoxelPulse.',
      'Quantifying histogram drift in telemetry pipelines within VoxelAssurance testing.'
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
      'Detecting multi-metric system anomalies (correlated CPU/RAM/Latency spikes) in VoxelPulse telemetry.',
      'Identifying multi-dimensional performance outliers in VoxelAssurance benchmark runs.'
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
      'Calculating point-to-point metric vector differences in VoxelPulse telemetry streams.',
      'Measuring feature vector proximity in KNN and clustering modules in VoxelAssurance.'
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
      'Detecting geographic edge-node traffic clustering and regional latency degradation in VoxelPulse.',
      'Evaluating spatial distribution of test failures across multi-region cloud worker clusters in VoxelAssurance.'
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
      'Modeling dynamic feedback loops between database IO, request queue length, and API latency in VoxelPulse.',
      'Simulating cascade performance effects of system load shocks in VoxelAssurance testing.'
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
      'Quantifying maximum worst-case latency tail risk (p99+ SLA breaches) in VoxelPulse telemetry.',
      'Assessing tail financial risk and downtime penalty exposures in VoxelAssurance SLA audits.'
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
      'Evaluating internal consistency of multi-prompt subjective user feedback scores in VoxelPulse.',
      'Assessing multi-rubric LLM judge evaluation scale reliability in VoxelAssurance.'
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
      'Measuring individual test case difficulty levels in automated benchmark suites in VoxelAssurance.',
      'Evaluating prompt test item difficulty vs AI model capability in VoxelPulse.'
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
      'Correlating feature flag state (0/1) against user session engagement duration in VoxelPulse.',
      'Evaluating test case pass/fail outcome correlation against system execution latency in VoxelAssurance.'
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
      'Evaluating anomaly detection classifiers on heavily imbalanced telemetry data in VoxelPulse.',
      'Benchmarking security defect detection accuracy in VoxelAssurance release testing.'
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
      'Evaluating reproducibility between local development benchmarks and production telemetry in VoxelPulse.',
      'Verifying agreement between automated LLM judge scores and human expert raters in VoxelAssurance.'
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
      'Detecting subtle, persistent memory leak micro-creeps in VoxelPulse telemetry.',
      'Early detection of gradual performance degradation in VoxelAssurance build iterations.'
    ],
    when: 'Use when detecting small, persistent process mean shifts (0.5σ to 1.5σ) faster than standard Shewhart X-bar charts.',
    cautions: [
      'Requires accurate estimation of baseline target mean μ₀ and standard deviation σ.',
      'Fast Initial Response (FIR) feature can be added to detect initial out-of-control states rapidly.'
    ],
    workbenchId: 'spc_cusum',
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
            <h4>VoxelPulse Telemetry Control Plane</h4>
            <p style="font-size:14px;color:#c9d7e8;margin:0 0 10px">Continuous A/B testing, statistical telemetry analysis, and automated feedback loops for live backend services.</p>
            <a style="font-weight:700;font-size:14px" href="https://voxelxengine.com/products/voxel-pulse">Explore VoxelPulse →</a>
          </div>
          <div class="cta-box assurance">
            <h4>VoxelAssurance Release Readiness</h4>
            <p style="font-size:14px;color:#c9d7e8;margin:0 0 10px">Fixed-price AI release-readiness sprints, automated regression testing, and reliability statistical benchmarks.</p>
            <a style="font-weight:700;font-size:14px;color:var(--accent2)" href="https://voxelxengine.com/products/voxel-assurance">Explore VoxelAssurance →</a>
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
      <div>Feeds into <a href="https://voxelxengine.com/products/voxel-pulse">VoxelPulse</a> &amp; <a href="https://voxelxengine.com/products/voxel-assurance">VoxelAssurance</a>.</div>
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
        <h3 style="margin:0 0 8px;color:#5df2b6">VoxelPulse Telemetry Control Plane</h3>
        <p style="margin:0;font-size:14px;color:#9db0c7">Embed continuous statistical testing into live telemetry pipelines, A/B test routing, and feature flag analytics.</p>
      </div>
      <div>
        <h3 style="margin:0 0 8px;color:#38bdf8">VoxelAssurance Release Readiness</h3>
        <p style="margin:0;font-size:14px;color:#9db0c7">Validate release candidate performance, latency distribution shifts, and LLM output quality scores with automated statistical gates.</p>
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
