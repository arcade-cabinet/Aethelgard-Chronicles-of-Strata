/**
 * M_V7.DIPLO.UI — browser harness for the three v0.7 diplomacy pills.
 *
 * Renders each component against a stub GameState; asserts DOM shape +
 * click handlers; captures screenshot baselines for visual review.
 */
import { page, userEvent } from '@vitest/browser/context';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { LEGACY_FACTIONS } from '@/config/factions';
import { createDiplomacyState } from '@/game/diplomacy';
import { createDiplomacyProposalState, proposeNonAggressionPact } from '@/game/diplomacy-border';
import { createTradeCooldownState } from '@/game/diplomacy-trade';
import { createEconomy } from '@/game/economy';
import { createMythEventsState } from '@/game/myth-events';
import { createResearch } from '@/game/research';
import { NonAggressionPactPill } from '@/hud/pills';
import { TradeSwapWidget } from '@/hud/TradeSwapWidget';
import { TributeDemandBanner } from '@/hud/overlays';

// Minimal GameState stub — only the fields the pills read.
function makeStubGame(opts?: {
  pending?: Array<{ proposer: string; target: string; expiresAtSeconds: number }>;
  enemySupply?: number;
  withTradeRoute?: boolean;
}): import('@/game/game-state').GameState {
  const diplomacy = createDiplomacyState();
  const diplomacyProposals = createDiplomacyProposalState();
  for (const p of opts?.pending ?? []) {
    proposeNonAggressionPact(
      diplomacyProposals,
      diplomacy,
      p.proposer,
      p.target,
      p.expiresAtSeconds - 10,
    );
  }
  const playerEco = createEconomy();
  const enemyEco = createEconomy();
  playerEco.peakSupply = 5;
  playerEco.usedSupply = 5;
  enemyEco.peakSupply = opts?.enemySupply ?? 5;
  enemyEco.usedSupply = opts?.enemySupply ?? 5;
  const research = createResearch();
  if (opts?.withTradeRoute) research.purchased.add('trade-route' as never);
  return {
    factions: [...LEGACY_FACTIONS],
    diplomacy,
    diplomacyProposals,
    mythEvents: createMythEventsState(),
    tradeCooldowns: createTradeCooldownState(),
    economy: { player: playerEco, enemy: enemyEco },
    economyExtra: new Map(),
    research,
    clock: { elapsed: 100 },
  } as unknown as import('@/game/game-state').GameState;
}

describe('NonAggressionPactPill', () => {
  it('hides when no proposals target the local faction', async () => {
    const game = makeStubGame();
    await render(
      <div style={{ padding: 40, background: '#0f172a', minHeight: 200, position: 'relative' }}>
        <NonAggressionPactPill game={game} pollIntervalMs={0} />
      </div>,
    );
    expect(document.querySelector('[data-testid="non-aggression-pact-stack"]')).toBeNull();
  });

  it('shows a banner with Accept + Decline when a proposal targets player', async () => {
    const game = makeStubGame({
      pending: [{ proposer: 'enemy', target: 'player', expiresAtSeconds: 200 }],
    });
    await render(
      <div style={{ padding: 40, background: '#0f172a', minHeight: 200, position: 'relative' }}>
        <NonAggressionPactPill game={game} pollIntervalMs={0} />
      </div>,
    );
    const stack = document.querySelector('[data-testid="non-aggression-pact-stack"]');
    expect(stack).not.toBeNull();
    const banner = document.querySelector('[data-testid="non-aggression-pact-enemy"]');
    expect(banner).not.toBeNull();
    expect(banner?.textContent).toContain('Enemy');
    await page.screenshot({ path: '__screenshots__/diplo-non-aggression-pact.png' });
    // Click accept → relation flips to ally.
    const acceptBtn = document.querySelector<HTMLButtonElement>(
      '[data-testid="non-aggression-pact-enemy-accept"]',
    );
    expect(acceptBtn).not.toBeNull();
    await userEvent.click(acceptBtn!);
    expect(game.diplomacyProposals.pending).toHaveLength(0);
    expect([...game.diplomacy.relations.values()][0]?.relation).toBe('ally');
  });
});

describe('TributeDemandBanner', () => {
  it('hides when no faction is clearly stronger', async () => {
    const game = makeStubGame({ enemySupply: 5 }); // equal to player
    await render(
      <div style={{ padding: 40, background: '#0f172a', minHeight: 200, position: 'relative' }}>
        <TributeDemandBanner game={game} pollIntervalMs={0} />
      </div>,
    );
    expect(document.querySelector('[data-testid="tribute-demand-banner"]')).toBeNull();
  });

  it('shows a banner when enemy is 2× player supply + accepts → tributary', async () => {
    const game = makeStubGame({ enemySupply: 20 }); // 4× player
    await render(
      <div style={{ padding: 40, background: '#0f172a', minHeight: 200, position: 'relative' }}>
        <TributeDemandBanner game={game} pollIntervalMs={0} />
      </div>,
    );
    const banner = document.querySelector('[data-testid="tribute-demand-banner"]');
    expect(banner).not.toBeNull();
    expect(banner?.textContent).toContain('Enemy');
    await page.screenshot({ path: '__screenshots__/diplo-tribute-demand.png' });
    const acceptBtn = document.querySelector<HTMLButtonElement>('[data-testid="tribute-accept"]');
    expect(acceptBtn).not.toBeNull();
    await userEvent.click(acceptBtn!);
    expect([...game.diplomacy.relations.values()][0]?.relation).toBe('tributary');
  });
});

describe('TradeSwapWidget', () => {
  it('renders + disables submit without trade-route Discovery', async () => {
    const game = makeStubGame();
    await render(
      <div style={{ padding: 40, background: '#0f172a', minHeight: 320, position: 'relative' }}>
        <TradeSwapWidget game={game} counterparty="enemy" />
      </div>,
    );
    const widget = document.querySelector('[data-testid="trade-swap-widget"]');
    expect(widget).not.toBeNull();
    const submit = document.querySelector<HTMLButtonElement>('[data-testid="trade-submit"]');
    expect(submit?.disabled).toBe(true);
    expect(document.querySelector('[data-testid="trade-no-discovery-warning"]')).not.toBeNull();
    await page.screenshot({ path: '__screenshots__/diplo-trade-disabled.png' });
  });

  it('enables submit + completes a trade with trade-route Discovery', async () => {
    const game = makeStubGame({ withTradeRoute: true });
    game.economy.player.wood = 100;
    game.economy.enemy.stone = 100;
    await render(
      <div style={{ padding: 40, background: '#0f172a', minHeight: 320, position: 'relative' }}>
        <TradeSwapWidget game={game} counterparty="enemy" />
      </div>,
    );
    const submit = document.querySelector<HTMLButtonElement>('[data-testid="trade-submit"]');
    expect(submit?.disabled).toBe(false);
    await page.screenshot({ path: '__screenshots__/diplo-trade-enabled.png' });
    await userEvent.click(submit!);
    // Default amounts: give 10 wood / receive 10 stone.
    expect(game.economy.player.wood).toBe(90);
    expect(game.economy.player.stone).toBeGreaterThanOrEqual(10);
    expect(game.economy.enemy.stone).toBe(90);
    expect(game.economy.enemy.wood).toBeGreaterThanOrEqual(10);
  });
});
