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

/**
 * M_FUN.NAR.LOREBOOK — one match's worth of lore. Independent of
 * save-game rows so deleting a save does NOT erase the memory that
 * the match happened. Each entry is the post-match summary card
 * captured at outcome-flip time, plus the metadata needed to render
 * a list view (faction, mode, when).
 */
export interface LorebookEntry {
  /** Row id (set by DB on insert; 0 when uncommitted in tests). */
  id: number;
  /** ISO timestamp the match ended. */
  endedAt: string;
  /** Map seed phrase the match was played on. */
  seedPhrase: string;
  /** Player-facing match nickname (matchNickname output). */
  nickname: string;
  /** Outcome string ('win' | 'loss' | 'draw'). */
  outcome: string;
  /** Game mode (frontier-raid, age-of-strata, etc). */
  mode: string;
  /** Enemy AI personality key. */
  enemyPersonality: string | null;
  /** Highlight bullets the modal showed (1-3 items). */
  highlights: string[];
}

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
  /**
   * M_FUN.NAR.LOREBOOK — append one match-completion entry to the
   * persistent lorebook. Lorebook is install-wide (not per-save)
   * and accumulates across every finished match — wins, losses,
   * draws. The save-list UI reads this to surface match history
   * even after a save is deleted.
   */
  recordLorebookEntry(entry: LorebookEntry): Promise<void>;
  /**
   * List lorebook entries newest-first, capped at `limit` rows
   * (default 50). Cheap full-text scan — the table only ever
   * holds a few hundred rows even for power-users.
   */
  listLorebook(limit?: number): Promise<LorebookEntry[]>;
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
  /**
   * M_AUDIT2.SEC2.6 — wipe ALL persisted state: every save row + every
   * Preference key (mute, onboarding, event seed). Used by the
   * "Reset all data" settings option (planned UX hook) and exposed
   * for tests that need a clean slate without re-creating the
   * persistence facade. Best-effort: errors on individual rows or
   * keys are logged + swallowed so a partial failure doesn't strand
   * the user.
   */
  reset(): Promise<void>;
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
  // M_EXPANSION.F.77 — comma-separated list of unlocked achievement ids.
  // Stored as a string (Preferences API) for portability; the
  // achievements helper parses + writes.
  achievements: 'aethelgard.achievements',
  // M_SEC.4 — SQLCipher passphrase. Generated once at first DB
  // open from crypto.getRandomValues(64 bytes → base64); persisted
  // via Capacitor Preferences (Keychain on iOS, EncryptedSharedPrefs
  // on Android, localStorage on web). Wiping app data wipes both
  // the saves AND the key, so a reinstall starts fresh.
  dbKey: 'aethelgard.dbKey',
  // M_EXPANSION.U.112 — per-bus volumes (0..1, stored as string of a
  // number). One key per bus so a single corrupt row doesn't reset
  // the whole audio profile.
  volSfx: 'aethelgard.vol.sfx',
  volMusic: 'aethelgard.vol.music',
  volAmbient: 'aethelgard.vol.ambient',
  volUi: 'aethelgard.vol.ui',
  // M_EXPANSION.U.113 — colourblind mode (deuteranopia/protanopia/
  // tritanopia safe palette: player → orange, enemy → cyan).
  colorblind: 'aethelgard.colorblind',
  // M_EXPANSION.U.114 — visible captions for sound events.
  captions: 'aethelgard.captions',
  // M_EXPANSION.U.115 — user-remappable hotkey bindings (JSON blob).
  hotkeyBindings: 'aethelgard.hotkeys',
} as const;
export type PrefKey = (typeof PREF_KEYS)[keyof typeof PREF_KEYS];

/** The Preferences key under which the device-level event PRNG seed is stored. */
const EVENT_SEED_KEY: PrefKey = PREF_KEYS.eventSeed;

// ---------------------------------------------------------------------------
// SQLite helpers
// ---------------------------------------------------------------------------

// M_AUDIT2.SEC2.8 — namespaced DB name. The bare 'aethelgard' name
// collides with any other app sharing the same WebSQL/IDB origin
// (the Capacitor webview can be hijacked by side-loaded sibling
// apps if installed under the same scheme). Prefixing with the
// reverse-domain appId + version suffix makes the namespace
// collision-free AND lets future schema migrations rename to
// `_v2.sqlite` without colliding with the v1 store on the same
// device. Keep the suffix decoupled from DB_VERSION (which drives
// the runtime migration path) so this string never changes once
// chosen.
const DB_NAME = 'com.aethelgard.chronicles_v1';
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

/**
 * Hard cap on snapshot JSON length (M_AUDIT2.SEC2.9). A tampered
 * SQLite row (rooted device, sibling-app sideload, future cloud-save
 * receiving attacker-controlled payload) with a multi-MB JSON blob
 * would pin a worker thread on JSON.parse BEFORE the entity-count
 * cap (M_SEC.11) runs. 2 MB leaves significant headroom for a Huge-
 * map snapshot (typical is ~50-200 KB) while bounding the parse cost.
 */
const MAX_SNAPSHOT_BYTES = 2 * 1024 * 1024;

/** Map a raw sqlite row (typed `any` by the driver) to a SaveRecord. */
// biome-ignore lint/suspicious/noExplicitAny: capacitor-sqlite values are untyped
function rowToSaveRecord(row: any): SaveRecord {
  const snapshotStr = row.snapshot as string;
  if (typeof snapshotStr !== 'string') {
    throw new Error('persistence: snapshot column missing or non-string');
  }
  if (snapshotStr.length > MAX_SNAPSHOT_BYTES) {
    throw new Error(
      `persistence: snapshot too large (${snapshotStr.length} > ${MAX_SNAPSHOT_BYTES} bytes)`,
    );
  }
  return {
    id: row.id as number,
    name: row.name as string,
    seedPhrase: row.seed as string,
    savedAt: row.saved_at as string,
    snapshot: JSON.parse(snapshotStr) as GameSnapshot,
  };
}

// biome-ignore lint/suspicious/noExplicitAny: sql.js returns untyped rows; the validator below narrows.
function rowToLorebookEntry(row: any): LorebookEntry {
  const hl = row.highlights_json as string;
  if (typeof hl !== 'string') {
    throw new Error('persistence: lorebook.highlights_json missing or non-string');
  }
  if (hl.length > 4096) {
    throw new Error(`persistence: lorebook.highlights_json too large (${hl.length} > 4096)`);
  }
  const parsed: unknown = JSON.parse(hl);
  if (!Array.isArray(parsed) || !parsed.every((s): s is string => typeof s === 'string')) {
    throw new Error('persistence: lorebook.highlights_json is not string[]');
  }
  return {
    id: row.id as number,
    endedAt: row.ended_at as string,
    seedPhrase: row.seed_phrase as string,
    nickname: row.nickname as string,
    outcome: row.outcome as string,
    mode: row.mode as string,
    enemyPersonality: (row.enemy_personality as string | null) ?? null,
    highlights: parsed,
  };
}

/**
 * M_SEC.4 — read or mint the per-install SQLCipher passphrase.
 * Stored under PREF_KEYS.dbKey via Capacitor Preferences — Keychain
 * on iOS, EncryptedSharedPrefs on Android, plain localStorage on
 * web (where the SQLCipher path is a no-op anyway). The minted
 * value is 64 random bytes base64-encoded → 88 ASCII chars, well
 * inside SQLCipher's accepted passphrase length.
 *
 * Wiping app data wipes both the saves AND the key, so a reinstall
 * starts fresh (no orphaned encrypted blobs in user data).
 */
/**
 * M_SEC_REVIEW.1 — hard-fail if WebCrypto isn't available OR
 * Preferences fails. The prior fallbacks (Math.random() for key
 * bytes; `session-${Math.random()}-${Date.now()}` on Preferences
 * failure) produced cryptographically-weak passphrases that an
 * attacker could enumerate. Crypto unavailability is a hard init
 * failure — the caller catches the throw, marks `dbUnavailable`,
 * and saves degrade gracefully to a no-op. Better no saves than
 * weak-encrypted saves.
 */
async function ensureDbSecret(): Promise<string> {
  if (typeof crypto === 'undefined' || typeof crypto.getRandomValues !== 'function') {
    throw new Error('ensureDbSecret: WebCrypto unavailable; cannot generate secure DB passphrase');
  }
  const existing = await Preferences.get({ key: PREF_KEYS.dbKey });
  if (existing.value && existing.value.length >= 32) return existing.value;
  const bytes = new Uint8Array(64);
  crypto.getRandomValues(bytes);
  const secret = btoa(String.fromCharCode(...bytes));
  await Preferences.set({ key: PREF_KEYS.dbKey, value: secret });
  return secret;
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

      // M_SEC.4 — encryption mode + per-install key. On native
      // (iOS/Android) this binds to SQLCipher with the secret stored
      // in Keychain/EncryptedSharedPrefs via Capacitor Preferences.
      // On web the encryption-mode arg is ignored by the sql.js
      // fallback, so the call still works — saves are unencrypted on
      // web but the bootstrap is the same and a future SQLCipher.wasm
      // adoption would pick up the key automatically.
      const encryptionMode = isWebPlatform() ? 'no-encryption' : 'encryption';
      const secret = encryptionMode === 'encryption' ? await ensureDbSecret() : null;
      // setEncryptionSecret only matters when the DB is being created
      // fresh; if already keyed (from a prior install/run), the
      // openWithKey call below uses the stored secret to unlock.
      if (secret && sqliteManager.setEncryptionSecret) {
        try {
          await sqliteManager.setEncryptionSecret(secret);
        } catch {
          // setEncryptionSecret throws on web / unsupported platforms;
          // swallow and let createConnection fall back to plaintext.
        }
      }
      const isConnected = (await sqliteManager.isConnection(DB_NAME, false)).result;
      const conn = isConnected
        ? await sqliteManager.retrieveConnection(DB_NAME, false)
        : await sqliteManager.createConnection(
            DB_NAME,
            encryptionMode === 'encryption',
            encryptionMode,
            DB_VERSION,
            false,
          );

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
      // M_FUN.NAR.LOREBOOK — match-completion history. Append-only;
      // never UPSERT (one row per completed match). Stored as JSON
      // (highlights is a string array) to avoid a side table.
      await conn.execute(`
        CREATE TABLE IF NOT EXISTS lorebook (
          id                INTEGER PRIMARY KEY AUTOINCREMENT,
          ended_at          TEXT NOT NULL,
          seed_phrase       TEXT NOT NULL,
          nickname          TEXT NOT NULL,
          outcome           TEXT NOT NULL,
          mode              TEXT NOT NULL,
          enemy_personality TEXT,
          highlights_json   TEXT NOT NULL
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
      // M_AUDIT2.SEC2.7 — saves table row cap. A long-running auto-
      // save loop could otherwise grow unbounded; once we exceed
      // MAX_SAVES, delete the oldest rows by saved_at. AutoSave
      // already UPSERTs by name so it doesn't contribute multiple
      // rows, but a user spamming "save with new name" or a future
      // bug could.
      const MAX_SAVES = 100;
      await db.run(
        `DELETE FROM saves WHERE id IN (
           SELECT id FROM saves ORDER BY saved_at DESC LIMIT -1 OFFSET ?
         );`,
        [MAX_SAVES],
      );
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
      const result = await db.query(`SELECT * FROM saves ORDER BY saved_at DESC LIMIT 50;`);
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

    async recordLorebookEntry(entry: LorebookEntry): Promise<void> {
      const db = await openDb();
      if (!db) return;
      await db.run(
        `INSERT INTO lorebook (ended_at, seed_phrase, nickname, outcome, mode, enemy_personality, highlights_json)
           VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [
          entry.endedAt,
          entry.seedPhrase,
          entry.nickname,
          entry.outcome,
          entry.mode,
          entry.enemyPersonality,
          JSON.stringify(entry.highlights),
        ],
      );
      // Cap at LOREBOOK_MAX rows — newest-first; pruning by ended_at
      // matches the read order so the user only ever loses old
      // matches, never their most recent ones.
      const LOREBOOK_MAX = 500;
      await db.run(
        `DELETE FROM lorebook WHERE id IN (
           SELECT id FROM lorebook ORDER BY ended_at DESC LIMIT -1 OFFSET ?
         );`,
        [LOREBOOK_MAX],
      );
    },

    async listLorebook(limit = 50): Promise<LorebookEntry[]> {
      const db = await openDb();
      if (!db) return [];
      const cap = Math.max(1, Math.min(500, Math.floor(limit)));
      const result = await db.query(
        `SELECT * FROM lorebook ORDER BY ended_at DESC LIMIT ${cap};`,
      );
      const rows = result.values ?? [];
      const out: LorebookEntry[] = [];
      for (const row of rows) {
        try {
          out.push(rowToLorebookEntry(row));
        } catch (err) {
          const id = (row as { id?: unknown }).id;
          console.warn(
            `[persistence] skipping corrupt lorebook row${typeof id === 'number' ? ` id=${id}` : ''}:`,
            err,
          );
        }
      }
      return out;
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

    async reset(): Promise<void> {
      // M_AUDIT2.SEC2.6 — wipe ALL persisted state. Reviewer-fix
      // (post-commit): collect per-step failures and rethrow at the
      // end so the caller sees a useful error. The previous swallow-
      // and-log silently corrupted PRNG continuity: saves could
      // survive while the event seed was deleted, regenerating to a
      // mismatched stream on next launch.
      const failures: string[] = [];
      try {
        const db = await openDb();
        if (db) {
          await db.run(`DELETE FROM saves;`);
          // M_FUN.NAR.LOREBOOK — reset wipes match history too. The
          // intent of "reset all data" is a clean slate; carrying
          // lorebook entries forward would surface ghost matches
          // referring to deleted saves.
          await db.run(`DELETE FROM lorebook;`);
        } else failures.push('saves (db unavailable)');
      } catch (err) {
        failures.push(`saves: ${err instanceof Error ? err.message : String(err)}`);
      }
      for (const key of Object.values(PREF_KEYS)) {
        try {
          await Preferences.remove({ key });
        } catch (err) {
          failures.push(`pref:${key} ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      if (failures.length > 0) {
        throw new Error(`[persistence] reset partial failure: ${failures.join('; ')}`);
      }
    },
  };
}
