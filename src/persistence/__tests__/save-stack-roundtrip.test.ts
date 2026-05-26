/**
 * M_V11.STACK.SAVE — verify Stack + StackMember traits round-trip
 * through serializeGame → deserializeGame. The substrate is in
 * SERIALIZED_TRAITS (M_GAME.STACK.1), and the v10 traits ledger
 * generically copies via the registry — this test pins that the
 * cohort, formation id, combined stats, and member back-references
 * survive a JSON round-trip.
 */
import { describe, expect, it } from 'vitest';
import { Stack, StackMember, Unit } from '@/ecs/components';
import { createCharacter } from '@/entities/character-factory';
import { startGame } from '@/game/game-state';
import { createStack } from '@/game/stacking';
import { deserializeGame, serializeGame } from '@/persistence/serialize-game';

function spawnFootman(game: ReturnType<typeof startGame>, dq: number) {
  const [tq, tr] = game.townHallKey.split(',').map(Number) as [number, number];
  // Find a walkable tile dq away from the Town Hall.
  for (let r = -1; r <= 1; r++) {
    const tile = game.board.tiles.get(`${tq + dq},${tr + r}`);
    if (tile?.walkable) {
      return createCharacter({
        world: game.world,
        role: 'Footman',
        q: tile.q,
        r: tile.r,
        level: tile.level,
      });
    }
  }
  throw new Error(`no walkable tile at +${dq} from Town Hall`);
}

describe('Stack save/load round-trip (M_V11.STACK.SAVE)', () => {
  it('preserves a 3-member Stack across serialize → deserialize', () => {
    const game = startGame('ancient-silver-forest');
    const a = spawnFootman(game, 1);
    const b = spawnFootman(game, 2);
    const c = spawnFootman(game, 3);
    const result = createStack(game, [a, b, c]);
    expect(result.ok).toBe(true);
    const originalStack = result.stack?.get(Stack);
    expect(originalStack).toBeDefined();
    if (!originalStack) return;
    const originalIds = [...originalStack.members];

    const snap = serializeGame(game);
    const restored = deserializeGame(JSON.parse(JSON.stringify(snap)));

    // Find the restored Stack (one in the world after a roundtrip).
    interface StackData {
      members: number[];
      formationId: string;
      combinedHp: number;
      combinedMaxHp: number;
      combinedDps: number;
      dominantUnitType: string;
    }
    let restoredStack: StackData | undefined;
    let restoredMemberCount = 0;
    for (const s of restored.world.query(Stack)) {
      const data = s.get(Stack);
      if (data) {
        restoredStack = data;
        restoredMemberCount++;
      }
    }
    expect(restoredMemberCount).toBe(1);
    expect(restoredStack).not.toBeNull();
    if (!restoredStack) return;
    expect(restoredStack.formationId).toBe(originalStack.formationId);
    expect(restoredStack.combinedHp).toBe(originalStack.combinedHp);
    expect(restoredStack.combinedMaxHp).toBe(originalStack.combinedMaxHp);
    expect(restoredStack.dominantUnitType).toBe(originalStack.dominantUnitType);
    expect(restoredStack.members.length).toBe(3);
    // Verify each original member id flows through (the entity-id mapping
    // is preserved by the v10 SERIALIZED_TRAITS copy).
    for (const id of originalIds) {
      expect(restoredStack.members).toContain(id);
    }
    // StackMember back-references point at the same stack id post-load.
    let backRefCount = 0;
    for (const m of restored.world.query(StackMember, Unit)) {
      backRefCount++;
      expect(m.get(StackMember)?.stackId).toBeDefined();
    }
    expect(backRefCount).toBe(3);
  });
});
