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

## Relay Defense (2026-09-11)

User approved a substantial redesign toward a modern game for older children. The existing training maps remain, reskinned as Perimeter, Crowd control and Fast response; Relay siege is directly selectable. No new engine or dependency.

Same upstream pinned revision: `01796362d3b7bfa6c85efab5e2685f4d955dc137`. Read `src/config.js` trafficShift/maliciousSpike and `src/core/events.js` updateMaliciousSpike/startMaliciousSpike/endMaliciousSpike. The implemented adaptation is a preannounced deterministic sequence of scouts, dense swarm groups and timed interceptors; one final carrier closes the siege. The forecast and spawner consume the same schedule. These wave data and code are original, not copied from upstream. Upstream's live menu was inspected with Computer Use; its broader cloud dashboard is not transplanted.

Original graphics replace the two old cosmetic themes with industrial platforms, directional lanes, aiming pulse/mortar towers, stasis coils and distinct drone silhouettes. No upstream or third-party art, fonts or sound are reused. Existing MIT-derived campaign helpers retain NOTICE. Removed the old theme picker rather than retaining parallel skins. Gameplay remains Phaser; no React frame loop or SDK.

The first balance pass increases mortar splash radius and secondary damage so tight clusters are a real counter opportunity; stasis applies on impact, and slowed takedowns / secondary hits drive bonuses instead of merely checking if a tower was constructed. Spending objectives count gross purchases rather than end balance after income. The siege pays fixed wave supplies rather than kill income, preventing a dense wave from financing unlimited expansion. No upkeep tax, repair chore or random unannounced outage.

Acceptance evidence and remaining limits are recorded in `RELAY_REDESIGN.md`.
