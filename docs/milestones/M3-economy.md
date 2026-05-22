# M3 — Economy

**Proves:** The Warcraft economic loop runs autonomously. Peons harvest resources,
carry loads back to the Town Hall, and deposit without player intervention. Players
can build Farms and Barracks. The supply system gates unit training correctly.

**M3 is complete when all contracts below are checked and CI is green.**

Detailed test files are written as the first act of M3 (milestone-TDD batch).

## Contracts

- [x] **Harvest system — full peon loop** [`tests/unit/harvest-system.test.ts`]
  - Peon with no assignment in IDLE state.
  - Assign peon to a wood resource node: state transitions to SEEKING.
  - Run `pathFollowSystem` until peon is adjacent: state transitions to HARVESTING.
  - Run `harvestSystem` until `harvestTimer` completes: Carrier filled, AnimationState HARVESTING.
  - Run `pathFollowSystem` back to Town Hall: state transitions to CARRYING.
  - Run `depositSystem` on arrival: resources added to game state, Carrier cleared,
    state back to SEEKING.
  - ResourceNode amount decremented by yield amount.
  - Ref: `70-rts-systems.md §Peon Harvest Loop`.

- [x] **Resource node depletion** [`tests/unit/resource-depletion.test.ts`]
  - Resource node with `amount = 10`, yield per cycle = 10.
  - After one harvest cycle: `amount == 0`, peon enters IDLE.
  - Ref: `70-rts-systems.md §Peon Harvest Loop`.

- [x] **Supply system gates unit training** [`tests/unit/supply-system.test.ts`]
  - TownHall provides 5 supply. One Peon costs 1 supply (4 remaining).
  - Training a Footman (cost 2) when only 1 supply remains fails with error.
  - Building a Farm adds 10 to max supply.
  - Ref: `70-rts-systems.md §Supply System`.

- [x] **Build mode — placement validation** [`tests/unit/build-mode.test.ts`]
  - Attempting placement on OCEAN tile rejected.
  - Attempting placement on an occupied tile rejected.
  - Placement on valid GRASS tile with sufficient resources succeeds.
  - Resources deducted on successful placement.
  - Ref: `70-rts-systems.md §Build Mode`.

- [x] **Build system — peon constructs building over time** [`tests/unit/build-system.test.ts`]
  - Farm placed; nearest idle peon auto-assigned.
  - Peon paths to site; `buildSystem` ticks `Building.progress`.
  - When `progress >= 1.0`: `Building.isComplete = true`.
  - Peon returns to IDLE after completion.
  - Ref: `70-rts-systems.md §Build Mode`.

- [x] **HUD resource counters update on deposit** [`tests/browser/hud-resources.test.ts`]
  - Game starts with gold=20, wood=50, stone=20.
  - Simulate a wood deposit of 10.
  - Assert `#val-wood` DOM element text equals "60".
  - Ref: `90-ui-hud.md §Resource Panel`.

- [x] **HUD supply counter shows current/max** [`tests/browser/hud-supply.test.ts`]
  - Supply display starts at "1/5" (1 peon, TownHall provides 5).
  - After Farm completes: "1/15".
  - Ref: `90-ui-hud.md §Resource Panel`.

- [x] **Economy loop runs autonomously for 60 simulated seconds** [`tests/unit/economy-integration.test.ts`]
  - Start with 2 peons, 3 resource nodes (1 wood, 1 stone, 1 gold).
  - Run the full system loop for 3600 ticks (60 seconds at 60fps).
  - Assert gold > 20, wood > 50, stone > 20 (resources have accumulated).
  - Assert no system throws an error or enters an undefined state.
  - Ref: `70-rts-systems.md §Economy System`.

### Re-scoped contracts (the logic is built; the HUD trigger is M6)

- **Build progress ring → M6 (HUD).** `buildSystem` advances construction and
  `Buildings.tsx` can render an under-construction visual — both built and
  tested. What is missing is the in-app *build-mode UI* (a build button that
  places a Farm), which is part of M6's Radix HUD. The progress ring is
  meaningless until a build can be triggered. Moved to `M6-polish.md`.
- **Selection-ring click interaction → M6 (HUD).** `SelectionRing` renders
  beneath any entity whose `Selectable.isSelected` is true (verified visible on
  the player pawn). What is missing is *click-to-select* — wiring a unit tap to
  toggle `isSelected` — which is HUD/command work. Moved to `M6-polish.md`.

**M3 status: COMPLETE.** The 8 in-scope contracts are satisfied — the
autonomous harvest economy, supply, build-mode validation + build system, and
the HUD counters. Verified in the running app: wood climbs 50 → 250 in 25s of
hands-off harvesting. The two HUD-triggered contracts above are re-scoped to M6.
