import { describe, expect, it } from 'vitest';
import { AssignedJob, Carrier, FactionTrait, HexPosition } from '@/ecs/components';
import { depositSystem } from '@/ecs/systems/economy';
import { createEcsWorld } from '@/ecs/world';
import { createEconomy } from '@/game/economy';

describe('deposit system', () => {
  it('adds a carried load to the economy when the peon is adjacent to the base', () => {
    const world = createEcsWorld();
    const eco = createEconomy();
    const peon = world.spawn(
      HexPosition({ q: 1, r: 0, level: 2 }),
      AssignedJob({ state: 'CARRYING', targetKey: '5,5' }),
      Carrier({ carryType: 'wood', amount: 10 }),
      FactionTrait({ faction: 'player' }),
    );
    // base at 0,0 — peon at 1,0 is adjacent
    depositSystem(world, eco, '0,0', 'player');
    expect(eco.wood).toBe(90); // M_V11.OPEN.STOCKPILE 80+10=90;
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
      FactionTrait({ faction: 'player' }),
    );
    depositSystem(world, eco, '0,0', 'player');
    expect(peon.get(AssignedJob)?.state).toBe('SEEKING');
  });

  it('does nothing for a CARRYING peon not yet adjacent to the base', () => {
    const world = createEcsWorld();
    const eco = createEconomy();
    world.spawn(
      HexPosition({ q: 9, r: 9, level: 2 }),
      AssignedJob({ state: 'CARRYING', targetKey: '5,5' }),
      Carrier({ carryType: 'wood', amount: 10 }),
      FactionTrait({ faction: 'player' }),
    );
    depositSystem(world, eco, '0,0', 'player');
    expect(eco.wood).toBe(80); // M_V11.OPEN.STOCKPILE;
  });

  it('only deposits for the faction it is run for', () => {
    const world = createEcsWorld();
    const playerEco = createEconomy();
    // an enemy peon adjacent to the (shared coord) base
    world.spawn(
      HexPosition({ q: 1, r: 0, level: 2 }),
      AssignedJob({ state: 'CARRYING', targetKey: '5,5' }),
      Carrier({ carryType: 'wood', amount: 10 }),
      FactionTrait({ faction: 'enemy' }),
    );
    // running the player deposit must NOT collect the enemy peon's load
    depositSystem(world, playerEco, '0,0', 'player');
    expect(playerEco.wood).toBe(80); // M_V11.OPEN.STOCKPILE;
  });
});
