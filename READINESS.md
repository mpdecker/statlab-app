# Readiness scorecard

| Gate | Status | Notes |
|------|--------|-------|
| CI | yes | `.github/workflows/ci.yml` runs `pnpm test` + `pnpm build` on Node 22.x/24.x |
| Tests | pass | 579 app tests pass; build succeeds |
| .env.example | n/a | browser-only SPA, zero environment variables |
| DEPLOY.md | deep | rewritten for the standalone single-package app layout |
| Billing | none | |
| Last verified | 2026-07-10 | post-migration audit: install/test/build re-verified after statlab repo separation |

## Next blocker

Pick a custom domain or keep the default **https://statlab-3z6.pages.dev** URL. CI deploys on push to `main`.

## Latest UI/UX pass (2026-07-06)

Ran the app live in-browser rather than just reading source. Found and fixed:
- 13 spots across `src/App.jsx` where Unicode glyphs (icons, middot separators, ×, …) were written as bare JSX text instead of JS string literals, so React rendered the literal `\uXXXX` escape text instead of the glyph — affected the toolbar icons, header subtitle, CSV button, landing page footer, and several inference-panel labels. All wrapped in string literals; added missing `aria-label`s on the icon-only toolbar buttons.
- No responsive layout below ~700px — added a dismissible "works best on a larger screen" gate rather than attempting a full responsive redesign of the multi-panel workbench.
- Cohen's d sign was inconsistent between the APA-7 copy-paste string (unsigned) and the on-screen stat card (signed) for Welch/one-sample t-tests — standardized on signed `d` everywhere to match `zTest`/`cohensD`, which already used the signed convention.

## Release ETA

Medium
