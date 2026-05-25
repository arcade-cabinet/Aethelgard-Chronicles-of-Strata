/**
 * M_FUN.FOUNDATION.ZOD-CONFIG — resource-registry loader.
 *
 * The JSON in `resources.json` is the SINGLE source-of-truth for what
 * resource slots exist in the game, where each one is accumulated
 * FROM, and what consumes it. Every other module that touches
 * resources iterates this registry — no module hand-enumerates
 * wood/stone/gold/science/mana.
 *
 * Adding a 6th slot (e.g. `aether`) means ONE entry in
 * resources.json. The union type, every Partial<Record<…>>, every
 * Zod cost schema, every HUD grid, every resource-spawn rule, every
 * AI evaluator picks it up automatically — that's the whole point
 * of the JSON-first archetype contract.
 */
import { z } from 'zod';
import resourcesJson from './resources.json';

/**
 * A source from which a resource accumulates. Three kinds for now:
 *   biome-node      — Peon-like unit harvests a node placed on the
 *                     specified biome types.
 *   passive-trickle — Slot accumulates per sim-second at the named
 *                     rate, optionally boosted by named buildings.
 *   event           — Reserved for future event-PRNG bonuses
 *                     (raid loot, quest reward, etc).
 */
const ResourceSourceSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('biome-node'),
    biomes: z.array(z.string()).min(1),
    harvester: z.string(),
    /**
     * Renderer hint — the overlay sprite/mesh used on tiles that
     * carry a node of this kind. Same resource can have DIFFERENT
     * overlayStyle per source (FOOD → "game-trail" on FOREST,
     * "fish-school" on SHALLOWS, "berry-bush" on GRASS), so the
     * player visually distinguishes WHICH source they're harvesting
     * even when the slot is identical.
     */
    overlayStyle: z.string(),
    /**
     * Optional asset path under public/assets/. SVG, PNG, GLTF, or
     * GLB — the renderer picks the loader from the extension. Lets
     * the JSON declare "this ore vein renders as
     * public/assets/overlays/ore-vein.svg" without any code edit;
     * mods can drop a swap-in by changing the path. Per the user's
     * "for resources would it make sense in some cases like ore to
     * have SVG files in public/assets that can be linked via JSON
     * like GLTFs" framing — yes, and this is the hook.
     */
    asset: z.string().optional(),
    /** Starting amount of the node deposit (Peons drain it over time). */
    yield: z.number().int().positive(),
    /**
     * Per-source human label. Optional — defaults to the resource's
     * own label. Used to surface "Game" / "Fish" / "Forage" on the
     * HUD tile tooltip so the player reads the kind, not the slot.
     */
    label: z.string().optional(),
    /**
     * Optional risks applied per harvest tick. The decision-track
     * shape — high yield + high cost. peat harvests 1.4× faster
     * than wood but applies DoT (disease). Highland ore applies
     * fatigue. Quicksand (rare beach swirl) applies BOTH disease
     * AND fatigue but yields the rarest crafting reagent.
     * Renaissance-era Discoveries unlock per-risk mitigations
     * ('peat-mask', 'reinforced-pick', etc) that REMOVE that
     * specific attribute; mixed-risk tiles can be partially
     * de-risked by unlocking one mitigation but not the other.
     * Array form so a tile can carry multiple attribute taxes
     * without complecting the per-resource schema.
     */
    risks: z
      .array(
        z.object({
          attribute: z.enum(['disease', 'fatigue', 'dehydration']),
          strength: z.number().nonnegative(),
          unlockedBy: z.string().optional(),
        }),
      )
      .optional(),
    /**
     * Multiplier on the resource yield per harvest tick. 1.0 =
     * baseline. peat-from-swamp yields 1.4× food/sec to offset its
     * disease DoT; gold-glints are tiny but high per-deposit.
     */
    yieldRateMul: z.number().positive().optional(),
  }),
  z.object({
    kind: z.literal('passive-trickle'),
    rate: z.number().nonnegative(),
    boostedBy: z.array(z.string()).optional(),
  }),
  z.object({
    kind: z.literal('event'),
    eventId: z.string(),
  }),
]);

/** A consumer that spends a resource. */
const ResourceConsumerSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('building'), types: z.array(z.string()).min(1) }),
  z.object({ kind: z.literal('unit'), types: z.array(z.string()).min(1) }),
  z.object({ kind: z.literal('road'), style: z.string() }),
  z.object({ kind: z.literal('discovery'), scope: z.enum(['all', 'select']) }),
  z.object({ kind: z.literal('event'), eventId: z.string() }),
  /**
   * Per-unit passive consumption (M_FUN.ECON.UPKEEP). FOOD slot uses
   * this so a faction with 30 supply units burns ~0.3 food/sec
   * (defaults to perUnit: 0.01). When food hits 0 the upkeep system
   * (future) starts starving units instead of letting them grow
   * indefinitely.
   */
  z.object({ kind: z.literal('unit-upkeep'), perUnit: z.number().nonnegative() }),
]);

const ResourceConfigSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  kind: z.enum(['harvest', 'passive']),
  /** Single-glyph emoji used in HUD pills + tooltips. */
  icon: z.string().optional(),
  /**
   * `true` means the resource has no concrete world referent (mana,
   * science, etc — abstract concepts). Renderer falls back to a
   * glyph/aura representation instead of trying to load a mesh from
   * the source's `asset` path. Per the user's "some resources will
   * not be something like a tree and would require... more abstract
   * identification basically" framing — this is the abstract bit.
   * `false` (default) means concrete: render via overlayStyle +
   * asset path (mesh, sprite, particle).
   */
  abstract: z.boolean().optional(),
  /**
   * HUD render colour (CSS hex). Drives the resource-bar pill +
   * floating "+N <resource>" popup tint. Optional — falls back to a
   * neutral grey if absent. Coderabbit + simplifier reviewer QW-3.
   */
  color: z.string().optional(),
  /**
   * Per-attractor (TownHall) minimum guarantee: when the map gen
   * lays the attractor's resource ring, it tops up to this count of
   * this slot's nodes within ATTRACTOR_RADIUS. Defaults to 0 (no
   * guaranteed nodes — extending into the slot is the player's job).
   * Coderabbit + simplifier reviewer QW-2.
   */
  attractorGuarantee: z.number().int().nonnegative().optional(),
  /**
   * M_FUN.ECON.PROFILES — visual + spawn metadata that used to live
   * hand-coded in src/rules/resource-profiles.ts. Moving it into the
   * JSON-first registry collapses the double-bookkeeping the user
   * flagged: "aren't resource profiles an anti-pattern that should
   * be expressed in JSON?". The TS file is now a derive-from-JSON
   * accessor.
   */
  mesh: z
    .object({
      /** Logical asset id used by ResourceNodes / spawn pass. */
      logicalId: z.string(),
      /** Optional tint hex applied at render. */
      tint: z.string().optional(),
    })
    .optional(),
  /** Starting amount the attractor-topup pass seeds when adding a
   * guaranteed-near-base node of this resource (separate from
   * sources[].yield, which is per-harvest). */
  topupAmount: z.number().nonnegative().optional(),
  sources: z.array(ResourceSourceSchema).min(1),
  consumers: z.array(ResourceConsumerSchema),
});

const ResourcesConfigSchema = z.object({
  resources: z.array(ResourceConfigSchema).min(1),
});

export type ResourceSource = z.infer<typeof ResourceSourceSchema>;
export type ResourceConsumer = z.infer<typeof ResourceConsumerSchema>;
export type ResourceConfig = z.infer<typeof ResourceConfigSchema>;

// Strip $comment keys before validation (JSON-file documentation only).
function stripComments(input: unknown): unknown {
  if (Array.isArray(input)) return input.map(stripComments);
  if (input && typeof input === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (k === '$comment') continue;
      out[k] = stripComments(v);
    }
    return out;
  }
  return input;
}

const _validated = ResourcesConfigSchema.parse(stripComments(resourcesJson));

/** The full ordered resource registry. */
export const RESOURCES: ReadonlyArray<ResourceConfig> = _validated.resources;

/** Resource ids as a const tuple — drives the `ResourceType` union. */
export const RESOURCE_IDS = RESOURCES.map((r) => r.id) as readonly string[];

/** Resolve the source list for a given resource id. */
export function sourcesFor(id: string): ReadonlyArray<ResourceSource> {
  return RESOURCES.find((r) => r.id === id)?.sources ?? [];
}

/** Resolve the consumer list for a given resource id. */
export function consumersFor(id: string): ReadonlyArray<ResourceConsumer> {
  return RESOURCES.find((r) => r.id === id)?.consumers ?? [];
}

/** Quick lookup: is `slot` a recognised resource? */
export function isResourceId(slot: string): boolean {
  return RESOURCE_IDS.includes(slot);
}
