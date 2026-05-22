# Persistence

## Technology

Two persistence mechanisms are used:
- **`@capacitor-community/sqlite`** — structured save files (ECS snapshots).
- **`@capacitor/preferences`** — lightweight key-value settings.

On web (GitHub Pages), the SQLite plugin uses `wa-sqlite` as a WebAssembly fallback.
The persistence layer in `src/persistence/` abstracts the platform — application code
never calls the Capacitor plugin directly. It calls the persistence module, which
selects the correct backend at runtime.

## SQLite Save Schema

Database name: `aethelgard.db`. Created on first app launch.

### `saves` Table

```sql
CREATE TABLE IF NOT EXISTS saves (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,           -- user-visible save name (e.g. "Slot 1")
  seedPhrase  TEXT    NOT NULL,           -- the seed phrase used to generate the world
  createdAt   TEXT    NOT NULL,           -- ISO 8601 timestamp
  updatedAt   TEXT    NOT NULL,           -- ISO 8601 timestamp of last save
  ecsSnapshot TEXT    NOT NULL,           -- JSON: full koota ECS entity/component dump
  gameState   TEXT    NOT NULL            -- JSON: non-ECS game state (see below)
);
```

**`ecsSnapshot` JSON format:**

```json
{
  "version": 1,
  "entities": [
    {
      "id": "uint32",
      "components": {
        "Transform": { "position": [x,y,z], "rotation": [x,y,z,w], "scale": [x,y,z] },
        "HexPosition": { "q": 0, "r": 0, "level": 2 },
        "Health": { "current": 80, "max": 100 }
      }
    }
  ]
}
```

Only components present on the entity are included. Missing keys mean the entity does
not have that component.

**`gameState` JSON format:**

```json
{
  "version": 1,
  "resources": { "gold": 150, "wood": 320, "stone": 80 },
  "supply": { "current": 6, "max": 15 },
  "researchComplete": ["SteelPlows"],
  "weatherState": "Sunny",
  "eventPrngState": "uint32-serialized-state",
  "gameClock": 432.5,
  "kills": 7
}
```

The `eventPrngState` captures the current position in the event PRNG sequence so that
weather and combat variance continue deterministically from the save point.

## Preferences Keys

Stored via `@capacitor/preferences` (key/value pairs, persisted to native `SharedPreferences` on Android and `localStorage` on web).

| Key | Type | Default | Description |
|---|---|---|---|
| `vol-sfx` | number (0–1) | `0.7` | SFX bus volume |
| `vol-music` | number (0–1) | `0.5` | Music bus volume |
| `vol-ambient` | number (0–1) | `0.4` | Ambient bus volume |
| `vol-ui` | number (0–1) | `0.5` | UI bus volume |
| `muted` | boolean | `false` | Global mute state |
| `lastSeed` | string | `""` | Last used seed phrase (pre-fills the launcher input) |
| `trackCamera` | boolean | `true` | Camera follow toggle default |

## Save / Load Flow

### Save

1. The game calls `persistence.save(slotName: string)`.
2. The persistence module serializes the full koota ECS world to JSON via
   `world.snapshot()` (a utility that iterates all entities and their components).
3. It serializes the non-ECS game state (resources, research, weather, etc.) to JSON.
4. It writes a row to the `saves` table, or updates `updatedAt` if a row with the
   same `name` already exists.
5. Writes the current seed phrase to `Preferences` under `lastSeed`.

### Load

1. The game calls `persistence.load(saveId: number)`.
2. The persistence module reads the row from `saves`.
3. It reconstructs the ECS world from `ecsSnapshot` JSON via `world.restore()`.
4. It restores non-ECS game state from `gameState` JSON.
5. The game state machine transitions to the in-game state; r3f components re-subscribe
   to the restored ECS queries.

### Auto-Save

The game auto-saves to slot "AutoSave" every 5 minutes of game time. The `gameClock`
in `gameState` tracks elapsed seconds and triggers the auto-save.

## Platform Abstraction

`src/persistence/index.ts` exports:

```typescript
interface PersistenceAdapter {
  save(slotName: string, ecsSnapshot: string, gameState: string): Promise<void>;
  load(saveId: number): Promise<SaveRecord | null>;
  listSaves(): Promise<SaveRecord[]>;
  deleteSave(saveId: number): Promise<void>;
  getPreference<T>(key: string, defaultValue: T): Promise<T>;
  setPreference<T>(key: string, value: T): Promise<void>;
}
```

The factory `createPersistenceAdapter()` returns a `CapacitorSQLiteAdapter` on native
and a `WaSQLiteAdapter` on web. The game code imports only `PersistenceAdapter` and
never imports the concrete implementations directly.
