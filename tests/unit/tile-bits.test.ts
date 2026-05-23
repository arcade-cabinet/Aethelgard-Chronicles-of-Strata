import { describe, expect, it } from 'vitest';
import { biomeOf, clearBit, hasBit, packBiome, setBit, setControlled, TILE_BIT } from '@/rules';

describe('tile bitmask (M_ARCHETYPE.7)', () => {
  it('setBit + hasBit round-trip a single flag', () => {
    const a = setBit(0, TILE_BIT.WALKABLE);
    expect(hasBit(a, TILE_BIT.WALKABLE)).toBe(true);
    expect(hasBit(a, TILE_BIT.HAS_RESOURCE)).toBe(false);
  });

  it('clearBit removes only the targeted flag', () => {
    const a = setBit(setBit(0, TILE_BIT.WALKABLE), TILE_BIT.HAS_BUILDING);
    const b = clearBit(a, TILE_BIT.WALKABLE);
    expect(hasBit(b, TILE_BIT.WALKABLE)).toBe(false);
    expect(hasBit(b, TILE_BIT.HAS_BUILDING)).toBe(true);
  });

  it('setControlled writes the 2-bit faction field idempotently', () => {
    const player = setControlled(0, 1);
    expect((player & TILE_BIT.CONTROLLED_MASK) >> 2).toBe(1);
    const enemy = setControlled(player, 2);
    expect((enemy & TILE_BIT.CONTROLLED_MASK) >> 2).toBe(2);
    const none = setControlled(enemy, 0);
    expect((none & TILE_BIT.CONTROLLED_MASK) >> 2).toBe(0);
  });

  it('packBiome + biomeOf round-trip a 3-bit biome index', () => {
    const a = packBiome(0, 5);
    expect(biomeOf(a)).toBe(5);
    // does not clobber other flags
    const b = setBit(a, TILE_BIT.WALKABLE);
    expect(biomeOf(b)).toBe(5);
    expect(hasBit(b, TILE_BIT.WALKABLE)).toBe(true);
  });

  it('flags are mutually independent — no collisions', () => {
    const a = setBit(
      setBit(setBit(packBiome(0, 4), TILE_BIT.WALKABLE), TILE_BIT.HAS_RESOURCE),
      TILE_BIT.IS_RAMP,
    );
    expect(biomeOf(a)).toBe(4);
    expect(hasBit(a, TILE_BIT.WALKABLE)).toBe(true);
    expect(hasBit(a, TILE_BIT.HAS_RESOURCE)).toBe(true);
    expect(hasBit(a, TILE_BIT.IS_RAMP)).toBe(true);
    expect(hasBit(a, TILE_BIT.HAS_BUILDING)).toBe(false);
  });
});
