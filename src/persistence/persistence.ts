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
  // M_V12.PERSIST.LOREBOOK-EXPAND — rich-card fields per PRD-v0.12
  // §4. All optional so v0.11 saves continue rendering gracefully;
  // the lorebook UI treats `undefined` as "data not captured this
  // match" and falls back to the v0.11 layout.
  /** Tile count the player controlled at match start. */
  startingRealmSize?: number;
  /** Tile count the player controlled at match end. */
  finalRealmSize?: number;
  /** Diplomatic state at match end. */
  diplomaticState?: { allies: number; enemies: number; vassals: number };
  /** Peak military unit count across the match. */
  peakMilitaryCount?: number;
  /** Biggest single-tick damage dealt to an enemy (any combatant). */
  biggestCombatExchange?: number;
  /** Hero deaths with timestamp + killer (empty when no heroes spawned). */
  heroDeaths?: Array<{ atSimSeconds: number; killer: string | null }>;
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
  /**
   * M_V11.META-PROGRESSION — return the set of permanently-unlocked
   * meta-unlock ids (from the install-wide `meta_unlocks` table). Used
   * by the AtelierScreen to render locked vs unlocked rows + by
   * startGame to apply the starter-bonus unlocks.
   */
  listMetaUnlocks(): Promise<string[]>;
  /** Mark a meta-unlock as permanently unlocked. Idempotent — re-unlock
   *  is a no-op. */
  unlockMeta(id: string, costSpent: number): Promise<void>;
  /** Return the player's current lore-token balance. */
  getLoreTokens(): Promise<number>;
  /** Credit `n` lore tokens to the player. Called from the match-end
   *  flow per loreTokenReward(). */
  earnLoreTokens(n: number): Promise<void>;
  /**
   * M_V11.DAILY-CHALLENGE (#77i) — append a daily-challenge run
   * to the install-wide leaderboard. Idempotent on the (dateUTC,
   * endedAtIso) pair so a repeat write doesn't double-list.
   */
  recordDailyChallengeScore(score: {
    dateUTC: string;
    seedPhrase: string;
    outcome: 'win' | 'loss' | 'draw';
    simSeconds: number;
    score: number;
    endedAtIso: string;
  }): Promise<void>;
  /** List leaderboard rows for `dateUTC`; newest first. */
  listDailyChallengeScores(dateUTC: string): Promise<
    Array<{
      dateUTC: string;
      seedPhrase: string;
      outcome: 'win' | 'loss' | 'draw';
      simSeconds: number;
      score: number;
      endedAtIso: string;
    }>
  >;
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
  // M_HUD.SHELL.6 — persisted user theme override ('dark' | 'light' | '').
  // Empty string = follow OS preference.
  theme: 'aethelgard.theme',
  // M_HUD.SHELL.CAMERA.1 — "Auto-focus on selection" toggle. Stored
  // as '1' (default ON) or '0'. When OFF, tap-selecting a unit
  // doesn't move the camera; the M_GAME.BUG.11 auto-focus tween
  // still fires for explicit toast/sidebar invocations.
  cameraAutoFocus: 'aethelgard.camera.autoFocus',
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

/**
 * M_V12.PERSIST.LEADERBOARD-CAP — FNV-1a 32-bit hash over a
 * string, returned as 8 hex chars. NOT cryptographic integrity
 * (32-bit space is offline-brute-forceable); used as
 * obfuscation only. Cloud-sync MUST replace this with
 * HMAC-SHA256 + server-bound key before treating as integrity.
 *
 * Reviewer M4 fix: TextEncoder().encode() iterates UTF-8 bytes
 * rather than UTF-16 code units so non-BMP characters (emoji,
 * future localized strings) hash deterministically across
 * platforms instead of as surrogate pairs.
 */
function fnv1aHexHash(input: string): string {
  let h = 0x811c9dc5;
  const bytes = new TextEncoder().encode(input);
  for (let i = 0; i < bytes.length; i += 1) {
    h ^= bytes[i] ?? 0;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

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

// Coderabbit nit PR #10 05:46Z — single helper for the read+write
// lorebook validation/serialization. Both paths previously duplicated
// the same caps + array-of-string guards, risk of drift if caps move.
const LOREBOOK_HIGHLIGHTS_PER_STRING_CAP = 512;
const LOREBOOK_HIGHLIGHTS_TOTAL_CAP = 4096;

function validateLorebookHighlights(input: unknown, ctx: 'read' | 'write'): string[] {
  if (!Array.isArray(input) || !input.every((s): s is string => typeof s === 'string')) {
    throw new Error(`persistence(${ctx}): lorebook.highlights must be string[]`);
  }
  if (input.some((s) => s.length > LOREBOOK_HIGHLIGHTS_PER_STRING_CAP)) {
    throw new Error(
      `persistence(${ctx}): lorebook.highlights element exceeds ${LOREBOOK_HIGHLIGHTS_PER_STRING_CAP} chars`,
    );
  }
  return input;
}

function serializeLorebookHighlights(input: string[]): string {
  const serialized = JSON.stringify(input);
  if (serialized.length > LOREBOOK_HIGHLIGHTS_TOTAL_CAP) {
    throw new Error(
      `persistence: lorebook.highlights_json too large (${serialized.length} > ${LOREBOOK_HIGHLIGHTS_TOTAL_CAP})`,
    );
  }
  return serialized;
}

// biome-ignore lint/suspicious/noExplicitAny: sql.js returns untyped rows; the validator below narrows.
function rowToLorebookEntry(row: any): LorebookEntry {
  const hl = row.highlights_json as string;
  if (typeof hl !== 'string') {
    throw new Error('persistence: lorebook.highlights_json missing or non-string');
  }
  if (hl.length > LOREBOOK_HIGHLIGHTS_TOTAL_CAP) {
    throw new Error(
      `persistence: lorebook.highlights_json too large (${hl.length} > ${LOREBOOK_HIGHLIGHTS_TOTAL_CAP})`,
    );
  }
  const parsed = validateLorebookHighlights(JSON.parse(hl), 'read');
  // M_V12.PERSIST.LOREBOOK-EXPAND — rich JSON column is optional;
  // null on v0.11 rows. Bad shape (non-JSON / non-object) treated
  // as missing — the lorebook UI falls back to the v0.11 layout.
  let rich: Partial<LorebookEntry> = {};
  const rj = row.rich_json as string | null | undefined;
  // Security review L2: rj.length is UTF-16 code units; convert to
  // UTF-8 byte length to match the write-side TextEncoder cap so
  // the 2 KB budget is symmetric across charset boundaries.
  if (typeof rj === 'string' && rj.length > 0 && new TextEncoder().encode(rj).length <= 2048) {
    try {
      const parsedRich = JSON.parse(rj);
      if (parsedRich && typeof parsedRich === 'object' && !Array.isArray(parsedRich)) {
        // Security review M1: filter prototype-pollution keys
        // before the spread-into-return below. JSON.parse can
        // yield `__proto__` / `constructor` / `prototype` keys
        // from a hostile sqlite write (rooted device / future
        // cloud-sync); deleting them keeps the spread safe.
        const safeRich = parsedRich as Record<string, unknown>;
        delete safeRich['__proto__'];
        delete safeRich['constructor'];
        delete safeRich['prototype'];
        rich = safeRich as Partial<LorebookEntry>;
      }
    } catch {
      /* leave rich = {} on parse error; v0.11-shape fallback. */
    }
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
    ...rich,
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
      // M_V12.PERSIST.LOREBOOK-EXPAND — additive column for the
      // rich-card fields (starting/final realm size, diplomatic
      // state at end, peak military, biggest combat exchange,
      // hero deaths). Stored as a single JSON column so the
      // schema doesn't need a migration per new field. NULL on
      // v0.11 rows; v0.12+ rows write the full object.
      await conn
        .execute(`
        ALTER TABLE lorebook ADD COLUMN rich_json TEXT;
      `)
        .catch((err: unknown) => {
          // Security review L1 + CodeRabbit MAJOR: only swallow
          // "duplicate column" on re-runs; rethrow every other
          // error (disk-full / corrupt DB / permission) so openDb
          // fails fast instead of continuing with partial schema
          // that would defer the failure into later writes.
          const msg = err instanceof Error ? err.message : String(err);
          if (!/duplicate column|already exists/i.test(msg)) {
            console.warn('[persistence] lorebook rich_json migration failed:', err);
            throw err;
          }
        });
      // M_V11.META-PROGRESSION — install-wide meta-unlock ledger.
      // One row per unlocked id; UNIQUE constraint makes the unlock
      // call idempotent. `meta_lore_tokens` is a single-row counter.
      await conn.execute(`
        CREATE TABLE IF NOT EXISTS meta_unlocks (
          unlock_id        TEXT PRIMARY KEY,
          unlocked_at_iso  TEXT NOT NULL,
          cost_spent       INTEGER NOT NULL
        );
      `);
      await conn.execute(`
        CREATE TABLE IF NOT EXISTS meta_lore_tokens (
          id       INTEGER PRIMARY KEY CHECK (id = 1),
          balance  INTEGER NOT NULL DEFAULT 0
        );
      `);
      await conn.execute('INSERT OR IGNORE INTO meta_lore_tokens (id, balance) VALUES (1, 0);');
      // M_V11.DAILY-CHALLENGE (#77i) — leaderboard for the seed-of-
      // the-day. (date_utc, ended_at_iso) is the natural key; INSERT
      // OR IGNORE keeps recordDailyChallengeScore idempotent on
      // re-fire (a save round-trip can replay the event safely).
      await conn.execute(`
        CREATE TABLE IF NOT EXISTS daily_challenge_scores (
          date_utc       TEXT NOT NULL,
          seed_phrase    TEXT NOT NULL,
          outcome        TEXT NOT NULL,
          sim_seconds    REAL NOT NULL,
          score          REAL NOT NULL,
          ended_at_iso   TEXT NOT NULL,
          PRIMARY KEY (date_utc, ended_at_iso)
        );
      `);
      // M_V12.PERSIST.LEADERBOARD-CAP — fingerprint column for
      // tamper obfuscation. NOT cryptographic integrity: the FNV-1a
      // 32-bit space (~4.3B) is offline-brute-forceable and the salt
      // is a per-install PRNG seed (NOT a server-issued key). Cloud-
      // sync MUST replace this with HMAC-SHA256 using a server-bound
      // key before treating fingerprints as integrity proofs.
      // Additive column; v0.11 rows store NULL.
      await conn
        .execute(`
        ALTER TABLE daily_challenge_scores ADD COLUMN fingerprint TEXT;
      `)
        .catch((err: unknown) => {
          // Security review L1 + CodeRabbit MAJOR: only swallow
          // "duplicate column"; rethrow every other migration error
          // so openDb fails fast instead of running with partial
          // schema that would defer the failure into later writes.
          const msg = err instanceof Error ? err.message : String(err);
          if (!/duplicate column|already exists/i.test(msg)) {
            console.warn('[persistence] daily_challenge_scores fingerprint migration failed:', err);
            throw err;
          }
        });

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
      // Coderabbit nit PR #10 05:46Z — read+write paths now share
      // the validate/serialize helpers near rowToLorebookEntry so
      // a caps change moves both at once.
      validateLorebookHighlights(entry.highlights, 'write');
      const serialised = serializeLorebookHighlights(entry.highlights);
      // M_V12.PERSIST.LOREBOOK-EXPAND — pack the rich-card fields
      // into a single JSON column. If the packed JSON exceeds the
      // 2 KB read-side cap we drop the richest fields first (in
      // priority: heroDeaths → biggestCombatExchange →
      // diplomaticState → realm sizes) so the write+read sides
      // stay symmetric. CodeRabbit MINOR fix: previously the
      // comment promised the drop logic but the code wrote all
      // fields unconditionally, risking silent truncation on read.
      const RICH_JSON_BYTE_CAP = 2048;
      const richObj: Record<string, unknown> = {};
      if (entry.startingRealmSize !== undefined)
        richObj.startingRealmSize = entry.startingRealmSize;
      if (entry.finalRealmSize !== undefined) richObj.finalRealmSize = entry.finalRealmSize;
      if (entry.diplomaticState) richObj.diplomaticState = entry.diplomaticState;
      if (entry.peakMilitaryCount !== undefined)
        richObj.peakMilitaryCount = entry.peakMilitaryCount;
      if (entry.biggestCombatExchange !== undefined)
        richObj.biggestCombatExchange = entry.biggestCombatExchange;
      if (entry.heroDeaths) richObj.heroDeaths = entry.heroDeaths;
      // Drop in priority order until the JSON fits the cap.
      const DROP_ORDER = [
        'heroDeaths',
        'biggestCombatExchange',
        'diplomaticState',
        'peakMilitaryCount',
        'finalRealmSize',
        'startingRealmSize',
      ];
      let serializedRich = Object.keys(richObj).length > 0 ? JSON.stringify(richObj) : '';
      for (const field of DROP_ORDER) {
        if (new TextEncoder().encode(serializedRich).length <= RICH_JSON_BYTE_CAP) break;
        delete richObj[field];
        serializedRich = Object.keys(richObj).length > 0 ? JSON.stringify(richObj) : '';
      }
      const richJson = serializedRich.length > 0 ? serializedRich : null;
      const db = await openDb();
      if (!db) return;
      await db.run(
        `INSERT INTO lorebook (ended_at, seed_phrase, nickname, outcome, mode, enemy_personality, highlights_json, rich_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          entry.endedAt,
          entry.seedPhrase,
          entry.nickname,
          entry.outcome,
          entry.mode,
          entry.enemyPersonality,
          serialised,
          richJson,
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
      // Reviewer-fix (CRITICAL #2): use bind params for LIMIT to
      // match the rest of the file's policy. NaN/Infinity collapses
      // to a safe integer in [1, 500] before binding so the cap
      // contract is preserved.
      const safe = Math.floor(limit);
      const cap = Number.isFinite(safe) ? Math.max(1, Math.min(500, safe)) : 50;
      const result = await db.query(`SELECT * FROM lorebook ORDER BY ended_at DESC LIMIT ?;`, [
        cap,
      ]);
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

    // ----- M_V11.META-PROGRESSION -----------------------------------
    async listMetaUnlocks(): Promise<string[]> {
      const db = await openDb();
      if (!db) return [];
      const out: string[] = [];
      try {
        const res = await db.query(
          'SELECT unlock_id FROM meta_unlocks ORDER BY unlocked_at_iso ASC;',
        );
        const rows = (res?.values ?? []) as Array<{ unlock_id?: unknown }>;
        for (const row of rows) {
          const id = row.unlock_id;
          if (typeof id === 'string' && id.length > 0) out.push(id);
        }
      } catch (err) {
        // Tolerant read: a fresh install / failed migration returns
        // an empty list; the caller treats no-unlocks as "nothing
        // unlocked yet" which is the correct fresh-install state.
        console.warn('[persistence] listMetaUnlocks failed:', err);
      }
      return out;
    },

    async unlockMeta(id: string, costSpent: number): Promise<void> {
      const db = await openDb();
      if (!db) return;
      // Security review M3: validate id against the registered
      // META_UNLOCKS_CONFIG keys before INSERT so a tampered call
      // (rooted device / future cloud-sync) can't seed a fabricated
      // id that later drives applyEffect via chain-starter resolution.
      const { META_UNLOCKS_BY_ID } = await import('@/config/progression');
      if (!META_UNLOCKS_BY_ID.has(id)) {
        console.warn('[persistence] unlockMeta rejected unknown id:', id);
        return;
      }
      const safeId = id.length > 128 ? id.slice(0, 128) : id;
      const safeCost = Number.isFinite(costSpent) && costSpent > 0 ? Math.floor(costSpent) : 0;
      const at = new Date().toISOString();
      // INSERT OR IGNORE for idempotency — re-unlock a row that
      // already exists is a no-op (the original unlock-time stays).
      await db.run(
        `INSERT OR IGNORE INTO meta_unlocks (unlock_id, unlocked_at_iso, cost_spent) VALUES (?, ?, ?);`,
        [safeId, at, safeCost],
      );
    },

    async getLoreTokens(): Promise<number> {
      const db = await openDb();
      if (!db) return 0;
      try {
        const res = await db.query('SELECT balance FROM meta_lore_tokens WHERE id = 1;');
        const rows = (res?.values ?? []) as Array<{ balance?: unknown }>;
        const bal = rows[0]?.balance;
        return typeof bal === 'number' && Number.isFinite(bal) ? bal : 0;
      } catch (err) {
        console.warn('[persistence] getLoreTokens failed:', err);
        return 0;
      }
    },

    async earnLoreTokens(n: number): Promise<void> {
      const db = await openDb();
      if (!db) return;
      const safeN = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
      if (safeN === 0) return;
      await db.run(`UPDATE meta_lore_tokens SET balance = balance + ? WHERE id = 1;`, [safeN]);
    },

    // ----- M_V11.DAILY-CHALLENGE (#77i) ------------------------------
    async recordDailyChallengeScore(score): Promise<void> {
      const db = await openDb();
      if (!db) return;
      // M_V12.PERSIST.LEADERBOARD-CAP — fingerprint write. FNV-1a
      // over (dateUTC|seedPhrase|outcome|simSeconds|score|endedAt)
      // mixed with a per-install salt (the event-PRNG seed, which
      // every install has and which never leaves the device).
      // Cheap, deterministic, no crypto dependency. Sufficient
      // tamper-detection for an install-local leaderboard; cloud-
      // sync can verify by recomputing with the same salt
      // (transmitted out-of-band once at sync time).
      const salt = (await Preferences.get({ key: PREF_KEYS.eventSeed })).value ?? '';
      const fingerprint = fnv1aHexHash(
        `${score.dateUTC}|${score.seedPhrase}|${score.outcome}|${score.simSeconds}|${score.score}|${score.endedAtIso}|${salt}`,
      );
      await db.run(
        `INSERT OR IGNORE INTO daily_challenge_scores
           (date_utc, seed_phrase, outcome, sim_seconds, score, ended_at_iso, fingerprint)
         VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [
          score.dateUTC,
          score.seedPhrase,
          score.outcome,
          score.simSeconds,
          score.score,
          score.endedAtIso,
          fingerprint,
        ],
      );
    },

    async listDailyChallengeScores(dateUTC: string): Promise<
      Array<{
        dateUTC: string;
        seedPhrase: string;
        outcome: 'win' | 'loss' | 'draw';
        simSeconds: number;
        score: number;
        endedAtIso: string;
      }>
    > {
      const db = await openDb();
      if (!db) return [];
      try {
        const res = await db.query(
          `SELECT date_utc, seed_phrase, outcome, sim_seconds, score, ended_at_iso
             FROM daily_challenge_scores
             WHERE date_utc = ?
             ORDER BY ended_at_iso DESC;`,
          [dateUTC],
        );
        const rows = (res?.values ?? []) as Array<{
          date_utc?: unknown;
          seed_phrase?: unknown;
          outcome?: unknown;
          sim_seconds?: unknown;
          score?: unknown;
          ended_at_iso?: unknown;
        }>;
        const out: Array<{
          dateUTC: string;
          seedPhrase: string;
          outcome: 'win' | 'loss' | 'draw';
          simSeconds: number;
          score: number;
          endedAtIso: string;
        }> = [];
        for (const r of rows) {
          if (
            typeof r.date_utc !== 'string' ||
            typeof r.seed_phrase !== 'string' ||
            typeof r.outcome !== 'string' ||
            typeof r.sim_seconds !== 'number' ||
            typeof r.score !== 'number' ||
            typeof r.ended_at_iso !== 'string'
          ) {
            continue;
          }
          out.push({
            dateUTC: r.date_utc,
            seedPhrase: r.seed_phrase,
            outcome: r.outcome as 'win' | 'loss' | 'draw',
            simSeconds: r.sim_seconds,
            score: r.score,
            endedAtIso: r.ended_at_iso,
          });
        }
        return out;
      } catch (err) {
        console.warn('[persistence] listDailyChallengeScores failed:', err);
        return [];
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
          // M_V11.META-PROGRESSION — meta unlocks + lore tokens get
          // wiped too. "Reset all data" should genuinely return the
          // player to a fresh-install state (otherwise they'd resume
          // with unlocks bound to a save that no longer exists).
          await db.run(`DELETE FROM meta_unlocks;`);
          await db.run(`UPDATE meta_lore_tokens SET balance = 0 WHERE id = 1;`);
          // M_V11.DAILY-CHALLENGE — wipe the leaderboard too.
          await db.run(`DELETE FROM daily_challenge_scores;`);
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
