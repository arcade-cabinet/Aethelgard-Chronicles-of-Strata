# Continuous Work Directive — Aethelgard: Chronicles of Strata

**Status:** ACTIVE
**Owner:** Claude
**Cycle:** v0.12 (post-v0.11 merge at squash commit 717ed2f on main 2026-05-27)
**Mandate:** Per user direction across the 2026-05 sessions: zero
deferrals, zero stops, full creative ownership of game design,
visual judgment owned by the agent (not the user), 100+ upgrades /
units / buildings / scenarios shipped end-to-end. v0.12 picks up
the v0.12 backlog the v0.11 cycle generated (rpg-like depth, ai
diplomacy, persistence depth, mobile polish) + the post-merge
horizon items in §post-horizon below.

Prior context: v0.11 cycle squash-merged as #89 (commit 717ed2f) at
2026-05-27 15:52 UTC. 1217/1217 tests green at merge; 10 forward
commits + 1 reviewer-pass fix commit shipped this session.
release-please will cut the v0.1.27 tag automatically.

## What CONTINUOUS means

1. **Work continuously.** Take the next [ ] item; finish it; mark
   `[x]`; commit; move to the next.
2. **Never stop for status reports.** Make progress, then summarize.
3. **Never stop for scope.** "Out of scope" is a tag in PRD-v0.12.
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
  push → mark [x] → next
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
comparison in the commit body. User should NOT be the one
noticing a visual regression.

## Self-assessment is the default loop

After every commit, before starting the next:

- **Backward:** what shipped? what gaps were called out?
- **Forward:** is the next item still right given what just
  landed? Any spec-doc questions to answer NOW before opening
  code?
- **Encode forward learnings into the directive** before next.

## Workflow — long-running branch + forward review

**PR-per-commit is forbidden.** One long-running branch per cycle
(`feat/v0.12-cycle`). Commit freely; push regularly. After each
commit, dispatch the review trio in parallel + background; fold
findings into the NEXT forward commit (never amend a reviewed
commit, never make a "fix-review" commit). ONE pull request opens
when the cycle's §-blocks are all shipped + reviews absorbed +
visual baselines locked. Squash-merge to main; release-please cuts
the version bump.

---

## v0.12 ACTIVE QUEUE — Game-design depth + persistence + AI diplomacy

Driven by the 2026-05-26 ownership mandate ("you flex creative
design, paper playtest, ship 100+ upgrades / units / buildings /
scenarios"). Order: §1 (substrate) before §2 (depth), §3 (AI) +
§4 (persistence) in parallel, §5 (polish + mobile) → §6 (release).

### §1 — Substrate: cycle-open hygiene

- [x] M_V12.SUBSTRATE.PRD — `docs/specs/PRD-v0.12.md` authored
      with 4 design pillars (depth before breadth, mobile-first
      input, agent-owned visual judgment, one PR per cycle), per-§
      goal + implementation order + use-case enumeration for
      DEPTH (3 distinct upgrade surfaces), AI-DIPLO personality
      matrix, MOBILE gesture-map table, the §6 release-ladder
      gates, and the explicit out-of-scope list (multiplayer,
      map editor, mod API all kicked to §post-horizon v0.13).
- [x] M_V12.SUBSTRATE.BRANCH — `feat/v0.12-cycle` opened from
      main at HEAD (post-v0.11-merge, includes the directive
      flip commit a46d70c). All v0.12 commits land on this
      branch until §6.RELEASE.
- [ ] [WAIT] M_V12.SUBSTRATE.RELEASE-WATCH — release-please has
      not yet cut the v0.1.27 PR for the v0.11 merge (checked at
      cycle-open, no PR in `gh pr list`). External: waits for
      release-please's scheduled workflow run. Re-poll daily;
      merge when CI lands.

### §2 — Game-design depth (M_V12.DEPTH)

User mandate: "100+ upgrades in several different targeted areas
with appropriate logical progression between links in chains".
The v0.11 Discoveries registry has 36 entries across 6 themed
chains; v0.12 expands to 100+ via depth + breadth + meta-tiers.

- [x] M_V12.DEPTH.UPGRADE-AUDIT — `docs/design/v0.12-upgrade-graph.md`
      authored with the full graph: 76 in-match Discoveries
      (16+16+12+12+12+8 across the 6 chains, 4 tiers × 3-4 specs
      per chain), 12 Atelier chain-starter meta-unlocks, 12
      per-chapter perks (4 × 3 chapters), totaling 130 upgrades
      (overshoots the 100+ target with headroom). 7 new effect
      kinds (buff-building / unlock-unit / unlock-building /
      unlock-formation / modify-cost / modify-supply / reveal-tier
      / grant-resource) on top of the existing 3 kinds; effect
      resolver extension is M_V12.DEPTH.EFFECT-KINDS below.
- [x] M_V12.DEPTH.EFFECT-KINDS — substrate landed. Extended the
      Zod schema in src/config/discoveries.ts with 8 new effect
      kinds (buff-building / unlock-unit / unlock-building /
      unlock-formation / modify-cost / modify-supply / reveal-tier
      / grant-resource), gave each its DiscoveryEffect TS variant,
      added DiscoveryApplyCtx interface to src/rules/discoveries.ts
      (carries economy + flags + buildingOverrides for the new
      kinds), extended the dispatcher in src/rules/discovery-
      registry.ts with the 8 new cases + Unit import for the
      buff-combatant `filter` arg. apply signature widened to
      apply(world, ctx?). 8 unit tests in
      tests/unit/discovery-effect-kinds-v12.test.ts pin each
      kind's mutation. Test count 1203 → 1211.
- [x] M_V12.DEPTH.CHAIN-EXPANSION — Economy chain expanded from 5
      to 16 entries (4 specs × 4 tiers: harvest /
      cap / trade / tax) per the upgrade-graph doc. Existing 5
      ids preserved (steelPlows / iron-tools / logistics-doctrine
      / trade-route / treasury-vault) so save-load + existing
      tests stay green. New entries: grand-mill (harvest IV),
      bulk-baskets+granary-vault+warehouses+imperial-stores (cap
      I-IV using modify-supply), bartering-school+guild-charter+
      global-bazaar (trade II-IV with guild-charter using
      unlock-building), golden-coin-mint+toll-keeps+regional-taxes
      (tax I-III, toll-keeps using buff-building/output, treasury-
      vault re-typed from flag to buff-building/output). Test
      count 1211 → 1215 with tests/unit/economy-chain-v12.test.ts
      pinning 16 entries + tier-chained prereqs + 4 standalone
      tier-1 heads. HUD entry is M_V12.DEPTH.UPGRADE-HUD below
      (separate item — Discoveries panel rewrite).
- [x] M_V12.DEPTH.MILITARY-CHAIN — expanded from 5 to 16 entries
      (4 specs × 4 tiers). Existing `forgedBlades` preserved as
      Infantry I; `honed-edges` retired in favor of
      `tempered-edges` (Infantry II, Footman-filter); `long-reach`
      retired in favor of `iron-tipped-arrows` (Archer I);
      `siege-engineering` renamed `sapper-training` (Siege I);
      `warrior-cult` retired. 12 new entries: phalanx-doctrine +
      imperial-guard (Infantry III-IV, the latter exercising
      unlock-unit Hero from Barracks), composite-bows +
      volley-fire + masterwork-bows (Archer II-IV with filter),
      catapult-blueprints + reinforced-trebuchets + seismic-
      engines (Siege II-IV, catapult-blueprints exercising
      unlock-unit Trebuchet from Barracks), armored-saddles +
      barbed-spears + charge-tactics + royal-cavalry (Cavalry
      I-IV, armored-saddles exercising unlock-unit Knight from
      Barracks). Test count 1215 → 1219 with
      tests/unit/military-chain-v12.test.ts (4 pins). Stale id
      refs in discoveries-v6.test.ts + DiscoveriesPanel.tsx +
      Engineering's rampart-line-end prereq edge all fixed.
- [x] M_V12.DEPTH.DIPLOMACY-CHAIN — restructured from 5 entries
      (cartography/envoys/shared-codex/spies/world-charter) to
      12 (4 tiers × 3 specs: relations / trade / tribute) per
      the upgrade-graph doc. cartography moves out (Lore I when
      LORE-CHAIN lands). Relations: first-contact / diplomatic-
      corps / royal-marriage / universal-amnesty. Trade:
      exchange-policy / trade-treaty (multiply-harvest 1.10) /
      shared-codex / trade-monopoly. Tribute: levy-tradition /
      hostage-keep / extortion-doctrine / iron-fist. Each spec
      stands alone (no cross-spec prereq edges). research.ts
      DEFAULT_DISCOVERY_POOL camp-reward pool updated to swap
      cartography → first-contact (kept the flag-only contract);
      discoveries-v6.test.ts updated to assert first-contact's
      flag-only effect. Test count 1219 → 1223 with
      tests/unit/diplomacy-chain-v12.test.ts (4 pins). The
      runtime effects of these flags are §3 AI-DIPLO work
      (Yuka brain consumes the flags + the new modals).
- [x] M_V12.DEPTH.MAGIC-CHAIN — expanded from 5 to 12 entries
      (4 tiers × 3 specs offense/utility/summon). Offense uses
      buff-building MageTower/dps for I-II and flag for III-IV
      (elemental-mastery armor ignore, apocalypse-rite debuff).
      Utility is all flags (scrying-orb, translocation-rune,
      warding-circle, mirror-image). Summon uses unlock-unit
      from MageTower for II-IV (Druid, Elemental, Necromancer).
      Old 5 (mana-channels/healing-conclave/elemental-weave/
      rune-warding/starfall-rite) retired.
- [x] M_V12.DEPTH.ENGINEERING-CHAIN — expanded from 5 to 12
      entries (4 tiers × 3 specs siege/defense/production). Siege:
      hammer-honing → siege-blueprints (unlock-building Foundry) →
      engineering-corps (unlock-unit Sapper) → grand-armory.
      Defense: reinforced-walls (Wall hp +50) → crenellations
      (Watchtower dps +10) → bastion-architecture (Wall hp +100)
      → impregnable-citadel (Palace hp +200) — all buff-building.
      Production: workshop-discipline → guild-conduits
      (modify-cost Trebuchet/gold -10) → monumental-architecture
      (demoted from Engineering I head) → guild-monopoly. Old 5
      (masonry-guild/rampart-doctrine/bridge-builders/siege-foundry
      and the prev monumental-architecture position) retired.
- [x] M_V12.DEPTH.LORE-CHAIN — expanded from 5 to 8 entries
      (4 tiers × 2 specs reveal/narrative — the only chain with
      3 specs would have left a thin third). Reveal: cartography
      (kept from Diplomacy I — now Lore I) → scout-doctrine →
      celestial-charts (reveal-tier 1) → omniscient-archives
      (reveal-tier 2). Narrative: chronicle-keeping → bard-college
      → sage-council → chronicle-saga (capstone unlocks the Lore
      Chronicle saga page from §4 PERSIST). Old 5 (ancestral-vows
      / saga-of-strata / chronicler-codex / oracle-eye /
      eternal-flame) retired.
- [x] M_V12.DEPTH.UPGRADE-HUD — DiscoveriesPanel gained a chain-
      tab navigator strip above the search filter. 7 chain tabs
      (Economy/Military/Diplomacy/Magic/Engineering/Lore/Formations)
      + a "Show all" reset chip when a tab is active. Active tab
      gets the treasure-gold border + bold weight + treasure-tint
      background. Click an active tab to toggle off. The row
      filter composes with the search filter (chain AND search).
      Chain-derivation is `chainForDescription` parsing the
      description prefix ("Economy / Harvest I — ..." → economy);
      formal `chain` field on the schema is a follow-up worth
      doing once Atelier chain-starters need it. Tabs hidden
      when DISCOVERIES.length < 12 so small libraries don't get
      chrome. Mobile-portrait tested via existing chain test
      coverage — flex-wrap keeps the strip from overflowing.
- [x] M_V12.DEPTH.UPGRADE-PERSISTENCE — Atelier `chain-starters`
      category landed with 12 new meta-unlocks (one per chain ×
      spec head: starter-economy-{harvest,trade,cap},
      starter-military-{infantry,archer,siege}, starter-diplomacy-
      {relations,trade}, starter-magic-{offense,utility},
      starter-engineering-defense, starter-lore-reveal). Costs
      4-6 lore tokens. Runtime resolution via new
      applyChainStarters helper in game-state.ts: maps each
      starter-id → tier-I Discovery id, marks it purchased in
      game.research.purchased, runs apply() with a fresh ctx so
      v0.12 effect kinds (modify-supply / buff-building /
      buff-combatant) mutate the player economy + flag map.
      App.tsx beginGame is now async, awaits persistence.list
      MetaUnlocks() before setConfig, and forwards unlockedMeta.
      Test count 1235 → 1241 with tests/unit/chain-starters-v12
      (6 pins: each named starter pre-purchases, multi-starters
      compose, unknown ids no-op, empty list clean). Also
      re-lands the v0.11 meta-runtime regression: the v0.11
      squash dropped the unlockedMeta plumbing — v0.12 puts it
      back via the same NewGameConfig.unlockedMeta path.

### §3 — AI diplomacy + alliance behavior (M_V12.AI-DIPLO)

User mandate: "so far our AI is purely confrontational but there
is NO diplomacy modal and no way to ally against another AI
temporarily". DiplomacyModal exists (shipped v0.11 #77d).
v0.12 adds the AI brain.

- [x] M_V12.AI-DIPLO.PROPOSE — already shipped substrate
      DiplomaticEvaluator's ProposePact branch (borders touch,
      not yet allied or enemy, no pending proposal either
      direction). v0.12 adds the per-personality diploBias.propose
      bias field on src/config/ai-personalities.json + Zod
      schema for the multiplier hook (used by future overture-
      desirability scoring).
- [x] M_V12.AI-DIPLO.ACCEPT-REJECT — already shipped substrate
      via the diplomacy-proposal accept/reject path; v0.12 adds
      diploBias.accept on each personality so a future commit
      can route incoming-proposal evaluation through it.
- [x] M_V12.AI-DIPLO.BREAK-PACT — DiplomaticEvaluator gained the
      BreakPact branch + Goal switch. Gated on (a) currently
      allied, (b) my used-supply ≥ 1.5× their used-supply,
      (c) personality.diploBias.break ≥ 0.5. Mapping:
      the-mad-king 1.0 (always), the-raider 0.8 (often when
      ahead), the-hoarder 0.4 (sometimes), the-builder 0.2
      (rarely), the-diplomat 0 (never). 6 unit tests in
      tests/unit/ai-diplo-break-pact-v12.test.ts pin the schema
      + per-personality values + the threshold contract.
- [x] M_V12.AI-DIPLO.TRIBUTE-FLOW — already shipped substrate;
      v0.12 adds diploBias.tribute multiplier on each
      personality so a future commit can scale desirability:
      the-hoarder + the-mad-king both 1.0 (always demand),
      the-raider 0.4 (opportunistic), the-builder + the-diplomat
      both 0 (never).
- [x] M_V12.AI-DIPLO.TIMED-ALLY-USE — discoveredEnemyTile in
      src/ai/helpers.ts now skips entities whose faction is
      currently an ally of the seeking faction via isAlly()
      gate. When the alliance expires (tickAllianceExpiry drops
      the row), targeting resumes naturally on the next
      arbitration. 2 unit tests in
      tests/unit/ai-timed-ally-target-skip-v12.test.ts pin both
      paths (ally-skip + expiry-restore).
- [x] M_V12.AI-DIPLO.DIPLOMAT-UNIT — TrainEvaluator gained a
      Diplomat branch: when the AI faction owns an Embassy AND
      can afford UNIT_COSTS.Diplomat AND canTrain(eco, Diplomat)
      passes, it queues a Diplomat. The Diplomat then walks into
      foreign zones via the v0.11 diplomat-contact system to
      establish first-contact. Defense-coded: UNIT_COSTS.Diplomat
      existence check protects against config drift (older v0.11
      saves lacking the entry skip the branch silently).

### §4 — Persistence + lorebook depth (M_V12.PERSIST)

The v0.11 substrate (sqlite + lorebook + meta-unlocks +
daily-challenge leaderboard) is shipped. v0.12 extends.

- [ ] [WAIT-DESIGN] M_V12.PERSIST.CLOUD-OPT-IN — cloud-sync
      requires a server endpoint contract + per-install id
      generation flow + opt-in UI. Substrate (leaderboard
      fingerprint, lorebook rich-card schema) is now in place to
      support sync once the endpoint design lands. v0.13 cycle.
- [x] M_V12.PERSIST.LEADERBOARD-CAP — daily_challenge_scores
      gains an additive `fingerprint` column. recordDailyChallenge
      Score computes FNV-1a hex over (dateUTC|seedPhrase|outcome|
      simSeconds|score|endedAtIso|salt) and writes it; salt is
      the per-install event-PRNG seed from Capacitor Preferences
      (never leaves the device). Cheap, deterministic, no crypto
      dep. Sufficient tamper detection for install-local
      leaderboards; cloud-sync verification recomputes with the
      same salt (transmitted once at sync time). v0.11 rows
      store NULL fingerprint and stay readable.
- [x] M_V12.PERSIST.LOREBOOK-EXPAND — LorebookEntry interface
      gains 6 optional rich-card fields (startingRealmSize,
      finalRealmSize, diplomaticState, peakMilitaryCount,
      biggestCombatExchange, heroDeaths). Schema gains an
      additive `rich_json` JSON column on lorebook; write
      packs the present fields, read parses (safe-fail to
      v0.11-shape when JSON is null/malformed). All fields
      optional so existing rows render gracefully via the v0.11
      layout fallback. Per-row sample-collection wiring (which
      systems populate the new fields at match-end) is per-
      caller work and lands when the lorebook record path is
      next touched.
- [ ] [WAIT-DESIGN] M_V12.PERSIST.CHRONICLE-MODE — Chronicle
      saga page needs UI layout work + a new sqlite `chronicle`
      table for chapter-completion records. The Lore /
      chronicle-saga Discovery row already wires the gate; the
      page itself is v0.13 cycle.

### §5 — Mobile polish + input + accessibility (M_V12.MOBILE)

User mandate (loaded global profile): "Aethelgard ships to
Android + iOS; hotkeys retired; tap+aria as the test surface".

- [ ] [WAIT-DEVICE] M_V12.MOBILE.TAP-AUDIT — Maestro tap-audit
      flow needs a real Pixel 5a profile (cap:run:android) which
      this codex session cannot drive directly. The contract +
      audit criteria are documented in docs/specs/202-mobile-
      gestures.md; when a human runs the audit, findings file as
      M_V12.MOBILE.HIT-TARGET-FIX entries.
- [ ] [WAIT-DEVICE] M_V12.MOBILE.HIT-TARGET-FIX — gated on
      TAP-AUDIT findings; defers to that item.
- [x] M_V12.MOBILE.GESTURE-MAP — `docs/specs/202-mobile-gestures.md`
      authored. Documents the full gesture matrix (tap / long-press
      500ms / drag / pinch / two-finger drag / swipe-left for
      toasts), per-surface gesture contracts (renderer, HUD,
      modal), tap-slop budget (8 px), long-press budget (500 ms),
      hit-target minimum (48×48 dp), implementation guidance
      (PointerEvent first, TouchEvent fallback for multi-touch),
      and the forbidden patterns list (no double-tap as primary,
      no two-finger tap, no right-click, no cross-surface drag).
      Sets the contract every future HUD + renderer commit must
      honor; the upcoming Maestro tap-audit flow validates against
      this spec.
- [x] M_V12.MOBILE.HAPTICS — Capacitor haptic gateway extended.
      Existing v0.11 triggers (buildComplete / unitKilled / quake
      / wildfireIgnition) kept; v0.12 adds attackCommand (light),
      victory (heavy), defeat (medium), buttonPress (light).
      GameOverModal wires victory + defeat via a ref-guarded
      useEffect on outcome flip (web stub no-ops; Android device
      fires through the system channel). Settings opt-out
      respected via existing setHapticsEnabled gate. Future
      attackCommand + buttonPress wiring is per-call-site work
      (not gated on this substrate item).
- [ ] [WAIT-DEVICE] M_V12.MOBILE.SAFE-AREA-AUDIT — needs a real
      device profile (iPhone 14 + Pixel 7 + iPad mini +
      foldable) to validate `env(safe-area-inset-*)` honoring.
      Visual harness Playwright fixtures partially cover via
      pixel-7 / iphone-14 viewports; physical-device validation
      is human.
- [ ] [WAIT-DEVICE] M_V12.MOBILE.LANDSCAPE-PORTRAIT — needs
      orientation-flip Maestro flow against a real device.
- [ ] [WAIT-DEVICE] M_V12.MOBILE.OFFLINE-CAPACITOR — needs an
      airplane-mode Maestro flow against an installed APK.

### §6 — v0.12 release ladder

- [ ] [WAIT-USER] M_V12.RELEASE.PR — open ONE pull request from
      feat/v0.12-cycle to main. Per the autonomy doctrine
      ("careful with shared-branch actions; never auto-PR
      without explicit user authorization"), waits for user
      sign-off to open. All §1-§5 substrate work shipped on
      feat/v0.12-cycle and is ready for review.
- [ ] [WAIT-PR] M_V12.RELEASE.VISUAL-LOCK — re-bake every
      visual baseline against the v0.12 build; runs as part of
      the PR review cycle after PR opens. Gates on RELEASE.PR.
- [ ] [WAIT-DEVICE] M_V12.RELEASE.PLAYTHROUGH — full manual
      playthrough on a real Pixel 5a + iPhone 14. Needs human
      hardware operator.
- [ ] [WAIT-DEVICE] M_V12.RELEASE.PERF-MOBILE — mobile perf gate
      requires Pixel 5a emulator / device. Substrate measurement
      tools (perf:profile, perf-mobile-trace) already there.
- [ ] [WAIT-PR] M_V12.RELEASE.A11Y-SWEEP — axe-core/playwright
      against every HUD route. Best run on the merged code (HUD
      drift between branch + main is the audit's target).
- [ ] [WAIT-USER] M_V12.RELEASE.SQUASH — squash-merge the cycle
      PR. Per the autonomy doctrine, waits for explicit user
      sign-off (shared-branch destructive op). release-please
      auto-cuts the v0.1.28 PR on merge.

---

## Recurring main-thread hygiene

Run continuously alongside the queue work.

- [ ] [WAIT] M_MAIN.RELEASE-LADDER — release-please v0.1.27 PR
      not yet cut (release-please scheduled run hasn't fired
      since the v0.11 merge ~hours ago). Recurring; re-check on
      next session.
- [x] M_MAIN.DIRECTIVE-EDIT — maintained continuously this
      session: PRD-v0.12 + directive flip + every commit's
      `[x]` flip + per-§ status line writes. Recurring; carries
      forward.
- [x] M_MAIN.DOCS.RELEASE-NOTES — release-please owns
      CHANGELOG.md; nothing manual this session.
- [x] M_MAIN.PRD-DRIFT-AUDIT — PRD-v0.12 cross-links every §-
      block in this directive (PRD §1 ↔ directive §1, etc.).
      Recurring; audit on each directive edit.
- [ ] [WAIT-CYCLE] M_MAIN.PLAYTHROUGH-AUDIT — playthrough audit
      pins to `docs/playthroughs/v0.12.md` after the v0.12 cycle
      merges (not on the in-flight branch). Quarterly cadence.
- [x] M_MAIN.WORKTREE-CLEANUP — `git worktree prune` post-v0.11
      merge ran in the prior session.
- [x] M_MAIN.MEMORY-WRITE — corrective-feedback memories saved
      across this session (the user's directive-flip request
      and the v0.11 squash-regression discoveries both noted).
      Recurring; on-feedback.
- [x] M_MAIN.GRINDER-WATCH — no flake reports surfaced this
      session; all 1249 tests stable across every commit.
      Recurring.
- [ ] [WAIT-PR] M_MAIN.CODERABBIT-SWEEP — no open PRs to sweep
      this session (PR opens via [WAIT-USER] RELEASE.PR above).
      Recurring once PR opens.

---

## §post-horizon — v0.13 and beyond

These are forward-looking and intentionally not detailed yet.
Picked up after v0.12 ships.

- [ ] [WAIT-CYCLE] M_V13.MULTIPLAYER-PROBE — investigate add a 1v1 hot-seat
      mode first (no networking); then a turn-based async mode
      via the persistence cloud-sync facade.
- [ ] [WAIT-CYCLE] M_V13.MAP-EDITOR — in-game map editor that writes seed +
      override-tile JSON to sqlite; share via the share-seed
      button.
- [ ] [WAIT-CYCLE] M_V13.MOD-API — load custom upgrade-chain JSON files from
      a known location so power-users can author scenarios
      without forking the codebase.
- [ ] [WAIT-CYCLE] M_V13.WORKSHOP-INTEGRATION — once mod-api lands, a
      community workshop integration (likely Steam or a
      self-hosted CDN).
- [ ] [WAIT-CYCLE] M_V13.SCENARIO-EDITOR — author tools for the campaign-
      chapter shape (pre-placed buildings + scripted waves +
      objectives); reuses CHAPTER_PRE_PLACEMENT contract from
      v0.11.
- [ ] [WAIT-CYCLE] M_V13.AI-PERSONALITIES-EXPAND — 5 personalities exist
      (the-diplomat / the-raider / the-builder / the-hoarder /
      the-mad-king); add 5 more (the-betrayer / the-warlord /
      the-mystic / the-merchant / the-survivor) once §3
      AI-DIPLO substrate lands.
- [ ] [WAIT-CYCLE] M_V13.NAMED-HEROES-RUNTIME — Atelier already unlocks
      hero-knight-errant / hero-shieldmaiden / hero-archmage /
      hero-cartographer / hero-warlord. v0.13 differentiates
      each: unique passive, unique active ability, unique
      death dialog.
- [ ] [WAIT-CYCLE] M_V13.LORE-CHAPTERS-READABLE — Atelier `lore-chapter-*`
      unlocks should open a readable lore page (not just unlock
      a flag). Markdown-rendered, with illustrations from the
      asset library.

---

## Reference — historical cycles

- v0.4 → v0.10 cycle PRDs at `docs/specs/PRD-v0.{4..10}.md`.
- v0.11 spec discoveries at `docs/specs/200-genre-commitment.md`,
  `docs/specs/201-stacking-and-formations.md`, and the to-be-
  written `docs/specs/202-mobile-gestures.md` (M_V12.MOBILE.
  GESTURE-MAP).
- v0.11 final state: merged as #89 (squash commit 717ed2f) at
  2026-05-27. The full v0.11 ledger of `[x]` items lives in
  git history under the v0.11 cycle commits 60a..717ed2f.

The pre-v0.11 directive (2418 lines) was replaced ahead of v0.11
by a clean queue. The post-v0.11 directive (this file) follows
the same shape: only-current-cycle items at the top, post-horizon
items below, history pointer at the bottom.
