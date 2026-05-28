/**
 * M_GAME.MODE.PEON.1 — peon autoMode field + setPeonAutoMode command.
 *
 * Verifies:
 * - Spawned peons get PeonAutonomy with autoMode='auto'.
 * - setPeonAutoMode flips the field + resets AssignedJob to IDLE on
 *   the 'auto' transition (so the auto-scheduler picks the peon up
 *   immediately on the next tick).
 * - findSelectableAtTile NO LONGER skips peons (the v0.1.20 skip is
 *   reverted per the RTS commitment spec).
 */
import { describe, expect, it } from 'vitest';
import { AssignedJob, HexPosition, PeonAutonomy, Unit } from '@/ecs/components';
import { createCharacter } from '@/entities/character-factory';
import { findSelectableAtTile, setPeonAutoMode } from '@/game/utilities';
import { startGame } from '@/game/game-state';

// M_V11.OPEN.SPAWN — startGame no longer pre-spawns peons. The
// PeonAutonomy substrate tests spawn one explicitly to exercise
// the trait + command.
function spawnFirstPlayerPeon(game: ReturnType<typeof startGame>) {
  const [tq, tr] = game.palaceKey.split(',').map(Number) as [number, number];
  const dirs: ReadonlyArray<readonly [number, number]> = [
    [1, 0],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [0, -1],
    [1, -1],
  ];
  for (const [dq, dr] of dirs) {
    const tile = game.board.tiles.get(`${tq + dq},${tr + dr}`);
    if (tile?.walkable) {
      return createCharacter({
        world: game.world,
        role: 'Peon',
        q: tile.q,
        r: tile.r,
        level: tile.level,
      });
    }
  }
  return undefined;
}

function getFirstPlayerPeon(game: ReturnType<typeof startGame>) {
  for (const e of game.world.query(Unit, PeonAutonomy)) {
    if (e.get(Unit)?.unitType !== 'Peon') continue;
    return e;
  }
  return undefined;
}

describe('PeonAutonomy + setPeonAutoMode (M_GAME.MODE.PEON.1)', () => {
  it('spawned player peons have PeonAutonomy autoMode="auto"', () => {
    const game = startGame({
      seedPhrase: 'alpha-bravo-charlie',
      mapSize: 8,
      difficulty: 'normal',
      eventSeed: 'evt',
    });
    spawnFirstPlayerPeon(game);
    const peon = getFirstPlayerPeon(game);
    expect(peon, 'a player peon must spawn at game start').toBeDefined();
    if (!peon) return;
    expect(peon.get(PeonAutonomy)?.autoMode).toBe('auto');
  });

  it('setPeonAutoMode flips manual ↔ auto and resets AssignedJob on auto', () => {
    const game = startGame({
      seedPhrase: 'alpha-bravo-charlie',
      mapSize: 8,
      difficulty: 'normal',
      eventSeed: 'evt',
    });
    spawnFirstPlayerPeon(game);
    const peon = getFirstPlayerPeon(game);
    if (!peon) return;
    // Pretend the peon was harvesting something.
    peon.set(AssignedJob, { state: 'CARRYING', targetKey: '1,2' });
    expect(setPeonAutoMode(game, peon, 'manual')).toBe(true);
    expect(peon.get(PeonAutonomy)?.autoMode).toBe('manual');
    // Manual flip preserves AssignedJob — the player can override
    // with a new command.
    expect(peon.get(AssignedJob)?.state).toBe('CARRYING');
    // Flip back: auto resets to IDLE.
    expect(setPeonAutoMode(game, peon, 'auto')).toBe(true);
    expect(peon.get(PeonAutonomy)?.autoMode).toBe('auto');
    expect(peon.get(AssignedJob)?.state).toBe('IDLE');
    expect(peon.get(AssignedJob)?.targetKey).toBe('');
  });

  it('findSelectableAtTile finds peons (the v0.1.20 skip is reverted)', () => {
    const game = startGame({
      seedPhrase: 'alpha-bravo-charlie',
      mapSize: 8,
      difficulty: 'normal',
      eventSeed: 'evt',
    });
    spawnFirstPlayerPeon(game);
    const peon = getFirstPlayerPeon(game);
    if (!peon) return;
    const pos = peon.get(HexPosition);
    if (!pos) return;
    const key = `${pos.q},${pos.r}`;
    const found = findSelectableAtTile(game, key);
    expect(found).toBeDefined();
  });
});
