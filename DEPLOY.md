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

### CI deploy secrets (required, not yet set as of 2026-07-11)

The `deploy` job in `.github/workflows/ci.yml` needs two **GitHub repository
secrets** (Settings → Secrets and variables → Actions) — these are CI/CD
credentials for `wrangler`, not app runtime config (the app itself still has
zero environment variables, per Prerequisites above):

- `CLOUDFLARE_API_TOKEN` — a token with "Cloudflare Pages: Edit" permission
  for the account that owns the `statlab` Pages project
  (developers.cloudflare.com/fundamentals/api/get-started/create-token/)
- `CLOUDFLARE_ACCOUNT_ID` — found on the Cloudflare dashboard's Workers &
  Pages overview page

Without both secrets, `wrangler pages deploy` fails immediately with
`CLOUDFLARE_API_TOKEN environment variable` errors — every push-to-main CI
run has failed this way since the deploy job was added. Add both secrets,
then re-run the failed workflow (or push again) to deploy. **The current
live site predates this CI job and was uploaded from an un-built source
directory** (it serves raw `/src/main.jsx` instead of a compiled bundle,
so it renders blank) — the first successful CI deploy after adding these
secrets will replace it with a correct build automatically.

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
