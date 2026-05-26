---
title: Release Notes — Aethelgard: Chronicles of Strata
updated: 2026-05-25
status: current
domain: product
---

# Release Notes

Human-facing prose for each shipped tag. `CHANGELOG.md` is the auto-generated
conventional-commit ledger (release-please owns it); this file is the
*reader*-friendly companion — what the release means for a player or
developer revisiting the project, not the git log.

Ordering: newest at top. Each tag links to its CHANGELOG section.

---

## v0.1.19 — WebGL recovery wired to the user (2026-05-25)

[CHANGELOG](../CHANGELOG.md#0119-2026-05-25) ·
[release](https://github.com/arcade-cabinet/Aethelgard-Chronicles-of-Strata/releases/tag/v0.1.19)

The OnePlus Open foldable reported a "board going grey after a few seconds
of play" with nothing in the error overlay. Root cause was a silent WebGL
context loss — the canvas was alive, the r3f scene was running, but the
underlying GL context had been thrown away (mid-tier Android browsers
reclaim GPU contexts aggressively when the device thinks the page is
backgrounded).

This release wires three fixes:
- The `webglcontextlost` handler now goes through `console.error` (which
  the `ErrorOverlay` patches), not `console.warn` (which it doesn't) —
  so the user actually sees a "WebGL context lost" surfaced toast instead
  of a silent grey board.
- The `webglcontextrestored` handler now calls `invalidate()` from the
  r3f renderer hook, forcing a repaint even when `frameloop='never'` is
  in effect. Without this, the board would re-acquire the GL context but
  never schedule a redraw.
- The renderer ships with `gl={ powerPreference: 'high-performance' }`,
  reducing the chance the browser elects to reclaim the context in the
  first place on the affected devices.

Folded into this tag also: a `CustomEvent`-based bridge (`aethelgard:webgl-context-lost`
+ `aethelgard:webgl-context-restored`) so multi-viewport regression tests
and Capacitor-side analytics can observe the same lifecycle the user does.

## v0.1.18 — Format CI gate satisfied (2026-05-25)

[CHANGELOG](../CHANGELOG.md#0118-2026-05-25) ·
[release](https://github.com/arcade-cabinet/Aethelgard-Chronicles-of-Strata/releases/tag/v0.1.18)

Pure release-engineering tag — `biome format` against `multi-viewport-regression.spec.ts`
after PR #50's auto-merge. No gameplay or behavior changes; ships only so
release-please drops the un-formatted diff out of the rolling release PR.

## v0.1.17 — Multi-viewport regression net (2026-05-25)

[CHANGELOG](../CHANGELOG.md#0117-2026-05-25) ·
[release](https://github.com/arcade-cabinet/Aethelgard-Chronicles-of-Strata/releases/tag/v0.1.17)

Ships the multi-viewport Playwright regression spec the user explicitly
asked for after the OnePlus Open report ("WHERE THE HELL IS YOUR MULTI
VIEWPORT TESTING?"). The new spec exercises six viewport projects in
`playwright.config.ts`:

- `desktop` (1280×720, Desktop Chrome UA)
- `mobile` (Pixel 7)
- `tablet` (iPad Mini)
- `foldable-portrait` (840×2120 @ 3x DPR, Android UA — the OnePlus Open unfolded)
- `foldable-landscape` (2120×840 @ 3x DPR)
- `ultrawide` (3440×1440)

Per viewport the spec asserts: canvas exists and has non-zero dimensions
at t=0 (post-onboarding); canvas still exists and has non-zero dimensions
after advancing 10 sim-seconds (the "board went grey" window the user
hit); and no HUD bounding-box collisions among the resource bar, minimap,
win-condition pill, discoveries button, and audio toggle.

Two cycle-PRD documents land alongside: `docs/specs/PRD-v0.5.md` through
`docs/specs/PRD-v0.8.md`, each tracking the release cycle's intent vs.
what shipped. The new cycle PRDs unblock the M_MAIN.PRD-DRIFT-AUDIT
recurring sweep — every shipped item now has a PRD line to compare against.

The visual battery in this spec captures screenshots per viewport into
`test-results/multi-viewport/` for human review, but is *not* asserted
against locked baselines (cross-platform Mac↔Linux pixel drift would
false-fail every PR). The locked-baseline regression lives in a separate
Linux-container battery; this spec is the behavioral net.

## v0.1.16 — v0.8 cycle close (2026-05-25)

[CHANGELOG](../CHANGELOG.md#0116-2026-05-25) ·
[release](https://github.com/arcade-cabinet/Aethelgard-Chronicles-of-Strata/releases/tag/v0.1.16)

The v0.8 cycle delivers thirteen work units in a single PR (#44): the
4X-mode N-player picker UI becomes playable, the AI diplomatic evaluator
ships its first iteration, the portal cooldown system lands, the tutorial
overlay gets its substrate, and the reviewer-trio drain absorbs every
finding raised against v0.5 / v0.6 / v0.7 that wasn't already folded
into a forward commit.

Highlights from a player POV: starting a new game now lets you pick 3-6
factions in the picker rather than the 2-faction legacy default; AI
opponents now exchange diplomatic actions (peace, tribute, ally) based
on relative strength rather than always-hostile; portals between two
biomes now respect a per-pair cooldown so spam-traversal isn't a
viable strategy; and the tutorial overlay surfaces the first build /
first command flows for fresh sessions.

## Earlier releases

For tags v0.1.15 and earlier, see [CHANGELOG.md](../CHANGELOG.md) for
the conventional-commit log. Cycle-level intent for each is captured in
the per-cycle `docs/specs/PRD-v0.4.md` through `docs/specs/PRD-v0.9.md`
spec documents.

---

**Release ladder ownership.** Every tag in this file went through the
release-please cron, was merged by the auto-merge worker, was deployed
by `cd.yml` to GitHub Pages, and was re-screenshotted by the AIVAI
visual battery against the live deploy. See `.agent-state/directive.md`
M_MAIN.RELEASE-LADDER for the recurring item that drives this.
