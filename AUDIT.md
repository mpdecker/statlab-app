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
