/**
 * Persistence facade — save/load game sessions + settings.
 *
 * Save games are stored in `@capacitor-community/sqlite` (a `saves` table
 * as described in docs/specs/95-persistence.md). Settings (muted, lastSeed)
 * are stored in `@capacitor/preferences` which falls back to localStorage on
 * web. Both plugins have web fallback implementations so this module works
 * in the browser without native binaries.
 *
 * Source: docs/specs/95-persistence.md
 */
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';
import { Preferences } from '@capacitor/preferences';
import type { GameState } from '@/game/game-state';
import { advanceEventSeed, type Rng } from '@/core/rng';
import { serializeWorld, type WorldSnapshot } from './serialize';

/** The Preferences key under which the device-level event PRNG seed is stored. */
const EVENT_SEED_KEY = 'eventPrngSeed';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A save-game record from the saves table. */
export interface SaveRecord {
  id: number;
  name: string;
  seedPhrase: string;
  savedAt: string;
  snapshot: WorldSnapshot;
}

/** The persistence facade interface. */
export interface Persistence {
  /** Persist the current game state under `name`. */
  save(name: string, game: GameState): Promise<void>;
  /** Load a save record by its row id. */
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
   * PRNG stream, persist the new value under `eventPrngSeed`, and return it.
   * Call once per New Game so each session gets a distinct, deterministic
   * event stream.
   */
  advanceAndPersistEventSeed(currentRng: Rng): Promise<string>;
}

// ---------------------------------------------------------------------------
// SQLite init
// ---------------------------------------------------------------------------

const DB_NAME = 'aethelgard';

const sqlite = new SQLiteConnection(CapacitorSQLite);

/** Open (or create) the app database and ensure the schema exists. */
async function openDb() {
  const db = await sqlite.createConnection(DB_NAME, false, 'no-encryption', 1, false);
  await db.open();
  await db.execute(`
    CREATE TABLE IF NOT EXISTS saves (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      name     TEXT    NOT NULL,
      seed     TEXT    NOT NULL,
      saved_at TEXT    NOT NULL,
      snapshot TEXT    NOT NULL
    );
  `);
  return db;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/** Create the persistence facade. */
export function createPersistence(): Persistence {
  return {
    async save(name: string, game: GameState): Promise<void> {
      const snapshot = serializeWorld(game.world);
      const savedAt = new Date().toISOString();
      const db = await openDb();
      try {
        await db.run(`INSERT INTO saves (name, seed, saved_at, snapshot) VALUES (?, ?, ?, ?);`, [
          name,
          game.seedPhrase,
          savedAt,
          JSON.stringify(snapshot),
        ]);
      } finally {
        await sqlite.closeConnection(DB_NAME, false);
      }
    },

    async load(id: number): Promise<SaveRecord | null> {
      const db = await openDb();
      try {
        const result = await db.query(`SELECT * FROM saves WHERE id = ?;`, [id]);
        const row = result.values?.[0];
        if (!row) return null;
        return {
          id: row.id as number,
          name: row.name as string,
          seedPhrase: row.seed as string,
          savedAt: row.saved_at as string,
          snapshot: JSON.parse(row.snapshot as string) as WorldSnapshot,
        };
      } finally {
        await sqlite.closeConnection(DB_NAME, false);
      }
    },

    async list(): Promise<SaveRecord[]> {
      const db = await openDb();
      try {
        const result = await db.query(`SELECT * FROM saves ORDER BY saved_at DESC;`);
        return (result.values ?? []).map((row) => ({
          id: row.id as number,
          name: row.name as string,
          seedPhrase: row.seed as string,
          savedAt: row.saved_at as string,
          snapshot: JSON.parse(row.snapshot as string) as WorldSnapshot,
        }));
      } finally {
        await sqlite.closeConnection(DB_NAME, false);
      }
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
