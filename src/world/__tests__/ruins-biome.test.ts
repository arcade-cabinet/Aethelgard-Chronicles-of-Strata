/**
 * M_V6.CARRY.RUINS-BIOME — pin the camp-clear → RUINS biome flip.
 *
 * Pins:
 *   1. RUINS is in the BiomeType union + mapgen registry + palette.
 *   2. RUINS biome-flags: walkable=true, buildable=true, habitable=true.
 *   3. RUINS has a defined ambient + terrain-cost entry.
 *   4. Integration: clearing a camp via runEconomyTick flips the camp
 *      tile's biome to RUINS.
 *   5. RUINS tile still passes downstream pathing / biome-distribution
 *      checks (it's a walkable land tile).
 */
import { describe, expect, it } from 'vitest';
import { BIOME_AMBIENT } from '@/audio/biome-ambient';
import { biomeRule } from '@/config/world';
import { moveCostFor } from '@/core/terrain-cost';
import { Health } from '@/ecs/components';
import { createCharacter } from '@/entities/character-factory';
import { runEconomyTick, startGame } from '@/game/game-state';
import { biomeFlagsFor } from '@/rules/biome-flags';
import { spawnBarbarianCamp } from '@/world/board';
import { BIOME_COLORS, BIOME_COLORS_EVENING } from '@/world/biomes';

describe('M_V6.CARRY.RUINS-BIOME — registry + flag coverage', () => {
  it('RUINS appears in the mapgen registry with walkable + buildable + habitable', () => {
    const rule = biomeRule('RUINS');
    expect(rule).toBeDefined();
    expect(rule.walkable).toBe(true);
    expect(rule.buildable).toBe(true);
    expect(rule.habitable).toBe(true);
    expect(rule.appliesAttribute).toBeNull();
  });

  it('biomeFlagsFor(RUINS) returns walkable=true + buildable=true + habitable=true', () => {
    const flags = biomeFlagsFor('RUINS');
    expect(flags.walkable).toBe(true);
    expect(flags.buildable).toBe(true);
    expect(flags.habitable).toBe(true);
  });

  it('palette day + dusk both carry a RUINS color', () => {
    expect(BIOME_COLORS.RUINS).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(BIOME_COLORS_EVENING.RUINS).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it('ambient + terrain cost wired for RUINS', () => {
    expect(BIOME_AMBIENT.RUINS).toBe('audio.ambient.grass');
    expect(moveCostFor('RUINS')).toBe(1);
  });

  it('RUINS decoration palette exists with rock + stump scatter props (M_V8.PARKING-LOT.V06)', async () => {
    // M_V9.TEST.SOURCE-GREP-TO-BEHAVIOR — converted from readFileSync grep to
    // import-based behavior assertion. PALETTES is now exported from Decoration.tsx.
    const { PALETTES } = await import('@/world/biomes');
    const ruinsPalette = PALETTES.RUINS;
    expect(ruinsPalette).toBeDefined();
    const ids = ruinsPalette!.props.map((p) => p.id);
    expect(ids).toContain('nature.rock.td-rocks');
    expect(ids).toContain('nature.stump-a');
  });
});

describe('camp clearing flips tile biome to RUINS', () => {
  it('runEconomyTick: clearing a camp sets the camp tile type to RUINS', () => {
    const game = startGame({
      seedPhrase: 'alpha-bravo-charlie',
      mapSize: 10,
      difficulty: 'normal',
      eventSeed: 'evt',
    });
    let campTile: { q: number; r: number; level: number; key: string } | null = null;
    for (const tile of game.board.tiles.values()) {
      if (!tile.walkable) continue;
      if (Math.abs(tile.q) + Math.abs(tile.r) < 6 || Math.abs(tile.q) + Math.abs(tile.r) > 15)
        continue;
      campTile = { q: tile.q, r: tile.r, level: tile.level, key: `${tile.q},${tile.r}` };
      break;
    }
    expect(campTile).not.toBeNull();
    if (!campTile) throw new Error('campTile required');
    const ct = campTile;
    const camp = spawnBarbarianCamp(game.world, {
      factionId: 'barbarian-camp-1',
      q: ct.q,
      r: ct.r,
      level: ct.level,
      hp: 50,
      archetype: 'orc',
    });
    createCharacter({
      world: game.world,
      role: 'Footman',
      q: ct.q + 1,
      r: ct.r,
      level: ct.level,
      factionOverride: 'player',
    });
    camp.set(Health, { current: 0, max: 50 });
    runEconomyTick(game, 1);

    const tileAfter = game.board.tiles.get(ct.key);
    expect(tileAfter?.type).toBe('RUINS');
    expect(tileAfter?.walkable).toBe(true);
  });
});
