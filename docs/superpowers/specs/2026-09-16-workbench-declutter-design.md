# StatLab Navigator + Toolbar Decluttering — Design

**Date:** 2026-09-16
**Status:** Approved
**Phase:** 2 of 2 (follows [2026-09-15-viz-rendering-correctness-design.md](./2026-09-15-viz-rendering-correctness-design.md), which fixed the crash/sizing bugs this phase's layout work builds on top of)

## Problem

statlab.fyi's workbench feels "way too busy." Two regions account for most of
that, both confirmed during Phase 1's investigation:

1. **Navigator** lists all 36 test categories flat and always visible, each
   prefixed with a cryptic 1-2 character glyph (`Ρ`, `Β`, `Σ`, `Ψ`, `⊂`,
   `BD`, `Lk`, `Po`, `⌖`...) from a hand-maintained `CAT_ICON` map
   (`InferencePanel.jsx:178`). That map's own in-code comment documents it
   has already silently dropped icons for new/renamed categories **twice**
   (12 of 32 categories once, and — per source inspection during this
   phase's investigation — categories added after that fix, like
   `DISTANCE & DEPENDENCE`, again have no entry today). The header also
   shows a stale `"84 modules"` / `"Search 84 tests..."` when the app
   actually has 221 tests across 36 categories.
2. **Toolbar** (the AUTO-mode chart-type switcher) shows 9 buttons as
   3-letter abbreviations (`VLN`, `BOX`, `SCT`, `HST`, `BCI`, `HM`, `MOS`,
   `TS`, `BST`) with no visible label — the full name only appears on hover.

## Goals

1. Navigator shows a manageable, scannable set of categories by default,
   with the long tail available but not competing for attention.
2. Kill the stale `"84 modules"` count and the drift-prone `CAT_ICON` map —
   not just fix their current values, but remove the maintenance burden
   that caused them to rot in the first place.
3. Toolbar buttons are self-explanatory without a hover.
4. Zero new hand-maintained per-category metadata. The two bugs above are
   the same root cause (a manually-kept map keyed by category name,
   invisible until it silently drops something) — the fix must not
   reproduce that pattern under a new name.

## Non-goals

- No change to the Calculation & Interface band or the Advanced panel
  (explicit scope decision — both are already reasonably organized:
  progressive disclosure via existing config/results tabs, and the
  Advanced panel is already collapsed by default).
- No change to `statlab` computation, chart components, or anything
  touched in Phase 1.
- No new build/runtime dependency.
- Not a visual reskin — same palette, same fonts, same overall four-region
  workbench layout from the July 2026 UI overhaul
  (`2026-07-10-ui-overhaul-onboarding-design.md`). This is decluttering
  within that structure, not replacing it.

## Approach

### Navigator: Core / More grouping

`src/config/testCategories.js` already defines `HEADLINE_CATS` — 13
categories the landing page treats as "common enough to list individually,"
with everything else rolled into one `"DIAGNOSTICS & TOOLS"` summary row.
That's the exact same problem (36 categories is too many to show flat) the
landing page already solved, using a rule the product has already
committed to. Reuse it rather than inventing a second, competing notion of
"core" for the in-app Navigator:

- `testCategories.js` gains a new export, `CORE_CATEGORY_NAMES` — a `Set`
  built from `HEADLINE_CATS.map(h => h.cat)`. `TEST_CATEGORIES` (the
  landing page's summary rows) and the Navigator's grouping now both
  derive from the same `HEADLINE_CATS` array — one list, two consumers,
  provably impossible to drift apart because there's only one place to
  edit.
- `Navigator` (`InferencePanel.jsx`) partitions `filteredTree` into
  `coreCats` (categories in `CORE_CATEGORY_NAMES`) and `moreCats`
  (everything else — the remaining ~23), preserving each list's existing
  relative order from `TREE`.
- Two sticky section headers render above their respective category
  lists: `"CORE"` and `` `MORE CATEGORIES (${moreCats count})` ``. Both
  use the same toggle mechanism the component already has for individual
  categories — `expandedCats` is a `Set<string>` of expanded names; a
  section header is just one more entry in that same set
  (`'__core__'`/`'__more__'` sentinel keys), not a new state shape.
- Initial state: `'__core__'` starts in `expandedCats` (Core section open
  by default), `'__more__'` does not (More section starts collapsed).
  Individual category open/closed state within each section is unchanged
  from today.
- Search is unaffected: `isExpanded()` already forces everything open
  while `searchQuery` is non-empty, so a query still surfaces a match
  in "More categories" immediately, with no extra click.
- Favorites/Recent sections are unaffected — they render above the
  category list today and aren't part of this grouping.

### Navigator: remove the drift-prone metadata

- Delete `CAT_ICON` and its call site
  (`{CAT_ICON[cat.cat] ? CAT_ICON[cat.cat] + ' ' : ''}` in the category
  header). Nothing replaces it: the header already renders the category
  name in `cat.color` (a per-category color already defined in `tree.js`,
  used nowhere near as inconsistently as the icon map) plus a `(count)`.
  That combination is enough to tell categories apart visually — the
  glyph added a second, uncoordinated visual signal without adding
  information, and its failure mode (silently missing) is worse than not
  having it. There is deliberately no replacement icon system, because
  any hand-maintained per-category map reproduces the exact bug this
  fixes.
- Both the search placeholder (`"Search 84 tests..."`) and the idle count
  (`'84 modules'`) switch to the already-exported, already-correct
  `TOTAL_TEST_COUNT` from `testCategories.js`, e.g.
  `` `Search ${TOTAL_TEST_COUNT} tests...` `` and
  `` `${TOTAL_TEST_COUNT} modules` ``. This can never go stale again: it's
  computed from `TREE.length`, not typed by hand.

### Toolbar: full labels

`CHART_ICONS` (`Workbench.jsx`) already carries a full-word `title` for
every button (`"Violin"`, `"Correlogram heatmap"`, `"Time series"`...) —
today only used as the HTML `title` hover attribute. The button's visible
text switches from the abbreviated `label` field to that same `title`
field; `label` stays in the data (unused) rather than being deleted, to
keep the diff to the render line only. The button row's container
(`QuickView`'s `chartIcons`) already has `flexWrap: 'wrap'` set, so longer
labels already wrap to a second line on a narrower panel instead of
overflowing or forcing horizontal scroll — no layout change needed there,
confirmed by reading the current source rather than assumed.

## Testing

- `testCategories.js`: a test asserting `CORE_CATEGORY_NAMES` contains
  exactly `HEADLINE_CATS`'s category names (guards the single-source-of-
  truth property directly, not just a snapshot of today's 13).
- `InferencePanel.test.jsx` (extended): a core category (e.g. "COMPARE
  MEANS") is visible in the Navigator without any interaction; a
  long-tail category (e.g. "PRIVACY") is not visible until "More
  categories" is expanded; the search placeholder and idle count both
  reflect `TOTAL_TEST_COUNT`, not a literal `84`.
- Toolbar: a test asserting each `CHART_ICONS` button renders its full
  `title` text (e.g. "Correlogram heatmap"), not the abbreviation.
- Full `pnpm test` stays green throughout.
- Manual pass in the Browser preview: confirm Core/More collapse-expand
  works, search still surfaces a "More categories" result immediately,
  and the toolbar wraps sanely at a narrower viewport width.
