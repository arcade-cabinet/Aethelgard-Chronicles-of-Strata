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
- [ ] M_V12.DEPTH.CHAIN-EXPANSION — implement the Economy chain
      first (16-row depth × 4 tiers + branches). Each row gets a
      registry entry, an in-game effect (modifier on harvest
      tick / cost / supply / etc.), a HUD entry, and a unit test
      pinning the effect.
- [ ] M_V12.DEPTH.MILITARY-CHAIN — parallel chain expansion: 4
      tiers × 4 specialisations (infantry / archer / siege /
      cavalry), each with stat-modifier upgrades + unit-unlock
      gates.
- [ ] M_V12.DEPTH.DIPLOMACY-CHAIN — tier upgrades that unlock
      embassy actions: tribute demands, alliance proposals,
      trade routes, peace treaties. Each ties into the AI
      diplomacy work in §3.
- [ ] M_V12.DEPTH.MAGIC-CHAIN — Mage Tower-gated upgrades: aura
      radius, dps, secondary damage type, cooldown reduction.
      Plus wizard-unit unlocks (Wizard already exists; add
      Battlemage / Druid / Necromancer variants).
- [ ] M_V12.DEPTH.ENGINEERING-CHAIN — Workshop-gated: Engineer
      repair rate, Trebuchet damage / range, Wall HP, Watchtower
      DPS. Plus building-unlock gates (Foundry, Drydock).
- [ ] M_V12.DEPTH.LORE-CHAIN — Library-gated: reveal mechanics
      (full-map vision tier), lorebook discoveries, narrative
      events, named-hero unlocks (ties to Atelier `hero-*`
      meta-unlocks).
- [ ] M_V12.DEPTH.UPGRADE-HUD — DiscoveriesPanel rewrite for
      6-chain × 4-tier grid; chain-tab navigation + pre-req
      arrows + locked/unlocked state. Mobile-first layout.
- [ ] M_V12.DEPTH.UPGRADE-PERSISTENCE — Atelier extension: meta-
      unlock IDs for cross-match upgrade-chain head-starts
      ("start with Economy tier 1 already purchased"). New
      meta-unlock category `chain-starters`.

### §3 — AI diplomacy + alliance behavior (M_V12.AI-DIPLO)

User mandate: "so far our AI is purely confrontational but there
is NO diplomacy modal and no way to ally against another AI
temporarily". DiplomacyModal exists (shipped v0.11 #77d).
v0.12 adds the AI brain.

- [ ] M_V12.AI-DIPLO.PROPOSE — AI factions propose alliances /
      pacts / tribute based on personality + relative power.
      Yuka brain extension: new state `diplomatic-overture`
      with cooldown + target-pick logic.
- [ ] M_V12.AI-DIPLO.ACCEPT-REJECT — AI evaluates player /
      other-AI proposals: accept-bias from personality
      (the-diplomat accepts more, the-mad-king rejects more),
      weighted by current war state + relative score.
- [ ] M_V12.AI-DIPLO.BREAK-PACT — AI breaks alliances when
      relative power flips (the-warlord breaks when ahead;
      the-betrayer breaks when behind). Personality-gated.
- [ ] M_V12.AI-DIPLO.TRIBUTE-FLOW — AI demands tribute from
      weaker neighbors per personality (the-hoarder always
      demands; the-diplomat never). Demand fires via existing
      `randomEvent.tribute-demand` path but with AI as source.
- [ ] M_V12.AI-DIPLO.TIMED-ALLY-USE — AI uses timed-alliance
      windows tactically: focus-fire on a third faction during
      a 5-min ally window; recover diplomatically when window
      expires.
- [ ] M_V12.AI-DIPLO.DIPLOMAT-UNIT — AI trains Diplomats from
      Embassy when relations matter; walks them into foreign
      zones to establish contact (already-wired physical path
      from v0.11 #77d).

### §4 — Persistence + lorebook depth (M_V12.PERSIST)

The v0.11 substrate (sqlite + lorebook + meta-unlocks +
daily-challenge leaderboard) is shipped. v0.12 extends.

- [ ] M_V12.PERSIST.CLOUD-OPT-IN — the install-local sqlite stays
      authoritative; add an OPTIONAL cloud-sync via a user-
      provided endpoint. Use a per-install pseudonymous id; no
      auth (lobby model). Sync the lorebook + daily-challenge
      leaderboard only — never saves.
- [ ] M_V12.PERSIST.LEADERBOARD-CAP — security review M1 noted
      that recordDailyChallengeScore's writer-side cap landed
      v0.11 but lacks input validation for cloud-sync paths.
      Add a server-side fingerprint of every row so a hostile
      sync can't tamper retroactively.
- [ ] M_V12.PERSIST.LOREBOOK-EXPAND — every match's lorebook
      entry now stores: starting realm size, final realm size,
      diplomatic state at end (allies / enemies / vassals), peak
      military count, biggest single combat exchange, hero
      death(s). Render as a rich card in the lorebook view.
- [ ] M_V12.PERSIST.CHRONICLE-MODE — meta-progression Chronicle
      that strings completed campaign chapters into a saga
      ledger. Players who finish Chapter III → IV unlock the
      saga page.

### §5 — Mobile polish + input + accessibility (M_V12.MOBILE)

User mandate (loaded global profile): "Aethelgard ships to
Android + iOS; hotkeys retired; tap+aria as the test surface".

- [ ] M_V12.MOBILE.TAP-AUDIT — walk every interactive HUD
      surface with Maestro on a real Pixel 5a profile. Catch
      every double-tap-required button, every hit-target under
      48dp, every gesture conflict (tap-to-select vs drag-to-
      pan vs pinch-zoom).
- [ ] M_V12.MOBILE.HIT-TARGET-FIX — for each MOBILE.TAP-AUDIT
      finding, expand hit area to ≥48×48 dp without changing
      visual size (padding tricks). Document each change with a
      Lighthouse a11y pass.
- [ ] M_V12.MOBILE.GESTURE-MAP — formalize the gesture map:
      tap = select / activate, long-press = context menu,
      drag = pan camera, pinch = zoom, two-finger drag = orbit.
      Document in `docs/specs/202-mobile-gestures.md`.
- [ ] M_V12.MOBILE.HAPTICS — Capacitor haptic feedback on
      critical events: building complete, unit lost, attack
      command issued, victory / defeat. Respect device haptics-
      disabled preference.
- [ ] M_V12.MOBILE.SAFE-AREA-AUDIT — every HUD surface honors
      `env(safe-area-inset-*)`. Test on iPhone 14 (notch),
      Pixel 7 (rounded corners), iPad mini (no inset), foldable
      open + closed.
- [ ] M_V12.MOBILE.LANDSCAPE-PORTRAIT — verify HUD reflows on
      orientation flip mid-match without losing state. Maestro
      flow for the orientation transition.
- [ ] M_V12.MOBILE.OFFLINE-CAPACITOR — verify the full match
      flow works offline on Android + iOS (sqlite + asset
      bundle + service-worker for web fallback).

### §6 — v0.12 release ladder

- [ ] M_V12.RELEASE.PR — open ONE pull request from
      feat/v0.12-cycle to main when §1-§5 are all `[x]` + the
      reviewer trio has had its forward-fix pass + visual
      baselines locked.
- [ ] M_V12.RELEASE.VISUAL-LOCK — re-bake every visual baseline
      against the v0.12 build. Compare against v0.11 baselines;
      any unexpected drift is a code bug, not a baseline update.
- [ ] M_V12.RELEASE.PLAYTHROUGH — full manual playthrough on a
      Pixel 5a + an iPhone 14. Capture screenshots at the 14
      landmark moments. Compare against `docs/specs/10-player-
      journey.md`. ANY visual or UX regression = a bug.
- [ ] M_V12.RELEASE.PERF-MOBILE — re-run the mobile perf gate
      (Pixel 5a tier, mean frame time ≤ 22ms, p95 ≤ 33ms).
- [ ] M_V12.RELEASE.A11Y-SWEEP — axe-core/playwright against
      every HUD route (incl. the new DiscoveriesPanel rewrite +
      AI-DIPLO surfaces). Zero wcag2a / wcag2aa violations.
- [ ] M_V12.RELEASE.SQUASH — squash-merge the cycle PR. Verify
      the post-merge release-please PR cuts v0.1.28 (or
      whichever bump release-please derives from the commit
      log).

---

## Recurring main-thread hygiene

Run continuously alongside the queue work.

- [ ] M_MAIN.RELEASE-LADDER — watch the release-please PR for
      the v0.11 merge (v0.1.27). Merge it when CI lands.
- [ ] M_MAIN.DIRECTIVE-EDIT — maintain this directive
      continuously, every commit; never in batches.
- [ ] M_MAIN.DOCS.RELEASE-NOTES — CHANGELOG.md is auto-
      maintained by release-please; verify each cycle's PR
      generates the right entries.
- [ ] M_MAIN.PRD-DRIFT-AUDIT — once `docs/specs/PRD-v0.12.md`
      lands (M_V12.SUBSTRATE.PRD), every §-block in this queue
      must cross-link the matching PRD subsection. Audit on
      every directive update.
- [ ] M_MAIN.PLAYTHROUGH-AUDIT — quarterly: walk a full match
      end-to-end on the latest main (not branch); pin findings
      to `docs/playthroughs/v0.12.md`.
- [ ] M_MAIN.WORKTREE-CLEANUP — `git worktree prune` after any
      cycle close.
- [ ] M_MAIN.MEMORY-WRITE — save corrective-feedback memories as
      soon as the user gives feedback (per global hygiene rule).
- [ ] M_MAIN.GRINDER-WATCH — watch for flake reports; convert
      any flake into a deterministic fix, never a retry.
- [ ] M_MAIN.CODERABBIT-SWEEP — sweep CodeRabbit threads on
      open PRs daily; resolve as findings are addressed.

---

## §post-horizon — v0.13 and beyond

These are forward-looking and intentionally not detailed yet.
Picked up after v0.12 ships.

- [ ] M_V13.MULTIPLAYER-PROBE — investigate add a 1v1 hot-seat
      mode first (no networking); then a turn-based async mode
      via the persistence cloud-sync facade.
- [ ] M_V13.MAP-EDITOR — in-game map editor that writes seed +
      override-tile JSON to sqlite; share via the share-seed
      button.
- [ ] M_V13.MOD-API — load custom upgrade-chain JSON files from
      a known location so power-users can author scenarios
      without forking the codebase.
- [ ] M_V13.WORKSHOP-INTEGRATION — once mod-api lands, a
      community workshop integration (likely Steam or a
      self-hosted CDN).
- [ ] M_V13.SCENARIO-EDITOR — author tools for the campaign-
      chapter shape (pre-placed buildings + scripted waves +
      objectives); reuses CHAPTER_PRE_PLACEMENT contract from
      v0.11.
- [ ] M_V13.AI-PERSONALITIES-EXPAND — 5 personalities exist
      (the-diplomat / the-raider / the-builder / the-hoarder /
      the-mad-king); add 5 more (the-betrayer / the-warlord /
      the-mystic / the-merchant / the-survivor) once §3
      AI-DIPLO substrate lands.
- [ ] M_V13.NAMED-HEROES-RUNTIME — Atelier already unlocks
      hero-knight-errant / hero-shieldmaiden / hero-archmage /
      hero-cartographer / hero-warlord. v0.13 differentiates
      each: unique passive, unique active ability, unique
      death dialog.
- [ ] M_V13.LORE-CHAPTERS-READABLE — Atelier `lore-chapter-*`
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
