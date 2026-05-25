/**
 * M_V6.CARRY.COLOR-OUTLINE-V2 — pin that Minimap reads color from the
 * runtime faction registry (game.factions), not from the legacy SKINS
 * table directly. The full Canvas render is exercised in browser tests;
 * this pin asserts the COLOR-resolution path.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { findFaction, LEGACY_FACTIONS } from '@/config/factions';
import { startGame } from '@/game/game-state';

describe('M_V6.CARRY.COLOR-OUTLINE-V2 — Minimap reads from registry', () => {
  it('Minimap source contains findFaction(game.factions, ...) calls', () => {
    const path = resolve(__dirname, '../../..', 'src/hud/Minimap.tsx');
    const source = readFileSync(path, 'utf-8');
    expect(source).toContain('findFaction(game.factions');
  });

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
        { ...LEGACY_FACTIONS[0]!, color: '#10b981' },
        { ...LEGACY_FACTIONS[1]!, color: '#f59e0b' },
      ],
    });
    expect(findFaction(game.factions, 'player')?.color).toBe('#10b981');
    expect(findFaction(game.factions, 'enemy')?.color).toBe('#f59e0b');
  });
});
