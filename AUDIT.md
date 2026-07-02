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
> found already correct. Not exhaustive — bayesian.js, timeseries.js (beyond univariate), clustering.js, and
> most of the "signature-scanned only" modules from the original audit still lack independent oracles; that
> remains future work.

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
