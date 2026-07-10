# Source Companion

This project is a Vite + Phaser tower-defense browser game for kids.

## Runtime Files

- `src/main.js` owns Phaser scene setup, game state, enemy waves, tower placement, projectiles, UI wiring, and win/loss flow. If this grows further, split by gameplay responsibility before adding unrelated behavior.
- `src/style.css` owns the page layout, game controls, and visual theme.
- `index.html` provides the game canvas host and control markup.

## Tests And Tooling

- `tests/smoke.spec.js` checks the browser game starts and can be exercised by Playwright.
- `vite.config.js` configures the Vite build.
- `playwright.config.js` configures browser tests.
- `package.json` and `pnpm-lock.yaml` define scripts and dependency versions.

