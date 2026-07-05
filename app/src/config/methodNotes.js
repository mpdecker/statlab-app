/** Educational methodology notes — surfaced as expandable "?" panels in the UI.
 *  Each entry explains what the test does, when to use it, key assumptions, and citation.
 *  Tests not listed here either have no special caveats or are handled by IMPL_NOTES. */

export const METHOD_NOTES = {
  // ── COMPARE MEANS ──
  t_welch: {
    description: "Welch's t-test compares the means of two independent groups without assuming equal variances.",
    usage: "Use this instead of the Student t-test when group sizes or variances differ. It is the recommended default for two-group comparisons in most disciplines.",
    assumptions: ["Independent observations within and between groups", "Approximately normal distribution in each group (robust for n ≥ 30)", "No extreme outliers"],
    cite: "Welch, B. L. (1947). The generalization of Student's problem when several different population variances are involved. Biometrika, 34(1/2), 28–35.",
  },
  t_one: {
    description: "A one-sample t-test compares a sample mean to a known or hypothesized population mean.",
    usage: "Use when you have a single group and want to test whether it differs from a reference value (e.g., population average, chance level).",
    assumptions: ["Independent observations", "Approximately normal distribution (robust for n ≥ 30)", "Continuous outcome"],
    cite: "Student (1908). The probable error of a mean. Biometrika, 6(1), 1–25.",
  },
  t_paired: {
    description: "A paired-samples t-test compares two measurements from the same subjects (before/after, matched pairs).",
    usage: "Use when the same subjects are measured twice or when subjects are matched in pairs. Computes differences and tests whether the mean difference is zero.",
    assumptions: ["Independent pairs", "Differences are approximately normally distributed", "No extreme outliers in differences"],
    cite: "Student (1908). The probable error of a mean. Biometrika, 6(1), 1–25.",
  },
  trimmed: {
    description: "Yuen's trimmed-mean t-test compares two groups using trimmed means (default 20% trim), reducing outlier influence.",
    usage: "Use when your data has outliers or heavy tails that violate normality. More robust than Welch's t-test at the cost of some statistical power.",
    assumptions: ["Independent observations", "Symmetric-ish distribution (trimming handles tails)", "Groups may have unequal variances"],
    cite: "Yuen, K. K. (1974). The two-sample trimmed t for unequal population variances. Biometrika, 61(1), 165–170.",
  },
  z_known: {
    description: "The z-test compares group means when the population standard deviation (σ) is known.",
    usage: "Rarely used in practice because σ is almost never known. Included for pedagogical completeness and for situations where σ is well-established (e.g., standardized test scores).",
    assumptions: ["Population standard deviation is known", "Independent observations", "Normal distribution or large n"],
    cite: "Fisher, R. A. (1925). Statistical methods for research workers. Oliver & Boyd.",
  },
  sign: {
    description: "The sign test is a nonparametric test of the median difference, using only the direction (sign) of each pair, not magnitude.",
    usage: "Use when assumptions for the paired t-test are severely violated or when you only have ordinal/directional data. It is the simplest nonparametric test with minimal assumptions.",
    assumptions: ["Independent pairs", "Differences are continuous (or at least ordinal)", "No assumption about distribution shape"],
    cite: "Dixon, W. J., & Mood, A. M. (1946). The statistical sign test. Journal of the American Statistical Association, 41(236), 557–566.",
  },

  // ── ANOVA ──
  anova: {
    description: "One-way ANOVA compares means across three or more independent groups to determine if at least one group differs.",
    usage: "Use when comparing 3+ groups on a continuous outcome. Follow up with Tukey HSD post-hoc tests to identify which specific groups differ.",
    assumptions: ["Independent observations within and between groups", "Approximately normal distribution in each group", "Homogeneity of variance (Levene's test)", "Continuous outcome"],
    cite: "Fisher, R. A. (1925). Statistical methods for research workers. Oliver & Boyd.",
  },
  welch_anova: {
    description: "Welch's ANOVA tests for group mean differences without assuming equal variances across groups.",
    usage: "Use instead of standard one-way ANOVA when Levene's test indicates unequal variances. It sacrifices some power but protects against inflated Type I error rates.",
    assumptions: ["Independent observations", "Approximately normal distribution in each group", "Variances may differ across groups"],
    cite: "Welch, B. L. (1951). On the comparison of several mean values: An alternative approach. Biometrika, 38(3/4), 330–336.",
  },
  twoway: {
    description: "Two-way ANOVA examines the effects of two categorical factors and their interaction on a continuous outcome.",
    usage: "Use when you have two categorical independent variables (e.g., treatment × gender). The interaction term tells you whether the effect of one factor depends on the level of the other.",
    assumptions: ["Independent observations", "Normal distribution within each cell", "Homogeneity of variance across cells", "Balanced or near-balanced design preferred"],
    cite: "Fisher, R. A. (1925). Statistical methods for research workers. Oliver & Boyd.",
  },
  ancova: {
    description: "ANCOVA compares group means while statistically controlling for one or more continuous covariates.",
    usage: "Use to reduce error variance and increase power by controlling for a known confound (e.g., pre-test scores when comparing post-test outcomes).",
    assumptions: ["Independence of covariate and treatment (no treatment effect on covariate)", "Homogeneity of regression slopes across groups", "Normal distribution of residuals", "Linear relationship between covariate and outcome"],
    cite: "Fisher, R. A. (1932). Statistical methods for research workers (4th ed.). Oliver & Boyd.",
  },
  rm_anova: {
    description: "Repeated-measures ANOVA tests whether means differ across multiple measurements from the same subjects.",
    usage: "Use for within-subjects designs (e.g., measuring the same participants at three time points). Assumes sphericity — violations are corrected with Greenhouse-Geisser ε.",
    assumptions: ["Sphericity (equal variances of differences between all condition pairs)", "Normality of residuals", "No missing data (balanced design)"],
    cite: "Greenhouse, S. W., & Geisser, S. (1959). On methods in the analysis of profile data. Psychometrika, 24(2), 95–112.",
  },
  kruskal: {
    description: "The Kruskal-Wallis test is the nonparametric alternative to one-way ANOVA, testing whether group medians differ.",
    usage: "Use when normality or homogeneity of variance assumptions are violated. It ranks all observations and compares mean ranks across groups.",
    assumptions: ["Independent observations", "Observations are at least ordinal", "Distributions have similar shape across groups (for median interpretation)"],
    cite: "Kruskal, W. H., & Wallis, W. A. (1952). Use of ranks in one-criterion variance analysis. Journal of the American Statistical Association, 47(260), 583–621.",
  },
  friedman: {
    description: "The Friedman test is the nonparametric alternative to RM ANOVA, testing for differences across repeated measures.",
    usage: "Use when the sphericity assumption for RM ANOVA is violated or when working with ordinal data from a within-subjects design.",
    assumptions: ["Subjects are independent", "Outcome is at least ordinal", "No missing observations across conditions"],
    cite: "Friedman, M. (1937). The use of ranks to avoid the assumption of normality implicit in the analysis of variance. Journal of the American Statistical Association, 32(200), 675–701.",
  },
  cochranQ: {
    description: "Cochran's Q tests whether k related binary proportions are equal (e.g., whether pass rates differ across three exam sections taken by the same students).",
    usage: "Use for repeated-measures binary data — the binary equivalent of RM ANOVA or Friedman's test.",
    assumptions: ["Binary outcomes (0/1) for each subject across conditions", "Independent subjects", "Each subject measured under all conditions"],
    cite: "Cochran, W. G. (1950). The comparison of percentages in matched samples. Biometrika, 37(3/4), 256–266.",
  },

  // ── NONPARAMETRIC ──
  mwu: {
    description: "The Mann-Whitney U test compares two independent groups using ranks; it is the nonparametric alternative to the independent-samples t-test.",
    usage: "Use when data are ordinal or when t-test assumptions are violated. Tests whether observations from one group tend to be larger than those from the other.",
    assumptions: ["Independent observations", "Outcome is at least ordinal", "Distributions have similar shape (for median interpretation)"],
    cite: "Mann, H. B., & Whitney, D. R. (1947). On a test of whether one of two random variables is stochastically larger than the other. Annals of Mathematical Statistics, 18(1), 50–60.",
  },
  wilcoxon: {
    description: "The Wilcoxon signed-rank test compares two related samples or a single sample median; it is the nonparametric alternative to the paired t-test.",
    usage: "Use when differences are not normally distributed. It ranks the absolute differences and tests whether the median difference is zero.",
    assumptions: ["Paired or matched observations", "Differences are at least ordinal", "Distribution of differences is symmetric"],
    cite: "Wilcoxon, F. (1945). Individual comparisons by ranking methods. Biometrics Bulletin, 1(6), 80–83.",
  },

  // ── CORRELATION ──
  pearson: {
    description: "Pearson's r measures the strength and direction of a linear relationship between two continuous variables (range: -1 to +1).",
    usage: "Use as the default correlation measure when both variables are continuous and approximately normally distributed. Fisher z-transformation provides a 95% confidence interval.",
    assumptions: ["Linear relationship between variables", "Both variables are approximately normally distributed", "Homoscedasticity", "No extreme outliers"],
    cite: "Pearson, K. (1895). Note on regression and inheritance in the case of two parents. Proceedings of the Royal Society of London, 58, 240–242.",
  },
  spearman: {
    description: "Spearman's ρ (rho) measures the strength and direction of a monotonic relationship between two variables using ranked data.",
    usage: "Use when the relationship is monotonic but not necessarily linear, or when one or both variables are ordinal. More robust to outliers than Pearson's r.",
    assumptions: ["Monotonic relationship", "Variables are at least ordinal", "Independence of observations"],
    cite: "Spearman, C. (1904). The proof and measurement of association between two things. American Journal of Psychology, 15(1), 72–101.",
  },
  kendall: {
    description: "Kendall's τ-b measures ordinal association between two variables based on concordant and discordant pairs. More robust than Spearman for small samples with many ties.",
    usage: "Use for small samples or when there are many tied ranks. τ-b is generally preferred over Spearman when ties are present.",
    assumptions: ["Variables are at least ordinal", "Independent observations"],
    cite: "Kendall, M. G. (1938). A new measure of rank correlation. Biometrika, 30(1/2), 81–93.",
  },
  partial: {
    description: "Partial correlation measures the relationship between two variables while controlling for (holding constant) one or more additional variables.",
    usage: "Use to determine whether a correlation between X and Y remains after removing the influence of Z. Critical for distinguishing direct from spurious relationships.",
    assumptions: ["Linear relationships among all variables", "Multivariate normality", "No multicollinearity among control variables"],
    cite: "Fisher, R. A. (1924). The distribution of the partial correlation coefficient. Metron, 3, 329–332.",
  },
  pointbis: {
    description: "Point-biserial correlation measures the association between a continuous variable and a true dichotomy (0/1).",
    usage: "Use when one variable is genuinely binary (e.g., gender, treatment/control) and the other is continuous. Mathematically equivalent to Pearson's r.",
    assumptions: ["Continuous variable is normally distributed within each binary group", "Equal variances across groups (preferred)", "Binary variable is a true dichotomy"],
    cite: "Pearson, K. (1909). On a new method of determining correlation between a measured character A and a character B. Biometrika, 7(1/2), 96–105.",
  },

  // ── REGRESSION ──
  ols_simple: {
    description: "Simple OLS regression models a linear relationship between one predictor and one outcome using least-squares estimation.",
    usage: "Use for basic linear prediction and to quantify the strength of a single predictor. Provides Durbin-Watson autocorrelation check and standardized coefficients.",
    assumptions: ["Linear relationship", "Independence of errors", "Homoscedasticity (constant error variance)", "Normality of residuals", "No extreme outliers or influential points"],
    cite: "Galton, F. (1886). Regression towards mediocrity in hereditary stature. Journal of the Anthropological Institute, 15, 246–263.",
  },
  ols_multi: {
    description: "Multiple OLS regression extends simple regression to model the relationship between multiple predictors and a continuous outcome.",
    usage: "Use when you want to understand how several predictors jointly explain an outcome. VIF diagnostics flag multicollinearity, and adjusted R² penalizes for model complexity.",
    assumptions: ["Linear relationships between each predictor and outcome", "Independence of errors", "Homoscedasticity", "No perfect multicollinearity (VIF < 5)", "Normality of residuals"],
    cite: "Pearson, K. (1908). On the generalized theory of alternative inheritance. Biometrika, 6, 80–93.",
  },
  polynomial: {
    description: "Polynomial regression fits a curvilinear relationship by including squared (quadratic), cubed (cubic), or higher-order terms of the predictor.",
    usage: "Use when a scatterplot reveals a U-shaped or S-shaped relationship that a straight line cannot capture. Higher-degree polynomials risk overfitting — prefer the simplest model that fits.",
    assumptions: ["Relationship is curvilinear but continuous and smooth", "Independence of errors", "Homoscedasticity", "Avoid overfitting with excessive polynomial degrees"],
    cite: "Fisher, R. A. (1925). Statistical methods for research workers. Oliver & Boyd.",
  },
  hierarchical: {
    description: "Hierarchical (block-entry) regression tests whether adding a set of predictors significantly improves model fit beyond an existing model.",
    usage: "Use to test theoretical models where you enter variables in planned steps (e.g., demographics first, then psychological variables). The ΔR² and F-change test whether each block adds explanatory power.",
    assumptions: ["Same as OLS regression assumptions per block", "Predictors are entered in a theoretically justified order", "Adequate sample size for each block (k predictors + 1 per block)"],
    cite: "Cohen, J., Cohen, P., West, S. G., & Aiken, L. S. (2003). Applied multiple regression/correlation analysis for the behavioral sciences (3rd ed.). Routledge.",
  },
  logistic: {
    description: "Logistic regression models the probability of a binary outcome using Newton-Raphson MLE. Outputs include odds ratios, AIC/BIC, and classification metrics (accuracy, precision, F1).",
    usage: "Use when the outcome is binary (yes/no, success/failure) and you want to predict probability from continuous or categorical predictors. Interpret odds ratios for effect size.",
    assumptions: ["Binary outcome", "Independence of observations", "Linearity in the logit (log-odds of predictors)", "No perfect separation", "Adequate events per predictor variable (EPV ≥ 10)"],
    cite: "Cox, D. R. (1958). The regression analysis of binary sequences. Journal of the Royal Statistical Society: Series B, 20(2), 215–242.",
  },
  ordinal: {
    description: "Ordinal logistic regression (proportional odds model) models an ordinal outcome (e.g., Likert scale) using proportional odds with monotone thresholds.",
    usage: "Use when the outcome has ordered categories (strongly disagree → strongly agree). The proportional odds assumption means the effect of each predictor is the same across all thresholds.",
    assumptions: ["Outcome is ordinal (ordered categories)", "Proportional odds assumption (parallel lines test)", "Independence of observations", "No perfect separation"],
    cite: "McCullagh, P. (1980). Regression models for ordinal data. Journal of the Royal Statistical Society: Series B, 42(2), 109–142.",
  },
  poisson: {
    description: "Poisson regression models count outcomes. Outputs include incidence rate ratios (IRR), deviance, and dispersion diagnostics.",
    usage: "Use for count data (number of events, occurrences). Check the dispersion parameter — if φ > 1.5, use Negative Binomial instead.",
    assumptions: ["Count outcome (non-negative integers)", "Independence of counts", "Mean = variance (equidispersion)", "Log-linear relationship between predictors and outcome"],
    cite: "Poisson, S. D. (1837). Recherches sur la probabilité des jugements. Bachelier.",
  },
  negbinom: {
    description: "Negative binomial regression extends Poisson regression for count data with overdispersion (variance > mean) by adding a dispersion parameter θ.",
    usage: "Use when Poisson regression shows overdispersion (φ̂ > 1.5) or when the variance of your count outcome substantially exceeds the mean.",
    assumptions: ["Count outcome", "Independence of counts", "Mean-variance relationship: Var = μ + μ²/θ", "Log-linear relationship"],
    cite: "Lawless, J. F. (1987). Negative binomial and mixed Poisson regression. Canadian Journal of Statistics, 15(3), 209–225.",
  },
  mediation: {
    description: "Baron-Kenny mediation analysis tests whether an independent variable (X) influences a dependent variable (Y) through a mediator (M). Includes Sobel z-test.",
    usage: "Use to test hypothesized causal pathways (e.g., does training improve performance through increased confidence?). The Sobel test checks the statistical significance of the indirect (a×b) effect.",
    assumptions: ["Causal ordering is correctly specified (X → M → Y)", "No unmeasured confounding of X-M, M-Y, or X-Y relationships", "Linearity and additivity", "No X-M interaction affecting Y"],
    cite: "Baron, R. M., & Kenny, D. A. (1986). The moderator–mediator variable distinction. Journal of Personality and Social Psychology, 51(6), 1173–1182.",
  },
  med_bootstrap: {
    description: "Bootstrap mediation uses resampling to construct a percentile confidence interval for the indirect effect, overcoming normality assumptions of the Sobel test.",
    usage: "Prefer this over the standard Sobel test for mediation when sample sizes are small or the indirect effect distribution is non-normal. Bootstrapped CIs have better statistical properties.",
    assumptions: ["Same mediation assumptions (causal ordering, no confounding)", "Bootstrap resamples are representative of the population", "Adequate bootstrap replicates (B ≥ 1000)"],
    cite: "Preacher, K. J., & Hayes, A. F. (2004). SPSS and SAS procedures for estimating indirect effects in simple mediation models. Behavior Research Methods, 36(4), 717–731.",
  },
  moderation: {
    description: "Moderation analysis tests whether the relationship between X and Y changes depending on the level of a moderator Z (interaction). Includes simple slopes at Z ± 1 SD.",
    usage: "Use when you hypothesize that the effect of X on Y varies across levels of Z (e.g., the effect of stress on performance depends on coping ability). Simple slopes help interpret the interaction.",
    assumptions: ["Linear relationships", "Independence of errors", "Homoscedasticity", "Predictors are mean-centered before creating interaction term (recommended)"],
    cite: "Aiken, L. S., & West, S. G. (1991). Multiple regression: Testing and interpreting interactions. Sage.",
  },

  // ── CATEGORICAL ──
  chisq: {
    description: "Pearson's chi-square test of independence examines whether two categorical variables are associated in a contingency table.",
    usage: "Use for cross-tabulated categorical data (e.g., gender × voting preference). Cramér's V measures effect size. Switch to Fisher's Exact when expected counts < 5.",
    assumptions: ["Independent observations", "Expected frequency ≥ 5 in ≥ 80% of cells", "Categories are mutually exclusive", "Sufficient sample size"],
    cite: "Pearson, K. (1900). On the criterion that a given system of deviations from the probable is such that it can be reasonably supposed to have arisen from random sampling. Philosophical Magazine, 50(302), 157–175.",
  },
  chigof: {
    description: "The chi-square goodness-of-fit test compares observed category frequencies to expected (theoretical) frequencies.",
    usage: "Use to test whether a sample distribution matches a hypothesized distribution (e.g., are dice fair? Do responses follow expected proportions?).",
    assumptions: ["Independent observations", "Expected frequency ≥ 5 in ≥ 80% of categories", "Categories are mutually exclusive and exhaustive"],
    cite: "Pearson, K. (1900). On the criterion... Philosophical Magazine, 50(302), 157–175.",
  },
  fisher: {
    description: "Fisher's exact test computes the exact probability of a 2×2 contingency table, recommended for small sample sizes.",
    usage: "Use instead of chi-square when any expected cell count is < 5 or when total N is small. Exact, not approximate.",
    assumptions: ["Independent observations", "Fixed row and column margins", "Binary classification on both dimensions"],
    cite: "Fisher, R. A. (1922). On the interpretation of χ² from contingency tables. Journal of the Royal Statistical Society, 85(1), 87–94.",
  },
  mcnemar: {
    description: "McNemar's test compares paired proportions (e.g., before/after) for binary outcomes.",
    usage: "Use for paired binary data — testing whether the proportion of 'yes' responses changed after an intervention. Focuses on discordant pairs.",
    assumptions: ["Paired observations", "Binary outcome", "Independent pairs"],
    cite: "McNemar, Q. (1947). Note on the sampling error of the difference between correlated proportions or percentages. Psychometrika, 12(2), 153–157.",
  },
  binomial: {
    description: "The exact binomial test compares an observed proportion to a hypothesized value using the binomial distribution.",
    usage: "Use for small samples or when normal approximation to the proportion is unreliable. Computes exact p-values from the binomial distribution.",
    assumptions: ["Independent observations", "Binary outcome (success/failure)", "Fixed number of trials", "Constant probability of success"],
    cite: "Clopper, C. J., & Pearson, E. S. (1934). The use of confidence or fiducial limits illustrated in the case of the binomial. Biometrika, 26(4), 404–413.",
  },
  prop1: {
    description: "The one-proportion z-test compares an observed sample proportion to a hypothesized population proportion.",
    usage: "Use for large samples when comparing a single proportion to a known value (e.g., is the pass rate significantly different from 50%?).",
    assumptions: ["Independent observations", "Binary outcome", "n × p̂ ≥ 10 and n × (1-p̂) ≥ 10 (normal approximation)", "Random sample"],
    cite: "Wilson, E. B. (1927). Probable inference, the law of succession, and statistical inference. Journal of the American Statistical Association, 22(158), 209–212.",
  },
  prop2: {
    description: "The two-proportion z-test compares proportions from two independent groups. Outputs include risk ratio (RR), odds ratio (OR), absolute risk reduction (ARR), and NNT.",
    usage: "Use when comparing success rates between two groups (treatment vs control). NNT (number needed to treat) is especially useful in clinical contexts.",
    assumptions: ["Independent groups", "Binary outcomes", "n × p̂ ≥ 10 and n × (1-p̂) ≥ 10 in both groups", "Independent observations within groups"],
    cite: "Newcombe, R. G. (1998). Interval estimation for the difference between independent proportions. Statistics in Medicine, 17(8), 873–890.",
  },

  // ── EQUIVALENCE & BAYES ──
  tost: {
    description: "TOST (Two One-Sided Tests) determines whether two groups are statistically equivalent — that their difference falls within a pre-specified equivalence bound.",
    usage: "Use when you want to show that two treatments are 'not different enough to matter' rather than proving they differ. Essential for bioequivalence studies.",
    assumptions: ["Same as the underlying t-test", "Equivalence bounds must be chosen a priori based on domain knowledge", "Adequate sample size to achieve desired power"],
    cite: "Schuirmann, D. J. (1987). A comparison of the two one-sided tests procedure and the power approach. Journal of Pharmacokinetics and Biopharmaceutics, 15(6), 657–680.",
  },
  bayes_t: {
    description: "Bayesian t-test computes a Bayes factor (BF₁₀) quantifying how much the data favor the alternative hypothesis over the null, using a JZS Cauchy prior.",
    usage: "Use when you want to quantify evidence for or against the null hypothesis, rather than making a binary reject/fail-to-reject decision. BF₁₀ > 3 indicates moderate evidence for the alternative. Numerical integration (500-point quadrature) is used for computation.",
    assumptions: ["Same as the underlying t-test", "Choice of prior (JZS Cauchy) influences the result — interpret with this in mind", "BF₁₀ values are continuous; avoid dichotomizing"],
    cite: "Rouder, J. N., Speckman, P. L., Sun, D., Morey, R. D., & Iverson, G. (2009). Bayesian t tests for accepting and rejecting the null hypothesis. Psychonomic Bulletin & Review, 16(2), 225–237.",
  },
  bayes_r: {
    description: "Bayesian correlation test computes a Bayes factor for testing whether a population correlation ρ differs from zero.",
    usage: "Use as a Bayesian alternative to significance testing for correlation. Note: this uses a Jeffreys-style approximation, not the full JZS pipeline. Confirm with dedicated software for critical decisions.",
    assumptions: ["Bivariate normality (or large n)", "Linear relationship", "Prior sensitivity should be considered"],
    cite: "Jeffreys, H. (1961). Theory of probability (3rd ed.). Oxford University Press.",
  },

  // ── MULTIVARIATE ──
  pca: {
    description: "Principal Component Analysis reduces dimensionality by transforming correlated variables into uncorrelated principal components. Uses Jacobi eigendecomposition on the correlation matrix.",
    usage: "Use to explore structure, reduce multicollinearity before regression, or create composite scores. The scree plot and λ > 1 rule guide component retention. Varimax rotation is available via the EFA module.",
    assumptions: ["Variables are continuous (or at least ordinal with 5+ levels)", "Linear relationships among variables", "Adequate sample size (5–15 observations per variable)", "KMO > 0.5 and significant Bartlett's test recommended"],
    cite: "Hotelling, H. (1933). Analysis of a complex of statistical variables into principal components. Journal of Educational Psychology, 24(6), 417–441.",
  },
  efa: {
    description: "Exploratory Factor Analysis with Varimax rotation identifies latent factors underlying observed variables. Computes communalities and uniqueness for each variable.",
    usage: "Use when you hypothesize that measured variables reflect a smaller number of unobserved constructs. Varimax rotation produces orthogonal (uncorrelated) factors — use oblique rotation in dedicated software if factors are expected to correlate.",
    assumptions: ["Variables are continuous", "Linear relationships", "At least 3 variables per expected factor", "Sample size > 100 or 5–10 per variable", "Bartlett's test of sphericity should be significant"],
    cite: "Kaiser, H. F. (1958). The varimax criterion for analytic rotation in factor analysis. Psychometrika, 23(3), 187–200.",
  },
  manova: {
    description: "MANOVA extends ANOVA to multiple dependent variables simultaneously. Computes Wilks' Λ, Pillai's trace, Hotelling-Lawley trace, and Roy's largest root.",
    usage: "Use when you have multiple correlated outcomes and want to test group differences across all of them simultaneously. More powerful than running separate ANOVAs when outcomes are correlated.",
    assumptions: ["Multivariate normality of residuals", "Homogeneity of covariance matrices (Box's M test)", "Independence of observations", "Linear relationships among DVs"],
    cite: "Wilks, S. S. (1932). Certain generalizations in the analysis of variance. Biometrika, 24(3/4), 471–494.",
  },
  cancorr: {
    description: "Canonical correlation analysis identifies linear combinations of two sets of variables that are maximally correlated.",
    usage: "Use to explore relationships between two sets of variables (e.g., how do personality traits relate to job performance measures?). Each canonical root represents an independent dimension of association.",
    assumptions: ["Multivariate normality", "Linear relationships between sets", "Variables within each set should not be perfectly collinear", "Adequate sample size"],
    cite: "Hotelling, H. (1936). Relations between two sets of variates. Biometrika, 28(3/4), 321–377.",
  },
  lda: {
    description: "Linear Discriminant Analysis finds the linear combination of predictors that best separates two or more groups. Reports classification accuracy.",
    usage: "Use for classification when you have continuous predictors and a categorical outcome. Similar to MANOVA turned around — instead of testing whether groups differ, LDA predicts group membership.",
    assumptions: ["Multivariate normality of predictors within each group", "Homogeneity of covariance matrices", "Low multicollinearity among predictors"],
    cite: "Fisher, R. A. (1936). The use of multiple measurements in taxonomic problems. Annals of Eugenics, 7(2), 179–188.",
  },
  cronbach: {
    description: "Cronbach's α measures internal consistency reliability — how well a set of items measures a single construct. Reports item-total correlations and α-if-item-deleted.",
    usage: "Use to evaluate scale reliability. α ≥ .80 is good; α ≥ .70 is acceptable for research. If α-if-deleted increases substantially, consider removing that item.",
    assumptions: ["Items measure a single latent construct (unidimensionality — verify with PCA/EFA first)", "Items are continuous or at least interval-level", "All items are coded in the same direction"],
    cite: "Cronbach, L. J. (1951). Coefficient alpha and the internal structure of tests. Psychometrika, 16(3), 297–334.",
  },
  splithalf: {
    description: "Split-half reliability randomly divides items into two halves, computes the correlation, and applies the Spearman-Brown prophecy formula to estimate full-scale reliability.",
    usage: "Use as an alternative to Cronbach's α, particularly when you want to estimate reliability without the assumption of equal item variances. The Spearman-Brown correction adjusts for the halved test length.",
    assumptions: ["Items are parallel or tau-equivalent", "Halves are randomly split", "Scale is unidimensional"],
    cite: "Spearman, C. (1910). Correlation calculated from faulty data. British Journal of Psychology, 3(3), 271–295.",
  },
  icc: {
    description: "ICC(2,1) estimates inter-rater reliability for a two-way random-effects model (absolute agreement) — how consistently multiple raters score the same subjects.",
    usage: "Use when you have k raters each rating the same n subjects. ICC ≥ .75 indicates good reliability; ICC ≥ .90 is excellent. ICC(2,1) is appropriate when raters are randomly selected from a larger population.",
    assumptions: ["Raters are a random sample", "Subjects are random", "Continuous ratings", "No systematic rater bias"],
    cite: "Shrout, P. E., & Fleiss, J. L. (1979). Intraclass correlations: Uses in assessing rater reliability. Psychological Bulletin, 86(2), 420–428.",
  },
  kappa: {
    description: "Cohen's κ (kappa) measures inter-rater agreement for categorical ratings, correcting for agreement expected by chance.",
    usage: "Use when two raters classify subjects into categories. κ = 1 is perfect agreement; κ = 0 means agreement no better than chance. κ ≥ .60 is considered substantial.",
    assumptions: ["Two raters", "Categories are mutually exclusive and exhaustive", "Ratings are independent (raters do not confer)"],
    cite: "Cohen, J. (1960). A coefficient of agreement for nominal scales. Educational and Psychological Measurement, 20(1), 37–46.",
  },

  // ── PSYCHOMETRICS ──
  omega: {
    description: "McDonald's ω estimates reliability from a factor model, providing both total (ω_t) and hierarchical (ω_h) omega. Generally preferred over Cronbach's α.",
    usage: "Use when you have established (via EFA or CFA) that items load on a factor. ω is more accurate than α when factor loadings vary across items or when the scale is multidimensional.",
    assumptions: ["Factor model is correctly specified", "Continuous items", "Adequate sample for factor estimation", "In this implementation, ω_h = ω_t from a 1-factor model"],
    cite: "McDonald, R. P. (1999). Test theory: A unified treatment. Lawrence Erlbaum.",
  },
  parallel: {
    description: "Parallel analysis determines the number of factors to retain by comparing observed eigenvalues to those from random data (Monte Carlo simulation).",
    usage: "Use as the recommended method for determining factor retention. More accurate than the Kaiser rule (λ > 1) or visual scree plot alone. Retain factors where observed eigenvalue exceeds the 95th percentile of random eigenvalues.",
    assumptions: ["Variables are continuous", "40 Monte Carlo draws (increase in dedicated software for final decisions)", "Adequate sample size for stable correlation matrix"],
    cite: "Horn, J. L. (1965). A rationale and test for the number of factors in factor analysis. Psychometrika, 30(2), 179–185.",
  },
  irt_1pl: {
    description: "The Rasch (1PL) model estimates item difficulty parameters and person ability (θ) using joint maximum likelihood (JMLE-style, 80 iterations).",
    usage: "Use for test and questionnaire development. The 1PL model assumes all items discriminate equally — it is the simplest IRT model and produces sample-free item calibrations.",
    assumptions: ["Unidimensional latent trait", "Local independence (items uncorrelated given θ)", "Equal discrimination across items (fixed to 1)", "Sufficient sample size (> 200 recommended)"],
    cite: "Rasch, G. (1960). Probabilistic models for some intelligence and attainment tests. Danish Institute for Educational Research.",
  },
  irt_2pl: {
    description: "The 2PL model extends the Rasch model by estimating both item difficulty (b) and discrimination (a) parameters. Produces item characteristic curves (ICCs).",
    usage: "Use when items likely vary in how well they discriminate between ability levels. Discrimination parameters can be unstable in small samples — use 1PL if sample < 300.",
    assumptions: ["Unidimensional latent trait", "Local independence", "Discrimination parameters may differ across items", "Adequate sample size for stable a-parameter estimation"],
    cite: "Birnbaum, A. (1968). Some latent trait models. In F. M. Lord & M. R. Novick, Statistical theories of mental test scores. Addison-Wesley.",
  },
  scale_score: {
    description: "Scale scoring computes sum or mean scores across a set of items, with optional reverse-coding for negatively-worded items.",
    usage: "Use to create composite scores after reliability has been established. Sum scores preserve the original metric; mean scores produce per-item averages.",
    assumptions: ["Items measure the same construct", "Appropriate items have been reverse-coded", "Items use the same response scale (or scaling has been justified)"],
    cite: "Nunnally, J. C., & Bernstein, I. H. (1994). Psychometric theory (3rd ed.). McGraw-Hill.",
  },

  // ── MULTILEVEL ──
  hlm_ri: {
    description: "The random-intercept HLM fits a two-level model where the intercept varies across clusters (e.g., students nested in classrooms). Reports variance components and ICC.",
    usage: "Use for nested data structures. The ICC indicates what proportion of variance is between clusters. Design effect helps determine whether multilevel modeling is necessary.",
    assumptions: ["Hierarchical/nested data structure", "Level-1 residuals are normal and independent within clusters", "Level-2 random effects are normally distributed", "Sufficient clusters (≥ 20 recommended)"],
    cite: "Raudenbush, S. W., & Bryk, A. S. (2002). Hierarchical linear models (2nd ed.). Sage.",
  },
  hlm_rs: {
    description: "The random-slope HLM extends the random-intercept model by allowing the effect of a level-1 predictor to vary across clusters.",
    usage: "Use when you expect the relationship between a predictor and outcome to differ across clusters (e.g., the effect of study time on grades varies by school).",
    assumptions: ["Same as random-intercept HLM", "Sufficient within-cluster variation on the predictor", "Adequate clusters for variance component estimation"],
    cite: "Raudenbush, S. W., & Bryk, A. S. (2002). Hierarchical linear models (2nd ed.). Sage.",
  },
  icc_ml: {
    description: "Multilevel ICC partitions variance into between-cluster and within-cluster components for nested data designs.",
    usage: "Use to assess whether multilevel modeling is warranted. ICC > .10 suggests meaningful clustering that should be modeled. Design effect > 2 indicates standard errors will be underestimated by single-level analysis.",
    assumptions: ["Nested data structure", "Variance components are estimated via variance-components OLS", "Continuous outcome"],
    cite: "Snijders, T. A. B., & Bosker, R. J. (2012). Multilevel analysis (2nd ed.). Sage.",
  },

  // ── CLUSTERING ──
  kmeans: {
    description: "k-Means clustering partitions observations into k clusters using Lloyd's algorithm, evaluated with the silhouette score.",
    usage: "Use to discover natural groupings in continuous data. The silhouette score helps choose the optimal k (higher = better separation). Lloyd's algorithm is fast but can converge to local optima.",
    assumptions: ["Variables are continuous and on comparable scales (standardize first)", "Clusters are roughly spherical and of similar size", "All variables contribute equally to distance (equal weighting)"],
    cite: "Lloyd, S. P. (1982). Least squares quantization in PCM. IEEE Transactions on Information Theory, 28(2), 129–137.",
  },
  hclust: {
    description: "Hierarchical clustering builds a tree of nested clusters using Ward's method, which minimizes within-cluster variance at each merge.",
    usage: "Use when you don't know k in advance and want to explore the full hierarchical structure. Ward's method tends to produce compact, similarly-sized clusters.",
    assumptions: ["Variables are continuous and standardized", "Euclidean distance is meaningful for your data", "No single correct k — interpret the dendrogram"],
    cite: "Ward, J. H. (1963). Hierarchical grouping to optimize an objective function. Journal of the American Statistical Association, 58(301), 236–244.",
  },
  lca: {
    description: "Latent Class Analysis identifies unobserved subgroups (latent classes) in categorical data using the EM algorithm. Fits 2–4 class models and selects via BIC.",
    usage: "Use for categorical indicator variables when you suspect hidden subgroups (e.g., types of consumers, response patterns). BIC selects the best-fitting model; lower BIC is better.",
    assumptions: ["Indicators are categorical", "Local independence within classes", "Classes are mutually exclusive and exhaustive", "Sufficient sample for stable class enumeration"],
    cite: "Lazarsfeld, P. F., & Henry, N. W. (1968). Latent structure analysis. Houghton Mifflin.",
  },

  // ── NETWORK ──
  centrality: {
    description: "Centrality measures compute degree, betweenness, eigenvector, and closeness centrality for each node in a network.",
    usage: "Use to identify the most important or influential nodes in a network. Degree = number of connections; Betweenness = role as a bridge; Eigenvector = connected to well-connected others.",
    assumptions: ["Network is connected or at least has a giant component", "Edges represent meaningful relationships", "Direction of edges matters for interpretation"],
    cite: "Freeman, L. C. (1978). Centrality in social networks: Conceptual clarification. Social Networks, 1(3), 215–239.",
  },
  community: {
    description: "Community detection partitions a network into modules (communities) using greedy modularity optimization.",
    usage: "Use to find densely connected subgroups within a network. Modularity Q > 0.3 suggests meaningful community structure. Note: greedy optimization may not find the global optimum (Louvain or Leiden algorithms are preferred in dedicated software).",
    assumptions: ["Network is undirected", "Modularity is an appropriate quality metric for your question", "Absence of edge is meaningful"],
    cite: "Newman, M. E. J., & Girvan, M. (2004). Finding and evaluating community structure in networks. Physical Review E, 69(2), 026113.",
  },
  sociogram: {
    description: "Sociogram renders a network as a force-directed layout from an edge list.",
    usage: "Use to visualize social networks entered as edge pairs (A-B, B-C). Force layout positions connected nodes near each other.",
    assumptions: ["Edge list correctly represents relationships", "Force layout is approximate — node positions are not unique", "Suitable for visual exploration, not formal inference"],
    cite: "Moreno, J. L. (1934). Who shall survive? Nervous and Mental Disease Publishing.",
  },

  // ── META-ANALYSIS & CAUSAL ──
  meta: {
    description: "Random-effects meta-analysis pools effect sizes (Cohen's d) across studies using the DerSimonian-Laird τ² estimator. Reports I², τ, and prediction intervals.",
    usage: "Use when synthesizing results from multiple studies. I² > 75% indicates high heterogeneity — explore moderators. The prediction interval estimates where 95% of true effects lie in future studies.",
    assumptions: ["Studies are independent", "Effect sizes are comparable across studies", "Random-effects model assumes true effects vary across studies", "Publication bias should be assessed separately"],
    cite: "DerSimonian, R., & Laird, N. (1986). Meta-analysis in clinical trials. Controlled Clinical Trials, 7(3), 177–188.",
  },
  did: {
    description: "Difference-in-Differences estimates a causal treatment effect by comparing the change in outcomes over time between treatment and control groups.",
    usage: "Use for policy evaluation with pre/post and treatment/control data. The key assumption is parallel trends: treatment and control would have followed the same trajectory absent the intervention.",
    assumptions: ["Parallel trends (pre-treatment trends are similar in both groups)", "No simultaneous confounders", "Treatment timing is exogenous", "Stable unit treatment value assumption (SUTVA)"],
    cite: "Card, D., & Krueger, A. B. (1994). Minimum wages and employment. American Economic Review, 84(4), 772–793.",
  },
  psm: {
    description: "Propensity Score Matching estimates treatment effects by matching treated and control units on propensity scores (logistic regression). Reports ATT via nearest-neighbor matching.",
    usage: "Use for observational studies where treatment is not randomly assigned. Propensity scores balance covariates between groups. Check covariate balance after matching. No caliper is applied — verify balance manually.",
    assumptions: ["Unconfoundedness (all confounders are measured and included in the propensity model)", "Common support (overlap in propensity scores between groups)", "SUTVA (no interference between units)"],
    cite: "Rosenbaum, P. R., & Rubin, D. B. (1983). The central role of the propensity score in observational studies. Biometrika, 70(1), 41–55.",
  },
  iv2sls: {
    description: "IV/2SLS estimates causal effects when the predictor is endogenous, using an instrumental variable. The first-stage F-statistic tests instrument strength.",
    usage: "Use when your predictor is correlated with the error term (endogeneity) and you have a valid instrument — a variable that affects the outcome only through the predictor. F > 10 in the first stage suggests the instrument is not weak.",
    assumptions: ["Instrument relevance (correlated with endogenous predictor)", "Exclusion restriction (instrument affects outcome only through the predictor)", "No direct effect of instrument on outcome", "Monotonicity for heterogeneous effects"],
    cite: "Angrist, J. D., & Pischke, J.-S. (2009). Mostly harmless econometrics. Princeton University Press.",
  },
  its: {
    description: "Interrupted Time Series evaluates the effect of an intervention by fitting a segmented regression with a level change and slope change at the intervention point.",
    usage: "Use for time series data when you can identify a clear intervention point (policy change, treatment start). The level change captures the immediate effect; the slope change captures the sustained trend change.",
    assumptions: ["Time series is long enough to estimate pre- and post-intervention trends", "No other events at the intervention point", "No autocorrelation adjustment is applied — consider ARIMA in dedicated software", "Functional form is correctly specified"],
    cite: "Wagner, A. K., Soumerai, S. B., Zhang, F., & Ross-Degnan, D. (2002). Segmented regression analysis of interrupted time series studies. Journal of Clinical Pharmacy and Therapeutics, 27(4), 299–309.",
  },
  rdd: {
    description: "Regression Discontinuity estimates a causal effect at a cutoff by comparing observations just above and below it using local linear regression.",
    usage: "Use when treatment is assigned based on a cutoff (e.g., students scoring above a threshold receive a scholarship). The jump at the cutoff estimates the treatment effect. No bias-corrected inference is applied — use dedicated packages for publication.",
    assumptions: ["Assignment to treatment is strictly determined by the cutoff", "No manipulation of the running variable near the cutoff", "Continuity of the conditional regression functions at the cutoff", "Local linear model is correctly specified"],
    cite: "Imbens, G. W., & Lemieux, T. (2008). Regression discontinuity designs: A guide to practice. Journal of Econometrics, 142(2), 615–635.",
  },

  // ── DIAGNOSTICS & TOOLS ──
  grubbs: {
    description: "Grubbs' test detects a single outlier in a univariate dataset by comparing the most extreme value to the sample mean.",
    usage: "Use for preliminary data screening. Only detects one outlier at a time — run iteratively with caution (masking effect). Consult domain knowledge before removing outliers.",
    assumptions: ["Data are approximately normally distributed", "Only one outlier is tested at a time", "Independence of observations"],
    cite: "Grubbs, F. E. (1950). Sample criteria for testing outlying observations. Annals of Mathematical Statistics, 21(1), 27–58.",
  },
  normality: {
    description: "Normality tests evaluate whether a variable follows a normal distribution using D'Agostino-Pearson K² (n ≥ 8) and Shapiro-Wilk tests, plus QQ plots.",
    usage: "Use to check normality assumptions before running parametric tests. D'Agostino-Pearson combines skewness and kurtosis; Shapiro-Wilk is powerful but approximate for small n.",
    assumptions: ["Independent observations", "Both tests assume data are i.i.d.", "Large samples may reject normality trivially — inspect QQ plots"],
    cite: "D'Agostino, R. B., & Pearson, E. S. (1973). Tests for departure from normality. Biometrika, 60(3), 613–622.",
  },
  homogeneity: {
    description: "Homogeneity of variance tests check whether groups have equal variances using Levene's test and Bartlett's test.",
    usage: "Use before ANOVA or t-tests. Levene's test is more robust to non-normality; Bartlett's test is sensitive to departures from normality. Significant result → use Welch correction.",
    assumptions: ["Levene: robust to non-normality", "Bartlett: assumes normality within groups", "Independent observations"],
    cite: "Levene, H. (1960). Robust tests for equality of variances. In I. Olkin (Ed.), Contributions to probability and statistics. Stanford University Press.",
  },
  samplesize: {
    description: "Sample size calculator computes required sample size per group for t-tests and correlations at a given effect size and power level.",
    usage: "Use during study planning. Enter expected Cohen's d or Pearson's r and desired power (typically .80). The calculator solves for n.",
    assumptions: ["Effect size estimate is realistic", "Desired power and alpha are specified a priori", "Simplified power functions — confirm with dedicated software for complex designs"],
    cite: "Cohen, J. (1988). Statistical power analysis for the behavioral sciences (2nd ed.). Lawrence Erlbaum.",
  },
  pow_anova: {
    description: "ANOVA power analysis estimates achieved power given group means, sample sizes, and variability.",
    usage: "Use post-hoc or during planning to evaluate whether your ANOVA design has sufficient sensitivity. Cohen's f summarizes effect size across groups.",
    assumptions: ["Same as one-way ANOVA", "Power is estimated empirically"],
    cite: "Cohen, J. (1988). Statistical power analysis (2nd ed.). Lawrence Erlbaum.",
  },
  pow_chi: {
    description: "Chi-square power analysis estimates the power of a chi-square test of independence given Cohen's w, degrees of freedom, and sample size.",
    usage: "Use to plan sample sizes for categorical analyses. Cohen's w = 0.1 (small), 0.3 (medium), 0.5 (large).",
    assumptions: ["Same as chi-square test of independence", "Power is an approximation"],
    cite: "Cohen, J. (1988). Statistical power analysis (2nd ed.). Lawrence Erlbaum.",
  },
  pow_logit: {
    description: "Logistic regression power analysis estimates power given an odds ratio, baseline event rate, and sample size.",
    usage: "Use when planning logistic regression studies. Event rate affects power substantially — rare events require larger samples.",
    assumptions: ["Binary outcome", "Power is an approximation", "Single predictor or equivalent design"],
    cite: "Hsieh, F. Y., Bloch, D. A., & Larsen, M. D. (1998). A simple method of sample size calculation for logistic regression. Statistics in Medicine, 17(14), 1623–1634.",
  },
  pow_mixed: {
    description: "Mixed-models power analysis accounts for the design effect from clustering (ICC) in cluster-randomized trials.",
    usage: "Use when planning cluster-randomized studies. The design effect inflates the required sample size — ignoring clustering substantially underpowers your study.",
    assumptions: ["Two-arm cluster-randomized design", "ICC estimate is reasonable", "Equal cluster sizes (if unequal, use harmonic mean)"],
    cite: "Donner, A., & Klar, N. (2000). Design and analysis of cluster randomization trials in health research. Arnold.",
  },
  pow_med: {
    description: "Mediation power analysis uses Monte Carlo simulation to estimate the power to detect an indirect (ab) effect.",
    usage: "Use when planning a mediation study. Monte Carlo power is more accurate than the Sobel asymptotic approximation for small to moderate samples.",
    assumptions: ["Path coefficients (a, b, c') are specified correctly", "Linear mediation model", "Monte Carlo replicates are sufficient"],
    cite: "Fritz, M. S., & MacKinnon, D. P. (2007). Required sample size to detect the mediated effect. Psychological Science, 18(3), 233–239.",
  },
  effectconv: {
    description: "Effect size converter transforms between Cohen's d, Pearson's r, odds ratio (OR), η², and Cohen's f using standard formulas.",
    usage: "Use to translate effect sizes for power analysis, meta-analysis, or reporting. Conversions assume specific conditions (e.g., d ↔ r assumes continuous normal data; d ↔ OR assumes logistic distribution).",
    assumptions: ["Conversions are mathematically derived under specific distributional assumptions", "Some conversions are approximate", "The underlying effect being measured is the same"],
    cite: "Borenstein, M., Hedges, L. V., Higgins, J. P. T., & Rothstein, H. R. (2009). Introduction to meta-analysis. Wiley.",
  },
  corrections: {
    description: "Multiple comparison corrections adjust p-values to control the familywise error rate (Bonferroni, Holm) or false discovery rate (Benjamini-Hochberg).",
    usage: "Use when running multiple statistical tests on the same dataset. Bonferroni is most conservative; Holm is uniformly more powerful; BH-FDR is preferred for exploratory research.",
    assumptions: ["Tests are from the same family (planned comparisons)", "Bonferroni: assumes independence of tests (conservative otherwise)", "BH-FDR: controls expected proportion of false positives, not FWER"],
    cite: "Benjamini, Y., & Hochberg, Y. (1995). Controlling the false discovery rate. Journal of the Royal Statistical Society: Series B, 57(1), 289–300.",
  },
  bootstrap: {
    description: "Bootstrap CI constructs percentile confidence intervals for a statistic (mean, median, SD) by resampling with replacement (B = 1999).",
    usage: "Use when the sampling distribution of your statistic is unknown or non-normal. Bootstrap CIs are nonparametric and make no distributional assumptions.",
    assumptions: ["Sample is representative of the population", "Observations are independent", "Bootstrap replicates are sufficient", "For publication, BCa intervals in dedicated software are preferred if bias is a concern"],
    cite: "Efron, B., & Tibshirani, R. J. (1993). An introduction to the bootstrap. Chapman & Hall.",
  },
  sensitivity: {
    description: "Leave-One-Out sensitivity analysis checks how robust a result is to removing each observation one at a time.",
    usage: "Use to identify whether your conclusions depend on a few influential data points. If the proportion of LOO runs reaching significance bounces around, the result is fragile.",
    assumptions: ["Observations are independent", "LOO is a diagnostic, not a formal test", "One observation at a time — does not detect multiple-outlier influence"],
    cite: "Belsley, D. A., Kuh, E., & Welsch, R. E. (1980). Regression diagnostics. Wiley.",
  },
};

/** Simplified implementation notes used as fallback when an educational note doesn't exist. */
const IMPL_NOTES = {
  shapiroWilk: 'Shapiro–Wilk uses Blom-type scores and a simplified p-value mapping; flagged approximate when n < 10. Confirm with your lab\'s standard package for publication.',
  bayes_r: 'Bayes factor for correlation uses a Jeffreys-style approximation, not the full JZS pipeline used for the t-test.',
  bayes_t: 'JZS Bayes factor via numerical integration (500-point quadrature). Compare to BayesFactor or JASP for critical decisions.',
  logistic: 'Logistic regression: Newton–Raphson MLE with Wald SEs from the observed Fisher information. No clustered SEs or exact LR tests.',
  ordinal: 'Proportional-odds ordinal model with monotone thresholds (softplus). Not full polr/ordinal::clm diagnostics.',
  poisson: 'Poisson GLM with deviance; no robust SEs. Check overdispersion before trusting Poisson.',
  negbinom: 'Negative binomial via iterative dispersion; simplified vs. MASS::glm.nb.',
  manova: 'MANOVA: Wilks Λ with Bartlett χ² approximation; Pillai, Hotelling–Lawley, and Roy\'s largest root from E⁻¹H eigenvalues.',
  pca: 'PCA via correlation matrix and Jacobi eigen-decomposition (not SVD on centered data for all paths).',
  efa: 'EFA: PCA extraction + varimax rotation; not ML factor analysis.',
  hlm_ri: 'Two-level random-intercept model via variance-components OLS; not REML (lme4).',
  hlm_rs: 'Random slope extension with simplified growth specification.',
  irt_1pl: 'Rasch 1PL joint ML (JMLE-style), 80 iterations; not marginal ML (WINSTEPS).',
  irt_2pl: '2PL joint calibration; discrimination can be unstable in small samples.',
  lca: 'Latent class EM with hard assignment in BIC; 2–4 classes only.',
  psm: '1:1 nearest-neighbor propensity matching without caliper; check balance manually.',
  iv2sls: '2SLS with homoskedastic SEs; weak-instrument diagnostics are minimal.',
  its: 'Segmented regression ITS; no ARIMA errors or autocorrelation adjustment.',
  rdd: 'Local linear RD with optional bandwidth; no bias-corrected inference.',
  meta: 'Random-effects meta (DerSimonian–Laird τ²); not REML or Hartung–Knapp adjustment.',
  kmeans: 'Lloyd k-means with random init; local optima possible.',
  hclust: 'Hierarchical clustering on Euclidean distance; linkage height only (no full dendrogram object).',
  community: 'Greedy modularity communities; not Louvain/Leiden.',
  parallel: 'Parallel analysis with 40 Monte Carlo draws; increase reps in dedicated software for final decisions.',
  omega: "McDonald's ω from a 1-factor correlation model; ω_h equals ω_t in this formulation.",
  trimmed: 'Yuen trimmed-mean test (20% default); verify trim proportion for your design.',
  med_bootstrap: 'Percentile bootstrap for the indirect effect (B replicates); seed-controlled for reproducibility.',
  bootstrap: 'Percentile bootstrap CI; seed-controlled. Use BCa in R for publication if bias is a concern.',
};

export const APPROXIMATE_TESTS = new Set([
  'shapiroWilk', 'normality', 'bayes_r', 'bayes_t',
  'logistic', 'ordinal', 'poisson', 'negbinom',
  'hlm_ri', 'hlm_rs', 'irt_1pl', 'irt_2pl', 'lca',
  'psm', 'iv2sls', 'its', 'rdd', 'meta',
]);

/**
 * Returns a methodology note for the active test.
 * Educational notes (METHOD_NOTES) take priority; falls back to implementation notes.
 */
export function methodNoteForTest(active, result) {
  if (result?.approximate) return 'This result uses an approximate method; see Methods note.';
  if (result?.sw?.approximate) return IMPL_NOTES.shapiroWilk;
  if (METHOD_NOTES[active]) return METHOD_NOTES[active];
  if (APPROXIMATE_TESTS.has(active) && IMPL_NOTES[active]) return IMPL_NOTES[active];
  if (active === 'normality' && result?.sw) return IMPL_NOTES.shapiroWilk;
  return IMPL_NOTES[active] || null;
}
