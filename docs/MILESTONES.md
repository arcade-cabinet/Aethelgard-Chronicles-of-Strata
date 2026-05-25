---
title: Milestones Shipped
updated: 2026-05-22
status: current
domain: context
---

# Milestones Shipped

The historical record of what's been built. The **active queue** lives in
`.agent-state/directive.md`. This file is the *record*; once an item ships it
moves here so the directive stays compact.

Format: one line per milestone with its commit/marker and a one-sentence summary.

## M0–M6 — Foundation through Polish & Ship

- **M0 Foundation** — pnpm + Vite + TypeScript strict + React + r3f shell;
  koota ECS; Biome; Vitest (node + browser) + Playwright; Capacitor Android
  config; CI/CD; asset ingest pipeline curating `references/` →
  `public/assets/`.
- **M1 Hex board** — deterministic axial board; FBM-noise terrain; 8 biomes;
  elevation tiers; ramps; A* with ramp-gated traversal.
- **M2 Characters** — KayKit rigged characters; shared-skeleton animation
  retargeting; r3f character components.
- **M3 Economy** — peons + harvest loop; resource nodes; deposit; supply cap;
  Farms / Barracks; research (Forged Blades, Steel Plows).
- **M4 Combat** — Footmen vs Goblins/Orcs; damage rolls; combat-text FX;
  Health billboards; death + DeathTimer + clip.
- **M5 Systems** — day/night cycle; weather (Sunny/Fog/Rain); save/load.
- **M6 Polish & Ship** — branded title (Metamorphous + obsidian/gold); New
  Game / Continue / Settings modals; Radix + framer-motion HUD; Howler audio;
  SQLite (jeep-sqlite for web, native for Android); auto-save; viewport
  architecture; merged-mesh terrain; mountains; ramps; water; fog.

## M7 — yuka AI subpackage + asset expansion

- yuka-backed `src/ai/` (AiDirector, steering, perception).
- Castle / Fantasy-Town kit buildings replace blocky stand-ins.
- Graveyard enemy base (crypt + gravestones + fence); +Vampire / Witch /
  Black Knight enemies with a spawn-escalation ladder.
- Audio: magic + UI sound packs; crit + UI events wired.
- Per-biome environment decoration scatter.

## M8 — AI-as-Player + Zone of Control (mechanics arc)

- **M8.0** contextual crossings (spec 99) — connectivity-first union-find; biome-styled forms.
- **M8.1** faction-base model — `FactionBase`, `EnemySpawner`; symmetric win/loss.
- **M8.2** render decomposition — `HomeBase` / `EnemyBase`; faction-symmetric `structure-models`; `Buildings.tsx` deleted.
- **M8.3** faction-aware command API — `commands.ts` takes an issuing faction; `placeBuilding` stamps it.
- **M8.4z + M8.5z** zone of control replaces fog (spec 102) — drawn encirclement; full-map visibility; `zone.ts` with `controlled` + `observed` sets.
- **M8.6a** symmetric per-faction economy — `GameState.economy: Record<Faction, GameEconomy>`.
- **M8.6b** `src/rules/` engine — placement, economy, peon autonomy, attractor, building behaviors (faction-agnostic).
- **M8.6c** peon autonomy + 4 new building types — peons run `nextPeonAction` on both factions; House/Granary/Watchtower/Wall added.
- **M8.6d** yuka Think-brain AI player — `AiPlayer extends GameEntity`; `BuildEvaluator` + `MilitaryEvaluator`; dispatches via `commands.ts`.
- **M8.6e** behavior-archetype local ZoC — `OffensiveBehavior`/`DefensiveBehavior`/`AttractorBehavior` composable traits; encroachment pulse → flip; attractor map-gen contract.
- **M8.7** AI-vs-AI golden-path E2E — swap both factions to AI; macro/meso/micro probes; deterministic.

## M9.1 + M9.3 + M9.4 — UX + exercising + release hygiene

- **M9.1a** build menu — all 6 buildable types with cost labels + affordability gating.
- **M9.1b** zone & territory legend HUD pill.
- **M9.1c** first-run onboarding overlay (4 steps, Preferences-gated).
- **M9.1d** docs: `10-player-journey.md`, `99-glossary.md`, `docs/STATE.md`.
- **M9.3a** e2e player-journey suite (5 scene-transition specs).
- **M9.3b** visual baseline re-locked post-zone-of-control.
- **M9.3c** full five-layer test pyramid green — 260 unit + 42 browser + 18 e2e.
- **M9.4a** Capacitor `cap:sync` clean (3 plugins current).
- **M9.4b** CHANGELOG 0.2.0 section.
- **M9.4c** pre-push gate — all gates green.

## Spec arc

The architecture crystallised across specs 96–102:

| Spec | Concept |
|---|---|
| 96 | Two-PRNG model (map + event) |
| 97 | yuka AI subpackage + M7 asset expansion |
| 98 | Viewport + config |
| 99 | Contextual crossings (passability + slopes) |
| 100 | AI-as-Player (five pillars) |
| 101 | Rules engine + peon autonomy + three-layer model |
| 102 | Zone of Control + magnetic emitters + archetype composition algebra + damage-type × armor + Mover/Consumer + bi-signed force field |

---

## v0.3.0 release archive (2026-05-23 → 2026-05-24)

The full directive history for everything shipped prior to v0.3.0
lived in `.agent-state/directive.md` until 2026-05-24. Compressed
into this section to keep the working directive scannable. Per
git history (commits `6eba229..48da040`), the v0.3.0 → v0.4.0
arc shipped:

**M0–M6** — foundation, hex board, characters, economy, combat,
systems, polish & ship.
**M7** — yuka AI subpackage + Castle/Town/Graveyard kits + 3
monster types + audio + decoration.
**M8** — faction symmetry, command API, zone of control (replaces
fog), rules engine, peon autonomy, yuka Think-brain AI player,
behavior-archetype local ZoC, AI-vs-AI E2E.
**M9.1 / .3 / .4** — UX (build menu, legend, onboarding), e2e
player-journey suite, visual baselines, CHANGELOG, Capacitor
sync, pre-push gate.
**M_HARDENING / M_AUDIT / M_AUDIT2** — six review-driven rounds:
security, code quality, simplification, performance, accessibility,
deterministic-replay, persistence schema migration, M_SEC.* CSP
+ permissions-policy + Sigstore attestation + dependency-review.
**M_RELEASE_FINAL** — release-please + CD GitHub Pages + signed
APK + SBOM + first-cut tag v0.1.0.
**M_REL / M_REGISTRY / M_ARCHETYPE / M_DATA_DRIVEN** — unified
Thing/Skin registry, archetype composition algebra (spec 102),
data-driven HUD strings, magnetic emitters, damage-type × armor.
**M_GAMEPLAY** — train/multi-select/right-click-attack/flocking/
rally/tracking-ring/building-destruction/pause-resume.
**M_CONSTRUCTION** — progress rings + builder badges.
**M_COMBAT_POLISH / M_AI_DEPTH / M_MOBILE / M_BALANCE /
M_ACCESSIBILITY / M_TITLE** — combat texture, AI brain depth,
Pixel-5a perf, playtest tuning, a11y, title polish.
**M_AUDIO** — full event audio coverage from the 9 dedicated
references/ packs.
**M_EXPANSION** — 180-item v0.4 forward queue items
M_EXPANSION.A.* / .F.* / .S.* / .T.* / .U.* / .D.* / .O.* / .AU.*
(audit, features, systems, tests, UX, docs, ops, audio).
**M_BRAND / M_MODES / M_TURNS** — 6-mode preset cascade,
modes cascade + Custom Realm flag, turn-based + max-turns cap.
**M_FEATURE / M_QUALITY / M_POLISH / M_BALANCE_2** — v0.4 cycle
M_FEATURE.1–6 (road, Discovery cost scaling, science, Wonder,
Trebuchet, Witch magic) + M_QUALITY.1–3 (atomic spawn,
goblin-share rebalance, AI-vs-AI determinism smoke) +
M_POLISH.1/2/4 (dust-puff FX, build-complete sound, sawdust
particles) + M_BALANCE_2.1+.2 (wood-cost tightening, late-game
escalation).
**M_PROCESS** — review-trio dispatch discipline, worktree
ownership, anti-stop hook patches.
**M_POLISH3** — scene-blank root-cause (corrupted TTF files,
NOT WebGL Context Lost), AI-vs-AI playthrough harness with .webm
recording + transcripts, journey screenshot ledger (per-mode,
weather, day-night, modal, selection, viewport-matrix),
husky pre-push gate, ErrorOverlay boot install + console.warn
capture, SuspenseProbe replacing fallback={null}, CodeRabbit
finding sweep, GameOverModal CustomEvent + setInterval poll.
**M_NEXT** — post-merge cleanup of deployed Pages (CSP
'unsafe-eval' for koota), workflow refactor to standard
ci→release→cd trio, permanent sql.js pin with dependabot ignore-
list, app version from package.json, SVG favicon, pre-push hook
deletion-only-skip.

Full per-item detail with commit SHAs lived in directive.md until
the 2026-05-24 compression. `git log --grep='M_[A-Z]'` reproduces
the audit trail.
