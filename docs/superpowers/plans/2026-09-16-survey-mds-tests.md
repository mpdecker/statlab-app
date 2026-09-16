# StatLab Survey Methodology + MDS Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 4 survey-methodology tests (Weighted Descriptives, Weighted
Correlation, Design Effect, Taylor Linearization) and 3 MDS tests
(Classical, Sammon, Non-Metric) to StatLab's Navigator, each with real
config controls, result rendering, and a method note — the same full
treatment every existing test already gets.

**Architecture:** Every new test reuses the app's existing generic
per-test state (`xVar`/`yVar`/`zVar`/`cat1`/`cat2`/`scaleVars`) and config
controls (`Sel`/`CheckList`) exactly as an existing test (`partial`
correlation, `kappa`, `pca`) already does — no new `useState` anywhere.
The 3 MDS tests share one new chart component, `MDSPlot`, built on the
same `ResponsiveContainer`/`ComposedChart`/`Scatter` pattern
`QuickScatter` already uses (self-sizing, no manual width/height
threading needed — unlike the older raw-SVG chart primitives Phase 1 had
to retrofit a `height` prop onto).

**Tech Stack:** React 18, Vite, Vitest + `@testing-library/react` +
`happy-dom` (existing test stack — no new dependencies; `@statlab/core`
already exports everything needed).

## Global Constraints

- No new build/runtime dependency (spec Goal 3).
- No changes to SEM (`sem.js`) or any of `survey.js`'s other 21 exports —
  explicitly out of scope (spec Non-goals).
- No changes to Phase 1/2's work or the `@statlab/core` migration itself.
- Every existing test must keep passing (`pnpm test`) after every task.
- `src/config/chartMap.test.js` has a hardcoded literal,
  `` expect(Object.keys(CHART_FOR_TEST).length).toBe(223) `` — it must be
  bumped as `CHART_FOR_TEST` entries are added in this plan (223 → 227 in
  Task 1, 227 → 230 in Task 3), or that specific test breaks.
- Follow the codebase's existing test convention: `// @vitest-environment
  happy-dom` header, `@testing-library/react`'s `render`, `describe`/
  `test`/`expect` from `vitest`.
- Work happens in the git worktree at `D:\Development\statlab-survey-mds`
  (branch `feat/survey-mds-tests`, already created from `origin/main`,
  which already includes the `@statlab/core` migration). All file paths
  below are relative to that worktree root.

---

### Task 1: Survey methodology tests (4)

**Files:**
- Modify: `src/config/tree.js` (new `SURVEY METHODOLOGY` category)
- Modify: `src/components/InferencePanel.jsx` (import + 4 result branches)
- Modify: `src/components/InferenceConfig.jsx` (4 config entries)
- Modify: `src/components/InferenceResults.jsx` (4 result-render blocks)
- Modify: `src/config/chartMap.js` (4 entries, all `'histogram'`)
- Modify: `src/config/chartMap.test.js` (bump `223` → `227`)
- Modify: `src/config/methodNotes.js` (4 entries)
- Modify: `src/config/fixtures/runners.js` (4 runners)

**Interfaces:**
- Consumes: `weightedMean`, `weightedVar`, `weightedCorrelation`,
  `designEffect`, `taylorLinearization` from `@statlab/core/methods/survey`
  (already published, confirmed exported by reading the package source
  before writing this plan).
- Produces: 4 new TREE ids — `wmean`, `wcorr`, `deff`, `taylor` — reachable
  end-to-end like any other test.

- [ ] **Step 1: Add the new TREE category**

In `src/config/tree.js`, find the closing of the array (currently the
last few lines):

```js
  { cat: "DISTANCE & DEPENDENCE", color: '#5eead4',
    tests: [
      { id: "dist_corr", label: "Distance Correlation",  tag: "nonlinear association · Székely" },
      { id: "dist_cov",  label: "Distance Covariance",   tag: "nonlinear dependence" },
    ],
  },
];
```

Replace the final `];` with a new category block followed by `];`:

```js
  { cat: "DISTANCE & DEPENDENCE", color: '#5eead4',
    tests: [
      { id: "dist_corr", label: "Distance Correlation",  tag: "nonlinear association · Székely" },
      { id: "dist_cov",  label: "Distance Covariance",   tag: "nonlinear dependence" },
    ],
  },
  { cat: "SURVEY METHODOLOGY", color: '#fb7185',
    tests: [
      { id: "wmean",  label: "Weighted Descriptives",   tag: "weighted mean · SD · SE" },
      { id: "wcorr",  label: "Weighted Correlation",    tag: "weighted Pearson r" },
      { id: "deff",   label: "Design Effect",           tag: "DEFF · effective n · weight CV" },
      { id: "taylor", label: "Taylor Linearization",    tag: "stratified/clustered total · SE" },
    ],
  },
];
```

(`'#fb7185'` is a rose/red not already used by an adjacent category in the
file — confirm this against the current file before committing to it; any
unused hex is fine, this is purely a Navigator accent color with no other
meaning.)

- [ ] **Step 2: Add the runners (contract test fixtures)**

In `src/config/fixtures/runners.js`, find the closing of the `RUNNERS`
object:

```js
  // ── DISTANCE & DEPENDENCE ──────────────────────────────────────────
  dist_corr: () => distanceCorrelation(XS, YS),
  dist_cov: () => distanceCovariance(XS, YS),
};
```

Replace with:

```js
  // ── DISTANCE & DEPENDENCE ──────────────────────────────────────────
  dist_corr: () => distanceCorrelation(XS, YS),
  dist_cov: () => distanceCovariance(XS, YS),
  // ── SURVEY METHODOLOGY ──────────────────────────────────────────────
  wmean: () => weightedMean(XS, ZS),
  wcorr: () => weightedCorrelation(XS, YS, ZS),
  deff: () => designEffect(ZS),
  taylor: () => taylorLinearization(ROWS, 'x', [], 'cat2', 'school'),
};
```

Add the import. Find the existing distance-module import (near the top of
the file, alongside the other `@statlab/core/methods/*` imports):

```js
import { distanceCorrelation, distanceCovariance } from '@statlab/core/methods/distance';
```

Add immediately after it:

```js
import { weightedMean, weightedCorrelation, designEffect, taylorLinearization } from '@statlab/core/methods/survey';
```

- [ ] **Step 3: Run the contract tests to verify the 4 new runners work**

Run: `pnpm vitest run src/config/contracts.test.js -t "wmean|wcorr|deff|taylor"`
Expected: PASS — 8 tests (2 per id: "executes without throw" and "returns
inference-shaped result").

(If this specific `-t` regex syntax doesn't match vitest's test-name
filter in this version, run the whole file instead:
`pnpm vitest run src/config/contracts.test.js` and confirm the 4 new ids
appear and pass among the output.)

- [ ] **Step 4: Bump the chartMap entry count and add the 4 new chart mappings**

In `src/config/chartMap.js`, find the closing of `CHART_FOR_TEST`:

```js
  gmm_cluster: 'scatter', lpa: 'histogram',
  dist_corr: 'scatterfit', dist_cov: 'scatterfit',
};
```

Replace with:

```js
  gmm_cluster: 'scatter', lpa: 'histogram',
  dist_corr: 'scatterfit', dist_cov: 'scatterfit',
  // ── SURVEY METHODOLOGY ──────────────────────────────────────────────
  wmean: 'histogram', wcorr: 'scatterfit', deff: 'histogram', taylor: 'histogram',
};
```

In `src/config/chartMap.test.js`, change:

```js
  test('has exactly 223 mappings', () => {
    expect(Object.keys(CHART_FOR_TEST).length).toBe(223);
  });
```

to:

```js
  test('has exactly 227 mappings', () => {
    expect(Object.keys(CHART_FOR_TEST).length).toBe(227);
  });
```

- [ ] **Step 5: Run chartMap.test.js to verify it passes**

Run: `pnpm vitest run src/config/chartMap.test.js`
Expected: PASS — all tests pass, including "every TREE test id has a
QuickView chart mode" (now true for the 4 new ids) and the updated count
test.

- [ ] **Step 6: Add the config UI entries**

In `src/components/InferenceConfig.jsx`, find the `kappa` entry in
`configMap` (currently):

```js
    kappa: <>
      <Sel label="Rater 1" value={cat1} onChange={setCat1} options={categorical} width={130} />
      <Sel label="Rater 2" value={cat2} onChange={setCat2} options={categorical} width={130} />
    </>,
```

Add immediately after it (before the `meta:` entry that currently follows):

```js
    wmean: <>
      <Sel label="Value" value={xVar} onChange={setXVar} options={numeric} width={130} />
      <Sel label="Weight" value={zVar} onChange={setZVar} options={numeric} width={130} />
    </>,
    wcorr: <>
      <Sel label="X" value={xVar} onChange={setXVar} options={numeric} width={110} />
      <Sel label="Y" value={yVar} onChange={setYVar} options={numeric} width={110} />
      <Sel label="Weight" value={zVar} onChange={setZVar} options={numeric} width={110} />
    </>,
    deff: <Sel label="Weight" value={zVar} onChange={setZVar} options={numeric} width={130} />,
    taylor: <>
      <Sel label="Value" value={xVar} onChange={setXVar} options={numeric} width={110} />
      <Sel label="Strata" value={cat1} onChange={setCat1} options={categorical} width={110} />
      <Sel label="PSU / cluster" value={cat2} onChange={setCat2} options={categorical} width={110} />
    </>,
```

(`xVar`/`yVar`/`zVar`/`cat1`/`cat2`/`numeric`/`categorical` are all
already destructured/declared earlier in this same component — confirm
this before editing, don't re-declare them.)

- [ ] **Step 7: Wire the result computation**

In `src/components/InferencePanel.jsx`, add the import. Find:

```js
import { pca, efa, manova, canonicalCorr, linearDiscriminant, cronbachAlpha, splitHalf, icc, cohensKappa, metaAnalysis, differencesInDifferences, convertEffectSize } from '@statlab/core/methods/multivariate';
```

Add immediately after it:

```js
import { weightedMean, weightedVar, weightedCorrelation, designEffect, taylorLinearization } from '@statlab/core/methods/survey';
```

Find the `kappa` result branch:

```js
      if (a === 'kappa')     return cohensKappa(data.map(r => r[cat1]), data.map(r => r[cat2]));
```

Add immediately after it:

```js
      if (a === 'wmean') {
        const m = weightedMean(xyz.xs, xyz.zs);
        if (!m) return null;
        const v = weightedVar(xyz.xs, xyz.zs);
        return { test: 'Weighted Descriptives', mean: m.mean, sd: v?.sd ?? null, se: v?.se ?? null, n: m.n, sumWeights: m.sumWeights, apa: v ? `Weighted M = ${m.mean}, SD = ${v.sd}, n = ${m.n}` : m.apa };
      }
      if (a === 'wcorr')  return weightedCorrelation(xyz.xs, xyz.ys, xyz.zs);
      if (a === 'deff')   return designEffect(xyz.zs);
      if (a === 'taylor') return taylorLinearization(data, xVar, [], cat1, cat2);
```

(`xyz` — the `{xs, ys, zs}` memo already computed from `xVar`/`yVar`/
`zVar` — and `data`/`xVar`/`cat1`/`cat2` are all already in scope in this
function; confirm before editing.)

- [ ] **Step 8: Add result rendering**

In `src/components/InferenceResults.jsx`, find the closing of the `LDA`
block (currently immediately followed by the `McDonald's ω` block):

```js
      {r.test === 'LDA' && <>
        <SectionHead label={`LDA · training-set rule · accuracy ${r.accuracyTrain}%`} />
        <Row>
          <Chip label="accuracy" value={`${r.accuracyTrain}%`} color={C.ok} />
          <Chip label="k classes" value={r.nGroups} color={C.dim} />
          <Chip label="# predictors" value={r.nFeatures} color={C.dim} />
        </Row>
        <div style={{ fontSize: 8, ...mono, color: C.dim }}>
          coeffs (standardized direction): {(r.coefficients ?? []).map((c, i) => `${(r.xVars?.[i] ?? `β${i + 1}`)}=${c}`).join(', ')}
        </div>
      </>}

      {r.test === "McDonald's ω" && (
```

Insert between them (immediately after the `LDA` block's closing `</>}`,
before the `McDonald's ω` block):

```js
      {r.test === 'Weighted Descriptives' && <>
        <SectionHead label={`Weighted Descriptives · n=${r.n}`} />
        <Row>
          <Chip label="weighted M" value={r.mean} color={C.pos} />
          {r.sd != null && <Chip label="weighted SD" value={r.sd} color={C.dim} />}
          {r.se != null && <Chip label="SE" value={r.se} color={C.dim} />}
          <Chip label="Σ weights" value={r.sumWeights} color={C.dim} />
        </Row>
      </>}

      {r.test === 'Weighted Correlation' && <>
        <SectionHead label={`Weighted Correlation · n=${r.n}`} />
        <Row>
          <Chip label="r (weighted)" value={r.r} color={r.r > 0 ? C.pos : C.neg} />
        </Row>
      </>}

      {r.test === 'Design Effect' && <>
        <SectionHead label={`Design Effect · n=${r.n}`} />
        <Row>
          <Chip label="DEFF" value={r.deff} color={r.deff > 1 ? C.warn : C.ok} />
          <Chip label="n_eff" value={r.nEff} color={C.dim} />
          <Chip label="weight CV" value={r.cv} color={C.dim} />
        </Row>
      </>}

      {r.test === 'Taylor Linearization' && <>
        <SectionHead label={`Taylor Linearization · ${r.nStrata} strata · n=${r.n}`} />
        <Row>
          <Chip label="total" value={r.total} color={C.pos} />
          <Chip label="SE" value={r.se} color={C.dim} />
        </Row>
      </>}

```

- [ ] **Step 9: Add method notes**

In `src/config/methodNotes.js`, find the `dist_cov` entry — the last
entry in `METHOD_NOTES` before its closing `};` (currently lines
1395-1401):

```js
  dist_cov: {
    description: "Distance covariance is the unstandardized building block of distance correlation — a nonzero value indicates the two variables are not independent, of any functional form.",
    usage: "Use as a general-purpose, assumption-light test for association when you're unsure whether a relationship (if any) would be linear.",
    assumptions: ["Finite variances", "Independent observations"],
    cite: "Székely, G. J., Rizzo, M. L., & Bakirov, N. K. (2007). Measuring and testing dependence by correlation of distances. Annals of Statistics, 35(6), 2769–2794.",
  },
};
```

Insert the 4 new entries between `dist_cov`'s closing `},` and
`METHOD_NOTES`'s own closing `};`:

```js
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
```

- [ ] **Step 10: Run the full suite**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add src/config/tree.js src/config/fixtures/runners.js src/config/chartMap.js src/config/chartMap.test.js src/components/InferenceConfig.jsx src/components/InferencePanel.jsx src/components/InferenceResults.jsx src/config/methodNotes.js
git commit -m "$(cat <<'EOF'
feat: add 4 survey methodology tests

Weighted Descriptives (mean+SD+SE), Weighted Correlation, Design
Effect (incl. effective n), and Taylor Linearization — reusing the
app's existing generic xVar/yVar/zVar/cat1/cat2 state and Sel
config controls exactly as partial correlation and Cohen's kappa
already do (no new useState). All 4 default to the 'histogram'
AUTO chart mode, matching several existing diagnostic tests.

Bumps chartMap.test.js's hardcoded mapping-count literal
(223 -> 227) alongside the 4 new CHART_FOR_TEST entries.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `MDSPlot` chart component

**Files:**
- Modify: `src/components/charts.jsx` (new `MDSPlot` export)
- Modify: `src/components/charts.test.jsx` (new test)
- Modify: `src/components/QuickChart.jsx` (new `'mdsplot'` case)
- Modify: `src/utils/vizHelpers.js` (`CHART_MODE_LABELS.mdsplot`,
  `EXPLORE_PANEL_CHART_FOR_MODE.mdsplot`)

**Interfaces:**
- Produces: `MDSPlot({ points, stress, n })` — `points` is `number[][]`
  (each entry `[x, y]`), `stress`/`n` optional numbers. Self-sizing (no
  `width`/`height` props needed) via `ResponsiveContainer width="100%"
  height="100%"`, matching `QuickScatter`'s existing pattern in the same
  file. Task 3 is the only consumer.

- [ ] **Step 1: Write the failing test**

Add to `src/components/charts.test.jsx` (extend the existing import line
and `describe('charts', ...)` block — this file already imports several
named exports from `./charts.jsx`; add `MDSPlot` to that same import
list rather than adding a second import line):

```jsx
  test('MDSPlot renders a scatter of 2D points', () => {
    const points = [[0.5, -0.2], [-0.3, 0.4], [0.1, 0.1], [-0.6, -0.5]];
    const { container } = render(<MDSPlot points={points} stress={0.05} n={4} />);
    expect(container.querySelector('.recharts-responsive-container')).toBeTruthy();
  });

  test('MDSPlot returns null for empty points', () => {
    const { container } = render(<MDSPlot points={[]} />);
    expect(container.firstChild).toBeNull();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/charts.test.jsx -t MDSPlot`
Expected: FAIL — `MDSPlot` is not exported from `charts.jsx` yet.

- [ ] **Step 3: Write the component**

In `src/components/charts.jsx`, find `QuickScatter` (the component this
one is modeled after):

```jsx
// ── Scatter quick-view ────────────────────────────────────────────────────
export function QuickScatter({ data, xVar, yVar, colorVar, colorMap, groups }) {
```

Add a new export immediately before that comment/function (so `MDSPlot`
sits next to the scatter-family components it shares a pattern with):

```jsx
// ── MDS scatter ───────────────────────────────────────────────────────────
export function MDSPlot({ points, stress, n }) {
  if (!points?.length) return null;
  const axTick = { fontSize: 9, fill: C.dim, ...mono };
  const pts = points.map((p, i) => ({ x: p[0] ?? 0, y: p[1] ?? 0, id: i }));
  const name = stress != null ? `stress = ${stress}` : (n != null ? `n = ${n}` : 'points');
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart margin={{ top: 4, right: 4, bottom: 18, left: 4 }}>
        <CartesianGrid stroke={C.border} strokeOpacity={.4} />
        <XAxis dataKey="x" type="number" tick={axTick} stroke={C.border} label={{ value: 'Dim 1', position: "insideBottom", offset: -5, fill: C.dim, fontSize: 8 }} />
        <YAxis dataKey="y" type="number" tick={axTick} stroke={C.border} label={{ value: 'Dim 2', angle: -90, position: "insideLeft", offset: 8, fill: C.dim, fontSize: 8 }} />
        <Tooltip content={<CTip />} />
        <Scatter data={pts} fill={C.accent} opacity={.7} r={3} name={name} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

```

(`ComposedChart`, `Scatter`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`,
`ResponsiveContainer` are already imported from `'recharts'` at the top of
this file — same import `QuickScatter` uses — and `CTip` is already
imported from `./ui.jsx`. No new imports needed.)

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/components/charts.test.jsx -t MDSPlot`
Expected: PASS.

- [ ] **Step 5: Wire it into the AUTO-mode dispatcher**

In `src/components/QuickChart.jsx`, find the import block:

```js
import {
  QuickScatter, QuickScatterFit, ViolinPlot, BarCI, HistogramDensity, HeatmapCorr, MosaicPlot,
  PowerCurve, PathDiagram, ForestPlot, QQPlot, ScreePlot, ResidualPlot, BootstrapHist,
  QuickSlopes, BoxPlotGrid, IRTCurves, LCAProfiles, SpaghettiPlot, CaterpillarPlot,
  ITSPlot, RDPlot, SociogramPlot, TimeSeriesChart,
} from './charts.jsx';
```

Add `MDSPlot` to that list:

```js
import {
  QuickScatter, QuickScatterFit, ViolinPlot, BarCI, HistogramDensity, HeatmapCorr, MosaicPlot,
  PowerCurve, PathDiagram, ForestPlot, QQPlot, ScreePlot, ResidualPlot, BootstrapHist,
  QuickSlopes, BoxPlotGrid, IRTCurves, LCAProfiles, SpaghettiPlot, CaterpillarPlot,
  ITSPlot, RDPlot, SociogramPlot, TimeSeriesChart, MDSPlot,
} from './charts.jsx';
```

Find the `sociogram` case (any existing case works as an anchor; this one
is a simple, single-purpose case similar in shape to what's being added):

```jsx
    case 'sociogram':
      return inferenceResult?.nodes?.length
        ? <SociogramPlot nodes={inferenceResult.nodes} edges={inferenceResult.edges} />
        : emptyHint('Run Sociogram / enter edge list (A-B,B-C).');
```

Add immediately after it:

```jsx
    case 'mdsplot':
      return inferenceResult?.points?.length
        ? <MDSPlot points={inferenceResult.points} stress={inferenceResult.stress} n={inferenceResult.n} />
        : emptyHint('Run Classical MDS, Sammon Mapping, or Non-Metric MDS with 2+ scale items selected.');
```

- [ ] **Step 6: Add the mode labels**

In `src/utils/vizHelpers.js`, find the `CHART_MODE_LABELS` object's
`sociogram` entry:

```js
  sociogram: 'Sociogram',
```

Add immediately after it:

```js
  sociogram: 'Sociogram',
  mdsplot: 'MDS',
```

Find the `EXPLORE_PANEL_CHART_FOR_MODE` object's `scree` entry:

```js
  scree: 'PCA biplot',
```

Add a corresponding `mdsplot` entry nearby (e.g. immediately after
`sociogram`'s entry in that same object — find it and add after):

```js
  mdsplot: 'PCA biplot',
```

- [ ] **Step 7: Run the full suite**

Run: `pnpm test`
Expected: PASS — in particular `chartMap.test.js`'s "every chart mode
maps to an Explore panel chart id" test, since `mdsplot` isn't referenced
by any `CHART_FOR_TEST` entry yet (that's Task 3) but the mode-label
wiring itself must not break anything already passing.

- [ ] **Step 8: Commit**

```bash
git add src/components/charts.jsx src/components/charts.test.jsx src/components/QuickChart.jsx src/utils/vizHelpers.js
git commit -m "$(cat <<'EOF'
feat: add MDSPlot chart component for computed 2D coordinates

Built on ResponsiveContainer/ComposedChart/Scatter, the same
self-sizing pattern QuickScatter already uses - unlike the older
raw-SVG chart primitives Phase 1 had to retrofit a height prop
onto, this needs no manual width/height threading. Wired into
QuickChart.jsx as a new 'mdsplot' mode and given CHART_MODE_LABELS/
EXPLORE_PANEL_CHART_FOR_MODE entries; no TREE test uses this mode
yet (Task 3).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: MDS tests (3)

**Files:**
- Modify: `src/config/tree.js` (3 new entries in the existing
  `MULTIVARIATE` category)
- Modify: `src/components/InferencePanel.jsx` (import + 3 result branches)
- Modify: `src/components/InferenceConfig.jsx` (3 config entries)
- Modify: `src/components/InferenceResults.jsx` (1 shared result-render
  block covering all 3)
- Modify: `src/config/chartMap.js` (3 entries, all `'mdsplot'`)
- Modify: `src/config/chartMap.test.js` (bump `227` → `230`)
- Modify: `src/config/methodNotes.js` (3 entries)
- Modify: `src/config/fixtures/runners.js` (3 runners)

**Interfaces:**
- Consumes: `classicalMDS`, `sammonMapping`, `nonMetricMDS` from
  `@statlab/core/methods/mds`; `MDSPlot` from Task 2.
- Produces: 3 new TREE ids — `mds_classical`, `mds_sammon`,
  `mds_nonmetric`.

- [ ] **Step 1: Add the TREE entries**

In `src/config/tree.js`, find the `MULTIVARIATE` category's `lda` entry:

```js
      { id: "lda",       label: "Linear Discriminant", tag: "LDA · accuracy · coefficients" },
```

Add immediately after it (before `cronbach`):

```js
      { id: "mds_classical", label: "Classical MDS",   tag: "metric MDS · stress · 2D embedding" },
      { id: "mds_sammon",    label: "Sammon Mapping",  tag: "nonlinear MDS · local-distance weighting" },
      { id: "mds_nonmetric", label: "Non-Metric MDS",  tag: "Kruskal · rank-order MDS" },
```

- [ ] **Step 2: Add the runners**

In `src/config/fixtures/runners.js`, find the `pca`/`efa` runners:

```js
  pca: () => pca(ROWS, VARS),
  efa: () => efa(ROWS, VARS, 2),
```

Add immediately after them:

```js
  mds_classical: () => classicalMDS(ROWS, VARS, { nDimensions: 2 }),
  mds_sammon: () => sammonMapping(ROWS, VARS, { nDimensions: 2 }),
  mds_nonmetric: () => nonMetricMDS(ROWS, VARS, { nDimensions: 2 }),
```

Add the import. Find the multivariate import block:

```js
import {
  pca, efa, cronbachAlpha, splitHalf, icc, cohensKappa,
  metaAnalysis, differencesInDifferences, convertEffectSize,
  manova, canonicalCorr, linearDiscriminant,
} from '@statlab/core/methods/multivariate';
```

Add immediately after it:

```js
import { classicalMDS, sammonMapping, nonMetricMDS } from '@statlab/core/methods/mds';
```

- [ ] **Step 3: Run the contract tests**

Run: `pnpm vitest run src/config/contracts.test.js`
Expected: PASS, including the 3 new MDS ids (2 tests each: "executes
without throw", "returns inference-shaped result").

- [ ] **Step 4: Add the chart mappings and bump the count**

In `src/config/chartMap.js`, find the `SURVEY METHODOLOGY` block added in
Task 1:

```js
  // ── SURVEY METHODOLOGY ──────────────────────────────────────────────
  wmean: 'histogram', wcorr: 'scatterfit', deff: 'histogram', taylor: 'histogram',
};
```

Replace with:

```js
  // ── SURVEY METHODOLOGY ──────────────────────────────────────────────
  wmean: 'histogram', wcorr: 'scatterfit', deff: 'histogram', taylor: 'histogram',
  // ── MDS ──────────────────────────────────────────────────────────────
  mds_classical: 'mdsplot', mds_sammon: 'mdsplot', mds_nonmetric: 'mdsplot',
};
```

In `src/config/chartMap.test.js`, change:

```js
  test('has exactly 227 mappings', () => {
    expect(Object.keys(CHART_FOR_TEST).length).toBe(227);
  });
```

to:

```js
  test('has exactly 230 mappings', () => {
    expect(Object.keys(CHART_FOR_TEST).length).toBe(230);
  });
```

- [ ] **Step 5: Run chartMap.test.js**

Run: `pnpm vitest run src/config/chartMap.test.js`
Expected: PASS.

- [ ] **Step 6: Add the config UI entries**

In `src/components/InferenceConfig.jsx`, find the `pca` entry:

```js
    pca:       <CheckList label="Variables" items={numeric} selected={scaleVars} onChange={setScaleVars} />,
```

Add immediately after it (before `efa`):

```js
    mds_classical: <CheckList label="Variables" items={numeric} selected={scaleVars} onChange={setScaleVars} />,
    mds_sammon:    <CheckList label="Variables" items={numeric} selected={scaleVars} onChange={setScaleVars} />,
    mds_nonmetric: <CheckList label="Variables" items={numeric} selected={scaleVars} onChange={setScaleVars} />,
```

- [ ] **Step 7: Wire the result computation**

In `src/components/InferencePanel.jsx`, add the import. Find:

```js
import { weightedMean, weightedVar, weightedCorrelation, designEffect, taylorLinearization } from '@statlab/core/methods/survey';
```

(added in Task 1) and add immediately after it:

```js
import { classicalMDS, sammonMapping, nonMetricMDS } from '@statlab/core/methods/mds';
```

Find the `pca` result branch:

```js
      if (a === 'pca')       return pca(data, scaleVars.filter(c => numeric.includes(c)));
```

Add immediately after it (before `efa`):

```js
      if (a === 'mds_classical') return classicalMDS(data, scaleVars.filter(c => numeric.includes(c)), { nDimensions: 2 });
      if (a === 'mds_sammon')    return sammonMapping(data, scaleVars.filter(c => numeric.includes(c)), { nDimensions: 2 });
      if (a === 'mds_nonmetric') return nonMetricMDS(data, scaleVars.filter(c => numeric.includes(c)), { nDimensions: 2 });
```

- [ ] **Step 8: Add result rendering**

In `src/components/InferenceResults.jsx`, find the `Taylor Linearization`
block added in Task 1 (its closing `</>}` sits immediately before the
`McDonald's ω` block):

```js
      {r.test === 'Taylor Linearization' && <>
        <SectionHead label={`Taylor Linearization · ${r.nStrata} strata · n=${r.n}`} />
        <Row>
          <Chip label="total" value={r.total} color={C.pos} />
          <Chip label="SE" value={r.se} color={C.dim} />
        </Row>
      </>}

      {r.test === "McDonald's ω" && (
```

Insert between them:

```js
      {(r.test === 'Classical MDS' || r.test === 'Sammon Mapping' || r.test === 'Non-Metric MDS') && <>
        <SectionHead label={`${r.test} · ${r.nDimensions}D · n=${r.n}`} />
        <Row>
          {r.stress != null && <Chip label="stress" value={r.stress} color={r.stress < .1 ? C.ok : r.stress < .2 ? C.warn : C.neg} />}
          <Chip label="dimensions" value={r.nDimensions} color={C.dim} />
        </Row>
      </>}

```

- [ ] **Step 9: Add method notes**

In `src/config/methodNotes.js`, find the 4 entries added in Task 1
(`wmean`/`wcorr`/`deff`/`taylor`) and add immediately after `taylor`'s
closing `},` (still before `METHOD_NOTES`'s own closing `};`):

```js
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
    assumptions: ["Dissimilarities are at least ordinally meaningful", "At least 5 observations, 2+ numeric variables"],
    cite: "Kruskal, J. B. (1964). Nonmetric multidimensional scaling: A numerical method. Psychometrika, 29(2), 115–129.",
  },
```

- [ ] **Step 10: Run the full suite**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add src/config/tree.js src/config/fixtures/runners.js src/config/chartMap.js src/config/chartMap.test.js src/components/InferenceConfig.jsx src/components/InferencePanel.jsx src/components/InferenceResults.jsx src/config/methodNotes.js
git commit -m "$(cat <<'EOF'
feat: add 3 MDS tests (Classical, Sammon, Non-Metric)

Reuses the exact CheckList config control PCA/EFA already use for
"Scale items" (scaleVars), and the new MDSPlot chart component
(Task 2) as their shared AUTO-mode visualization via a new
'mdsplot' chart mode.

Bumps chartMap.test.js's hardcoded mapping-count literal
(227 -> 230) alongside the 3 new CHART_FOR_TEST entries.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Manual verification and spec sign-off

**Files:**
- None (verification only — no code changes expected; if verification
  finds a problem, fix it in the relevant file from Tasks 1-3 and re-run
  this task's checks before continuing).

- [ ] **Step 1: Run the full automated suite one more time**

Run: `pnpm test`
Expected: PASS, zero failures.

- [ ] **Step 2: Build the app**

Run: `pnpm build`
Expected: succeeds with no errors.

- [ ] **Step 3: Preview the production build and manually verify**

Start a preview server (check `.claude/launch.json` for an existing
entry pointing `--prefix` at this worktree on a free port, or add one
following the pattern of prior phases' entries) and, in the Browser pane:

1. Search "Weighted" in the Navigator. Confirm all 4 survey tests appear
   under a "SURVEY METHODOLOGY" section. Select "Weighted Descriptives",
   pick a numeric Value and Weight column, confirm results render (a
   weighted mean/SD/SE and an APA line) with no console errors.
2. Repeat for "Weighted Correlation" (pick X, Y, Weight) and "Design
   Effect" (pick Weight only) — confirm each renders sensible output.
3. Select "Taylor Linearization", pick a numeric Value, a categorical
   Strata, and a categorical PSU/cluster column (using a bundled dataset
   with at least one such column, e.g. a dataset with a "school" or
   "group" field) — confirm it renders a total + SE with no console
   errors, and that changing the dataset without enough distinct
   strata/PSU values degrades gracefully (no crash — `emptyHint`/null
   result, not a thrown error).
4. Search "MDS". Confirm all 3 tests appear in MULTIVARIATE. Select
   "Classical MDS", pick 3+ numeric "Scale items", confirm the AUTO chart
   shows a 2D point scatter (not a blank panel) and the results panel
   shows a stress value and dimension count.
5. Switch between the 3 MDS tests with the same variables selected —
   confirm each renders a visibly different point arrangement (they're
   different algorithms) and the AUTO chart continues to work for all 3
   without needing to manually pick a chart mode from the toolbar.
6. Check `read_console_messages` for errors after each step above.

- [ ] **Step 4: Update the spec's status**

In
`docs/superpowers/specs/2026-09-16-survey-mds-tests-design.md`, update the
`**Status:**` line to note verification is complete, with a short summary
of what was actually checked, or note any deviation found and fixed.

- [ ] **Step 5: Commit the spec update**

```bash
git add docs/superpowers/specs/2026-09-16-survey-mds-tests-design.md
git commit -m "$(cat <<'EOF'
docs: mark survey methodology + MDS tests verification complete

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

**This plan is done when:** all 4 tasks are checked off, `pnpm test` and
`pnpm build` both pass, and the manual pass in Task 4 Step 3 confirms all
7 new tests are reachable, computable, and renderable end-to-end with the
MDS tests' AUTO chart working correctly.
