/**
 * M_EXPANSION.U.109 — Cursor-mode helper.
 *
 * Pure function: given the current game state and the tile key the
 * pointer is hovering over, returns whether the cursor should change
 * to an attack icon.
 *
 * Rules:
 * - A player-owned military unit (combatRole === 'military') must be
 *   selected.
 * - The hovered tile must contain at least one ENEMY unit or ENEMY
 *   building (FactionTrait.faction === 'enemy').
 * - Peon / Settler (civilian) selections → always 'default'.
 * - Hovering own or neutral entities → always 'default'.
 * - Touch devices skip this entirely (caller responsibility — see
 *   TileInteraction.tsx, which gates the hover handler on
 *   non-touch pointer events).
 *
 * No DOM side-effects here — the caller drives document.body.style.cursor
 * via useEffect so the cleanup path is handled by the React lifecycle.
 */

import { getHexKey } from '@/core/hex';
import { FactionTrait, HexPosition, Selectable, Unit } from '@/ecs/components';
import { MILITARY_ROLES } from '@/rules/unit-profiles';
import type { GameState } from './game-state';

/** The two cursor states this feature produces. */
export type CursorMode = 'attack' | 'default';

/**
 * Return 'attack' when:
 *   - At least one PLAYER military unit is currently selected, AND
 *   - `hoveredTileKey` holds an ENEMY entity (unit or building).
 * Otherwise return 'default'.
 */
export function getCursorMode(game: GameState, hoveredTileKey: string | null): CursorMode {
  if (hoveredTileKey === null) return 'default';

  // 1. Require at least one selected player military unit in the world query.
  let hasMilitarySelected = false;
  for (const e of game.world.query(Selectable, Unit, FactionTrait)) {
    const sel = e.get(Selectable);
    if (!sel?.isSelected) continue;
    const fac = e.get(FactionTrait);
    if (fac?.faction !== 'player') continue;
    const unit = e.get(Unit);
    if (unit && MILITARY_ROLES.has(unit.unitType)) {
      hasMilitarySelected = true;
      break;
    }
  }
  if (!hasMilitarySelected) return 'default';

  // 2. Check whether the hovered tile holds an enemy entity (unit or building).
  //    Buildings also carry HexPosition + FactionTrait so one query covers both.
  for (const e of game.world.query(HexPosition, FactionTrait)) {
    const hex = e.get(HexPosition);
    const fac = e.get(FactionTrait);
    if (!hex || !fac) continue;
    if (fac.faction !== 'enemy') continue;
    if (getHexKey(hex.q, hex.r) === hoveredTileKey) return 'attack';
  }

  return 'default';
}
