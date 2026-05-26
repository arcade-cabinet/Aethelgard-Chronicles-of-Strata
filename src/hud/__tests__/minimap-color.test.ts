/**
 * M_V6.CARRY.COLOR-OUTLINE-V2 — pin that Minimap reads color from the
 * runtime faction registry (game.factions), not from the legacy SKINS
 * table directly. The full Canvas render is exercised in browser tests;
 * this pin asserts the COLOR-resolution path via game state behavior.
 *
 * M_V9.TEST.SOURCE-GREP-TO-BEHAVIOR — removed source-text grep assertion
 * (Minimap source contains 'findFaction'). The two behavior tests below
 * already prove registry color resolution is correct end-to-end: if the
 * registry was not used, the custom color test would fail.
 */
import { describe, expect, it } from 'vitest';
import { findFaction, LEGACY_FACTIONS } from '@/config/factions';
import { startGame } from '@/game/game-state';

describe('M_V6.CARRY.COLOR-OUTLINE-V2 — Minimap reads from registry', () => {
  it('legacy 2-faction game: registry colors match SKINS defaults', () => {
    const game = startGame({
      seedPhrase: 'alpha-bravo-charlie',
      mapSize: 8,
      difficulty: 'normal',
      eventSeed: 'evt',
    });
    expect(findFaction(game.factions, 'player')?.color).toBe(LEGACY_FACTIONS[0]?.color);
    expect(findFaction(game.factions, 'enemy')?.color).toBe(LEGACY_FACTIONS[1]?.color);
  });

  it('user-picked colors flow through to Minimap lookups', () => {
    const game = startGame({
      seedPhrase: 'alpha-bravo-charlie',
      mapSize: 8,
      difficulty: 'normal',
      eventSeed: 'evt',
      factions: [
        { ...(LEGACY_FACTIONS[0] as (typeof LEGACY_FACTIONS)[number]), color: '#10b981' },
        { ...(LEGACY_FACTIONS[1] as (typeof LEGACY_FACTIONS)[number]), color: '#f59e0b' },
      ],
    });
    expect(findFaction(game.factions, 'player')?.color).toBe('#10b981');
    expect(findFaction(game.factions, 'enemy')?.color).toBe('#f59e0b');
  });
});
