# kids-defense-arcade — Improvements (UI / UX / design / workflow)
> Generated 2026-07-11 from the portfolio review. Portfolio summary: ~/projects/improvements.md

1. Add a ghost tower + range circle that follows the cursor/finger before commit. `handlePointer` (`main.js:450`) snaps to the `TILE` grid but gives no pre-placement preview.
2. Add audio feedback throughout — firing, hits, wave-start, and win/loss all need sound. This is the biggest juice gap versus the polished snake/chess games (no audio exists at all).
3. Make the `.tool-card` tower buttons in `index.html` show cost, range, and a mini-icon — kids can't infer tower roles from text alone.
4. Add a between-waves countdown with a visible "Start Wave" affordance so young players aren't overwhelmed by continuous spawning.
5. Add screen-shake / particle bursts on enemy death and base-damage flashes for readable feedback (Phaser tweens/particles).
6. Make lives/base-HP and money readouts big, always-visible, and icon-based — the current `#baseText` / `#moneyText` are plain text spans.
