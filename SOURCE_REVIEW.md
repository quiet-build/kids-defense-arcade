# Source review — three candy gardens

Player problem: the board hid behind setup, waves changed the road under old towers, walls melted before the fight, and the garden looked like a prototype. Acceptance: one candy HUD and battlefield, three short gardens with a taught tower, fixed path per garden, manual waves, walls that wait for combat, a clear win/loss sheet.

Source: [Server Survival](https://github.com/pshenok/server-survival) at `01796362d3b7bfa6c85efab5e2685f4d955dc137` (MIT).

| Upstream | Local |
|---|---|
| `src/campaign/levels.js` budget, allowedServices, objectives, failConditions | `src/levels.js` `LEVELS` (paths, jelly, allowed towers, packs) |
| `src/campaign/campaign.js` `_evaluateObjectives`, `_checkEndConditions` played-gate, `_calculateStars`, persist max stars | `evaluateObjectives`, `calculateStars`, `persistWin` |
| `src/ui/toolbar.js` `isTypeAllowed` | `isToolAllowed` |
| Tailwind campaign briefing / debrief chrome | Original candy sheets in `src/ui.html`; not copied |

Code reused: adapted helpers only, with MIT notice in `NOTICE`. No Server Survival art.

Verification: standalone smoke (build/refund, prepare walls, no auto-wave) and existing component/WebKit suites after updating Start Mission money and candy tool names. Physical iPhone/Android and Safari outside WebKit automation were not available. No audio.

Remaining: host catalog still says missions are not saved until that copy is republished; physical-device and audible checks.
