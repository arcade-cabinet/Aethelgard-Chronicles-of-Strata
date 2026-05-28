/**
 * M_V6.CARRY.HUD-N-BANNERS — harness baseline for the faction-chips strip.
 *
 * Renders a 6-faction stub game state and screenshots the resulting
 * strip. Each commit that touches FactionChips re-runs this so the
 * agent eyeballs the output against the spec intent (one chip per
 * non-barbarian faction; barbarian camps invisible).
 */
import { page } from '@vitest/browser/context';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import type { FactionConfig } from '@/config/ai';
import { FactionChips, ScoreBar } from '@/hud/pills';

function makeStubGame(factions: FactionConfig[]): import('@/game/game-state').GameState {
  // Tiny stub — FactionChips reads game.factions + game.economy only.
  // Economy is keyed by 'player' / 'enemy' for legacy slots; new
  // slots get null killCount which renders as no number.
  const economy: Record<string, { kills: number }> = {
    player: { kills: 4 },
    enemy: { kills: 2 },
  };
  return {
    factions,
    economy,
  } as unknown as import('@/game/game-state').GameState;
}

describe('FactionChips harness', () => {
  it('hidden for legacy 2-faction game', async () => {
    const { container } = await render(
      <div style={{ padding: 20, background: '#0f172a', minHeight: 80, position: 'relative' }}>
        <FactionChips
          game={makeStubGame([
            {
              id: 'player',
              displayName: 'Player',
              kind: 'human',
              color: '#3b82f6',
              archetype: 'medieval',
            },
            {
              id: 'enemy',
              displayName: 'Enemy',
              kind: 'ai',
              color: '#ef4444',
              archetype: 'medieval',
            },
          ])}
        />
      </div>,
    );
    // Strip should NOT render (legacy 2-faction case).
    expect(container.querySelector('[data-testid="faction-chips-strip"]')).toBeNull();
  });

  it('renders 4 chips + skips barbarian camps for a 4-player + 2-camp game', async () => {
    const factions: FactionConfig[] = [
      {
        id: 'player',
        displayName: 'Sapphire',
        kind: 'human',
        color: '#3b82f6',
        archetype: 'medieval',
      },
      { id: 'enemy', displayName: 'Crimson', kind: 'ai', color: '#ef4444', archetype: 'medieval' },
      {
        id: 'player-3',
        displayName: 'Verdant',
        kind: 'ai',
        color: '#22c55e',
        archetype: 'medieval',
      },
      { id: 'player-4', displayName: 'Amber', kind: 'ai', color: '#f59e0b', archetype: 'medieval' },
      {
        id: 'barbarian-camp-1',
        displayName: 'Camp 1',
        kind: 'barbarian',
        color: '#78716c',
        archetype: 'orc',
      },
      {
        id: 'barbarian-camp-2',
        displayName: 'Camp 2',
        kind: 'barbarian',
        color: '#5f5b56',
        archetype: 'orc',
      },
    ];
    await render(
      <div style={{ padding: 60, background: '#0f172a', minHeight: 120, position: 'relative' }}>
        <FactionChips game={makeStubGame(factions)} />
      </div>,
    );
    const strip = document.querySelector('[data-testid="faction-chips-strip"]');
    expect(strip).not.toBeNull();
    // 4 player chips, 0 barbarian chips.
    const chips = document.querySelectorAll(
      '[data-testid^="faction-chip-"]:not([data-testid^="faction-chip-swatch-"])',
    );
    // Filter to only the chip wrappers (not the swatch sub-elements).
    let chipCount = 0;
    chips.forEach((c) => {
      const id = c.getAttribute('data-testid') ?? '';
      if (id.startsWith('faction-chip-') && !id.startsWith('faction-chip-swatch-')) chipCount++;
    });
    expect(chipCount).toBe(4);
    expect(document.querySelector('[data-testid="faction-chip-barbarian-camp-1"]')).toBeNull();
    await page.screenshot({ path: '__screenshots__/faction-chips-4player.png' });
  });

  it('does NOT overlap the ScoreBar in an N-player match (M_V13.HUD.FIX-PILL-COLLISION)', async () => {
    // Major #1: in N-player matches the chips strip and the score bar
    // both lived at top-center and overlapped. The shared topCenterSlot
    // helper now stacks them — chips at row 0, score bar at row 1. Render
    // both and assert their bounding boxes don't vertically intersect.
    const factions: FactionConfig[] = [
      {
        id: 'player',
        displayName: 'Sapphire',
        kind: 'human',
        color: '#3b82f6',
        archetype: 'medieval',
      },
      { id: 'enemy', displayName: 'Crimson', kind: 'ai', color: '#ef4444', archetype: 'medieval' },
      {
        id: 'player-3',
        displayName: 'Verdant',
        kind: 'ai',
        color: '#22c55e',
        archetype: 'medieval',
      },
      { id: 'player-4', displayName: 'Amber', kind: 'ai', color: '#f59e0b', archetype: 'medieval' },
    ];
    const game = makeStubGame(factions);
    // ScoreBar reads game.scores; provide a minimal shape.
    (game as unknown as { scores: Record<string, number> }).scores = {
      player: 120,
      enemy: 80,
    };
    await render(
      <div style={{ position: 'relative', minHeight: 200, background: '#0f172a' }}>
        <FactionChips game={game} />
        <ScoreBar game={game} />
      </div>,
    );
    const strip = document.querySelector('[data-testid="faction-chips-strip"]');
    const scoreBar = document.querySelector('#score-bar');
    expect(strip, 'faction strip renders in N-player match').not.toBeNull();
    expect(scoreBar, 'score bar renders').not.toBeNull();
    const stripRect = (strip as HTMLElement).getBoundingClientRect();
    const scoreRect = (scoreBar as HTMLElement).getBoundingClientRect();
    // Chips (row 0) sit strictly above the score bar (row 1): the strip's
    // bottom edge must not cross the score bar's top edge.
    expect(
      stripRect.bottom,
      `chips bottom (${stripRect.bottom}) must be <= score-bar top (${scoreRect.top})`,
    ).toBeLessThanOrEqual(scoreRect.top + 1);
    await page.screenshot({ path: '__screenshots__/faction-chips-scorebar-stack.png' });
  });
});
