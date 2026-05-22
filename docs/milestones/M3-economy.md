# M3 — Economy

**Proves:** The Warcraft economic loop runs autonomously. Peons harvest resources,
carry loads back to the Town Hall, and deposit without player intervention. Players
can build Farms and Barracks. The supply system gates unit training correctly.

**M3 is complete when all contracts below are checked and CI is green.**

Detailed test files are written as the first act of M3 (milestone-TDD batch).

## Contracts

- [ ] **Harvest system — full peon loop** [`tests/unit/harvest-system.test.ts`]
  - Peon with no assignment in IDLE state.
  - Assign peon to a wood resource node: state transitions to SEEKING.
  - Run `pathFollowSystem` until peon is adjacent: state transitions to HARVESTING.
  - Run `harvestSystem` until `harvestTimer` completes: Carrier filled, AnimationState HARVESTING.
  - Run `pathFollowSystem` back to Town Hall: state transitions to CARRYING.
  - Run `depositSystem` on arrival: resources added to game state, Carrier cleared,
    state back to SEEKING.
  - ResourceNode amount decremented by yield amount.
  - Ref: `70-rts-systems.md §Peon Harvest Loop`.

- [ ] **Resource node depletion** [`tests/unit/resource-depletion.test.ts`]
  - Resource node with `amount = 10`, yield per cycle = 10.
  - After one harvest cycle: `amount == 0`, peon enters IDLE.
  - Ref: `70-rts-systems.md §Peon Harvest Loop`.

- [ ] **Supply system gates unit training** [`tests/unit/supply-system.test.ts`]
  - TownHall provides 5 supply. One Peon costs 1 supply (4 remaining).
  - Training a Footman (cost 2) when only 1 supply remains fails with error.
  - Building a Farm adds 10 to max supply.
  - Ref: `70-rts-systems.md §Supply System`.

- [ ] **Build mode — placement validation** [`tests/unit/build-mode.test.ts`]
  - Attempting placement on OCEAN tile rejected.
  - Attempting placement on an occupied tile rejected.
  - Placement on valid GRASS tile with sufficient resources succeeds.
  - Resources deducted on successful placement.
  - Ref: `70-rts-systems.md §Build Mode`.

- [ ] **Build system — peon constructs building over time** [`tests/unit/build-system.test.ts`]
  - Farm placed; nearest idle peon auto-assigned.
  - Peon paths to site; `buildSystem` ticks `Building.progress`.
  - When `progress >= 1.0`: `Building.isComplete = true`.
  - Peon returns to IDLE after completion.
  - Ref: `70-rts-systems.md §Build Mode`.

- [ ] **HUD resource counters update on deposit** [`tests/browser/hud-resources.test.ts`]
  - Game starts with gold=20, wood=50, stone=20.
  - Simulate a wood deposit of 10.
  - Assert `#val-wood` DOM element text equals "60".
  - Ref: `90-ui-hud.md §Resource Panel`.

- [ ] **HUD supply counter shows current/max** [`tests/browser/hud-supply.test.ts`]
  - Supply display starts at "1/5" (1 peon, TownHall provides 5).
  - After Farm completes: "1/15".
  - Ref: `90-ui-hud.md §Resource Panel`.

- [ ] **Economy loop runs autonomously for 60 simulated seconds** [`tests/unit/economy-integration.test.ts`]
  - Start with 2 peons, 3 resource nodes (1 wood, 1 stone, 1 gold).
  - Run the full system loop for 3600 ticks (60 seconds at 60fps).
  - Assert gold > 20, wood > 50, stone > 20 (resources have accumulated).
  - Assert no system throws an error or enters an undefined state.
  - Ref: `70-rts-systems.md §Economy System`.

- [ ] **Build progress ring visible in HUD** [`tests/visual/build-progress.spec.ts`]
  - Playwright: place a Farm; assert a progress indicator is visible in the HUD
    selection panel while the Farm is under construction.
  - Ref: `90-ui-hud.md §Selection Panel`, `70-rts-systems.md §Build Mode`.

- [ ] **Selection ring renders when a unit is selected** [`tests/browser/selection.test.ts`]
  - Re-scoped from M2: unit selection is meaningful once there are multiple units
    and orders. Clicking a character sets `Selectable.isSelected = true`; a
    selection-ring mesh renders beneath the selected character.
  - Ref: `60-characters.md §Character Rendering`, `90-ui-hud.md §Selection Panel`.
