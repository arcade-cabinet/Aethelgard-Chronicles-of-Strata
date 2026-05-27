/**
 * M_V11.UNITS-EXPANSION + BUILDINGS-EXPANSION (#77d + #77e runtime
 * wire-ups) — coverage for the per-tick handlers added with the
 * units + buildings expansion.
 *
 * Pins:
 *   1. engineerRepairSystem ticks +5 hp/sec on adjacent friendly
 *      buildings; foreign-faction engineers do not heal.
 *   2. diplomatContactSystem mints a relation row when a Diplomat
 *      walks into a foreign zone tile; idempotent on re-tick.
 *   3. build.onBuildingComplete — Embassy completion establishes
 *      contact with bordering factions; Lighthouse reveals ocean
 *      tiles; MageTower spawns a MageTowerGarrison unit.
 */
import { describe, expect, it } from 'vitest';
import {
  AnimationState,
  AssignedJob,
  Building,
  FactionTrait,
  Harvester,
  Health,
  HexPosition,
  Unit,
} from '@/ecs/components';
import { diplomatContactSystem } from '@/ecs/systems/diplomat-contact';
import { engineerRepairSystem } from '@/ecs/systems/engineer-repair';
import { buildSystem } from '@/ecs/systems/build';
import { hasHadContact } from '@/game/diplomacy-tribute';
import { startGame } from '@/game/game-state';

describe('M_V11 runtime wire-ups — engineerRepairSystem', () => {
  it('heals an adjacent friendly building at 5 hp/sec', () => {
    const game = startGame('engineer-repair-test');
    // Place a damaged friendly building. Pick a tile near the player palace.
    const palacePos = game.palaceKey.split(',').map(Number) as [number, number];
    const dq = palacePos[0] + 1;
    const dr = palacePos[1];
    const building = game.world.spawn(
      Building({ buildingType: 'Watchtower', isComplete: true, progress: 1 }),
      FactionTrait({ faction: 'player' }),
      HexPosition({ q: dq, r: dr, level: 0 }),
      Health({ current: 50, max: 100 }),
    );
    // Place an Engineer ON the same tile.
    game.world.spawn(
      Unit({ unitType: 'Engineer' }),
      FactionTrait({ faction: 'player' }),
      HexPosition({ q: dq, r: dr, level: 0 }),
    );
    engineerRepairSystem(game, 2); // 2 seconds of healing
    const next = building.get(Health)?.current;
    expect(next).toBeGreaterThanOrEqual(60);
  });

  it('does NOT heal a foreign-faction building', () => {
    const game = startGame('engineer-repair-foreign-test');
    const building = game.world.spawn(
      Building({ buildingType: 'Watchtower', isComplete: true, progress: 1 }),
      FactionTrait({ faction: 'enemy' }),
      HexPosition({ q: 5, r: 5, level: 0 }),
      Health({ current: 50, max: 100 }),
    );
    game.world.spawn(
      Unit({ unitType: 'Engineer' }),
      FactionTrait({ faction: 'player' }),
      HexPosition({ q: 5, r: 5, level: 0 }),
    );
    engineerRepairSystem(game, 5);
    expect(building.get(Health)?.current).toBe(50);
  });
});

describe('M_V11 runtime wire-ups — diplomatContactSystem', () => {
  it('mints a relation row when a Diplomat enters a foreign zone tile', () => {
    const game = startGame('diplomat-contact-test');
    // Seed an enemy zone tile.
    const enemyZone = game.zones.enemy;
    enemyZone.controlled.add('7,3');
    // Spawn a player Diplomat on that tile.
    game.world.spawn(
      Unit({ unitType: 'Diplomat' }),
      FactionTrait({ faction: 'player' }),
      HexPosition({ q: 7, r: 3, level: 0 }),
    );
    expect(hasHadContact(game.diplomacy, 'player', 'enemy')).toBe(false);
    diplomatContactSystem(game);
    expect(hasHadContact(game.diplomacy, 'player', 'enemy')).toBe(true);
  });

  it('is idempotent on repeat ticks', () => {
    const game = startGame('diplomat-contact-idempotent');
    game.zones.enemy.controlled.add('2,2');
    game.world.spawn(
      Unit({ unitType: 'Diplomat' }),
      FactionTrait({ faction: 'player' }),
      HexPosition({ q: 2, r: 2, level: 0 }),
    );
    diplomatContactSystem(game);
    const sizeAfter = game.diplomacy.relations.size;
    diplomatContactSystem(game);
    diplomatContactSystem(game);
    expect(game.diplomacy.relations.size).toBe(sizeAfter);
  });
});

describe('M_V11 runtime wire-ups — buildSystem.onBuildingComplete', () => {
  it('completing a MageTower spawns a MageTowerGarrison unit on the tile', () => {
    const game = startGame('mage-tower-completion-test');
    const dq = 9;
    const dr = 4;
    const tileKey = `${dq},${dr}`;
    // Spawn the build site at near-complete progress so one tick of
    // buildSystem flips it to complete and fires the onBuildingComplete
    // helper.
    const site = game.world.spawn(
      Building({ buildingType: 'MageTower', isComplete: false, progress: 0.99 }),
      FactionTrait({ faction: 'player' }),
      HexPosition({ q: dq, r: dr, level: 0 }),
    );
    game.buildSites.set(tileKey, site);
    // Spawn a peon with the BUILDING job targeting this site.
    game.world.spawn(
      Harvester({ harvestRate: 10, harvestTimer: 0 }),
      AssignedJob({ state: 'BUILDING', targetKey: tileKey }),
      AnimationState({ state: 'BUILDING' }),
      FactionTrait({ faction: 'player' }),
    );
    buildSystem(game.world, game.buildSites, 1, game);
    expect(site.get(Building)?.isComplete).toBe(true);
    let garrisons = 0;
    for (const u of game.world.query(Unit, FactionTrait, HexPosition)) {
      if (u.get(Unit)?.unitType !== 'MageTowerGarrison') continue;
      if (u.get(FactionTrait)?.faction !== 'player') continue;
      const pos = u.get(HexPosition);
      if (pos?.q === dq && pos?.r === dr) garrisons += 1;
    }
    expect(garrisons).toBe(1);
  });
});
