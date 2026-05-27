/**
 * M_V11.UNITS-EXPANSION (#77d runtime wire-up) — Diplomat contact
 * trigger.
 *
 * When a Diplomat unit walks into a tile that belongs to a foreign
 * faction's zone, establish hasHadContact between the Diplomat's
 * faction and the zone owner. This is the physical version of the
 * abstraction Embassy auto-fires at completion (#77e); a Diplomat
 * gets you contact ON DEMAND without needing to build the structure.
 *
 * Idempotent: setRelation only creates the row once.
 */
import { FactionTrait, HexPosition, Unit } from '@/ecs/components';
import { getHexKey } from '@/core/hex';
import { setRelation } from '@/game/diplomacy';
import { hasHadContact } from '@/game/diplomacy-tribute';
import type { GameState } from '@/game/game-state';

export function diplomatContactSystem(game: GameState): void {
  const now = game.clock.elapsed;
  for (const e of game.world.query(Unit, FactionTrait, HexPosition)) {
    if (e.get(Unit)?.unitType !== 'Diplomat') continue;
    const faction = e.get(FactionTrait)?.faction;
    if (!faction) continue;
    const hex = e.get(HexPosition);
    if (!hex) continue;
    const tileKey = getHexKey(hex.q, hex.r);
    // Find every other faction whose zone holds this tile.
    for (const fc of game.factions) {
      if (fc.id === faction) continue;
      const zone = game.zones[fc.id as 'enemy'];
      if (!zone?.controlled.has(tileKey)) continue;
      if (hasHadContact(game.diplomacy, faction, fc.id)) continue;
      // Mint an 'ally' relation row (the placeholder for has-met;
      // the diplomacy modal lets the player change it).
      setRelation(game.diplomacy, faction, fc.id, 'ally', now, null, now + 300);
    }
  }
}
