import { describe, expect, it } from 'vitest';
import { TILE_HEIGHT } from '@/core/constants';
import {
  AnimationState,
  FactionTrait,
  HexPosition,
  Movement,
  Transform,
  Unit,
} from '@/ecs/components';
import { createEcsWorld } from '@/ecs/world';
import { createCharacter } from '../character-factory';

describe('createCharacter', () => {
  it('spawns a Peon as a player-faction unit on the given tile', () => {
    const world = createEcsWorld();
    const e = createCharacter({ world, role: 'Peon', q: 2, r: -1, level: 3 });
    expect(e.get(Unit)?.unitType).toBe('Peon');
    expect(e.get(FactionTrait)?.faction).toBe('player');
    expect(e.get(HexPosition)).toEqual({ q: 2, r: -1, level: 3 });
  });

  it('places the Transform Y at the tile elevation', () => {
    const world = createEcsWorld();
    const e = createCharacter({ world, role: 'Footman', q: 0, r: 0, level: 4 });
    expect(e.get(Transform)?.y).toBeCloseTo(4 * TILE_HEIGHT, 5);
  });

  it('spawns enemies on the enemy faction', () => {
    const world = createEcsWorld();
    const goblin = createCharacter({ world, role: 'Goblin', q: 0, r: 0, level: 2 });
    const orc = createCharacter({ world, role: 'Orc', q: 1, r: 0, level: 2 });
    expect(goblin.get(FactionTrait)?.faction).toBe('enemy');
    expect(orc.get(FactionTrait)?.faction).toBe('enemy');
  });

  it('gives each role its archetype movement speed', () => {
    const world = createEcsWorld();
    expect(createCharacter({ world, role: 'Peon', q: 0, r: 0, level: 2 }).get(Movement)?.speed).toBe(
      3,
    );
    expect(createCharacter({ world, role: 'Orc', q: 0, r: 0, level: 2 }).get(Movement)?.speed).toBe(
      1.5,
    );
  });

  it('starts every character in the IDLE animation state', () => {
    const world = createEcsWorld();
    const e = createCharacter({ world, role: 'Peon', q: 0, r: 0, level: 2 });
    expect(e.get(AnimationState)?.state).toBe('IDLE');
  });
});
