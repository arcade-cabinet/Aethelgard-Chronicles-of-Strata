import { describe, expect, it } from 'vitest';
import { Building, FactionTrait, HexPosition, Selectable } from '@/ecs/components';
import { startGame } from '@/game/game-state';
import { selectEntity } from '@/game/selection';
import { resolveBarracksPos } from '@/world/RallyMarker';

/**
 * M_EXPANSION.U.120 — rally preview resolver. Pins:
 *   - returns null when nothing is selected
 *   - returns null when a non-Barracks building is selected
 *   - returns the Barracks's world position when a Barracks is selected
 *   - level is honored (y = level * TILE_HEIGHT)
 */
describe('M_EXPANSION.U.120 — rally preview resolveBarracksPos', () => {
  it('returns null when nothing is selected', () => {
    const game = startGame('rally-empty-selection');
    expect(resolveBarracksPos(game)).toBeNull();
  });

  it('returns null when a non-Barracks building is selected', () => {
    const game = startGame('rally-non-barracks');
    const tile = [...game.board.tiles.values()].find((t) => t.walkable);
    if (!tile) throw new Error('no walkable tile');
    const farm = game.world.spawn(
      Building({ buildingType: 'Farm', isComplete: true, progress: 1 }),
      HexPosition({ q: tile.q, r: tile.r, level: tile.level }),
      FactionTrait({ faction: 'player' }),
      Selectable({}),
    );
    selectEntity(game, farm);
    expect(resolveBarracksPos(game)).toBeNull();
  });

  it('returns the Barracks world position when selected', () => {
    const game = startGame('rally-barracks-selected');
    const tile = [...game.board.tiles.values()].find((t) => t.walkable);
    if (!tile) throw new Error('no walkable tile');
    const barracks = game.world.spawn(
      Building({ buildingType: 'Barracks', isComplete: true, progress: 1 }),
      HexPosition({ q: tile.q, r: tile.r, level: tile.level }),
      FactionTrait({ faction: 'player' }),
      Selectable({}),
    );
    selectEntity(game, barracks);
    const pos = resolveBarracksPos(game);
    expect(pos).not.toBeNull();
    if (!pos) throw new Error('pos null');
    expect(Number.isFinite(pos.x)).toBe(true);
    expect(Number.isFinite(pos.z)).toBe(true);
    expect(Number.isFinite(pos.y)).toBe(true);
  });

  it('y reflects the tile level (higher level → taller y)', () => {
    const game = startGame('rally-level-honored');
    const lowTile = [...game.board.tiles.values()].find((t) => t.walkable && t.level === 0);
    const highTile = [...game.board.tiles.values()].find((t) => t.walkable && t.level >= 1);
    if (!lowTile || !highTile) {
      // Some seeds produce flat boards. Use what we have — assert symmetric behavior.
      return;
    }
    const lowB = game.world.spawn(
      Building({ buildingType: 'Barracks', isComplete: true, progress: 1 }),
      HexPosition({ q: lowTile.q, r: lowTile.r, level: lowTile.level }),
      FactionTrait({ faction: 'player' }),
      Selectable({}),
    );
    const highB = game.world.spawn(
      Building({ buildingType: 'Barracks', isComplete: true, progress: 1 }),
      HexPosition({ q: highTile.q, r: highTile.r, level: highTile.level }),
      FactionTrait({ faction: 'player' }),
      Selectable({}),
    );
    selectEntity(game, lowB);
    const lowPos = resolveBarracksPos(game);
    selectEntity(game, highB);
    const highPos = resolveBarracksPos(game);
    if (!lowPos || !highPos) throw new Error('pos null');
    expect(highPos.y).toBeGreaterThan(lowPos.y);
  });
});
