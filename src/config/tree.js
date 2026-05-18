import { C } from '../palette.js';

export const TREE = [
  {
    cat: "COMPARE MEANS", color: C.pos,
    tests: [
      { id: "t_welch",   label: "Welch t-test",         tag: "2 groups · d · power · 95% CI" },
      { id: "t_one",     label: "One-sample t-test",     tag: "vs null mean · Cohen's d" },
      { id: "t_paired",  label: "Paired t-test",         tag: "matched · repeated measures" },
      { id: "trimmed",   label: "Yuen's Trimmed t-test", tag: "robust · outlier-resistant · 20% trim" },
      { id: "z_known",   label: "z-test (known σ)",      tag: "population SD known" },
      { id: "sign",      label: "Sign Test",             tag: "minimal assumptions · fast" },
    ],
  },
  {
    cat: "ANALYSIS OF VARIANCE", color: "#60a5fa",
    tests: [
      { id: "anova",      label: "One-Way ANOVA",    tag: "3+ groups · Tukey HSD · η² · ω²" },
      { id: "welch_anova",label: "Welch's ANOVA",    tag: "robust to unequal variances" },
      { id: "twoway",     label: "Two-Way ANOVA",    tag: "2 factors · interaction · cell means" },
      { id: "ancova",     label: "ANCOVA",           tag: "covariate-adjusted group means" },
      { id: "rm_anova",   label: "RM ANOVA",         tag: "repeated measures · Greenhouse-Geisser ε" },
      { id: "kruskal",    label: "Kruskal-Wallis",   tag: "nonparametric ANOVA · η²" },
      { id: "friedman",   label: "Friedman Test",    tag: "nonparametric RM · Kendall's W" },
      { id: "cochranQ",   label: "Cochran's Q",      tag: "k related binary proportions" },
    ],
  },
  {
    cat: "NONPARAMETRIC", color: C.warn,
    tests: [
      { id: "mwu",      label: "Mann-Whitney U",        tag: "2 groups · rank-biserial r · Cliff's δ" },
      { id: "wilcoxon", label: "Wilcoxon Signed-Rank",  tag: "paired / one-sample · r" },
    ],
  },
  {
    cat: "CORRELATION", color: C.accent,
    tests: [
      { id: "pearson",   label: "Pearson r",          tag: "linear · 95% CI (Fisher z) · R²" },
      { id: "spearman",  label: "Spearman ρ",         tag: "rank-based · monotonic" },
      { id: "kendall",   label: "Kendall τ-b",        tag: "concordant pairs · small n" },
      { id: "partial",   label: "Partial Correlation", tag: "control for Z · semi-partial r" },
      { id: "pointbis",  label: "Point-Biserial r",   tag: "binary + continuous" },
    ],
  },
  {
    cat: "REGRESSION", color: "#ff6bd6",
    tests: [
      { id: "ols_simple",    label: "Simple OLS",             tag: "β · SE · t · R² · Durbin-Watson" },
      { id: "ols_multi",     label: "Multiple OLS",           tag: "β + VIF + adj. R² + collinearity" },
      { id: "polynomial",    label: "Polynomial Regression",  tag: "quadratic / cubic / quartic trends" },
      { id: "hierarchical",  label: "Hierarchical Regression",tag: "model comparison · ΔR² · F-change" },
      { id: "logistic",      label: "Logistic Regression",    tag: "binary · OR · AIC · BIC · F1" },
      { id: "mediation",     label: "Mediation",              tag: "Baron-Kenny + Sobel + path diagram" },
      { id: "med_bootstrap", label: "Bootstrap Mediation",    tag: "percentile CI for indirect effect" },
      { id: "moderation",    label: "Moderation",             tag: "X×Z interaction · simple slopes" },
    ],
  },
  {
    cat: "CATEGORICAL", color: C.purple,
    tests: [
      { id: "chisq",    label: "Chi-Square",         tag: "independence · Cramér's V · observed vs expected" },
      { id: "chigof",   label: "Chi-Square GoF",     tag: "goodness-of-fit · Cohen's w" },
      { id: "fisher",   label: "Fisher's Exact",     tag: "small n · exact · 2×2 · OR" },
      { id: "mcnemar",  label: "McNemar's Test",     tag: "paired proportions · before/after" },
      { id: "binomial", label: "Binomial Exact",     tag: "exact · small n · p̂ vs p₀" },
      { id: "prop1",    label: "One-Proportion z",   tag: "p̂ vs p₀ · Cohen's h · CI" },
      { id: "prop2",    label: "Two-Proportion z",   tag: "RR · OR · ARR · NNT" },
    ],
  },
  {
    cat: "EQUIVALENCE & BAYES", color: C.ok,
    tests: [
      { id: "tost",    label: "TOST Equivalence",    tag: "two one-sided t-tests · bounds" },
      { id: "bayes_t", label: "Bayesian t-test",     tag: "BF₁₀ · JZS Cauchy prior · Bayes factors" },
      { id: "bayes_r", label: "Bayesian Correlation",tag: "BF for H₀: ρ = 0" },
    ],
  },
  {
    cat: "MULTIVARIATE", color: "#34d399",
    tests: [
      { id: "pca",       label: "PCA",               tag: "eigenvalues · loadings · scree · scores" },
      { id: "efa",       label: "EFA (Varimax)",      tag: "factor analysis · communalities · uniqueness" },
      { id: "cronbach",  label: "Cronbach's α",       tag: "internal consistency · α-if-deleted · item-total r" },
      { id: "splithalf", label: "Split-Half",         tag: "Spearman-Brown corrected reliability" },
      { id: "icc",       label: "ICC(2,1)",           tag: "inter-rater reliability · two-way random" },
      { id: "kappa",     label: "Cohen's κ",          tag: "categorical agreement · weighted" },
    ],
  },
  {
    cat: "META-ANALYSIS & CAUSAL", color: "#fbbf24",
    tests: [
      { id: "meta", label: "Random-Effects Meta", tag: "DerSimonian-Laird · I² · τ · prediction interval" },
      { id: "did",  label: "Diff-in-Differences", tag: "causal inference · policy evaluation" },
    ],
  },
  {
    cat: "DIAGNOSTICS & TOOLS", color: C.neg,
    tests: [
      { id: "grubbs",      label: "Grubbs Outlier Test",    tag: "single outlier detection" },
      { id: "normality",   label: "Normality Tests",         tag: "D'Agostino-Pearson · Shapiro-Wilk · QQ" },
      { id: "homogeneity", label: "Homogeneity of Variance", tag: "Levene · Bartlett" },
      { id: "samplesize",  label: "Sample Size Calculator",  tag: "d → n · r → n · power curves" },
      { id: "effectconv",  label: "Effect Size Converter",   tag: "d ↔ r ↔ OR ↔ η² ↔ f" },
      { id: "corrections", label: "Multiple Comparisons",    tag: "Bonferroni · Holm · Benjamini-Hochberg" },
      { id: "bootstrap",   label: "Bootstrap CI",            tag: "mean · median · SD · B=1999" },
      { id: "sensitivity", label: "LOO Sensitivity",         tag: "leave-one-out robustness check" },
    ],
  },
];
