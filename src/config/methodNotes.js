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

  // ── POWER & SAMPLE SIZE (EXTENDED) ──
  pow_cox: {
    description: "Cox proportional-hazards power analysis estimates power to detect a hazard ratio given the number of observed events.",
    usage: "Use when planning survival studies. Power depends on the number of events observed, not total sample size.",
    assumptions: ["Proportional hazards", "Events accrue as planned"],
    cite: "Schoenfeld, D. A. (1983). Sample-size formula for the proportional-hazards regression model. Biometrics, 39(2), 499–503.",
  },
  pow_meta: {
    description: "Meta-analysis power estimates the power of a random-effects meta-analysis to detect a pooled effect across K studies.",
    usage: "Use when planning how many studies (or how much data) a meta-analysis needs to detect an expected effect.",
    assumptions: ["Random-effects model", "Studies are reasonably homogeneous"],
    cite: "Hedges, L. V., & Pigott, T. D. (2001). The power of statistical tests in meta-analysis. Psychological Methods, 6(3), 203–217.",
  },
  pow_equiv: {
    description: "Equivalence power (TOST) estimates the power to declare statistical equivalence given a mean difference, its SE, and equivalence bounds.",
    usage: "Use when planning an equivalence or non-inferiority study.",
    assumptions: ["Equivalence bounds are pre-specified and justified", "Normal approximation"],
    cite: "Lakens, D. (2017). Equivalence tests: A practical primer. Social Psychological and Personality Science, 8(4), 355–362.",
  },
  pow_intanova: {
    description: "Two-way ANOVA interaction power estimates the power to detect an interaction effect given cell sizes and Cohen's f.",
    usage: "Use when planning factorial designs where the interaction, not just the main effects, is the effect of interest.",
    assumptions: ["Balanced factorial design", "Cohen's f reflects the interaction term specifically"],
    cite: "Cohen, J. (1988). Statistical power analysis (2nd ed.). Lawrence Erlbaum.",
  },
  pow_corr: {
    description: "Correlation power analysis estimates the power to detect a Pearson correlation of a given magnitude at a given sample size.",
    usage: "Use when planning correlational studies.",
    assumptions: ["Bivariate normality", "Fisher z approximation"],
    cite: "Cohen, J. (1988). Statistical power analysis (2nd ed.). Lawrence Erlbaum.",
  },
  pow_ttest: {
    description: "Two-sample t-test power estimates the power to detect Cohen's d given group sample sizes.",
    usage: "Use when planning a two-group comparison and checking power for specific (possibly unequal) group sizes.",
    assumptions: ["Independent groups", "Approximately normal or n large enough"],
    cite: "Cohen, J. (1988). Statistical power analysis (2nd ed.). Lawrence Erlbaum.",
  },
  pow_oneprop: {
    description: "One-proportion power analysis estimates the power to detect a difference between an observed and a null proportion.",
    usage: "Use when planning a single-sample proportion study.",
    assumptions: ["Normal approximation to the binomial", "n large enough for the approximation"],
    cite: "Fleiss, J. L., Levin, B., & Paik, M. C. (2003). Statistical methods for rates and proportions (3rd ed.). Wiley.",
  },
  pow_twoprop: {
    description: "Two-proportion power analysis estimates the power to detect a difference between two independent proportions.",
    usage: "Use when planning a two-group proportion comparison (e.g., A/B test, trial arm comparison).",
    assumptions: ["Independent groups", "Normal approximation to the binomial"],
    cite: "Fleiss, J. L., Levin, B., & Paik, M. C. (2003). Statistical methods for rates and proportions (3rd ed.). Wiley.",
  },
  pow_wilcoxon: {
    description: "Wilcoxon/Mann-Whitney power analysis estimates power via the asymptotic relative efficiency of the rank test relative to the t-test.",
    usage: "Use when planning a nonparametric two-group comparison.",
    assumptions: ["ARE ≈ 0.955 relative to the t-test under normality", "Approximation degrades under heavy departures from this"],
    cite: "Lehmann, E. L. (1975). Nonparametrics: Statistical methods based on ranks. Holden-Day.",
  },
  pow_logrank: {
    description: "Log-rank test power analysis estimates power to detect a hazard ratio given the number of observed events.",
    usage: "Use when planning a two-arm survival comparison.",
    assumptions: ["Proportional hazards", "Events accrue as planned"],
    cite: "Schoenfeld, D. A. (1983). Sample-size formula for the proportional-hazards regression model. Biometrics, 39(2), 499–503.",
  },
  pow_rmanova: {
    description: "Repeated-measures ANOVA power analysis accounts for sphericity violation via the Greenhouse-Geisser epsilon.",
    usage: "Use when planning a within-subjects design with 3+ occasions/conditions.",
    assumptions: ["Occasions are commensurable", "ε reflects the expected sphericity violation"],
    cite: "Muller, K. E., & Barton, C. N. (1989). Approximate power for repeated-measures ANOVA lacking sphericity. JASA, 84(406), 549–555.",
  },
  pow_olsapa: {
    description: "OLS regression power analysis estimates power to detect an R² given sample size and number of predictors.",
    usage: "Use when planning a multiple regression study.",
    assumptions: ["Fixed predictors", "F-test on the overall model"],
    cite: "Cohen, J. (1988). Statistical power analysis (2nd ed.). Lawrence Erlbaum.",
  },
  pow_spearman: {
    description: "Spearman correlation power analysis estimates power to detect a rank correlation ρ given sample size.",
    usage: "Use when planning a study relying on a monotonic (not necessarily linear) association.",
    assumptions: ["ARE ≈ 0.91 relative to Pearson r under bivariate normality"],
    cite: "Cohen, J. (1988). Statistical power analysis (2nd ed.). Lawrence Erlbaum.",
  },
  reqn_t: {
    description: "Required sample size (t-test) computes the n per group needed to detect Cohen's d at 80% power.",
    usage: "Use during study planning to determine the minimum group size needed.",
    assumptions: ["Independent two-sample t-test", "Equal group sizes"],
    cite: "Cohen, J. (1988). Statistical power analysis (2nd ed.). Lawrence Erlbaum.",
  },
  reqn_corr: {
    description: "Required sample size (correlation) computes the N needed to detect a Pearson r at 80% power.",
    usage: "Use during study planning for correlational designs.",
    assumptions: ["Bivariate normality", "Fisher z approximation"],
    cite: "Cohen, J. (1988). Statistical power analysis (2nd ed.). Lawrence Erlbaum.",
  },
  reqn_oneprop: {
    description: "Required sample size (one proportion) computes the N needed to detect a departure from a null proportion at 80% power.",
    usage: "Use during study planning for a single-sample proportion design.",
    assumptions: ["Normal approximation to the binomial"],
    cite: "Fleiss, J. L., Levin, B., & Paik, M. C. (2003). Statistical methods for rates and proportions (3rd ed.). Wiley.",
  },
  reqn_twoprop: {
    description: "Required sample size (two proportions) computes the n per group needed to detect a difference between two proportions at 80% power.",
    usage: "Use during study planning for a two-arm proportion comparison.",
    assumptions: ["Independent groups", "Normal approximation to the binomial"],
    cite: "Fleiss, J. L., Levin, B., & Paik, M. C. (2003). Statistical methods for rates and proportions (3rd ed.). Wiley.",
  },
  reqn_wilcoxon: {
    description: "Required sample size (Wilcoxon) computes the n needed to detect Cohen's d at 80% power under the rank test's asymptotic relative efficiency.",
    usage: "Use during study planning for a nonparametric two-group comparison.",
    assumptions: ["ARE ≈ 0.955 relative to the t-test under normality"],
    cite: "Lehmann, E. L. (1975). Nonparametrics: Statistical methods based on ranks. Holden-Day.",
  },
  reqn_logrank: {
    description: "Required sample size (log-rank) computes the number of events needed to detect a hazard ratio at 80% power.",
    usage: "Use during study planning for a two-arm survival comparison.",
    assumptions: ["Proportional hazards"],
    cite: "Schoenfeld, D. A. (1983). Sample-size formula for the proportional-hazards regression model. Biometrics, 39(2), 499–503.",
  },
  reqn_ols: {
    description: "Required sample size (OLS) computes the N needed to detect a given R² at 80% power.",
    usage: "Use during study planning for a multiple regression design.",
    assumptions: ["Fixed predictors", "F-test on the overall model"],
    cite: "Cohen, J. (1988). Statistical power analysis (2nd ed.). Lawrence Erlbaum.",
  },
  reqn_anova: {
    description: "Required sample size (ANOVA) computes the n per group needed to detect Cohen's f across k groups at 80% power.",
    usage: "Use during study planning for a one-way ANOVA design.",
    assumptions: ["Balanced design", "Homogeneity of variance"],
    cite: "Cohen, J. (1988). Statistical power analysis (2nd ed.). Lawrence Erlbaum.",
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

  // ── ROBUST STATISTICS ──
  theil_sen: {
    description: "Theil-Sen estimator computes a robust linear slope as the median of all pairwise slopes.",
    usage: "Use for robust linear trend estimation resistant to outliers.",
    assumptions: ["Continuous variables", "At least 10 data points"],
    cite: "N/A",
  },
  mm_estimator: {
    description: "MM-estimator combines high breakdown point with high efficiency for robust regression.",
    usage: "Use for robust regression when both outlier resistance and statistical efficiency are needed.",
    assumptions: ["Continuous outcome", "Linear model specification"],
    cite: "N/A",
  },
  mad_scale: {
    description: "Median Absolute Deviation (MAD) is a robust measure of scale resistant to outliers.",
    usage: "Use as a robust alternative to standard deviation for detecting outliers or measuring spread.",
    assumptions: ["Continuous data", "Symmetric distribution preferred"],
    cite: "N/A",
  },
  hampel_m: {
    description: "Hampel's M-estimator uses a redescending psi-function for robust location estimation.",
    usage: "Use for robust estimation of central tendency when data contain extreme outliers.",
    assumptions: ["Continuous variable", "Unimodal distribution"],
    cite: "N/A",
  },
  mcd_cov: {
    description: "Minimum Covariance Determinant (MCD) estimates a robust covariance matrix by finding the subset with smallest determinant.",
    usage: "Use for robust multivariate location and scatter estimation under contamination.",
    assumptions: ["Multivariate continuous data", "Sample size exceeds number of variables"],
    cite: "N/A",
  },
  s_estimator: {
    description: "S-estimator minimizes a robust M-scale of residuals to achieve high breakdown point in regression.",
    usage: "Use for robust regression when up to 50% of data may be contaminated.",
    assumptions: ["Continuous outcome", "Linear model"],
    cite: "N/A",
  },
  lts_reg: {
    description: "Least Trimmed Squares regression minimizes the sum of the smallest h squared residuals.",
    usage: "Use for robust regression when a high breakdown point is needed against outliers.",
    assumptions: ["Continuous outcome", "Adequate sample size relative to trimming proportion"],
    cite: "N/A",
  },
  qq_band: {
    description: "QQ-plot confidence bands add pointwise confidence envelopes to quantile-quantile plots.",
    usage: "Use to visually assess normality with formal bounds on expected deviations.",
    assumptions: ["Independent observations", "Sufficient sample size for band estimation"],
    cite: "N/A",
  },

  // ── BAYESIAN MODELING ──
  bic_bf: {
    description: "BIC-based Bayes factor approximates the Bayes factor from the difference in BIC values between two models.",
    usage: "Use for quick Bayesian model comparison without full MCMC sampling.",
    assumptions: ["Large sample approximation", "Models are nested or comparable"],
    cite: "N/A",
  },
  beta_binom_post: {
    description: "Beta-Binomial posterior updates a Beta prior with binomial data to obtain a conjugate posterior.",
    usage: "Use for Bayesian analysis of proportions and binary outcomes with conjugate priors.",
    assumptions: ["Binary outcomes", "Independent trials"],
    cite: "N/A",
  },
  gamma_pois_post: {
    description: "Gamma-Poisson posterior updates a Gamma prior with Poisson count data for conjugate inference.",
    usage: "Use for Bayesian analysis of count data with conjugate Gamma prior.",
    assumptions: ["Count data", "Independent observations"],
    cite: "N/A",
  },
  norm_norm_post: {
    description: "Normal-Normal posterior updates a Normal prior with Normal data when variance is known.",
    usage: "Use for conjugate Bayesian inference on a continuous mean with known variance.",
    assumptions: ["Normal likelihood", "Known variance"],
    cite: "N/A",
  },
  nig_post: {
    description: "Normal-Inverse-Gamma posterior provides joint conjugate inference for mean and variance of Normal data.",
    usage: "Use for full Bayesian inference on both mean and variance of continuous data.",
    assumptions: ["Normal likelihood", "Independent observations"],
    cite: "N/A",
  },
  bayes_linreg: {
    description: "Bayesian linear regression estimates posterior distributions for coefficients using conjugate or MCMC methods.",
    usage: "Use when uncertainty quantification for regression coefficients is needed beyond point estimates.",
    assumptions: ["Linear model", "Prior specification must be justified"],
    cite: "N/A",
  },
  bayes_logit: {
    description: "Bayesian logistic regression estimates posterior distributions for binary outcome coefficients.",
    usage: "Use for binary outcome modeling with full uncertainty quantification via posterior distributions.",
    assumptions: ["Binary outcome", "Prior specification", "No perfect separation"],
    cite: "N/A",
  },
  bayes_pois: {
    description: "Bayesian Poisson regression estimates posterior count-rate coefficients with appropriate priors.",
    usage: "Use for count data modeling with Bayesian uncertainty intervals on rate ratios.",
    assumptions: ["Count outcome", "Log-linear relationship", "Prior specification"],
    cite: "N/A",
  },
  bayes_dic: {
    description: "Deviance Information Criterion (DIC) compares Bayesian models using posterior deviance and effective parameters.",
    usage: "Use for Bayesian model selection when MCMC samples are available.",
    assumptions: ["Posterior approximately multivariate normal", "Models are comparable"],
    cite: "N/A",
  },
  bma_reg: {
    description: "Bayesian Model Averaging combines predictions across multiple regression models weighted by posterior probabilities.",
    usage: "Use to account for model uncertainty in regression by averaging over plausible models.",
    assumptions: ["Set of candidate models is specified", "Prior model probabilities"],
    cite: "N/A",
  },

  // ── MISSING DATA ──
  little_mcar: {
    description: "Little's MCAR test evaluates whether data are missing completely at random across the dataset.",
    usage: "Use to assess the missing data mechanism before choosing an imputation strategy.",
    assumptions: ["Multivariate normality", "Missingness pattern is testable"],
    cite: "N/A",
  },
  mice_imp: {
    description: "Multiple Imputation by Chained Equations (MICE) imputes missing values iteratively using conditional models.",
    usage: "Use for handling arbitrary missing data patterns with multiple imputation.",
    assumptions: ["Missing at random (MAR)", "Imputation models are correctly specified"],
    cite: "N/A",
  },
  rubin_pool: {
    description: "Rubin's pooling rules combine estimates and standard errors across multiple imputed datasets.",
    usage: "Use after multiple imputation to obtain valid point estimates and confidence intervals.",
    assumptions: ["Imputations are proper", "Between-imputation variance is estimable"],
    cite: "N/A",
  },
  fmi: {
    description: "Fraction of Missing Information (FMI) quantifies the proportion of uncertainty attributable to missing data.",
    usage: "Use to assess how much missing data affects inference after multiple imputation.",
    assumptions: ["Multiple imputation framework", "Pooled estimates available"],
    cite: "N/A",
  },
  em_impute: {
    description: "EM imputation estimates missing values via Expectation-Maximization under a multivariate normal model.",
    usage: "Use for single imputation when data are approximately multivariate normal.",
    assumptions: ["Multivariate normality", "Missing at random (MAR)"],
    cite: "N/A",
  },
  miss_patt: {
    description: "Missing data pattern analysis tabulates and visualizes the structure of missingness across variables.",
    usage: "Use to explore which variables have missing data and whether missingness follows a systematic pattern.",
    assumptions: ["Variables are coded with missing indicators"],
    cite: "N/A",
  },
  complete_cases: {
    description: "Complete-case analysis restricts analysis to observations with no missing values on any variable.",
    usage: "Use as a baseline comparison for imputation methods, but generally biased under MAR.",
    assumptions: ["Missing completely at random (MCAR)", "Loss of power acceptable"],
    cite: "N/A",
  },

  // ── AGENT-BASED MODELS ──
  abm_morani: {
    description: "Moran's I for ABM output tests spatial autocorrelation across agent-level outcomes.",
    usage: "Use to detect spatial clustering or dispersion patterns in agent-based simulation results.",
    assumptions: ["Spatial coordinates are defined", "Continuous or ordinal agent outcomes"],
    cite: "N/A",
  },
  abm_conv: {
    description: "ABM convergence diagnostics assess whether simulation output has reached a steady state.",
    usage: "Use to determine appropriate burn-in and run length for agent-based model simulations.",
    assumptions: ["Time-series output available", "Stable equilibrium exists"],
    cite: "N/A",
  },
  abm_sobol: {
    description: "Sobol' sensitivity indices for ABM decompose output variance into contributions from each input parameter.",
    usage: "Use to identify which ABM parameters most influence simulation outcomes.",
    assumptions: ["Parameters are independent", "Sufficient simulation runs"],
    cite: "N/A",
  },
  abm_summary: {
    description: "ABM summary statistics aggregate agent-level outputs into population-level descriptive measures.",
    usage: "Use for summarizing and visualizing aggregate patterns from agent-based simulations.",
    assumptions: ["Agent-level data available", "Aggregation method is justified"],
    cite: "N/A",
  },
  abm_scenario: {
    description: "ABM scenario comparison tests differences in simulation outcomes across experimental conditions.",
    usage: "Use to statistically compare ABM outputs between different parameter settings or policy scenarios.",
    assumptions: ["Independent simulation runs per scenario", "Comparable run lengths"],
    cite: "N/A",
  },
  abm_threshold: {
    description: "ABM threshold analysis identifies critical parameter values where model behavior qualitatively changes.",
    usage: "Use to detect tipping points or phase transitions in agent-based model dynamics.",
    assumptions: ["Parameter sweep is sufficiently fine-grained", "Outcome is well-defined"],
    cite: "N/A",
  },
  abm_diffusion: {
    description: "ABM diffusion analysis tracks how innovations, behaviors, or information spread through an agent network.",
    usage: "Use to model and analyze contagion processes, technology adoption, or information cascades.",
    assumptions: ["Network structure is defined", "Adoption rules are specified"],
    cite: "N/A",
  },
  abm_segregation: {
    description: "Schelling segregation analysis measures how individual preferences lead to aggregate segregation patterns.",
    usage: "Use to study emergent segregation in spatial agent-based models with preference thresholds.",
    assumptions: ["Agent preferences are defined", "Spatial neighborhood is specified"],
    cite: "N/A",
  },

  // ── MULTI-ARMED BANDITS ──
  bandit_eps: {
    description: "Epsilon-greedy bandit balances exploration and exploitation by choosing a random arm with probability ε.",
    usage: "Use for simple online decision problems with a fixed exploration rate.",
    assumptions: ["Independent arm rewards", "Stationary reward distributions"],
    cite: "N/A",
  },
  bandit_ucb: {
    description: "Upper Confidence Bound (UCB) bandit selects arms based on optimistic uncertainty estimates.",
    usage: "Use when principled exploration-exploitation trade-offs are needed with theoretical guarantees.",
    assumptions: ["Bounded rewards", "Independent arms"],
    cite: "N/A",
  },
  bandit_thompson: {
    description: "Thompson sampling selects arms by sampling from posterior reward distributions using Bayesian updating.",
    usage: "Use for Bayesian bandit problems with prior knowledge about reward distributions.",
    assumptions: ["Reward distribution is correctly specified", "Conjugate priors used"],
    cite: "N/A",
  },
  bandit_context: {
    description: "Contextual bandit incorporates side information (features) to personalize arm selection.",
    usage: "Use when arm rewards depend on observed context variables for personalized decisions.",
    assumptions: ["Context is informative", "Linear or parametric reward model"],
    cite: "N/A",
  },
  bandit_pg: {
    description: "Policy gradient bandit learns a parameterized policy for arm selection via stochastic gradient ascent.",
    usage: "Use for bandit problems where direct value estimation is challenging and policy parameterization is preferred.",
    assumptions: ["Policy is differentiable", "Adequate exploration"],
    cite: "N/A",
  },
  bandit_softmax: {
    description: "Softmax (Boltzmann) bandit selects arms with probabilities proportional to estimated values via a temperature parameter.",
    usage: "Use when you want smooth exploration probabilities that adapt to value differences.",
    assumptions: ["Value estimates are reliable", "Temperature parameter is tuned"],
    cite: "N/A",
  },
  bandit_ql: {
    description: "Q-learning bandit updates action-value estimates using temporal-difference learning.",
    usage: "Use for bandit problems that extend toward sequential decision making and reinforcement learning.",
    assumptions: ["Stationary or slowly changing rewards", "Learning rate is tuned"],
    cite: "N/A",
  },
  bandit_sarsa: {
    description: "SARSA bandit learns action values on-policy using state-action-reward-state-action tuples.",
    usage: "Use for sequential bandit problems where the policy being followed matters for learning.",
    assumptions: ["Markovian environment", "On-policy learning is appropriate"],
    cite: "N/A",
  },
  bandit_dqn: {
    description: "Deep Q-Network bandit uses a neural network to approximate action values for complex reward structures.",
    usage: "Use for high-dimensional or complex bandit problems where tabular methods are infeasible.",
    assumptions: ["Sufficient training data", "Network architecture is appropriate"],
    cite: "N/A",
  },

  // ── RECORD LINKAGE ──
  link_jaro: {
    description: "Jaro similarity measures string similarity accounting for character transpositions within a window.",
    usage: "Use for fuzzy name matching in record linkage tasks.",
    assumptions: ["Strings are comparable", "Window size is appropriate for data"],
    cite: "N/A",
  },
  link_lev: {
    description: "Levenshtein edit distance counts the minimum number of single-character edits to transform one string into another.",
    usage: "Use for string comparison and approximate matching in deduplication tasks.",
    assumptions: ["Strings are comparable", "Edit operations have equal cost"],
    cite: "N/A",
  },
  link_fel: {
    description: "Fellegi-Sunter probabilistic record linkage estimates match probabilities using agreement patterns across fields.",
    usage: "Use for formal probabilistic record linkage with match weights and decision thresholds.",
    assumptions: ["Conditional independence of fields", "Training data or EM estimation"],
    cite: "N/A",
  },
  link_block: {
    description: "Blocking divides records into mutually exclusive blocks to reduce the number of pairwise comparisons.",
    usage: "Use as a preprocessing step to make record linkage computationally feasible on large datasets.",
    assumptions: ["Blocking variables are reliable and complete", "True matches fall within same block"],
    cite: "N/A",
  },
  link_thresh: {
    description: "Threshold-based record linkage classifies record pairs as matches or non-matches using similarity score cutoffs.",
    usage: "Use for deterministic linkage when clear decision rules based on similarity scores are available.",
    assumptions: ["Threshold is appropriately calibrated", "Similarity scores are accurate"],
    cite: "N/A",
  },
  link_prob: {
    description: "Probabilistic record linkage assigns match probabilities to record pairs using agreement and disagreement weights.",
    usage: "Use when deterministic matching is too rigid and uncertainty in linkage should be quantified.",
    assumptions: ["Fields are conditionally independent given match status", "Representative training data"],
    cite: "N/A",
  },
  link_dedup: {
    description: "Deduplication identifies and merges duplicate records within a single dataset using similarity metrics.",
    usage: "Use to clean datasets by finding and resolving duplicate entries.",
    assumptions: ["Similarity metric captures duplicate patterns", "Threshold or model is calibrated"],
    cite: "N/A",
  },

  // ── PRIVACY ──
  priv_laplace: {
    description: "Laplace mechanism adds calibrated Laplace noise to achieve ε-differential privacy for numeric queries.",
    usage: "Use for differentially private release of continuous statistics and counts.",
    assumptions: ["Query sensitivity is bounded", "Privacy budget ε is chosen appropriately"],
    cite: "N/A",
  },
  priv_synthetic: {
    description: "Synthetic data generation creates artificial datasets that preserve statistical properties of the original data.",
    usage: "Use for privacy-preserving data sharing when raw data cannot be released.",
    assumptions: ["Synthetic data preserves target analyses", "Original data distribution is learnable"],
    cite: "N/A",
  },
  priv_kanon: {
    description: "k-Anonymity ensures each record is indistinguishable from at least k-1 other records on quasi-identifiers.",
    usage: "Use for privacy-preserving data publishing by generalizing or suppressing identifying attributes.",
    assumptions: ["Quasi-identifiers are correctly identified", "Homogeneity attacks are considered"],
    cite: "N/A",
  },
  priv_diff: {
    description: "Differential privacy provides a formal mathematical guarantee that individual records cannot be inferred from output.",
    usage: "Use when strong, provable privacy guarantees are required for data release or queries.",
    assumptions: ["Privacy budget ε is finite", "Query sensitivity is bounded"],
    cite: "N/A",
  },
  priv_mask: {
    description: "Data masking replaces sensitive values with modified but structurally similar data for non-production use.",
    usage: "Use for creating realistic test datasets that do not expose real personal information.",
    assumptions: ["Masking preserves data structure", "Re-identification risk is acceptable"],
    cite: "N/A",
  },
  priv_ldiv: {
    description: "l-Diversity extends k-anonymity by requiring at least l well-represented sensitive values in each equivalence class.",
    usage: "Use to protect against homogeneity attacks when sensitive attributes are present.",
    assumptions: ["Sensitive attributes are identified", "Equivalence classes are well-formed"],
    cite: "N/A",
  },
  priv_tclose: {
    description: "t-Closeness requires the distribution of sensitive values in each equivalence class to be close to the overall distribution.",
    usage: "Use for stronger privacy protection against skewness and similarity attacks beyond l-diversity.",
    assumptions: ["Distance metric for distributions is specified", "Threshold t is chosen"],
    cite: "N/A",
  },

  // ── PATIENT-REPORTED OUTCOMES ──
  pro_rci: {
    description: "Reliable Change Index (RCI) determines whether a patient's change score exceeds what could be due to measurement error.",
    usage: "Use to classify individual patients as reliably improved, unchanged, or deteriorated.",
    assumptions: ["Measurement error is estimable", "Test-retest reliability is known"],
    cite: "N/A",
  },
  pro_mid: {
    description: "Minimal Important Difference (MID) estimates the smallest change in a PRO score that patients perceive as meaningful.",
    usage: "Use to interpret whether a treatment effect is clinically meaningful, not just statistically significant.",
    assumptions: ["Anchor-based or distribution-based method is appropriate", "Patient population is well-defined"],
    cite: "N/A",
  },
  pro_responder: {
    description: "Responder analysis classifies patients as responders or non-responders based on exceeding a predefined threshold of change.",
    usage: "Use to report the proportion of patients achieving clinically meaningful improvement.",
    assumptions: ["Responder threshold is clinically justified", "Dichotomization loss of information is acceptable"],
    cite: "N/A",
  },
  pro_eq5d: {
    description: "EQ-5D analysis computes health utility scores from five dimensions of health-related quality of life.",
    usage: "Use for health economic evaluations and quality-adjusted life year (QALY) calculations.",
    assumptions: ["Value set matches the target population", "Five dimensions are complete"],
    cite: "N/A",
  },
  pro_srm: {
    description: "Standardized Response Mean (SRM) quantifies responsiveness as the mean change divided by the standard deviation of change.",
    usage: "Use to compare the responsiveness of different PRO instruments.",
    assumptions: ["Change scores are approximately normal", "Sample is representative"],
    cite: "N/A",
  },
  pro_ctgov: {
    description: "ClinicalTrials.gov PRO analysis maps patient-reported outcome measures to registered trial outcomes.",
    usage: "Use to verify that PRO reporting aligns with pre-registered clinical trial endpoints.",
    assumptions: ["Trial registration is accessible", "PRO measures match registered outcomes"],
    cite: "N/A",
  },
  pro_consort: {
    description: "CONSORT PRO checklist assesses whether patient-reported outcome reporting meets CONSORT extension standards.",
    usage: "Use to evaluate the quality of PRO reporting in randomized controlled trials.",
    assumptions: ["CONSORT-PRO criteria are applicable", "Trial report is complete"],
    cite: "N/A",
  },

  // ── RISK-ADJUSTED MONITORING ──
  ram_cusum: {
    description: "CUSUM chart cumulatively sums deviations from expected outcomes to detect shifts in performance over time.",
    usage: "Use for continuous monitoring of surgical or clinical performance with risk adjustment.",
    assumptions: ["Expected risk is estimable", "Observations are ordered in time"],
    cite: "N/A",
  },
  ram_vlad: {
    description: "VLAD (Variable Life-Adjusted Display) plots cumulative observed minus expected outcomes for risk-adjusted monitoring.",
    usage: "Use to visualize trends in clinical outcomes compared to risk-adjusted expectations.",
    assumptions: ["Risk model is well-calibrated", "Outcomes are independent"],
    cite: "N/A",
  },
  ram_sprt: {
    description: "SPRT (Sequential Probability Ratio Test) monitors accumulating evidence to signal when performance differs from a target.",
    usage: "Use for prospective monitoring with formal stopping boundaries for early detection of performance changes.",
    assumptions: ["Likelihood ratio is correctly specified", "Type I and II error rates are set"],
    cite: "N/A",
  },
  ram_funnel: {
    description: "Funnel plot charts outcomes against precision to detect outlying institutions or providers.",
    usage: "Use to compare institutional performance while accounting for varying sample sizes.",
    assumptions: ["Outcomes are independent", "Overdispersion is considered"],
    cite: "N/A",
  },
  ram_cchart: {
    description: "C-chart monitors count outcomes using control limits based on the Poisson distribution.",
    usage: "Use for monitoring adverse event counts in healthcare settings over time.",
    assumptions: ["Counts follow Poisson distribution", "Events are independent"],
    cite: "N/A",
  },
  ram_safety: {
    description: "Safety monitoring analysis evaluates adverse event rates with formal stopping rules for clinical trials.",
    usage: "Use for prospective safety surveillance in clinical trials to detect excess harm early.",
    assumptions: ["Adverse event definitions are consistent", "Stopping boundaries are pre-specified"],
    cite: "N/A",
  },
  ram_prr: {
    description: "Proportional Reporting Ratio (PRR) detects disproportionate adverse event reporting in pharmacovigilance data.",
    usage: "Use for signal detection in spontaneous adverse drug reaction reporting databases.",
    assumptions: ["Reporting is not differentially biased", "Expected counts are stable"],
    cite: "N/A",
  },

  // ── RECOMMENDATION ──
  rec_cf: {
    description: "Collaborative filtering recommends items based on similarity patterns across users or items.",
    usage: "Use for recommendation systems where user-item interactions imply preference patterns.",
    assumptions: ["Past behavior predicts future preferences", "User-item matrix is sufficiently dense"],
    cite: "N/A",
  },
  rec_mf: {
    description: "Matrix factorization decomposes the user-item rating matrix into low-rank latent factor representations.",
    usage: "Use for recommendation systems to discover latent features explaining user preferences.",
    assumptions: ["Latent factors capture preference structure", "Ratings are available"],
    cite: "N/A",
  },
  rec_topn: {
    description: "Top-N recommendation evaluates the quality of ranked recommendation lists using precision and recall metrics.",
    usage: "Use to assess recommendation system performance in retrieving the most relevant items.",
    assumptions: ["Relevance judgments are available", "N is chosen appropriately for the use case"],
    cite: "N/A",
  },

  // ── SINGLE-CASE EXPERIMENTAL DESIGN ──
  sced_tauu: {
    description: "Tau-U is a non-overlap effect size for single-case designs that controls for baseline trend.",
    usage: "Use for single-case experimental design analysis when baseline trend correction is needed.",
    assumptions: ["Phases are clearly delineated", "Baseline trend is linear"],
    cite: "N/A",
  },
  sced_pnd: {
    description: "Percentage of Non-overlapping Data (PND) measures the proportion of treatment phase data exceeding the baseline extreme.",
    usage: "Use for simple effect size quantification in single-case designs with stable baselines.",
    assumptions: ["Stable baseline", "No baseline trend"],
    cite: "N/A",
  },
  sced_pem: {
    description: "Percentage of data points Exceeding the Median (PEM) compares treatment phase data to the baseline median.",
    usage: "Use when baseline contains outliers that would distort PND.",
    assumptions: ["Baseline median is representative", "Phases are well-defined"],
    cite: "N/A",
  },
  sced_nap: {
    description: "Non-overlap of All Pairs (NAP) computes the proportion of all pairwise comparisons where treatment exceeds baseline.",
    usage: "Use for a more robust non-overlap index that uses information from all data points.",
    assumptions: ["Independence of comparisons is not required", "Phases are distinct"],
    cite: "N/A",
  },
  sced_rand: {
    description: "Randomization test for SCED evaluates treatment effects by randomly permuting the assignment of measurement occasions to phases.",
    usage: "Use for statistical inference in single-case designs without distributional assumptions.",
    assumptions: ["Random assignment of phases", "No carryover effects"],
    cite: "N/A",
  },
  sced_bctau: {
    description: "Baseline-Corrected Tau adjusts the Tau effect size by subtracting baseline trend from the overall trend estimate.",
    usage: "Use for single-case effect size estimation when baseline shows a monotonic trend.",
    assumptions: ["Monotonic baseline trend", "Adequate baseline data points"],
    cite: "N/A",
  },
  sced_bcsmd: {
    description: "Baseline-Corrected SMD estimates the standardized mean difference in single-case designs with baseline trend correction.",
    usage: "Use when a standardized effect size comparable to Cohen's d is needed for SCED data.",
    assumptions: ["Phases have sufficient data points", "Baseline trend is estimable"],
    cite: "N/A",
  },

  // ── SENSITIVITY ANALYSIS ──
  sens_morris: {
    description: "Morris method estimates elementary effects by varying one parameter at a time across a grid of trajectories.",
    usage: "Use for screening influential parameters in models with many inputs and moderate computational cost.",
    assumptions: ["Parameters are independent", "Model is deterministic or noise is moderate"],
    cite: "N/A",
  },
  sens_fast: {
    description: "Fourier Amplitude Sensitivity Test (FAST) uses Fourier decomposition to estimate first-order and total sensitivity indices.",
    usage: "Use for global sensitivity analysis when parameter interactions may be important.",
    assumptions: ["Parameters are independent", "Sufficient sample size for Fourier decomposition"],
    cite: "N/A",
  },
  sens_modelcomp: {
    description: "Model comparison sensitivity analysis evaluates how inferences change under alternative model specifications.",
    usage: "Use to assess robustness of conclusions to modeling choices and assumptions.",
    assumptions: ["Alternative models are plausible", "Comparison criteria are defined"],
    cite: "N/A",
  },
  sens_forecast: {
    description: "Forecast sensitivity evaluates how predictions change when input assumptions or parameters are perturbed.",
    usage: "Use to quantify uncertainty in forecasts from models or simulations.",
    assumptions: ["Forecast model is specified", "Perturbation range is meaningful"],
    cite: "N/A",
  },
  sens_sobol1: {
    description: "First-order Sobol' indices quantify the proportion of output variance attributable to each input parameter alone.",
    usage: "Use to rank parameters by their independent contribution to output uncertainty.",
    assumptions: ["Parameters are independent", "Sufficient Monte Carlo samples"],
    cite: "N/A",
  },
  sens_sobolt: {
    description: "Total-effect Sobol' indices capture both first-order and all interaction effects of each parameter on output variance.",
    usage: "Use to identify parameters that influence output through any pathway, including interactions.",
    assumptions: ["Parameters are independent", "Sufficient Monte Carlo samples"],
    cite: "N/A",
  },
  sens_delta: {
    description: "Delta method sensitivity approximates the variance of a function of random variables using first-order Taylor expansion.",
    usage: "Use to propagate uncertainty from input parameters to model outputs analytically.",
    assumptions: ["Function is differentiable", "Variances are small enough for linear approximation"],
    cite: "N/A",
  },
  sens_andrews: {
    description: "Andrews' sensitivity analysis systematically varies key parameters and plots how conclusions change across the range.",
    usage: "Use for visual exploration of how inferences depend on critical assumptions or parameter values.",
    assumptions: ["Parameter ranges are defensible", "Model is well-defined"],
    cite: "N/A",
  },

  // ── BOOTSTRAP ──
  boot_ci: {
    description: "Bootstrap confidence intervals construct CIs by resampling with replacement and using empirical percentiles.",
    usage: "Use when the sampling distribution of a statistic is unknown or non-normal.",
    assumptions: ["Sample is representative", "Bootstrap replicates are sufficient"],
    cite: "N/A",
  },
  boot_se: {
    description: "Bootstrap standard error estimates the variability of a statistic by computing its standard deviation across resamples.",
    usage: "Use to obtain standard errors when no analytical formula exists.",
    assumptions: ["Sample is representative", "Bootstrap replicates are sufficient"],
    cite: "N/A",
  },
  boot_test: {
    description: "Bootstrap hypothesis test computes p-values by comparing the observed statistic to the bootstrap null distribution.",
    usage: "Use for nonparametric hypothesis testing when parametric assumptions are violated.",
    assumptions: ["Null hypothesis can be simulated via resampling", "Test statistic is pivotal or approximately so"],
    cite: "N/A",
  },
  boot_jack: {
    description: "Jackknife resampling estimates bias and standard error by systematically leaving out one observation at a time.",
    usage: "Use for bias estimation and variance estimation with a deterministic resampling scheme.",
    assumptions: ["Statistic is smooth", "Observations are independent"],
    cite: "N/A",
  },
  boot_tci: {
    description: "Bootstrap-t confidence intervals studentize the bootstrap distribution for improved coverage accuracy.",
    usage: "Use when higher-order accurate confidence intervals are needed for pivotal statistics.",
    assumptions: ["Standard error is estimable within each bootstrap sample", "Statistic is approximately pivotal"],
    cite: "N/A",
  },
  boot_influence: {
    description: "Bootstrap influence analysis assesses how individual observations affect bootstrap estimates.",
    usage: "Use to identify influential data points that disproportionately affect bootstrap results.",
    assumptions: ["Observations are independent", "Influence metric is appropriate"],
    cite: "N/A",
  },
  boot_mediation: {
    description: "Bootstrap mediation constructs CIs for the indirect effect using resampling rather than normal-theory assumptions.",
    usage: "Use for mediation analysis when the Sobel test normality assumption is untenable.",
    assumptions: ["Causal ordering is correctly specified", "Bootstrap replicates are sufficient"],
    cite: "N/A",
  },
  boot_modmed: {
    description: "Bootstrap moderated mediation tests conditional indirect effects across levels of a moderator using resampling.",
    usage: "Use when indirect effects are hypothesized to vary as a function of a moderator variable.",
    assumptions: ["Model is correctly specified", "Sufficient sample at each moderator level"],
    cite: "N/A",
  },
  boot_splitconf: {
    description: "Split-sample bootstrap confidence evaluates overfitting by repeatedly splitting data into training and validation sets.",
    usage: "Use to assess model stability and estimate prediction error without a separate validation dataset.",
    assumptions: ["Splits are random and representative", "Model fitting is reproducible"],
    cite: "N/A",
  },
  boot_confpval: {
    description: "Bootstrap confidence p-value inverts confidence intervals to obtain p-values via resampling.",
    usage: "Use when analytical p-values are unavailable or unreliable due to distributional violations.",
    assumptions: ["Confidence interval is properly calibrated", "Bootstrap replicates are sufficient"],
    cite: "N/A",
  },
  boot_jackplus: {
    description: "Jackknife+ provides prediction intervals with guaranteed coverage for any regression algorithm.",
    usage: "Use for distribution-free prediction intervals in machine learning and regression.",
    assumptions: ["Data are exchangeable", "Base model is fit to leave-one-out datasets"],
    cite: "N/A",
  },

  // ── SURVIVAL ANALYSIS ──
  km: {
    description: "The Kaplan-Meier estimator computes a nonparametric survival curve from time-to-event data with censoring.",
    usage: "Use to visualize and summarize survival experience — median survival, survival probability at a given time.",
    assumptions: ["Censoring is independent of the event process (noninformative)", "Event times are accurately recorded"],
    cite: "Kaplan, E. L., & Meier, P. (1958). Nonparametric estimation from incomplete observations. JASA, 53(282), 457–481.",
  },
  logrank: {
    description: "The log-rank test compares the survival distributions of two groups, testing whether their hazard functions differ.",
    usage: "Use to test for a survival difference between two groups (e.g., treatment vs. control).",
    assumptions: ["Proportional hazards between groups (or at least non-crossing survival curves)", "Independent censoring"],
    cite: "Mantel, N. (1966). Evaluation of survival data and two new rank order statistics. Cancer Chemotherapy Reports, 50(3), 163–170.",
  },
  coxph: {
    description: "Cox proportional-hazards regression models the hazard of an event as a function of covariates, without specifying a baseline hazard shape.",
    usage: "Use to estimate hazard ratios for one or more predictors of time-to-event outcomes.",
    assumptions: ["Proportional hazards over time", "Covariates are linearly related to the log-hazard", "Independent censoring"],
    cite: "Cox, D. R. (1972). Regression models and life-tables. Journal of the Royal Statistical Society B, 34(2), 187–220.",
  },

  // ── TIME SERIES ──
  adf: {
    description: "The Augmented Dickey-Fuller test checks for a unit root in a time series — i.e., whether it is non-stationary.",
    usage: "Use before fitting ARIMA-style models, which require (or difference to achieve) stationarity.",
    assumptions: ["Series is regularly (evenly) spaced in time", "No structural breaks"],
    cite: "Dickey, D. A., & Fuller, W. A. (1979). Distribution of the estimators for autoregressive time series with a unit root. JASA, 74(366), 427–431.",
  },
  acf: {
    description: "The autocorrelation function measures the correlation between a series and its own lagged values.",
    usage: "Use to identify seasonality, trend, or the moving-average order (q) in ARIMA modeling.",
    assumptions: ["Series is (weakly) stationary for the standard interpretation to hold"],
    cite: "Box, G. E. P., & Jenkins, G. M. (1970). Time series analysis: Forecasting and control. Holden-Day.",
  },
  pacf: {
    description: "The partial autocorrelation function measures the correlation between a series and its lag k, after controlling for shorter lags.",
    usage: "Use to identify the autoregressive order (p) in ARIMA modeling.",
    assumptions: ["Series is (weakly) stationary for the standard interpretation to hold"],
    cite: "Box, G. E. P., & Jenkins, G. M. (1970). Time series analysis: Forecasting and control. Holden-Day.",
  },

  // ── OUTLIER DETECTION ──
  lof: {
    description: "Local Outlier Factor scores each point by comparing its local density to that of its neighbors — points in sparser regions score higher.",
    usage: "Use for multivariate outlier detection when outlyingness may vary by local density, not just distance from a global center.",
    assumptions: ["Meaningful distance metric across the chosen variables (consider scaling if units differ widely)"],
    cite: "Breunig, M. M., Kriegel, H.-P., Ng, R. T., & Sander, J. (2000). LOF: Identifying density-based local outliers. ACM SIGMOD.",
  },
  iforest: {
    description: "Isolation Forest scores each point by how few random splits are needed to isolate it — outliers isolate faster than typical points.",
    usage: "Use for multivariate outlier detection, especially with larger datasets where distance-based methods get expensive.",
    assumptions: ["No strong assumption on distribution", "Performance depends on the chosen number of trees/sample size"],
    cite: "Liu, F. T., Ting, K. M., & Zhou, Z.-H. (2008). Isolation forest. ICDM.",
  },

  // ── ECONOMETRICS (PANEL DATA) ──
  panel_fe: {
    description: "The fixed-effects estimator removes unit-specific intercepts by demeaning each variable within its group before running OLS, controlling for any time-invariant unit characteristics (observed or not).",
    usage: "Use when you suspect unobserved, time-invariant unit characteristics are correlated with your predictors — the classic omitted-variable-bias fix in panel data.",
    assumptions: ["Multiple observations per unit", "Strict exogeneity of regressors conditional on the unit effect"],
    cite: "Wooldridge, J. M. (2010). Econometric analysis of cross section and panel data (2nd ed.). MIT Press.",
  },
  panel_re: {
    description: "The random-effects (Swamy-Arora FGLS) estimator treats the unit effect as a random draw uncorrelated with the regressors, partially pooling within- and between-unit variation for more efficient estimates than fixed effects.",
    usage: "Use when the unit effect is plausibly uncorrelated with your predictors — more efficient than fixed effects if that assumption holds (test it with the Hausman test).",
    assumptions: ["Unit effects uncorrelated with regressors", "Multiple observations per unit"],
    cite: "Swamy, P. A. V. B., & Arora, S. S. (1972). The exact finite sample properties of the estimators of coefficients in the error components regression models. Econometrica, 40(2), 261–275.",
  },
  hausman_panel: {
    description: "The Hausman specification test compares fixed- and random-effects coefficient estimates — a large, systematic difference indicates the random-effects assumption (unit effects uncorrelated with regressors) is violated.",
    usage: "Use to choose between fixed and random effects: rejecting the null means fixed effects is the safer (consistent) choice.",
    assumptions: ["Both FE and RE estimators are computed on the same sample and specification"],
    cite: "Hausman, J. A. (1978). Specification tests in econometrics. Econometrica, 46(6), 1251–1271.",
  },

  // ── GENERALIZED ADDITIVE MODELS ──
  gam_backfit: {
    description: "GAM backfitting fits y as a sum of smooth (spline) and/or linear functions of each predictor, iteratively refitting each term against the partial residuals of the others.",
    usage: "Use when you suspect a nonlinear relationship between predictors and the outcome but don't want to commit to a specific parametric form.",
    assumptions: ["Additive structure (no unmodeled interactions between smoothed terms)", "Enough data per predictor to estimate a smooth term stably"],
    cite: "Hastie, T., & Tibshirani, R. (1990). Generalized additive models. Chapman & Hall.",
  },
  gam_interact: {
    description: "A GAM tensor-product interaction smooth models how the effect of one predictor on the outcome changes across levels of a second predictor, without assuming a specific functional form.",
    usage: "Use when you suspect two continuous predictors interact nonlinearly — e.g., the effect of X on Y depends on the level of Z.",
    assumptions: ["Sufficient data to estimate a 2-D smooth surface", "Spline df is chosen sensibly relative to sample size"],
    cite: "Wood, S. N. (2017). Generalized additive models: An introduction with R (2nd ed.). CRC Press.",
  },

  // ── MIXTURE MODELS ──
  gmm_cluster: {
    description: "A Gaussian Mixture Model represents the data as a weighted sum of Gaussian components, fit by EM, and assigns each point a soft (probabilistic) cluster membership.",
    usage: "Use for clustering when you expect elliptical, overlapping clusters rather than the hard, roughly-spherical partitions k-means assumes.",
    assumptions: ["Each component is approximately Gaussian", "Number of components (k) is specified in advance"],
    cite: "Dempster, A. P., Laird, N. M., & Rubin, D. B. (1977). Maximum likelihood from incomplete data via the EM algorithm. JRSS B, 39(1), 1–38.",
  },
  lpa: {
    description: "Latent Profile Analysis fits a finite mixture of Gaussian distributions to continuous indicator variables, identifying unobserved subgroups (profiles) with distinct mean patterns.",
    usage: "Use to identify subgroups of people/units that share a distinct pattern across several continuous measures (e.g., personality or symptom profiles).",
    assumptions: ["Indicators are continuous and approximately normal within each profile", "Number of profiles is specified or chosen via BIC/AIC comparison across fits"],
    cite: "Oberski, D. L. (2016). Mixture models: Latent profile and latent class analysis. In Modern Statistical Methods for HCI. Springer.",
  },

  // ── DISTANCE & DEPENDENCE ──
  dist_corr: {
    description: "Distance correlation measures both linear and nonlinear dependence between two variables, and (unlike Pearson r) is exactly zero only when the variables are truly independent.",
    usage: "Use when you suspect a nonlinear or non-monotonic relationship that Pearson r or Spearman ρ might miss.",
    assumptions: ["Finite variances", "Independent observations"],
    cite: "Székely, G. J., Rizzo, M. L., & Bakirov, N. K. (2007). Measuring and testing dependence by correlation of distances. Annals of Statistics, 35(6), 2769–2794.",
  },
  dist_cov: {
    description: "Distance covariance is the unstandardized building block of distance correlation — a nonzero value indicates the two variables are not independent, of any functional form.",
    usage: "Use as a general-purpose, assumption-light test for association when you're unsure whether a relationship (if any) would be linear.",
    assumptions: ["Finite variances", "Independent observations"],
    cite: "Székely, G. J., Rizzo, M. L., & Bakirov, N. K. (2007). Measuring and testing dependence by correlation of distances. Annals of Statistics, 35(6), 2769–2794.",
  },
  wmean: {
    description: "Weighted descriptive statistics adjust the mean, SD, and SE to account for unequal selection probabilities or post-survey adjustment weights.",
    usage: "Use for any survey with sampling weights (probability-proportional-to-size designs, post-stratification, nonresponse adjustment) — an unweighted mean can be badly biased if weights vary.",
    assumptions: ["Weights are non-negative and correctly reflect the design (or adjustment) used", "Value and weight columns have no missing pairs"],
    cite: "Kish, L. (1965). Survey Sampling. Wiley.",
  },
  wcorr: {
    description: "Weighted Pearson correlation applies survey weights to both variables before computing the correlation coefficient.",
    usage: "Use when correlating two variables from a weighted survey sample — an unweighted correlation can misrepresent the population relationship.",
    assumptions: ["Weights correctly reflect the design", "Linear relationship (same assumption as ordinary Pearson r)"],
    cite: "Kish, L. (1965). Survey Sampling. Wiley.",
  },
  deff: {
    description: "The design effect (DEFF) measures how much sampling variance inflates (or deflates) due to unequal weights, compared to simple random sampling; effective sample size (n_eff) is the SRS-equivalent n.",
    usage: "Use to diagnose how much precision a weighted design costs (or gains) versus SRS, and to sanity-check whether a weighting scheme has extreme, variance-inflating weights.",
    assumptions: ["Weights correctly reflect the design"],
    cite: "Kish, L. (1965). Survey Sampling. Wiley.",
  },
  taylor: {
    description: "Taylor linearization estimates the standard error of a total for a stratified, clustered (multi-stage) sample design, using between-PSU variance within each stratum.",
    usage: "Use for the standard error of a total (e.g. population total of a survey item) collected under a stratified-cluster design — the standard 'complex survey' SE method used by most national statistical agencies.",
    assumptions: ["At least 2 primary sampling units (PSUs) per stratum", "PSUs are independently selected within each stratum"],
    cite: "Wolter, K. M. (2007). Introduction to Variance Estimation (2nd ed.). Springer.",
  },
  mds_classical: {
    description: "Classical (metric) MDS finds a low-dimensional coordinate embedding that best preserves pairwise Euclidean distances between observations, via eigendecomposition of a double-centered distance matrix.",
    usage: "Use to visualize the overall structure of multivariate data in 2D when you care about preserving actual distances (not just rank order) — the fastest and most interpretable MDS variant.",
    assumptions: ["Distances are (approximately) Euclidean", "At least 5 observations, 2+ numeric variables"],
    cite: "Torgerson, W. S. (1952). Multidimensional scaling: I. Theory and method. Psychometrika, 17(4), 401–419.",
  },
  mds_sammon: {
    description: "Sammon mapping is a nonlinear MDS variant that weights the stress function to preserve small (local) distances more accurately than large ones, via iterative gradient descent.",
    usage: "Use when local structure (which points are near each other) matters more than exact global distances — often reveals cluster structure classical MDS smooths over.",
    assumptions: ["Distances are meaningfully Euclidean", "At least 5 observations, 2+ numeric variables"],
    cite: "Sammon, J. W. (1969). A nonlinear mapping for data structure analysis. IEEE Transactions on Computers, 18(5), 401–409.",
  },
  mds_nonmetric: {
    description: "Non-metric MDS (Kruskal's method) preserves only the rank order of dissimilarities, not their exact magnitudes, minimizing a stress function over monotonic transformations of distance.",
    usage: "Use when your dissimilarity measure is ordinal or you only trust its rank order (e.g. subjective similarity ratings) rather than its exact numeric scale.",
    assumptions: ["Dissimilarities are at least ordinally meaningful", "At least 6 observations, 2+ numeric variables"],
    cite: "Kruskal, J. B. (1964). Nonmetric multidimensional scaling: A numerical method. Psychometrika, 29(2), 115–129.",
  },
  path_analysis: {
    description: "Path analysis fits a system of recursive OLS regression equations among observed variables (no latent factors), then traces indirect and total effects through chained equations via the reduced-form matrix (I − B)⁻¹ − I, where B holds every direct path coefficient in the system.",
    usage: "Use to decompose a variable's total effect on an outcome into its direct effect plus any indirect effects mediated through other variables in a multi-equation causal chain — the multi-equation generalization of a single mediation analysis.",
    assumptions: ["Each equation's residuals are (approximately) normal and homoscedastic", "The system is recursive (no feedback loops among equations)", "At least 10 observations"],
    cite: "Wright, S. (1934). The method of path coefficients. Annals of Mathematical Statistics, 5(3), 161–215.",
  },
  latent_growth: {
    description: "A latent growth model summarizes each person's trajectory across repeated measures with two latent factors — an intercept (starting level) and a slope (rate of change) — estimated directly from the observed means and covariance structure via GLS, without iterative fitting.",
    usage: "Use to characterize both the average trajectory (mean intercept/slope) and individual differences in that trajectory (intercept/slope variance, and their covariance — do people who start higher also grow faster or slower?) across 2+ repeated measures.",
    assumptions: ["Measures are ordered consistently in time across all cases", "At least 10 observations, 2+ repeated measures", "Linear growth (a straight-line trajectory) between timepoints"],
    cite: "Meredith, W., & Tisak, J. (1990). Latent curve analysis. Psychometrika, 55(1), 107–122.",
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
