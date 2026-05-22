# M4 — Combat

**Proves:** The full RTS loop closes. Footmen fight goblins; the goblin portal spawns
enemies; win (destroy portal) and loss (Town Hall destroyed) conditions fire correctly.

**Status: COMPLETE.** All 11 contracts satisfied — 147 unit tests, 9 browser tests,
3 e2e tests green. The combat loop runs 7200 ticks without error (combat-integration
test); the win/loss modal renders the correct outcome.

## Contracts

- [x] **Combat system — attack state machine** [`tests/unit/combat-system.test.ts`]
  - `combatSystem` ticks `attackTimer`; an in-range Combatant damages its target's
    Health on cooldown; out-of-range attackers do nothing; a dead/missing target
    clears `EnemyTarget`.

- [x] **Damage roll uses event PRNG** [`tests/unit/damage-roll.test.ts`]
  - `rollDamage` — non-crit in `[dmg, dmg+3]`, crit doubles it, ~10% crit rate
    over a 5000-sample run, deterministic for a fixed event-PRNG seed.

- [x] **Spawn system — goblins spawn from the portal on a timer**
  [`tests/unit/spawn-system.test.ts`]
  - `spawnSystem` spawns a Goblin on a walkable portal-neighbor tile each
    `spawnInterval`; nothing spawns before the interval elapses.

- [x] **AI system — enemy paths to the nearest player unit**
  [`tests/unit/ai-system.test.ts`]
  - An idle enemy selects the nearest player entity within the aggro radius and
    is given an A* path to it.

- [x] **AI retarget — enemy switches target when its target dies**
  [`tests/unit/ai-system.test.ts`]
  - An enemy whose target is gone retargets; with no targets it clears to none.

- [x] **Win condition — portal destroyed** [`tests/unit/win-loss-system.test.ts`,
  `tests/browser/win-loss-modal.browser.test.tsx`]
  - `evaluateWinLoss` returns 'win' when the Portal Health hits 0; the
    `GameOverModal` shows the `.modal-title-win` "Victory!" screen.

- [x] **Loss condition — Town Hall destroyed** [`tests/unit/win-loss-system.test.ts`,
  `tests/browser/win-loss-modal.browser.test.tsx`]
  - `evaluateWinLoss` returns 'loss' when the Town Hall Health hits 0; the
    `GameOverModal` shows the `.modal-title-loss` "Defeat!" screen. Loss takes
    precedence over a same-tick win.

- [x] **Health billboard renders on a damaged unit**
  [`src/world/HealthBillboard.tsx`, `tests/browser/units-render.browser.test.tsx`]
  - `HealthBillboard` is a camera-facing bar (green/yellow/red by fraction),
    hidden at full health, mounted by `Units` on every unit.

- [x] **Floating combat text appears and fades** [`src/world/CombatText.tsx`]
  - `CombatText` spawns a `-N` (gold `★-N` for crits) popup per damage event from
    `game.lastDamageEvents`; it drifts up and fades over 1.6s, then unmounts.

- [x] **Win-modal stat lines accurate** [`src/hud/GameOverModal.tsx`]
  - The modal reports Gold Earned, Lumber Harvested, Enemies Vanquished from
    `economy`; `economy.kills` is credited by the death-system kill count in
    `runEconomyTick`.

- [x] **Combat integration — 7200 ticks** [`tests/unit/combat-integration.test.ts`]
  - `startGame` creates the Town Hall + Portal entities with Health; the full
    combat loop runs 7200 ticks (2 game-minutes) without throwing.

### Test-file naming note

The milestone doc originally named separate Playwright e2e files
(`win-condition.spec.ts`, `health-billboard-combat.spec.ts`, …). The win/loss
behavior is verified by `win-loss-modal.browser.test.tsx` and the unit/billboard
rendering by `units-render.browser.test.tsx` — Vitest browser-mode tests that
drive the outcome state directly. Browser-mode is the right tool: an e2e win
would require waiting out the 45s spawn timer and a full non-deterministic fight.
