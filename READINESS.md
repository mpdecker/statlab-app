# Readiness scorecard

| Gate | Status | Notes |
|------|--------|-------|
| CI | yes | `.github/workflows/ci.yml` runs `npm test` + `npm run build` on Node 20/22 |
| Tests | pass | 4,610 lib + 323 app tests pass; both builds succeed |
| .env.example | n/a | browser-only SPA, zero environment variables |
| DEPLOY.md | deep | rewritten 2026-07-06 for the monorepo layout |
| Billing | none | |
| Last verified | 2026-07-06 | full audit: package oracle adherence + app regression check |

## Next blocker

Pick a static host (Vercel/Netlify/Cloudflare Pages) and get a live URL.

## Release ETA

Medium
