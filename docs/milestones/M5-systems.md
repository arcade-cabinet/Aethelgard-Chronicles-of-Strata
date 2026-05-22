# M5 — Systems

**Proves:** The full "production" feature set is running: weather, research, rally
points, minimap, and day/night cycle. All systems from conversation.md are implemented
and pinned by tests.

**M5 is complete when all contracts below are checked and CI is green.**

Detailed test files are written as the first act of M5 (milestone-TDD batch).

## Contracts

- [ ] **Weather system — state machine transitions** [`tests/unit/weather-system.test.ts`]
  - Weather starts as Sunny.
  - After sufficient simulated time, transitions to Fog OR Rain (never directly
    between Fog and Rain).
  - Weather always returns to Sunny before the next transition.
  - Same seed always produces transitions at the same game-time marks.
  - Ref: `70-rts-systems.md §Weather System`.

- [ ] **Weather visual effects apply** [`tests/visual/weather-effects.spec.ts`]
  - Playwright: force weather to Rain.
  - Screenshot shows rain particle system visible.
  - HUD `#weather-hud` text is "🌧️ Heavy Rain".
  - Ref: `70-rts-systems.md §Weather System`.

- [ ] **Rain movement penalty applies** [`tests/unit/rain-penalty.test.ts`]
  - Unit movement speed without rain: baseline.
  - Switch weather to Rain: unit `Movement.speed` reduced by 20%.
  - Switch back to Sunny: speed restored to baseline.
  - Ref: `70-rts-systems.md §Weather System`.

- [ ] **Research — Forged Blades applies damage bonus** [`tests/unit/research-blades.test.ts`]
  - Footman `attackDamage` before research: 15.
  - Purchase Forged Blades.
  - Footman `attackDamage` after research: 20.
  - Research cannot be purchased twice.
  - Ref: `70-rts-systems.md §Research System`.

- [ ] **Research — Steel Plows applies harvest rate bonus** [`tests/unit/research-plows.test.ts`]
  - Peon `harvestRate` before research: 1.0.
  - Purchase Steel Plows.
  - Peon `harvestRate` after research: 1.5.
  - Ref: `70-rts-systems.md §Research System`.

- [ ] **Research timer visible in HUD** [`tests/browser/research-progress.test.ts`]
  - Select Barracks; click "Research Forged Blades".
  - Assert a progress indicator appears in the selection panel.
  - Assert progress reaches 100% after 30 simulated seconds.
  - Ref: `70-rts-systems.md §Research System`, `90-ui-hud.md §Selection Panel`.

- [ ] **Rally point — trained footman paths to marker** [`tests/unit/rally-point.test.ts`]
  - Set rally point at tile `{ q: 5, r: 0 }`.
  - Train a Footman at Barracks.
  - Assert Footman's PathQueue targets `{ q: 5, r: 0 }` immediately after training.
  - Ref: `70-rts-systems.md §Rally Points`.

- [ ] **Rally marker visible on board** [`tests/visual/rally-marker.spec.ts`]
  - Playwright: set a rally point on a GRASS tile.
  - Screenshot asserts a flag/marker prop is visible at that tile position.
  - Ref: `70-rts-systems.md §Rally Points`.

- [ ] **Minimap renders correctly** [`tests/browser/minimap.test.ts`]
  - `#minimap-canvas` element present and has non-zero pixel data after game start.
  - Pixel at known OCEAN tile position matches blue color family.
  - Pixel at known GRASS tile position matches green color family.
  - Ref: `90-ui-hud.md §Minimap`.

- [ ] **Day/night cycle — lighting transitions** [`tests/unit/day-night.test.ts`]
  - Game clock at noon: directional light intensity near 1.0.
  - Game clock at midnight: directional light intensity near 0.0.
  - Transition is smooth (no step discontinuity).
  - Ref: `20-visual-language.md §Day/Night Sky Colors`.

- [ ] **Day/night visual check** [`tests/visual/day-night.spec.ts`]
  - Playwright: force game clock to midnight.
  - Screenshot sky area is dark (dominant channel < 30).
  - Force to noon; screenshot sky area is light (dominant channel > 100).
  - Ref: `20-visual-language.md §Day/Night Sky Colors`.

- [ ] **Orc escalation spawns after threshold** [`tests/unit/orc-spawn.test.ts`]
  - Game clock < 10 minutes and < 3 footmen: no Orc entities.
  - Simulate 10 minutes of game time.
  - Run `spawnSystem`: at least one Orc entity exists after threshold.
  - Ref: `70-rts-systems.md §Enemy AI`.
