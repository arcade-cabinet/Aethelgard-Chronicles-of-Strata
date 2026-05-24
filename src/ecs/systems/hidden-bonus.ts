/**
 * M_EXPANSION.F.97 — discoverable tile bonus consumer.
 *
 * Walks every player-faction Unit each tick and checks if its
 * current HexPosition tile has a hiddenBonus. On hit, credits the
 * player economy with the bonus amount + clears the tile slot so
 * subsequent passes are no-ops. Returns the list of triggered
 * bonuses so a future FX consumer (CombatText-like "+25 Wood
 * Discovered!") can render them.
 */
import type { World } from 'koota';
import type { BoardData } from '@/core/board';
import { getHexKey } from '@/core/hex';
import { FactionTrait, HexPosition, Unit } from '@/ecs/components';
import { addResource, type GameEconomy } from '@/game/economy';

/** A bonus triggered this tick (for future FX hookup). */
export interface DiscoveredBonus {
  /** Tile key the bonus was hiding on. */
  tileKey: string;
  /** Resource type credited. */
  type: 'wood' | 'stone' | 'gold';
  /** Amount credited. */
  amount: number;
}

export function hiddenBonusSystem(
  world: World,
  board: BoardData,
  playerEconomy: GameEconomy,
): DiscoveredBonus[] {
  const triggered: DiscoveredBonus[] = [];
  for (const e of world.query(Unit, HexPosition, FactionTrait)) {
    if (e.get(FactionTrait)?.faction !== 'player') continue;
    const hex = e.get(HexPosition);
    if (!hex) continue;
    const key = getHexKey(hex.q, hex.r);
    const tile = board.tiles.get(key);
    if (!tile?.hiddenBonus) continue;
    const bonus = tile.hiddenBonus;
    addResource(playerEconomy, bonus.type, bonus.amount);
    tile.hiddenBonus = null;
    triggered.push({ tileKey: key, type: bonus.type, amount: bonus.amount });
  }
  return triggered;
}
