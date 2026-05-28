import type { World } from 'koota';
import type { DiscoveryChain } from '@/config/progression';
import type { ResourceCost, GameEconomy } from '@/game/economy';

/**
 * M_V12.DEPTH.EFFECT-KINDS — extended apply context.
 *
 * v0.11 effect kinds (buff-combatant, multiply-harvest, flag) only
 * needed the ECS world. The v0.12 effect kinds (buff-building,
 * unlock-unit, unlock-building, unlock-formation, modify-cost,
 * modify-supply, reveal-tier, grant-resource) need wider state:
 * the player's GameEconomy (for grant-resource / modify-supply),
 * the ResearchState's flag map (for unlock-formation / reveal-tier),
 * a mutable building-profile override map (for buff-building +
 * unlock-unit + unlock-building cost edits).
 *
 * Apply receives this OPTIONAL context. v0.11 kinds ignore ctx;
 * v0.12 kinds read it. Callers that don't have the wider state
 * (e.g. the camp-reward grant pre-game world) pass undefined and
 * v0.12-kind effects silently no-op there — they'd need the game
 * loop to be live anyway.
 */
export interface DiscoveryApplyCtx {
  /** The player's economy — for grant-resource, modify-supply. */
  economy?: GameEconomy;
  /** Research state — for flag writes (reveal-tier sets `revealTier`). */
  flags?: Map<string, number | string | boolean>;
  /**
   * Building-profile runtime override map — keyed by buildingType.
   * Contract: `cost` is a PARTIAL override; consumers (commands.ts
   * build-system) MUST shallow-merge with the default building
   * cost rather than replacing the whole object. A modify-cost
   * effect that touches gold leaves wood/stone defaults intact.
   */
  buildingOverrides?: Map<
    string,
    {
      hp?: number;
      dps?: number;
      output?: number;
      /** Per-resource delta; merge with default cost — do NOT replace. */
      cost?: Partial<ResourceCost>;
      trainsUnits?: string[];
      constructible?: boolean;
    }
  >;
  /**
   * M_V12.DEPTH.EFFECT-KINDS — unit-profile override map for
   * `modify-cost` effects with `target: 'unit'`. Mirrors
   * buildingOverrides but for trainable units. Consumed at
   * train time.
   */
  unitOverrides?: Map<string, { cost?: ResourceCost }>;
}

/**
 * Discoveries (M_DATA.7 / spec 102) — the tech-tree archetype. Each Discovery
 * is a single config row: an id, cost (any slots — typically science +
 * possibly gold/stone), prereqs, and an `apply(world)` effect that mutates
 * ECS state (raise unit damage, gather rate, unlock a unit/building, etc).
 *
 * Adding a Discovery = adding a row HERE. No code branches anywhere else.
 * This generalizes the prior 2-item `research.ts` into the proper archetype
 * the spec calls for.
 *
 * Costs scale logarithmically by depth in the prereq DAG so complexity ramps
 * naturally as a match progresses (computed elsewhere — the static `cost`
 * here is the BASE cost; runtime multipliers may layer on later).
 */
export interface Discovery {
  /** Stable id used in save state + the HUD. */
  id: string;
  /** Player-facing name. */
  name: string;
  /** Upgrade chain (HUD grouping/filtering) — from the config `chain` field. */
  chain: DiscoveryChain;
  /** One-line description of what the Discovery does in-game. */
  description: string;
  /** Resource cost — typically a science component. */
  cost: ResourceCost;
  /** Other Discovery ids that must be purchased first; empty = no prereqs. */
  prereqs?: ReadonlyArray<string>;
  /** Effect — invoked once when the Discovery is purchased. ctx
   *  is optional; v0.11 effect kinds (buff-combatant, multiply-
   *  harvest, flag) ignore it. v0.12 effect kinds (see
   *  DiscoveryApplyCtx docstring) read it for wider game state. */
  apply: (world: World, ctx?: DiscoveryApplyCtx) => void;
}
