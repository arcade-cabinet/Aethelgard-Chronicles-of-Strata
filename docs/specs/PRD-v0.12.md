---
title: PRD v0.12 — Game-design depth + AI diplomacy + persistence + mobile polish
updated: 2026-05-27
status: current
domain: product
---

# PRD v0.12 — Game-design depth + AI diplomacy + persistence + mobile polish

## v0.11 → v0.12 transition

**v0.11 (just shipped, squash-merged as #89 / commit 717ed2f on 2026-05-27):**

The v0.11 cycle was the substrate-completion + content-density cycle. It landed:

- **RTS commitment finalized** — 4X scaffolding stripped, classic-RTS
  opening with Palace-only spawn + 80 wood / 60 stone starter
  stockpile, train-peon affordance halo, inactivity beats.
- **Stack runtime** — formation registry + Stack/StackMember
  substrate end-to-end (move, lerp, combat damage routing, render
  badges, work-crew auto-form, mob auto-Rabble, formation switch
  panel, save round-trip).
- **Multi-selection UX** — SelectionPanel rewrite for n-entity
  selections (composition strip, per-class intersection verbs,
  Select-All-of-Type, biome-scoped peon selector, batch Take).
- **Barbarian Camp pipeline** — map-gen camps in every match, mob
  spawn cadence, wander behavior, hostile-to-all targeting, loot
  caches with visual presence, camp-death cascade.
- **Procedural building meshes** — 14 of 14 buildings now
  composed from tier-1 structural primitives + per-faction
  material slots (no more GLBs for player/AI buildings, only nature
  + units + graveyard kit retain GLBs). Bespoke Market/Embassy/
  Lighthouse/MageTower/Workshop silhouettes shipped.
- **Per-role accessory mesh** — Archer bow+quiver, Pikeman spear,
  Knight crested helm, Engineer hammer+pouch, Diplomat scroll+
  circlet so each new v0.11 role reads distinct from its KayKit
  rig donor.
- **Five new game modes** — Tutorial, Campaign (3 chapters with
  pre-placed buildings + scripted enemy waves), Wave Defense
  (5-wave survival), Daily Challenge (date-derived seed + install-
  local leaderboard), in addition to the v0.10 Border Clash /
  Frontier Raid / Long Reign / Strata Wars / Coexistence.
- **Meta-progression Atelier** — 30 cross-match unlocks across 6
  categories (starting-units / starting-buildings / palette-skins /
  named-heroes / ai-bounties / lore-chapters); each persisted via
  sqlite; starter-buildings / hero-spawns / palette skins have
  runtime effects at match start.
- **Diplomacy modal** — propose pact / declare war / break pact /
  demand tribute; timed 5-min alliances; Diplomat unit physically
  carries first-contact when walked into a foreign zone; Embassy
  building auto-establishes contact on completion.
- **Persistence depth** — SNAPSHOT_VERSION v4 with the TownHall →
  Palace rename migration; new tables for meta_unlocks +
  meta_lore_tokens + daily_challenge_scores.
- **Polish + verification** — 49 visual fixtures locked; axe-core
  a11y sweep (zero wcag2a / wcag2aa); Maestro selector validation;
  perf trace at 0.76ms mean / 3.19ms max per tick (5× under 60Hz
  budget); 1217 unit tests green at merge.

**The post-v0.11 gap that drives v0.12:**

User direction across the v0.11 cycle ("you flex creative design,
paper-playtest, ship 100+ upgrades / units / buildings / scenarios")
called for content density that the v0.11 cycle couldn't fit. The
v0.11 substrate is complete; v0.12 fills it with depth.

Specifically:
1. **Upgrade depth** — Discoveries is at 36 entries; the mandate
   is 100+ across 6 chains with logical progression.
2. **AI diplomacy** — DiplomacyModal exists, AI faction never
   uses it. The AI is purely confrontational; v0.12 makes it
   propose alliances, break them tactically, demand tribute, use
   timed-ally windows.
3. **Persistence + lorebook richness** — the substrate is there;
   v0.12 adds Chronicle saga ledger + optional cloud-sync for
   the leaderboard.
4. **Mobile polish** — Aethelgard ships to Android + iOS;
   v0.12 walks every tap surface on a real device profile.

## Pillars

The v0.12 cycle holds these design pillars:

### Pillar 1 — Depth before breadth

Where v0.11 added content surface area (5 new modes, 5 new
buildings, 5 new units, 30 meta-unlocks, 3 campaign chapters),
v0.12 deepens the existing surfaces. The 36 Discoveries become
100+, the AI gets a real diplomatic brain, the lorebook grows
into a saga ledger.

### Pillar 2 — Mobile-first input

The retired-hotkey decision (v0.10) means every interaction is
tap. v0.12 audits every hit target on a Pixel 5a profile and
formalizes the gesture map (tap / long-press / drag / pinch /
two-finger drag) into a spec document so future polish has a
contract to test against.

### Pillar 3 — Agent owns visual + UX judgment

User direction across v0.11: the agent should NOT push visual /
UX problems to the user. v0.12 carries this discipline: every
HUD-touching commit screenshots itself, compares to a named
reference, and the commit body records the comparison verdict.

### Pillar 4 — One PR per cycle

PR-per-commit is forbidden (v0.11 §1-§6 made this an explicit
rule). v0.12 keeps the long-running `feat/v0.12-cycle` pattern:
commit freely, push regularly, dispatch the review trio
post-commit in background, fold findings into the next forward
commit. ONE PR opens when §1-§6 are done.

## §1 — Substrate

### M_V12.SUBSTRATE.PRD

This document. Authored at cycle-open per the user's 2026-05-27
direction.

### M_V12.SUBSTRATE.BRANCH

`feat/v0.12-cycle` opens from `main` at the v0.11 squash commit
(717ed2f). All v0.12 work commits land here until §6.RELEASE.

### M_V12.SUBSTRATE.RELEASE-WATCH

release-please cuts the v0.1.27 PR automatically for the v0.11
merge. Fold any review comments on the release-PR before opening
v0.12 cycle work proper.

## §2 — Game-design depth (M_V12.DEPTH)

### Goal

100+ upgrades across 6 chains (Economy / Military / Diplomacy /
Magic / Engineering / Lore), each with a clear progression and a
runtime effect.

### Use-case enumeration (Pillar 1 step-1)

There are THREE distinct upgrade surfaces in Aethelgard today:

1. **In-match Discoveries** — purchased mid-match with gold;
   effect ends with the match. Today: 36 entries.
2. **Meta Atelier unlocks** — purchased with lore tokens earned
   across matches; effect carries cross-match (starter buildings,
   hero unlocks, palette skins). Today: 30 entries.
3. **Per-chapter narrative perks** — granted by the chapter, not
   purchased. Today: 0 entries (campaign chapters give pre-placed
   buildings + scripted waves but no permanent perks).

Each is a candidate for different mechanics. v0.12 expands all
three, but the bulk goes to Discoveries (the main mid-match
agency surface). Chain starters get added to Atelier (new
category `chain-starters` — meta-unlocks that pre-purchase the
first row of a chain). Per-chapter perks become a new content
form in v0.12 (each chapter grants 1-2 fixed Discoveries at
match start, signaling its theme).

### Chain shape

Each chain has 4 tiers × 4 specialisations + branching pre-reqs.
Per-chain detail:

| Chain | Tiers × specs | Surface |
|---|---|---|
| Economy | 4 × 4 (food / gold / wood / stone) | harvest tick, depot capacity, peon cap, trade rate |
| Military | 4 × 4 (infantry / archer / siege / cavalry) | stat modifiers + unit-unlock gates |
| Diplomacy | 4 × 3 (relations / trade / tribute) | embassy action unlocks |
| Magic | 4 × 3 (offense / utility / summon) | Mage Tower aura + Wizard variants |
| Engineering | 4 × 3 (siege / defense / production) | Workshop output, Wall HP, Watchtower DPS |
| Lore | 4 × 2 (reveal / narrative) | full-map vision tiers, lorebook discoveries |

Total: roughly 16+16+12+12+12+8 = **76 in-match Discoveries** + 12
chain-starter meta-unlocks + 12 per-chapter perks = **100+**.

### Implementation order

1. **DEPTH.UPGRADE-AUDIT** — write the upgrade-graph design doc
   (`docs/design/v0.12-upgrade-graph.md`) with every row spec'd.
2. **DEPTH.CHAIN-EXPANSION** — implement Economy chain first;
   each entry gets a registry row + runtime effect + unit test.
3. **DEPTH.MILITARY-CHAIN** through **DEPTH.LORE-CHAIN** — in
   parallel once Economy validates the substrate shape.
4. **DEPTH.UPGRADE-HUD** — DiscoveriesPanel rewrite to
   accommodate 76 entries across 6 chains.
5. **DEPTH.UPGRADE-PERSISTENCE** — Atelier `chain-starters`
   category.

## §3 — AI diplomacy + alliance behavior (M_V12.AI-DIPLO)

### Goal

AI factions use the DiplomacyModal surfaces (propose pact, demand
tribute, break alliance, timed-ally windows) instead of being
purely confrontational.

### Yuka brain extensions

The existing AiPlayer (yuka-based) has states: idle, build,
train, attack. v0.12 adds:

- `diplomatic-overture` — evaluate every other faction
  periodically (cooldown ~60s); propose pact if personality favors
  it AND relative power gap < threshold.
- `tribute-shakedown` — for hoarder / mad-king personalities;
  demand tribute from any faction weaker than self by > threshold.
- `pact-evaluation` — when player or other-AI proposes, accept
  or reject based on personality + war state + relative score.
- `pact-breaking` — warlord breaks when ahead; betrayer breaks
  when behind; diplomat never breaks first.

### Personality matrix

| Personality | Overture | Accept | Tribute | Break |
|---|---|---|---|---|
| the-diplomat | always | 0.9 | never | never |
| the-builder | sometimes | 0.7 | never | rarely |
| the-raider | rarely | 0.3 | sometimes | often |
| the-hoarder | sometimes | 0.5 | always | sometimes |
| the-mad-king | never | 0.1 | always | always |

### Diplomat unit usage

AI trains Diplomats from Embassy when relations matter
(diplomat-personality always, builder/hoarder when contact missing).
Walks them into foreign zones to establish first-contact via the
already-wired physical path from v0.11 #77d.

## §4 — Persistence + lorebook depth (M_V12.PERSIST)

### Goal

The v0.11 install-local sqlite is the authoritative store;
v0.12 layers richness on top without abandoning local-first.

### Cloud-sync opt-in

Per-install pseudonymous id; no auth (lobby model). Sync the
lorebook + daily-challenge leaderboard only — never save-game
state (saves stay local-only). User-provided endpoint URL.

### Leaderboard tamper-resistance

Security review M1 from v0.11 noted writer-side caps on
recordDailyChallengeScore landed but cloud-sync paths still
trust the caller. v0.12 fingerprints each row with a stable
hash of (dateUTC, seedPhrase, outcome, simSeconds, score, salt)
where salt is a per-install nonce. Server can detect retroactive
tampering without authenticating users.

### Rich lorebook entries

Every match's lorebook entry stores:
- starting realm size (tiles)
- final realm size
- diplomatic state at end (allies / enemies / vassals counts)
- peak military count
- biggest single combat exchange (damage dealt in one tick)
- hero death(s) with timestamp and killer

Rendered as a rich card in the lorebook view (currently the
entry is a single highlights-list line).

### Chronicle saga ledger

Players who finish multiple campaign chapters unlock a Chronicle
page that strings them into a saga. Each chapter completion
records (chapterId, completionDate, finalSeedPhrase) to a new
`chronicle` table. The Chronicle view renders the saga as a
scrollable lore page.

## §5 — Mobile polish + input + accessibility (M_V12.MOBILE)

### Goal

Aethelgard ships to Android + iOS. Every interaction must work
on a Pixel 5a tier device with one thumb.

### Tap audit + hit-target fix

Walk every interactive HUD with Maestro on a real Pixel 5a
profile. Catch:
- double-tap-required buttons (gesture conflict)
- hit targets under 48×48 dp (touch slop)
- gestures that fight pan / pinch / orbit

For each finding, expand hit area to ≥48 dp without changing
visual size (padding tricks).

### Gesture map spec

`docs/specs/202-mobile-gestures.md` formalizes:

| Gesture | Action | Conflicts |
|---|---|---|
| tap | select / activate | none |
| long-press (500ms) | context menu | tap |
| drag | pan camera | tap (use slop) |
| pinch | zoom | drag |
| two-finger drag | orbit | pinch (use direction) |

Every new HUD surface honors this matrix.

### Haptics

Capacitor haptic feedback on: building complete (success),
unit lost (notification), attack command issued (light), victory
(success-long), defeat (warning-long). Respect device haptics-
disabled preference.

### Safe area + orientation

Every HUD honors `env(safe-area-inset-*)`. Test on iPhone 14
(notch), Pixel 7 (rounded corners), iPad mini (no inset),
foldable open + closed. Verify HUD reflows on portrait ↔
landscape flip mid-match.

### Offline

Full match flow works offline on Android + iOS (sqlite + asset
bundle + service-worker fallback for web). Verify with Maestro
flow that puts the device in airplane mode mid-match.

## §6 — Release ladder

| Gate | What | When |
|---|---|---|
| §6.PR | open ONE PR feat/v0.12-cycle → main | §1-§5 all `[x]` |
| §6.VISUAL-LOCK | re-bake every visual baseline against v0.12 | post-PR-open |
| §6.PLAYTHROUGH | full manual playthrough Pixel 5a + iPhone 14 | post-visual-lock |
| §6.PERF-MOBILE | mean ≤ 22ms, p95 ≤ 33ms on Pixel 5a | post-playthrough |
| §6.A11Y-SWEEP | axe-core zero wcag2a / wcag2aa | post-perf |
| §6.SQUASH | squash-merge; release-please cuts version | all gates green |

## What's intentionally OUT of v0.12

Per the "depth before breadth" pillar:

- **Multiplayer.** Hot-seat probe + async-via-cloud are §post-horizon
  for v0.13.
- **Map editor.** §post-horizon v0.13.
- **Mod API.** §post-horizon v0.13.
- **Scenario editor.** §post-horizon v0.13.
- **New AI personalities.** The 5 existing (diplomat / raider /
  builder / hoarder / mad-king) absorb the new diplomacy brain
  first; the 5 new personalities (betrayer / warlord / mystic /
  merchant / survivor) come in §post-horizon v0.13.
- **Named-heroes runtime differentiation.** Atelier already
  unlocks 5 hero-* variants; v0.12 leaves them all sharing the
  same Hero unit until §post-horizon v0.13.
- **Lore chapters readable pages.** Atelier unlock flags get
  flipped; the actual markdown-rendered chapter view is
  §post-horizon v0.13.

## Backwards compatibility

- SNAPSHOT_VERSION stays at 4 unless v0.12 adds save-shape data
  (chain progress per match). If chain progress is per-match
  (not meta-persistent), no schema bump needed — Stack-style
  per-match state already serializes via SERIALIZED_TRAITS.
- Meta-unlock table extension (new `chain-starters` category)
  is additive — existing meta_unlock rows untouched.
- Lorebook entry extension is additive — existing rows lack the
  new fields but render gracefully (the reader treats missing
  fields as "data not captured this match").
- Cloud-sync is OPT-IN — every install defaults to local-only;
  no behavior change for users who never enable sync.

## References

- `docs/specs/PRD-v0.11.md` — predecessor cycle
- `docs/specs/200-genre-commitment.md` — RTS commitment
- `docs/specs/201-stacking-and-formations.md` — Stack substrate
- `docs/specs/10-player-journey.md` — landmark moments
- `docs/specs/20-visual-language.md` — palette + typography
- `docs/specs/30-audio-cues.md` — SFX timing
- `docs/lore/00-canon.md` — Aethelgard canon
- `.agent-state/directive.md` — the running v0.12 queue
