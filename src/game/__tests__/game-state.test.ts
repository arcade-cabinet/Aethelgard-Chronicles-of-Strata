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

  it('spawns a player pawn on a walkable tile', () => {
    const game = startGame('ancient-silver-forest');
    const pawns = game.world.query(HexPosition).filter((e) => e === game.playerPawn);
    expect(pawns.length).toBe(1);
    const hex = game.playerPawn.get(HexPosition);
    const tile = game.board.tiles.get(`${hex?.q},${hex?.r}`);
    expect(tile?.walkable).toBe(true);
  });

  it('is reproducible — same seed yields the same pawn spawn tile', () => {
    const a = startGame('ancient-silver-forest');
    const b = startGame('ancient-silver-forest');
    expect(a.playerPawn.get(HexPosition)).toEqual(b.playerPawn.get(HexPosition));
  });
});
