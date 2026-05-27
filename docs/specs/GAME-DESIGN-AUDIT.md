---
title: Game Design Audit — Aethelgard
updated: 2026-05-26
status: current
domain: product
---

# Game Design Audit — POC vs. Production-Game Gap

This document is the agent's owned game-design plan. It exists because the user explicitly
asked the agent to **start owning creative design** — flow-charting, paper-playtesting,
thinking about the whole game and how it lands on the player. The agent (not the user)
is responsible for whether Aethelgard ships as a polished production game or stays a POC.

Each section names the gap, the concrete plan to close it, and the milestones / tasks
the agent will ship under it. The gap rows are NOT a wishlist — they are committed work.

---

## Current state — what we have today (2026-05-26)

| Surface          | Count                  | Names                                                                  |
|------------------|------------------------|------------------------------------------------------------------------|
| Player units     | 9                      | Peon, Footman, Trebuchet, Wizard, Healer, Ferryman, Scout, Settler, Hero |
| Barbarian units  | 5                      | Goblin, Orc, Vampire, BlackKnight, Witch                               |
| Buildings        | 9                      | Palace, Farm, House, Granary, Barracks, Watchtower, Wall, Wonder, Library |
| Discoveries (intra-match research) | 13   | 7 formations + 6 RTS techs (forgedBlades, steelPlows, trade-route, cartography, iron-tools, siege-engineering, monumental-architecture) |
| Persistent meta-upgrades (cross-match) | 0 | none — sqlite save schema exists but holds in-match snapshots only |
| Game modes       | several                | (border-clash, long-reign, classic, ...)                               |
| Diplomacy actions (player-facing) | 0       | AI-vs-AI only; player has NO diplomacy modal                           |

## The four big gaps

### Gap #1 — No player-facing diplomacy (most impactful)

The Diplomacy system runs end-to-end: relations, tribute, alliances, pact proposals.
But ONLY AI players see it. A human player against 1+ AI factions has zero way to:
  - propose a pact / alliance
  - demand or accept tribute
  - declare or break war
  - ally-of-convenience against the strongest threat then betray the alliance later

The user explicitly noted: "*AI is purely confrontational but there is NO diplomacy
modal and no way to ally against another AI temporarily and so on.*"

**Ship plan:** task #78 — DiplomacyModal in HUD. See "Diplomacy modal" milestone below.

### Gap #2 — Discoveries are too few and stop too early

13 total. After turn ~10 the player has researched everything and has no further
strategic choices. Compare AoE2 (~30 unique techs per civ, ~100 across all civs +
random map / scenario mods) or Civ VI (87+ techs across the tech tree). Even Stardew —
not an RTS — has 50+ tool/farm/character/crafting unlocks.

**Two distinct upgrade tracks** is the correct architecture, not one bigger pile:

  - **Intra-match research (the existing Discovery slot)**: 30+ techs across 6 chains.
    Resets every match. Pacing target: a 20-minute match should leave the player still
    choosing between branches at the end. Today's 13 are all unlocked in under 8 minutes
    in any non-rushed match.

  - **Cross-match meta-progression (NEW — persisted in sqlite)**: 70+ permanent upgrades.
    Each match earns "lore tokens" the player spends in a between-match Atelier screen.
    Unlocks: new starting units, new buildings, palette skins, named heroes for the
    Hero unit slot, narrative chapters of the lore campaign, harder-AI bounties, etc.
    Repeat-engagement comes from "I haven't unlocked the Iron Hill Atelier skin yet" or
    "if I beat this match I unlock the Necromancer hero". This is the loop that makes
    a player come back tomorrow.

**Ship plan:** task #77a (this audit doc, shipped now) + task #77b (intra-match
discoveries expansion, target 30+) + task #77c (meta-progression sqlite schema +
between-match Atelier screen + 70+ unlocks). Each is its own commit unit.

### Gap #3 — Unit and building roster is light

9 + 5 = 14 units, 9 buildings. Even a "small RTS" benchmark like They Are Billions
ships 20+ units and 30+ buildings. Aethelgard needs at minimum:

  - +6 units: Archer (ranged anti-air pre-Wizard), Pikeman (anti-cavalry tier-2),
    Knight (player-side mounted), Engineer (builds/repairs siege at range), Diplomat
    (special unit that creates the "contact" gate for the diplomacy modal — the
    physical version of the abstraction added in M_V11.EVENTS.RTS-TRIGGERED), Mage
    Tower Garrison.
  - +5 buildings: Market (enables trade with allies; per-tick wood/stone/gold
    cession), Embassy (required-for-tribute-or-alliance — the building form of the
    Diplomat unit), Lighthouse (extends Ferryman range; reveals water tiles in 5-hex
    radius), Mage Tower (auto-fires at any enemy in 3-hex; player's first
    auto-defense beyond Watchtower's stat boost), Workshop (Engineer + siege
    production hub).

**Ship plan:** task #77d (units expansion) + #77e (buildings expansion). Each new
unit/building needs: ECS trait wiring, factory entry, AI evaluator awareness,
procmesh primitive composition, baseline screenshot, costing pass, balance test.

### Gap #4 — Scenario coverage is thin

Today's modes: border-clash, long-reign, classic, journey, etc. — these are
duration / win-condition variants of the same core map. A production RTS ships:
  - Tutorial scenario(s) (today: none)
  - Skirmish (today: yes, this is the core)
  - Campaign scenarios with hand-tuned objectives + lore beats (today: 0)
  - Survival / Wave Defense (today: 0; barbarian-camps system is the substrate)
  - Co-op vs AI (today: 0; n-player engine supports >2 factions)
  - Daily Challenge — deterministic-seed run with leaderboard (today: 0)
  - Sandbox / Free-build (today: 0)

**Ship plan:** task #77f (tutorial scenario), #77g (3 hand-tuned campaign scenarios),
#77h (wave-defense mode), #77i (daily-challenge mode w/ seed-of-the-day + local-only
leaderboard since this is offline-first).

---

## Player-journey flow-chart (1v1 reference)

For 1 AI opponent the canonical flow today is:

```
[Title] → [New Game / Continue] → [Mode + Seed Picker] → [In-game]
                                                            │
                                                            ▼
[Spawn: 1 Palace, 80W/60S/0G, 2 Peon queue prompted by halo affordance]
                                                            │
                                                            ▼
[Player builds Farm + Granary + 2 more Peons]
                                                            │
                                                            ▼
[Scout finds enemy zone (today: no Scout unit visibly used; AI just
 "knows" via faction zones). Player has no "first contact" moment.]
                                                            │
                                                            ▼
[Border friction → enemy zone touches player zone. Relations created.]
                                                            │
                                                            ▼
[Combat starts. NO diplomacy is possible at this point — the player
 only has "build more military" as a strategic lever.]
                                                            │
                                                            ▼
[Win / Lose by city-destruction or score.]
```

**The "no diplomacy" valley in the middle is the big polish gap.** With the
DiplomacyModal (#78), the flow becomes:

```
[... up to "Border friction → relations created" same as above ...]
                                                            │
                                                            ▼
[Notification: "You have made contact with the Necropolis. Diplomacy
 is now available." → opens DiplomacyModal automatically the first
 time. Player can: propose pact, declare war immediately, or wait.]
                                                            │
                                                            ▼
[Branch: Player picks one of {pact, tribute, war}. Each is a real
 strategic fork. Pact opens trade. Tribute drains 10%/s but skips
 the war. War goes straight to military path.]
                                                            │
                                                            ▼
[1v1 ends in win/lose; the player who DIDN'T fight is rewarded
 with cross-match meta-progression "diplomatic-victory" tokens —
 a different score-curve than the military path.]
```

### 1v2 and 1v3 (multi-AI)

The diplomacy modal is even MORE important when 2+ AI factions exist. The classic
ally-of-convenience play — "team up with the weak AI to take down the strong one,
then break the alliance after the strong one is gone" — REQUIRES:
  - A modal to propose alliance to the specific weak faction.
  - A timer-based alliance (expires after N minutes so it doesn't become permanent
    pacifism; the user explicitly asked for "ally against another AI temporarily").
  - The AI must recognize when a temporary alliance is hostile-coded against it
    and respond (DiplomaticEvaluator already has the framework — needs the
    multi-faction awareness).

Today: 1v2 and 1v3 are technically possible (engine supports n-player) but play out
as a sequential 1v1 because no diplomacy lever exists. **Adding the modal +
temporary alliance unlocks 30+ hours of replay value across the multi-AI modes.**

---

## Concrete next-commit plan

In priority order, each is a single push:

1. **This document** (commit now) — shipped artifact, becomes the running plan.
2. **DiplomacyModal MVP** (task #78) — propose pact, declare war, ally (5-min timer),
   demand tribute, accept tribute. aria-labels for Maestro. Visual baseline.
3. **Intra-match discoveries expansion** (task #77b) — bump 13 → 30+ across 6 chains
   (Economy / Military / Diplomacy / Magic / Engineering / Lore). Each chain has a
   visible prerequisite-graph in the existing research panel.
4. **Cross-match meta-progression** (task #77c) — new sqlite table `meta_unlocks`,
   between-match Atelier screen, 30 starter unlocks (more added incrementally per
   subsequent commit).
5. **Units expansion** (task #77d) — Archer, Pikeman, Knight, Engineer, Diplomat,
   Mage Tower Garrison. ECS + factory + procmesh + AI evaluator awareness + balance.
6. **Buildings expansion** (task #77e) — Market, Embassy, Lighthouse, Mage Tower,
   Workshop. Same checklist.
7. **Tutorial scenario** (task #77f) — first-time-player teaches every system in
   a 5-minute guided run.
8. **Campaign scenarios** (task #77g) — 3 hand-tuned narrative missions.
9. **Wave-defense mode** (task #77h) — uses the barbarian-camp substrate as a
   survival/defense game mode.
10. **Daily challenge** (task #77i) — deterministic seed-of-the-day, score
    submission to local-only sqlite leaderboard, optional shareable seed code.

---

## Owning the standard

Per the user direction the agent has full creative ownership. The agent will:
  - Make and document design decisions in spec docs under `docs/specs/` (not in
    code comments alone).
  - Flow-chart every new system BEFORE writing code; the flow lands in the spec.
  - Paper-playtest by walking through the player journey at every change and
    asking "what does this look like / feel like at minute 0 / 5 / 15 / end?"
  - Update this audit doc as the running plan; every commit that ships a gap-
    closer ticks the corresponding row.

The user shouldn't have to surface the next gap. That's the agent's job, at every
stage boundary, by default.
