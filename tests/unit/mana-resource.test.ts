import { describe, expect, it } from 'vitest';
import { RESOURCE_TYPES } from '@/ecs/components';
import { addResource, canAfford, createEconomy, spend } from '@/game/economy';
import { resourceProfileFor } from '@/rules/resource-profiles';

/**
 * M_EXPANSION.F.72 — Mana, the 4th non-supply resource slot.
 * Validates the slot-iterating contract: mana flows through every
 * existing API (addResource, canAfford, spend) by virtue of being
 * a row in RESOURCE_TYPES + the corresponding Record<ResourceType, X>
 * tables. No system-side branches required.
 */
describe('M_EXPANSION.F.72 — Mana resource slot', () => {
  it('RESOURCE_TYPES includes mana', () => {
    expect(RESOURCE_TYPES).toContain('mana');
    // M_FUN.ECON.JSON-RESOURCES — RESOURCE_TYPES is derived from
    // src/config/resources.json. Today the registry carries 9 slots
    // (wood, stone, ore, gold, food, peat, science, mana, amber).
    // Adding a 10th slot bumps this assertion; the test pins that
    // the loader wires through correctly.
    expect(RESOURCE_TYPES.length).toBe(9);
  });

  it('fresh economy starts with mana=0 (per startingResources config)', () => {
    const eco = createEconomy();
    expect(eco.mana).toBe(0);
  });

  it('addResource("mana", N) accumulates correctly', () => {
    const eco = createEconomy();
    addResource(eco, 'mana', 10);
    expect(eco.mana).toBe(10);
    addResource(eco, 'mana', 5);
    expect(eco.mana).toBe(15);
  });

  it('canAfford detects insufficient mana', () => {
    const eco = createEconomy();
    expect(canAfford(eco, { mana: 1 })).toBe(false);
    addResource(eco, 'mana', 5);
    expect(canAfford(eco, { mana: 5 })).toBe(true);
    expect(canAfford(eco, { mana: 6 })).toBe(false);
  });

  it('spend deducts mana atomically', () => {
    const eco = createEconomy();
    addResource(eco, 'mana', 20);
    expect(spend(eco, { mana: 15 })).toBe(true);
    expect(eco.mana).toBe(5);
    // Insufficient → no-op, count unchanged.
    expect(spend(eco, { mana: 10 })).toBe(false);
    expect(eco.mana).toBe(5);
  });

  it('mana resource profile exists (placeholder for future scatter)', () => {
    const profile = resourceProfileFor('mana');
    expect(profile).toBeDefined();
    expect(profile.meshLogicalId).toBe('nature.rock.crystal-large');
    expect(profile.biomes.size).toBe(0); // not biome-spawned today
  });
});
