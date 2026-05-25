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
  // Walk EVERY board tile in deterministic order. The prior narrow
  // 7×5 window happened to work for the 4 seeds I tried but is
  // future-flaky: any noise/centre-bias retune could turn a single
  // seed unlucky. Scanning the full board with deterministic
  // ordering (sort by q then r) is O(tiles) ~ 1000 and runs once
  // per test — cheap insurance against silent CI flake.
  // Coderabbit fix: also require at least one adjacent walkable +
  // zone-free neighbour, so the "defended" test can place its
  // defender on a clean tile and the cancellation path is exercised
  // for the right reason. Without this gate, a candidate near the
  // map edge or fully encircled by water/zones can pass the basic
  // walkable check but offer no defender slot, and the test fails
  // for map-shape reasons rather than encroachment logic.
  const neighborOffsets: Array<[number, number]> = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, -1],
    [-1, 1],
  ];
  const candidates: Array<{ q: number; r: number; key: string }> = [];
  for (const t of game.board.tiles.values()) {
    if (!t.walkable) continue;
    const key = `${t.q},${t.r}`;
    // Reject tiles already in EITHER faction's controlled set so the
    // claimTile call below sets a clean baseline (no interaction with
    // the seedZonesFromAttractors radius-2 seed footprint).
    if (game.zones.player.controlled.has(key)) continue;
    if (game.zones.enemy.controlled.has(key)) continue;
    const hasDefenderNeighbour = neighborOffsets.some(([dq, dr]) => {
      const nkey = `${t.q + dq},${t.r + dr}`;
      const nt = game.board.tiles.get(nkey);
      if (!nt?.walkable) return false;
      if (game.zones.player.controlled.has(nkey)) return false;
      if (game.zones.enemy.controlled.has(nkey)) return false;
      return true;
    });
    if (!hasDefenderNeighbour) continue;
    candidates.push({ q: t.q, r: t.r, key });
  }
  candidates.sort((a, b) => (a.q !== b.q ? a.q - b.q : a.r - b.r));
  const first = candidates[0];
  if (!first) {
    throw new Error(
      'encroachment test could not find a walkable, zone-free tile with a valid adjacent defender slot',
    );
  }
  return first;
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
    // Pick an adjacent walkable tile for the defender that is itself
    // ZONE-FREE. Otherwise a defender on an enemy-controlled tile
    // could pass the test for the wrong reason (defender adjacency
    // does cancel, BUT we want a clean isolation of the cancel-by-
    // adjacency path).
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
      const nkey = `${nq},${nr}`;
      const t = game.board.tiles.get(nkey);
      if (!t?.walkable) continue;
      if (game.zones.player.controlled.has(nkey)) continue;
      if (game.zones.enemy.controlled.has(nkey)) continue;
      spawnMilitaryAt(game, 'player', nq, nr);
      defended = true;
      break;
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
