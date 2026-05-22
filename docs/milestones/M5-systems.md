# M5 — Systems

**Proves:** The full "production" feature set is running: weather, research, rally
points, minimap, and day/night cycle. All systems from conversation.md are implemented
and pinned by tests.

**Status: COMPLETE.** The in-scope contracts are satisfied — 173 unit tests, 10
browser tests, 3 e2e tests green. The research/rally *HUD trigger UI* is re-scoped
to M6 (consistent with build-mode M3→M6) — the underlying logic is built and tested.

## Contracts

- [x] **Weather system — state machine transitions** [`tests/unit/weather-system.test.ts`]
  - Starts Sunny; transitions Sunny → Fog|Rain → Sunny, never directly between
    Fog and Rain; deterministic for a fixed event-PRNG seed.

- [x] **Weather visual effects apply** [`src/world/RainParticles.tsx`]
  - `RainParticles` renders a falling-rain Points field, visible only when
    `weather.state === 'rain'`.

- [x] **Rain movement penalty applies** [`tests/unit/rain-penalty.test.ts`]
  - `WEATHER_SPEED_MULTIPLIER.rain` is 0.8; `runEconomyTick` threads it into
    `pathFollowSystem` so all movement slows 20% in rain.

- [x] **Research — Forged Blades applies the damage bonus**
  [`tests/unit/research-blades.test.ts`]
  - `applyResearch('forgedBlades')` adds +5 to every Combatant's attackDamage;
    cannot be purchased twice or without resources.

- [x] **Research — Steel Plows applies the harvest bonus**
  [`tests/unit/research-plows.test.ts`]
  - `applyResearch('steelPlows')` multiplies every Harvester's rate by 1.5.

- [x] **Rally point — trained footman paths to the marker**
  [`tests/unit/rally-point.test.ts`]
  - `applyRallyPoint` paths a unit to the rally tile; no-op when no rally is set.

- [x] **Rally marker visible on board** [`src/world/RallyMarker.tsx`]
  - `RallyMarker` renders a flag-on-pole prop at `rally.targetKey` when set.

- [x] **Minimap renders correctly** [`tests/browser/minimap.browser.test.tsx`]
  - `Minimap` draws every biome-colored tile plus live unit dots and the Town
    Hall / Portal markers; the browser test asserts non-empty pixel data.

- [x] **Day/night cycle — lighting transitions** [`tests/unit/day-night.test.ts`]
  - `lightIntensityAt` peaks near noon, bottoms near midnight, transitions
    smoothly; `DayNightCycle` drives the scene light + background each frame.

- [x] **Day/night visual** [`src/render/DayNightCycle.tsx`]
  - The scene background follows `skyColorAt` and the directional light follows
    `lightIntensityAt` — the board visibly cycles day to night.

- [x] **Orc escalation spawns after the threshold** [`tests/unit/orc-spawn.test.ts`]
  - `spawnSystem` spawns only Goblins before 600 game-seconds; past the
    threshold every third spawn is an Orc.

### Re-scoped — research/rally HUD triggers → M6

The research *progress timer* (a 30s bar in the Barracks selection panel) and the
in-app *research/rally buttons* depend on the Barracks selection panel — part of
M6's Radix HUD, consistent with how build-mode's UI was M3→M6. The research and
rally *logic* is fully built and unit-tested; M6 wires the trigger UI.
