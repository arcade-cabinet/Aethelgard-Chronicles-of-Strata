/**
 * M_FUN.FOUNDATION.BRANDED-IDS — nominal-typed string aliases for
 * the three primitive identifiers that flow across the codebase:
 *
 *   - TileKey       — `"q,r"` produced by getHexKey(); used as the
 *                     primary key into Board.tiles and as the
 *                     target of every commands.ts move / build verb.
 *   - EntityId      — `Number(entity)` snapshot of a koota entity id;
 *                     used by EnemyTarget.targetId and the AI vehicle
 *                     map. Distinct from TileKey because they're
 *                     SHAPED differently (number vs `q,r`) and
 *                     CONFUSING them is a real footgun (passing a
 *                     tile key where an entity id was expected
 *                     coerces to NaN).
 *   - FactionKey    — 'player' | 'enemy'. Already narrowed at the
 *                     ECS level via the Faction component union but
 *                     re-branding it here lets us write functions
 *                     that take a FactionKey vs a plain string and
 *                     get a compile error on mistakes.
 *
 * These are TYPE-LEVEL ONLY — no runtime overhead. The branding
 * symbol is never assigned to; a TileKey IS a string at runtime.
 * The compile-time newtype catches `selectEntity(factionKey)`
 * before it ships.
 *
 * Migration policy: NEW code (M_FUN.* and onward) should use these
 * branded aliases at function signatures + ECS trait shapes.
 * EXISTING code can stay on plain string/number until touched by an
 * unrelated change; the goal isn't a flag-day migration but a
 * gradual ratchet that prevents the next regression.
 */

declare const TileKeyBrand: unique symbol;
declare const EntityIdBrand: unique symbol;
declare const FactionKeyBrand: unique symbol;

/** Hex axial key in the canonical `"q,r"` form produced by getHexKey. */
export type TileKey = string & { readonly [TileKeyBrand]: true };

/** Numeric koota entity id (Number(entity)). Carry across system boundaries. */
export type EntityId = number & { readonly [EntityIdBrand]: true };

/** 'player' | 'enemy' as a branded alias for the existing Faction union. */
export type FactionKey = ('player' | 'enemy') & { readonly [FactionKeyBrand]: true };

/**
 * Brand-only cast for an already-validated string. Use at the
 * boundary where a key is FRESHLY produced (getHexKey, parseHexKey
 * result) — never trust raw input from a save file etc.
 */
export function asTileKey(s: string): TileKey {
  return s as TileKey;
}

/** Brand a raw number as an EntityId at the koota Number(entity) boundary. */
export function asEntityId(n: number): EntityId {
  return n as EntityId;
}

/** Brand a raw 'player'|'enemy' string as a FactionKey. */
export function asFactionKey(s: 'player' | 'enemy'): FactionKey {
  return s as FactionKey;
}
