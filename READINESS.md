# Readiness scorecard

| Gate | Status | Notes |
|------|--------|-------|
| CI | yes | `.github/workflows/ci.yml` runs `npm test` + `npm run build` on Node 20/22 |
| Tests | pass | 4,610 lib + 323 app tests pass; both builds succeed |
| .env.example | n/a | browser-only SPA, zero environment variables |
| DEPLOY.md | deep | rewritten 2026-07-06 for the monorepo layout |
| Billing | none | |
| Last verified | 2026-07-06 | full audit: package oracle adherence + live UI/UX pass, fixes applied |

## Next blocker

Pick a static host (Vercel/Netlify/Cloudflare Pages) and get a live URL. CI also needs merging to `main` (currently only on a feature branch).

## Latest UI/UX pass (2026-07-06)

Ran the app live in-browser rather than just reading source. Found and fixed:
- 13 spots across `app/src/App.jsx` where Unicode glyphs (icons, middot separators, ×, …) were written as bare JSX text instead of JS string literals, so React rendered the literal `\uXXXX` escape text instead of the glyph — affected the toolbar icons, header subtitle, CSV button, landing page footer, and several inference-panel labels. All wrapped in string literals; added missing `aria-label`s on the icon-only toolbar buttons.
- No responsive layout below ~700px — added a dismissible "works best on a larger screen" gate rather than attempting a full responsive redesign of the multi-panel workbench.
- Cohen's d sign was inconsistent between the APA-7 copy-paste string (unsigned) and the on-screen stat card (signed) for Welch/one-sample t-tests — standardized on signed `d` everywhere to match `zTest`/`cohensD`, which already used the signed convention.

## Release ETA

Medium
