import { describe, expect, it } from 'vitest';
import {
  DefensiveBehavior,
  FactionTrait,
  Gate,
  HexPosition,
  MoverBehavior,
} from '@/ecs/components';
import { createEcsWorld } from '@/ecs/world';
import { buildGateMap, materialiseGate, tilePassable } from '@/rules';

describe('Gate composition (M_ARCHETYPE.2)', () => {
  it('buildGateMap indexes every Gate by tile key + faction', () => {
    const world = createEcsWorld();
    world.spawn(Gate({ faction: 'player' }), HexPosition({ q: 1, r: 0, level: 1 }));
    world.spawn(Gate({ faction: 'enemy' }), HexPosition({ q: 3, r: 2, level: 1 }));
    const map = buildGateMap(world);
    expect(map.get('1,0')).toBe('player');
    expect(map.get('3,2')).toBe('enemy');
  });

  it('tilePassable: friendly faction crosses freely; enemy is blocked', () => {
    const gates = new Map([['5,5', 'player' as const]]);
    expect(tilePassable(gates, '5,5', 'player')).toBe(true);
    expect(tilePassable(gates, '5,5', 'enemy')).toBe(false);
  });

  it('tilePassable: a non-gate tile is passable for either faction', () => {
    const gates = new Map<string, 'player' | 'enemy'>();
    expect(tilePassable(gates, '0,0', 'player')).toBe(true);
    expect(tilePassable(gates, '0,0', 'enemy')).toBe(true);
  });

  it('materialiseGate composes Gate onto a Mover-on-Defender entity', () => {
    const world = createEcsWorld();
    const e = world.spawn(
      MoverBehavior({ material: 'stone' }),
      DefensiveBehavior({
        radius: 0,
        armorVsNormal: 0.3,
        armorVsSiege: 1.5,
        armorVsMagic: 1,
        armorVsPierce: 0.6,
      }),
      HexPosition({ q: 2, r: 2, level: 1 }),
    );
    materialiseGate(e, 'player');
    expect(e.has(Gate)).toBe(true);
    expect(e.get(Gate)?.faction).toBe('player');
    expect(e.has(FactionTrait)).toBe(true);
    expect(e.get(FactionTrait)?.faction).toBe('player');
    // the underlying Defender + Mover survive — the gate is a COMPOSITION
    expect(e.has(DefensiveBehavior)).toBe(true);
    expect(e.has(MoverBehavior)).toBe(true);
  });
});
