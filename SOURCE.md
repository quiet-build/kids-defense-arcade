# Source Companion

This project is a Vite + Phaser tower-defense browser game for kids.

## Runtime Files

- `src/main.js` is the standalone entry; it imports the existing page CSS and calls the shared mount.
- `src/mount.js` owns one session's Phaser scene, game state, enemy waves, tower placement, projectiles, UI wiring and win/loss flow. Its local closures prevent cross-session state. `mount(container, ready?, result?)` returns `pause()` and idempotent `dispose()`. A small native Pause/Resume button freezes the existing scene; accumulated active-frame time keeps construction, projectiles and spawns aligned after resume. Restart cancels pending scene timers. Result mode captures the started difficulty, theme and endless choice; it does not read a later setup selection. No new scoring system was added: real terminal events report won/lost and reached wave.
- `src/component.js` registers `pma-defense-arcade` with open Shadow DOM, fresh sessions on connection and disposal on removal. Public `pause()` retains a visible Resume control. `pma-ready`, `pma-error` and `pma-round-ended` bubble/compose with `gameId: 'defense-arcade'`. Errors expose only `Unable to start game. Please try again.`. CSS is shadow-scoped and uses host-width container queries. No component service worker.
- `src/runtime.js` owns the Phaser 3.90 lifetime boundary. A SessionGame subclass wraps only the synchronous `super.start()` call, restores pre-existing window.onblur/onfocus and document.addEventListener in finally, and removes Phaser's otherwise unowned document visibility listener. The mount provides abortable pause listeners instead. Phaser window input is disabled; mouse/touch target only the game area. This game has no audio and uses Phaser noAudio.
- Disposal stops scenes and requests game destruction, then queues the public Game.step to complete pending destruction without relying on another animation frame. Pending-boot disposal waits for READY before that microtask. Tests verify actual GL buffer deletion; Phaser deletes renderer resources but does not explicitly lose the browser-owned raw GL context. Do not replace this evidence with isContextLost(). Recheck installed Phaser core/Game.js, core/VisibilityHandler.js and renderer/webgl/WebGLRenderer.js when upgrading; never keep temporary DOM interception active across async boundaries.
- Mount also owns synchronous partial-construction failure: it aborts already-wired UI listeners and disposes the captured preBoot runtime before rethrowing the original error. Before SceneManager boots, the idempotent runtime disposer emits DESTROY once for constructor-owned cleanup, releases any completed renderer/canvas and destroys the loop immediately. Normal destruction needs the absent system scene; failed renderer boot never reaches READY. Post-import getContext fault injection verifies the safe error, no audio allocation, aborted listeners, detached canvas, no page errors and playable same-element reconnect. Normal pending-boot disposal is unchanged.
- `src/style.css` owns the page layout, game controls, and visual theme.
- `src/ui.html` holds the existing canvas host/control markup shared by both entries. `index.html` provides the standalone app host.

## Tests And Tooling

- Button pointer capture explicitly focuses the selected button and prevents the default focus change, so Safari tower selection after a board click does not trigger focusout pausing. The abortable listener belongs to `src/mount.js` and is removed on disposal.
- `tests/controls.component.spec.js` runs this board/tool/host-pause/Resume sequence in WebKit. The component config includes it, and deployment installs WebKit before the browser gate (`pnpm exec playwright install webkit` locally).

- `tests/smoke.spec.js` checks the browser game starts and can be exercised by Playwright.
- `tests/component.spec.js` covers real start/build/pause/resume/restart, native Space, host input, actual terminal loss/result mode, setup-error recovery, 900/390/320 widths, pending-boot reconnect, ten remounts, stopped detached draws/listeners and frame-starved renderer teardown. `tests/component-host.mjs` serves a separate origin with real host controls. Local screenshots are ignored outputs.
- `vite.config.js` builds standalone HTML plus stable component.js and shared assets, retaining the existing VITE_BASE override used by Pages CI and defaulting to relative assets; preview CORS supports the cross-origin harness. `public/_headers` supplies production CORS.
- `playwright.config.js` selects existing standalone smoke tests on 5175; `playwright.component.config.js` serially uses 5301/5302. Both honor PLAYWRIGHT_EXECUTABLE_PATH. `pnpm test:component` builds and runs the component suite. `pnpm exec playwright test --config playwright.config.js` runs standalone smoke. There are no existing unit tests.
- `package.json`, `pnpm-lock.yaml`, and `pnpm-workspace.yaml` define scripts, dependency versions, and approved dependency build scripts. Wrangler 4.129.0 is an explicit deployment dependency; pnpm permits only the required esbuild and workerd install scripts.
- `functions/_middleware.ts` redirects only the exact legacy `defense.playminiarcade.com` host to the fixed main-site game route. Pages, preview and local hosts pass through to static assets. Its native Node check runs in the deployment source gate.
- `.github/workflows/deploy.yml` owns both Cloudflare component and existing GitHub Pages publication.

Standalone index.html owns the one main landmark. ui.html and the native component mount are neutral div containers, so embedding does not introduce nested or duplicate main landmarks. Component regression covers standalone and embedded modes.

## Component deployment

Deploy opts into the pinned dedicated arcade workflow and matching helper SHA. Node 24/pnpm 11.25.0 with frozen dependencies; source gates → root-base build → component/standalone and applicable budgets → validated cumulative GitHub release snapshot → Cloudflare Pages. Retained paths cannot change bytes; version asset filenames when replacing them. All publication remains CI-only. A separate downstream job builds /kids-defense-arcade/ for the existing GitHub Pages site. Production headers provide cross-origin assets; no-cache makes the stable entry validate on every reuse even if the platform injects a positive max-age. Update both support pins together after reviewing the support commit.
