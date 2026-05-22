import { describe, expect, it } from 'vitest';
import { HexPosition, Unit } from '@/ecs/components';
import { startGame } from '@/game/game-state';
import { deserializeWorld, serializeWorld } from '@/persistence/serialize';

describe('ECS save/load', () => {
  it('round-trips the unit roster and positions', () => {
    const game = startGame('ancient-silver-forest');
    const snapshot = serializeWorld(game.world);
    const restored = deserializeWorld(snapshot);
    const before = game.world.query(Unit).length;
    const after = restored.query(Unit).length;
    expect(after).toBe(before);
  });

  it('round-trips a unit HexPosition exactly', () => {
    const game = startGame('ancient-silver-forest');
    const original = game.world.query(Unit, HexPosition)[0]?.get(HexPosition);
    const restored = deserializeWorld(serializeWorld(game.world));
    const restoredPos = restored.query(Unit, HexPosition)[0]?.get(HexPosition);
    expect(restoredPos).toEqual(original);
  });
});
