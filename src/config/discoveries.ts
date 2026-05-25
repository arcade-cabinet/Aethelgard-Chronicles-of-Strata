import { z } from 'zod';
import { RESOURCE_TYPES } from '@/ecs/components';
import type { ResourceCost } from '@/game/economy';
import discoveriesJson from './discoveries.json';

/**
 * M_FUN.FOUNDATION.ZOD-CONFIG — Zod-validated typed accessor for
 * `discoveries.json`. Catches a malformed effect dispatch at module
 * load instead of when the player clicks an unlock.
 */

/**
 * ResourceCost Zod schema, BUILT from `RESOURCE_TYPES`. Adding a
 * 6th resource slot (`aether`, etc) means ONE entry in
 * `src/ecs/components.ts#RESOURCE_TYPES` — the schema picks it up
 * automatically. The prior implementation hand-listed
 * wood/stone/gold/science/mana, which silently broke the
 * "one slot = one line" archetype contract and caused a coderabbit
 * type-mismatch finding because the schema's inferred optionals
 * didn't structurally match `Partial<Record<ResourceType, number>>`.
 */
const ResourceCostSchema = z.object(
  Object.fromEntries(
    RESOURCE_TYPES.map((slot) => [slot, z.number().int().nonnegative().optional()]),
  ),
) as z.ZodType<ResourceCost>;

const DiscoveryEffectSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('buff-combatant'),
    stat: z.enum(['attackDamage', 'attackRange']),
    delta: z.number(),
  }),
  z.object({
    kind: z.literal('multiply-harvest'),
    factor: z.number().positive(),
  }),
]);

const DiscoveryConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  cost: ResourceCostSchema,
  prereqs: z.array(z.string()),
  effect: DiscoveryEffectSchema,
});

const DiscoveriesConfigSchema = z.object({
  discoveries: z.array(DiscoveryConfigSchema),
});

/**
 * Declarative Discovery effect (M_DATA.7). Each effect kind is dispatched to
 * a code handler in `src/rules/discovery-registry.ts` — adding a new effect
 * kind = (a) a new variant here + (b) a new case in the handler dispatch.
 * The CONFIG only describes WHAT the effect is; the CODE describes HOW it
 * mutates the world. Per the three-layer split: JSON = data, TS = code,
 * TSX = rendering.
 */
export type DiscoveryEffect =
  | { kind: 'buff-combatant'; stat: 'attackDamage' | 'attackRange'; delta: number }
  | { kind: 'multiply-harvest'; factor: number };

/** A Discovery configuration row — pure data, no behavior. */
export interface DiscoveryConfig {
  /** Stable id used in save state + the HUD. */
  id: string;
  /** Player-facing name. */
  name: string;
  /** One-line description shown in the HUD. */
  description: string;
  /** Resource cost — any slot map (typically gold/stone, future: science). */
  cost: ResourceCost;
  /** Other Discovery ids that must be purchased first; empty array = no prereqs. */
  prereqs: ReadonlyArray<string>;
  /** Declarative effect — dispatched to a handler in discovery-registry.ts. */
  effect: DiscoveryEffect;
}

/**
 * The full discoveries table — loaded from JSON, Zod-validated here.
 * Coderabbit MAJOR fix: replaced the prior `as unknown as
 * DiscoveriesConfig` cast (which defeated the point of Zod) with the
 * Zod-inferred type as the public export. The hand-written
 * `DiscoveriesConfig` interface stays as a backstop for callers that
 * imported it; it's structurally compatible with the inferred shape
 * (both expose the same `id/name/cost/effect/prereqs` keys).
 */
export type DiscoveriesConfigInferred = z.infer<typeof DiscoveriesConfigSchema>;
const _validated: DiscoveriesConfigInferred = DiscoveriesConfigSchema.parse(discoveriesJson);
export const DISCOVERIES_CONFIG: DiscoveriesConfigInferred = _validated;
