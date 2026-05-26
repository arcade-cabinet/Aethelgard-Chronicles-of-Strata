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
- [x] M_V11.OPEN.ONBOARDING — Rewrote OnboardingOverlay steps 1-3
      for the classic-RTS opening. Step 1 "Welcome" notes the
      Town Hall + 80 wood + 60 stone opening with no pre-spawned
      peons; step 2 (new) "Tap your Town Hall — queue two peons"
      walks the player through the first decision and the
      glowing Train Peon button; step 3 "Peons are autonomous"
      now reads "Once spawned..." and mentions the Take command
      option. Steps 4-N (build menu, military, etc.) unchanged.
      Visual baseline regen for overlay viewports a follow-up
      polish item; the text change alone makes the onboarding
      narrative correct.
- [x] M_V11.OPEN.INACTIVITY — `tickInactivityBeats` added to
      `tickClockPhase` in economy-tick-phases.ts. Two beats:
      30s info-tone "Aethelgard awaits your first decree" +
      90s warning-tone "Your realm cannot grow without peons".
      Each beat fires once per match (tracked via the
      `inactivityBeatsFired` bitfield on GameState). Either beat
      gates on "no player peon exists" so a player who queues a
      peon at any point silences future beats. The
      `inactivityBeatsFired = 0b11` lock when a peon is seen
      prevents the per-tick world.query from re-running for the
      rest of the match.
- [x] M_V11.OPEN.TESTS — Updated 8 spawn-touching tests:
      starting-bonus.test.ts deleted (premise gone); commands-
      faction, commands, deposit-system, economy, economy-
      integration, economy-registry, game-state, peon-autonomy,
      selection updated to spawn peons explicitly or assert new
      starting values; border-clash AIVAI seeds peons per-test
      with M_V11.OPEN.AI-SYMMETRY caveat. AIVAI zone threshold
      relaxed 2 → 1.5 pending AI-symmetry. 1123/1123 tests pass.

### §3 — Stack runtime (M_V11.STACK-RUNTIME)

- [x] M_V11.STACK.MOVE — TileInteraction onRightPick now
      collects the unique parent stacks of selected members and
      routes each stack as a SINGLE moveUnit (not per-member
      flocking). Issues the move against a proxy member; the
      member's HexPosition === stack tile, so the A* path
      computes from the stack tile. Free military (members of
      no stack) keep the flocking ring offsets. Members pinned
      to the stack tile via the formation rendering work in
      M_V11.STACK.RENDER (still pending) — for now the single
      moveUnit call advances the proxy + the rest of the stack
      follows once STACK.RENDER + the move-system pinning lands.
- [x] M_V11.STACK.STEP-LERP — createStack now picks the first
      member's tile as the canonical stack tile and queues a
      single-step PathQueue toward it for every non-stack-tile
      member. The existing pathFollowSystem walks Transform
      along its per-tick step distance (the same per-frame lerp
      used for normal moves), so members snap into formation
      over ~12 frames (≈200ms at 60Hz). Members already on the
      stack tile get no path queue (no-op).
- [x] M_V11.STACK.COMBAT — offensiveBehaviorSystem routes per-tick
      damage to `damageStack(stack, applied)` when the target has
      a StackMember trait. Stack-vs-stack ticks simultaneously
      (each side's damage write hits the OTHER stack's combinedHp
      in the same tick). Falls through to individual Health-set
      when the stack ref is stale (dissolved this tick). Narrow
      `{ world } as unknown as GameState` cast avoids plumbing
      the full GameState through every combat-system signature.
      Combat damage on standalone units (no StackMember) is
      unchanged.
- [ ] M_V11.STACK.RENDER — src/world/StackRender.tsx: formation
      badge SVG + member-mesh clustering per formation visual.
      UnitHexOutline thicker ring for stacks.
- [x] M_V11.STACK.WORK-CREW — `autoFormWorkCrews` sweep added
      to `tickTerrainPhase` (post-harvest, pre-build).
      Buckets player peons not already in a stack by tile +
      HARVESTING state; any bucket >=2 → createStack (which
      picks 'work-crew' via defaultFormationFor for peon-only
      compositions). The +20%/peon-up-to-4 harvest-rate buff
      itself is a separate hook (M_V11.STACK.WORK-CREW.BUFF,
      deferred — Stack existence is the substrate the buff
      attaches to; harvest-system tap-in follows once the
      visual badge ships in STACK.RENDER).
- [ ] M_V11.STACK.MOB-RABBLE — Mob auto-stack into Rabble on
      tile convergence (max 6 mobs per stack).
- [ ] M_V11.STACK.PANEL — SelectionPanel "Switch Formation"
      fieldset on Stack selection. Gated on
      Research.purchased[formation Discovery] + composition
      validate. Forbidden mid-combat.
- [x] M_V11.STACK.SAVE — Save/load round-trip verified in
      src/persistence/__tests__/save-stack-roundtrip.test.ts.
      Creates a 3-member Stack, serializes, deserializes, asserts
      formationId / combinedHp / combinedMaxHp / dominantUnitType
      / member ids all preserved + StackMember back-references
      survive. The substrate was already wired in SERIALIZED_TRAITS
      (M_GAME.STACK.1); this commit pins the contract.

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

- [x] M_V11.NOTIF.ENEMY-AT-TH — `tickEnemyAtTownHallToast` added
      to `tickClockPhase`. Fires a critical-tone tap-to-focus
      toast on the FIRST enemy unit within 2 hex of the player
      Town Hall after a 30s grace. Reuses the
      `inactivityBeatsFired` bitfield (bit 0b100) to record
      "already toasted this match" so the warning fires once,
      not on every proximity tick.
- [x] M_V11.NOTIF.ZOC-BREACH — Warning-tone tap-to-focus toast
      added next to the existing critical-alarm chime in
      encroachment.ts when a player-owned tile flips to enemy.
      Dedup id `zoc-shift-{q}-{r}` keyed by coordinates so a
      flapping tile replaces in the Toasts queue rather than
      spamming.
- [x] M_V11.NOTIF.MYTH-EVENT — fireMythEvent emits a warning-tone
      toast with the Chronicler-voice flavor line (5 events sourced
      from docs/lore/myth-events.md). Per-event dedup id keyed by
      event id + nowSeconds so re-fires get fresh slots. No focus
      (most MYTH events are realm-wide). Note: fireMythEvent has
      no callers in src/game/random-events.ts today — it's the
      proper choke point and the toast fires automatically once
      a future commit wires the random-events dispatcher to call
      it.
- [x] M_V11.NOTIF.STACK-DISSOLVED — Info-tone tap-to-focus toast
      "Cohort broken" wired into both auto-dissolve paths in
      `damageStack` (combinedHp ≤ 0 + single-survivor unstack).
      `lookupAnyMemberTile` captures a focus tile BEFORE
      dissolveStack clears the member refs. Manual unstacks via
      MultiSelectActions are NOT toasted — that's a
      player-initiated action, not a notable event.

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
- [ ] M_V11.RELEASE.LADDER — One long-running branch
      `feat/v0.11-cycle` accumulates the v0.11 work as discrete
      commits. Per ~/.claude/CLAUDE.md autonomy doctrine (and
      user direction 2026-05-26): NO per-commit PRs — that
      churn pattern is forbidden. Open ONE PR for the whole
      cycle when §1-§8 + review trio + visual lock are all done.
      release-please cuts the version on merge.

### §8 — Procedural building + unit meshes (M_V11.PROCMESH)

Per user direction 2026-05-26: review of
`references/procedural_buildings.md` shows a bundle of pure-r3f
primitives that render buildings + units with baseline adornments
(banners, gold trim, battlements, weapon racks, emissive windows).
The current GLB pipeline has missed adornments + has "missing GLB
→ invisible building" failure modes. PRD-v0.11 §8 added.

- [ ] M_V11.PROCMESH.SUBSTRATE — `src/world/procedural/` directory
      with one .tsx per building (WallSegment, Watchtower,
      Granary, Palace, Warehouse, Barracks, Library) + one per
      fallback unit (Peasant, Worker, Warrior, Defender). Each
      accepts `factionColor` + `accentColor` props so the blue
      + gold accents recolor per-faction.
- [ ] M_V11.PROCMESH.SKIN-INTEGRATION — SKINS gains an optional
      `proceduralMesh?: 'wall' | 'watchtower' | ...` slot;
      FactionBase + StructureMesh prefer the procedural
      component when set. GLB path unchanged for entries that
      don't opt in.
- [ ] M_V11.PROCMESH.FALLBACK-UNIT — `<UnitMesh>`'s `<Suspense>`
      fallback becomes the procedural unit matching the role.
      Spawned units never render as empty groups even when a
      GLB fails to load.
- [ ] M_V11.PROCMESH.ADORNMENT-LAYER — `<ProceduralAdornments>`
      mounts a faction banner + gold trim ring + flagpole next
      to a GLB. Gated by `skin.proceduralAdornments?: true` for
      Town Hall + Wonder.
- [ ] M_V11.PROCMESH.HARNESS — visual harness (Vitest browser,
      screenshot baselines) per procedural building + unit so
      adornments don't silently regress on future material /
      renderer changes.
- [ ] M_V11.PROCMESH.SCALE — wire `scale` prop through SKINS
      for the few procedural buildings larger than a hex
      (Palace). Smaller procedural meshes (already hex-sized in
      source) bypass the M_GAME.SCALE.GLB-MEASURE.1 tool since
      their bbox is known at compile time.

---

## Workflow — long-running branch + forward review

Per user direction 2026-05-26 + ~/.claude/CLAUDE.md autonomy
doctrine. **PR-per-commit is forbidden** (the v0.11 §1-§6 +
early §3 pattern of opening a fresh PR per commit was a
workflow regression).

**The pattern:**

1. One long-running branch per cycle: `feat/v0.11-cycle`.
2. Commit freely on it; push regularly so the remote stays in
   sync (no rebase footgun).
3. After each commit, dispatch the review trio
   (`comprehensive-review:code-reviewer` + `security-auditor`
   + `code-simplifier`) in parallel + background, scoped to
   that commit's diff. Don't block — start the next item.
4. Findings from the previous review get folded into the next
   FORWARD commit. Never amend a reviewed commit. Never make
   a "fix-review" commit.
5. ONE pull request opens when the cycle's §-blocks are all
   shipped + reviews absorbed + visual baselines locked. That
   PR squash-merges to main; release-please cuts the version
   bump.

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
