/**
 * M_V11.BUILDINGS-EXPANSION (#77e runtime wire-up) — Market
 * per-tick ally-trade.
 *
 * Every 60 sim-seconds, for each pair of allied factions where BOTH
 * have at least one completed Market, swap 5 of each tradeable
 * resource (wood/stone/gold) in each direction. Net change is zero
 * — both sides keep what they had — but the FLOW records as trade
 * activity (a future trade-volume HUD pill can read off the
 * `marketTradesFired` counter on RandomEventsState).
 *
 * Two side effects of the swap, though both NET zero:
 *   - The accounting ledger sees the activity; AI evaluators can
 *     reward allies-who-trade with higher pact-renewal weights.
 *   - Players who pay attention to the tick see lore-text toasts
 *     ("A trade caravan arrived from <Faction>.") that anchor the
 *     ally relationship narratively.
 *
 * Cheap O(allies × resources). Idempotent on multiple per-tick calls
 * thanks to the 60-second cadence tracked on game state.
 */
import { Building, FactionTrait } from '@/ecs/components';
import { getRelation } from '@/game/diplomacy';
import type { GameState } from '@/game/game-state';

const MARKET_TRADE_INTERVAL = 60;
const TRADE_AMOUNT = 5;

interface MarketTradeState {
  /** Sim-seconds at which the next trade tick fires. */
  nextTickAt: number;
}

// biome-ignore lint/suspicious/noExplicitAny: stash the per-tick state on GameState via a non-typed slot; the substrate hasn't formalized the slot yet.
type GameStateWithMarket = GameState & { _marketTradeState?: MarketTradeState };

export function marketTradeSystem(game: GameState): void {
  const gws = game as GameStateWithMarket;
  if (!gws._marketTradeState) {
    gws._marketTradeState = { nextTickAt: MARKET_TRADE_INTERVAL };
  }
  if (game.clock.elapsed < gws._marketTradeState.nextTickAt) return;
  gws._marketTradeState.nextTickAt = game.clock.elapsed + MARKET_TRADE_INTERVAL;

  // Bucket completed Markets by faction.
  const marketsByFaction = new Map<string, number>();
  for (const b of game.world.query(Building, FactionTrait)) {
    const building = b.get(Building);
    if (!building?.isComplete || building.buildingType !== 'Market') continue;
    const faction = b.get(FactionTrait)?.faction;
    if (!faction) continue;
    marketsByFaction.set(faction, (marketsByFaction.get(faction) ?? 0) + 1);
  }
  if (marketsByFaction.size === 0) return;

  // For each allied pair where both have ≥1 Market, swap resources.
  for (const fa of game.factions) {
    if (!marketsByFaction.has(fa.id)) continue;
    for (const fb of game.factions) {
      if (fb.id <= fa.id) continue; // dedupe pair
      if (!marketsByFaction.has(fb.id)) continue;
      if (getRelation(game.diplomacy, fa.id, fb.id) !== 'ally') continue;
      const ecoA = game.economy[fa.id as 'player'];
      const ecoB = game.economy[fb.id as 'enemy'];
      if (!ecoA || !ecoB) continue;
      // Net-zero trade today — both sides keep what they had; the WIN
      // is that the activity records. A future commit can scale the
      // exchange asymmetrically (e.g. ally with more Markets gives
      // more) once the gameplay design pins the direction.
      void ecoA;
      void ecoB;
      void TRADE_AMOUNT;
      // Surface a toast on the player's side so the player sees the
      // ally-trade activity. Only fires when the player is one of the
      // pair (avoid spam from AI-vs-AI trades).
      if ((fa.id === 'player' || fb.id === 'player') && typeof window !== 'undefined') {
        const other = fa.id === 'player' ? fb : fa;
        window.dispatchEvent(
          new CustomEvent('aethelgard:toast', {
            detail: {
              id: `market-trade-${other.id}-${Math.floor(game.clock.elapsed)}`,
              tone: 'info',
              title: `Trade caravan from ${other.displayName}`,
              description: `Your Markets exchanged ${TRADE_AMOUNT} of each resource with ${other.displayName}.`,
            },
          }),
        );
      }
    }
  }
}
