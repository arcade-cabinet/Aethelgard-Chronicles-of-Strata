---
title: Multi-faction (M_EXPANSION.F.94 + .F.95 + D.165)
updated: 2026-05-23
status: current
domain: technical
---

# 3+ factions design

Today Aethelgard ships a strict player-vs-enemy 2-faction model.
This doc designs the lift to N ≥ 3 factions (M_EXPANSION.F.94
diplomacy + .F.95 3rd neutral hostile faction).

## Shape

`Faction` union extends from `'player' | 'enemy'` to a tagged set:

```ts
export type Faction =
  | 'player'
  | 'enemy'
  | 'neutral-hostile'      // 3rd faction spawn-camp raiders
  | 'allied-1' | 'allied-2' // future diplomacy
```

`FACTIONS` constant + every per-faction loop (encroachment, win-loss,
SKINS, zones, economies) iterates over this union. No per-tribe
code — purely data-driven via SKINS[faction].

## Win condition under N factions

Two policies, picked per game mode:

1. **Last-one-standing** (free-for-all): outcome flips to 'win'
   when the player is the only faction with a live FactionBase.
2. **Team brackets** (allied-1/2 are on player's team): same as
   today, but FactionBase queries filter by 'enemy-side' bracket.

Both fall out of generalising `evaluateWinLoss` to N factions —
the current 2-faction code is the N=2 specialisation.

## Diplomacy (F.94)

A `treaty: Map<[FactionA, FactionB], TreatyState>` slot on
GameState. TreatyState = `'war' | 'truce' | 'alliance'`. Combat
systems read this before assigning damage:

- war → damage applies (today's only state)
- truce → no auto-attack, manual right-click still works
- alliance → no damage either direction; can share zone-of-control

UI: a new TreatyPanel modal lists every other faction + dropdowns to
propose state changes.

## Neutral hostile (F.95)

A `neutral-hostile` faction spawns a spawn-camp on the map at
generation time (a 4th attractor in `seedZonesFromAttractors`).
Periodically (event-PRNG-driven) it issues raid waves at the
nearest non-neutral faction. No FactionBase to destroy; it persists
until both player + enemy lose.

## SKINS

Each new faction needs its own SKINS row. Schema doesn't change;
the keying just widens. The existing structure (player/enemy with
brain bias, characterTint, audio overrides) carries.

## Out of scope (initial multi-faction landing)

- AI alliance negotiation (the AI accepts/refuses player treaty
  offers via a fixed-policy table; ML-driven later).
- 4+ team brackets.
- Per-faction game-end animations (everyone gets the same victory
  stinger today).

## Implementation order

1. Widen `Faction` union; iterate FACTIONS everywhere.
2. Add neutral-hostile spawn at startGame; verify no system breaks.
3. Add treaty Map + read sites in combat / encroachment.
4. Add TreatyPanel HUD.
5. Per-mode win-condition policy.

Each step is one PR. The 2-faction code today is the N=2
specialisation of the general design.
