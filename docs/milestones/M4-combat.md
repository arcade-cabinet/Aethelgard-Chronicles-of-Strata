# M4 — Combat

**Proves:** The full RTS loop closes. Footmen fight goblins; the goblin portal spawns
enemies; win (destroy portal) and loss (TownHall destroyed) conditions fire correctly.

**M4 is complete when all contracts below are checked and CI is green.**

Detailed test files are written as the first act of M4 (milestone-TDD batch).

## Contracts

- [ ] **Combat system — attack state machine** [`tests/unit/combat-system.test.ts`]
  - Footman with `attackDamage: 15` encounters a Goblin with `health: 60`.
  - Run `combatSystem` for enough ticks to complete `attackCooldown`.
  - Assert Goblin's `Health.current` has decreased by `attackDamage ± crit_variance`.
  - Repeat until Goblin health ≤ 0; assert `deathSystem` sets AnimationState to DYING.
  - Ref: `70-rts-systems.md §Combat System`.

- [ ] **Damage roll uses event PRNG** [`tests/unit/damage-roll.test.ts`]
  - Fix event PRNG seed; run 100 attack rolls.
  - Crit rate is between 8% and 12% (within expected variance of 10% target).
  - Damage values fall within `[attackDamage, attackDamage + 3]` for non-crits.
  - Damage values fall within `[2*attackDamage, 2*(attackDamage+3)]` for crits.
  - Ref: `70-rts-systems.md §Damage roll`.

- [ ] **Spawn system — goblins spawn from portal on timer** [`tests/unit/spawn-system.test.ts`]
  - GoblinPortal entity present; spawn timer at 45 seconds.
  - Run `spawnSystem` for 45 seconds of simulated time.
  - Assert one new Goblin entity exists adjacent to the portal.
  - Ref: `70-rts-systems.md §Enemy AI`.

- [ ] **AI system — goblin paths to nearest player unit** [`tests/unit/ai-system.test.ts`]
  - Goblin entity with no PathQueue; Footman entity 5 tiles away.
  - Run `aiSystem` for one tick.
  - Assert Goblin's PathQueue is non-empty and targets the Footman's tile.
  - Ref: `70-rts-systems.md §Enemy AI`.

- [ ] **AI retarget — goblin switches target when target dies** [`tests/unit/ai-retarget.test.ts`]
  - Goblin targeting Footman A; Footman A dies (entity removed).
  - Run `aiSystem` for one tick.
  - Assert Goblin's PathQueue is recomputed targeting Footman B (or TownHall if no
    other units exist).
  - Ref: `70-rts-systems.md §Enemy AI`.

- [ ] **Win condition — portal destroyed triggers victory modal** [`tests/e2e/win-condition.spec.ts`]
  - Playwright: reduce GoblinPortal to 0 HP via test helper.
  - Assert win modal is visible with class `modal-title-win`.
  - Assert modal title text is "Victory!".
  - Assert no further user input is accepted after modal appears.
  - Ref: `70-rts-systems.md §Win / Loss Conditions`, `90-ui-hud.md §Win / Loss Modal`.

- [ ] **Loss condition — TownHall destroyed triggers defeat modal** [`tests/e2e/loss-condition.spec.ts`]
  - Playwright: reduce TownHall to 0 HP via test helper.
  - Assert loss modal is visible with class `modal-title-loss`.
  - Assert modal title text is "Defeat!".
  - Ref: `70-rts-systems.md §Win / Loss Conditions`, `90-ui-hud.md §Win / Loss Modal`.

- [ ] **Health billboard renders on damaged unit** [`tests/visual/health-billboard-combat.spec.ts`]
  - Playwright: apply damage to a Footman.
  - Screenshot asserts a colored health bar is visible above the unit.
  - Ref: `70-rts-systems.md §Health billboard`.

- [ ] **Floating combat text appears and fades** [`tests/visual/floating-text.spec.ts`]
  - Playwright: trigger a damage event.
  - Assert a `.popup-text` element is added to `#labels-container`.
  - Wait 1.6 seconds; assert element is no longer visible (opacity 0 or removed).
  - Ref: `70-rts-systems.md §Floating combat text`, `90-ui-hud.md §Floating Labels Container`.

- [ ] **Win modal stat lines accurate** [`tests/unit/win-stats.test.ts`]
  - Run a session; accumulate 150 gold, 5 kills.
  - Trigger win condition.
  - Assert `gameState.resources.gold >= 150` and `gameState.kills == 5`.
  - Ref: `70-rts-systems.md §Win / Loss Conditions`.

- [ ] **Health billboard appears on a damaged unit** [`tests/visual/health-billboard.spec.ts`]
  - Re-scoped from M2: a health bar is meaningful once units take damage, which
    is M4's combatSystem. Reduce a unit's Health to 50%; assert a health-bar
    element renders above the unit in the scene.
  - Ref: `70-rts-systems.md §Health billboard`.
