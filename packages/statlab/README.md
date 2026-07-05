# statlab

A large, **dependency-free** statistics & modeling library for JavaScript/TypeScript.
84 method modules + 6 numerical primitives — regression, ANOVA, survival,
econometrics, multivariate, Bayesian, nonparametric, time series, and much more.
Pure ESM, runtime-agnostic (runs unchanged in Node and the browser), ships ESM + CJS.

## Install

```sh
npm install statlab
```

Zero runtime dependencies.

## Usage

The public API is **namespaced by module** (this resolves function-name
collisions across modules — e.g. `bootstrapCI`, `hausmanTest`, `egarch` each
appear in more than one module).

```js
// Namespaced barrel
import { survival, anova, core } from 'statlab';

survival.coxPH(/* … */);
anova.oneWayANOVA(/* … */);
core.avg([1, 2, 3]);

// Or import a single module directly (tree-shakeable subpath)
import { coxPH } from 'statlab/methods/survival';
import { avg } from 'statlab/math/core';
```

CommonJS works too:

```js
const { survival } = require('statlab');
```

### Module layout

- `statlab/math/*` — numerical primitives: `core`, `distributions`, `inference`,
  `matrix`, `power`, `rng`.
- `statlab/methods/*` — the 84 statistical method modules (`anova`, `regression`,
  `survival`, `ecology`, `econometric`, `sem`, `bayesian`, …).

> Note: two modules share the basename `power`. In the barrel, the low-level
> primitives are `power` (`statlab/math/power`) and the power-analysis methods are
> `powerAnalysis` (`statlab/methods/power`).

## Accuracy & rigor

Every headline method is covered by tests, many against independent numeric
oracles (R / scipy / statsmodels). Some methods in the long tail use documented
approximations (normal-approx criticals, one-term asymptotic p-values, etc.) —
see the repository's `BASELINE.md` for the per-method rigor classification.

## Types

v0.x ships auto-generated `.d.ts` declarations; parameter types are currently
loose (`any`). Precise JSDoc-derived types are being added module-by-module.

## License

[MIT](./LICENSE)
