# StatLab — npm Package Extraction Plan

**Date:** 2026-07-01
**Precondition met:** the scientific-rigor blocker is closed — all 118 `BASELINE.md` fix-list items are ✅ FIXED, 4,762 tests pass. The only remaining release blocker is that this repo is a **Vite React application**, not a library. This plan turns the statistics engine into a publishable npm package without disturbing the app.

---

## 1. What we're extracting (and what we're not)

**The engine is already cleanly separable.** Verified facts:

- **90 source files** compose the engine: 84 method modules in `src/tests/` + 6 primitives in `src/math/` (`core`, `distributions`, `inference`, `matrix`, `power`, `rng`).
- **31,700 LOC, 1,102 exported functions.**
- **Zero coupling to the app:** no engine file imports `react`, `recharts`, `*.jsx`, `components/`, `data/`, `config/`, `palette`, or `App`. (`grep` confirmed empty.)
- **Pure ESM, runtime-agnostic:** no `window`/`document`/`localStorage`/`fetch` globals (the `window` hits are all parameter names). Runs unchanged under Node.
- The engine is consumed by the app in exactly one place: `src/components/InferencePanel.jsx`.

**Not extracted:** the React explorer (`index.jsx`, `src/App.jsx`, `src/components/*`, `src/data/*`, `src/config/*`, `src/palette.js`). It stays as an app that *depends on* the library.

### Two naming problems to fix first

1. **The engine lives in a directory called `tests/`.** The 84 method modules are `src/tests/ecology.js`, `src/tests/survival.js`, … while the *actual* unit tests are the co-located `*.test.js` files. This is actively misleading for a published package. **Rename `src/tests/` → `src/methods/`** (engine) and keep the `*.test.js` files (either co-located or moved to `test/`).
2. **25 exported names collide across modules** (`egarch` in `finance` + `timeseries`; `hausmanTest` in `econometric` + `multilevel`; `bootstrapCI`, `shapiroWilk`, `winsorize`, `vecm`, …). A flat `export *` barrel is therefore impossible. **The public API must be namespaced by module.**

---

## 2. Target package shape

Recommended: a lightweight **npm-workspaces monorepo** so the library and the app live in one repo but publish/deploy independently.

```
statlab/
├─ package.json                 # workspaces root, private:true
├─ packages/
│  └─ statlab/                  # the published library
│     ├─ package.json           # name, exports, types, files, license
│     ├─ src/
│     │  ├─ math/               # moved from src/math
│     │  ├─ methods/            # moved from src/tests (RENAMED)
│     │  └─ index.js            # namespaced barrel (generated)
│     ├─ test/                  # the *.test.js suite (4,762 tests)
│     └─ dist/                  # build output (esm + cjs + .d.ts)
└─ app/                         # the Vite React explorer
   ├─ package.json              # depends on "statlab": "workspace:*"
   ├─ index.html, index.jsx
   └─ src/                      # App.jsx, components, data, config, palette
```

If a monorepo is unwanted, the minimal alternative is to publish from the current layout with a `files` allowlist (`src/math`, `src/methods`, `src/index.js`) and leave the app in place — but the directory rename and namespaced barrel are still required.

### Public API design (namespaced)

`src/index.js` (generate it, don't hand-maintain — one line per module):

```js
export * as math         from './math/core.js';
export * as distributions from './math/distributions.js';
export * as anova        from './methods/anova.js';
export * as survival     from './methods/survival.js';
export * as ecology      from './methods/ecology.js';
// … one per module
```

Consumer usage: `import { survival, ecology } from 'statlab';` → `survival.coxPH(...)`, `ecology.adonis2(...)`. Namespacing resolves all 25 collisions and gives clean tree-shakeable subpaths.

### `package.json` for the library

```jsonc
{
  "name": "statlab",                       // or a scoped @owner/statlab
  "version": "1.0.0",                      // reset from app's 6.0.0 (new artifact, semver from scratch)
  "description": "A large, dependency-free statistics & modeling library for JS/TS.",
  "type": "module",
  "license": "MIT",                        // DECISION NEEDED — currently no license field
  "sideEffects": false,                    // pure functions → aggressive tree-shaking
  "files": ["dist", "src"],
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js", "require": "./dist/index.cjs" },
    "./survival": { "import": "./dist/methods/survival.js", "types": "./dist/methods/survival.d.ts" },
    "./ecology":  { "import": "./dist/methods/ecology.js",  "types": "./dist/methods/ecology.d.ts" }
    // … per-module subpaths (generated alongside the barrel)
  },
  "sideEffects": false,
  "repository": "…", "keywords": ["statistics","regression","bayesian","survival","econometrics"],
  "dependencies": {},                      // ZERO runtime deps — a selling point
  "scripts": { "build": "tsup", "test": "vitest run" }
}
```

Note: the library has **no runtime dependencies** — `papaparse`/`react`/`recharts` belong to the app only. That is a genuine strength; keep it.

---

## 3. Build & types

- **Bundler:** `tsup` (esbuild-based). Emits ESM + CJS + per-entry chunks with `entry: ['src/index.js', 'src/methods/*.js', 'src/math/*.js']`, `format: ['esm','cjs']`, `dts: true`, `treeshake: true`.
- **Types:** the code is plain JS with no annotations, so auto-generated `.d.ts` will be mostly `any`. Two options, in order of effort:
  1. **Ship v1 without hand-written types** (generate loose `.d.ts` via `tsc --allowJs --declaration --emitDeclarationOnly`). Every function is callable and documented; params are `any`. Acceptable for a first release.
  2. **Add JSDoc `@param`/`@returns` types** to the ~1,102 functions incrementally and let `tsc` emit real declarations. This is the long-tail quality work; do it module-by-module, highest-traffic first (means, regression, anova, survival, categorical).
- **CJS caveat:** everything is ESM today; `tsup` handles the CJS transpile. No code changes needed.

---

## 4. Scope decision: one package or a "core" subset

The original audit floated publishing only a `statlab-core` (Tier-1 verified) subset. **That is no longer necessary** — the fabricated/broken methods are all fixed and each has a DGP test. Recommended:

- **Ship the whole engine as one package**, but be honest in the docs about the `WEAK / APPROX` tail (see `BASELINE.md`): normal-approx criticals in `equivalenceT`/`sampleSizeT`, one-term asymptotic KS p-values, SUR/3SLS only exact under shared regressors, `cointegration` without MacKinnon critical values, `arellanoBond` simplified. Add a JSDoc `@remarks Approximation: …` to each so it surfaces in editor tooltips and generated docs.
- Tag each function's rigor level in generated docs using the existing `BASELINE.md` classification (VERIFIED / REAL / APPROX). Consider a machine-readable `rigor.json` manifest exported from the audit so the docs and a future `statlab.methodInfo(name)` helper stay in sync.

---

## 5. Release gate (the real quality bar)

Do **not** treat "4,762 tests pass" as release-ready proof of numerical correctness — most are shape/contract tests. Per `AUDIT.md` remediation #3, the gate is **independent numeric oracles**:

- Expand `src/tests/__fixtures__/reference.json` (currently ~30 oracle-backed functions) toward every headline method, with values from **R / scipy / statsmodels** (not self-snapshots). `scripts/gen-reference.R` already exists — extend it.
- Prioritize the modules people will actually call first: means, regression, anova, categorical, survival, multivariate, bayesian, nonparametric, timeseries(univariate).
- CI: run `vitest run` + a lint that fails on any new `se: 0.1` / `p: 0.05` / `break`-on-iter-0 fabrication signature (the patterns from the audit) to prevent regressions.

---

## 6. Sequenced execution

1. **Add npm workspaces root + `app/` and `packages/statlab/` skeletons.** Move files with `git mv` to preserve history.
2. **Rename `src/tests/` → `packages/statlab/src/methods/`;** move `src/math` → `packages/statlab/src/math`; move `*.test.js` into the library's `test/`. Fix the relative imports (mechanical: `./x.js` stays co-located; app→lib imports become `from 'statlab'`).
3. **Generate `src/index.js` namespaced barrel + per-module `exports` map** with a small codegen script (list modules, emit `export * as <name>`).
4. **Repoint the app** (`InferencePanel.jsx`) to `import { … } from 'statlab'` and confirm the app still builds/runs.
5. **Write the library `package.json`** (fields above), pick a **license**, add `tsup` build, wire `vitest`.
6. **Green build:** `npm run build` in the package, `npm test` (4,762), app `vite build`. `npm pack` and inspect the tarball (only `dist` + `src`, no app).
7. **Docs:** point `scripts/document.mjs` at `packages/statlab/src/methods`, emit an API reference annotated with the `BASELINE.md` rigor tiers.
8. **Publish `1.0.0`** once the oracle-expansion gate (§5) covers the headline modules; ship earlier as `0.x` if you want feedback before committing to a stable API.

---

## Open decisions for the owner

- **License** — there is currently no `license` field. MIT is the conventional default for a library like this; confirm.
- **Package name** — bare `statlab` (check npm availability) vs a scoped `@owner/statlab`.
- **Monorepo vs single-package** — recommended monorepo; single-package-with-`files`-allowlist is the lighter fallback.
- **Types now vs later** — ship loose auto-generated `.d.ts` in v1, or delay v1 until JSDoc types exist for the headline modules.
- **Initial version** — reset to `1.0.0`/`0.1.0` for the new artifact (the app's `6.0.0` history doesn't apply to the library's public API).
