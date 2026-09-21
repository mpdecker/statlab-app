# StatLab SEM Phase B (`bifactorModel` + `latentGrowthModel`) — Design

**Date:** 2026-09-21
**Status:** Verification complete with 2 fixes (2026-09-21).
`latentGrowthModel` shipped exactly as designed — manually verified
end-to-end (including the custom-timepoints field's length-mismatch
fallback, and confirming it genuinely rescales the estimated slope, not
just accepted-but-ignored) with no issues. `bifactorModel` shipped with
two real bugs found and fixed during manual verification:

1. **`omegaTotal` and per-item `communality` are hidden.** Reading
   `@statlab/core`'s source: the `general` loading is capped at `0.99`,
   but the `group` loading has no equivalent cap, so both statistics
   (which sum the squared `group` value) routinely exceed the `[0,1]`
   range they're defined to stay within — confirmed even on well-
   behaved, same-scale inputs (`communality = 16.33` for one item,
   `omegaTotal = 11902.38` on mixed-scale real data), not a narrow edge
   case. `omegaHierarchical` and the `general`/`group` loadings
   themselves stay correctly bounded throughout. Rather than show a
   headline statistic that's routinely wrong by construction, the
   `ωt` chip and `communality` table column are hidden, with the
   caveat documented in both the method note and a new `r.warning`
   banner. An upstream bug report has been filed as a separate follow-
   up (`task_e86f0e40`); this can be reverted once fixed and
   re-verified.
2. **`bifactorGroups`' nested state shape wasn't covered by the
   existing dataset-switch revalidation fix.** A prior, separately-
   filed fix (already merged into `main` before this worktree was
   created) revalidates every *flat* generic state slot
   (`xVar`/`cat1`/`scaleVars`/etc.) on dataset switch, but
   `bifactorGroups` (`Array<{items: string[]}>`) is a nested shape that
   fix didn't anticipate — a stale item name surviving inside a
   group's own `items` array was invisible to the user (`GroupEditor`'s
   checklist only ever renders checkboxes for the *current* dataset's
   numeric columns, so a stale item could never be seen or unchecked)
   yet still reached `bifactorModel`'s computation, silently adding
   extra rows to the results table for columns no longer in the loaded
   dataset. Fixed by extending the same revalidation effect to also
   filter stale items out of each group.

Both fixes are committed (`48ff17d`) with regression tests exercising
the real failure modes against the real package, following the same
rigor Phase A established.

**Status (original, before the above):** Approved
**Phase:** B of 3 of the "bring `@statlab/core`'s `sem.js` module to the
webapp" initiative. Phase A (`docs/superpowers/specs/2026-09-16-sem-path-
analysis-design.md`) shipped `pathAnalysis` and established the equations-
textarea config pattern and coefficients-table result-rendering pattern;
`sem` itself was reverted after manual verification found its factor-
loading ML optimizer (`_fitRAMByML`, a Newton-Raphson fit) does not
converge — confirmed across multiple datasets, including a synthetic one
deliberately built with an ideal, unambiguous factor structure. An
upstream bug report for that optimizer has been filed separately.

## Problem

The original Phase B scope (per Phase A's spec) was five functions:
`semMultiGroup`, `measurementInvariance`, `bifactorModel`, `ordinalSEM`,
`latentGrowthModel`. Reading each function's source
(`node_modules/@statlab/core/src/methods/sem.js`) against the confirmed
Phase A bug narrows this:

- **`semMultiGroup`** calls `sem()` directly, once per group
  (`sem({ equations, data: subset })` inside its own loop) — inherits the
  same broken optimizer outright.
- **`ordinalSEM`** explicitly reuses `_fitRAMByML`, "the same RAM-ML
  machinery as `sem()`" per its own source comment — same optimizer,
  same bug.
- **`measurementInvariance`** uses a separate but structurally similar
  optimizer, `_fitMultiGroupCFA` (also Newton-Raphson with a numeric
  finite-difference Hessian, `eps=1e-6`, the same technique that failed
  for `sem()`) — not confirmed broken, but a live risk sharing the exact
  mechanism already shown to fail.
- **`bifactorModel`** does NOT use Newton-Raphson at all — it's
  iterative PCA/eigendecomposition (`jacobiEigen`) on a communality-
  adjusted correlation matrix, refined via Procrustes rotation. A
  completely different numerical approach.
- **`latentGrowthModel`** does NOT iterate at all — closed-form GLS via
  a fixed `Lambda` design matrix and direct matrix inversion. No
  optimizer to fail.

Phase B is scoped to the two functions with no dependency on the
confirmed-broken optimizer: **`bifactorModel`** and
**`latentGrowthModel`**. `semMultiGroup`, `ordinalSEM`, and
`measurementInvariance` are deferred until the upstream fix (filed as a
follow-up) lands and each is independently re-verified — re-attempting
them now would risk repeating Phase A's exact failure.

## Goals

1. Add both tests to the existing **SEM** Navigator category (created in
   Phase A, currently holding only `path_analysis`).
2. `latentGrowthModel` reuses two already-established patterns
   end-to-end with zero new components: the `scaleVars`/`CheckList`
   control already shared by `pca`/`efa`/the 3 MDS tests (its `selected`
   array preserves click order, not list order — confirmed by reading
   `CheckList`'s implementation — which conveniently matches
   `latentGrowthModel`'s own implicit default timepoints,
   `Array.from({length: k}, (_, i) => i)`, i.e. "index order = selection
   order"), plus the existing `parseNumList` helper (already used by
   `did`'s config) for an optional custom-timepoints text field.
3. `bifactorModel` needs new UI: a `GroupEditor` component letting the
   user define 2+ named-in-UI-only groups of items (add/remove group,
   each a checklist). No existing precedent for a dynamic add/remove-
   group interaction anywhere in the app — this is new interaction
   surface, not a reuse of an existing pattern.
4. `bifactorModel`'s result table (`BifactorTable`: item/general/group —
   `communality` was designed in but shipped hidden, see Status) follows
   the exact scrollable zebra-striped `<table>` convention
   `PathCoeffTable` (Phase A) already established.
5. No new build/runtime dependency — both functions are already exported
   by the already-installed `@statlab/core@0.1.1`.

## Non-goals

- `semMultiGroup`, `ordinalSEM`, `measurementInvariance` — deferred, see
  Problem above. Not abandoned; candidates once the upstream `_fitRAMByML`
  fix lands (`ordinalSEM`/`semMultiGroup` directly) or is independently
  confirmed to also resolve `_fitMultiGroupCFA`
  (`measurementInvariance`) — that confirmation itself is a small piece
  of follow-up verification work, not assumed here.
- `bifactorModel`'s `generalFactor` parameter — confirmed, by reading
  the function body, to be accepted but never referenced (the general
  factor loads on every item automatically via
  `allItems = groupFactors.flatMap(g => g.items)`, no separate
  specification needed). No UI control will be built for it; the
  webapp always calls `bifactorModel(data, [], groupFactors)`. This was
  already flagged as a non-goal in Phase A's own spec.
- `bifactorModel`'s `maxIter` option — not exposed as a user control,
  matching `sem`'s own precedent of not exposing its `maxIter`/
  `tolerance` options either.
- `cfiCompare` — still Phase C, unaffected by this scoping change.

## Approach

### New tests and their exact function calls

| TREE id | Label | Category | Call |
|---|---|---|---|
| `bifactor` | Bifactor Model | SEM | `bifactorModel(data, [], bifactorGroups.filter(g => g.items.length))` |
| `latent_growth` | Latent Growth Model | SEM | `latentGrowthModel(data, scaleVars.filter(c => numeric.includes(c)), semTimes.trim() ? parseNumList(semTimes) : null)` |

`bifactorModel` internally requires `data.length >= 20` and at least 1
non-empty group (`groupFactors.length` — confirmed by reading its source,
it does not enforce 2+ despite 2+ being the statistically meaningful
case; the webapp does not add a stricter minimum than the package
itself does, matching how no other test in this app second-guesses a
package function's own validation floor).
`latentGrowthModel` requires `data.length >= 10` and `vars.length >= 2`.

### Config UI

**`latent_growth`:** reuses `scaleVars`/`setScaleVars` (existing state,
no new `useState`) via the identical `CheckList` JSX already used by
`pca`. Adds one new dedicated state, `semTimes` (a plain string, default
`''`), rendered via a new `Inp` entry:

```js
latent_growth: <>
  <CheckList label="Repeated measures (select in time order)" items={numeric} selected={scaleVars} onChange={setScaleVars} />
  <Inp label="Custom time points (optional, comma-separated)" value={semTimes} onChange={setSemTimes} width={200} placeholder="0, 6, 12" />
</>,
```

**`bifactor`:** a new `GroupEditor` component in `ui.jsx`, matching the
file's existing small-component conventions (`TA`, `CheckList`, `Sel`).
One new dedicated state, `bifactorGroups` (`Array<{items: string[]}>`),
defaulting — on mount, from the dataset available at that time, same
caveat as every other generic dataset-derived default in this app
(subject to the already-filed, already-documented dataset-switch
staleness bug, not new here) — to the first 4 numeric columns split
into 2 groups of 2, so the test computes something meaningful on first
load rather than starting empty:

```js
const [bifactorGroups, setBifactorGroups] = useState(() => {
  const cols = numeric.slice(0, 4);
  const half = Math.ceil(cols.length / 2);
  return cols.length >= 2 ? [{ items: cols.slice(0, half) }, { items: cols.slice(half) }] : [];
});
```

`GroupEditor`'s interface: `{ label, items, groups, onChange }` where
`groups: Array<{ items: string[] }>` and `onChange(newGroups)`. Renders
each group as a labeled block ("Group 1", "Group 2", ...) with an
inline remove button and a checklist of `items` (reusing `CheckList`'s
own checkbox-row markup/styling inline, not by literally nesting a
`<CheckList>` per group, since each group's checkbox state lives in a
different array slot than `CheckList`'s own single flat `selected`
array expects), plus a trailing "+ Add group" button appending
`{ items: [] }`.

### Result rendering

**`latent_growth`:** a single `Row` of `Chip`s built directly from
`r.coefficients` (always exactly 5 entries: `Intercept mean (α_i)`,
`Slope mean (α_s)`, `Intercept variance (ψ_ii)`, `Slope variance
(ψ_ss)`, `Intercept-slope covariance`), matching the existing
`r.coefficients.map((c, i) => <Chip key={i} label={...} value={...} />)`
convention already used by e.g. `bayes_linreg`'s block. No new
component — the shape is small and fixed, unlike `sem`'s dynamic-length
loadings/paths that justified a table in Phase A.

**`bifactor`:** `ωh`/`ωt` `Chip`s directly modeled on the existing
McDonald's ω block's `ω total`/`ω hierarchical` chips (same labels,
same color-threshold convention), plus a new `BifactorTable` component
(columns: item / general / group / communality) following
`PathCoeffTable`'s exact scrollable zebra-striped `<table>` markup
verbatim. **As shipped (see Status):** the `ωt` chip and `communality`
column are hidden — `@statlab/core`'s `group` loading is never capped
the way `general` is, so both routinely exceed the `[0,1]` range
they're defined to stay within. A `r.warning` banner (an existing,
already-supported convention this app's `InferenceResults.jsx` already
renders generically, just not previously used by any wired-in test)
explains the omission inline.

### Chart

Neither result has anything chart-shaped — both default to
`chartMap.js`'s existing `'histogram'` mode, matching `path_analysis`'s
own precedent from Phase A.

### Contract test fixtures

`ROWS` (`mkTabular()`, 72 rows, already has `item1`-`item4` and
`rm1`-`rm3`) covers both: `bifactor` groups `item1`+`item2` /
`item3`+`item4`; `latent_growth` uses `rm1, rm2, rm3` (already named
suggestively for repeated-measures use, and already consumed by
`mkRmMatrix()` for an unrelated existing test) as its 3 timepoints in
that order.

## Testing

- `src/config/contracts.test.js` covers both new ids automatically once
  their runners exist.
- `chartMap.test.js`'s hardcoded mapping-count literal needs bumping by
  2.
- A unit test for the new `GroupEditor` component in `ui.jsx`'s existing
  test file, covering add/remove-group and per-group item toggling.
- Manual pass in the Browser preview: run both new tests against a
  bundled dataset, confirm results render with no console errors, and
  confirm `bifactor`'s default 2-group split actually computes a
  non-degenerate result out of the box (not just that it doesn't
  crash) — checking `omegaHierarchical`/`omegaTotal` land in a sane
  0-1 range, following Phase A's hard-learned lesson that "renders
  without throwing" is not the same as "computes something trustworthy."
