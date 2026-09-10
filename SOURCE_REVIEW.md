# Source review — battlefield first, prepare, then wave

Player problem: the first screen hid the board behind setup and stacked tools, waves started before a tower was down, and a cleared wave could settle repeatedly. Acceptance: the board and build bar share the first screen; Start Mission previews the incoming boss and waits for Start Wave; each cleared wave awards its bonus once.

References studied, not copied:

- [Server Survival campaign levels](https://github.com/pshenok/server-survival/blob/main/src/campaign/levels.js) — keep layout, tools, and the current goal in the level definition. Adapted as a prepare phase that names the route and incoming boss before spawning. No campaign file or source was reused.
- Existing in-repo notes in `improvements.md` for ghost range and a between-wave start control.

Code/assets reused: none. Phaser drawing and the existing tool/theme tables stay in `src/mount.js`.

Verification: standalone smoke, component host flows including native placement/restart, Safari control pause/resume, 900/390/320 layouts, and one unattended veteran loss after Start Wave. Physical iPhone/Android and audible output were not available.

Remaining: a three-room teaching campaign and a single candy-garden art pass were deferred.