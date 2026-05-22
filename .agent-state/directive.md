# Continuous Work Directive — Aethelgard: Chronicles of Strata

**Status:** ACTIVE
**Owner:** Claude
**Mandate:** "Decompose the references into standard pillar docs and a test-driven
r3f/drei/seedrandom/yuka/tonejs codebase with framer-motion and radix... capacitor-sqlite /
capacitor-preferences and koota... Faithfully decompose and finish the original concept in
r3f then expand and add features. Aim for debug mobile Android APK + GitHub Pages web on
the initial release pushed out in ONE PR... Fully autonomous, no shortcuts, no placeholders,
no stubs." + "proceed fully autonomously. I do not want any further stops or reviews." +
"This game does NOT need a size limit budget, it needs whatever assets are appropriate to
make a full, fun game."

## What CONTINUOUS means

1. Work continuously — when a task finishes, start the next.
2. Never stop for status reports.
3. Never stop for scope (it's all in the design doc).
4. Never stop to summarize.
5. Never stop on context pressure (the harness auto-compacts).
6. Never stop because a task feels big.

Only legitimate stops: explicit user halt, red CI needing user knowledge, a destructive
op needing per-op authorization, a scope-flipping ambiguity. Per user directive there are
NO review checkpoints — proceed through all 7 milestones to one final push.

## Operating loop

While the queue has `[ ]` items: implement → verify (`pnpm verify`) → commit →
dispatch the background reviewer trio scoped to the commit diff → mark `[x]` → next.
Milestone-TDD: at each milestone boundary, write that milestone's plan
(`docs/superpowers/plans/`) + its full failing-test batch (test-only commits) before
implementation, then turn the batch green one task at a time.

## Forbidden phrases

"deferred" | "v2+" | "out of scope" | "future work" | "tracked separately" | "follow-up" |
"TODO" | "FIXME" | "stub" | "placeholder" | "mock for now" | "continue-on-error" in CI |
"pause point" | "fresh session" | "stopping point" | "clean handoff" | "ready to hand off" |
"self-feedback" as a graduation signal.

## Debug-loop stop rule

If a probe loop runs >3 iterations without finding the cause, STOP probing. The bug is
architectural. Name the 2-3 real options, pick the one matching the spec doc, record the
decision + why in the spec doc, delete the probe scaffolding, take the right path.

## Step 1 of every unit is use-case enumeration

Before code for any non-trivial system: list its actual users / triggers / lifecycle
moments. >1 use case → the answer is usually a hybrid (shared core, per-use triggers).
Read the pillar docs first — don't make the user quote them back.

## Self-assessment is the default loop

After every commit/milestone: backward sweep (what shipped, what gaps) + forward sweep
(is the next stage still right? architectural questions to answer NOW in the spec doc?).
Encode forward learnings into this directive before the next stage.

## Delivery

ONE feature branch `feat/aethelgard-initial-release`, one commit per task/issue,
ONE final PR delivering debug Android APK + GitHub Pages web. Push only after all 7
milestones are `[x]` and the local review trio findings are absorbed.

---

## Queue

### M0 — Foundation  ✅ COMPLETE
Plan: `docs/superpowers/plans/2026-05-22-m0-foundation.md` (13 tasks)
- [x] M0.1 pnpm project + package.json + .gitignore
- [x] M0.2 TypeScript + Vite config + React shell
- [x] M0.3 Biome lint/format config
- [x] M0.4 Vitest node + browser projects
- [x] M0.5 Playwright config
- [x] M0.6 Capacitor Android config
- [x] M0.7 Asset manifest types + typed accessor (TDD)
- [x] M0.8 Asset ingest script + curation map (TDD)
- [x] M0.9 Asset verification script + manifest contract test
- [x] M0.10 Pillar documentation set (12 specs + 7 milestone docs)
- [x] M0.11 GitHub Actions CI (build/test + debug APK)
- [x] M0.12 GitHub Pages deploy workflow
- [x] M0.13 Coverage gates + standard repo files + release config

M0 learnings carried into M1: (1) modern stack versions verified — React 19 / r3f 9
/ Vitest 4 (provider via @vitest/browser-playwright) / Biome 2 / Capacitor 8.
(2) Single non-composite tsconfig — project-references break on noEmit; do NOT
re-split. (3) `exactOptionalPropertyTypes` is on — omit optional props, never set
them `undefined`. (4) Vitest browser API: `page` from `vitest/browser`, `render`
is async. (5) `references/` paths confirmed: Hexagon Kit GLBs at
`Hexagon Kit/Models/GLB format/`, Nature Kit at `Nature Kit/Models/GLTF format/`.

### M1 — Hex board
Plan written at M1 start. Contracts: terraced terrain mesh, biome assignment,
dual-stage PRNG, axial hex math + A*, ramp placement, tap-to-travel + path preview,
Canvas smoke test (guards "no game board"). Pillar: `40-hex-world.md`.
- [ ] M1.* — decomposed at milestone start

### M2 — Characters
Plan written at M2 start. Contracts: rig-verification harness FIRST, KayKit GLB
loader, shared-rig retargeting, character factory, koota unit entities, AnimationState
system. Pillar: `60-characters.md`, `50-ecs-model.md`.
- [ ] M2.* — decomposed at milestone start

### M3 — Economy
Plan written at M3 start. Contracts: peon harvest loop, resource nodes, Town Hall,
build mode (ghost/scaffold/builder/progress), supply system. Pillar: `70-rts-systems.md`.
- [ ] M3.* — decomposed at milestone start

### M4 — Combat
Plan written at M4 start. Contracts: footmen, goblin/orc enemies, portal, combat
state machine, health billboards, floating combat text, win/loss. Pillar: `70-rts-systems.md`.
- [ ] M4.* — decomposed at milestone start

### M5 — Systems
Plan written at M5 start. Contracts: seeded weather, research/tech, barracks rally
points, 2D minimap, day/night cycle. Pillar: `70-rts-systems.md`, `20-visual-language.md`.
- [ ] M5.* — decomposed at milestone start

### M6 — Polish
Plan written at M6 start. Contracts: Radix + framer-motion HUD, howler audio buses,
SQLite + Preferences persistence, branded launcher, credits screen, final PR.
Pillar: `90-ui-hud.md`, `80-audio.md`, `95-persistence.md`.
- [ ] M6.* — decomposed at milestone start
