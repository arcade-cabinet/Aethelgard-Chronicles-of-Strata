/**
 * M_V7.ECONOMY.REGISTRY — `economyFor(game, factionId)` helper.
 *
 * Lives in its own module to dodge the circular-import constraint
 * between game-state.ts (defines GameState) and economy-tick-phases.ts
 * (the hottest consumer). The same pattern as the pre-existing inline-
 * `baseKeyFor` workaround in economy-tick-phases.ts.
 *
 * Routes legacy `'player'` / `'enemy'` ids to the compile-time-typed
 * `game.economy[id]` Record; N-player slots route to `game.economyExtra`
 * with lazy `createEconomy()` creation on first lookup. The v0.7 fix
 * for HIGH-1/2/3 from `docs/reviews/v0.7-cycle-opening.md` — tribute
 * cession + camp-clear reward + victory detection all routed through
 * here to fire for player-3..N slots.
 */
import type { FactionId } from '@/config/factions';
import { createEconomy, type GameEconomy } from './economy';
import type { GameState } from './game-state';

export function economyFor(game: GameState, factionId: FactionId): GameEconomy {
  if (factionId === 'player' || factionId === 'enemy') {
    return game.economy[factionId];
  }
  let extra = game.economyExtra.get(factionId);
  if (!extra) {
    extra = createEconomy();
    game.economyExtra.set(factionId, extra);
  }
  return extra;
}
