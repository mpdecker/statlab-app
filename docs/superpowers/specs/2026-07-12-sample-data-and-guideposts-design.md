# Sample Datasets for Psychometrics + Per-Test Dataset Recommendations — Design

**Date:** 2026-07-12
**Status:** Approved

## Problem

StatLab ships 9 built-in sample datasets, but none of them support the
Psychometrics category or the psychometric-flavored half of Multivariate
(EFA, Cronbach's α, McDonald's ω, Parallel Analysis, IRT 1PL/2PL, Scale
Scoring) — those tests need multi-item Likert or binary item-response data,
which no current dataset provides. Separately, a new user picking a test has
no indication of which of the 9+ sample datasets (if any) actually fits it —
they have to guess, load data, and see if the config panel accepts it.

## Goals

1. Add two new synthetic sample datasets purpose-built to fill the
   Psychometrics gap.
2. Add a per-test "recommended datasets" mapping, surfaced as clickable
   chips in the Calculation & Interface band, so picking a test also tells
   the user which sample dataset(s) fit it and lets them load one in a
   click.

## Non-goals

- No new datasets or recommendations for Network, Meta-Analysis & Causal,
  Survival Analysis, or Time Series — these need non-rectangular example
  data (graphs, effect-size tables, time-to-event data) delivered through
  their existing manual-entry inputs via a "load example" mechanism, which
  is a separate follow-up project.
- No recommendations for the calculator/simulation categories (Power
  Analysis, Bootstrap, Agent-Based Models, Multi-Armed Bandits, Privacy,
  Record Linkage, Sensitivity Analysis, Single-Case Designs, Recommendation,
  Risk-Adjusted Monitoring, Bayesian Modeling, Missing Data, Diagnostics,
  Robust Statistics, Equivalence & Bayes) — these already self-generate
  synthetic example data when run standalone and don't depend on the loaded
  dataset.
- No automatic selection of Group/Target variables when a recommendation is
  clicked — clicking loads the dataset (same as the Sample Datasets picker
  today) but the user still picks variables in the Config panel themselves.
  Building per-test-per-dataset variable presets is out of scope.
- No changes to `InferenceConfig`'s prop signature or internals.

## Architecture

### Two new synthetic datasets (`src/data/datasets.js`)

Both generated locally with the existing seeded `lcg`/`randn` PRNG helpers
(same style as `makeIris`/`makeDiamonds`) — no external fetch, consistent
with "no data leaves your machine."

- **`lifesat`** ("Life Satisfaction Survey") — 200 respondents × 12 Likert
  items (1–5) forming 3 clear 4-item subscales (`autonomy`, `competence`,
  `relatedness` — a recognizable framework), with the 4th item in each
  subscale (`auto4`, `comp4`, `rel4`) generated as the reverse of that
  subscale's latent trait (`6 - underlying_score`, then noised) to
  demonstrate reverse-coding in Scale Scoring. One categorical `cohort`
  column (3 levels: `A`/`B`/`C`) for grouped analyses (MANOVA, one-way
  ANOVA on subscale composites). `numeric`: the 12 item columns
  (`auto1..auto4`, `comp1..comp4`, `rel1..rel4`); `categorical`: `[cohort]`.
- **`vocabtest`** ("Vocabulary Test") — 300 respondents × 15 binary
  (correct/incorrect) items, generated from an actual 2-parameter logistic
  IRT model (`P(correct) = 1 / (1 + exp(-a_i * (θ_person - b_i)))`) with
  item difficulties `b_i` spread across a real range and discriminations
  `a_i` varying per item, so the data has genuine, recoverable IRT
  structure. One categorical `grade` column (4 levels:
  `9th`/`10th`/`11th`/`12th`) for optional grouped analyses. `numeric`: 15
  item columns (`q1..q15`, values 0/1); `categorical`: `[grade]`.

`DATASET_DEFAULTS` gets two new entries: `lifesat: { x: 'auto1', y: 'comp1',
color: 'cohort' }`, `vocabtest: { x: 'q1', y: 'q2', color: 'grade' }` (Quick
View needs *some* default axes; these aren't meant to be the primary way
users explore item data — the recommendation chips point them at the right
config controls instead).

### Recommendation mapping (`src/config/datasetRecommendations.js`, new file)

A single exported table `RECOMMENDED_DATASETS: Record<testId, string[]>`
(dataset keys, most-relevant first) plus a helper `getRecommendedDatasets(testId)`
returning `RECOMMENDED_DATASETS[testId] ?? []`. Covers the in-scope
categories only (Compare Means, ANOVA, Nonparametric, Correlation,
Regression, Categorical, Multivariate, Psychometrics, Multilevel Models,
Clustering) — full mapping below. Two tests (`mcnemar`, `kappa`) are
deliberately omitted: no current dataset has true paired-binary
before/after or two-rater categorical-agreement structure, and forcing a
bad fit would be misleading. Every other test in these 10 categories has at
least one entry.

<details>
<summary>Full mapping (59 of 61 in-scope tests)</summary>

- **Compare Means**: `t_welch`→[salaries, cps, iris], `t_one`→[iris, gapminder],
  `t_paired`→[sleep], `trimmed`→[diamonds, salaries], `z_known`→[iris, gapminder],
  `sign`→[sleep]
- **ANOVA**: `anova`→[iris, diamonds], `welch_anova`→[diamonds, iris],
  `twoway`→[salaries, schools], `ancova`→[salaries, cps], `rm_anova`→[sleep],
  `kruskal`→[iris, diamonds], `friedman`→[sleep], `cochranQ`→[vocabtest]
- **Nonparametric**: `mwu`→[salaries, cps, diamonds], `wilcoxon`→[sleep]
- **Correlation**: `pearson`→[gapminder, diamonds], `spearman`→[gapminder, diamonds],
  `kendall`→[gapminder, salaries], `partial`→[salaries, affairs],
  `pointbis`→[salaries, affairs]
- **Regression**: `ols_simple`→[diamonds, gapminder], `ols_multi`→[diamonds, salaries],
  `polynomial`→[diamonds, gapminder], `hierarchical`→[salaries, cps],
  `logistic`→[affairs], `ordinal`→[salaries, diamonds], `poisson`→[affairs],
  `negbinom`→[affairs], `mediation`→[salaries, affairs],
  `med_bootstrap`→[salaries, affairs], `moderation`→[salaries, cps]
- **Categorical**: `chisq`→[diamonds, cps], `chigof`→[diamonds],
  `fisher`→[cps, affairs], `binomial`→[affairs, vocabtest], `prop1`→[affairs, cps],
  `prop2`→[cps, affairs] (`mcnemar` omitted — see above)
- **Multivariate**: `pca`→[iris, diamonds], `efa`→[lifesat], `manova`→[iris, lifesat],
  `cancorr`→[diamonds, salaries], `lda`→[iris], `cronbach`→[lifesat],
  `splithalf`→[lifesat, vocabtest], `icc`→[lifesat, vocabtest] (`kappa` omitted — see above)
- **Psychometrics**: `omega`→[lifesat], `parallel`→[lifesat], `irt_1pl`→[vocabtest],
  `irt_2pl`→[vocabtest], `scale_score`→[lifesat]
- **Multilevel Models**: `hlm_ri`→[schools, mathachieve], `hlm_rs`→[mathachieve, schools],
  `icc_ml`→[schools, mathachieve]
- **Clustering**: `kmeans`→[iris, diamonds], `hclust`→[iris, diamonds],
  `lca`→[vocabtest, lifesat]

</details>

### UI: `DatasetRecommendations` component (new file, `src/components/DatasetRecommendations.jsx`)

Props: `{ activeTest, ds, data, onSelectDataset }`. Renders `null` if
`getRecommendedDatasets(activeTest)` is empty. Otherwise renders a small
labeled row ("Try this with:") of chip buttons, one per recommended dataset
key still present in `BUILTIN` (using each dataset's `label`), calling
`onSelectDataset(key)` on click. The currently-loaded dataset's chip (if
it's one of the recommended ones) is visually marked active (same accent
treatment used elsewhere), matching the existing chip styling conventions
(`DatasetPicker`'s row highlight, `VizRegion`'s mode chips).

Wired into `CalcBand` (`src/App.jsx`) as the first thing rendered in its
left column, above `InferenceConfig`. `CalcBand` gains one new prop,
`switchDs`, threaded from `App`'s existing `switchDs` function (already
used by `Header`/`DatasetPicker`) — passed to `DatasetRecommendations` as
`onSelectDataset`. `InferenceConfig` itself is untouched.

## Testing

- `src/data/datasets.test.js`: extend with tests for `makeLifeSat` (row
  count, column presence, Likert values in range 1–5, subscale structure)
  and `makeVocabTest` (row count, column presence, binary 0/1 values, and a
  sanity check that the generated data has real IRT structure: compute each
  item's observed pass rate — mean of its 0/1 column across all 300 rows —
  and confirm it's negatively correlated with that item's generated
  difficulty parameter `b_i` (easier items, lower `b`, should be passed more
  often), ruling out the data being unstructured random noise).
- `src/config/datasetRecommendations.test.js` (new, contract-style, mirrors
  `src/config/contracts.test.js`'s pattern): every key in
  `RECOMMENDED_DATASETS` is a real test id present in `TREE`; every dataset
  key referenced anywhere in the mapping exists in `BUILTIN`.
- `src/components/DatasetRecommendations.test.jsx` (new): renders `null`
  for a test with no mapping; renders the right chip labels for a mapped
  test; clicking a chip calls `onSelectDataset` with the right key; the
  active dataset's chip is visually distinguished.
- Manual verification in a running dev server: pick `t_welch` (chips show
  Salaries/CPS/Iris), click one, confirm the dataset switches; pick `efa`
  (chip shows Life Satisfaction Survey only), confirm it loads and EFA runs
  meaningfully on the 12 items; pick a test with no mapping (e.g. `pow_anova`)
  and confirm nothing renders in that slot.
