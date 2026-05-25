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
import type { FactionConfig } from '@/config/factions';
import { FactionChips } from '@/hud/FactionChips';

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
});
