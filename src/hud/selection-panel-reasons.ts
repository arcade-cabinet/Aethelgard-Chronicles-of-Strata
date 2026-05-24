/**
 * M_EXPANSION.D.172 — disabled-reason helpers extracted from
 * SelectionPanel.tsx so the host component stays under the
 * 400-line cognitive-load threshold.
 *
 * Each helper takes (game, identifying-info, cost) and returns a
 * player-facing string explaining WHY a button is disabled, or
 * undefined when nothing's blocking.
 */
import { canAfford, type ResourceCost } from '@/game/economy';
import type { GameState } from '@/game/game-state';
import { discoveryById } from '@/rules';
import { costLabel } from './format';

/**
 * Explain why training is disabled. Three real gates: supply cap
 * reached, insufficient resources, neither (rare — falls back to a
 * generic message). Returns undefined when we don't have a reason
 * worth surfacing.
 */
export function trainDisabledReason(
  game: GameState,
  unitType: string,
  cost: ResourceCost,
): string | undefined {
  const econ = game.economy.player;
  if (econ.usedSupply >= econ.maxSupply) {
    return `Supply at cap (${econ.usedSupply}/${econ.maxSupply}). Build a House to raise it.`;
  }
  if (!canAfford(econ, cost)) {
    return `Not enough resources to train ${unitType}: need ${costLabel(cost)}.`;
  }
  return undefined;
}

/**
 * Explain why placing a building is disabled. Only one gate today:
 * insufficient resources.
 */
export function buildDisabledReason(
  game: GameState,
  type: string,
  cost: ResourceCost,
): string | undefined {
  if (!canAfford(game.economy.player, cost)) {
    return `Not enough resources for ${type}: need ${costLabel(cost)}.`;
  }
  return undefined;
}

/**
 * Explain why research is disabled. canResearch's three checks
 * (already-purchased, prereq missing, can't afford) all produce
 * different player-facing reasons.
 */
export function researchDisabledReason(
  game: GameState,
  id: string,
  name: string,
  cost: ResourceCost,
): string | undefined {
  const d = discoveryById(id);
  if (!d) return undefined;
  // discovery ids come from discoveries.json; narrowing to ResearchId
  // would require widening every JSON id — Set#has is safe.
  const purchased = game.research.purchased as Set<string>;
  if (purchased.has(id)) return `${name} already researched.`;
  const missing = (d.prereqs ?? []).filter((p) => !purchased.has(p));
  if (missing.length > 0) {
    const names = missing.map((p) => discoveryById(p)?.name ?? p).join(', ');
    return `${name} requires: ${names}.`;
  }
  if (!canAfford(game.economy.player, cost)) {
    return `Not enough resources for ${name}: need ${costLabel(cost)}.`;
  }
  return undefined;
}
