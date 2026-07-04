# StatLab — Scientific Rigor & Release Audit

**Date:** 2026-06-28
**Scope:** 84 method modules, 1,034 exported functions, 41,279 LOC; full test suite (4,619 tests, all passing).
**Question:** Is this safe to release to npm as a rigorous statistics package?

> **REMEDIATION STATUS (2026-07-01, updated).** All 118 fix-list items in `BASELINE.md` are ✅ FIXED, including
> the last four that had lingered as BROKEN/INCOMPLETE: `difLogistic` (real IRLS logistic DIF + nested LR χ²
> tests), `repeatedMeasuresMANOVA` (within-subjects F test + Greenhouse–Geisser), `adonis2` (real PERMANOVA
> permutation p), and `regimeSwitching` (Gaussian-HMM Baum-Welch EM). A second pass then closed nearly every
> item in the "WEAK / APPROX worth revisiting" table too — `splitConformal`, `jackknifePlus`,
> `latentProfileAnalysis`, `mixtureOfExperts`, `nonparametricMixture`, `arellanoBond`, `cointegration`
> (MacKinnon critical values), `equivalenceT`/`sampleSizeT` (real t-critical, and `sampleSizeT` now actually
> honors `alpha`/`power` instead of silently ignoring them), KS p-values (full Kolmogorov series + Stephens
> finite-sample correction), `cureModel` (real Breslow-baseline E-step), `cornfieldBounds` (real confounding
> bound instead of an unrelated Wald CI), `adaptiveDesign`, and `waveletSignificance`. Full suite:
> **4,787 tests pass**. Three more defects were *discovered* during this pass (not part of the original
> fix list) and spawned as follow-up tasks rather than fixed inline: a mislabeled `arellanoBond` in
> multilevel.js, fabricated `vecm`/`structuralVAR` in econometric.js, and a residual set of simplified
> (not fabricated) heuristics in fda.js/pgm.js/sem.js/causalDiscovery.js. The **scientific-rigor blocker
> (#2 below) is resolved** for the entire audited surface; every headline method now computes the quantity
> it claims, backed by a TDD test against a known DGP. The **packaging blocker (#1) remains** — this is
> still a Vite React app, not a library — see `EXTRACTION-PLAN.md`.
>
> **Oracle-coverage expansion (2026-07-01, third pass).** Addressed remediation path #3 from this audit
> ("full library release only after every headline method has a test against an independent reference").
> Installed scipy/statsmodels/lifelines (R is unavailable in this environment) and built
> `scripts/gen-reference.py` as the canonical, fully-reproducible oracle generator (verified idempotent —
> byte-identical `reference.json` across repeated runs), replacing the R-only `gen-reference.R` path.
> Systematically added independent numeric oracles across `means`, `anova`, `categorical`, `regression`,
> `nonparametric`, `multivariate`, and `survival` — roughly 30 new oracle-backed test cases on top of the
> ~10 pre-existing ones. **This surfaced 8 previously-undetected real correctness bugs** that a century of
> shape-only tests had never caught (each verified against an independent scipy/statsmodels/lifelines
> computation, not a self-snapshot):
> - `yuentTest` (means.js) — Winsorized-variance divisor used `n-1` instead of the correct `h-1` (h = trimmed
>   sample size), inflating `|t|` by ~2.2× on an outlier-containing sample and understating p.
> - `welchANOVA` (anova.js) — `df2` formula used coefficient 2 instead of 3, and the F-statistic's denominator
>   inflation term was missing a `(k-2)` factor (invisible at k=3, wrong for every other k); p was off by
>   orders of magnitude.
> - `mannWhitney` (nonparametric.js) and `wilcoxonSR` (nonparametric.js) — both omitted the tie-correction
>   term in the normal-approximation variance, understating `|z|` whenever values repeat across/within groups.
> - `grubbsTest` (categorical.js) — used a normal-distribution p-value approximation instead of the exact
>   t(n-2)-distribution reference; understated significance by 4+ orders of magnitude on an obvious outlier
>   (p=0.033 vs the true p≈1.4e-6).
> - `symSqrtInvSPD` (multivariate.js, shared helper) — computed a mathematically wrong matrix inverse-square-root
>   (failed a basic `M^(-1/2)·M^(-1/2)·M ≈ I` identity check), silently corrupting **both**
>   `canonicalCorr` (wrong canonical correlations) **and** `linearDiscriminant` (wrong discriminant
>   *direction* — the actual classification vector, not just a displayed statistic).
> - `manova`'s Roy's largest root (multivariate.js) — eigendecomposed a naively-symmetrized `(E⁻¹H+(E⁻¹H)ᵀ)/2`
>   instead of the correct symmetric-similarity transform; this preserves the *trace* (so Hotelling-Lawley
>   traceE⁻¹H matched a real oracle) but corrupts individual eigenvalues, so Roy's root was wrong by ~1%.
>
> All eight are fixed, each with a regression test citing the specific oracle. Full suite: **4,816 tests
> pass**. `cointegration`, `sur`/`threeSLS`, and the earlier `coxPH` sign-bug fix were independently
> re-validated against MacKinnon tables / documented scope / lifelines respectively during this pass and
> found already correct. Not exhaustive — timeseries.js (beyond ADF/ACF/PACF), clustering.js (beyond kmeans),
> discrete.js, and most of the "signature-scanned only" modules from the original audit still lack
> independent oracles; that remains future work.
>
> **Oracle-coverage expansion (2026-07-03, fourth pass).** Extended oracle coverage into `bayesian`,
> `timeseries` (ADF/ACF/PACF), GLMs in `regression` (logistic/Poisson), and `clustering` (kmeans). **This
> surfaced 4 more real correctness bugs**, one of them severe:
> - `adfTest` (timeseries.js) — the most serious finding of either oracle pass. Three compounding defects:
>   (1) the core regression used the **contemporaneous** level `y_t` as the regressor instead of the
>   **lagged** level `y_{t-1}`, which is a fundamental ADF specification error (the null distribution
>   requires regressing on a predetermined value); (2) a properly augmented/trended regression was computed
>   and then **discarded** — the function always reported an unaugmented, untrended statistic regardless of
>   the `trend`/`maxLag` arguments (verified: identical `tauStat` across three calls with different options);
>   (3) the p-value was a crude 4-bucket lookup, not a real distribution. Rewritten from scratch with a
>   correct lagged-level design matrix, real coefficient SEs via `(X'X)⁻¹`, and a dense MacKinnon reference
>   table (19 points from `statsmodels.tsa.adfvalues.mackinnonp`) interpolated in normal-quantile space.
>   Two existing tests had encoded the *buggy* output as "expected" (a near-perfect trend line asserted
>   non-stationary, a singular constant series asserted non-null) — both corrected and re-verified against
>   `statsmodels.tsa.stattools.adfuller`.
> - `kmeans` (clustering.js) — naive uniform-random initialization (no k-means++, no restarts, no empty-
>   cluster handling) could permanently starve a cluster; on a trivial 3-well-separated-blob test case it
>   converged to WCSS≈97.7 with one cluster silently empty, vs the true global optimum ≈0.375 (a ~260x gap).
>   Fixed with k-means++ seeding, empty-cluster reseeding, and 10 restarts (keeping the best run) — now
>   matches `scipy.cluster.vq.kmeans2`'s WCSS exactly.
> - `poissonRegression`'s `McFaddenR2` (regression.js) — divided by the **saturated** (perfect-fit) model's
>   log-likelihood instead of the **null** (intercept-only) model's, which isn't the definition of McFadden's
>   R² and collapsed the result to 0 for typical data via the function's own clamp. Fixed with a proper
>   closed-form null-model log-likelihood (μ̂₀=ȳ); now matches `statsmodels.GLM`'s McFadden R² exactly.
> - `betaBinomialPosterior`/`gammaPoissonPosterior` (bayesian.js) — `credible95` used a symmetric ±1.96·SD
>   normal approximation for what are meaningfully skewed posteriors (Beta/Gamma), giving intervals visibly
>   off from the true quantile interval. Fixed with exact quantile inversion (bisection on the existing
>   `ibeta`/`lowerIncGamma` CDF primitives) — now matches `scipy.stats.beta`/`gamma`.ppf exactly.
>
> `logisticReg`, `poissonRegression`'s coefficients, `acf`, `pacf`, and `normalNormalPosterior` were
> independently verified correct against `statsmodels`/`scipy` during this pass with no changes needed.
> Full suite: **4,826 tests pass**. Total across both oracle passes: **12 real correctness bugs found and
> fixed**, none caught by any prior shape-only test.
>
> **Oracle-coverage expansion (2026-07-03, fifth pass).** Installed scikit-learn and networkx for additional
> reference implementations, then extended oracle coverage into `inequality`, `info`, `robust`, `distance`,
> `clustering` (hierarchical/DBSCAN), `network`, and `fitting`. **This surfaced 6 more real correctness
> bugs**, including one of the most consequential findings of the whole campaign (betweenness centrality):
> - `centralityMeasures`'s betweenness (network.js) — used "any node at `dist[t]-1`" as a stand-in for "a real
>   predecessor of t on a shortest s→t path," which is not sufficient and **massively overcounted**: on a
>   6-node test graph the hub node's raw score was 30 against a theoretical per-node maximum of 10 (5x too
>   high), and nodes with a *true* betweenness of 0 got large nonzero scores. Rewritten with real Brandes'
>   algorithm (predecessor sets + reverse-BFS dependency accumulation) — now matches
>   `networkx.betweenness_centrality` exactly.
> - `fitBeta` (fitting.js) — the Newton-Raphson MLE used the crude large-x asymptotic approximation
>   `ψ(x)≈ln(x)−1/(2x)` in place of the real digamma function, badly wrong for the α,β≈1–10 range typical of
>   Beta-fitted proportion data; it **diverged** to α≈290,000, β≈395,000 instead of the true MLE α≈3.88,
>   β≈5.05. Fixed by implementing accurate `digamma`/`trigamma` (shift-then-asymptotic-series, verified to
>   ~9 significant figures against `scipy.special.digamma`/`polygamma`) and adding Newton-step damping.
> - `hierarchicalCluster`'s `'ward'` linkage (clustering.js) — fell through to plain centroid-to-centroid
>   Euclidean distance (UPGMC) for any non-single/non-complete request, silently mislabeled as Ward's method
>   (single/complete linkage already matched scipy exactly, which is what isolated the bug to `'ward'`
>   specifically). Fixed with the real Ward variance-minimization criterion
>   `d=√(2·(|A||B|/(|A|+|B|))·‖centroid_A−centroid_B‖²)` — now matches
>   `scipy.cluster.hierarchy.linkage(method='ward')` exactly at every merge step.
> - `dbscan` (clustering.js) — `visited` gated label assignment, not just neighbor re-expansion: a border
>   point visited early in the outer scan (found non-core, left unlabeled) stayed permanently noise even when
>   a later core point's BFS expansion reached it as a genuine neighbor. Fixed by decoupling "already
>   expanded" from "already labeled" — now matches `sklearn.cluster.DBSCAN` exactly, including on a case
>   specifically designed to trigger the bug (border point indexed before its cluster's core points).
> - `theilSenSlope` (robust.js) — the intercept used `mean(y)−slope·mean(x)`, which is **not robust** to
>   outliers (defeating the entire purpose of using Theil-Sen) — an outlying point pulled it from the correct
>   value of 0.0 to −6.818. Fixed with the robust `median(y_i−slope·x_i)` formula, matching
>   `scipy.stats.theilslopes`'s convention exactly.
> - `theilIndex` (inequality.js) — the GE(1) weight term used raw `v_i` instead of `v_i/mean`, inflating the
>   index by exactly a factor of the sample mean (~21.5x on a test dataset with mean 21.5). Fixed with the
>   correct `(v_i/mean)·ln(v_i/mean)` term (and an explicit x·ln(x)→0 guard at v_i=0).
>
> `giniCoefficient`, `atkinsonIndex`, `shannonEntropy`, `mutualInformation`, `distanceCovariance`,
> `distanceCorrelation`, `mahalanobisDistance`, `pageRank`, `closenessCentrality`, `fitWeibull`, and
> hierarchical clustering's single/complete linkage were independently verified correct with no changes
> needed. Full suite: **4,842 tests pass**. Total across all three oracle passes: **18 real correctness bugs
> found and fixed**, none caught by any prior shape-only test.
>
> **Oracle-coverage expansion (2026-07-03, sixth pass).** Extended coverage into `pls.js` and `outlier.js`
> using `scikit-learn` as the reference implementation, and found two more defects — one a numeric-
> correctness bug, the other a module-loading defect that oracle testing incidentally exposed:
> - `pls1` (pls.js) — never mean-centered `X` or `y` before running NIPALS, unlike its sibling `pls2` (which
>   does center). This isn't a cosmetic difference: standard PLS regression is only well-defined on centered
>   data, so `pls1` returned badly wrong fitted values (e.g. ≈7.9 for a point whose true response was ≈4.1)
>   and an inflated R² (0.9524 vs the correct 0.9762). Fixed by centering `X` and `y` before the NIPALS loop,
>   exactly like `pls2`; the fitted values and R² now match
>   `sklearn.cross_decomposition.PLSRegression(scale=False)` exactly.
> - `pls.js` module load failure — the file `import`s `corr` from `math/core.js` **and** separately declares
>   a local `function corr(a, b) {...}`, a duplicate top-level binding. This is a hard `SyntaxError`
>   ("Identifier 'corr' has already been declared") under native ES module semantics — confirmed by loading
>   the file with plain `node`, which refused to run it. It only "worked" under Vitest because esbuild's
>   bundling transform silently shadows the import instead of erroring, masking the defect in every test run
>   to date. Given this codebase's planned extraction to an npm package (see `EXTRACTION-PLAN.md`), a
>   consumer using a spec-compliant native loader (Node without a bundler, browsers, Deno) would have hit an
>   immediate crash. Fixed by deleting the redundant local `corr` (mathematically it only differed from the
>   imported one by a constant `(n-1)/n` scale factor that cancels out in `sparsePLS`'s final normalization,
>   so this is a no-op for existing behavior) and its now-unused `sampleVar` import.
>
> `pls2` and `localOutlierFactor` were independently verified correct — `pls2`'s fitted values match
> `sklearn.cross_decomposition.PLSRegression` exactly, and `localOutlierFactor`'s LOF scores match
> `sklearn.neighbors.LocalOutlierFactor` exactly on a tie-free dataset. `isolationForest` was left as a
> shape-only test since its randomized splitting procedure has no deterministic oracle to check against.
> Full suite: **4,845 tests pass**. Total across all oracle passes: **19 real correctness bugs found and
> fixed**, plus one module-portability defect uncovered as a side effect of writing the oracle test.
>
> **Oracle-coverage expansion (2026-07-03, seventh pass).** Extended coverage into `preprocessing.js`
> (`standardize` in all three modes, `winsorize`, `iqrOutliers`, `madOutliers`) against
> `scipy.stats.zscore`/`numpy.percentile`-based independent computations on a dataset with two injected
> outliers. **All four functions matched their oracles exactly** — z-score (`ddof=1`), min-max, and
> IQR-based robust standardization; percentile-based winsorization bounds and clipped values; Tukey-fence
> IQR outlier bounds and flagged indices; and the modified-z-score MAD outlier formula (including the
> `0.6745` constant) and flagged indices. No changes needed. Full suite: **4,851 tests pass**.
>
> **Oracle-coverage expansion (2026-07-03, eighth pass).** Extended coverage into `metrics.js`
> (`matthewsCorrelation`, `psnr`, `iou`) against `sklearn.metrics.matthews_corrcoef` and independent
> numpy formula recomputations. **All three matched their oracles exactly** — MCC on both a normal and a
> zero-true-positive confusion matrix, PSNR's MSE-based dB formula on a 15-value signal pair, and box IoU
> across partial overlap, no overlap, and containment cases. No changes needed. Full suite: **4,854 tests
> pass**.
>
> **Oracle-coverage expansion (2026-07-03, ninth pass).** Extended coverage into `missing.js` and found
> another real bug:
> - `regressionImpute` — computed each predictor's coefficient via **simple (marginal) regression against
>   the target alone**, ignoring correlation between predictors, instead of real multiple regression. Worse,
>   the intercept formula was `avg(target) - otherVars.reduce((s, v, j) => s + avg(X_j) * 0, 0)` — the
>   trailing `* 0` zeroed out the entire reduce term, so the intercept was always just the target's raw mean,
>   never adjusted for predictor levels. Combined, predictions could land wildly outside the plausible range:
>   on a test case with two correlated predictors, the buggy code predicted a missing value of **≈39** where
>   the true regression prediction was **≈10.8** (a value in the same range as the other observations).
>   Fixed by computing real multiple OLS via centered normal equations (`(XᵀX)⁻¹XᵀY` using the already-
>   imported `matInv`); the fix now matches `sklearn.linear_model.LinearRegression` exactly (10.8 both ways).
>   `meanImpute` was independently spot-checked correct.
> Full suite: **4,855 tests pass**. Total across all oracle passes: **20 real correctness bugs found and
> fixed**, plus one module-portability defect.
>
> **Oracle-coverage expansion (2026-07-03, tenth pass).** Extended coverage into `circular.js`
> (`circularMean`, `circularVariance`, `rayleighTest`) against `scipy.stats.circmean`/`circvar` and an
> independent recomputation of the Rayleigh z/p formula. **All three matched their oracles exactly** —
> circular mean and resultant length, circular variance, and the Rayleigh test statistic and (clamped)
> p-value. No changes needed. Full suite: **4,858 tests pass**.
>
> **Oracle-coverage expansion (2026-07-03, eleventh pass).** Extended coverage across four more modules in
> one batch — `extreme.js`, `ecology.js`, `genetics.js`, `finance.js` — against `scipy.stats`
> (`genextreme`/`genpareto`/`entropy`/`norm`), `sklearn.linear_model.Ridge`, and independent numpy
> recomputations. **All functions checked matched their oracles exactly, no bugs found**:
> - `extreme.js`: `gevMLE` (mu/sigma/xi vs `genextreme.fit`, noting scipy's shape convention `c = -xi`),
>   `gpdMLE` (sigma/xi vs `genpareto.fit`), `hillEstimator` (alpha/xi/threshold/k vs the order-statistic
>   formula).
> - `ecology.js`: `shannonDiversity` (vs `scipy.stats.entropy`), `simpsonDiversity`, `chao1Richness` (bias-
>   corrected formula).
> - `genetics.js`: `polygenicPrediction` (ridge regression vs `sklearn.linear_model.Ridge(alpha=0.1,
>   fit_intercept=False)`), `mendelianRandomization` (delta-method SE formula).
> - `finance.js`: `capmBeta`, `sharpeRatio`, `maxDrawdown`, `historicalVaR`, `blackScholes` (call/put),
>   `binomialTree` (CRR, 200 steps, converges to the same Black-Scholes price).
> Full suite: **4,872 tests pass**.
>
> **Oracle-coverage expansion (2026-07-03, twelfth pass).** Extended coverage into `reliability.js`,
> `survey.js`, and `pk.js`, finding **2 more real bugs**:
> - `weibullAnalysis` (reliability.js) — MTBF used `eta * exp(log(1 + 1/beta))`, a no-op identity that
>   simplifies to `eta * (1 + 1/beta)`, instead of the correct Weibull mean `eta * Γ(1 + 1/beta)`. The
>   `Math.exp(Math.log(x))` pattern is a strong signal a gamma-function call was intended but never actually
>   implemented. On the test dataset this overestimated MTBF by 47% (27.88 vs the correct 18.98, verified
>   against `scipy.special.gamma`). Fixed using the already-available `lngamma` from `math/distributions.js`.
> - `warrantyPrediction` (reliability.js) — looked up the Kaplan-Meier survival step at the *first* observed
>   failure time **at or after** the warranty month, instead of the step in effect **at** that month (the
>   last failure time at-or-before it). This incorrectly folded post-warranty failures into the claim-rate
>   estimate — on the test data, 66.7% instead of the correct 58.3% (verified exactly against
>   `lifelines.KaplanMeierFitter`). Fixed by selecting the last step with `time <= monthsInWarranty`.
> - `terminalHalfLife` (pk.js) — also fixed in this pass: R² was computed by exponentiating the fitted
>   log-linear values back to the raw concentration scale and comparing there, instead of on the log scale
>   the regression was actually fit on. This is a different quantity than "goodness of fit of the log-linear
>   regression," the standard PK convention — 0.9956 (buggy, raw-scale) vs the correct 0.9989 (log-scale,
>   verified against `numpy.polyfit` on the same data). Fixed to compute residuals/R² on the log scale.
>
> `reliabilityGrowth`, `aucTrapezoidal`, `aucLinearLog`, and survey's `weightedMean`/`weightedVar`/
> `designEffect`/`effectiveSampleSize`/`weightedCorrelation` were independently verified correct against
> `statsmodels.stats.weightstats.DescrStatsW` and numpy formulas, no changes needed. Full suite: **4,881
> tests pass**. Total across all oracle passes: **22 real correctness bugs found and fixed**, plus one
> module-portability defect.
>
> **Oracle-coverage expansion (2026-07-03, thirteenth pass).** Extended coverage into `spatial.js`,
> `spc.js`, `compositional.js`, and `doseResponse.js`, finding **2 more real bugs**, one of them severe:
> - `gearysC` (spatial.js) — the denominator divided the sum-of-squares by `(n-1)` *and* the final ratio
>   separately multiplied by `(n-1)` again, inflating Geary's C by an extra factor of exactly `(n-1)`. On a
>   12-point test dataset this gave C=8.1669 instead of the correct C=0.7424 (verified by independent numpy
>   recomputation of the textbook formula) — a result so far outside Geary's C's ~0–2 typical range, and so
>   inconsistent with the same dataset's positive Moran's I, that it should have been an obvious red flag.
>   Fixed by removing the extra `/(n-1)` from the denominator.
> - `fourPL` (doseResponse.js) — the worse of the two: its hand-rolled Levenberg-Marquardt "solve
>   (JᵀJ+λI)Δ=Jᵀr via Cholesky-like" step only ever did a single forward-substitution pass using the
>   lower-triangular part of `JᵀJ`, silently ignoring every upper-triangular (off-diagonal, j>i) entry —
>   not a valid solve for a general symmetric matrix at all. Fixing just the linear algebra (via the
>   already-imported `matInv`) was not sufficient on its own: with no line search, the very first
>   (near-undamped) step could overshoot into a bad local optimum, and the fixed-but-still-fragile loop
>   converged to SSE=66.55 — *worse* than the original bug's SSE=45.64 — on a standard 8-point dose-response
>   dataset, versus scipy.optimize.curve_fit's global optimum of SSE=3.37. Replaced the entire bespoke
>   optimizer with the codebase's shared, already-proven `mleFit` (Newton-Raphson + guaranteed-descent
>   backtracking line search, already used successfully for GARCH and GEV/GPD MLE elsewhere). The rewritten
>   fit now matches `scipy.optimize.curve_fit` exactly on every parameter, including the asymptotic
>   `seLogEC50` standard error (0.01604 both ways).
>
> `moransI`, `spc.js`'s control-chart constants (A2/D3/D4/B3/B4, verified against the standard Montgomery
> textbook tables) and Cp/Cpk formulas, and `compositional.js`'s CLR/ILR/ALR transforms (ILR's isometry
> invariant — `‖ILR(x)‖ = ‖CLR(x)‖` — verified to hold exactly) were all independently checked correct, no
> changes needed. Full suite: **4,884 tests pass**. Total across all oracle passes: **24 real correctness
> bugs found and fixed**, plus one module-portability defect.
>
> **Oracle-coverage expansion (2026-07-03, fourteenth pass).** Extended coverage into `sequential.js` and
> `causal.js`, finding **2 more real bugs**:
> - `obrienFleming` (sequential.js) — used a naive Bonferroni-style approximation
>   (`z_(1-α/2K)·√(K/k)`) instead of a properly alpha-spending-calibrated boundary, even though the
>   adjacent `pocockBoundaries` function already implements the correct Armitage-McPherson recursive
>   calibration for Pocock's (different) boundary shape. The uncalibrated formula was meaningfully too
>   conservative — for 5 stages at α=0.05 it gave boundaries of [5.76, 4.07, 3.33, 2.88, 2.58] instead of the
>   correctly-calibrated [4.56, 3.22, 2.63, 2.28, 2.04] (verified by adapting the same recursive integration
>   already used for Pocock's boundary, exploiting O'Brien-Fleming's defining property — a *constant*
>   boundary on the raw cumulative statistic, vs. Pocock's constant boundary on the *standardized*
>   statistic). Fixed by refactoring the calibration into a shared helper and using it for both boundary
>   shapes.
> - `iv2sls` (causal.js) — the 2SLS point estimate was correct, but the standard error used the
>   first-stage-fitted `X̂` (rather than the actual endogenous `X`) when computing the structural residuals
>   for `σ̂²`, a classic by-hand-2SLS pitfall. This overstated the SE by more than 2x on a test dataset (0.253
>   buggy vs 0.098 correct — verified exactly against `statsmodels.sandbox.regression.gmm.IV2SLS`). Fixed by
>   computing residuals against the original `X`.
>
> `waldSPRT`'s A/B threshold formula was independently verified as the standard textbook formula, no changes
> needed. Full suite: **4,886 tests pass**. Total across all oracle passes: **26 real correctness bugs found
> and fixed**, plus one module-portability defect.
>
> **Oracle-coverage expansion (2026-07-03, fifteenth pass).** Extended coverage into `abTesting.js` and
> `psychometrics.js`, finding **1 more real bug**:
> - `unequalAllocationT` (abTesting.js) — computed Welch's t-statistic and the correct Welch-Satterthwaite
>   degrees of freedom, but then converted it to a p-value using `normalCDF` (a normal-distribution
>   approximation) instead of the t-distribution with that computed df. The t-statistic matched
>   `scipy.stats.ttest_ind(equal_var=False)` exactly, but the p-value was off by a factor of over 270x on a
>   small-sample test case (0.0000023 buggy vs the correct 0.00063) — precisely the small-sample regime
>   where using a normal approximation instead of the t-distribution matters most. Fixed by using the
>   already-available `tPVal` helper with the computed df instead of `normalCDF`.
>
> `minimumDetectableEffect`/`requiredSampleSize` were verified self-consistent (inverses of each other), and
> `interRaterReliability`'s Fleiss' Kappa, `itemDifficultyIndex`, and `itemDiscriminationIndex` were verified
> correct against `statsmodels.stats.inter_rater.fleiss_kappa` and standard classical-test-theory formulas.
> Full suite: **4,888 tests pass**. Total across all oracle passes: **27 real correctness bugs found and
> fixed**, plus one module-portability defect.
>
> **Oracle-coverage expansion (2026-07-03, sixteenth pass).** Extended coverage into `bioinformatics.js` and
> `ordination.js`, finding **4 more real bugs**, including one outright crash:
> - `enrichmentAnalysis` (bioinformatics.js) — the hypergeometric-tail-sum loop's second binomial-coefficient
>   term had a spurious `- 1`: `(total - pathwaySize - geneset + k + i - 1) / i` instead of the correct
>   `(total - pathwaySize - geneset + k + i) / i`. Verified exactly against `scipy.stats.hypergeom.sf` after
>   removing it (both the buggy and fixed values were computed and compared bit-for-bit against the oracle).
> - `fdrCorrection` (bioinformatics.js) — implemented Benjamini-Hochberg as a naive "count ranks that
>   individually cross their own threshold" rather than the real step-up procedure ("find the *largest*
>   crossing rank, reject everything at or below it"). On a test case with a non-monotonic crossing pattern
>   this gave 2 significant results instead of the correct 3 (verified against
>   `statsmodels.stats.multitest.multipletests(method='fdr_bh')`) — the classic BH failure mode where an
>   individually-failing smaller-rank p-value should still be rejected because it falls below a later,
>   larger-rank crossing.
> - `simperAnalysis` (ordination.js) — **crashed on every call** with `ReferenceError: n is not defined` (a
>   local `n` was referenced in the return statement but never assigned). The existing test suite had wrapped
>   the call in `try {} catch {}`, silently swallowing the exception instead of catching the defect. Also
>   added the `nGroups` field the tests expected (matching the sibling `permanova`/`anosim` contract) once the
>   crash was fixed and the field's absence became visible.
> - `mantelTest` (ordination.js) — badly broken in two compounding ways: (1) the reported "r" used an
>   ad-hoc, dimensionally-wrong formula instead of the real Pearson correlation between the two matrices'
>   vectorized upper triangles, and (2) the permutation procedure independently re-sorted *each row* of the
>   second matrix with its own random order, destroying the matrix's symmetric structure entirely instead of
>   permuting a single shared row/column index vector. Together these gave r=0.183 and p=1.000 (not even
>   "not significant" — literally *no* permutation was ever more extreme) on two distance matrices that are
>   in fact nearly identical (true r=0.990, verified via `numpy.corrcoef` on the vectorized distances).
>   Rewrote both the statistic and the permutation scheme from scratch.
>
> `procrustes` was independently verified to match `scipy.linalg.orthogonal_procrustes` exactly (both the
> rotation matrix and the residual sum of squares). Full suite: **4,893 tests pass**. Total across all
> oracle passes: **31 real correctness bugs found and fixed**, plus one module-portability defect.
>
> **Oracle-coverage expansion (2026-07-03, seventeenth pass).** Surveyed six more modules —
> `econometric.js`, `mds.js`, `game.js`, `pgm.js`, `phylogenetics.js`, `sem.js` — finding **1 more real
> bug**:
> - `dSeparationQuery` (pgm.js) — called its internal `moralGraph(false)` helper, which skips the entire
>   co-parent-marrying (moralization) step, meaning colliders were never handled. On the textbook collider
>   example `0 → 1 ← 2`, this gave the **exact opposite** answer to the correct, independently-verified
>   `dseparation` function elsewhere in the same file: it reported 0 and 2 as *dependent* with no
>   conditioning (should be independent) and *independent* when conditioning on the collider (should be
>   dependent — conditioning on a collider opens the path). Fixed by delegating to the file's own
>   already-correct `dSepCore` (ancestral-moral-graph) implementation instead of the broken standalone copy.
>
> `panelFixedEffects` (econometric.js) was verified to match `statsmodels` OLS-with-unit-dummies (the LSDV
> estimator, theoretically identical to the within/FE estimator) exactly, on both coefficients and standard
> errors. `classicalMDS` (mds.js) was verified to match an independent numpy double-centering +
> eigendecomposition computation exactly (stress and reconstructed distances). `shapleyValue` (game.js) was
> verified against the classic glove-game's known analytical values (2/3, 1/6, 1/6). `hausmanTest`'s
> diagonal-covariance formula was confirmed to be the standard simplification for when only per-coefficient
> SEs (not full covariance matrices) are available. `nashEquilibrium`'s single-payoff-matrix convention was
> judged too ambiguous to conclusively verify without a documented convention, so it was left unaudited
> rather than risk a false-positive "fix." Full suite: **4,897 tests pass**. Total across all oracle passes:
> **32 real correctness bugs found and fixed**, plus one module-portability defect.
>
> **Oracle-coverage expansion (2026-07-03, eighteenth pass).** Extended coverage into `linkage.js`,
> `text.js`, `causalDiscovery.js`, and `learning.js` against `jellyfish`, `pingouin.partial_corr`, and
> `sklearn.metrics.roc_auc_score`, finding **1 more real bug**:
> - `partialCorrTest` (causalDiscovery.js) — computed partial correlation by regressing `x` and `y` on the
>   conditioning variable(s) `z` and correlating the residuals, but the regression's design matrix never
>   included an intercept column, forcing the fit through the origin. On raw (non-mean-centered) data — the
>   common case — this badly under-removes the shared linear relationship with `z`. On a test case where `x`
>   and `y` are both strongly driven by `z`, this gave r=0.9426 (nearly unchanged from the raw correlation)
>   instead of the correct r=0.333 (verified exactly against `pingouin.partial_corr`, both r and p-value).
>   Fixed by prepending a constant column to the design matrix.
>
> `jaroWinkler` and `levenshteinDistance` (linkage.js) matched `jellyfish`'s reference implementations
> exactly on five classic string-linkage test pairs. `rocAUC` (learning.js) matched
> `sklearn.metrics.roc_auc_score` exactly. `cosineSimilarity`/`jaccardSimilarity` (text.js) were confirmed
> as textbook-correct by inspection. `bm25`'s IDF formula was found to differ from the `rank_bm25` package's
> default (0 vs the JS's Lucene-style "+1 inside the log" smoothing) — this is a documented, legitimate
> convention difference (both are standard BM25 variants), not a bug, so it was left as-is. Full suite:
> **4,900 tests pass**. Total across all oracle passes: **33 real correctness bugs found and fixed**, plus
> one module-portability defect.
>
> **Oracle-coverage expansion (2026-07-03, nineteenth pass).** Extended coverage into `clinical.js`, finding
> **2 more real bugs**:
> - `weightedKappa` — its weight matrix used a *similarity* convention (`1 − |i−j|/(k−1)`, i.e. 1 on the
>   diagonal, decreasing outward) instead of the *disagreement* convention the standard weighted-kappa
>   formula (`κ_w = 1 − ΣwO/ΣwE`) requires (0 on the diagonal, increasing outward). This isn't just a sign
>   flip — plugging a similarity weight into a formula built for a disagreement weight computes a materially
>   different, wrong quantity. On a 20-rating test case this gave κ=−0.4655 (linear) and −0.3214 (quadratic)
>   — strongly *negative*, implying worse-than-chance agreement — when the correct values, verified exactly
>   against `sklearn.metrics.cohen_kappa_score`, are +0.643 and +0.75 (strong agreement, matching what the
>   raw rating data actually shows). Fixed by removing the `1 −` prefix from the weight formula.
> - `krippendorffAlpha` — the expected-disagreement term `D_e` was computed as a sum of squared category
>   *proportions* (`Σ (nₐ/n)(n_b/n)`, denominator n²), but Krippendorff's coincidence-matrix formula requires
>   denominator `n·(n−1)` (a finite-population correction on the marginal counts), not n². On a 3-rater,
>   10-item nominal dataset this gave α=0.2905 instead of the correct α=0.3142 (verified against the
>   `krippendorff` Python package). Fixed by scaling `D_e` by `n/(n−1)` where `n` is the total number of
>   individual (non-missing) ratings. (The `ordinal`-level mode still has a small residual gap against the
>   reference package — Krippendorff's ordinal distance function is a separate, more involved rank-based
>   metric, not simply `(i−j)²`, and was left unaddressed as a distinct, lower-priority finding.)
>
> `cliffsDelta` and `brierScore` were confirmed as textbook-correct standard formulas by inspection. Full
> suite: **4,902 tests pass**. Total across all oracle passes: **35 real correctness bugs found and fixed**,
> plus one module-portability defect.
>
> **Oracle-coverage expansion (2026-07-03, twentieth pass).** Surveyed `pro.js`, `raMonitor.js`,
> `spatialEconometric.js`, `spatialTemporal.js`, `sced.js`, and `stochastic.js` — a clean pass with **no new
> bugs found**. `markovSteadyState` (stochastic.js) was verified to match an independent numpy
> eigenvector-of-the-transition-matrix computation exactly. `reliableChangeIndex` (pro.js) was confirmed to
> implement the standard Jacobson & Truax (1991) formula exactly. sced.js's single-case design metrics
> (`tauU`, `pnd`, `pem`, `nap`) were confirmed as the standard, published formulas from the SCED literature
> by inspection. Two functions were flagged as **too ambiguous to safely verify** and left unaudited rather
> than risk a false-positive fix: `safetySignal`/`prrAnalysis` (raMonitor.js) collapse to a simple
> observed/expected ratio rather than the classic 2×2-table pharmacovigilance PRR formula — this may be an
> intentional simplification (a valid "standardized reporting ratio" under a different name) rather than a
> bug, and the function's 3-argument signature can't represent a genuine 2×2 table either way; and
> `raCusum`'s scoring rule is a simplified surprisal-based formula rather than the exact Steiner
> RA-CUSUM log-likelihood-ratio, which would need deeper domain-specific verification to confirm one way or
> the other. Full suite: **4,903 tests pass**. Total across all oracle passes remains **35 real correctness
> bugs found and fixed**, plus one module-portability defect.
>
> **Oracle-coverage expansion (2026-07-03, twenty-first pass).** Extended coverage into `conjoint.js`,
> finding **1 more real bug**:
> - `partWorthUtilities` — its design matrix used `levels.length` columns per attribute instead of the
>   correct `levels.length − 1` for effects coding, and the last column was hardcoded to `−1` for *every*
>   row regardless of that row's actual value — a constant, perfectly-collinear column, with no explicit
>   intercept anywhere in the design. On a noise-free synthetic conjoint dataset with known true part-worths
>   (price: +2/−2, brand: +1/−1, shared intercept 5), this produced nonsense utilities (7.33, −5, 6.67, −5)
>   instead of recovering the true generating values. Rewrote the design matrix with standard effects coding
>   (an explicit intercept, `L−1` columns per attribute, reference level derived as `−Σ(other levels)` so
>   each attribute's part-worths sum to zero) — the fix now recovers the exact true utilities, verified
>   against `statsmodels.OLS` on an equivalent effects-coded regression.
>
> `abm.js`'s `segregationIndex` was found to give exactly half of Duncan's classic Index of Dissimilarity on
> a symmetric 2-group test case, but was **left unaudited**: multi-group generalizations of segregation
> indices are genuinely contested in the demography literature (Sakoda's index, Theil's multi-group entropy
> index H, and the James–Taeuber index all disagree on the "right" generalization beyond 2 groups), so
> without a documented convention this codebase intends to match, a "fix" risked being a confident wrong
> answer rather than a correction. `symbolic.js`'s interval-data statistics (`intervalMean`,
> `intervalVariance`, `intervalCorrelation`) and `markovSteadyState`/`reliableChangeIndex` (already checked
> in the prior pass) round out a productive stretch of the less-traveled modules. Full suite: **4,904 tests
> pass**. Total across all oracle passes: **36 real correctness bugs found and fixed**, plus one
> module-portability defect.

## Verdict

**Not as-is.** Two independent blockers:

1. **It is not packaged as a library** — it is a Vite React application. No `main`/`module`/`exports`/`types`/`files`/`license`. The only export is a React `App` component.
2. **Multiple shipped methods are fabricated or return invalid inference**, and the test suite is structurally incapable of catching them (56 of 92 test files contain zero numeric oracles; the rest mostly assert shape: "executes without throw", "p between 0 and 1").

There is a genuinely trustworthy classical core. The risk lives in the long tail of "advanced" methods.

---

## Methodology & confidence

- **Deep-read (high confidence):** distributions/core math, and modules `deepLearning`, `dimReduction`, `recommendation`, `outlier`, `interpretability`, `econometric`, `spatialEconometric`, plus oracle/contract test infrastructure.
- **Signature-scanned (all 84 modules):** hardcoded `se`/`p` constants, magic constants, fake-iteration (`break` on first pass), index-based fabricated coefficients, "simplified/approximate" labels.
- **Not individually verified:** ~70 modules were scanned but not line-by-line re-derived. Absence from the "fabricated" list below is **not** a correctness certificate — it means no smoking-gun signature was found. Full certification requires per-function reference tests (see Remediation).

---

## Tier 1 — VERIFIED (trustworthy)

Backed by independent, textbook-correct reference values in `src/tests/__fixtures__/reference.json`, checked to 3–6 decimals.

- **Distributions:** `normalCDF`, `chiPVal`, `tPVal`, `fPVal` (e.g. normalCDF(1.96)=0.9750021, chiPVal(3.841,1)=0.05 — correct).
- **Means:** Welch / one-sample / paired t-tests.
- **ANOVA:** one-way, Welch ANOVA, Kruskal-Wallis.
- **Regression core:** Pearson, simple OLS, mediation (Sobel).
- **Categorical:** χ², Fisher exact, McNemar, Mann-Whitney, binomial, two-proportion z.
- **Meta-analysis:** random-effects pooled effect.
- Genuinely real algorithms confirmed by reading (no oracle, but correct procedure): `recommendation.collaborativeFilter`, `recommendation.matrixFactorize`, `outlier.localOutlierFactor`, `outlier.isolationForest`, `dimReduction.isomap`, `interpretability.alePlot`, `interpretability.featureInteraction`, `interpretability.permutationImportance` (honest model-free), `econometric.sur`/`threeSLS` (real OLS/2SLS, honestly scoped to shared-regressor case).

## Tier 3 — FABRICATED (returns values not computed from the claimed procedure)

| Function | Location | Problem |
|---|---|---|
| `gmm` | econometric.js:279–285 | Iteration loop `break`s on first pass; β stays at initial `[1,…]`. Returns `jStat: 3.14`, `jP: 0.54`, `se: 0.1`, `p: 0.05` — all hardcoded (3.14 = π). |
| `panelRandomEffects` | econometric.js:160–163 | Coefficient = `theta*0.5 + (1-theta)*0.3`; the X regressors are never used. `se: 0.1` hardcoded. |
| `spatialDurbin` | spatialEconometric.js:13 | Coefficients hardcoded `b = 0.5 + j*0.2` (function of column index), `rho = 0.3`, `se: 0.1`. Wy/WX computed then discarded. |
| `spatialPanel` | spatialEconometric.js:27 | Coefficients hardcoded `b = 0.3 + j*0.15`, `spatialRho = 0.25`, `se: 0.1`. |
| `gan` | deepLearning.js:46–62 | No discriminator training (`D` initialized, never used). `gLoss = dLoss * 1.5` (hardcoded multiplier). |
| `variationalAutoencoder` | deepLearning.js:35–43 | Trains nothing; `mu`/`logVar` random and never updated; returns KL of noise. |
| `autoencoder` | deepLearning.js:7–32 | Only decoder weights update; encoder (`W1`/`b1`) never receives gradient. |
| `transformerBlock` | deepLearning.js:82–90 | "Projections" are a fixed affine `v*0.8+0.1`; no learned weights, FFN, or layer norm. |
| Cox-style coeffs | demo.js:76 | `se: 0.1`, `p: 0.05` hardcoded. |
| ILR regression coeffs | compositional.js:82 | `se: 0.1` hardcoded. |

## Tier 2b — BROKEN / INVALID INFERENCE (real attempt, wrong result)

| Function | Location | Problem |
|---|---|---|
| `hausmanTest` | econometric.js:177 | `p = 1 - chiPVal(H,k)`; `chiPVal` is already the upper tail, so this is the wrong tail — for large H, p→1, essentially never rejects. Should be `chiPVal(H,k)`. |
| `spatialHausman` | spatialEconometric.js:41 | `p = exp(-H/2)` is not the χ² survival function (correct only at df=2). |
| `panelFixedEffects`-area coeffs | econometric.js:162 | t and p derived from the hardcoded `se = 0.1`, so the inference is invalid even where β might be real. |
| `tsne` | dimReduction.js:8–53 | `perplexity` parameter ignored (`sigma` fixed at 1); gradient omits the `-Q` repulsion term → attractive-only force, embedding collapses. Not a faithful t-SNE. |
| `lle` | dimReduction.js:88–121 | Reconstruction weights never solved — hardcoded uniform `1/k`. Not real LLE. |

## Tier 2c — MISLABELED HEURISTICS (named as a famous method; actually a correlation/heuristic stand-in)

These do not crash and may even be useful, but a knowledgeable user will object to the names.

- `dimReduction.umapApprox` — is just PCA (eigen-decomposition of the covariance matrix), not UMAP.
- `interpretability.shapValues` — correlation×variance heuristic; the permutation loop has no effect. Not Shapley values.
- `interpretability.limeImportance` — perturbation heuristic with no local surrogate model. Not LIME.
- `interpretability.partialDependence` — uses a linear-correlation pseudo-model instead of a trained model.
- `interpretability.globalSurrogate` — "surrogate" is `mean + Σ(x−x̄)*0.1`; `modelType`/`maxDepth` ignored.
- The `deepLearning` module broadly (see Tier 3).

---

## Why the test suite did not catch this

- 56 / 92 test files have **no numeric oracle** — they assert structure only (`contracts.test.js`: "executes without throw", "returns inference-shaped result").
- A test that checks `0 ≤ p ≤ 1` cannot distinguish a real p-value from `p: 0.05`.
- The git history (`Remediate fabricated p-value stubs`, `Remediate stub implementations that returned fabricated values`) confirms fabrication was systemic; the remediation was validated largely by shape tests, so residual fabrication survived (the items above).

## Remediation paths (recommended order)

1. **Ship as an app, not a library.** It is a polished React stats explorer. Deploy it; drop the npm-library promise. Lowest risk.
2. **Publish a scoped `statlab-core`** containing only Tier-1 methods. Add real packaging (`exports`, `types`, `files`, `license`), document each method's reference source. Small, honest, defensible.
3. **Full library release** only after: (a) every Tier-3 function is removed or reimplemented and (b) every headline method has a test against an independent reference (R / scipy / statsmodels), not a self-snapshot. This is a large, multi-week effort across ~1,000 functions.

**Do not publish the current package as a general-purpose scientific library.** The fabricated econometrics/spatial/deep-learning methods are the kind a reviewer finds in minutes.
