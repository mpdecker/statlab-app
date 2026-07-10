# StatLab UI Overhaul + Onboarding Tutorial — Design

**Date:** 2026-07-10
**Status:** Approved

## Problem

The current workbench (`src/App.jsx`) packs dataset selection, CSV upload, panel
toggles, and axis pickers into one crowded header row, and shows all 9 built-in
("playground") datasets as individual pills in the top bar. The four content
panels (Navigator, Config, tabbed Inference/Explore content, Quick View) are
arranged left-to-right with no clear reading order, and there is no onboarding
for first-time users — they land on a config-heavy screen with no guidance.

## Goals

1. Reorganize the workbench into a clear four-region layout: left navigator,
   middle visualization, bottom calculation/results band, right collapsible
   advanced settings.
2. Replace the top-bar dataset pill row with a single dataset control that
   opens a browsable "Sample Datasets" picker.
3. Add a first-run guided tutorial using the existing default dataset (Iris)
   and default test (Welch t-test), replayable on demand.

## Non-goals

- No changes to `statlab` computation, `InferenceResults`/`InferenceConfig`
  internals, chart components, CSV parsing, or dataset data files.
- No new built-in dataset — the tutorial reuses Iris via the app's existing
  default initial state.
- The narrow-screen (< 700px) gate is unchanged.

## Architecture

### Top bar

- Wordmark (unchanged).
- **Dataset control**: single pill showing `<Label> · n=<count>`. Click opens
  the Dataset Picker popover (see below). Replaces the `Object.entries(BUILTIN)`
  pill row and the separate custom-dataset pill.
- **`+ CSV`** button: unchanged behavior (opens file input, parses via
  PapaParse, switches to `custom` dataset key).
- **`?` help button**: relaunches the tutorial overlay at step 0 without
  altering current dataset/test state.
- Panel-visibility toggles (`NAV`/`CFG`/`QV`/`FLP`/`RST`) are removed from the
  header. Visibility/collapse now lives on each region (see below); the bottom
  band's expand/collapse replaces `QV`'s role, and there is no more
  independent Quick View side-flip (`FLP`) since Quick View is folded into the
  single Viz region.

### Dataset Picker (Sample Datasets)

- A popover anchored to the top-bar dataset control (not a dedicated tab, per
  explicit decision).
- Lists all entries of `BUILTIN` (Iris, Diamonds, Gapminder, CPS, Salaries,
  Schools, Math Achieve, Sleep Study, Affairs) as rows showing label + `desc`.
  If a custom CSV is currently loaded, it appears pinned at the top marked
  "Current upload".
- Clicking a row calls the existing `switchDs(key)` and closes the popover.
  No new data-loading logic — reuses `BUILTIN`, `loadDataset`, `DATASET_DEFAULTS`
  exactly as today's pill `onClick` does.

### Four-region workbench

Replaces the current `<div style={{ display:'flex' }}>` row of
Navigator/Config/content/QuickView.

```
┌─────────────────────────────────────────────────────────┐
│ Top bar                                                  │
├────────────┬──────────────────────────────────┬──────────┤
│            │  Viz (AUTO / EXPLORE toggle)      │          │
│ Navigator  ├──────────────────────────────────┤ Advanced │
│  (left)    │  Calculation & Interface          │ (right,  │
│            │  (Config | Results, resizable ht) │ collaps.)│
└────────────┴──────────────────────────────────┴──────────┘
```

- **Left — Navigator**: same `Navigator` component from `InferencePanel.jsx`,
  wrapped in the existing `ResizablePanel`, `side="left"` (was `"right"`,
  since it now sits at the true left edge — no Quick View can be positioned
  to its left anymore).
- **Middle-top — Viz**: one region owning a 2-way mode switch, persisted in
  a new `vizMode` state (`'auto' | 'explore'`, default `'auto'`):
  - `auto`: today's `QuickView` component unchanged (chart-icon row, chart,
    stats footer).
  - `explore`: today's `ExplorePanel`, reusing the existing `exploreSeed`
    hand-off (computed the same way `handleTabSwitch('explore')` does today)
    so it opens with variables tied to the active test rather than blank.
  - The mode switch is two small chips (`AUTO` / `EXPLORE`) in the region's
    top-left, replacing the old `['inference','explore']` top-level tab bar.
- **Middle-bottom — Calculation & Interface**: a resizable-height band (drag
  the top edge; collapsible to a thin strip via a chevron) containing, side
  by side:
  - Left column: `InferenceConfig` (test parameters, run/bootstrap/power
    controls) — same component, same props.
  - Right column: `InferenceResults` plus the existing bootstrap/med_bootstrap/
    power special-case blocks currently inlined in `App.jsx`'s content area —
    moved as-is into this column.
  - Height persisted in the same `statlab_panels_v1` localStorage blob used
    by panel widths today.
- **Right — Advanced** (collapsible, default collapsed on first load):
  - Variable mapping: the X/Y/Color `<select>` triplet currently in the
    header, unchanged logic (`setXVar`/`setYVar`/`setColorVar`).
  - Global settings: **alpha only** (`inference.alpha`/`setAlpha`), the one
    setting that is genuinely global (single state in `useInference`). RNG
    seed and B are *not* moved here — each test family (bootstrap, bandits,
    sensitivity analysis, outlier detection, robust regression, missing-data
    imputation, etc.) owns its own independent seed/B state inside
    `InferencePanel.jsx`'s `useInference` hook, so those stay put as part of
    each test's own parameter set in the bottom Config column.
  - A single "Reset panel layout" button (replaces `RST`).

`usePanelLayout`/`defaultPanelLayout` gains a `calc` region (replacing
`quickView`'s width entry with a height entry) and keeps `navigator`/
`config` renamed conceptually to `navigator`/`advanced`; breakpoint behavior
(hide side panels under 1024px, hide advanced under 1400px) is preserved.

### Tutorial / onboarding

- New localStorage key `statlab_tutorial_v1_seen` (independent of
  `statlab_session_v2`), checked once on mount.
- First-time visitors get the tutorial automatically; it rides on the app's
  existing default initial state (`dsKey: 'iris'`, `activeTest: 't_welch'`,
  `xVar/yVar/colorVar` = sepalLength/petalLength/species) — no special
  tutorial-only data path.
- Implemented as a self-contained overlay component (no new dependency):
  a dimmed backdrop with a "spotlight" cut-out over the current step's target
  region (found via `data-tutorial-target` attributes added to the four
  regions + the dataset control) and a caption box with Back/Next/Skip and a
  step-dot indicator.
- Steps: (1) Welcome, (2) Navigator — "pick a statistical test", (3) Viz —
  "see your data plotted live, or switch to Explore for free-form charts",
  (4) Calculation band — "set parameters and read APA-ready results",
  (5) Advanced panel — opened programmatically for this step only, then
  restored to its prior collapsed/expanded state — "variable mapping and
  global settings", (6) Dataset control — "try other sample datasets anytime".
- Finishing (via last step or Skip) sets the seen flag. The header `?` button
  clears nothing in storage but re-runs the same overlay from step 0 on
  demand.

## Testing

- Existing test suites (`ExplorePanel.test.jsx`, `InferencePanel.test.jsx`,
  `InferenceConfig.test.jsx`, `InferenceResults.test.jsx`, `ui.test.jsx`) are
  unaffected at the component level since none of `Navigator`,
  `InferenceConfig`, `InferenceResults`, `ExplorePanel` change their own
  props/behavior — only their position in `App.jsx` changes.
- New tests: dataset picker popover open/select/close; vizMode toggle renders
  the right sub-component and preserves seed hand-off; tutorial overlay
  first-run auto-show, step navigation, skip/finish persistence, replay via
  `?` button; bottom band resize/collapse persistence.
- Manual verification in a running dev server: clear localStorage, reload,
  confirm tutorial appears over the real default layout; step through all six
  steps; reload again and confirm it does not reappear; click `?` and confirm
  it replays; open dataset picker and switch datasets; toggle AUTO/EXPLORE.
