/**
 * Persistence facade — save/load game sessions + settings.
 *
 * Everything is stored in `@capacitor/preferences`, which uses native
 * key-value storage on Android and `localStorage` on web — no platform setup,
 * no WASM payload, no `jeep-sqlite` web component. Save games are small JSON
 * blobs (`{name, seed, snapshot}`) with no relational queries beyond "list" and
 * "get by id", so a key-value store is the right fit; the `95-persistence.md`
 * spec's SQLite design was heavier than the data warrants.
 *
 * Source: docs/specs/95-persistence.md (revised — Preferences-backed saves).
 */
import { Preferences } from '@capacitor/preferences';
import { type Rng, advanceEventSeed } from '@/core/rng';
import type { GameState } from '@/game/game-state';
import { type WorldSnapshot, serializeWorld } from './serialize';

/** The Preferences key under which the device-level event PRNG seed is stored. */
const EVENT_SEED_KEY = 'eventPrngSeed';
/** The Preferences key holding the JSON array of save ids, newest first. */
const SAVE_INDEX_KEY = 'saveIndex';
/** Prefix for the per-save Preferences keys (`save:<id>`). */
const SAVE_KEY_PREFIX = 'save:';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A persisted save-game record. */
export interface SaveRecord {
  /** Monotonic save id (millisecond timestamp at save time). */
  id: number;
  /** The save's display name. */
  name: string;
  /** The map seed phrase the session was started with. */
  seedPhrase: string;
  /** ISO timestamp the save was written. */
  savedAt: string;
  /** The serialized ECS world. */
  snapshot: WorldSnapshot;
}

/** The persistence facade interface. */
export interface Persistence {
  /** Persist the current game state under `name`. */
  save(name: string, game: GameState): Promise<void>;
  /** Load a save record by its id. */
  load(id: number): Promise<SaveRecord | null>;
  /** List all saved games, newest first. */
  list(): Promise<SaveRecord[]>;
  /** Read a string setting. Returns `null` if not set. */
  getSetting(key: string): Promise<string | null>;
  /** Write a string setting. */
  setSetting(key: string, value: string): Promise<void>;
  /**
   * Return the device-level event PRNG seed from Preferences. If absent,
   * generates a fresh random seed via `crypto.getRandomValues`, stores it,
   * and returns it. `crypto.getRandomValues` is the one allowed
   * non-determinism — it seeds the PRNG, it is not simulation logic.
   * See docs/specs/96-prng-and-landing.md.
   */
  getEventSeed(): Promise<string>;
  /**
   * Advance the event seed by drawing the next seed from the current event
   * PRNG stream, persist the new value, and return it. Call once per New Game
   * so each session gets a distinct, deterministic event stream.
   */
  advanceAndPersistEventSeed(currentRng: Rng): Promise<string>;
}

// ---------------------------------------------------------------------------
// Save-index helpers
// ---------------------------------------------------------------------------

/** Read the ordered list of save ids (newest first). */
async function readIndex(): Promise<number[]> {
  const { value } = await Preferences.get({ key: SAVE_INDEX_KEY });
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as number[]) : [];
  } catch {
    return [];
  }
}

/** Write the ordered list of save ids. */
async function writeIndex(ids: number[]): Promise<void> {
  await Preferences.set({ key: SAVE_INDEX_KEY, value: JSON.stringify(ids) });
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/** Create the persistence facade. */
export function createPersistence(): Persistence {
  return {
    async save(name: string, game: GameState): Promise<void> {
      const id = Date.now();
      const record: SaveRecord = {
        id,
        name,
        seedPhrase: game.seedPhrase,
        savedAt: new Date().toISOString(),
        snapshot: serializeWorld(game.world),
      };
      await Preferences.set({
        key: `${SAVE_KEY_PREFIX}${id}`,
        value: JSON.stringify(record),
      });
      const index = await readIndex();
      await writeIndex([id, ...index.filter((existing) => existing !== id)]);
    },

    async load(id: number): Promise<SaveRecord | null> {
      const { value } = await Preferences.get({ key: `${SAVE_KEY_PREFIX}${id}` });
      if (!value) return null;
      try {
        return JSON.parse(value) as SaveRecord;
      } catch {
        return null;
      }
    },

    async list(): Promise<SaveRecord[]> {
      const ids = await readIndex();
      const records: SaveRecord[] = [];
      for (const id of ids) {
        const { value } = await Preferences.get({ key: `${SAVE_KEY_PREFIX}${id}` });
        if (value) {
          try {
            records.push(JSON.parse(value) as SaveRecord);
          } catch {
            // skip a corrupt save rather than failing the whole list
          }
        }
      }
      return records;
    },

    async getSetting(key: string): Promise<string | null> {
      const { value } = await Preferences.get({ key });
      return value;
    },

    async setSetting(key: string, value: string): Promise<void> {
      await Preferences.set({ key, value });
    },

    async getEventSeed(): Promise<string> {
      const { value } = await Preferences.get({ key: EVENT_SEED_KEY });
      if (value !== null) return value;
      // First launch: generate a fresh random seed from crypto.getRandomValues.
      // This is the one allowed non-determinism — it seeds the PRNG, it is not
      // simulation logic. Lives here in persistence.ts, outside src/core|ecs|game.
      const buf = new Uint32Array(4);
      crypto.getRandomValues(buf);
      const seed = Array.from(buf)
        .map((n) => n.toString(36))
        .join('');
      await Preferences.set({ key: EVENT_SEED_KEY, value: seed });
      return seed;
    },

    async advanceAndPersistEventSeed(currentRng: Rng): Promise<string> {
      const next = advanceEventSeed(currentRng);
      await Preferences.set({ key: EVENT_SEED_KEY, value: next });
      return next;
    },
  };
}
