import type { ResourceCost } from '@/game/economy';
import discoveriesJson from './discoveries.json';

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

/** The full discoveries table — loaded from JSON, typed here. */
export const DISCOVERIES_CONFIG: DiscoveriesConfig = discoveriesJson as DiscoveriesConfig;
