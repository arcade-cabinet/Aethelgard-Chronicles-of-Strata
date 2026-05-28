/**
 * config/schema — shared Zod schema builders for the JSON-validated
 * config accessors (M_V13.DECOMP.CONFIG-SCHEMA).
 *
 * The per-domain accessors (economy.ts, discoveries.ts, …) each parse
 * their JSON at module load. Several need the same shape — a
 * ResourceCost object keyed by the live resource-slot registry — but
 * derived their slot list from different sources (resources.json's
 * RESOURCE_IDS vs ecs/components' RESOURCE_TYPES). These builders
 * dedupe the *construction* of those schemas while leaving each
 * call-site to pass its own slot source, so a future unification of
 * the two registries is a one-line change here, not a re-derivation
 * spread across the config dir.
 */
import { z } from 'zod';
import type { ResourceCost } from '@/game/economy';

/**
 * A `z.enum` over a readonly resource-id array. Casts to the tuple
 * shape `z.enum` requires; an unknown / typo'd id in JSON fails parse
 * instead of slipping through as a bare string.
 */
export function resourceIdSchema(ids: readonly string[]) {
  return z.enum(ids as readonly [string, ...string[]]);
}

/**
 * A ResourceCost object schema: every slot in `slots` becomes an
 * optional non-negative integer. Builds from the passed slot list so
 * adding a slot to the source registry is automatically allowed
 * (the prior hand-listed schemas silently stripped unknown slots).
 */
export function resourceCostSchema(slots: readonly string[]): z.ZodType<ResourceCost> {
  return z.object(
    Object.fromEntries(slots.map((slot) => [slot, z.number().int().nonnegative().optional()])),
  ) as z.ZodType<ResourceCost>;
}
