# 96 — Two-PRNG Model & the Landing Page

Supersedes the single-`createDualPrng(phrase)` model and the single-input
launcher. Written mid-M6 in response to a design correction.

## The problem with the old model

`createDualPrng(seedPhrase)` derived **both** the map stream and the event
stream from the *same* player-chosen phrase. Consequences:

- Combat and weather were reproducible only by replaying the exact same map
  seed — a player who wanted "the same map, a different fight" could not have it.
- `randomSeedPhrase()` used `Math.random()` to shuffle word lists, breaking the
  determinism contract and needing a gate exemption.

## The two-PRNG model

There are **two independent PRNGs**, each with a distinct lifecycle:

### Map PRNG — seeded by the player's seed phrase

- Created per game from the chosen `adjective-adjective-noun` phrase via
  `cyrb128(phrase)` → `seedrandom`-style stream.
- Drives: board terrain, biomes, resource-node placement.
- Contract: **same phrase → same map**, always. The phrase IS the map identity.

### Event PRNG — a persistent, buried seed in Capacitor Preferences

- A `seedrandom` stream whose **seed string lives in Capacitor Preferences**
  under the key `eventPrngSeed`.
- **Lifecycle (persist + advance):** on first launch, a random seed is generated
  (from `crypto.getRandomValues`, the one allowed non-determinism — it seeds the
  PRNG, it is not simulation logic) and stored. Each New Game *advances* the
  buried seed: the next seed is itself drawn from the current event stream, and
  the advanced value is written back to Preferences. So combat/weather differ
  per session but every session is deterministic and replayable from its save.
- Drives: combat damage rolls, crit rolls, weather transitions, Orc-spawn
  cadence — **and the seed-phrase shuffle**. Picking a random seed phrase is
  "just another event": `randomSeedPhrase(eventRng)` draws word indices from the
  event stream. No `Math.random()` anywhere in `src/core|ecs|game`.
- A saved game stores the event seed it was started with, so Continue restores
  the exact combat sequence.

### Why this split

- "Same map, different fight" and "different map, replay this exact fight" both
  become expressible — they are orthogonal axes now.
- The seed-phrase randomizer stops being an exception to the determinism rule —
  it is an event draw like any other.
- The event seed is *device state*, not *game state*, so it belongs in
  Preferences, not in the seed phrase.

## The landing page

A traditional title screen replaces the single-input launcher:

- **New Game** — opens a modal: seed phrase (with a randomize button that draws
  from the event PRNG), map size, AI difficulty. "Begin" starts the game.
- **Continue** — loads the most recent auto-save (full ECS session restore via
  the M6 persistence layer). Hidden/disabled when no save exists.
- **Settings** — a modal: audio mute, and the map-size options. **Huge** map
  size is offered only when Capacitor Device detection reports the device can
  handle it (sufficient memory / not a low-end phone).

Modal overlays (Radix Dialog) host New Game and Settings over the branded
title screen.

## AI difficulty

Three levels — Easy / Normal / Hard — scaling **both**:

- enemy base `spawnInterval` and the Orc-escalation threshold.
- Enemy `Health` and `Combatant.attackDamage` (a per-difficulty multiplier
  applied in the character factory for enemy roles).

## Map size

`MAP_RADIUS` becomes a per-game parameter (was a constant): Small 6, Medium 9
(the current value), Large 12, Huge 16. Huge is device-gated.

## Migration

- `createDualPrng` is replaced: a `createMapPrng(phrase)` and a separate
  `EventPrng` facade backed by the persisted seed.
- `randomSeedPhrase` takes the event `Rng`.
- `GameState` gains `mapSize` and `difficulty`; `startGame` takes a
  `NewGameConfig { seedPhrase, mapSize, difficulty }`.
- The launcher is replaced by `TitleScreen` + `NewGameModal` + `SettingsModal`.
