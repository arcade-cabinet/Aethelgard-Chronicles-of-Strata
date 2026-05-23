/**
 * Discovery cost scaling (M_FEATURE.2). The JSON-declared `cost` is the
 * BASE — actual purchase cost scales by the Discovery's depth in the prereq
 * DAG so complexity ramps as a match progresses. A root Discovery (no
 * prereqs) pays base; a 3-deep Discovery pays base × (1 + log₂(1 + 3)) =
 * base × 3.
 *
 * Pure rules-layer helpers — no ECS, no koota. Consumers (the Discoveries
 * HUD panel + the research command) call `scaledCostFor(id)` instead of
 * reading `discovery.cost` directly.
 */
import type { ResourceCost } from '@/game/economy';
import { RESOURCE_TYPES } from '@/ecs/components';
import { DISCOVERIES } from './discovery-registry';

/**
 * Depth of a Discovery in the prereq DAG. A root (no prereqs) is depth 0.
 * Memoised after first call so the BFS doesn't repeat per render frame.
 */
const depthCache = new Map<string, number>();

export function depthOf(id: string): number {
  const cached = depthCache.get(id);
  if (cached !== undefined) return cached;
  const seen = new Set<string>();
  const compute = (current: string, stack: Set<string>): number => {
    if (stack.has(current)) return 0; // cycle guard; treat as root
    const d = DISCOVERIES.find((x) => x.id === current);
    if (!d || !d.prereqs || d.prereqs.length === 0) return 0;
    stack.add(current);
    let max = 0;
    for (const p of d.prereqs) {
      const childDepth = 1 + compute(p, stack);
      if (childDepth > max) max = childDepth;
    }
    stack.delete(current);
    return max;
  };
  void seen;
  const d = compute(id, new Set());
  depthCache.set(id, d);
  return d;
}

/** Reset the depth cache — call from tests, never in runtime. */
export function _clearDepthCache(): void {
  depthCache.clear();
}

/**
 * Logarithmic scaling multiplier — depth 0 → 1.0, depth 1 → 2.0, depth 3 →
 * 3.0, depth 7 → 4.0. Picked so the early game's flat costs stay accessible
 * while the late tree forces real investment.
 */
export function scaleForDepth(depth: number): number {
  return 1 + Math.log2(1 + Math.max(0, depth));
}

/**
 * Resolve the actual (scaled) purchase cost for a Discovery. Base cost from
 * the JSON registry × `scaleForDepth(depthOf(id))`, rounded UP per slot so
 * a fractional scale never accidentally gives a free chunk.
 */
export function scaledCostFor(id: string): ResourceCost {
  const d = DISCOVERIES.find((x) => x.id === id);
  if (!d) return {};
  const mult = scaleForDepth(depthOf(id));
  const out: ResourceCost = {};
  for (const slot of RESOURCE_TYPES) {
    const base = d.cost[slot] ?? 0;
    if (base > 0) out[slot] = Math.ceil(base * mult);
  }
  return out;
}
