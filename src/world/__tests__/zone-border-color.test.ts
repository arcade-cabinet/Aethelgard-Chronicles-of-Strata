/**
 * M_PIVOT.RENDER.COLOR-OUTLINE — pin that ZoneBorder reads color from
 * the runtime faction registry (game.factions), not from the legacy
 * SKINS table directly.
 *
 * Pure-data test — exercises the findFaction lookup path that
 * ZoneBorder uses. The actual r3f render is covered by visual harness
 * tests; this pin asserts the COLOR-resolution logic.
 */
import { describe, expect, it } from 'vitest';
import { findFaction, LEGACY_FACTIONS } from '@/config/factions';
import { startGame } from '@/game/game-state';

describe('M_PIVOT.RENDER.COLOR-OUTLINE — registry color flow', () => {
  it('startGame default: legacy player blue + enemy red flow through findFaction', () => {
    const game = startGame({
      seedPhrase: 'alpha-bravo-charlie',
      mapSize: 8,
      difficulty: 'normal',
      eventSeed: 'evt',
    });
    expect(findFaction(game.factions, 'player')?.color).toBe('#3b82f6');
    expect(findFaction(game.factions, 'enemy')?.color).toBe('#ef4444');
  });

  it('user-picked colors flow through the registry to ZoneBorder lookup', () => {
    // simulate what NewGameModal does — override the legacy default
    // factions with user-picked colors.
    const game = startGame({
      seedPhrase: 'alpha-bravo-charlie',
      mapSize: 8,
      difficulty: 'normal',
      eventSeed: 'evt',
      factions: [
        {
          ...LEGACY_FACTIONS[0]!,
          color: '#10b981', // user picked mint
        },
        {
          ...LEGACY_FACTIONS[1]!,
          color: '#f59e0b', // user picked gold
        },
      ],
    });
    expect(findFaction(game.factions, 'player')?.color).toBe('#10b981');
    expect(findFaction(game.factions, 'enemy')?.color).toBe('#f59e0b');
  });

  it('barbarian-camp color flows through registry for N-player matches', () => {
    const game = startGame({
      seedPhrase: 'alpha-bravo-charlie',
      mapSize: 14,
      difficulty: 'normal',
      eventSeed: 'evt',
      factions: [
        { ...LEGACY_FACTIONS[0]!, color: '#10b981' },
        { ...LEGACY_FACTIONS[1]!, color: '#f59e0b' },
        // 3rd player triggers barbarian camp auto-spawn
        {
          id: 'player-3',
          displayName: 'Lime',
          kind: 'human',
          color: '#a3e635',
          archetype: 'medieval',
        },
      ],
    });
    // After startGame, the camps should be in the registry.
    const campFactions = game.factions.filter((f) => f.id.startsWith('barbarian-camp-'));
    expect(campFactions.length).toBeGreaterThan(0);
    // Each camp has a grey-tone color (not the player palette).
    for (const camp of campFactions) {
      expect(camp.color).toMatch(/^#[0-9a-f]{6}$/);
      expect(camp.kind).toBe('barbarian');
    }
  });
});
