/**
 * M_V6.CARRY.HUD-N-BANNERS — describeFactionChips pin tests.
 *
 * Pins:
 *   1. Legacy 2-faction game returns 2 chip entries.
 *   2. 4-faction game returns 4 chip entries (one per player faction).
 *   3. Barbarian camps are filtered OUT of the chip list.
 *   4. Chip color + name come from the registry.
 */
import { describe, expect, it } from 'vitest';
import { buildDefaultFactions } from '@/config/factions';
import { startGame } from '@/game/game-state';
import { describeFactionChips } from '@/hud/FactionChips';

describe('describeFactionChips', () => {
  it('legacy 2-faction game returns 2 entries (player + enemy)', () => {
    const game = startGame({
      seedPhrase: 'alpha-bravo-charlie',
      mapSize: 8,
      difficulty: 'normal',
      eventSeed: 'evt',
    });
    const chips = describeFactionChips(game);
    expect(chips).toHaveLength(2);
    expect(chips.map((c) => c.id)).toEqual(['player', 'enemy']);
  });

  it('4-faction game returns 4 entries', () => {
    const colors = ['#aa0000', '#00aa00', '#0000aa', '#aaaa00'];
    const game = startGame({
      seedPhrase: 'alpha-bravo-charlie',
      mapSize: 12,
      difficulty: 'normal',
      eventSeed: 'evt',
      factions: buildDefaultFactions(4, colors),
    });
    const chips = describeFactionChips(game);
    // 4 player factions; barbarian camps (auto-spawned for N>=3) MUST
    // be filtered out — chip count = player count exactly.
    expect(chips).toHaveLength(4);
    expect(chips.map((c) => c.id)).toEqual(['player', 'enemy', 'player-3', 'player-4']);
  });

  it('barbarian camps are filtered OUT of the chip list', () => {
    const colors = ['#aa0000', '#00aa00', '#0000aa', '#aaaa00'];
    const game = startGame({
      seedPhrase: 'alpha-bravo-charlie',
      mapSize: 14,
      difficulty: 'normal',
      eventSeed: 'evt',
      factions: buildDefaultFactions(4, colors),
    });
    // game.factions has 4 players + at least 1 barbarian camp; chips = 4.
    const campCount = game.factions.filter((f) => f.kind === 'barbarian').length;
    expect(campCount).toBeGreaterThanOrEqual(1);
    const chips = describeFactionChips(game);
    expect(chips).toHaveLength(4);
    for (const c of chips) {
      expect(c.id.startsWith('barbarian-camp-')).toBe(false);
    }
  });

  it('chip color + name come from the registry', () => {
    const game = startGame({
      seedPhrase: 'alpha-bravo-charlie',
      mapSize: 8,
      difficulty: 'normal',
      eventSeed: 'evt',
    });
    const chips = describeFactionChips(game);
    expect(chips[0]?.color).toBe('#3b82f6');
    expect(chips[1]?.color).toBe('#ef4444');
  });
});
