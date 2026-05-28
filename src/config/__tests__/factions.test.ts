/**
 * M_PIVOT.N-PLAYER.FACTIONS — substrate tests for the faction registry.
 *
 * Pins:
 *   (1) LEGACY_FACTIONS preserves the v0.4 two-faction shape
 *       (ids 'player' + 'enemy', archetype medieval, blue+red colors).
 *   (2) factionIds() returns the registry's ids in order.
 *   (3) getFaction() returns the matching config; throws on unknown id.
 *   (4) findFaction() returns undefined on unknown id (vs throwing).
 *   (5) A 4-player + barbarian-camp registry constructs and round-trips
 *       through factionIds() without losing slot ordering.
 *   (6) startGame() with an explicit `factions` override carries the
 *       registry through to `game.factions`.
 *   (7) startGame() WITHOUT `factions` falls back to LEGACY_FACTIONS
 *       with the v0.4 personality overlay applied — byte-identical to
 *       the v0.4 default.
 */
import { describe, expect, it } from 'vitest';
import {
  type FactionConfig,
  factionIds,
  findFaction,
  getFaction,
  LEGACY_FACTIONS,
} from '@/config/ai';
import { startGame } from '@/game/game-state';

describe('factions registry — substrate', () => {
  it('LEGACY_FACTIONS preserves the v0.4 two-faction shape', () => {
    expect(LEGACY_FACTIONS).toHaveLength(2);
    const [player, enemy] = LEGACY_FACTIONS;
    expect(player?.id).toBe('player');
    expect(enemy?.id).toBe('enemy');
    expect(player?.kind).toBe('human');
    expect(enemy?.kind).toBe('ai');
    expect(player?.archetype).toBe('medieval');
    expect(enemy?.archetype).toBe('medieval');
    // historical blue + red.
    expect(player?.color).toBe('#3b82f6');
    expect(enemy?.color).toBe('#ef4444');
  });

  it('factionIds() returns ids in registry order', () => {
    expect(factionIds(LEGACY_FACTIONS)).toEqual(['player', 'enemy']);
  });

  it('getFaction() returns matching config', () => {
    expect(getFaction(LEGACY_FACTIONS, 'player').color).toBe('#3b82f6');
    expect(getFaction(LEGACY_FACTIONS, 'enemy').color).toBe('#ef4444');
  });

  it('getFaction() throws on unknown id', () => {
    expect(() => getFaction(LEGACY_FACTIONS, 'unknown-slot')).toThrow(/unknown faction id/);
  });

  it('findFaction() returns undefined on unknown id', () => {
    expect(findFaction(LEGACY_FACTIONS, 'unknown-slot')).toBeUndefined();
    expect(findFaction(LEGACY_FACTIONS, 'player')?.id).toBe('player');
  });

  it('supports a 4-player + barbarian-camp registry shape', () => {
    const registry: FactionConfig[] = [
      { id: 'player', displayName: 'Cyan', kind: 'human', color: '#22d3ee', archetype: 'medieval' },
      { id: 'enemy', displayName: 'Magenta', kind: 'ai', color: '#e879f9', archetype: 'medieval' },
      {
        id: 'player-3',
        displayName: 'Lime',
        kind: 'human',
        color: '#a3e635',
        archetype: 'mystic',
      },
      {
        id: 'player-4',
        displayName: 'Amber',
        kind: 'ai',
        color: '#fbbf24',
        archetype: 'medieval',
        personality: 'the-builder',
      },
      {
        id: 'barbarian-camp-1',
        displayName: 'Barbarian Camp',
        kind: 'barbarian',
        color: '#78716c',
        archetype: 'orc',
      },
    ];
    expect(factionIds(registry)).toEqual([
      'player',
      'enemy',
      'player-3',
      'player-4',
      'barbarian-camp-1',
    ]);
    expect(getFaction(registry, 'barbarian-camp-1').archetype).toBe('orc');
    expect(getFaction(registry, 'player-4').personality).toBe('the-builder');
  });
});

describe('factions registry — GameState wiring', () => {
  it('startGame WITHOUT factions config defaults to LEGACY_FACTIONS overlay', () => {
    const game = startGame({
      seedPhrase: 'alpha-bravo-charlie',
      mapSize: 8,
      difficulty: 'normal',
      eventSeed: 'evt',
    });
    // M_V11.CAMPS.SPAWN — every match auto-spawns barbarian camps;
    // for mapSize=8 (small bucket) that's 2 camps. The two PLAYER
    // factions still come first in the array (player + enemy) so
    // the legacy contract for the player/enemy slot is preserved.
    const playerFactions = game.factions.filter((f) => f.kind !== 'barbarian');
    expect(playerFactions).toHaveLength(2);
    const ids = factionIds(playerFactions);
    expect(ids).toEqual(['player', 'enemy']);
    // Legacy colors preserved.
    expect(getFaction(game.factions, 'player').color).toBe('#3b82f6');
    expect(getFaction(game.factions, 'enemy').color).toBe('#ef4444');
  });

  it('startGame overlays config.enemyPersonality into the enemy faction', () => {
    const game = startGame({
      seedPhrase: 'alpha-bravo-charlie',
      mapSize: 8,
      difficulty: 'normal',
      eventSeed: 'evt',
      enemyPersonality: 'the-mad-king',
    });
    expect(getFaction(game.factions, 'enemy').personality).toBe('the-mad-king');
  });

  it('startGame with an explicit factions override carries the registry through', () => {
    const overrideFactions: FactionConfig[] = [
      { id: 'player', displayName: 'Lime', kind: 'human', color: '#a3e635', archetype: 'mystic' },
      {
        id: 'enemy',
        displayName: 'Amber',
        kind: 'ai',
        color: '#fbbf24',
        archetype: 'orc',
        personality: 'the-builder',
      },
    ];
    const game = startGame({
      seedPhrase: 'alpha-bravo-charlie',
      mapSize: 8,
      difficulty: 'normal',
      eventSeed: 'evt',
      factions: overrideFactions,
    });
    expect(getFaction(game.factions, 'player').color).toBe('#a3e635');
    expect(getFaction(game.factions, 'enemy').archetype).toBe('orc');
    expect(getFaction(game.factions, 'enemy').personality).toBe('the-builder');
  });

  it('startGame deep-clones config.factions so the source array is not aliased', () => {
    const source: FactionConfig[] = [
      { id: 'player', displayName: 'P', kind: 'human', color: '#000000', archetype: 'medieval' },
      { id: 'enemy', displayName: 'E', kind: 'ai', color: '#ffffff', archetype: 'medieval' },
    ];
    const game = startGame({
      seedPhrase: 'a',
      mapSize: 8,
      difficulty: 'normal',
      eventSeed: 'b',
      factions: source,
    });
    // Mutating game's registry must not bleed back into the source array.
    game.factions[0]!.color = '#ff00ff';
    expect(source[0]?.color).toBe('#000000');
  });
});
