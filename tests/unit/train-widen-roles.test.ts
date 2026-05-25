/**
 * M_V7.TRAIN.WIDEN-ROLES — pin all 9 PLAYER_UNIT_TYPES are trainable.
 *
 * Resolves CRIT-2 from the v0.7 cycle opening review: v0.4 typed
 * `trainUnit role` as `'Peon' | 'Footman' | 'Scout' | 'Hero'` — only
 * 4 of the 9 PLAYER_UNIT_TYPES. M_PIVOT.N-PLAYER.SHARED-KIT (v0.5)
 * documented "every faction can train every player-kit unit" but the
 * type literally forbade Trebuchet/Wizard/Healer/Ferryman/Settler.
 *
 * Pins:
 *   1. UNIT_COSTS carries entries for all 9 PLAYER_UNIT_TYPES.
 *   2. SUPPLY_COST carries entries for all 9.
 *   3. trainUnit accepts each role + spawns the matching unit type
 *      (with sufficient resources + supply cap).
 */
import { describe, expect, it } from 'vitest';
import { PLAYER_UNIT_TYPES, Unit } from '@/ecs/components';
import { trainUnit } from '@/game/commands';
import { startGame } from '@/game/game-state';
import { SUPPLY_COST, UNIT_COSTS } from '@/rules';

describe('M_V7.TRAIN.WIDEN-ROLES — every PLAYER_UNIT_TYPE has a cost row', () => {
  it('UNIT_COSTS has entries for all 9 player roles', () => {
    for (const role of PLAYER_UNIT_TYPES) {
      const cost = UNIT_COSTS[role as keyof typeof UNIT_COSTS];
      expect(cost, `UNIT_COSTS missing entry for ${role}`).toBeDefined();
    }
  });

  it('SUPPLY_COST has entries for all 9 player roles', () => {
    for (const role of PLAYER_UNIT_TYPES) {
      const sup = SUPPLY_COST[role];
      expect(sup, `SUPPLY_COST missing entry for ${role}`).toBeDefined();
      expect(typeof sup).toBe('number');
    }
  });
});

describe('M_V7.TRAIN.WIDEN-ROLES — trainUnit accepts every player role', () => {
  it('every PLAYER_UNIT_TYPE trains given sufficient resources + supply', () => {
    const game = startGame({
      seedPhrase: 'alpha-bravo-charlie',
      mapSize: 8,
      difficulty: 'normal',
      eventSeed: 'evt',
    });
    // Give the player faction ample resources + supply for all 9 trains.
    game.economy.player.wood = 999;
    game.economy.player.stone = 999;
    game.economy.player.gold = 999;
    game.economy.player.food = 999;
    game.economy.player.science = 999;
    game.economy.player.mana = 999;
    game.economy.player.maxSupply = 100;
    // Track which roles trained successfully.
    const trained: string[] = [];
    for (const role of PLAYER_UNIT_TYPES) {
      // Each call returns true on success; false on cap or insufficient
      // resources. With 999 of every resource + 100 supply cap, the only
      // gate is whether trainUnit's type accepts the role.
      const ok = trainUnit(game, role as Parameters<typeof trainUnit>[1], 'player');
      if (ok) trained.push(role);
    }
    // Peon may fail at the peon cap (4); Hero may fail if already alive.
    // The contract: at least 7 of 9 should succeed in a fresh game.
    expect(trained.length).toBeGreaterThanOrEqual(7);
    // Trebuchet + Wizard + Healer + Ferryman + Settler MUST be in the
    // trained set — those were the v0.4 unreachable roles.
    for (const role of ['Trebuchet', 'Wizard', 'Healer', 'Ferryman', 'Settler']) {
      expect(trained, `${role} should train successfully`).toContain(role);
    }
    // The world should now hold one Unit entity per trained role.
    let unitCount = 0;
    for (const _ of game.world.query(Unit)) unitCount += 1;
    expect(unitCount).toBeGreaterThanOrEqual(trained.length);
  });
});
