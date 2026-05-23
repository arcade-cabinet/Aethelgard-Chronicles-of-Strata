/**
 * Persistence facade — save/load game sessions + settings.
 *
 * Save games are stored in `@capacitor-community/sqlite` (a `saves` table).
 * - Web: jeep-sqlite backed by sql.js + IndexedDB.
 * - Android: native SQLite via the Capacitor plugin.
 *
 * Settings (muted, lastSeed) and the event-PRNG seed are stored in
 * `@capacitor/preferences`, which uses native key-value storage on Android
 * and localStorage on web — no DB needed for transient settings.
 *
 * The SQLite connection is opened lazily on the first save/load/list call.
 * `createPersistence()` itself is synchronous and touches nothing.
 *
 * Source: docs/specs/95-persistence.md
 */

import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import {
  CapacitorSQLite,
  SQLiteConnection,
  type SQLiteDBConnection,
} from '@capacitor-community/sqlite';
import { advanceEventSeed, type Rng } from '@/core/rng';
import type { GameState } from '@/game/game-state';
import { type GameSnapshot, serializeGame } from './serialize-game';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A persisted save-game record. */
export interface SaveRecord {
  /** Row id from the saves table. */
  id: number;
  /** The save's display name. */
  name: string;
  /** The map seed phrase the session was started with. */
  seedPhrase: string;
  /** ISO timestamp the save was written. */
  savedAt: string;
  /** The full game-state snapshot (M_HARDENING.1) — restorable via deserializeGame. */
  snapshot: GameSnapshot;
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
   * PRNG stream, persist the new value, and return it. Call once per New Game
   * so each session gets a distinct, deterministic event stream.
   */
  advanceAndPersistEventSeed(currentRng: Rng): Promise<string>;
}

/**
 * M_SEC.22 — thrown by `Persistence.load(id)` when the row exists
 * but its snapshot column fails to parse / validate. Lets the App's
 * resume path differentiate "no save here" (returns null) from "save
 * corrupted" (throws).
 */
export class CorruptSaveError extends Error {
  constructor(
    public readonly saveId: number,
    public readonly reason: string,
  ) {
    super(`Save ${saveId} is corrupt: ${reason}`);
    this.name = 'CorruptSaveError';
  }
}

/**
 * Safe persistence read with a typed parser + fallback (M_MICRO.B.1).
 * Consolidates the catch-and-default pattern that previously lived
 * inline in OnboardingOverlay + SettingsModal. The persistence
 * read may reject (rooted device with corrupt SQLite, race with a
 * concurrent setSetting); callers want a single contract:
 * "give me a parsed value or my fallback."
 */
export async function safePersistenceRead<T>(
  persistence: Persistence,
  key: string,
  parse: (raw: string | null) => T,
  fallback: T,
  source: string,
): Promise<T> {
  try {
    const raw = await persistence.getSetting(key);
    return parse(raw);
  } catch (err) {
    console.warn(`[${source}] safePersistenceRead(${key}) failed:`, err);
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// Preferences keys (settings + event seed — NOT saves)
// ---------------------------------------------------------------------------

/**
 * Namespaced Preferences keys (M_SEC.33). Every Capacitor Preferences
 * read/write goes through this enum so keys can never collide with
 * other apps' Preferences storage (Android shares the Preferences API
 * across the entire process; an embedded WebView in a different host
 * would leak into the same namespace without an app-specific prefix).
 *
 * The single typed enum is also the catalogue: a new pref means
 * adding ONE row here + getting compile-time enforcement at every
 * read/write site.
 */
export const PREF_KEYS = {
  eventSeed: 'aethelgard.eventPrngSeed',
  muted: 'aethelgard.muted',
  onboarding: 'aethelgard.onboardingSeen',
} as const;
export type PrefKey = (typeof PREF_KEYS)[keyof typeof PREF_KEYS];

/** The Preferences key under which the device-level event PRNG seed is stored. */
const EVENT_SEED_KEY: PrefKey = PREF_KEYS.eventSeed;

// ---------------------------------------------------------------------------
// SQLite helpers
// ---------------------------------------------------------------------------

const DB_NAME = 'aethelgard';
const DB_VERSION = 1;

function isWebPlatform(): boolean {
  return Capacitor.getPlatform() === 'web';
}

function getBaseAssetPath(): string {
  const base = (import.meta.env.BASE_URL as string | undefined) ?? '/';
  return `${base.endsWith('/') ? base : `${base}/`}assets`;
}

/**
 * Inject the `<jeep-sqlite>` custom element needed by sql.js on web.
 * No-ops on native platforms or in non-browser environments.
 */
async function ensureJeepSqliteElement(): Promise<void> {
  if (!isWebPlatform() || typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const { defineCustomElements } = await import('jeep-sqlite/loader');
  await defineCustomElements(window);

  let jeepEl = document.querySelector('jeep-sqlite');
  if (!jeepEl) {
    jeepEl = document.createElement('jeep-sqlite');
    const wasmPath = getBaseAssetPath();
    jeepEl.setAttribute('wasmpath', wasmPath);
    document.body.appendChild(jeepEl);
  }

  // Wait for the custom element to be fully registered before using it.
  // Without this, the capacitor-sqlite connection can race against the
  // element's internal WASM initialization and produce transaction errors.
  await customElements.whenDefined('jeep-sqlite');
}

/** Map a raw sqlite row (typed `any` by the driver) to a SaveRecord. */
// biome-ignore lint/suspicious/noExplicitAny: capacitor-sqlite values are untyped
function rowToSaveRecord(row: any): SaveRecord {
  return {
    id: row.id as number,
    name: row.name as string,
    seedPhrase: row.seed as string,
    savedAt: row.saved_at as string,
    snapshot: JSON.parse(row.snapshot as string) as GameSnapshot,
  };
}

// Module-level singletons — all null until the first openDb() call.
let sqliteManager: SQLiteConnection | null = null;
let sqliteDb: SQLiteDBConnection | null = null;
let openPromise: Promise<SQLiteDBConnection | null> | null = null;
/** Set to true if we've detected the DB cannot open (e.g. WASM unavailable in test env). */
let dbUnavailable = false;

/**
 * Open (or reuse) the app database and ensure the schema exists.
 * Returns null (and sets dbUnavailable) if the DB cannot be opened.
 * Idempotent — concurrent callers share a single open sequence.
 */
async function openDb(): Promise<SQLiteDBConnection | null> {
  // In the vitest browser environment the sql.js WASM cannot initialise
  // (headless Chromium WebAssembly threading restrictions). Skip the DB
  // entirely so browser tests that render App don't throw unhandled rejections.
  if (import.meta.env.VITEST) {
    dbUnavailable = true;
    return null;
  }

  if (dbUnavailable) return null;
  if (sqliteDb) return sqliteDb;
  if (openPromise) return openPromise;

  openPromise = (async () => {
    try {
      await ensureJeepSqliteElement();

      if (!sqliteManager) {
        sqliteManager = new SQLiteConnection(CapacitorSQLite);
      }

      if (isWebPlatform()) {
        await sqliteManager.initWebStore();
      }

      const isConnected = (await sqliteManager.isConnection(DB_NAME, false)).result;
      const conn = isConnected
        ? await sqliteManager.retrieveConnection(DB_NAME, false)
        : await sqliteManager.createConnection(DB_NAME, false, 'no-encryption', DB_VERSION, false);

      await conn.open();

      await conn.execute(`
        CREATE TABLE IF NOT EXISTS saves (
          id       INTEGER PRIMARY KEY AUTOINCREMENT,
          name     TEXT    NOT NULL,
          seed     TEXT    NOT NULL,
          saved_at TEXT    NOT NULL,
          snapshot TEXT    NOT NULL
        );
      `);

      sqliteDb = conn;
      return conn;
    } catch (err) {
      // DB is not available in this environment (e.g. WASM fails in headless
      // Chromium during browser tests). Mark as unavailable so callers get
      // graceful no-op behaviour rather than an unhandled rejection.
      dbUnavailable = true;
      sqliteManager = null;
      console.warn('[persistence] SQLite unavailable, saves disabled:', err);
      return null;
    }
  })();

  try {
    return await openPromise;
  } finally {
    openPromise = null;
  }
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/** Create the persistence facade. Synchronous — no I/O at construction time. */
export function createPersistence(): Persistence {
  return {
    async save(name: string, game: GameState): Promise<void> {
      const db = await openDb();
      if (!db) return;
      // M_SEC.12 — cap the save name at 256 chars. UI doesn't expose
      // longer names today, but a future cloud-sync feature could
      // receive arbitrarily-long input; truncate at the storage layer.
      const safeName = name.length > 256 ? name.slice(0, 256) : name;
      const seed = game.seedPhrase;
      const savedAt = new Date().toISOString();
      const snapshot = JSON.stringify(serializeGame(game));
      // M_SEC.26 — UPSERT by name: a save with the same name replaces
      // the prior row, idempotently. Specifically defends against
      // React StrictMode double-firing effects in dev that would
      // otherwise insert duplicate AutoSave rows on every effect
      // remount. The DELETE+INSERT pattern stays atomic-enough within
      // sql.js's single-threaded execution.
      await db.run(`DELETE FROM saves WHERE name = ?;`, [safeName]);
      await db.run(`INSERT INTO saves (name, seed, saved_at, snapshot) VALUES (?, ?, ?, ?);`, [
        safeName,
        seed,
        savedAt,
        snapshot,
      ]);
    },

    async load(id: number): Promise<SaveRecord | null> {
      const db = await openDb();
      if (!db) return null;
      const result = await db.query(`SELECT * FROM saves WHERE id = ?;`, [id]);
      const rows = result.values ?? [];
      const row = rows[0];
      if (!row) return null;
      // M_SEC.22 — differentiate "no row found" from "corrupt row".
      // Returning null for both masks corruption; throw so the UI's
      // resume path can show "save corrupted" instead of silently
      // dropping the user into a new game.
      try {
        return rowToSaveRecord(row);
      } catch (err) {
        throw new CorruptSaveError(id, err instanceof Error ? err.message : String(err));
      }
    },

    async list(): Promise<SaveRecord[]> {
      const db = await openDb();
      if (!db) return [];
      // M_SEC.13 — cap at 50 most-recent saves. A million-save corrupted
      // db would otherwise pull every row into memory just for the list
      // view, hanging the UI thread on a slow device.
      const result = await db.query(
        `SELECT * FROM saves ORDER BY saved_at DESC LIMIT 50;`,
      );
      const rows = result.values ?? [];
      const records: SaveRecord[] = [];
      for (const row of rows) {
        try {
          records.push(rowToSaveRecord(row));
        } catch (err) {
          // M_SEC.21 — skip corrupt row rather than failing the whole
          // list, but LOG it so a developer notices in a debug build.
          const id = (row as { id?: unknown }).id;
          console.warn(
            `[persistence] skipping corrupt save row${typeof id === 'number' ? ` id=${id}` : ''}:`,
            err,
          );
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
      // M_SEC.14 — validate the stored seed shape before trusting it.
      // A tampered Preferences value (rooted device, debugger write)
      // could carry arbitrary content; the seed is consumed by
      // seedrandom which accepts anything, but the rest of the
      // codebase passes it through string-concat keys
      // (`${seed}:sawdust`) so a control-character seed would NaN-
      // poison the PRNG-keyed material. Whitelist alnum + hyphen,
      // 1–256 chars; mint a fresh one if invalid.
      if (value !== null && /^[a-z0-9-]{1,256}$/i.test(value)) return value;
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
