---
title: Wonder victory (M_EXPANSION.F.71 + D.164)
updated: 2026-05-23
status: current
domain: technical
---

# Wonder building — countdown victory

A Wonder is a special-cost faction building. Completing it starts
a 5-minute countdown; on reaching 0, the owning faction wins.

## Trigger

`Building.buildingType === 'Wonder'` + `Building.isComplete === true`
seeds `game.wonderTimers[faction]` from `Infinity` to
`WONDER_COUNTDOWN_SECONDS` (300s).

## Tick

`runEconomyTick` decrements the timer by `delta * gameSpeed` each
frame the Wonder is still complete and present. If the Wonder is
destroyed before the timer hits 0, the timer resets to `Infinity`
and a re-built Wonder starts fresh.

## Win flip

When either faction's `wonderTimers[faction] === 0` AND
`game.outcome === 'playing'`:

- Player Wonder hits 0 → `outcome = 'win'`
- Enemy Wonder hits 0 → `outcome = 'loss'`

Loss takes precedence over win in the same tick (consistent with
base-destruction precedence in `evaluateWinLoss`).

## Achievement

The player wonder-win flip also unlocks the `wonder-win`
achievement (`src/hud/PersistAchievements.tsx`).

## HUD readout (planned — M_EXPANSION.U.105 score-bar work)

A `🏛 5:00` chip near the score bar shows the active countdown for
whichever faction has the Wonder. Today the timer is sim-only;
ScoreBar v2 (M_EXPANSION.U.105 follow-up) exposes it.

## Cost (defaults; tunable in src/config/economy.json)

Standard building cost slot — Wonder is in BUILDING_COSTS. The
balance pass (TBD) tunes the cost so a player can plausibly build
it 8-12 minutes into a match, leaving 5 minutes for the enemy to
respond.

## Multi-faction (M_EXPANSION.F.94/.95)

When 3+ factions are introduced (see 109-multifaction.md), the
Wonder logic extends naturally: every faction has its own timer;
the FIRST to 0 wins; others' timers persist. The current 2-faction
implementation is the 1-iteration-loop version of the general N
case.
