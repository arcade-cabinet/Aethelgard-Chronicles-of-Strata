import { describe, expect, it } from 'vitest';
import { AssignedJob, Carrier, HexPosition } from '@/ecs/components';
import { depositSystem } from '@/ecs/systems/deposit';
import { createEconomy } from '@/game/economy';
import { createEcsWorld } from '@/ecs/world';

describe('deposit system', () => {
  it('adds a carried load to the economy when the peon is adjacent to the Town Hall', () => {
    const world = createEcsWorld();
    const eco = createEconomy();
    const peon = world.spawn(
      HexPosition({ q: 1, r: 0, level: 2 }),
      AssignedJob({ state: 'CARRYING', targetKey: '5,5' }),
      Carrier({ carryType: 'wood', amount: 10 }),
    );
    // Town Hall at 0,0 — peon at 1,0 is adjacent
    depositSystem(world, eco, '0,0');
    expect(eco.wood).toBe(60);
    expect(peon.get(Carrier)?.amount).toBe(0);
    expect(peon.get(Carrier)?.carryType).toBe('none');
  });

  it('returns the peon to SEEKING after a deposit', () => {
    const world = createEcsWorld();
    const eco = createEconomy();
    const peon = world.spawn(
      HexPosition({ q: 1, r: 0, level: 2 }),
      AssignedJob({ state: 'CARRYING', targetKey: '5,5' }),
      Carrier({ carryType: 'stone', amount: 8 }),
    );
    depositSystem(world, eco, '0,0');
    expect(peon.get(AssignedJob)?.state).toBe('SEEKING');
  });

  it('does nothing for a CARRYING peon not yet adjacent to the Town Hall', () => {
    const world = createEcsWorld();
    const eco = createEconomy();
    world.spawn(
      HexPosition({ q: 9, r: 9, level: 2 }),
      AssignedJob({ state: 'CARRYING', targetKey: '5,5' }),
      Carrier({ carryType: 'wood', amount: 10 }),
    );
    depositSystem(world, eco, '0,0');
    expect(eco.wood).toBe(50);
  });
});
