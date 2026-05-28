import { describe, expect, it } from 'vitest';
import { generateBoard } from '@/core/board';
import { buildNavGraph } from '@/core/pathfinding';
import {
  Combatant,
  EnemyTarget,
  FactionTrait,
  Health,
  HexPosition,
  PathQueue,
} from '@/ecs/components';
import { aiSystem } from '@/ecs/systems/meta';
import { createEcsWorld } from '@/ecs/world';

describe('AI system', () => {
  it('an idle enemy targets the nearest player unit and gets a path', () => {
    const board = generateBoard('ancient-silver-forest');
    const graph = buildNavGraph(board);
    const world = createEcsWorld();
    // a player unit and an enemy a few tiles apart on walkable tiles
    const walk = [...graph.keys()];
    const playerKey = walk[0] as string;
    const enemyKey = walk[Math.min(3, walk.length - 1)] as string;
    const [pq, pr] = playerKey.split(',').map(Number);
    const [eq, er] = enemyKey.split(',').map(Number);
    const player = world.spawn(
      HexPosition({ q: pq ?? 0, r: pr ?? 0, level: 2 }),
      FactionTrait({ faction: 'player' }),
      Health({ current: 100, max: 100 }),
    );
    void player;
    const enemy = world.spawn(
      HexPosition({ q: eq ?? 0, r: er ?? 0, level: 2 }),
      FactionTrait({ faction: 'enemy' }),
      Combatant({ attackDamage: 8, attackRange: 1, attackCooldown: 1, attackTimer: 0 }),
      EnemyTarget({ targetId: -1 }),
      PathQueue({ steps: [] }),
    );
    aiSystem(world, board, graph);
    expect(enemy.get(EnemyTarget)?.targetId).not.toBe(-1);
  });

  it('an enemy whose target died retargets', () => {
    const board = generateBoard('ancient-silver-forest');
    const graph = buildNavGraph(board);
    const world = createEcsWorld();
    const enemy = world.spawn(
      HexPosition({ q: 0, r: 0, level: 2 }),
      FactionTrait({ faction: 'enemy' }),
      Combatant({ attackDamage: 8, attackRange: 1, attackCooldown: 1, attackTimer: 0 }),
      EnemyTarget({ targetId: 88888 }), // a stale/dead id
      PathQueue({ steps: [] }),
    );
    // no player units exist — retarget should clear to -1 (nothing to hunt)
    aiSystem(world, board, graph);
    expect(enemy.get(EnemyTarget)?.targetId).toBe(-1);
  });
});
