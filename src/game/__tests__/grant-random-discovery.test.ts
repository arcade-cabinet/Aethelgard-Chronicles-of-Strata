/**
 * M_V6.CARRY.CAMP-DISCOVERY — grantRandomDiscovery pin tests.
 *
 * Pins:
 *   1. Granting from an empty pool returns null (no-op safe).
 *   2. Granting picks an un-purchased Discovery + marks it purchased.
 *   3. Granting twice with a fully-exhausted pool returns null on the 2nd call.
 *   4. Determinism: same PRNG seed → same pick across runs.
 *   5. Integration: camp clearing in runEconomyTick grants a Discovery.
 */
import { createWorld } from 'koota';
import { describe, expect, it } from 'vitest';
import { createEventPrng } from '@/core/rng';
import { Health } from '@/ecs/components';
import { startGame } from '@/game/game-state';
import { grantRandomDiscovery, createResearch, type ResearchId } from '@/game/research';
import { runEconomyTick } from '@/game/game-state';
import { spawnBarbarianCamp } from '@/world/barbarian-camps';
import { createCharacter } from '@/entities/character-factory';

describe('grantRandomDiscovery', () => {
  it('returns null when the pool is empty', () => {
    const research = createResearch();
    const world = createWorld();
    expect(grantRandomDiscovery(world, research, () => 0.5, [])).toBeNull();
  });

  it('picks a Discovery + marks it purchased', () => {
    const research = createResearch();
    const world = createWorld();
    const granted = grantRandomDiscovery(world, research, () => 0.5);
    expect(granted).not.toBeNull();
    expect(research.purchased.has(granted as ResearchId)).toBe(true);
  });

  it('returns null when every pool entry is already purchased', () => {
    const research = createResearch();
    const world = createWorld();
    // Drain the default pool by granting until the pool is exhausted.
    let safety = 10;
    while (grantRandomDiscovery(world, research, () => 0.5) !== null && safety-- > 0) {
      // keep granting
    }
    // Next call must return null (no candidates remain).
    expect(grantRandomDiscovery(world, research, () => 0.5)).toBeNull();
  });

  it('is deterministic: same PRNG seed → same pick', () => {
    const researchA = createResearch();
    const researchB = createResearch();
    const worldA = createWorld();
    const worldB = createWorld();
    const prngA = createEventPrng('camp-discovery-seed');
    const prngB = createEventPrng('camp-discovery-seed');
    const a = grantRandomDiscovery(worldA, researchA, prngA);
    const b = grantRandomDiscovery(worldB, researchB, prngB);
    expect(a).toBe(b);
  });
});

describe('camp clearing integration grants a Discovery', () => {
  it('runEconomyTick: clearing a camp adds an entry to game.research.purchased', () => {
    const game = startGame({
      seedPhrase: 'alpha-bravo-charlie',
      mapSize: 10,
      difficulty: 'normal',
      eventSeed: 'evt',
    });
    const startingPurchased = game.research.purchased.size;

    // Place a camp on a walkable tile away from both bases.
    let campTile: { q: number; r: number; level: number } | null = null;
    for (const tile of game.board.tiles.values()) {
      if (!tile.walkable) continue;
      if (Math.abs(tile.q) + Math.abs(tile.r) < 6 || Math.abs(tile.q) + Math.abs(tile.r) > 15)
        continue;
      campTile = { q: tile.q, r: tile.r, level: tile.level };
      break;
    }
    expect(campTile).not.toBeNull();
    if (!campTile) throw new Error('campTile required');
    const ct = campTile;
    const camp = spawnBarbarianCamp(game.world, {
      factionId: 'barbarian-camp-1',
      q: ct.q,
      r: ct.r,
      level: ct.level,
      hp: 50,
      archetype: 'orc',
    });

    // Footman adjacent → player is the proximity-credited clearer.
    createCharacter({
      world: game.world,
      role: 'Footman',
      q: ct.q + 1,
      r: ct.r,
      level: ct.level,
      factionOverride: 'player',
    });

    // Zero camp HP + tick.
    camp.set(Health, { current: 0, max: 50 });
    runEconomyTick(game, 1);

    // At least one Discovery granted (depends on pool availability).
    expect(game.research.purchased.size).toBeGreaterThanOrEqual(startingPurchased + 1);
  });
});
