/**
 * M_FUN.MAP.FOREST + M_FUN.MAP.HIGHLAND + M_FUN.MAP.AMBUSH —
 * biome-tactics pins for combatSystem.
 *
 * - HIGHLAND attacker: +1 effective range for ranged units
 * - FOREST on hex line: blocks ranged LoS
 * - FOREST attacker: +20% damage initiating combat
 */
import { describe, expect, it } from 'vitest';
import {
  AnimationState,
  Combatant,
  EnemyTarget,
  FactionTrait,
  Health,
  HexPosition,
  Unit,
} from '@/ecs/components';
import { combatSystem } from '@/ecs/systems/combat';
import { createEcsWorld } from '@/ecs/world';
import type { BoardData, Tile } from '@/core/board';
import seedrandom from 'seedrandom';

function tile(q: number, r: number, type: Tile['type'], level = 2): Tile {
  return { q, r, type, level, moisture: 0.5, walkable: true, isCrossingLanding: false };
}

function makeTiles(tiles: Tile[]): BoardData['tiles'] {
  const m = new Map<string, Tile>();
  for (const t of tiles) m.set(`${t.q},${t.r}`, t);
  return m;
}

function rngOf(seed: string) {
  return seedrandom(seed);
}

function spawnAttacker(
  world: ReturnType<typeof createEcsWorld>,
  q: number,
  r: number,
  attackRange: number,
  targetId: number,
) {
  return world.spawn(
    HexPosition({ q, r, level: 2 }),
    Combatant({
      attackDamage: 10,
      attackRange,
      attackCooldown: 1,
      attackTimer: 1,
      fatigue: 0,
      fatigueDecayTimer: 0,
    }),
    EnemyTarget({ targetId }),
    FactionTrait({ faction: 'player' }),
    Unit({ unitType: attackRange > 1 ? 'Wizard' : 'Footman' }),
    AnimationState({ state: 'IDLE' }),
  );
}

function spawnTarget(world: ReturnType<typeof createEcsWorld>, q: number, r: number) {
  return world.spawn(
    HexPosition({ q, r, level: 2 }),
    Health({
      current: 100,
      max: 100,
      disease: 0,
      diseaseRecoveryTimer: 0,
      dehydration: 0,
      dehydrationRecoveryTimer: 0,
    }),
    FactionTrait({ faction: 'enemy' }),
    Unit({ unitType: 'Footman' }),
  );
}

describe('biome tactics in combatSystem (M_FUN.MAP.FOREST/HIGHLAND/AMBUSH)', () => {
  it('FOREST between ranged attacker and target blocks the shot', () => {
    const world = createEcsWorld();
    const target = spawnTarget(world, 3, 0);
    spawnAttacker(world, 0, 0, 3, Number(target));
    // FOREST at (1,0) blocks the LoS line (0,0) → (3,0).
    const tiles = makeTiles([
      tile(0, 0, 'GRASS'),
      tile(1, 0, 'FOREST'),
      tile(2, 0, 'GRASS'),
      tile(3, 0, 'GRASS'),
    ]);
    combatSystem(world, rngOf('s1'), 1, 1, undefined, tiles);
    // HP unchanged — shot blocked.
    expect(target.get(Health)?.current).toBe(100);
  });

  it('no FOREST between ranged attacker and target → hit lands', () => {
    const world = createEcsWorld();
    const target = spawnTarget(world, 3, 0);
    spawnAttacker(world, 0, 0, 3, Number(target));
    const tiles = makeTiles([
      tile(0, 0, 'GRASS'),
      tile(1, 0, 'GRASS'),
      tile(2, 0, 'GRASS'),
      tile(3, 0, 'GRASS'),
    ]);
    combatSystem(world, rngOf('s2'), 1, 1, undefined, tiles);
    expect(target.get(Health)?.current).toBeLessThan(100);
  });

  it('HIGHLAND attacker gets +1 effective range', () => {
    const world = createEcsWorld();
    const target = spawnTarget(world, 4, 0);
    // attackRange 3, target at dist 4 → out of range normally.
    spawnAttacker(world, 0, 0, 3, Number(target));
    // Attacker tile is HIGHLAND → effective range becomes 4.
    const tiles = makeTiles([
      tile(0, 0, 'HIGHLAND', 4),
      tile(1, 0, 'GRASS'),
      tile(2, 0, 'GRASS'),
      tile(3, 0, 'GRASS'),
      tile(4, 0, 'GRASS'),
    ]);
    combatSystem(world, rngOf('s3'), 1, 1, undefined, tiles);
    expect(target.get(Health)?.current).toBeLessThan(100);
  });

  it('FOREST attacker deals +20% damage (ambush)', () => {
    // Baseline: GRASS attacker
    const w1 = createEcsWorld();
    const t1 = spawnTarget(w1, 1, 0);
    spawnAttacker(w1, 0, 0, 1, Number(t1));
    const tilesGrass = makeTiles([tile(0, 0, 'GRASS'), tile(1, 0, 'GRASS')]);
    combatSystem(w1, rngOf('damage'), 1, 1, undefined, tilesGrass);
    const grassDamage = 100 - (t1.get(Health)?.current ?? 100);

    // Ambush: FOREST attacker
    const w2 = createEcsWorld();
    const t2 = spawnTarget(w2, 1, 0);
    spawnAttacker(w2, 0, 0, 1, Number(t2));
    const tilesForest = makeTiles([tile(0, 0, 'FOREST'), tile(1, 0, 'GRASS')]);
    combatSystem(w2, rngOf('damage'), 1, 1, undefined, tilesForest);
    const forestDamage = 100 - (t2.get(Health)?.current ?? 100);

    // Same RNG seed → forest damage should be ~1.2× grass.
    expect(forestDamage).toBeGreaterThan(grassDamage);
  });
});
