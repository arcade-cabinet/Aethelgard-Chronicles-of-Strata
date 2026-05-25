/**
 * M_V7.4X.SCORING — browser harness for the end-of-game scoring screen.
 *
 * Renders one screenshot baseline per victory kind so the agent can
 * eyeball-review the per-kind styling.
 */
import { page } from '@vitest/browser/context';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { LEGACY_FACTIONS } from '@/config/factions';
import { createDiplomacyState } from '@/game/diplomacy';
import { createDiplomacyProposalState } from '@/game/diplomacy-border';
import { createMythEventsState } from '@/game/myth-events';
import { createTradeCooldownState } from '@/game/diplomacy-trade';
import { createEconomy } from '@/game/economy';
import { createResearch } from '@/game/research';
import { ScoringScreen } from '@/hud/ScoringScreen';
import type { VictoryKind } from '@/game/victory-conditions';

function makeStubGame(kind: VictoryKind, winner = 'player'): import('@/game/game-state').GameState {
  const playerEco = createEconomy();
  playerEco.kills = 24;
  playerEco.wood = 350;
  playerEco.gold = 800;
  const enemyEco = createEconomy();
  enemyEco.kills = 12;
  enemyEco.wood = 120;
  enemyEco.gold = 200;
  // Mock world.query — return empty iterator; countBuildingsFor will be 0.
  const world = {
    query: function* (..._traits: unknown[]) {
      // empty
    },
  };
  return {
    mode: 'age-of-strata',
    factions: [...LEGACY_FACTIONS],
    diplomacy: createDiplomacyState(),
    diplomacyProposals: createDiplomacyProposalState(),
    mythEvents: createMythEventsState(),
    tradeCooldowns: createTradeCooldownState(),
    economy: { player: playerEco, enemy: enemyEco },
    economyExtra: new Map(),
    research: createResearch(),
    clock: { elapsed: 1234 },
    world,
    victoryRecord: { kind, winner, detectedAtSeconds: 1234 },
  } as unknown as import('@/game/game-state').GameState;
}

describe('ScoringScreen', () => {
  it('returns null on non-4X mode', async () => {
    const game = makeStubGame('military');
    (game as unknown as { mode: string }).mode = 'border-clash';
    await render(<ScoringScreen game={game} />);
    expect(document.querySelector('[data-testid="scoring-screen-title"]')).toBeNull();
  });

  it('returns null when victoryRecord is null', async () => {
    const game = makeStubGame('military');
    (game as unknown as { victoryRecord: null }).victoryRecord = null;
    await render(<ScoringScreen game={game} />);
    expect(document.querySelector('[data-testid="scoring-screen-title"]')).toBeNull();
  });

  for (const kind of ['military', 'economic', 'scientific', 'diplomatic'] as const) {
    it(`renders + screenshots: ${kind} victory`, async () => {
      const game = makeStubGame(kind);
      await render(<ScoringScreen game={game} />);
      const title = document.querySelector('[data-testid="scoring-screen-title"]');
      expect(title).not.toBeNull();
      expect(title?.textContent?.toLowerCase()).toContain(kind);
      const winnerEl = document.querySelector('[data-testid="scoring-screen-winner"]');
      expect(winnerEl?.textContent).toContain('Player');
      const playerRow = document.querySelector('[data-testid="scoring-stats-player"]');
      expect(playerRow).not.toBeNull();
      await page.screenshot({ path: `__screenshots__/scoring-screen-${kind}.png` });
    });
  }
});
