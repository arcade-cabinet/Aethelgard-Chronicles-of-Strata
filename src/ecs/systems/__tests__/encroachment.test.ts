/**
 * Encroachment system regression (M_AUDIT2.ARCH.41).
 *
 * Pins: claim→pulse→flip lifecycle; defended pulse cancels; peons
 * never trigger encroachment (only combatRole=military); FACTIONS
 * loop covers both sides.
 *
 * Uses the live game world so the integration matches what the tick
 * actually runs.
 */
import { describe, expect, it } from 'vitest';
import { type Faction, FactionTrait, HexPosition, Unit } from '@/ecs/components';
import { encroachmentSystem } from '@/ecs/systems/encroachment';
import { startGame } from '@/game/game-state';
import { claimTile } from '@/game/zone';

/**
 * Pick a walkable tile at small offset from the centre. The previous
 * tests hardcoded q/r literals like '2,0', but the M_MAPGEN.3
 * mountain-massif refactor (2026-05-24) made mountain placement
 * noise-derived + centre-biased, so any specific tile MIGHT be a
 * mountain at a given seed. Walk outward in ring order until we find
 * walkable land away from both base safety rings.
 */
function pickWalkableTestTile(game: ReturnType<typeof startGame>): {
  q: number;
  r: number;
  key: string;
} {
  // Pick a walkable tile that is OUTSIDE the player's seed zone
  // (the base attractor seeds the player's controlled set in a
  // radius-2 hex around its own tile). Tile q=4+ at r=0 is safely
  // beyond that radius regardless of player base placement.
  for (let q = 4; q <= 10; q++) {
    for (const r of [0, 1, -1, 2, -2]) {
      const t = game.board.tiles.get(`${q},${r}`);
      if (!t?.walkable) continue;
      // also confirm the tile isn't already in either zone (so claim
      // sets a clean baseline) — the seedZonesFromAttractors pass can
      // grant it to player or enemy depending on base placement.
      const key = `${q},${r}`;
      if (game.zones.enemy.controlled.has(key)) continue;
      return { q, r, key };
    }
  }
  throw new Error('encroachment test could not find a walkable tile outside the seed zones');
}

/**
 * Spawn a military unit (Footman) for the given faction on a hex —
 * minimal trait set the encroachment system filters on.
 */
function spawnMilitaryAt(
  game: ReturnType<typeof startGame>,
  faction: Faction,
  q: number,
  r: number,
) {
  return game.world.spawn(
    HexPosition({ q, r, level: 0 }),
    FactionTrait({ faction }),
    Unit({ unitType: 'Footman' }),
  );
}

describe('encroachmentSystem (M_AUDIT2.ARCH.41)', () => {
  it('starts a pulse on a controlled tile when enemy military stands on it', () => {
    const game = startGame('encroach-pulse');
    const { q, r, key } = pickWalkableTestTile(game);
    claimTile(game.zones.player, key);
    spawnMilitaryAt(game, 'enemy', q, r);
    encroachmentSystem(game.world, game.zones, 0.5, game.difficulty);
    expect(game.zones.player.pulsing.has(key)).toBe(true);
  });

  it('flips the tile to the encroacher when grace elapses', () => {
    const game = startGame('encroach-flip');
    const { q, r, key } = pickWalkableTestTile(game);
    claimTile(game.zones.player, key);
    spawnMilitaryAt(game, 'enemy', q, r);
    // Hard difficulty has 4s grace — drain it.
    game.difficulty = 'hard';
    for (let i = 0; i < 10; i++) {
      encroachmentSystem(game.world, game.zones, 0.5, game.difficulty);
    }
    expect(game.zones.player.controlled.has(key)).toBe(false);
    expect(game.zones.enemy.controlled.has(key)).toBe(true);
  });

  it('defended pulse is cancelled when a friendly military stands adjacent', () => {
    const game = startGame('encroach-defended');
    const { q, r, key } = pickWalkableTestTile(game);
    claimTile(game.zones.player, key);
    spawnMilitaryAt(game, 'enemy', q, r);
    // Pick an adjacent walkable tile for the defender.
    const neighborOffsets = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, -1],
      [-1, 1],
    ];
    let defended = false;
    for (const [dq, dr] of neighborOffsets) {
      const nq = q + (dq ?? 0);
      const nr = r + (dr ?? 0);
      if (game.board.tiles.get(`${nq},${nr}`)?.walkable) {
        spawnMilitaryAt(game, 'player', nq, nr);
        defended = true;
        break;
      }
    }
    expect(defended).toBe(true);
    encroachmentSystem(game.world, game.zones, 0.5, game.difficulty);
    expect(game.zones.player.pulsing.has(key)).toBe(false);
    expect(game.zones.player.controlled.has(key)).toBe(true);
  });

  it('peons never trigger encroachment (combatRole=civilian)', () => {
    const game = startGame('encroach-peon');
    const { q, r, key } = pickWalkableTestTile(game);
    claimTile(game.zones.player, key);
    // Spawn an ENEMY peon on the tile — should not start a pulse.
    game.world.spawn(
      HexPosition({ q, r, level: 0 }),
      FactionTrait({ faction: 'enemy' }),
      Unit({ unitType: 'Peon' }),
    );
    encroachmentSystem(game.world, game.zones, 0.5, game.difficulty);
    expect(game.zones.player.pulsing.has(key)).toBe(false);
  });
});
