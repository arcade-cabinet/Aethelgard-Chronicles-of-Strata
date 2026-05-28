/**
 * M_V6.DIPLO.TRADE — wood/stone/gold 1:1 resource swap between factions.
 *
 * Gated behind a Discovery `trade-route` (consumes one Discovery slot
 * — the directive's "later-tier" framing). Per-pair cooldown prevents
 * spamming trades during a short timing window. Symmetric: either side
 * may initiate; both eco rows are mutated atomically.
 *
 * v0.6 substrate ships the helper + cooldown state. The Radix popover
 * UI that wires the helper to a chip-click is a follow-up polish item.
 */
import type { FactionId } from '@/config/ai';
import type { Faction } from '@/ecs/components';
import { type DiplomacyState, getRelation, relationKey } from './diplomacy';
import { addResource, type GameEconomy, spend } from './economy';

/** Tradeable resource slots (wood/stone/gold per directive). */
export type TradeResource = 'wood' | 'stone' | 'gold';

/** Per-pair trade cooldown in seconds — limits trade spam. */
export const TRADE_COOLDOWN_SECONDS = 20;

/** The trade-route Discovery id that gates the mechanic. */
export const TRADE_ROUTE_DISCOVERY_ID = 'trade-route';

/** Cooldown state: Map<relationKey, expiryClockSeconds>. */
export interface TradeCooldownState {
  cooldowns: Map<string, number>;
}

export function createTradeCooldownState(): TradeCooldownState {
  return { cooldowns: new Map() };
}

/**
 * Read the trade availability between two factions.
 *
 * Gates:
 *   - Same-id: rejected (can't trade with yourself).
 *   - Enemy relation: rejected (no trade during active war).
 *   - Cooldown active: rejected.
 *   - Discovery requirement is checked by the caller (UI knows about
 *     research state).
 */
export function isTradeAvailable(
  cooldowns: TradeCooldownState,
  diplomacy: DiplomacyState,
  a: FactionId,
  b: FactionId,
  nowSeconds: number,
): boolean {
  if (a === b) return false;
  if (getRelation(diplomacy, a, b) === 'enemy') return false;
  const expires = cooldowns.cooldowns.get(relationKey(a, b));
  if (expires !== undefined && nowSeconds < expires) return false;
  return true;
}

/**
 * Perform a 1:1 swap: `a` gives `aAmount` of `aResource` to `b`;
 * `b` gives `bAmount` of `bResource` to `a`. Atomically validates
 * affordability + spend on both sides; sets the cooldown on success.
 *
 * Returns true on success, false on validation / affordability failure
 * (no partial mutation in the false branch).
 *
 * `ecoOf` is a callback the caller supplies — the v0.6 GameEconomy is
 * still keyed by `Faction` (literal union 'player' | 'enemy'). The
 * callback lets test code stub a registry-keyed eco lookup; production
 * code passes `(f) => game.economy[f]`.
 */
export function performTrade(
  cooldowns: TradeCooldownState,
  diplomacy: DiplomacyState,
  a: FactionId,
  b: FactionId,
  aResource: TradeResource,
  aAmount: number,
  bResource: TradeResource,
  bAmount: number,
  nowSeconds: number,
  ecoOf: (faction: FactionId) => GameEconomy | undefined,
): boolean {
  if (!isTradeAvailable(cooldowns, diplomacy, a, b, nowSeconds)) return false;
  if (aAmount <= 0 || bAmount <= 0) return false;
  if (!Number.isFinite(aAmount) || !Number.isFinite(bAmount)) return false;
  const ecoA = ecoOf(a);
  const ecoB = ecoOf(b);
  if (!ecoA || !ecoB) return false;
  // Pre-validate both sides can afford their give-up.
  if (ecoA[aResource] < aAmount) return false;
  if (ecoB[bResource] < bAmount) return false;
  // Apply: spend on both, then addResource on both.
  const spendA = spend(ecoA, { [aResource]: aAmount } as Record<TradeResource, number>);
  if (!spendA) return false;
  const spendB = spend(ecoB, { [bResource]: bAmount } as Record<TradeResource, number>);
  if (!spendB) {
    // Roll back A — return the resource to keep state consistent.
    addResource(ecoA, aResource, aAmount);
    return false;
  }
  addResource(ecoB, aResource, aAmount);
  addResource(ecoA, bResource, bAmount);
  cooldowns.cooldowns.set(relationKey(a, b), nowSeconds + TRADE_COOLDOWN_SECONDS);
  return true;
}

// Re-export Faction so callers don't need a second import path.
export type { Faction };
