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

### M1 — Hex board  ✅ COMPLETE
Plan: `docs/superpowers/plans/2026-05-22-m1-hex-board.md` (17 tasks)
- [x] M1.1-8 core — constants, hex math, dual-PRNG, FBM noise, biome, board, ramps, A*
- [x] M1.9-12 ECS — koota world + components, path-follow system, startGame, commands
- [x] M1.13-16 render — palette, hex tiles, GameCanvas, tap-to-travel (visually verified)
- [x] M1.17 verification — 67 unit + 2 browser + 3 e2e/visual tests green

M1 learnings carried into M2:
- The "no game board" bug is FIXED — `startGame` produces a seeded, navigable
  board; tap-to-travel walks the pawn (screenshot-confirmed).
- r3f 9 needs `import '@react-three/fiber'` types in vite-env.d.ts for JSX
  intrinsics; Vitest browser mode needs `resolve.dedupe: ['react','react-dom']`.
- Single-octave noise starved biome variety — FBM + contrast stretch fixed it.
  M2's character placement (random NPCs) should use the same FBM field, NOT
  fresh single-octave noise.
- KNOWN M1 DEFERRALS (deliberate, not bugs — for later milestones): ocean is
  hex-prisms not a flat translucent water plane; mountains lack snow peaks.
  These are M5 (day/night + water polish) per the meta-rule — M1's contract was
  "the board renders + is navigable", which is met. Recorded here so they are
  not lost.
- M2 FIRST TASK is the KayKit rig-verification harness (per design §10 risk) —
  load a KayKit character + Rig_Medium animation GLBs, confirm the skeleton
  retargeting works, lock the approach in `60-characters.md` BEFORE the factory.

### M2 — Characters  ✅ COMPLETE
Pillar: `60-characters.md`, `50-ecs-model.md`.
- [x] M2.1 rig verification — KayKit shares an identical 23-bone skeleton; bind by name
- [x] M2.2 ingested 8 KayKit heroes + 4 rig-animation libs + orc enemy (25 assets)
- [x] M2.3 AnimatedCharacter — drei useGLTF/useAnimations shared-rig retargeting
- [x] M2.4 character factory — parameterized createCharacter, koota archetypes
- [x] M2.5 AnimationState component + animationSystem (Movement → clip)
- [x] M2.6 KayKit Engineer replaces the cone-pawn — visually verified, no T-pose
- [x] M2.7 milestone verification — 81 unit + 3 browser + 3 e2e tests green

M2 learnings carried into M3:
- The M2 milestone doc was over-specified (written in M0 from the design table).
  Health-billboard re-scoped to M4 (needs damage), selection-ring re-scoped to
  M3 (needs the command loop). Both recorded in the respective milestone docs.
  LESSON: milestone docs decompose at milestone START, not in M0 — M3+ contracts
  get their detail when that milestone begins, informed by the prior milestone.
- The character factory deliberately omits Health/Harvester/Carrier/Combatant —
  they join the archetype in the milestone that adds the system that reads them
  (dead components otherwise). M3 adds Harvester + Carrier; M4 adds Health +
  Combatant.
- M3 FIRST STEP: write the M3 plan + milestone-TDD batch, then build the peon
  harvest economy (resource nodes, harvest loop, Town Hall, deposit, build mode,
  supply) + the re-scoped selection ring.

### M3 — Economy  ✅ COMPLETE
Plan: `docs/superpowers/plans/2026-05-22-m3-economy.md` (13 tasks)
- [x] M3.1-10 economy logic — components, GameEconomy, resource spawn, harvest/
  deposit/job-routing/build systems, supply, runEconomyTick wiring
- [x] M3.11 r3f rendering — resource nodes, Town Hall, selection ring;
  ingest now embeds GLB textures; Town Hall placed off the peon spawn tiles
- [x] M3.12 HUD resource/supply bar
- [x] M3.13 verification — 121 unit + 5 browser + 3 e2e green; the autonomous
  harvest loop verified in-app (wood 50→250 in 25s hands-off)

M3 learnings carried into M4:
- M2 review findings folded before M3 (ErrorBoundary, GLB dispose, preload all
  rigs, AnimationState.clipName dropped). M3 review trio runs next.
- Asset-pipeline lesson: Kenney GLBs reference external Textures/colormap.png;
  the ingest script now embeds textures into every GLB. Kenney building GLBs
  are modelled ~1u wide for a smaller hex grid — render-scale them ~1.7x.
- Two M3 contracts (build-mode UI, click-to-select) re-scoped to M6 — the
  logic (buildSystem, SelectionRing) is built+tested; the HUD *trigger* is M6.
- M4 FIRST STEP: write M4 plan + milestone-TDD batch, then combat — Combatant
  component, footmen, goblin/orc enemies, Goblin Portal, attack state machine,
  health billboards (re-scoped from M2), floating combat text, win/loss.

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
