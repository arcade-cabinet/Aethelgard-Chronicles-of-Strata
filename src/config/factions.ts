/**
 * M_PIVOT.N-PLAYER.FACTIONS — faction registry types + helpers.
 *
 * The v0.4 codebase used `type Faction = 'player' | 'enemy'` (a closed
 * literal union). v0.5 pivots to an OPEN string id (`type FactionId =
 * string`) so the game scales 1..N players + barbarian camps. The
 * legacy ids `'player'` and `'enemy'` remain valid FactionIds and the
 * 2-faction case is preserved byte-identical — a v0.4 save loads and
 * replays exactly the same.
 *
 * Use cases this registry covers (the enumeration step):
 *   1. Type narrowing at component boundaries — `FactionTrait.faction`
 *      carries a FactionId; queries filter by it.
 *   2. Record keys — `GameEconomy[id]`, `zones[id]`, `aiPlayers[id]`.
 *   3. Iteration — `for (const f of game.factions)` replaces the
 *      compile-time `for (const f of FACTIONS)` constant.
 *   4. Save migration — `'player'` slot 0, `'enemy'` slot 1.
 *   5. Color + archetype lookup — every renderer reads the
 *      faction's color from this registry, not from a hardcoded
 *      `#3b82f6` / `#ef4444` pair.
 *
 * Future barbarian camps (M_PIVOT.BARBARIAN-CAMPS) get faction ids
 * `barbarian-camp-1`, `barbarian-camp-2`, ...; each camp = one faction
 * config so a camp's units inherit one banner color via `FactionTrait`.
 */

/**
 * An open-ended faction identifier. Legacy values `'player'` and
 * `'enemy'` are preserved for backward compatibility with v0.4 saves.
 * New factions use slug-style ids: `player-1`, `ai-2`, `barbarian-camp-3`.
 */
export type FactionId = string;

/** Faction kind — drives spawning + AI assignment + UI affordances. */
export type FactionKind = 'human' | 'ai' | 'barbarian';

/**
 * Faction visual + behavioural archetype. The CONTRACT (supply/military
 * role, build cost, HP) is shared across archetypes; the MESH + SFX +
 * particle palette varies. M_PIVOT.ARCHETYPES will wire mesh swaps off
 * this enum. v0.5 substrate ships the enum + `medieval` default so
 * later commits land without a Faction migration.
 */
export type FactionArchetype = 'medieval' | 'orc' | 'undead' | 'mystic';

/**
 * Per-faction configuration. Every faction in a match carries one of
 * these; the registry lives on `GameState.factions` and `NewGameConfig
 * .factions` (the latter optional — defaults backfilled to the legacy
 * 2-faction shape).
 */
export interface FactionConfig {
  /** Stable string identifier — see `FactionId`. */
  id: FactionId;
  /** Human-readable display name (HUD chip, banner, etc). */
  displayName: string;
  /** Kind controls input + AI wiring. */
  kind: FactionKind;
  /** CSS hex color for ZoneBorder, building rings, HUD chips, minimap. */
  color: string;
  /** Visual archetype — drives mesh + SFX swaps (see FactionArchetype). */
  archetype: FactionArchetype;
  /** AI personality key when `kind === 'ai'` (e.g. `'the-builder'`). */
  personality?: string;
}

/**
 * The legacy two-faction config — preserved so existing tests, the
 * NewGameModal, and v0.4 saves all behave identically. Any new code
 * that needs the default 1v1 setup should clone this constant.
 *
 * Color picks: blue (player) + red (enemy) — the historical values
 * baked into ZoneBorder / banner styling. M_PIVOT.RENDER.COLOR-OUTLINE
 * will lift the hardcoded uses into faction.color reads.
 */
export const LEGACY_FACTIONS: readonly FactionConfig[] = [
  {
    id: 'player',
    displayName: 'Player',
    kind: 'human',
    color: '#3b82f6', // blue-500 — historical player color
    archetype: 'medieval',
  },
  {
    id: 'enemy',
    displayName: 'Enemy',
    kind: 'ai',
    color: '#ef4444', // red-500 — historical enemy color
    archetype: 'medieval',
    personality: 'the-diplomat',
  },
] as const;

/**
 * Return the ids of the supplied registry — the runtime equivalent of
 * the v0.4 `FACTIONS: readonly Faction[]` constant. Per-tick iteration
 * loops use this to walk every faction without caring about count.
 */
export function factionIds(registry: readonly FactionConfig[]): FactionId[] {
  return registry.map((f) => f.id);
}

/**
 * Look up a faction by id; throws if the id is unknown. Use when the
 * lookup is structurally guaranteed to succeed (e.g. iterating
 * `factionIds()` and reading config); use `findFaction` otherwise.
 */
export function getFaction(registry: readonly FactionConfig[], id: FactionId): FactionConfig {
  const f = registry.find((x) => x.id === id);
  if (!f) {
    throw new Error(
      `[factions] unknown faction id "${id}" — known: ${registry.map((x) => x.id).join(', ')}`,
    );
  }
  return f;
}

/**
 * Best-effort lookup — returns undefined when the id is not in the
 * registry. Used by snapshot-restore + UI code that has to handle
 * cross-version saves gracefully.
 */
export function findFaction(
  registry: readonly FactionConfig[],
  id: FactionId,
): FactionConfig | undefined {
  return registry.find((x) => x.id === id);
}

/**
 * M_PIVOT.MODES.4X — build an N-faction default registry.
 *
 * The first two slots reuse the legacy `'player'` and `'enemy'` ids
 * (so v0.4 save migration and the existing economy/zones/aiPlayers
 * Record<Faction, X> wiring keep working). Slots 3..N use slug ids
 * `player-3`, `player-4`, ... — all human-controlled by default; the
 * UI may flip individual slots to `kind: 'ai'`.
 *
 * Colors come from the same defaultFactionColors() shuffle the
 * NewGameModal uses so the picker default + the runtime registry
 * agree at start-of-match. Pass a seed-derived color array in via the
 * `colors` arg to keep this module dep-free of `faction-palette.ts`.
 *
 * @param count   - How many player factions (>= 1).
 * @param colors  - Array of CSS hex colors (one per slot). Caller is
 *                  responsible for sourcing them — typically via
 *                  defaultFactionColors(count, seedPhrase).
 */
export function buildDefaultFactions(count: number, colors: readonly string[]): FactionConfig[] {
  const n = Math.max(1, count);
  const out: FactionConfig[] = [];
  for (let i = 0; i < n; i++) {
    const color =
      colors[i] ?? `#${(((i + 1) * 0x357bd9) & 0xffffff).toString(16).padStart(6, '0')}`;
    if (i === 0) {
      out.push({
        id: 'player',
        displayName: 'Player',
        kind: 'human',
        color,
        archetype: 'medieval',
      });
    } else if (i === 1) {
      out.push({
        id: 'enemy',
        displayName: 'Player 2',
        kind: 'ai',
        color,
        archetype: 'medieval',
        personality: 'the-diplomat',
      });
    } else {
      out.push({
        id: `player-${i + 1}`,
        displayName: `Player ${i + 1}`,
        kind: 'ai',
        color,
        archetype: 'medieval',
        personality: 'the-diplomat',
      });
    }
  }
  return out;
}
