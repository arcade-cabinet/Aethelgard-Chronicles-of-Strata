import { describe, expect, it } from 'vitest';
import { TILE_HEIGHT } from '@/config/world';
import { difficultyMultiplierFor } from '@/config/combat';
import {
  AnimationState,
  FactionTrait,
  Health,
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
    const vampire = createCharacter({ world, role: 'Vampire', q: 2, r: 0, level: 2 });
    const blackKnight = createCharacter({ world, role: 'BlackKnight', q: 3, r: 0, level: 2 });
    const witch = createCharacter({ world, role: 'Witch', q: 4, r: 0, level: 2 });
    expect(goblin.get(FactionTrait)?.faction).toBe('enemy');
    expect(orc.get(FactionTrait)?.faction).toBe('enemy');
    expect(vampire.get(FactionTrait)?.faction).toBe('enemy');
    expect(blackKnight.get(FactionTrait)?.faction).toBe('enemy');
    expect(witch.get(FactionTrait)?.faction).toBe('enemy');
  });

  it('gives each role its archetype movement speed', () => {
    const world = createEcsWorld();
    expect(
      createCharacter({ world, role: 'Peon', q: 0, r: 0, level: 2 }).get(Movement)?.speed,
    ).toBe(3);
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

describe('M_V8.DIFFICULTY-MULTIPLIER.N-PLAYER — all non-player factions scale', () => {
  it('player Footman HP is NOT scaled by difficulty', () => {
    const world = createEcsWorld();
    const playerUnit = createCharacter({
      world,
      role: 'Footman',
      q: 0,
      r: 0,
      level: 0,
      factionOverride: 'player',
      difficulty: 'hard',
    });
    const hardMult = difficultyMultiplierFor('hard');
    const hp = playerUnit.get(Health)?.current ?? 0;
    // Player always 1.0 multiplier regardless of difficulty.
    const normalUnit = createCharacter({
      world,
      role: 'Footman',
      q: 1,
      r: 0,
      level: 0,
      factionOverride: 'player',
      difficulty: 'normal',
    });
    expect(hp).toBe(normalUnit.get(Health)?.current ?? -1);
    expect(hardMult).toBeGreaterThan(1); // sanity: hard really scales up
  });

  it('N-player AI faction (ai-3) Footman HP scales at difficulty multiplier', () => {
    const world = createEcsWorld();
    const hardMult = difficultyMultiplierFor('hard');
    const normalUnit = createCharacter({
      world,
      role: 'Footman',
      q: 0,
      r: 0,
      level: 0,
      factionOverride: 'player',
      difficulty: 'normal',
    });
    const aiUnit = createCharacter({
      world,
      role: 'Footman',
      q: 1,
      r: 0,
      level: 0,
      factionOverride: 'ai-3',
      difficulty: 'hard',
    });
    const baseHp = normalUnit.get(Health)?.current ?? 0;
    const scaledHp = aiUnit.get(Health)?.current ?? 0;
    // N-player AI faction should get difficulty scaling just like 'enemy'.
    expect(scaledHp).toBe(Math.round(baseHp * hardMult));
  });
});
