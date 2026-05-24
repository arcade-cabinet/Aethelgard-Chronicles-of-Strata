import { z } from 'zod';
import type { ResourceCost } from '@/game/economy';
import discoveriesJson from './discoveries.json';

/**
 * M_FUN.FOUNDATION.ZOD-CONFIG — Zod-validated typed accessor for
 * `discoveries.json`. Catches a malformed effect dispatch at module
 * load instead of when the player clicks an unlock.
 */

// ResourceCost is a Partial<Record<ResourceType, number>> in game
// code — every key optional. Discovery rows specify only the
// resources they cost (e.g. {stone:100, gold:150}).
const ResourceCostSchema = z.object({
  wood: z.number().int().nonnegative().optional(),
  stone: z.number().int().nonnegative().optional(),
  gold: z.number().int().nonnegative().optional(),
  science: z.number().int().nonnegative().optional(),
  mana: z.number().int().nonnegative().optional(),
});

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

interface DiscoveriesConfig {
  discoveries: DiscoveryConfig[];
}

/** The full discoveries table — loaded from JSON, Zod-validated here. */
const _validated = DiscoveriesConfigSchema.parse(discoveriesJson);
export const DISCOVERIES_CONFIG: DiscoveriesConfig = _validated as unknown as DiscoveriesConfig;
