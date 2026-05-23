---
title: Persistence
updated: 2026-05-23
status: current
domain: technical
---

# Persistence

> **M_AUDIT2.ARCH.34 / .35 — spec rewritten 2026-05-23.** The previous
> revision claimed "all persistence uses @capacitor/preferences"; the
> actual implementation has used `@capacitor-community/sqlite` for save
> games (with `jeep-sqlite` on web) since M_HARDENING. The spec lagged
> ~30 commits. This rewrite reflects what `src/persistence/persistence.ts`
> actually does.

## Technology

Two storage layers, chosen by data shape:

- **`@capacitor-community/sqlite`** — save games (one row = one
  snapshot, large JSON blob). Native on Android via the Capacitor
  plugin; web via the bundled `jeep-sqlite` custom element + `sql.js`
  WASM. The `saves` table is a single relational store; `listMetadata`
  reads `id+name+seed+saved_at` cheaply; `load(id)` pulls the full
  snapshot column.
- **`@capacitor/preferences`** — small key/value scalars (audio mute,
  onboarding-seen flag, device-level event-PRNG seed). Native
  `SharedPreferences` on Android; `localStorage` on web.

The persistence layer in `src/persistence/` exposes a single
`Persistence` interface (`persistence.ts`) consumed by `App.tsx` and
HUD components. Application code never calls the Capacitor plugin
directly.

## SQLite Save Schema

Database name: `aethelgard` (constant `DB_NAME`). Created on first
app launch by `openDb()`.

### `saves` Table

```sql
CREATE TABLE IF NOT EXISTS saves (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  name      TEXT    NOT NULL,                  -- save name (truncated at 256 chars, M_SEC.12)
  seed      TEXT    NOT NULL,                  -- the seed phrase used to generate the world
  saved_at  TEXT    NOT NULL,                  -- ISO 8601 timestamp
  snapshot  TEXT    NOT NULL                   -- JSON: full game snapshot (GameSnapshot type)
);
```

### `GameSnapshot` JSON format (`src/persistence/serialize-game.ts`)

```ts
interface GameSnapshot {
  version: number;          // SNAPSHOT_VERSION (currently 1)
  config: {
    seedPhrase: string;
    mapSize: number;
    difficulty: 'easy' | 'normal' | 'hard';
    eventSeed: string;
  };
  world: WorldSnapshot;     // koota ECS dump — see serialize.ts
  economy: Record<Faction, GameEconomy>;
  clock: GameClock;
  weather: Weather;
  research: { purchased: string[] };
  rally: RallyState;
  zones: Record<Faction, ZoneSnapshot>;
  outcome: 'playing' | 'win' | 'loss';
}
```

The `WorldSnapshot` is produced by `serialize.ts` iterating the
unified `SERIALIZED_TRAITS` registry (`src/ecs/components.ts`); every
trait in that list round-trips automatically (M_REGISTRY.25).

Deterministic-derived state — board, navGraph, aiPlayers,
resourceNodes, initial entity spawns — is **not** stored. Resume
re-runs `startGame(config)` to rebuild that baseline, then overlays
the snapshot's mutable state (world, economy, zones, etc).

### Snapshot Validation (M_SEC.5/6/11)

`deserializeGame` calls `validateSnapshot(snap)` before any
`Object.assign` overlay:

- Reject snapshots whose `version` != `SNAPSHOT_VERSION`.
- Reject `__proto__` / `constructor` / `prototype` keys (prototype-pollution defence).
- Reject NaN/Infinity numbers via `safeFinite` coercion.
- Reject out-of-bounds `mapSize` (capped at 50).
- Reject unknown `weather.state` (must be in WeatherState union — fallback `'sunny'`).
- Reject snapshots with > 5000 entities (DoS defence — `MAX_ENTITY_COUNT`).
- `deserializeWorld` rejects `__proto__` etc at both trait-name and trait-payload layers.
- `pickEconomy` whitelist-spreads economy keys with `safeFinite` clamping.

A tampered save throws `CorruptSaveError` (typed; M_SEC.22) which the
App.tsx resume path catches and surfaces to the player.

### Snapshot Migration (planned — M_AUDIT2.ARCH.36)

`SNAPSHOT_VERSION = 1` today; throws on mismatch. A migration table
will land before the first schema bump so existing saves carry forward.

## Namespaced Preferences Keys (M_SEC.33)

All Preferences keys are namespaced with `aethelgard.` prefix to
defend against cross-app origin collision on web fallback
(`localStorage` is per-origin; an embedded WebView in a different
host shares the namespace without prefixing).

| Key (PREF_KEYS) | Default | Description |
|---|---|---|
| `aethelgard.eventPrngSeed` | freshly minted via `crypto.getRandomValues` | Device-level event PRNG seed (validated against `/^[a-z0-9-]{1,256}$/` per M_SEC.14) |
| `aethelgard.muted` | `'false'` | Global mute state |
| `aethelgard.onboardingSeen` | `null` | Marks the tutorial as completed |

## Save / Load Flow

### Save

1. The game calls `persistence.save(name, game)`.
2. `name` is truncated to 256 chars (M_SEC.12).
3. `serializeGame(game)` produces the `GameSnapshot`.
4. Previous row with the same `name` is `DELETE`d (M_SEC.26 UPSERT-by-name; defeats StrictMode double-fire).
5. New row is `INSERT`ed.

### Load

1. The game calls `persistence.load(id)`.
2. `SELECT * FROM saves WHERE id = ?` returns the row.
3. `rowToSaveRecord(row)` deserialises + validates. On parse failure throws `CorruptSaveError`.
4. `deserializeGame(snapshot)` rebuilds the live `GameState`:
   - `startGame(snapshot.config)` rebuilds deterministic baseline.
   - `deserializeWorld(snapshot.world)` replaces the koota world.
   - Mutable overlays applied: economy, clock, weather, research, rally, zones, outcome.
5. `runEconomyTick(game, 0)` triggers a zero-delta tick so derived caches re-sync.

### List

`persistence.list()` runs `SELECT * FROM saves ORDER BY saved_at DESC LIMIT 50` (M_SEC.13 — caps prevent OOM on corrupt DBs). Per-row parse failures are logged via `console.warn` + skipped (M_SEC.21).

### Auto-Save (M_SEC.27 concurrency-guarded)

`createAutoSave(onSave)` returns an `AutoSave` struct. `tickAutoSave`
accumulates game-time delta; when `AUTO_SAVE_INTERVAL` (5 minutes)
elapses, it invokes `onSave()`. The previous-save promise is tracked
in `saving: boolean`; ticks that fire while a save is in flight
increment `skipped` and don't re-enter `onSave()` — defends against
slow-IndexedDB write interleaving.

The current `App.tsx` wiring:

```ts
g.autoSave = createAutoSave(() => persistence.save('AutoSave', g));
```

The returned promise threads through `tickAutoSave` so the
concurrency guard actually awaits.

## Android Backup Disabled (M_SEC.3)

`AndroidManifest.xml` declares `allowBackup="false"` +
`fullBackupContent="@xml/backup_rules"` +
`dataExtractionRules="@xml/data_extraction_rules"`. The two XML
files deny-list every domain (`database / sharedpref / file /
external / root`) so neither Google's cloud backup nor cross-device
transfer can exfiltrate the SQLite DB or Preferences. The game is
per-install + per-device by design.

## Platform Abstraction

`src/persistence/persistence.ts` exports `Persistence` (the facade
interface), `createPersistence()` (the factory), `CorruptSaveError`,
`PREF_KEYS` + `PrefKey` (M_SEC.33 namespaced enum), and
`safePersistenceRead<T>` (the safe-read helper from M_MICRO.B.1).
Consumers import the type + facade; native vs web platform dispatch
is internal.
