# StatLab SEM (Phase A: `sem` + `pathAnalysis`) — Design

**Date:** 2026-09-16
**Status:** Approved
**Phase:** A of 3 of the "bring `@statlab/core`'s `sem.js` module to the webapp"
initiative, itself the deferred SEM follow-up named in the prior
Survey/MDS phase's own spec. `sem.js` exports 8 functions spanning at
least 4 different config shapes and 2 genuinely new UI patterns (a
lavaan-style equations textarea, and — for `cfiCompare` — a two-model
comparison view with no precedent anywhere in the app); too much for one
plan, so it is split into three sub-phases, each with its own design →
plan → build cycle:

- **Phase A (this spec):** `sem`, `pathAnalysis` — establishes the
  equations-textarea config pattern and the fit-index/coefficients-table
  result-rendering pattern every later phase reuses.
- **Phase B (follow-up):** `semMultiGroup`, `measurementInvariance`,
  `bifactorModel`, `ordinalSEM`, `latentGrowthModel` — five tests reusing
  Phase A's primitives, each needing one additional small config
  addition (a group-variable picker, an ordered variable list, etc.).
- **Phase C (follow-up):** `cfiCompare` — needs Phase A's SEM plumbing
  to exist before a "run two models, compare their fit" UI makes sense
  to build.

## Problem

`@statlab/core@0.1.1`'s `sem.js` module is 100% unexposed in the
webapp. Two of its eight exports, confirmed by reading the package's own
source (`node_modules/@statlab/core/src/methods/sem.js`), are self-
contained enough to expose first:

- **`sem(opts)`** — full structural equation modeling: an optional
  latent-factor measurement model (`f1 =~ x1 + x2 + x3`) plus structural
  regressions among factors/observed variables (`y ~ f1 + x4`), fit by
  maximum likelihood (RAM specification, Newton-Raphson), returning
  loadings, paths, and standard SEM fit indices (χ², df, p, CFI, TLI,
  RMSEA + CI, SRMR, AIC, BIC).
- **`pathAnalysis(data, equations)`** — observed-variable-only path
  models (regression equations only, no `=~` latent factors), fit by
  OLS per equation, with indirect/total effects traced through the
  whole recursive system via `(I−B)⁻¹−I`. Simpler output: a
  from/to/direct/indirect/total coefficients list plus per-equation R².

Both take an **array of lavaan-syntax equation strings** as their model
specification, not column pickers — confirmed by reading
`parseEquations()`, which every SEM function in the module shares.

## Goals

1. Add both tests to a new **SEM** Navigator category, following the
   app's existing "one TREE entry = one method" pattern exactly.
2. Establish a reusable **equations textarea** config pattern — the
   first free-text model-specification control in the app *whose text
   references live dataset column names* (the existing `meta` test's
   `TA` textarea is the nearest precedent, but its content is a
   self-contained literal effect-size dataset, not equations over the
   loaded data — so unlike `meta`'s hardcoded example, these two
   textareas must default to dataset-derived starter equations, not a
   fixed literal).
3. Establish a reusable **coefficients table** result-rendering pattern
   (parameter/estimate/SE/z/p rows), reusing the exact scrollable
   zebra-striped `<table>` markup PCA's loadings table already uses in
   `InferenceResults.jsx`, rather than inventing new table styling.
4. No new build/runtime dependency — `sem`/`pathAnalysis` are already
   exported by the already-installed `@statlab/core@0.1.1`.

## Non-goals

- The other 6 `sem.js` exports (`semMultiGroup`,
  `measurementInvariance`, `bifactorModel`, `ordinalSEM`,
  `latentGrowthModel`, `cfiCompare`) — Phases B and C.
- A real SEM path-diagram visualization. The existing `PathDiagram`
  chart component (`src/components/charts.jsx`) is hardcoded to a fixed
  3-node X→M→Y mediation shape and cannot represent an arbitrary
  latent-factor/path model; building a generic node-link diagram for
  models of unknown shape is a meaningfully separate effort, deferred
  indefinitely rather than attempted here. Both tests default to
  `chartMap.js`'s existing `'histogram'` mode, matching other tests
  with no natural visual result.
- `bifactorModel`'s `generalFactor` parameter, confirmed (by reading its
  function body) to be accepted but never referenced — same class of
  dead parameter as `taylorLinearization`'s `xVars`, found in the prior
  phase. Noted here for Phase B; no UI control should ever be built for
  it.
- No change to any prior phase's work or to the `@statlab/core`
  dependency itself.

## Approach

### New tests and their exact function calls

| TREE id | Label | Category | Call |
|---|---|---|---|
| `sem` | Structural Equation Model | SEM | `sem({ equations: semEquations.trim().split('\n').filter(Boolean), data, method: 'ML' })` |
| `path_analysis` | Path Analysis | SEM | `pathAnalysis(data, pathEquations.trim().split('\n').filter(Boolean))` |

Both functions read column values directly off `data` row objects by
name (confirmed via `covMatrix(data, vars)` and the OLS design-matrix
construction in `pathAnalysis`) — no pre-filtering or column-name
translation needed beyond what the equations text itself specifies.
`sem` internally requires `data.length >= 10` and at least 3 observed
variables (`m >= 3`); `pathAnalysis` requires `data.length >= 10`. Both
return `null` (rendering the existing "Configure parameters to the
left." fallback) if the equations don't parse into anything usable —
no new error-string plumbing needed for that baseline case, though see
Error Handling below for a case that does need one.

### Config UI

Two new, fully dedicated pieces of `useInference` state — **not**
shared with each other or with `meta`'s existing `metaInput`:

```js
const [semEquations, setSemEquations] = useState(
  numeric.length >= 3 ? `f1 =~ ${numeric.slice(0, 3).join(' + ')}` : ''
);
const [pathEquations, setPathEquations] = useState(
  numeric.length >= 2 ? `${numeric[1]} ~ ${numeric[0]}` : ''
);
```

`sem`'s syntax (`=~` for latent factors, `~` for structural regressions)
is a strict superset of `pathAnalysis`'s (`~` only) — sharing one text
field between the two tests risks a half-valid equation set silently
carrying over when the user switches tests (e.g. a `=~` line left in
place when `path_analysis` becomes active, which `pathAnalysis`'s own
parser — `eq.split('~')` expecting exactly 2 parts — would simply drop
as unparseable, with no explanation). Dedicated state avoids this
entirely; each test's textarea only ever holds syntax valid for that
test.

The dataset-derived defaults above mirror how every existing generic
control already defaults (`xVar = useState(numeric[0] || '')`, etc.) —
adapted for free text instead of a dropdown, so the field is never
blank on first load, and — critically, unlike `meta`'s literal, dataset-
independent hardcoded example — the default equation always references
real columns of whatever dataset happens to be loaded. Defaults are
computed once at mount from the dataset available at that time, exactly
like every other generic `useState(list[0] || '')` default in this file
(and therefore inherits the same known, already-flagged, out-of-scope
staleness behavior on a dataset switch as every other generic control —
see the Survey/MDS phase's filed follow-up).

Both config entries in `InferenceConfig.jsx`'s `configMap`:

```js
sem: <TA label="Model syntax (one equation per line: f =~ x1 + x2 for a latent factor, y ~ x for a regression)" value={semEquations} onChange={setSemEquations} rows={7} />,
path_analysis: <TA label="Equations (one per line: y ~ x1 + x2)" value={pathEquations} onChange={setPathEquations} rows={5} />,
```

### Result rendering

**`sem`:** a fit-indices `Row` of `Chip`s — χ²(df), p, CFI, TLI, RMSEA
[CI], SRMR, AIC, BIC — followed by up to two coefficients tables
(Loadings, Paths) using PCA's existing scrollable zebra-striped
`<table>` markup verbatim (`InferenceResults.jsx` lines ~670-690),
columns: parameter / estimate / SE / z / p. `sem`'s own `apa` string
(already fully formatted: `SEM χ²(df) = ..., p = ..., CFI = ..., TLI =
..., RMSEA = ..., SRMR = ...`) renders automatically via the existing
`APABlock`, no new code needed for that part.

**`pathAnalysis`:** one coefficients table (from / to / direct /
indirect / total) using the same table markup, plus a `Row` of `Chip`s
for per-equation R² (`Object.entries(r.rSquared)`).

### Error handling

Both functions return `null` on malformed/insufficient input, which the
existing "Configure parameters to the left." fallback already covers —
no new plumbing needed for that case. One additional case needs an
explicit guard, following the `{ error }` convention the Survey/MDS
phase established (`InferenceResults.jsx` already renders `r.error` in
red, no new rendering code needed): `sem`'s Newton-Raphson fit can fail
to converge on a poorly-specified model (e.g. too few free parameters'
worth of variance in the data) and return finite-looking numbers built
from a degenerate Hessian inverse. The `mds_sammon` divergence-guard
precedent from the Survey/MDS phase (`InferencePanel.jsx`'s
`mdsResultOrError` helper) is *not* directly reusable here (different
result shape), but the same category of check — validating that `fit`'s
numeric fields are all finite before returning the raw result — will be
added to `sem`'s branch in `InferencePanel.jsx`, converting a
non-finite fit to `{ error: 'SEM model did not converge — try a
simpler model or check for near-collinear variables.' }`.

`pathAnalysis` does not need the equivalent guard: reading its source,
a singular design matrix (e.g. perfectly collinear predictors) makes
`matInv` return `null`, which `pathAnalysis` already handles per-
equation by silently omitting that one equation's fit from the result
(`if (!inv) return;` inside its per-equation loop) rather than
propagating `NaN` — a partially-smaller-than-requested coefficient
list, not corrupted numbers. This is existing, intentional package
behavior, not a gap this phase needs to close.

### Contract test fixtures

`src/config/fixtures/runners.js` needs two new runners. Neither
existing fixture (`ROWS`, `XS`/`YS`/`ZS`) has >=10 rows with the right
shape for a 3-indicator latent factor by inspection — confirm during
implementation and extend `ROWS`'s row count if needed rather than
building a new fixture from scratch, matching how the Survey/MDS phase
reused `ROWS` for its own new runners.

## Testing

- `src/config/contracts.test.js` covers both new ids automatically once
  their runners exist, per the app's existing convention.
- `chartMap.test.js`'s hardcoded mapping-count literal needs bumping by
  2 (the same stale-count bug class flagged and fixed twice in Phase 1
  and again in the Survey/MDS phase).
- A focused test in `InferencePanel.test.jsx` for the new `sem`
  non-convergence guard, following the exact break/restore pattern the
  Survey/MDS phase's `wmean`/`deff` regression tests already established
  (construct a fixture the *real* `@statlab/core` function is expected
  to fail to converge on, assert the `{ error }` message renders — not
  a hand-mocked "always fails" stub).
- Manual pass in the Browser preview: run both new tests against a
  bundled dataset, confirm the fit-index chips and coefficients tables
  render with no console errors, confirm the equations textarea's
  dataset-derived default actually parses and runs successfully out of
  the box on first load (not just after manual editing).
