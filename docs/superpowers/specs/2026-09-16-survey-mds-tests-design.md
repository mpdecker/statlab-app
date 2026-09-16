# StatLab Survey Methodology + MDS Tests — Design

**Date:** 2026-09-16
**Status:** Verification complete (2026-09-16). All 7 tests manually verified
end-to-end in a production preview build: full `pnpm test` (738/738) and
`pnpm build` pass; all 4 survey tests and all 3 MDS tests are reachable via
Navigator search, compute correctly, and render results with no console
errors. Two real bugs were found and handled during verification:

1. **`sammonMapping` (in `@statlab/core@0.1.1` itself, not this webapp's
   code) numerically diverges to all-`NaN` output on some real datasets**
   (e.g. the bundled "Salaries" dataset, n=397) regardless of input
   scaling — confirmed in isolation against the package, not a webapp
   wiring bug. `classicalMDS`/`nonMetricMDS` are unaffected on the same
   data. Worked around defensively at the webapp layer: `QuickChart.jsx`
   now checks that an MDS result has at least one finite point before
   rendering `MDSPlot`, falling back to an explanatory hint ("MDS
   embedding did not converge for these variables — try different Scale
   items") instead of silently rendering a blank chart. The underlying
   package-level instability itself is out of this plan's scope (fixing
   an already-published npm dependency) and has been filed as a separate
   follow-up.
2. **Pre-existing, systemic bug found (not introduced by this plan):**
   switching datasets does not reset the app's generic per-test config
   state (`xVar`/`cat1`/`cat2`/`scaleVars`/etc. in `InferencePanel.jsx`),
   so a stale column name from the previously-loaded dataset can silently
   drive a computation on the new dataset, producing wrong results with
   no error shown. Reproduced with Taylor Linearization (this plan's own
   Strata/PSU config reuses `cat1`/`cat2`), but the same one-time
   `useState(list[0] || '')` initialization pattern is used by ~15
   generic state slots shared with several already-shipped tests (e.g.
   Cohen's κ, partial correlation) — out of this plan's scope to fix and
   filed as a separate follow-up.
**Phase:** 1 of 2 of the "bring the `@statlab/core` package to the webapp"
initiative (SEM — structural equation modeling — is a deliberately separate
follow-up: its `sem`/`pathAnalysis` functions take lavaan-style model-syntax
strings as input, not column pickers, and need a genuinely new UI paradigm
this phase doesn't touch).

## Problem

`@statlab/core@0.1.1` exports 84 method modules; the webapp's Navigator
wires in 32. 52 published, tested method modules are invisible in the UI.
Most are legitimately out of scope for a "social science edition" tool
(`bioinformatics`, `genetics`, `phylogenetics`, `pk`, `deepLearning`,
`tensor`, `nlp`...), but two domains are clearly on-brand and currently
100% missing:

- **`survey.js`** (survey methodology — weighting, complex-sample variance)
  — directly matches the app's stated audience ("researchers, instructors,
  and graduate students").
- **`mds.js`** (multidimensional scaling) — sits naturally next to the
  existing PCA/EFA/clustering suite in the MULTIVARIATE category.

## Goals

1. Add 4 survey-methodology tests and 3 MDS tests to the Navigator,
   following the app's existing "one TREE entry = one method, with its own
   config controls, result rendering, and method note" pattern exactly —
   confirmed by reading the codebase's own contributor doc (README.md
   "Adding a new test") and tracing a representative existing test
   (`partial` / partial correlation) through every touchpoint.
2. MDS results (2D point coordinates) get a real chart — a new `MDSPlot`
   component, following the same pattern as `ScreePlot`/`ForestPlot`
   (dedicated renderers for other computed, non-raw-column results).
3. No new build/runtime dependency — everything needed
   (`weightedMean`, `weightedVar`, `weightedCorrelation`, `designEffect`,
   `taylorLinearization`, `classicalMDS`, `sammonMapping`, `nonMetricMDS`)
   is already exported by the already-installed `@statlab/core@0.1.1`
   (confirmed via `grep -n "^export function" src/methods/{survey,mds}.js`
   against the package's own source).

## Non-goals

- SEM (`sem`, `pathAnalysis`, and the rest of `sem.js`) — separate
  follow-up, needs a model-syntax editor UI.
- The other 21 functions in `survey.js` not listed below — deliberately
  trimmed from an initial 7-test proposal to 4 after reading their actual
  signatures:
  - `rakeWeights`/`calibrationWeights`/`postStratification` need an
    external "target proportions per category" table as input — a
    materially bigger UI than a column picker (same complexity class as
    SEM's syntax editor), not a quick column-picker addition.
  - `effectiveSampleSize` is dropped as a separate entry: mathematically
    near-identical to `designEffect` (both compute `n_eff`/`deff` from the
    same weights, `designEffect`'s own return already includes `nEff`),
    so exposing both would be confusing near-duplicate UI, not two
    distinct tests.
  - `brrWeights`/`jackknifeReplicates`/`fayReplicates`/
    `multistageVariance`/`nonresponseAdjustment`/`designTotal` and the
    sampling-design tools (`ppsSampling`/`systematicSample`, which draw
    samples rather than analyze existing data — a different UI shape
    entirely) are left for a later wave if wanted.
- `sammonMappingDM`/`landmarkMDS` (the other 2 of `mds.js`'s 5 exports) —
  take a precomputed distance matrix directly rather than raw data +
  variable names, a different input shape from the other 3; niche/advanced
  use case, deferred.
- No change to Phase 1/2's work (crash fix, sizing, Navigator Core/More
  grouping, toolbar labels) or to the `@statlab/core` migration itself.

## Approach

### New tests and their exact function calls

All 4 survey functions and all 3 MDS functions are called with data
already available from the app's *existing* generic per-test state (no new
`useState` needed in `useInference` — confirmed by tracing `partial`
correlation's config, which reuses the same generic `xVar`/`yVar`/`zVar`
slots this design reuses too):

| TREE id | Label | Category | Call |
|---|---|---|---|
| `wmean` | Weighted Descriptives | SURVEY METHODOLOGY | `weightedMean(xyz.xs, xyz.zs)` + `weightedVar(xyz.xs, xyz.zs)`, merged into one result object |
| `wcorr` | Weighted Correlation | SURVEY METHODOLOGY | `weightedCorrelation(xyz.xs, xyz.ys, xyz.zs)` |
| `deff` | Design Effect | SURVEY METHODOLOGY | `designEffect(xyz.zs)` |
| `taylor` | Taylor Linearization | SURVEY METHODOLOGY | `taylorLinearization(data, xVar, [], cat1, cat2)` |
| `mds_classical` | Classical MDS | MULTIVARIATE | `classicalMDS(data, scaleVars.filter(c => numeric.includes(c)), { nDimensions: 2 })` |
| `mds_sammon` | Sammon Mapping | MULTIVARIATE | `sammonMapping(data, scaleVars.filter(c => numeric.includes(c)), { nDimensions: 2 })` |
| `mds_nonmetric` | Non-Metric MDS | MULTIVARIATE | `nonMetricMDS(data, scaleVars.filter(c => numeric.includes(c)), { nDimensions: 2 })` |

`xyz` (`{xs, ys, zs}`, already computed by a `useMemo` in
`InferencePanel.jsx` filtering `data` for finite `xVar`/`yVar`/`zVar`
values) is reused as `{value, second value, weight}` — `zVar`'s existing
config slot becomes the "Weight" picker for these 4 tests, the same way
`partial` correlation already reuses it as its "Z (control)" picker. No
new extraction logic.

`taylorLinearization`'s real signature is `(data, yVar, xVars, strataVar,
psuVar)`, but reading its implementation (`src/methods/survey.js:380-399`
in the `statlab` source repo) confirms the `xVars` parameter is accepted
but never referenced in the function body — passing anything for it has
zero effect. The config UI does not expose an "X variables" control for
this test; `[]` is passed literally, not a dead/misleading picker.

`scaleVars.filter(c => numeric.includes(c))` for the 3 MDS tests is the
exact expression `pca`/`efa` already use for their own variable list
(`InferencePanel.jsx:940-941`) — MDS reuses PCA/EFA's existing "Scale
items" `CheckList` config control verbatim, no new control.

### Config UI

- `wmean`, `wcorr`, `deff`: reuse existing `Sel` dropdowns bound to
  `xVar`/`yVar`/`zVar` (all three already exist as generic numeric-column
  state) — `wmean`/`deff` show 1-2 of them (value, weight), `wcorr` shows
  all 3 (X, Y, weight).
- `taylor`: `Sel` for `xVar` (labeled "Value"), `cat1` (labeled "Strata"),
  `cat2` (labeled "PSU / cluster") — all three already exist as generic
  state, reused the same way `kappa` already reuses `cat1`/`cat2` for its
  own two-rater columns.
- `mds_classical`/`mds_sammon`/`mds_nonmetric`: the existing `CheckList`
  bound to `scaleVars`, identical JSX to `pca`'s entry in
  `InferenceConfig.jsx`'s `configMap`.

### Result rendering

Each new test gets a small `r.test === '<exact string returned by the
function>'` block in `InferenceResults.jsx`, following the file's existing
per-test-block convention (confirmed against ~30 existing examples,
e.g. `r.test === 'Pearson r'`, `r.test === "Cochran's Q"`). All 7 already
return a fully-formed `apa` string (rendered automatically by the existing
`APABlock`, no new code needed for that part) plus a few numeric fields —
each new block is a handful of `Chip` components for those fields (`r`,
`mean`, `sd`, `se`, `deff`, `nEff`, `cv`, `total`, `stress`, `n`), matching
the existing `Chip`-per-statistic convention exactly.

### New chart: `MDSPlot`

MDS results are computed 2D coordinates (`points: number[][]`, shape `n ×
nDimensions`), not raw dataset columns — the same situation `ScreePlot`
solves for PCA's eigenvalues and `ForestPlot` solves for meta-analysis
study effects (`charts.jsx`'s existing dedicated-computed-result-renderer
pattern, confirmed by reading both). `MDSPlot({ points, stress, n })`
renders a `ComposedChart` scatter of `points[i] = [x, y]` (recharts,
matching `QuickScatter`'s existing conventions in the same file), sized
via `canvasSize` like every other AUTO-mode chart since Phase 1. All 3 new
MDS tests map to a new `'mdsplot'` mode in `chartMap.js`'s
`CHART_FOR_TEST`, wired into `QuickChart.jsx`'s dispatcher and given a
`CHART_MODE_LABELS.mdsplot` entry — the same 3-file wiring every existing
chart mode already has.

The 4 survey tests don't need a new chart — they default to `'histogram'`
in `chartMap.js` (showing the raw distribution of the chosen value
variable), the same default several existing simple/diagnostic tests
already use (e.g. `chigof`, `binomial`, `prop1`).

`src/utils/vizHelpers.js`'s `EXPLORE_PANEL_CHART_FOR_MODE` map needs one
new entry, `mdsplot: 'PCA biplot'` — reusing the EXPLORE tab's existing
"PCA biplot" chart (already the closest fit for "2D scatter of computed
multivariate scores"; `scree` already maps to the same Explore chart for
the same reason), so `chartMap.test.js`'s "every chart mode maps to an
Explore panel chart id" test keeps passing.

`src/config/chartMap.test.js` has a **hardcoded literal count**,
`` expect(Object.keys(CHART_FOR_TEST).length).toBe(223) ``, that must be
bumped to `230` (223 + the 7 new `CHART_FOR_TEST` entries this design
adds) — otherwise this specific test breaks. This is the same class of
stale-hardcoded-count bug Phase 1/2 fixed twice elsewhere in this app
(the Navigator's "84 modules" count, the onboarding tutorial's "84+");
worth naming explicitly here so it isn't mistaken for an unrelated test
failure during implementation.

### Contract test fixtures

`src/config/fixtures/runners.js` already has everything these 7 runners
need with zero new fixture data:
- `XS`/`YS`/`ZS` (existing generic numeric arrays) cover `wmean`/`wcorr`/
  `deff`.
- `ROWS` (the existing `mkTabular()` fixture) already has `x`, `cat2`
  (3-level categorical), and `school` (10-level categorical) columns,
  covering `taylor`'s `(data, yVar, xVars, strataVar, psuVar)` shape.
- `ROWS`/`VARS` (`['item1','item2','item3','item4']`) is the exact fixture
  `pca`/`efa` already use for their own `(data, vars)` calls — reused
  verbatim for the 3 MDS runners.

## Testing

- `src/config/contracts.test.js` (the existing, auto-generated-from-TREE
  integration test) automatically covers all 7 new ids once their runners
  exist in `runners.js` — no new test file needed for that layer, matching
  how every other TREE id is covered today.
- A small unit test for the new `MDSPlot` component in `charts.test.jsx`,
  matching that file's existing per-component convention (e.g. the
  `ScreePlot`/`BoxPlot` tests already there).
- `chartMap.test.js` (if it asserts every `CHART_FOR_TEST` value is a
  known mode) gets the 3 new MDS entries covered automatically once
  `'mdsplot'` is a real mode.
- Full `pnpm test` stays green throughout.
- Manual pass in the Browser preview: run each of the 7 new tests against
  a bundled dataset, confirm results render (chips + APA line) with no
  console errors, and confirm the 3 MDS tests' AUTO chart shows a 2D point
  scatter that visibly changes shape between the 3 methods.
