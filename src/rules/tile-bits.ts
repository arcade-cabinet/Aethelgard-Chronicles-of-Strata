/**
 * Per-tile bitmask layout (M_ARCHETYPE.7). Packs every per-tile flag into a
 * single u32 so a board of N tiles is N×4 bytes — a 41-radius board's
 * ~5000 tiles fits in 20 KB. Force-field sampling and HUD overlays become
 * pointer-arithmetic over a contiguous buffer.
 *
 * Bit layout (LSB to MSB):
 *   0           walkable
 *   1           crossingLanding
 *   2-3         controlled  (00 = none, 01 = player, 10 = enemy)
 *   4-5         observed    (00 = none, 01 = player, 10 = enemy, 11 = both)
 *   6-7         pulsing     (00 = none, 01 = player, 10 = enemy)
 *   8           hasResource
 *   9           hasBuilding
 *   10          isRamp
 *   11-13       biomeIndex  (0..7 — OCEAN/LAKE/BEACH/DESERT/GRASS/FOREST/HIGHLAND/MOUNTAIN)
 *   14-15       spare (reserved for future Gate / Mover overlays)
 *   16-31       spare (reserved)
 */

/** Bit masks for the packed flags. */
export const TILE_BIT = {
  WALKABLE: 1 << 0,
  CROSSING_LANDING: 1 << 1,
  CONTROLLED_MASK: 0b11 << 2,
  CONTROLLED_PLAYER: 0b01 << 2,
  CONTROLLED_ENEMY: 0b10 << 2,
  OBSERVED_MASK: 0b11 << 4,
  OBSERVED_PLAYER: 0b01 << 4,
  OBSERVED_ENEMY: 0b10 << 4,
  PULSING_MASK: 0b11 << 6,
  PULSING_PLAYER: 0b01 << 6,
  PULSING_ENEMY: 0b10 << 6,
  HAS_RESOURCE: 1 << 8,
  HAS_BUILDING: 1 << 9,
  IS_RAMP: 1 << 10,
  BIOME_MASK: 0b111 << 11,
  BIOME_SHIFT: 11,
} as const;

/** Get the biome index (0..7) packed in `bits`. */
export function biomeOf(bits: number): number {
  return (bits & TILE_BIT.BIOME_MASK) >> TILE_BIT.BIOME_SHIFT;
}

/** Pack a biome index into the bits. */
export function packBiome(bits: number, biomeIndex: number): number {
  return (bits & ~TILE_BIT.BIOME_MASK) | ((biomeIndex & 0b111) << TILE_BIT.BIOME_SHIFT);
}

/** Test any boolean flag (single-bit). */
export function hasBit(bits: number, mask: number): boolean {
  return (bits & mask) !== 0;
}

/** Set a single-bit flag, returning the new bits. */
export function setBit(bits: number, mask: number): number {
  return bits | mask;
}

/** Clear a single-bit flag, returning the new bits. */
export function clearBit(bits: number, mask: number): number {
  return bits & ~mask;
}

/**
 * Set the two-bit controlled field. faction = 0 (none) | 1 (player) | 2 (enemy).
 * Returns the new bits.
 */
export function setControlled(bits: number, faction: 0 | 1 | 2): number {
  return (bits & ~TILE_BIT.CONTROLLED_MASK) | (faction << 2);
}
