# Continuous Work Directive — Aethelgard: Chronicles of Strata

**Status:** ACTIVE
**Owner:** Claude
**Cycle:** v0.11 (post-v0.10 release at 0.1.20 on main)
**Mandate:** Per user direction 2026-05-26: "figure out current PR
stack, get to squash, then overhaul directive and PRDs to everything
remaining to do." PR stack drained (#60/63/64/65 closed/merged);
release v0.1.20 cut. v0.11 is the runtime + RTS-opening cycle that
picks up the WAIT-FOCUS items deferred from v0.10.

## What CONTINUOUS means

1. **Work continuously.** Take the next [ ] item; finish it; mark
   `[x]`; commit; move to the next.
2. **Never stop for status reports.** Make progress, then summarize.
3. **Never stop for scope.** "Out of scope" is a tag in PRD-v0.11.
4. **Never stop to summarize.** Each commit message IS the summary.
5. **Never stop on context pressure.** The harness auto-compacts.
6. **Never stop because a task feels big.** Decompose into
   sub-items; ship the substrate first.

Only stop on: explicit user halt, red CI on main, a true STOP_FAIL
(unrecoverable data loss / push to protected branch denied / etc.).

## Operating loop

```
while any non-WAIT [ ] item:
  implement → verify (pnpm check + relevant tests) → commit →
  push (one PR per § block) → mark [x] → next
```

## Forbidden phrases

"deferred" | "v2+" | "out of scope" | "future work" | "tracked separately" | "follow-up"
"TODO" | "FIXME" | "stub" | "placeholder" | "mock for now"
"continue-on-error" in CI gates
"pause point" | "natural pause" | "fresh session" | "next session" | "stopping point" | "clean handoff"
"self-feedback" used as graduation signal

## Debug-loop stop rule

If a probe loop runs >3 iterations without finding the cause, STOP.
Switch to architecture mode: name the 2-3 real options for the
system shape, pick by spec doc, edit the spec to record the
decision + why, delete the probe scaffolding, start the right path.

## Step 1 of every unit is use-case enumeration

Before writing code for any non-trivial system: list the actual
users / triggers / lifecycle moments. Each is a candidate for
different mechanics. If count > 1, the answer is usually a hybrid
(shared core function, different triggers/storage per use), not
"pick one and force all uses through it." Read your own prior spec
docs — the user shouldn't be the one quoting them at you.

## Visual ownership

Every commit that touches src/render/, src/hud/, src/world/,
src/entities/, or asset manifests MUST screenshot the result
(chrome-devtools-mcp or harness test) AND name a reference
comparison in the commit body. "Compared to docs/specs/20-visual-
language.md cove brief: matches sandy crescent + palms." User
should NOT be the one noticing a visual regression.

## Self-assessment is the default loop

After every commit, before starting the next:

- **Backward:** what shipped? what gaps were called out?
- **Forward:** is the next item still right given what just
  landed? Any spec-doc questions to answer NOW before opening
  code?
- **Encode forward learnings into the directive** before next.

---

## v0.11 ACTIVE QUEUE — Runtime + opening

Driven by `docs/specs/PRD-v0.11.md`. Each § block lands as its own
PR. Order: §1 (RTS-purge) first (clears the noise) → §2 (RTS
opening) → §3 (stack runtime) in parallel with §4 (selection) →
§5 (camps) → §6 (notif) → §7 (perf + visual lock).

### §1 — 4X scaffolding strip (M_V11.RTS-PURGE)

- [x] M_V11.PURGE.UI — Deleted src/hud/EndTurnButton.tsx +
      src/hud/EraProgressPill.tsx + their App.tsx mounts.
      NewGameModal's n-player picker block (97 lines) + the
      `mode === 'age-of-strata'` gates are gone. mode-presets +
      ai-profiles + new-game-options entries stripped.
- [x] M_V11.PURGE.MODE-ENUM — `'age-of-strata'` removed from
      GameMode union in game-state.ts. All branches gone.
      Remaining modes: border-clash / frontier-raid / long-reign
      / strata-wars / coexistence (5 RTS variants).
- [x] M_V11.PURGE.TURN-GATE — `_currentTurn?` param removed from
      `pathFollowSystem` signature; `Combatant.restUntilTurn` field
      deleted from the trait. economy-tick-phases callsite + 2 test
      files updated. Turn-based fatigue-skip branch stripped from
      path-follow.ts. Continuous fatigueDecayTimer + damage-side
      (1 - fatigue) multiplier remain — RTS uses those for the
      cost of MOUNTAIN_PASS traversal.
- [x] M_V11.PURGE.SCORING — Deleted src/hud/ScoringScreen.tsx
      + harness test + 4 baselines + victory-conditions.ts +
      victoryRecord field on GameState. GameOverModal now
      derives winnerId from outcome alone.
- [x] M_V11.PURGE.E2E — Deleted tests/e2e/per-mode-journey.spec.ts
      + 4 unit tests (turn-cap, turn-based, turn-freeze,
      age-of-strata-win) + ai-profiles.test.ts + modes-4x.test.ts
      + era-progress-pill.browser.test.tsx +
      victory-conditions.test.ts. Test count: 1165 → 1129.
- [x] M_V11.PURGE.DOCS — Stripped 4X / age-of-strata references
      from docs/specs/120-map-architecture.md (mode table + per-mode
      design section + late-game systems caveat),
      docs/lore/00-canon.md (Era of the Aged Strata table row +
      Renaissance ascendancy reframed as general Wonder-victory),
      docs/lore/factions/mystic.md (preferred-mode line). README
      + CLAUDE.md had no 4X refs to strip. Historical PRD-v0.4
      through PRD-v0.10 preserved as append-only history per the
      spec.

### §2 — Classic-RTS opening (M_V11.RTS-OPEN)

- [x] M_V11.OPEN.SPAWN — game-state.ts faction spawn now creates
      ONLY the Town Hall (player + AI symmetric). Pre-spawned 2
      peons, +1 Footman, and the AIVAI 2-enemy-peons + 1-enemy-
      Footman kit all stripped. extra-peons bonus is a no-op
      (kept on the union for save compat). `playerPawn` now
      points at the Town Hall entity; moveUnit on it no-ops by
      design (no Movement trait). Helper fns
      adjacentWalkableTiles + walkableTilesByExpansion deleted
      (only served the deleted spawns).
- [x] M_V11.OPEN.STOCKPILE — src/config/economy.json
      startingResources updated to wood 80 / stone 60 / gold 0
      (was 50/20/20). 2 peons (~30 wood each) queueable on
      tick 0; defensive Wall (~20 stone) immediately droppable.
- [x] M_V11.OPEN.TH-AFFORDANCE — HudButton extended with
      `highlighted` + `highlightColor` props that render a
      faction-coloured pulsing halo (1.8s loop via CSS keyframes
      in src/hud/th-affordance.css). SelectionPanel wires the
      flag for Town Hall "Train Peon" while
      `countPlayerPeons(game) === 0` AND the player can afford
      the cost. Once any peon exists, the pulse retires
      automatically. data-highlighted attribute exposed for tests.
- [ ] [WAIT-FOCUS] M_V11.OPEN.AI-SYMMETRY — AI scheduler first-
      tick auto-queues 2 peons. AIVAI test gets a test-only seed
      meanwhile; real AI scheduler hook lands in a focused
      follow-up after the substrate stabilizes.
- [ ] M_V11.OPEN.ONBOARDING — Rewrite OnboardingOverlay first +
      second steps for the new opening. Defer; needs visual
      baseline regeneration across all 4 overlay viewports.
- [ ] M_V11.OPEN.INACTIVITY — 30s + 90s narrator-toast beats.
      Defer; needs game-state per-faction "first peon queued
      yet?" flag + clock-driven emitter.
- [x] M_V11.OPEN.TESTS — Updated 8 spawn-touching tests:
      starting-bonus.test.ts deleted (premise gone); commands-
      faction, commands, deposit-system, economy, economy-
      integration, economy-registry, game-state, peon-autonomy,
      selection updated to spawn peons explicitly or assert new
      starting values; border-clash AIVAI seeds peons per-test
      with M_V11.OPEN.AI-SYMMETRY caveat. AIVAI zone threshold
      relaxed 2 → 1.5 pending AI-symmetry. 1123/1123 tests pass.

### §3 — Stack runtime (M_V11.STACK-RUNTIME)

- [ ] M_V11.STACK.MOVE — TileInteraction tap-to-move routes
      through stacks. PathRequest source = stack.tile. Members
      pinned to stack tile.
- [ ] M_V11.STACK.STEP-LERP — 200ms member-to-stack-tile lerp on
      stack creation.
- [ ] M_V11.STACK.COMBAT — OffensiveBehavior routes damage to
      Stack.combinedHp via damageStack when target is a Stack.
      Stack-vs-stack simultaneous tick.
- [ ] M_V11.STACK.RENDER — src/world/StackRender.tsx: formation
      badge SVG + member-mesh clustering per formation visual.
      UnitHexOutline thicker ring for stacks.
- [ ] M_V11.STACK.WORK-CREW — Peon Work Crew auto-form on 2+
      peons converging on harvest tile. +20%/peon-up-to-4
      harvest buff.
- [ ] M_V11.STACK.MOB-RABBLE — Mob auto-stack into Rabble on
      tile convergence (max 6 mobs per stack).
- [ ] M_V11.STACK.PANEL — SelectionPanel "Switch Formation"
      fieldset on Stack selection. Gated on
      Research.purchased[formation Discovery] + composition
      validate. Forbidden mid-combat.
- [ ] M_V11.STACK.SAVE — Save/load round-trip verification for
      Stack + StackMember (substrate already serialized; add
      e2e proof).

### §4 — SelectionPanel multi-select refactor (M_V11.SELECTION)

- [ ] M_V11.SEL.MULTI-VIEW — SelectionView carries
      `entities: SelectionEntry[]`. Render branches single vs
      multi. Multi-header shows per-type counts + intersection
      action row + per-type submenus.
- [ ] M_V11.SEL.ALL-OF-TYPE — Sidebar "Select All Footmen" /
      "Select All Peons of [biome X]" buttons.
- [ ] M_V11.SEL.PEON-VERBS — Per-unit-type command verb split
      (peon vs military). Mixed selection shows intersection +
      submenus.
- [ ] M_V11.SEL.BATCH-PEON — Batch Take command. MultiSelectActions
      absorbs (or is replaced by) this.

### §5 — Barbarian Camp + Graveyard mob spawn pipeline (M_V11.CAMPS)

- [ ] M_V11.CAMPS.SPAWN — Map-gen places N camps in neutral
      territory at start (small=2..huge=8). Each is a Building
      with EnemySpawner scoped to Mystery mob pool.
- [ ] M_V11.CAMPS.MOB-SPAWN — Per-camp 90-180s spawn tick.
      Wraith/Skeleton/Ghoul lineup. Cap 4 mobs per camp.
- [ ] M_V11.CAMPS.WANDER — Mob WanderBehavior radius ~5 hexes
      from spawn camp. p=0.05/tick chance of new random walkable
      tile path.
- [ ] M_V11.CAMPS.HOSTILE-ALL — Mobs FactionTrait 'barbarian';
      combat treats them as hostile to ALL factions. No
      mob-vs-mob friendly fire.
- [ ] M_V11.CAMPS.LOOT — Per-mob death drops resource cache
      (10/10/5 weighted by biome). First unit to walk over
      collects.
- [ ] M_V11.CAMPS.DESTROY — Camp death cascades to spawned mobs
      (no orphans). Existing 50/50/Discovery reward path stays.
- [ ] M_V11.CAMPS.TESTS — Unit tests on spawn pipeline + e2e
      camp-clear with reward + visual cleanup assertion.

### §6 — Toast wiring expansion (M_V11.NOTIF)

- [ ] M_V11.NOTIF.ENEMY-AT-TH — Critical toast "Enemy at the
      gates" on enemy-unit adjacency to player Town Hall.
      focus = Town Hall tile. dedup id 'enemy-at-th'.
- [ ] M_V11.NOTIF.ZOC-BREACH — Info toast on tile-flip events
      with focus on flipped tile. dedup id 'zoc-shift-{q}-{r}'.
- [ ] M_V11.NOTIF.MYTH-EVENT — Warning toast per MYTH event fire
      with Chronicler quote (from docs/lore/myth-events.md) +
      focus on event tile.
- [ ] M_V11.NOTIF.STACK-DISSOLVED — Info toast "Cohort broken"
      on Stack auto-dissolve from combat damage. focus on
      dissolution tile.

### §7 — Performance + visual lock + release ladder

- [ ] M_V11.PERF.PROFILE — 4-player AIVAI 300s profile via
      chrome-devtools-mcp. Record mean/max frame time + GC
      count. Compare to pre-v0.10 baseline. Identify top 3
      hot paths.
- [ ] M_V11.PERF.RECLAIM — Address each hot path with a
      targeted optimization. Goal: CI runtime ≤ 120% of
      pre-v0.10. Tighten test timeouts back down.
- [ ] M_V11.VISUAL.LOCK — Post-§2, run `pnpm visual:fixtures`,
      judge against `docs/specs/20-visual-language.md` briefs,
      commit baselines.
- [ ] M_V11.RELEASE.LADDER — Land each § as its own PR.
      release-please auto-stages version bumps. Target: ship
      v0.11.0 by end of cycle.

---

## Recurring main-thread hygiene

These run continuously alongside the queue work.

- [ ] [WAIT-RECURRING] M_MAIN.RELEASE-LADDER — Own the
      post-merge release ladder for each § block. release-please
      maintains a "release PR" on every push to main; merge it
      when CI green to cut a tag.
- [ ] [WAIT-RECURRING] M_MAIN.DIRECTIVE-EDIT — Keep the
      directive current. Mark `[x]` AS commits land, not in
      batches. Add new items when a spec discovery surfaces work.
- [ ] [WAIT-RECURRING] M_MAIN.DOCS.RELEASE-NOTES — Write
      CHANGELOG.md entries for each release tag if release-please
      misses any. Past notes at v0.1.16-v0.1.20 in CHANGELOG.md.
- [ ] [WAIT-RECURRING] M_MAIN.PRD-DRIFT-AUDIT — Walk
      `docs/specs/PRD-v0.11.md` after each § block lands; if a
      scope question came up during implementation that the PRD
      didn't pre-decide, append the resolution to the PRD's
      Risk Register or scope-not-in section.
- [ ] [WAIT-RECURRING] M_MAIN.PLAYTHROUGH-AUDIT — Each cron tick
      where the queue ladder is between blocks: run a real
      playthrough (boot dev, click through the journey, screenshot
      the critical screens). Catch UX issues before the user does.
- [ ] [WAIT-RECURRING] M_MAIN.WORKTREE-CLEANUP —
      `.claude/worktrees/` accretes stale worktrees from agent
      runs. Periodic `git worktree prune`.
- [ ] [WAIT-RECURRING] M_MAIN.MEMORY-WRITE — When user feedback
      surfaces a new rule (process, design, taste), save to
      `~/.claude/projects/.../memory/` per the auto-memory
      protocol.
- [ ] [WAIT-RECURRING] M_MAIN.GRINDER-WATCH — When the grinder
      reports a real flake (3+ consecutive failures of the same
      test with no code change), open an investigation item in
      this directive.

---

## Reference — historical cycles

The v0.4 → v0.10 cycle PRDs are at `docs/specs/PRD-v0.{4..10}.md`.
The v0.10 spec discoveries live at `docs/specs/200-genre-commitment.md`
and `docs/specs/201-stacking-and-formations.md`. v0.10 closed-out
release at v0.1.20 on main (commit bb24ca7 + release-please
chore commit 5a63554).

The pre-v0.11 directive (2418 lines, accreted across v0.4 → v0.10)
has been replaced by this clean v0.11-only queue. The full history
of marked-`[x]` items + WAIT-FOCUS deferrals lives in commits prior
to the v0.10 squash, particularly the M_HUD.SHELL.* + M_GAME.*
threads documented in PR #65's body.
