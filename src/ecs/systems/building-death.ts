import type { World } from 'koota';
import { emitUiSound } from '@/audio/ui-sound-emitter';
import type { BoardData } from '@/core/board';
import { getHexKey } from '@/core/hex';
import { buildNavGraph, type NavGraph } from '@/core/pathfinding';
import { Building, FactionBase, Health, HexPosition } from '@/ecs/components';
import type { GameState } from '@/game/game-state';

/**
 * Building destruction system (M_GAMEPLAY.6). A `Building` entity at 0 HP is
 * removed: the tile it sat on becomes walkable again, the nav graph rebuilds
 * so units can path through, and the build-site map is updated. Faction-
 * symmetric: either side's buildings destruct the same way.
 *
 * The Town Hall / enemy base (`FactionBase`) is exempt — its destruction is
 * the WIN/LOSS condition, scored by evaluateWinLoss; removing it from the
 * world would lose the loss signal. They stay as 0-HP entities; the game
 * ends instead.
 *
 * Returns a new NavGraph when at least one building was destroyed (so
 * callers update `game.navGraph`); returns null on no-op tick.
 */
export function buildingDeathSystem(
  world: World,
  buildSites: GameState['buildSites'],
  board: BoardData,
): NavGraph | null {
  let anyRemoved = false;
  for (const e of world.query(Building, Health, HexPosition)) {
    const hp = e.get(Health);
    if (!hp || hp.current > 0) continue;
    // FactionBase entities are the win/loss anchors — keep them, end-state
    // handling is up to evaluateWinLoss.
    if (e.has(FactionBase)) continue;
    const hex = e.get(HexPosition);
    if (!hex) continue;
    const key = getHexKey(hex.q, hex.r);
    // restore tile walkability so units can path through the rubble
    const tile = board.tiles.get(key);
    if (tile) tile.walkable = true;
    buildSites.delete(key);
    e.destroy();
    anyRemoved = true;
    // M_AUDIO.1 — punchy "rubble" cue on every destruction (either side)
    emitUiSound('building-destroyed');
  }
  return anyRemoved ? buildNavGraph(board) : null;
}
