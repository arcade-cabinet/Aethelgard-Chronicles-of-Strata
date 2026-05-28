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
 *
 * CodeRabbit #91 (Major) — `z.enum` requires a NON-EMPTY tuple and
 * throws at construction on `[]`. The slot registries are never empty
 * in practice, but guard explicitly so a future empty/misloaded
 * registry fails with a clear message at module load instead of an
 * opaque Zod internal throw.
 */
export function resourceIdSchema(ids: readonly string[]) {
  if (ids.length === 0) {
    throw new Error('resourceIdSchema: slot registry is empty — z.enum requires ≥1 id');
  }
  return z.enum(ids as readonly [string, ...string[]]);
}

/**
 * A ResourceCost object schema: every slot in `slots` becomes an
 * optional non-negative integer.
 *
 * CodeRabbit #91 (Major) — `.strict()` so an unknown / typo'd resource
 * key in the JSON FAILS parse rather than being silently stripped by
 * z.object's default key-stripping. The whole point of this builder
 * (per the prior bug it replaced) is that the slot list is the single
 * source of truth; a JSON key outside it is an error to surface at
 * load, not to drop.
 */
export function resourceCostSchema(slots: readonly string[]): z.ZodType<ResourceCost> {
  return z
    .object(
      Object.fromEntries(slots.map((slot) => [slot, z.number().int().nonnegative().optional()])),
    )
    .strict() as unknown as z.ZodType<ResourceCost>;
}
