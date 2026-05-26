/**
 * M_V11.CAMPS.LOOT — loot pickup sweep.
 *
 * Walks every LootCache + HexPosition entity. For each, scans for a
 * NON-barbarian-camp Unit standing on the same tile. The first match
 * (deterministic iteration order — koota world.query) collects:
 *   - the cache's wood/stone/gold is added to that unit's faction
 *     economy (game.economy.player or .enemy)
 *   - the cache entity is destroyed
 *
 * Caches for which no eligible unit is on-tile this tick stay put
 * for the next sweep. Cheap O(caches × units_on_tile) — pre-indexed
 * by tile-key to make the inner lookup O(1).
 */
import {
  FactionTrait,
  HexPosition,
  LootCache,
  Unit,
} from '@/ecs/components';
import type { GameState } from '@/game/game-state';

export function lootPickupSystem(game: GameState): void {
  // Pre-index units by tile-key so each cache's lookup is O(1) instead
  // of O(units). Buckets contain (entity, faction-string) so we can
  // short-circuit per-unit faction check during the cache pass.
  const byTile = new Map<string, Array<{ faction: string }>>();
  for (const e of game.world.query(Unit, FactionTrait, HexPosition)) {
    const fac = e.get(FactionTrait)?.faction as unknown as string | undefined;
    if (!fac || fac.startsWith('barbarian-camp-')) continue;
    const hex = e.get(HexPosition);
    if (!hex) continue;
    const key = `${hex.q},${hex.r}`;
    let bucket = byTile.get(key);
    if (!bucket) {
      bucket = [];
      byTile.set(key, bucket);
    }
    bucket.push({ faction: fac });
  }
  if (byTile.size === 0) return;

  for (const cache of game.world.query(LootCache, HexPosition)) {
    const hex = cache.get(HexPosition);
    if (!hex) continue;
    const bucket = byTile.get(`${hex.q},${hex.r}`);
    if (!bucket || bucket.length === 0) continue;
    const collector = bucket[0];
    if (!collector) continue;
    const loot = cache.get(LootCache);
    if (!loot) {
      cache.destroy();
      continue;
    }
    // Only player + enemy have an economy slot; other player factions
    // (player-3 etc) would need an extended economy registry —
    // skip them for now so loot doesn't silently vanish.
    if (collector.faction === 'player' || collector.faction === 'enemy') {
      const eco = game.economy[collector.faction];
      eco.wood += loot.wood;
      eco.stone += loot.stone;
      eco.gold += loot.gold;
    }
    cache.destroy();
  }
}
