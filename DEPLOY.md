# statlab — deployment

_Last updated: 2026-07-06 (post-extraction audit pass)_

## Stack

npm-workspaces monorepo (repo root `Statlab/`, remote `github.com/mpdecker/Statlab`):

- `packages/statlab` — the dependency-free stats engine (publishable npm package)
- `app` — the browser-only Vite + React SPA that consumes the engine

The app is a pure client-side SPA. No backend, no server, no environment
variables — all computation runs in the browser.

## Prerequisites

- Node 18+ and npm 9+ (workspaces support)
- No secrets, no `.env` file — the app has zero environment variables

## Local dev

```bash
cd Statlab
npm ci
npm run dev        # serves the app (vite) at the printed localhost URL
```

## Build & test

```bash
npm test           # runs library tests then app tests
npm run build      # builds the statlab package, then the app (app/dist)
```

Individual workspaces: `npm run test:lib` / `npm run test:app`,
`npm run build:lib` / `npm run build:app`.

## Host

Static hosting of the app build. Point the host at the `app` workspace with
build command `npm run build` and output directory `app/dist` (Vercel,
Netlify, Cloudflare Pages, or any static host). No runtime config required.

The `packages/statlab` engine can be published separately to npm
(`npm publish -w statlab`) once versioned.

## Smoke check

- [ ] `npm run dev` starts and the app loads in the browser
- [ ] `npm test` exits 0
- [ ] `npm run build` succeeds and `app/dist` is produced

## Rollback

Redeploy the previous static build (Vercel/Netlify promotion rollback to the
prior deployment).
