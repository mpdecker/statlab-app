# statlab-app — deployment

_Last updated: 2026-07-10 (repo separation: statlab engine moved to its own repo/npm package)_

## Stack

Single-package Vite + React SPA (repo root `statlab-app/`, remote
`github.com/mpdecker/statlab-app`), depending on the `statlab` npm package
(published from the separate `github.com/mpdecker/statlab` repo) for all
statistical computation.

The app is a pure client-side SPA. No backend, no server, no environment
variables — all computation runs in the browser.

## Prerequisites

- Node 18+ and pnpm
- No secrets, no `.env` file — the app has zero environment variables

## Local dev

```bash
cd statlab-app
pnpm install
pnpm dev            # serves the app (vite) at the printed localhost URL
```

## Build & test

```bash
pnpm test           # runs the app test suite
pnpm build          # builds the app to dist/
```

## Host

Static hosting of the app build at **https://statlab-3z6.pages.dev** via Cloudflare
Pages direct upload (`npx wrangler@4 pages deploy dist`). CI builds with
`pnpm build` on push to `main`, then deploys `dist`. No `wrangler.toml`, no
Worker script, and do not connect this repo to **Workers Builds** in the
Cloudflare dashboard.

Other static hosts (Netlify, etc.) can use build command `pnpm build` and output
directory `dist`. No runtime config required.

The statistics engine (`statlab` on npm) is a separate package published from
[`github.com/mpdecker/statlab`](https://github.com/mpdecker/statlab).

## Smoke check

- [ ] `pnpm dev` starts and the app loads in the browser
- [ ] `pnpm test` exits 0
- [ ] `pnpm build` succeeds and `dist` is produced

## Rollback

Redeploy the previous static build (Cloudflare Pages deployment history or host
promotion rollback to the prior deployment).
