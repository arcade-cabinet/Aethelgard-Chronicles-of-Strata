import { describe, expect, it } from 'vitest';
import { HexPosition } from '@/ecs/components';
import { startGame } from '@/game/game-state';

describe('startGame', () => {
  it('produces a game state with a populated board', () => {
    const game = startGame('ancient-silver-forest');
    expect(game.board.tiles.size).toBeGreaterThan(0);
    expect(game.seedPhrase).toBe('ancient-silver-forest');
  });

  it('builds a nav graph covering the walkable tiles', () => {
    const game = startGame('ancient-silver-forest');
    const walkable = [...game.board.tiles.values()].filter((t) => t.walkable).length;
    expect(game.navGraph.size).toBe(walkable);
  });

  // M_V11.OPEN.SPAWN — playerPawn now points at the Palace
  // entity (an immovable building). The Palace tile is
  // deliberately marked non-walkable so units path around it.
  it('playerPawn points at the Palace entity (post-v0.11 RTS opening)', () => {
    const game = startGame('ancient-silver-forest');
    expect(game.playerPawn).toBe(game.townHallEntity);
    const hex = game.playerPawn.get(HexPosition);
    expect(hex).toBeDefined();
    const tile = game.board.tiles.get(`${hex?.q},${hex?.r}`);
    // The Palace tile is intentionally non-walkable (units route
    // around the building); the SPAWN tile itself is land.
    expect(tile).toBeDefined();
    expect(tile?.walkable).toBe(false);
  });

  it('is reproducible — same seed yields the same Palace position', () => {
    const a = startGame('ancient-silver-forest');
    const b = startGame('ancient-silver-forest');
    expect(a.playerPawn.get(HexPosition)).toEqual(b.playerPawn.get(HexPosition));
  });
});
