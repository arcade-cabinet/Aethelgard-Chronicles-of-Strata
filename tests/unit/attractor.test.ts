import { describe, expect, it } from 'vitest';
import { generateBoard } from '@/core/board';
import { hexDistance } from '@/core/hex';
import { ATTRACTOR_GUARANTEE, ATTRACTOR_RADIUS, ensureAttractorResources } from '@/rules';
import { createMapPrng } from '@/core/rng';
import { spawnResourceNodes } from '@/world/resource-spawn';

describe('attractor map-gen contract (M8.6e, spec 102)', () => {
  it('guarantees resources up to what the biome pool allows', () => {
    const board = generateBoard('ancient-silver-forest');
    const rng = createMapPrng('attractor-test');
    // pick a GRASS tile as the attractor centre — GRASS biome supports both
    // wood and gold so at least one type must reach the guarantee
    const center = [...board.tiles.values()].find((t) => t.walkable && t.type === 'GRASS');
    if (!center) throw new Error('no GRASS tile');
    const attractorKey = `${center.q},${center.r}`;
    const nodes = ensureAttractorResources(board, attractorKey, center.q, center.r, [], rng);
    // total nodes near the attractor must be > 0 — the contract is doing work
    const nearby = nodes.filter(
      (n) => hexDistance(n.q, n.r, center.q, center.r) <= ATTRACTOR_RADIUS,
    );
    expect(nearby.length).toBeGreaterThan(0);
    // and counts never exceed the guarantee (the contract only tops up, never overshoots)
    for (const type of ['wood', 'stone', 'gold'] as const) {
      const n = nearby.filter((node) => node.resourceType === type).length;
      expect(n).toBeLessThanOrEqual(ATTRACTOR_GUARANTEE[type]);
    }
  });

  it('does not place a node on the attractor tile itself', () => {
    const board = generateBoard('ancient-silver-forest');
    const rng = createMapPrng('attractor-tile-test');
    const center = [...board.tiles.values()].find((t) => t.walkable);
    if (!center) throw new Error('no walkable tile');
    const attractorKey = `${center.q},${center.r}`;
    const nodes = ensureAttractorResources(board, attractorKey, center.q, center.r, [], rng);
    expect(nodes.some((n) => n.key === attractorKey)).toBe(false);
  });

  it('is idempotent — already-satisfied attractor adds nothing', () => {
    const board = generateBoard('ancient-silver-forest');
    const rng = createMapPrng('attractor-idem');
    const center = [...board.tiles.values()].find((t) => t.walkable);
    if (!center) throw new Error('no walkable tile');
    const attractorKey = `${center.q},${center.r}`;
    // start with the natural spawn — likely some nodes nearby already
    const initial = spawnResourceNodes(board, createMapPrng('seed'));
    const first = ensureAttractorResources(board, attractorKey, center.q, center.r, initial, rng);
    const second = ensureAttractorResources(board, attractorKey, center.q, center.r, first, rng);
    // a second pass on a satisfied attractor adds nothing — counts equal
    expect(second.length).toBe(first.length);
  });

  it('the guarantee table covers every resource type', () => {
    expect(ATTRACTOR_GUARANTEE.wood).toBeGreaterThan(0);
    expect(ATTRACTOR_GUARANTEE.stone).toBeGreaterThanOrEqual(0);
    expect(ATTRACTOR_GUARANTEE.gold).toBeGreaterThanOrEqual(0);
    expect(ATTRACTOR_RADIUS).toBeGreaterThan(0);
  });
});
