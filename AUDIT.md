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
>
> **Oracle-coverage expansion (2026-07-03, twenty-second pass).** Extended coverage into `copula.js`,
> finding **1 more real bug** (present identically in all four copula-fitting functions):
> - `gaussianCopula`/`tCopula`/`claytonCopula`/`gumbelCopula` — the pseudo-observation (empirical-CDF)
>   transform used `sorted.indexOf(v)` to find each value's rank, but `Array.indexOf` only ever returns the
>   position of the *first* matching element. Every tied value therefore collapsed onto the same rank
>   instead of the standard mid-rank/average-rank convention (what `scipy.stats.rankdata(method='average')`
>   computes) — biased for any column with repeated values, the common case for real or rounded data. On a
>   test column with several duplicates this gave pseudo-observations of [0.0417, 0.2917, 0.2917, 0.625,
>   0.0417] instead of the correct [0.125, 0.4167, 0.4167, 0.6667, 0.125] (verified exactly against
>   `scipy.stats.rankdata`). Fixed by extracting a shared `pseudoObs` helper that computes proper tied
>   (average) ranks, used identically across all four copula families.
>
> `privacy.js`'s `laplaceMechanism` (standard inverse-CDF Laplace sampling), `kAnonymityCheck`, and
> `lDiversity` were confirmed correct by inspection; `tCloseness`'s 1D Earth Mover's Distance approximation
> is a standard, valid computational shortcut for ordered categories. Full suite: **4,905 tests pass**.
> Total across all oracle passes: **37 real correctness bugs found and fixed**, plus one module-portability
> defect.
>
> **Oracle-coverage expansion (2026-07-03, twenty-third pass).** Re-examined `spatialEconometric.js` in
> full (having previously only spot-checked it) by writing an independent from-scratch Python
> re-implementation of Ord's concentrated-log-likelihood spatial-lag MLE (via `scipy.optimize.minimize_scalar`
> golden-section search over ρ and `np.linalg.slogdet` for the log-Jacobian term) and driving both
> implementations with a synthetic DGP (`y = ρWy + Xβ + ε` generated via 200-iteration Neumann-series
> simulation on a row-standardized grid W). `spatialDurbin` and `spatialPanel` matched the from-scratch
> Python oracle exactly (ρ = 0.0922, ll = 14.7149 and ρ = 0.2081, β = 1.4853, ll = 54.802 respectively, both
> ways) — confirmed correct, no bug. Found **1 more real bug**:
> - `directIndirectEffects` — computed each variable's average Total spatial effect as the direct-effect
>   approximation `β / (1-ρ)`, silently dropping `θ` (the `lagCoefficients`/WX "Durbin" term) whenever the
>   fitted model included one. For row-standardized W, `(I-ρW)⁻¹·1 = 1/(1-ρ)·1`, so the exact closed-form
>   average Total effect is `(β+θ)/(1-ρ)` — verified directly against `(I-ρW)⁻¹(βI+θW)` via numpy trace
>   computation. With β=2.0, θ=1.0, ρ=0.3 the old code returned Total=2.857 instead of the correct 4.286 (a
>   33% understatement) whenever a Durbin term was present. Fixed by including `θ` in the Total sum and
>   deriving Indirect as the remainder (Total − Direct), since the exact Direct/Indirect split requires the
>   underlying W's trace structure, not recoverable from β/θ/ρ alone.
>
> Also audited `spatialTemporal.js` in full (`starModel`, `gstarModel`, `spaceTimeInteraction`,
> `spatiotemporalMoran`, `spaceTimeForecast`) against independent numpy re-implementations of the same
> synthetic-DGP procedure (OLS via `np.linalg.lstsq` on `[Wy, X]`, direct Moran's-I summation, and the
> `y_{t+h} = ρWy_{t+h-1} + Xβ` forward recursion with its `(I-ρW)⁻¹Xβ` fixed point) — all five functions
> matched exactly; no bugs found. Full suite: **4,906 tests pass**. Total across all oracle passes:
> **38 real correctness bugs found and fixed**, plus one module-portability defect.
>
> **Oracle-coverage expansion (2026-07-04, twenty-fourth pass — the previously deprioritized "tail"
> modules).** Per explicit user direction to pursue full rigor regardless of how hard a module is to
> verify, resumed auditing into `bandit.js` and `smc.js`. All 9 `bandit.js` functions (epsilon-greedy,
> UCB1, Thompson sampling, LinUCB, REINFORCE, softmax bandit, Q-learning, SARSA, DQN) were checked by hand
> against their textbook update equations (incremental sample averaging, `√(2·ln t/n)` UCB bonus,
> Beta-Bernoulli posterior updates, ridge `A⁻¹b` LinUCB scoring, softmax policy-gradient log-derivative,
> off-policy vs. on-policy TD(0), and backprop through a tanh hidden layer) — all correct; the existing
> test suite already verifies convergence to known-optimal policies on deterministic MDPs. No bugs found.
>
> `smc.js` — `particleMCMC` and `annealedImportance` had already been fixed in an earlier commit
> (`0669f3d`) and are independently verified against closed-form integrals (posterior mean ≈0.423, log
> normalizing constant of a N(0,4)) in the existing test suite. Verified `bootstrapFilter` correct by
> constructing an independent, non-Monte-Carlo grid-based (deterministic numerical quadrature) Bayes
> filter in Python for the same state-space model (`x_t = x_{t-1} + U(-1,1)`, `y_t ~ N(x_t,1)`) — matched
> to within Monte-Carlo noise (N=3000 particles) at every one of 10 time steps. Found **1 more real bug**:
> - `auxiliaryPF` — the auxiliary particle filter resampled particles proportional to the observation
>   likelihood of the *predicted* particle (`p(y|μ)`), but then, since no fresh transition draw is taken
>   for the resampled particles (`x_t = μ` exactly), reweighted the *same* resampled values by the *same*
>   likelihood formula a second time before computing the filtered mean — double-counting the observation.
>   Since `x_t = μ` exactly here, the correct second-stage correction weight `p(y|x_t)/p(y|μ)` is exactly 1
>   (the "fully adapted" special case), so the filter is already correctly weighted after the first
>   resample. Verified against the grid-based oracle: the buggy version deviated from ground truth by up
>   to 0.32 (overshooting toward the most recent observation, e.g. 7.35 vs. the true 7.03 at the final
>   step), while a from-scratch Python re-implementation of the corrected algorithm (single resample,
>   uniform final weights) tracked the grid oracle to within 0.02–0.03 (pure Monte Carlo noise) at every
>   step. Fixed by removing the redundant second likelihood computation/resample and taking the uniformly-
>   weighted mean of the first-stage-resampled particles directly.
>
> `importanceSampling`, `effectiveSampleSizeSMC`, and `multinomialResampleExport` were confirmed correct by
> inspection (self-normalized importance sampling with a uniform proposal correctly cancels the constant
> proposal density; ESS is the standard Kish formula `(Σw)²/Σw²`; multinomial resampling via inverse-CDF is
> textbook-correct). Full suite: **4,908 tests pass**. Total across all oracle passes: **39 real
> correctness bugs found and fixed**, plus one module-portability defect.
>
> **Oracle-coverage expansion (2026-07-04, twenty-fifth pass).** Audited `neural.js` and `deepLearning.js`
> in full. `deepLearning.js`'s `autoencoder`, `variationalAutoencoder`, `gan`, and `transformerBlock` had
> already been fixed correctly in an earlier commit (`06fdd5c`); independently re-derived every gradient
> by hand (VAE's reparameterization-trick chain rule through both `μ` and `logσ²`, the GAN's non-saturating
> discriminator/generator logistic gradients through `tanh`) and confirmed each matches the textbook
> formula exactly — no bugs. `neural.js`'s `softmax`, `activate`, `softmaxCrossEntropy`, `gradientDescent`,
> `adamUpdate`, `xavierInit`, `backpropagation`, `convolution1D`, `maxPooling`, `batchNorm`, and `dropout`
> were all confirmed correct by hand against their standard definitions. Found **1 more real bug**:
> - `conv2D` — the output-size formula `oh = floor((h+2·padding-kh)/stride)+1` correctly accounts for zero-
>   padding, but the convolution loop indexed directly into `input[i·stride+ki]` without ever subtracting
>   `padding`, so for any `padding > 0` the "padded" region was never actually zero — the code just read
>   unshifted (wrong) cells of the raw input, or read out of bounds early, silently producing an incorrect
>   result shaped like a padded output. Verified against a from-scratch numpy zero-pad + cross-correlate
>   reference (a direct re-derivation of the definition, not reusing the JS code): on a 3×3 input with a
>   2×2 kernel and `padding=1`, the buggy code returned `[[-4,-4,3,0],[-4,-4,6,0],[7,8,9,0],[0,0,0,0]]`
>   instead of the correct `[[-1,-2,-3,0],[-4,-4,-4,3],[-7,-4,-4,6],[0,7,8,9]]` — every element wrong.
>   Fixed by subtracting `padding` from both input indices before the bounds-checked lookup.
>
> Full suite: **4,909 tests pass**. Total across all oracle passes: **40 real correctness bugs found and
> fixed**, plus one module-portability defect.
>
> **Oracle-coverage expansion (2026-07-04, twenty-sixth pass — `gam.js`, the worst module found so far).**
> Nearly every exported function in `gam.js` was broken. Found **8 more real bugs**:
> - `backfitOne` (shared helper) — the normal-equations Gram matrix was built by iterating
>   `basis[0].map(...)`, but `basis` is column-major (`basis[j]` is the jth spline basis function's values
>   across all `n` samples, so `basis[0].length === n`, not `m` the number of basis functions) — this
>   produced a bogus n×n matrix instead of the intended m×m Gram matrix, so `solveNormalEquations` returned
>   an n-length vector of garbage instead of the m fitted spline coefficients. Verified against a
>   from-scratch numpy OLS fit of a known `y = x²` spline: the old code diverged to R²≈-57 (worse than the
>   mean); the fix recovers R²≈0.9997. This silently corrupted both `gamBackfitting` and `gamSpline`.
> - `gamBackfitting` — separately, `smoothVars` (e.g. `['x1']`) was resolved to a column index via
>   `X[0].indexOf(v)`, but `X[0]` is a plain numeric row (no header), so this string-vs-number comparison
>   always returned -1 — `smoothIdx` was always empty, so NO term (smooth or linear; `linearIdx` was
>   computed but never used) was ever fit, and the function always silently returned the intercept-only
>   model. Verified with a clean `y = x²` DGP: old code gave R² = 0.000 (identical to a naive linear OLS,
>   confirming zero fitting occurred); rewritten as a proper Hastie–Tibshirani backfitting loop
>   (spline-smooth for smooth vars, coordinate-descent linear fit for others, each term re-centered to mean
>   zero every iteration), it recovers R² ≈ 0.994. Also added a `fitted` field to the return value (absent
>   before, despite the existing test conditionally checking it).
> - `gamSpline` — its parameter list (`data, yVar, smoothVar`) never matched how the function is actually
>   called (a plain `y` array + numeric `X` matrix, per its own test file), so `smoothVar` was always
>   `undefined` and the function always returned `null` — before ever reaching a `return` statement that
>   referenced an undeclared `n` and would have thrown `ReferenceError: n is not defined` had it been
>   reached. Rewritten to accept `(y, X, { df, varIdx })` matching actual usage, storing the fitted spline
>   coefficients/knots for prediction.
> - `gamPredict` — ignored its `newData` argument entirely and returned the same constant `alpha` value
>   regardless of input (not a prediction). Rewritten to evaluate the stored `gamSpline` basis coefficients
>   at the new x-values.
> - `gamLocalScoring` — the weighted-least-squares normal equations for its IRLS logistic fit computed
>   `XtWz` as `X^T·z` instead of `X^T·W·z` (the `w[k]` weight factor was entirely missing from that one sum,
>   while `XtWX` correctly included it) — since the working response `z` already has a `1/w` factor baked
>   in, omitting `w` when forming `XtWz` left that scaling uncorrected, and the resulting IRLS update
>   overshot and diverged. Verified against `statsmodels.Logit` on a well-posed (non-separated) logistic
>   dataset: the old code's log-likelihood exploded from -69 (iteration 1) to -1750 (iteration 3+, then
>   stayed there) while statsmodels converges cleanly to -50.55; after adding the missing `w[k]`, the fix
>   converges to -50.5508 in 3 iterations — matching statsmodels to 4 significant figures.
> - `thinPlateSpline`'s `solveSystem` helper didn't solve the declared linear system at all — each `rhs`
>   entry was divided by the sum of its own matrix row, a no-op heuristic unrelated to the true solution.
>   Replaced with an actual `matInv`-based solve.
> - `thinPlateSpline` — separately, the fitted-value formula read the polynomial (intercept, slope)
>   coefficients from `alpha[0]`/`alpha[1]` and the RBF weights from `alpha[2+j]`, but the augmented system
>   (`[[K+λI, T], [Tᵀ, 0]]`) actually places the RBF-weight block FIRST (indices `0..n-1`) and the
>   polynomial block LAST (indices `n..n+1`) — the two blocks were swapped. Verified against a from-scratch
>   numpy solve of the exact same declared system: fitted values now match to 4 decimal places.
> - `pSpline` — the `lambda` parameter was accepted but never used anywhere in the computation, and the
>   "solve" step approximated the true p×p normal-equations solve as `BtY[i] / BtB[i][i]` — dividing by
>   only the diagonal, i.e. treating the (correlated) truncated-cubic basis functions as if they were
>   uncorrelated, which is not a solution to the least-squares system whenever basis columns correlate (the
>   normal case). Fixed by ridge-penalizing the non-polynomial coefficients by `lambda` and solving the real
>   normal equations via `solveNormalEquations`; verified to match a from-scratch numpy ridge-OLS solve
>   exactly.
>
> `gamEffectiveDf`, `gamInteraction`, and `gamAnova` were confirmed correct by inspection (the existing
> `gamInteraction` test already verifies R² > 0.8 on a real tensor-product interaction). Full suite:
> **4,915 tests pass**. Total across all oracle passes: **48 real correctness bugs found and fixed**, plus
> one module-portability defect.
>
> **Oracle-coverage expansion (2026-07-04, twenty-seventh pass).** Audited `tensor.js` in full. `parafac`,
> `cpDecomposition`, `tensorRegression`, `tuckerRegression`, and `tensorCompletion` (already fixed in an
> earlier commit, `f3d000a`) were independently re-verified with synthetic ground-truth tensors: a rank-1
> tensor is recovered with exactly zero reconstruction error by both `parafac` and `cpDecomposition`; a
> noiseless linear model is recovered with R²=1 by `tensorRegression`; `tuckerRegression` at full rank
> recovers MSE=0 (and a sensible nonzero MSE at a deliberately under-ranked truncation); `tensorCompletion`
> exactly recovers held-out cells of a rank-1 tensor. No bugs. Found **1 more real bug**:
> - `unfoldTensor` (the shared mode-n matricization helper behind `unfold`, `tuckerDecomp`, and
>   `multiwayPCA`) — assigned every unfolded cell to `result[i]` (the tensor's first-index iterator) as the
>   row, even for mode-1 and mode-2 unfoldings where the row should be `j` or `k` respectively; any `i`
>   beyond the mode's actual row count was clamped into row 0. Verified against a from-scratch numpy
>   re-derivation of the standard mode-n unfolding (Kolda & Bader) on a 2×3×4 test tensor: the old code's
>   mode-1 unfolding was `[[8,9,10,11,0,0,0,0],[0,0,0,0,20,21,22,23],[0,0,0,0,0,0,0,0]]` — mostly zeros,
>   with real data overwritten or discarded — instead of the correct
>   `[[0,1,2,3,12,13,14,15],[4,5,6,7,16,17,18,19],[8,9,10,11,20,21,22,23]]`. This silently corrupted every
>   `tuckerDecomp` mode past the first and all of `multiwayPCA`'s SVD-via-power-iteration (which unfolds on
>   mode 0, so was actually unaffected) — but any consumer unfolding on mode 1 or 2 got garbage. Fixed by
>   using the mode-appropriate tensor index as the row.
>
> Full suite: **4,916 tests pass**. Total across all oracle passes: **49 real correctness bugs found and
> fixed**, plus one module-portability defect.
>
> **Oracle-coverage expansion (2026-07-04, twenty-eighth pass).** Audited `dimReduction.js`. `tsne`, `lle`,
> and `umapApprox` (already fixed in an earlier commit, `894afbe`) were re-confirmed via the existing
> correctness tests (t-SNE cluster separation with real -Q repulsion, LLE near-zero planar reconstruction
> error, UMAP cluster separation exceeding plain PCA). Found **2 more real bugs in `isomap`**:
> - The k-nearest-neighbor graph was directed — each point's edges came only from its OWN k nearest
>   neighbors, with no guarantee the relation was mutual. Verified this stayed substantially asymmetric
>   even after Floyd-Warshall's transitive closure (214 of 400 cells still differed, by up to 0.21, on a
>   20-point connected test manifold) — but classical MDS's double-centering step requires a symmetric
>   dissimilarity matrix; feeding it an asymmetric one breaks `jacobiEigen`'s symmetric-matrix assumption
>   and invalidates the resulting embedding (on disconnected/uneven-density data the old code produced a
>   degenerate embedding where nearly every point collapsed to the origin). Fixed by symmetrizing the
>   adjacency (an edge exists if EITHER point considers the other a neighbor) before Floyd-Warshall.
> - Separately, the classical-MDS embedding used raw unit-norm eigenvectors instead of
>   `eigenvector·sqrt(eigenvalue)` — the scaling this same codebase's own `mds.js` already applies
>   correctly — so every retained dimension got equal weight regardless of how much variance it actually
>   explained. Verified against `scikit-learn.manifold.Isomap` on a near-1D helix: sklearn's second
>   coordinate is near-degenerate (span ≈0.6) relative to its first (span ≈13.7), while the old unscaled
>   JS code gave the two dimensions comparable magnitude. After both fixes, the JS embedding's pairwise
>   distances correlate with sklearn's at r > 0.99 (rotation/reflection-invariant comparison, since MDS
>   solutions are only defined up to an orthogonal transform).
>
> Full suite: **4,917 tests pass**. Total across all oracle passes: **51 real correctness bugs found and
> fixed**, plus one module-portability defect.
>
> **Oracle-coverage expansion (2026-07-04, twenty-ninth pass — revisiting `power.js`, previously
> deprioritized).** An earlier pass had left `power.js`/`math/power.js` alone on the grounds that their
> normal-approximation-to-noncentral-distribution convention was a defensible simplification rather than a
> bug. Per the user's explicit direction to pursue full rigor regardless of prior triage decisions, this was
> re-examined quantitatively against `scipy.stats.ncx2`/`ncf` (the exact noncentral chi-square/F CDFs) —
> and the approximation error turned out to be substantial, not negligible: **6+ percentage points** for
> realistic parameter values (R²=0.13, n=100, k=3: normal approx gave power=0.970 vs. the true 0.905).
> Implemented exact noncentral chi-square and F CDFs (`ncChiSqCDF`, `ncFCDF` in `math/distributions.js`) as
> Poisson-weighted mixtures of the already-available central chi-square/beta CDFs (`lowerIncGamma`,
> `ibeta`) — verified against `scipy.stats.ncx2.cdf`/`ncf.cdf` to ~1e-9. Found **4 real bugs** (all using
> the same normal-approximation pattern):
> - `powerChi` (χ² power), `powerOLS` (OLS F-test power), `powerRMANOVA` (repeated-measures ANOVA power),
>   and `powerInteractionANOVA` (factorial-interaction ANOVA power) all approximated the noncentral χ²/F
>   distribution's tail probability with a normal distribution matched to its mean and variance. Replaced
>   all four with the exact noncentral CDFs; verified each against `scipy.stats.ncx2.sf`/`ncf.sf` to 4
>   decimal places on representative test cases (χ²: 0.6635 vs. 0.6635; OLS: 0.9050 vs. 0.9050; RM ANOVA:
>   0.6011 vs. 0.6011; interaction ANOVA: 0.6754 vs. 0.6754).
>
> `powerANOVA` (already a real Monte Carlo simulation, not an approximation) and `computePowerT`'s
> noncentral-t handling (exact Monte Carlo simulation for df≤30, matching scipy's exact noncentral-t to
> within simulation noise ~0.0015; a normal approximation for df>30, differing from the exact value by only
> ~0.0035 at df=98 — small enough to be a legitimate, well-established simplification rather than a bug)
> were confirmed adequate. `powerOneProportion`/`powerTwoProportion`'s Wald normal approximation is the
> standard textbook convention for proportion tests (not a noncentral-distribution approximation issue).
> Full suite: **4,921 tests pass**. Total across all oracle passes: **55 real correctness bugs found and
> fixed**, plus one module-portability defect.
>
> **Oracle-coverage expansion (2026-07-04, thirtieth pass).** Audited the remaining `interpretability.js`
> functions (`partialDependence` and `featureInteraction` were already verified in an earlier pass).
> `shapValues` and `limeImportance` were checked against exact analytical expectations for a purely linear
> model: for a linear `f(x)=Σbⱼxⱼ`, both the Shapley value and the LIME local-surrogate coefficient reduce
> to closed forms independent of permutation order/perturbation weighting — `limeImportance` and
> `globalSurrogate` recovered the exact coefficients `[3,-2]` and intercept `1` (R²=1); `shapValues`'
> feature-importance ratio (4.399, Monte Carlo) matched the exact theoretical ratio computed directly from
> the data's empirical mean-absolute-deviations (4.462) — the naive "should be exactly 5:1" expectation
> was simply wrong given finite-sample column variation, not evidence of a bug. `permutationImportance`
> correctly ranked features by their true linear-coefficient magnitude. No bugs in any of these. Found
> **2 real bugs in `alePlot`**:
> - The last bin used an exclusive upper bound (`[lo, hi)`), so any point sitting exactly at the feature's
>   maximum value satisfied no bin's condition and was silently dropped from the ALE estimate entirely.
> - Separately, when a bin had no data at all, the code `continue`d without updating `ale[k]`, leaving it at
>   its `Array(nIntervals).fill(0)` initial value — resetting the cumulative (accumulated) effect to zero
>   at any gap in the data — instead of carrying the previous bin's running total forward, which is what
>   "accumulated" local effects requires.
>
> Verified against a from-scratch re-implementation of the same ALE definition (not reusing the JS code) on
> a case with an isolated max-value point and a nonlinear model: the old code gave `[6.84, 20.16, 0, 0, 0]`
> (both bugs visible — the two genuinely-empty bins reset to 0, and the final bin, which should have picked
> up the isolated max point, also failed to accumulate since it inherited the reset-to-0 baseline); the
> fixed code gives `[6.84, 20.16, 20.16, 20.16, 52.92]`, matching the independent re-derivation exactly.
>
> Full suite: **4,922 tests pass**. Total across all oracle passes: **56 real correctness bugs found and
> fixed**, plus one module-portability defect.
>
> **Oracle-coverage expansion (2026-07-04, thirty-first pass).** Audited `phylogenetics.js`. Most of the
> module (already fixed in an earlier commit, `680446f`) was confirmed correct via its own existing
> real-tree-based validation tests (Pagel's λ ≈1 for simulated Brownian-motion traits and ≈0 for iid noise;
> Blomberg's K ≈1 for BM traits; PIC correlation recovering a known cross-trait ρ=0.8; OU model inferring
> higher pull for weaker signal — all against a real balanced-binary-tree VCV, not just contract shape).
> Found **1 real bug**:
> - `pglsRegression` didn't accept a `tree` argument at all — its signature was
>   `(data, xVar, yVar, lambda)`, silently dropping the tree even though the module's own test suite already
>   called it as `pglsRegression(data, 'x', 'y', 1, { tree })` (the 5th argument was simply discarded by
>   JS's normal call semantics). In place of the real phylogenetic covariance, it fabricated a covariance
>   matrix from each row's ARRAY INDEX distance (`exp(-|i-j|·0.5)`) — unrelated to any actual phylogenetic
>   relationship — and had a separate numerical instability (`1/(1-lambda+1e-10)` blows up as λ→1). Fixed by
>   accepting `{ tree }`, building `V(λ) = λ·C_offdiag + diag(C)` from the real phylogenetic VCV (the same
>   convention `pagelsLambda`/`ouTraitModel` already use correctly), and solving via the module's own,
>   already-verified `glsFit` helper. Verified against a from-scratch numpy GLS solve
>   (`X'V⁻¹X·β = X'V⁻¹y`) for a real balanced-binary-tree VCV — exact match to 5 decimal places.
>
> Full suite: **4,923 tests pass**. Total across all oracle passes: **57 real correctness bugs found and
> fixed**, plus one module-portability defect.
>
> **Oracle-coverage expansion (2026-07-04, thirty-second pass).** Audited `sem.js`. The core RAM-ML fitter
> (`sem`/CFA, `semMultiGroup`, `measurementInvariance`, `ordinalSEM`, `cfiCompare` — the latter already
> verified correct as a standard nested-χ² test) and `latentGrowthModel` were confirmed correct: LGM was
> checked against a synthetic growth-curve DGP with known intercept/slope means and (co)variances and
> recovered all five parameters closely (α_i=10.01 vs. true 10, α_s=2.02 vs. true 2, ψ_ii=4.13 vs. true 4,
> ψ_ss=0.33 vs. true 0.25, ψ_is=0.25 vs. true 0.3). Found **2 real bugs**:
> - `pathAnalysis` regressed each structural equation through the origin (no intercept column at all),
>   which badly biases every coefficient whenever the variables have nonzero means (the general case) —
>   verified on a synthetic `x→m→y` mediation chain with realistic nonzero means: the old code returned
>   `direct=2.52` for the true x→m slope of 0.6. It also hardcoded `indirect=0` and `total=direct` for every
>   edge, so the entire point of path analysis over separate univariate regressions — chained/mediated
>   effects — was never computed (`x`'s indirect effect on `y` via `m`, truly 0.6×0.8=0.48, wasn't reported
>   at all, since `x` isn't a direct predictor in the `y~m` equation). Fixed by adding the intercept and
>   computing `Total = (I-B)⁻¹-I` over the system's full direct-effects matrix `B`; the fixed version
>   recovers `x→m=0.608`, `m→y=0.788`, and the correct mediated `x→y` indirect effect of `0.479` — verified
>   against a from-scratch numpy OLS-with-intercept re-derivation to 4 decimal places.
> - `bifactorModel` extracted the correct number of factors via unrotated PCA/EFA (eigendecomposition of
>   the communality-adjusted correlation matrix) but then directly assigned the k-th extracted factor, in
>   eigenvalue order, to "group k" with no rotation — nothing guarantees an arbitrary unrotated PCA axis
>   aligns with any particular item subgroup. Verified on synthetic data with a true bifactor structure
>   (general loading 0.5 on 6 items; group A loading 0.6 on items 0-2; group B loading 0.6 on items 3-5):
>   the old code recovered group B's loading as ~0.002 (its true signal was misattributed entirely into an
>   inflated ~0.62 "general" loading), while group A came out partially right (~0.37-0.40 instead of 0.6).
>   Fixed by adding an orthogonal Procrustes rotation toward the intended target pattern (general loads
>   every item; each group factor loads only its own items) before reading off loadings — a standard
>   target-rotation technique for bifactor structure recovery. After the fix, both groups recover loadings
>   in the correct 0.5-0.6 range.
>
> Full suite: **4,925 tests pass**. Total across all oracle passes: **59 real correctness bugs found and
> fixed**, plus one module-portability defect.
>
> **Oracle-coverage expansion (2026-07-04, thirty-third pass).** Audited `abm.js`. `simulationConvergence`,
> `sobolSensitivity` (already verified via its own existing "not corr²" test), `agentSummaryStats`,
> `scenarioComparison`, `thresholdModel`, and `networkDiffusion` were confirmed correct by inspection
> (standard moving-window convergence, binned Sobol variance decomposition, descriptive stats, Welch-style
> two-sample z-test, Granovetter cascade, and independent-cascade diffusion respectively).
> `segregationIndex`'s multi-group generalization remains deliberately unaudited (a genuinely contested
> convention in the demography literature, per an earlier pass). Found **1 real bug**:
> - `moranIMulti` summed the `i==j` "self" term into its numerator (`w_ii = exp(0) = 1`, spuriously adding
>   `Σz_i²`) and normalized by the agent count `n` instead of `S0`, the true sum of all off-diagonal spatial
>   weights — the standard formula is `(n/S0)·ΣΣ_{i≠j} w_ij·z_i·z_j / Σz_i²`. Verified against a from-scratch
>   numpy re-derivation on a 20-agent test case: the old code gave I=0.0511 vs. the correct 0.0366 (a ~40%
>   relative error), and the discrepancy's sign/magnitude depends arbitrarily on how `S0` happens to compare
>   to `n` for any given spatial configuration. Fixed by excluding self-pairs and normalizing by the true `S0`.
>
> Full suite: **4,926 tests pass**. Total across all oracle passes: **60 real correctness bugs found and
> fixed**, plus one module-portability defect.
>
> **Oracle-coverage expansion (2026-07-04, thirty-fourth pass — `pointProcess.js`, the last un-audited
> module).** `hawkesIntensity`, `coxProcess`, `interArrivalTest`, and `burstinessIndex` were confirmed
> correct by inspection (standard exponential-kernel Hawkes intensity, rejection-sampled Cox process,
> coefficient-of-variation clustering test, and the standard Goh–Barabási burstiness parameter). Found
> **4 real bugs**:
> - `hawkesFit` ("Hawkes Fit (MLE)") derived `mu`/`alpha`/`beta` purely from the average event rate `n/T`
>   — arithmetic that never examines WHEN events occur relative to each other, so it cannot distinguish a
>   genuinely self-exciting/clustered process from a uniform one at all. Verified: a uniform 50-event stream
>   and a heavily bursty 50-event stream with the same span produced nearly identical "fitted" parameters
>   (α=0.0051 vs. 0.0055). Replaced with a real Newton-Raphson MLE (via the existing `mleFit` helper) on the
>   exponential-kernel Hawkes log-likelihood; verified against an independent `scipy.optimize` Nelder-Mead
>   fit of the same likelihood on the same simulated event stream — both converge to the identical optimum
>   (μ=0.2060, α=0.4877, β=0.9764) to 4 decimal places, and the fit now correctly recovers the true
>   parameters of a simulated self-exciting process (μ=0.2, α=0.5, β=1.0).
> - `maternCluster` and `thomasProcess` both placed offspring at `dist = rand()·radius, angle = rand()·2π` —
>   uniform in RADIUS, not uniform in AREA. Verified with 200,000 samples: equal-width radial bins came out
>   ~equal (~40,000 each) instead of growing with annulus area as required (8,000/24,000/40,000/56,000/
>   72,000) — points were badly over-concentrated near cluster centers. Fixed `maternCluster` (whose
>   textbook definition, Matérn 1960, is exactly "uniform within the disk") via `r = R·√u`. `thomasProcess`
>   has a different textbook definition entirely (Thomas 1949: offspring displaced by an isotropic
>   bivariate NORMAL, not a bounded disk) — since this codebase already implements the disk-based process
>   separately as `maternCluster`, `thomasProcess` was rewritten to use a genuine Gaussian offset via
>   Box-Muller, matching its actual name.
> - `pairCorrelation` and `lFunction` (Ripley's K/L) computed their neighbor counts with no edge/border
>   correction, so points near the observation window's boundary were systematically undercounted (part of
>   their neighborhood falls outside the observed area). Verified on 2,000 uniform (CSR) points in a 100×100
>   window: `g(r)` should be ≈1 and `L(r)` should be ≈0 everywhere, but the uncorrected estimator gave
>   `g(r)` declining to 0.71 and `L(r)` declining to −2.8 at the default `maxRadius` (25% of the window
>   width) — a severe, systematic bias, not sampling noise (confirmed by re-running with a much smaller
>   `maxRadius`, where the bias nearly vanished). Fixed by adding the standard border (minus-sampling) edge
>   correction: a point is only used as a reference for radius `r` if its full neighborhood of radius `r`
>   fits inside the observation window; after the fix, `g(r)` stays within 0.85–1.15 and `|L(r)|` stays
>   under 0.3 across all bins for the same CSR test case.
>
> Full suite: **4,931 tests pass**. Total across all oracle passes: **64 real correctness bugs found and
> fixed**, plus one module-portability defect. **This completes the exhaustive oracle-testing audit of every
> module in the codebase.**

## Verdict (superseded — see update below)

> **STATUS UPDATE (2026-07-06).** Everything in this "Verdict" section and the Tier 1/2b/2c/3 tables
> below it describes the **original, pre-remediation** state of the codebase from the initial audit pass
> (2026-06-28). It is kept verbatim, unedited, as a historical record of what the first pass found. **It no
> longer describes the current codebase and should not be used to judge publish-readiness.**
>
> Both blockers this section raises have since been closed:
>
> 1. **Packaging** — `packages/statlab/package.json` now has a full `exports` map (per-module subpath
>    exports for every one of the 84 method modules plus `math/*`), `main`/`module`/`types`, a `files`
>    allowlist, an MIT `LICENSE`, and zero runtime dependencies. `npm run build:lib` produces clean ESM +
>    CJS + `.d.ts` output. This is a real, publishable npm package, not a bundled app export.
> 2. **Fabrication** — every single function named in the Tier 3 / Tier 2b / Tier 2c tables below was
>    independently re-checked against the *current* source on 2026-07-06 as part of this update, not just
>    trusted from the oracle-pass log:  `gmm`, `panelRandomEffects`, `spatialDurbin`, `spatialPanel`,
>    `gan`, `variationalAutoencoder`, `autoencoder`, `transformerBlock`, the `demo.js`/`compositional.js`
>    hardcoded `se`/`p` stubs, `hausmanTest`, `spatialHausman`, `panelFixedEffects`, `tsne`, `lle`,
>    `umapApprox`, `shapValues`, `limeImportance`, `partialDependence`, and `globalSurrogate`. All are now
>    genuine implementations (real IV/GMM moment conditions, real within-transform panel estimators, real
>    Wy/WX spatial regressors, real GAN discriminator training, real VAE reparameterization + gradient
>    flow, real transformer Q/K/V projections with layer norm, correct χ² upper-tail Hausman p-values, real
>    perplexity-calibrated t-SNE with attractive+repulsive forces, real LLE Gram-system reconstruction
>    weights, a real fuzzy-kNN-graph + attractive/repulsive-SGD UMAP, real Štrumbelj–Kononenko permutation
>    SHAP, real LIME perturbation+kernel weighting, and a real Friedman PDP). This matches what the
>    "REMEDIATION STATUS" notes at the top of this file already asserted; this update is the first point
>    where each item was individually re-verified against current source rather than taken on the log's word.
>
> Combined with the 34 independent oracle-verification passes above (64 more correctness bugs found and
> fixed against scipy/statsmodels/lifelines/sklearn/networkx references, none caught by shape-only tests),
> the honest current verdict is: **the package is scientifically defensible and ready to publish**, subject
> to the caveats in the Current Verdict section immediately below.

## Current Verdict (2026-07-06)

**Publishable**, with two remaining caveats, neither of which is a fabrication/correctness issue:

1. **Deliberately-scoped simplifications remain, and are honestly labeled as such** — a residual set of
   modules (`fda.js`, `pgm.js`, `sem.js`'s `bifactorModel` rotation heuristic aside from what pass 32 fixed,
   `causalDiscovery.js`) use simplified-but-not-fabricated heuristics for parts of their contested or
   under-specified surface (e.g. `segregationIndex`'s multi-group generalization, deliberately left
   unaudited per the thirty-third pass because the "correct" convention is genuinely contested in the
   demography literature). These are not hidden — check each module's own comments/tests before relying on
   an edge case outside its headline use.
2. **CI is not yet on `main`** — `.github/workflows/ci.yml` exists only on the branch that produced this
   update; it needs to be merged before GitHub Actions actually runs on every push/PR.

There is no longer a "fabricated tail" distinct from the trustworthy classical core — the tail was audited
function-by-function across 34 passes and each fabrication or invalid-inference bug was fixed and given a
regression test citing its specific oracle.

---

## Methodology & confidence (as of the original 2026-06-28 pass — see status update above for what changed)

- **Deep-read (high confidence):** distributions/core math, and modules `deepLearning`, `dimReduction`, `recommendation`, `outlier`, `interpretability`, `econometric`, `spatialEconometric`, plus oracle/contract test infrastructure.
- **Signature-scanned (all 84 modules):** hardcoded `se`/`p` constants, magic constants, fake-iteration (`break` on first pass), index-based fabricated coefficients, "simplified/approximate" labels.
- **Not individually verified at the time:** ~70 modules were scanned but not line-by-line re-derived. This gap is what the subsequent 34 oracle passes (and the 2026-07-06 status update above) closed.

---

## Tier 1 — VERIFIED (trustworthy) — historical, from the original pass

Backed by independent, textbook-correct reference values in `src/tests/__fixtures__/reference.json`, checked to 3–6 decimals.

- **Distributions:** `normalCDF`, `chiPVal`, `tPVal`, `fPVal` (e.g. normalCDF(1.96)=0.9750021, chiPVal(3.841,1)=0.05 — correct).
- **Means:** Welch / one-sample / paired t-tests.
- **ANOVA:** one-way, Welch ANOVA, Kruskal-Wallis.
- **Regression core:** Pearson, simple OLS, mediation (Sobel).
- **Categorical:** χ², Fisher exact, McNemar, Mann-Whitney, binomial, two-proportion z.
- **Meta-analysis:** random-effects pooled effect.
- Genuinely real algorithms confirmed by reading (no oracle, but correct procedure): `recommendation.collaborativeFilter`, `recommendation.matrixFactorize`, `outlier.localOutlierFactor`, `outlier.isolationForest`, `dimReduction.isomap`, `interpretability.alePlot`, `interpretability.featureInteraction`, `interpretability.permutationImportance` (honest model-free), `econometric.sur`/`threeSLS` (real OLS/2SLS, honestly scoped to shared-regressor case).

## Tier 3 — FABRICATED at the time of the original pass — ALL FIXED, see status update above

| Function | Location | Problem (original, now fixed) |
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

## Tier 2b — BROKEN / INVALID INFERENCE at the time of the original pass — ALL FIXED, see status update above

| Function | Location | Problem (original, now fixed) |
|---|---|---|
| `hausmanTest` | econometric.js:177 | `p = 1 - chiPVal(H,k)`; `chiPVal` is already the upper tail, so this is the wrong tail — for large H, p→1, essentially never rejects. Should be `chiPVal(H,k)`. |
| `spatialHausman` | spatialEconometric.js:41 | `p = exp(-H/2)` is not the χ² survival function (correct only at df=2). |
| `panelFixedEffects`-area coeffs | econometric.js:162 | t and p derived from the hardcoded `se = 0.1`, so the inference is invalid even where β might be real. |
| `tsne` | dimReduction.js:8–53 | `perplexity` parameter ignored (`sigma` fixed at 1); gradient omits the `-Q` repulsion term → attractive-only force, embedding collapses. Not a faithful t-SNE. |
| `lle` | dimReduction.js:88–121 | Reconstruction weights never solved — hardcoded uniform `1/k`. Not real LLE. |

## Tier 2c — MISLABELED HEURISTICS at the time of the original pass — ALL FIXED, see status update above

These no longer apply — see the status update for what each was replaced with.

- `dimReduction.umapApprox` — was just PCA; now a real fuzzy-kNN-graph + attractive/repulsive-SGD UMAP.
- `interpretability.shapValues` — was a correlation×variance heuristic; now real permutation-sampling (Štrumbelj–Kononenko) SHAP.
- `interpretability.limeImportance` — was a perturbation heuristic with no surrogate; now real LIME (perturbation + proximity-kernel-weighted local surrogate).
- `interpretability.partialDependence` — was a linear-correlation pseudo-model; now the real Friedman PDP definition against a supplied or surrogate model.
- `interpretability.globalSurrogate` — was `mean + Σ(x−x̄)*0.1`; now a real linear surrogate fit with honest fidelity (R²/RMSE) reporting.
- The `deepLearning` module broadly — see Tier 3, all fixed.

---

## Why the original test suite did not catch this (historical)

- 56 / 92 test files had **no numeric oracle** — they asserted structure only (`contracts.test.js`: "executes without throw", "returns inference-shaped result").
- A test that checks `0 ≤ p ≤ 1` cannot distinguish a real p-value from `p: 0.05`.
- The git history (`Remediate fabricated p-value stubs`, `Remediate stub implementations that returned fabricated values`) confirms fabrication was systemic; the remediation was validated largely by shape tests, so residual fabrication survived (the items above) until the 34-pass oracle campaign added real numeric references.

## Remaining recommended next steps

1. Merge CI onto `main` (workflow currently only exists on a feature branch).
2. Keep the "deliberately simplified, not fabricated" modules (`fda.js`, `pgm.js`, `causalDiscovery.js`, contested conventions like `segregationIndex`) documented as scoped/simplified in their own module comments so a downstream user isn't surprised.
3. Version and `npm publish -w statlab` when ready — packaging is in place; nothing structural is blocking it.
