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

  // --- MANN-WHITNEY U & NONPARAMETRIC FAMILY ---
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
  <meta name="description" content="Free static, shareable statistical test calculators: Mann-Whitney U, Welch t-test, ANOVA variants, non-parametric tests, power analysis, correlation, and release readiness benchmarking.">
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
