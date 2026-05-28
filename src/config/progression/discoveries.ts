import { z } from 'zod';
import { resourceCostSchema } from '@/config/schema';
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
const ResourceCostSchema = resourceCostSchema(RESOURCE_TYPES);

const DiscoveryEffectSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('buff-combatant'),
    stat: z.enum(['attackDamage', 'attackRange', 'hp']),
    delta: z.number(),
    // M_V12.DEPTH.EFFECT-KINDS — optional unitType filter so a
    // buff applies to a class subset (e.g. infantry-only).
    filter: z.string().optional(),
  }),
  z.object({
    kind: z.literal('multiply-harvest'),
    factor: z.number().positive(),
  }),
  // M_V7.DISCOVERY-TREE.V6 — generic "flag" effect for Discoveries
  // that gate downstream systems (trade-route gates DIPLO.TRADE,
  // cartography gates reveal logic, etc) — no immediate apply effect;
  // consumers check research.purchased.has(id) at their own call site.
  z.object({
    kind: z.literal('flag'),
  }),
  // M_V12.DEPTH.EFFECT-KINDS — v0.12 effect kinds (see
  // docs/design/v0.12-upgrade-graph.md "Effect kinds").
  z.object({
    kind: z.literal('buff-building'),
    buildingType: z.string(),
    stat: z.enum(['hp', 'dps', 'output']),
    delta: z.number(),
  }),
  z.object({
    kind: z.literal('unlock-unit'),
    unitType: z.string(),
    fromBuildingType: z.string().optional(),
  }),
  z.object({
    kind: z.literal('unlock-building'),
    buildingType: z.string(),
  }),
  z.object({
    kind: z.literal('unlock-formation'),
    formationId: z.string(),
  }),
  z.object({
    kind: z.literal('modify-cost'),
    target: z.enum(['unit', 'building']),
    targetId: z.string(),
    resource: z.enum(['wood', 'stone', 'gold', 'food']),
    delta: z.number(),
  }),
  z.object({
    kind: z.literal('modify-supply'),
    delta: z.number(),
  }),
  z.object({
    kind: z.literal('reveal-tier'),
    tier: z.number().int().nonnegative(),
  }),
  z.object({
    kind: z.literal('grant-resource'),
    resource: z.enum(['wood', 'stone', 'gold', 'food']),
    amount: z.number().int(),
  }),
]);

/**
 * M_V13.HUD.CHAIN-FIELD — the upgrade chain a Discovery belongs to.
 * Was previously parsed at render time from the description prefix
 * (brittle string-matching in DiscoveriesPanel); now a typed,
 * Zod-validated field on the data so a typo'd / missing chain fails at
 * module load instead of silently bucketing into "Other".
 */
export const DISCOVERY_CHAINS = [
  'economy',
  'military',
  'diplomacy',
  'magic',
  'engineering',
  'lore',
  'formations',
  'misc',
] as const;
export type DiscoveryChain = (typeof DISCOVERY_CHAINS)[number];
const DiscoveryChainSchema = z.enum(DISCOVERY_CHAINS);

const DiscoveryConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  chain: DiscoveryChainSchema,
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
  | {
      kind: 'buff-combatant';
      stat: 'attackDamage' | 'attackRange' | 'hp';
      delta: number;
      filter?: string | undefined;
    }
  | { kind: 'multiply-harvest'; factor: number }
  | { kind: 'flag' }
  // M_V12.DEPTH.EFFECT-KINDS — v0.12 additions.
  | { kind: 'buff-building'; buildingType: string; stat: 'hp' | 'dps' | 'output'; delta: number }
  | { kind: 'unlock-unit'; unitType: string; fromBuildingType?: string | undefined }
  | { kind: 'unlock-building'; buildingType: string }
  | { kind: 'unlock-formation'; formationId: string }
  | {
      kind: 'modify-cost';
      target: 'unit' | 'building';
      targetId: string;
      resource: 'wood' | 'stone' | 'gold' | 'food';
      delta: number;
    }
  | { kind: 'modify-supply'; delta: number }
  | { kind: 'reveal-tier'; tier: number }
  | { kind: 'grant-resource'; resource: 'wood' | 'stone' | 'gold' | 'food'; amount: number };

/** A Discovery configuration row — pure data, no behavior. */
export interface DiscoveryConfig {
  /** Stable id used in save state + the HUD. */
  id: string;
  /** Player-facing name. */
  name: string;
  /** Upgrade chain this Discovery belongs to (HUD grouping + filtering). */
  chain: DiscoveryChain;
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
