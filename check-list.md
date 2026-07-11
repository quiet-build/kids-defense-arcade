# kids-defense-arcade — Production Release Checklist
> Generated 2026-07-11 from the portfolio review. Portfolio summary: ~/projects/check-list.md

**Status**: WIP / early prototype — a browser tower-defense arcade (place towers, survive waves, themes/difficulty/endless + boss). Playable and deployable, but the least developed of the four: one 716-line monolithic `src/main.js`, no audio, no PWA, minimal tests; stopped at 5 commits in early May.

## Do yourself (human-only)
- [ ] Decide the actual deploy target — GitHub Pages subpath vs. Cloudflare root (config currently straddles both; see Decisions).
- [ ] If GitHub Pages: enable Pages in repo settings.
- [ ] Playtest wave difficulty balance with kids.
- [ ] Source or commission SFX (there is none) — or approve a synth-generated set.
- [ ] Note this repo is a different org (`quietbuildlab`, not `quiet-build`) — confirm it has, or doesn't need, the other three's CI secrets/setup.

## Decisions needed
- **Deploy-target ambiguity**: `.github/workflows/pages.yml` deploys to GitHub Pages with `VITE_BASE=/kids-defense-arcade/`, but commit `d8b77dc` ("Support root deploys for Cloudflare Pages") edited that same workflow. Pages subpath vs. Cloudflare root must be reconciled or the base path could ship broken (blank page).
- Whether to split the 716-line `main.js` monolith now (the project's own `SOURCE.md` flags it) or defer.

## Delegate to Claude (automatable)
- [ ] Add a WebAudio synth (like kids-chess's `src/audio/SoundManager.ts`) for tower-fire / enemy-hit / wave feedback — currently no audio at all.
- [ ] Add a PWA manifest (none exists).
- [ ] Add unit tests around wave/economy logic (currently only a Playwright smoke test).
- [ ] Optionally split `src/main.js` by gameplay responsibility, as `SOURCE.md` recommends.

## Risks to keep in mind
- The Cloudflare-vs-Pages deploy ambiguity could ship a broken base path (blank page).
- Monolithic `main.js` makes any change risky with only a smoke test as a net.
- Different GitHub org (`quietbuildlab`) means it may not share the other three's CI secrets/setup.
- Conflicts with the global rule to default UI work to React/TypeScript — this is the only vanilla-JS interactive game in the set.
