---
title: v0.11 Screenshot Battery — Self-Judgement Ledger
updated: 2026-05-26
status: current
domain: quality
---

# v0.11 Screenshot Battery — Self-Judgement Ledger

Manual review pass against `docs/specs/20-visual-language.md` +
`docs/specs/10-player-journey.md`. Each row names the comparison
verdict so a reviewer can see what was checked.

Source: `artifacts/journey/` (from `JOURNEY=1 pnpm test:e2e
tests/e2e/journey-capture.spec.ts`).

## Battery contents (10 shots)

| Shot | Spec scene | Verdict |
|------|------------|---------|
| 00-title-screen | S1 Title Screen | OK — logo + start button + settings reachable, low-poly hex background reads. |
| 01-new-game-modal | S2 New Game Modal | OK — modal layered above title; seed input + mode + difficulty visible. |
| 02-settings-modal-from-title | S2 alt path | OK — settings panel reachable from title. |
| 03-game-fresh-start | S4 Gameplay (T+0) | OK — top HUD strip readable (Wood 80, Stone 60, Gold 0); enemy chip present; minimap inset bottom-right. |
| 04-game-after-10s-sim | S4 (T+10s) | OK — same as fresh-start (10s is too early to see new mob spawns). |
| 05-build-menu-open | S4 build flow | **MISS** — `aethelgard:open-build-menu` dispatched but the menu DOM didn't appear in the shot. The BuildMenuButton requires a Town Hall selection first; the dispatch path needs that prerequisite. Filed: M_V11.POLISH.BUILD-MENU-CTA. |
| 06-game-over-win | S5 Victory | OK — game-over modal renders with the win branding. |
| 07-game-over-loss | S5 Defeat | OK — same modal with the loss branding. |
| 08-long-sim-90s-camps-mobs | S4 v0.11 — mob roaming | **PARTIAL** — sim ran 90s but inactivity-beat toast pre-empts the visual ("Aethelgard awaits your first decree"). Camera framing is too wide to see individual mobs. Filed: M_V11.POLISH.JOURNEY-CAPTURE-ZOOM — camera should pull to a tighter framing for these v0.11-specific shots so mobs/loot/procedural buildings are visible. |
| 09-procedural-buildings-zoom | S4 v0.11 — procedural Town Hall | **MISS** — `aethelgard:focus-town-hall` is NOT wired (grep src/ returns zero non-test hits). Filed: M_V11.POLISH.JOURNEY-CAMERA-EVENTS. |

## Findings → directive items

The MISS rows above each surface a real polish item:

1. **M_V11.POLISH.BUILD-MENU-CTA** — build menu DOM needs to
   appear either (a) when no Town Hall selected, drop a hint
   "Tap your Town Hall, then Build" or (b) auto-select Town Hall
   when the dispatched event arrives without a selection.
2. **M_V11.POLISH.JOURNEY-CAPTURE-ZOOM** — extend the camera
   API with a `aethelgard:zoom-to(q, r, distance)` event so
   journey captures can pull in for v0.11-specific shots.
3. **M_V11.POLISH.JOURNEY-CAMERA-EVENTS** — wire the focus-
   town-hall + zoom-to + pan-to-tile events so the journey
   battery can drive deterministic camera framings.

These three items are added to §10 POLISH so the cycle gates
on them before merge.

## Verification cadence

Re-run `JOURNEY=1 pnpm test:e2e tests/e2e/journey-capture.spec.ts`
after every commit that touches `src/render/**`, `src/hud/**`,
`src/world/**`, or `src/entities/**`. Diff the per-shot PNG
against the prior run + log the verdict here.
