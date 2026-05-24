import { describe, expect, it } from 'vitest';
import { FactionTrait, HexPosition, Selectable, Unit } from '@/ecs/components';
import { getCursorMode } from '@/game/cursor-mode';
import { startGame } from '@/game/game-state';

/**
 * M_EXPANSION.U.109 — Cursor-mode predicate.
 *
 * getCursorMode(game, hoveredTileKey) → 'attack' | 'default'.
 *
 * 'attack' only when:
 *   - A player military unit is selected, AND
 *   - The hovered tile holds an ENEMY entity.
 * All other combinations return 'default'.
 */
describe('M_EXPANSION.U.109 — getCursorMode', () => {
  // ── helpers ──────────────────────────────────────────────────────────────

  /** Spawn a player Footman (military) on a specific tile and mark selected. */
  function spawnPlayerFootman(game: ReturnType<typeof startGame>, q: number, r: number) {
    const e = game.world.spawn(
      Unit({ unitType: 'Footman' }),
      HexPosition({ q, r, level: 0 }),
      FactionTrait({ faction: 'player' }),
      Selectable({ isSelected: true }),
    );
    game.selectedId = 0; // non-undefined sentinel — getCursorMode uses world query not selectedId
    game.selectedIds = [0];
    return e;
  }

  /** Spawn an enemy unit on a tile (not selected). */
  function spawnEnemyUnit(game: ReturnType<typeof startGame>, q: number, r: number) {
    return game.world.spawn(
      Unit({ unitType: 'Goblin' }),
      HexPosition({ q, r, level: 0 }),
      FactionTrait({ faction: 'enemy' }),
      Selectable({ isSelected: false }),
    );
  }

  /** Spawn a player Peon (civilian) on a tile and mark selected. */
  function spawnSelectedPeon(game: ReturnType<typeof startGame>, q: number, r: number) {
    return game.world.spawn(
      Unit({ unitType: 'Peon' }),
      HexPosition({ q, r, level: 0 }),
      FactionTrait({ faction: 'player' }),
      Selectable({ isSelected: true }),
    );
  }

  /** Spawn a player Footman on a tile (NOT selected). */
  function spawnUnselectedFootman(game: ReturnType<typeof startGame>, q: number, r: number) {
    return game.world.spawn(
      Unit({ unitType: 'Footman' }),
      HexPosition({ q, r, level: 0 }),
      FactionTrait({ faction: 'player' }),
      Selectable({ isSelected: false }),
    );
  }

  // ── tests ─────────────────────────────────────────────────────────────────

  it('military unit selected + hovering enemy tile → attack', () => {
    const game = startGame('cursor-attack');
    spawnPlayerFootman(game, 1, 0);
    spawnEnemyUnit(game, 5, 0);
    expect(getCursorMode(game, '5,0')).toBe('attack');
  });

  it('military unit selected + hovering empty tile → default', () => {
    const game = startGame('cursor-empty');
    spawnPlayerFootman(game, 1, 0);
    // No enemy on tile 5,0
    expect(getCursorMode(game, '5,0')).toBe('default');
  });

  it('peon selected + hovering enemy tile → default (civilians cannot attack)', () => {
    const game = startGame('cursor-peon');
    spawnSelectedPeon(game, 1, 0);
    spawnEnemyUnit(game, 5, 0);
    expect(getCursorMode(game, '5,0')).toBe('default');
  });

  it('military unit selected + hovering own-faction unit → default', () => {
    const game = startGame('cursor-own');
    spawnPlayerFootman(game, 1, 0);
    // A second (unselected) player Footman is on tile 5,0
    spawnUnselectedFootman(game, 5, 0);
    expect(getCursorMode(game, '5,0')).toBe('default');
  });

  it('no selection at all + hovering enemy tile → default', () => {
    const game = startGame('cursor-no-sel');
    spawnEnemyUnit(game, 5, 0);
    expect(getCursorMode(game, '5,0')).toBe('default');
  });

  it('null hoveredTileKey → default regardless of selection', () => {
    const game = startGame('cursor-null-tile');
    spawnPlayerFootman(game, 1, 0);
    spawnEnemyUnit(game, 5, 0);
    expect(getCursorMode(game, null)).toBe('default');
  });

  it('Wizard (military) selected + hovering enemy → attack', () => {
    const game = startGame('cursor-wizard');
    game.world.spawn(
      Unit({ unitType: 'Wizard' }),
      HexPosition({ q: 1, r: 0, level: 0 }),
      FactionTrait({ faction: 'player' }),
      Selectable({ isSelected: true }),
    );
    spawnEnemyUnit(game, 5, 0);
    expect(getCursorMode(game, '5,0')).toBe('attack');
  });

  it('Hero (military) selected + hovering enemy → attack', () => {
    const game = startGame('cursor-hero');
    game.world.spawn(
      Unit({ unitType: 'Hero' }),
      HexPosition({ q: 1, r: 0, level: 0 }),
      FactionTrait({ faction: 'player' }),
      Selectable({ isSelected: true }),
    );
    spawnEnemyUnit(game, 5, 0);
    expect(getCursorMode(game, '5,0')).toBe('attack');
  });
});
