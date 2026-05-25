---
title: PRD v0.9 — visual baseline lock + AI wonder + HUD win-loss + 4X balance + OnePlus surfacing
updated: 2026-05-25
status: current
domain: product
---

# PRD v0.9 — visual baseline lock + AI wonder + HUD N-player win-loss + 4X balance

**Released as:** v0.1.19 (PR #57 — `fix(render): WebGL context-lost now surfaces to ErrorOverlay + force-repaints on restore`)
**Cycle goal:** lock the cross-platform visual baseline, add the AI WonderEvaluator that completes the wonder-victory AI loop, ship the N-player HUD win-loss grid (per-faction stats + relation badges + tribute-ally tag), close the 4X mapgen balance gap, add the multi-viewport regression net the user explicitly demanded after the OnePlus Open report, and surface WebGL context-lost as a real error overlay instead of a silent grey board.

## Why this cycle

The v0.8 release shipped a playable N-player + diplomacy + AI-diplo-eval substrate. What it didn't ship:

- **End-of-match readability for N-player**: the GameOverModal only had a 2-faction stats list. A 4-player FFA finished with no per-faction breakdown — players couldn't see who placed where, what relations stood at game end, or whether a tributary alliance carried the win.
- **AI wonder agency**: the wonder-victory mechanism (introduced in v0.7) was player-facing only. AI factions couldn't *choose* to build a wonder — they'd build one if their evaluator stack happened to pick it, but nothing rewarded wonder-building as a victory path.
- **4X balance**: 6-player FFAs were unbalanced — players starting in corner positions had a measurable territory advantage in the first 60s. The mapgen needed a balance pass.
- **OnePlus Open foldable grey-board report**: the user surfaced a hard bug on their actual device — the board went solid grey after a few seconds with no error overlay. Three root causes traced and fixed (see v0.1.19 entry in RELEASE-NOTES).
- **Multi-viewport regression net**: the user asked "WHERE THE HELL IS YOUR MULTI VIEWPORT TESTING?" — the test infrastructure had no per-device-class regression suite. PR #50 shipped it.
- **Cross-platform visual baseline drift**: the v0.8 lock-baselines.yml workflow generated Linux-container baselines but they weren't being enforced consistently — every PR was at risk of a Mac↔Linux false-fail flake.

## Architectural decisions

1. **N-player win-loss grid is a separate render branch in GameOverModal.** Not a refactor of the legacy 2-faction stats list. The modal computes `isNPlayer = nonBarbarianFactions.length > 2` and renders one of two layouts. The legacy layout stays byte-identical for 1v1 matches; the new layout activates for N≥3. Each row carries a `data-faction-id` attribute (test selector) and class hooks (`nplayer-winner-row`, `relation-badge`, `relation-{rel}`, `tribute-ally-tag`).

2. **AI WonderEvaluator slots into the existing yuka evaluator stack.** Same pattern as `AiDiplomacyEvaluator` from v0.8 — pure function returning a build-wonder proposal or `null`. Personality weights drive thresholds. Triggers when a faction has supply surplus, no immediate military threat, and at least one wonder slot remaining in the round. The evaluator does NOT bypass `BuildEvaluator`; it returns a high-priority `BuildAction(wonder)` that the build evaluator then resolves through the normal cost / placement gates.

3. **Multi-viewport regression spec uses Playwright projects, not Vitest browser-mode.** Six projects in `playwright.config.ts`: desktop, mobile (Pixel 7), tablet (iPad Mini), foldable-portrait (840×2120@3x — the OnePlus Open unfolded), foldable-landscape (2120×840@3x), ultrawide (3440×1440). Spec runs under `MULTIVIEW=1` env flag, exits opt-in from the tier-1 CI gate. Per viewport asserts: canvas exists with non-zero dims at t=0 AND after advancing 10 sim-seconds; no HUD bounding-box overlaps; captures screenshot artifact (NOT asserted — cross-platform drift would false-fail every PR).

4. **WebGL context-lost surfacing goes through `console.error`, not `console.warn`.** The ErrorOverlay (introduced in v0.4) patches `console.error` only. The v0.4 grey-board hypothesis was right about context-loss being the trigger; the v0.9 fix is making the surfacing actually fire. Three-pronged: (a) `console.error` instead of `console.warn` for the `webglcontextlost` log line; (b) explicit `invalidate()` call from the r3f hook in the `webglcontextrestored` handler so the board repaints even with `frameloop='never'`; (c) `gl={ powerPreference: 'high-performance' }` to reduce the OS reclamation rate on mid-tier Android.

5. **CustomEvent bridge for context-lost lifecycle.** `aethelgard:webgl-context-lost` and `aethelgard:webgl-context-restored` events on `window` let multi-viewport regression tests, Capacitor analytics, and future telemetry observe the same lifecycle the user does, without depending on the console-patch path.

6. **4X mapgen rebalance via map-rng-driven faction-placement seeding.** Faction start positions were derived from a `for (i = 0; i < N; i++)` corner walk, biased toward the four-quadrant layout. The v0.9 rebalance uses the `mapRng` (map seed) to sample placements from a balanced hex distribution around the map perimeter, with a minimum 6-hex spacing constraint. Determinism preserved per `(mapSeed, factionCount)`.

7. **Per-game-state save-restore round-trip test for N-player.** Save / load coverage was 2-faction-only before v0.9. The new e2e spec exercises a 6-player FFA: start match → advance 30 sim-seconds → save → reload page → restore → assert game state byte-identical (factions, relations, scores, wonderTimers).

## Work-units shipped

| Item | Commit / PR | What it does |
|---|---|---|
| M_V9.HUD.WIN-LOSS-N-PLAYER | (v0.9 grinder batch / PR #60) | GameOverModal per-faction stats grid for N≥3; relation badges; tribute-ally tag |
| M_V9.AI.WONDER-EVALUATOR | (v0.9 grinder batch / PR #60) | AiWonderEvaluator in yuka stack; personality-weighted wonder-build proposals |
| M_V9.MAPGEN.4X-BALANCE | (v0.9 grinder batch / PR #60) | Faction-placement uses balanced perimeter distribution; 6-hex min spacing |
| M_V9.SAVE.N-PLAYER-RESTORE | (v0.9 grinder batch / PR #60) | Save/load e2e for 6-player FFA; SNAPSHOT_VERSION 3 schema preserved |
| M_V9.VISUAL.LINUX-LOCK | (v0.9 grinder batch / PR #60) | Visual baselines locked from Linux container; CI hard-fail on drift |
| M_V9.TEST.MULTI-VIEWPORT | PR #50 (v0.1.17) | Playwright multi-viewport regression spec; 6 viewport projects |
| M_V9.RENDER.WEBGL-RECOVERY | PR #57 (v0.1.19) | webglcontextlost surfaces via console.error; webglcontextrestored calls invalidate(); high-performance powerPreference |
| M_V9.TEST.POLL-MODAL-MOUNT | (v0.9 grinder batch / PR #60 fix-up) | Replace 200ms fixed sleeps with polling waitFor() in nplayer-game-over.browser.test.tsx — CI runner timing variance |
| M_V9.TEST.SOURCE-GREP-TO-BEHAVIOR | (v0.9 grinder batch) | Convert source-grep tests (color-outline-v3) to module-export shape checks where r3f can't render in jsdom |

## Determinism contract

- Legacy 2-faction match byte-determinism preserved (1100+ unit tests pass after each commit).
- 4X mapgen rebalance changes start positions for N≥3 only — 1v1 matches unchanged.
- SNAPSHOT_VERSION stays at 3; N-player save/restore is forward-compatible with v0.8 saves.
- AI WonderEvaluator is gated on supply + threat thresholds and personality weights — deterministic per `(seedPhrase, eventSeed, faction order)`.

## Process improvements shipped

- **Multi-viewport regression net** replaces "ship and hope the OnePlus Open works" with explicit per-device-class assertions. Six viewports cover the realistic device-class matrix: desktop, mobile, tablet, foldable (both orientations), ultrawide.
- **WebGL context lifecycle has a CustomEvent bridge.** Analytics / tests / telemetry can subscribe without depending on the console-patch path.
- **Visual baselines locked from Linux**, ending the per-PR risk of Mac↔Linux drift false-fails.
- **CI test-timeout consolidation** (PR #41 — global Playwright timeout 60→180s) replaces the per-test bumps pattern (PR #25, #33, #38, #40) that was getting tiring.
- **Branch hygiene sweep** — 23 merged feature branches pruned from the local clone, reducing `git branch` output noise during status checks.
- **Human-facing RELEASE-NOTES.md** added — release-please's CHANGELOG.md stays the conventional-commit ledger, and the new file is the reader-facing companion the directive's M_MAIN.DOCS.RELEASE-NOTES recurring item has been calling for.

## What did NOT ship in v0.9 (deliberate cuts, recorded for v0.10 PRD)

- Visual baseline lock-in for the new multi-viewport projects: the v0.9 spec captures screenshot artifacts but does NOT assert against locked baselines. A separate Linux-container battery owns the locked baseline; the multi-viewport spec is a behavioral net, not a pixel regression.
- Capacitor-side telemetry hook for the `aethelgard:webgl-context-lost` event — the bridge exists, the Capacitor consumer doesn't yet.
- Onboarding slide for the 4X mode — the v0.8 N-player onboarding slide covers ≤6-player FFA generically; a dedicated 4X tutorial belongs in v0.10 alongside the 4X economy balance pass.
