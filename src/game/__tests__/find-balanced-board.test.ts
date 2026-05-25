/**
 * M_FUN.MAP.TOPOLOGY.SCREENSHOTS (v0.5.A) — pin that the
 * findBalancedBoard re-roll loop produces a playable resource
 * biome variety on EVERY permutation, including the seed
 * corners that fail the raw-generateBoard biome audit.
 *
 * The biome-distribution-audit.test.ts exempts mike-november-oscar
 * × small for HIGHLAND+MOUNTAIN because the raw noise field on that
 * seed has no mountain mass. findBalancedBoard's new
 * hasBiomeVariety gate teaches the loop to re-roll on resource-
 * biome floor too (not just centre-edge reachability), so the
 * SAME seed produces a different (still-deterministic) board that
 * has the resource biomes the game needs.
 */
import { describe, expect, it } from 'vitest';
import { findBalancedBoard } from '../mapgen-helpers';

const MAP_TYPES = ['balanced', 'continent', 'archipelago', 'dry-land'] as const;
const MAP_SIZES: Record<string, number> = { small: 18, medium: 28, large: 36 };
const SEEDS = [
  'alpha-bravo-charlie',
  'delta-echo-foxtrot',
  'golf-hotel-india',
  'juliet-kilo-lima',
  'mike-november-oscar',
];

describe('findBalancedBoard biome-variety gate', () => {
  for (const mapType of MAP_TYPES) {
    for (const [sizeName, radius] of Object.entries(MAP_SIZES)) {
      for (const seed of SEEDS) {
        it(`${mapType} × ${sizeName} × seed="${seed}" yields ≥1 each of FOREST + stone`, () => {
          const board = findBalancedBoard(seed, radius, mapType);
          let forest = 0;
          let stone = 0;
          for (const tile of board.tiles.values()) {
            if (tile.type === 'FOREST') forest++;
            else if (tile.type === 'HIGHLAND' || tile.type === 'MOUNTAIN') stone++;
          }
          // dry-land is desert-blanketed; FOREST is intentionally
          // absent. Stone biomes (HIGHLAND/MOUNTAIN) still need to
          // exist on every map so stone nodes can spawn.
          if (mapType !== 'dry-land') {
            expect.soft(forest, `${mapType}/${sizeName}/${seed} FOREST count`).toBeGreaterThanOrEqual(5);
          }
          expect.soft(stone, `${mapType}/${sizeName}/${seed} HIGHLAND+MOUNTAIN count`).toBeGreaterThanOrEqual(3);
        });
      }
    }
  }
});
