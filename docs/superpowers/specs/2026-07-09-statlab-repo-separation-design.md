# StatLab repo separation — design spec

**Date:** 2026-07-09
**Status:** Approved by owner (Matthieu Decker), ready for implementation planning.

## Goal

Currently this repo (`github.com/mpdecker/Statlab`) is a pnpm workspace monorepo containing
two packages: `packages/statlab` (the dependency-free stats engine, per
[`EXTRACTION-PLAN.md`](../../../EXTRACTION-PLAN.md)) and `app` (the Vite React explorer that
consumes it via `workspace:*`). We're splitting these into two fully independent git
repositories:

- **`github.com/mpdecker/statlab`** — the library, published to the public npm registry as
  `statlab`.
- **`github.com/mpdecker/statlab-app`** (this repo, renamed) — the webapp, depending on the
  published `statlab` npm package like any other consumer.

No more `workspace:*` linkage. The two repos are decoupled: the app installs `statlab` from
npm; the library repo has no knowledge of the app.

## Decisions made

| Question | Decision |
|---|---|
| How does the app consume statlab? | Published to public npm registry as `statlab` (name confirmed available — `npm view statlab` returns 404). |
| New repo location / history | New repo `mpdecker/statlab`; history preserved via `git subtree split --prefix=packages/statlab`. |
| Repo naming | New repo: `statlab` (matches npm package name). This repo renamed: `Statlab` → `statlab-app`. |
| Publish mechanism | GitHub Actions publishes to npm on `v*` tag push. Owner adds `NPM_TOKEN` secret manually. |
| Initial published version | `0.1.0` (matches current `packages/statlab/package.json`; signals API may still shift post-extraction, despite BASELINE.md's rigor audit being complete). |
| App layout after split | Flatten `app/*` up to this repo's root; drop the pnpm-workspace wrapper entirely. |
| Who creates the new GitHub repo | Owner creates `mpdecker/statlab` on GitHub and hands the URL/confirmation to proceed; agent pushes the extracted history to it. |

## Key finding that de-risks this

The app already imports statlab via its published subpath export map, not deep relative
paths:

```js
import { tWelch, tOne } from 'statlab/methods/means';
import { avg, sampleSD } from 'statlab/math/core';
```

`packages/statlab/package.json`'s `exports` map already defines every one of these subpaths
(`./methods/means`, `./math/core`, etc.) pointing at `./src/...`. Since the published package
will ship the same `exports` map, **no app source files need their import statements
changed** — only `package.json`'s dependency line (`"statlab": "workspace:*"` →
`"statlab": "^0.1.0"`) and the install source change.

## Part 1 — New repo: `statlab`

Repo root becomes the flattened contents of today's `packages/statlab/`:

```
statlab/
├─ src/
│  ├─ math/           (core, distributions, inference, matrix, power, rng)
│  ├─ methods/         (84 modules)
│  └─ index.js          (generated namespaced barrel)
├─ package.json
├─ tsconfig.json, tsconfig.ci.json
├─ tsup.config.js
├─ vitest.config.js
├─ eslint.config.js
├─ LICENSE, README.md
├─ AUDIT.md, BASELINE.md, EXTRACTION-PLAN.md   (moved from repo root — they document the engine's rigor/history)
└─ scripts/
   ├─ gen-barrel.mjs
   ├─ dump-fixtures.mjs
   ├─ generate-reference.mjs
   ├─ gen-reference.py, gen-reference.R, requirements.txt
   └─ document.mjs
```

- **History**: extracted via `git subtree split --prefix=packages/statlab -b statlab-extract`
  from this repo, so per-file blame/log for the library survives the move.
- **`package.json` changes**: `repository` field updated to point at
  `github.com/mpdecker/statlab`; script paths (`../../scripts/gen-barrel.mjs` etc.) rewritten
  to the flat layout (`./scripts/gen-barrel.mjs`); version stays `0.1.0`. Everything else
  (`exports` map, `files`, zero `dependencies`) carries over unchanged.
- **Scripts**: any root script that references `packages/statlab/...` paths (`gen-barrel.mjs`,
  `dump-fixtures.mjs`, `generate-reference.mjs`, `gen-reference.py`) moves into this repo with
  paths rewritten to the flat layout. `scripts/statlab.mjs` (the docs-search CLI) and the
  one-off `_add-jsdoc.mjs`/`_fix-data-params.mjs`/`_gen-jsdoc-spec.mjs`/`_merge-jsdoc-tags.mjs`
  migration scripts stay behind in the app repo's history (or are dropped) — they're either
  app-repo tooling or already-applied one-off migrations, not needed for the library's ongoing
  build.
- **CI** (`.github/workflows/ci.yml`): adapted from this repo's current jobs
  (test-build/lint/typecheck/coverage/pack-verify), with `pnpm --filter statlab` /
  `pnpm -r` workspace filtering removed since it's a single package now.
- **New `.github/workflows/publish.yml`**: triggered on `v*` tag push. Runs install → test →
  build → `npm publish`, gated on an `NPM_TOKEN` repository secret that the owner adds via the
  npm registry UI (`npm token create`) and GitHub repo settings. This agent cannot create npm
  tokens or add secrets — the owner does this step manually; the plan will include exact
  instructions.

## Part 2 — This repo becomes `statlab-app`

- `packages/statlab/` deleted. `pnpm-workspace.yaml` deleted (no longer a workspace).
- `app/*` flattened to repo root:
  - `app/src` → `src`
  - `app/index.html`, `app/index.jsx` → root
  - `app/vite.config.js`, `app/vitest.config.js` → root
  - `app/package.json` becomes the (only) root `package.json` — name stays `statlab-app`
    (unchanged), `"statlab": "workspace:*"` → `"statlab": "^0.1.0"`.
- Root `package.json` scripts simplify: no more `pnpm --filter`/`pnpm -r` indirection —
  `build`, `test`, `dev` etc. run directly against the flattened app.
- **GitHub repo rename**: `mpdecker/Statlab` → `mpdecker/statlab-app` via `gh repo rename`,
  done as an explicit confirmed step (not silently).
- **CI** (`ci.yml`): drop workspace filters; the Cloudflare Pages deploy step's build path
  changes from `app/dist` to `dist`.
- **Root docs**: `README.md` rewritten to describe the app only (drop the embedded engine
  architecture section; link to the published `statlab` npm package for engine docs).
  `DEPLOY.md`, `READINESS.md`, `RUNBOOK.md` updated to remove monorepo/workspace language.
  `AUDIT.md`, `BASELINE.md`, `EXTRACTION-PLAN.md` removed from this repo (they now live in the
  `statlab` repo, per Part 1) — `EXTRACTION-PLAN.md` is superseded by this spec anyway.

## Part 3 — Migration sequence

Order matters because the app needs a **published** `statlab` to depend on before it can drop
the workspace link:

1. On a branch in this repo: `git subtree split --prefix=packages/statlab -b statlab-extract`.
2. Owner creates the empty `github.com/mpdecker/statlab` repo and confirms the URL. Agent
   pushes `statlab-extract` to it as `main`.
3. In the new repo: apply the Part 1 adjustments (package.json paths, CI, publish workflow),
   commit, tag `v0.1.0`, push tag → CI publishes `statlab@0.1.0` to npm (blocked until owner
   adds `NPM_TOKEN` secret).
4. Verify: `npm view statlab` shows the real package; `npm install statlab` in a scratch
   directory resolves the expected `exports` map (spot-check a few subpaths).
5. Back in this repo (on a branch): delete `packages/statlab`, flatten `app/` to root, swap
   dependency to `"statlab": "^0.1.0"`, `pnpm install`, `pnpm build`, `pnpm test` — confirming
   the app builds/tests green against the real published package, not a local link.
6. Update CI/deploy paths in this repo.
7. Confirm with owner, then: merge, rename this GitHub repo to `statlab-app`.

## Addendum (found during planning): fixture coupling

`app/src/config/contracts.test.js` imports `runners.js` and `helpers.js` via relative path
from `packages/statlab/src/methods/fixtures/` and `packages/statlab/src/methods/__fixtures__/`
— internal test-harness files explicitly excluded from the npm `files` allowlist. `runners.js`
itself imports fixture-data generators from sibling files `core.js`/`phase3.js` (also excluded,
also used by 13+ of the library's own `*.test.js` files, so they must stay in the library repo
too). Once the app depends on published `statlab` instead of a workspace link, this relative
import breaks.

**Resolution**: copy (not move) `runners.js`, `helpers.js`, `core.js`, `phase3.js` (~930 lines
total, deterministic synthetic-data generators, no runtime deps) into the app repo under
`src/config/fixtures/`. Rewrite `runners.js`'s ~30 import lines from relative engine paths
(`../means.js`, `../anova.js`, …) to public package imports (`statlab/methods/means`,
`statlab/methods/anova`, …) — the same pattern already used everywhere else in the app.
Originals stay untouched in the `statlab` repo for its own internal test suite and
`scripts/gen-reference.py` tooling. Full test coverage preserved; both repos fully decoupled.

## Out of scope

- No changes to the app's UI/behavior or statistical methods — this is a repository/build-topology
  change plus the fixture-decoupling addendum above.
- No decision made yet about deprecating/archiving vs. deleting `packages/statlab` from this
  repo's git history beyond the normal commit that removes it (history stays intact via normal
  git log; no history rewriting of *this* repo).
- Types (hand-written JSDoc vs. loose auto-generated `.d.ts`) — already resolved separately per
  recent commits (`0 typecheck errors`); not part of this spec.
