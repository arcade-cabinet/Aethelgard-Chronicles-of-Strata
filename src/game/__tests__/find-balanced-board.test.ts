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
import { createMapPrng } from '@/core/rng';
import { spawnResourceNodes } from '@/world/board';
import { findBalancedBoard } from '../utilities/mapgen-helpers';

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
        it(`${mapType} × ${sizeName} × seed="${seed}" produces a playable
            board with harvestable wood + stone nodes`, () => {
          // Coderabbit MAJOR — assert spec-level outcomes (the
          // resource-spawn pass yields harvestable wood + stone
          // nodes) rather than the implementation-internal tile
          // count floors. The original assertion mirrored the
          // findBalancedBoard re-roll threshold (5 FOREST, 3 stone)
          // which made the test redundant with the loader; this
          // form pins the player-facing CONTRACT — a map produced
          // by findBalancedBoard is playable because peons can find
          // wood (FOREST source) + stone (HIGHLAND/MOUNTAIN source).
          // dry-land is desert-blanketed; FOREST is intentionally
          // absent. Stone is still required so the WALL recipe is
          // satisfiable end-to-end.
          const board = findBalancedBoard(seed, radius, mapType);
          const mapRng = createMapPrng(`${seed}-spawn-check`);
          const nodes = spawnResourceNodes(board, mapRng, []);
          const woodNodes = nodes.filter((n) => n.resourceType === 'wood');
          const stoneNodes = nodes.filter((n) => n.resourceType === 'stone');
          if (mapType !== 'dry-land') {
            expect
              .soft(woodNodes.length, `${mapType}/${sizeName}/${seed} wood-node count`)
              .toBeGreaterThanOrEqual(1);
          }
          expect
            .soft(stoneNodes.length, `${mapType}/${sizeName}/${seed} stone-node count`)
            .toBeGreaterThanOrEqual(1);
        });
      }
    }
  }
});
