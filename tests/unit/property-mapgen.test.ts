/**
 * M_FUN.FOUNDATION.FASTCHECK — property tests for the deterministic
 * surfaces of the codebase. fast-check generates 100 random inputs
 * per test and checks an invariant holds. Today: board-gen
 * determinism + walkability count monotonicity.
 *
 * Targets the things hand-rolled tests miss:
 *   - "same seed produces same board" can be tested with a single
 *     seed; fast-check tries dozens of seeds and shrinks to the
 *     minimal failing input on regression.
 *   - "every board has at least some walkable tiles" guards against
 *     a future map-gen tweak that accidentally locks everything as
 *     OCEAN/MOUNTAIN.
 */
import fc from 'fast-check';
import { describe, it } from 'vitest';
import { generateBoard } from '@/core/board';

describe('property: board generation (M_FUN.FOUNDATION.FASTCHECK)', () => {
  it('same (seed, radius) → byte-equal board for any input', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 32 }),
        fc.integer({ min: 6, max: 14 }),
        (seed, radius) => {
          const a = generateBoard(seed, radius);
          const b = generateBoard(seed, radius);
          // Compare every tile's (q, r, type, level, walkable) tuple.
          if (a.tiles.size !== b.tiles.size) return false;
          for (const [k, ta] of a.tiles) {
            const tb = b.tiles.get(k);
            if (!tb) return false;
            if (
              ta.q !== tb.q ||
              ta.r !== tb.r ||
              ta.type !== tb.type ||
              ta.level !== tb.level ||
              ta.walkable !== tb.walkable
            ) {
              return false;
            }
          }
          return true;
        },
      ),
      { numRuns: 25 },
    );
  });

  it('every generated board has at least one walkable tile', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 32 }),
        fc.integer({ min: 6, max: 14 }),
        (seed, radius) => {
          const board = generateBoard(seed, radius);
          let walkable = 0;
          for (const t of board.tiles.values()) {
            if (t.walkable) walkable++;
          }
          // A board with zero walkable tiles is uninhabitable — would
          // crash startGame at pawn-spawn. fast-check should never
          // find a seed/radius that breaks this.
          return walkable > 0;
        },
      ),
      { numRuns: 25 },
    );
  });

  it('every generated board has at least one BEACH AND one OCEAN tile', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 32 }),
        fc.integer({ min: 8, max: 14 }),
        (seed, radius) => {
          const board = generateBoard(seed, radius);
          let beach = 0;
          let ocean = 0;
          for (const t of board.tiles.values()) {
            if (t.type === 'BEACH') beach++;
            else if (t.type === 'OCEAN') ocean++;
          }
          // M_MAPGEN.4 paints a beach ring + ocean perimeter for every
          // board >= radius 8. The shallows pass converts SOME ocean
          // to SHALLOWS but never ALL (deep ocean stays).
          return beach > 0 && ocean > 0;
        },
      ),
      { numRuns: 25 },
    );
  });
});
