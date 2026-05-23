import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { BufferAttribute, type BufferGeometry, type LineSegments } from 'three';
import { HEX_DIRECTIONS, TILE_HEIGHT } from '@/config/world';
import { axialToWorld, getHexCorner, getHexKey } from '@/core/hex';
import type { Faction } from '@/ecs/components';
import type { GameState } from '@/game/game-state';

/** Y-lift of the border line above a tile's top face. */
const BORDER_LIFT = 0.06;

/** Faction colours for the zone-of-control border. */
const ZONE_COLOR: Record<Faction, string> = {
  player: '#38bdf8',
  enemy: '#f43f5e',
};

/**
 * Build the line-segment positions for one faction's zone-of-control border:
 * for every controlled tile, each of its six hex edges that faces a tile NOT
 * controlled by that faction is a border segment. The result is the outer hull
 * of the controlled region — the drawn encirclement (spec 102).
 */
function buildBorder(game: GameState, faction: Faction): Float32Array {
  const controlled = game.zones[faction].controlled;
  const pos: number[] = [];

  for (const key of controlled) {
    const tile = game.board.tiles.get(key);
    if (!tile) continue;
    const { x, z } = axialToWorld(tile.q, tile.r);
    const y = tile.level * TILE_HEIGHT + BORDER_LIFT;
    // each hex direction i corresponds to the edge between corner i and i+1
    for (let i = 0; i < 6; i++) {
      const dir = HEX_DIRECTIONS[i];
      if (!dir) continue;
      const neighborKey = getHexKey(tile.q + dir.q, tile.r + dir.r);
      // a border edge — the neighbour is not part of this faction's zone
      if (controlled.has(neighborKey)) continue;
      const c1 = getHexCorner(x, z, i);
      const c2 = getHexCorner(x, z, (i + 1) % 6);
      pos.push(c1.x, y, c1.z, c2.x, y, c2.z);
    }
  }
  return new Float32Array(pos);
}

/** One faction's border, rendered as glowing line segments. */
function FactionBorder({ game, faction }: { game: GameState; faction: Faction }) {
  const ref = useRef<LineSegments>(null);
  // M_MICRO.5.2 — cache the Float32Array by zone generation. The
  // border only changes when a tile is claimed or released; rebuilding
  // every frame was the HOTTEST PERF BUG in the codebase (60Hz, ~30
  // tiles → ~60 ms/min wasted on hex math). When the generation
  // counter is unchanged, skip the rebuild entirely.
  const lastGenRef = useRef<number>(-1);
  useFrame(() => {
    if (!ref.current) return;
    const gen = game.zones[faction].generation;
    if (gen === lastGenRef.current) return;
    lastGenRef.current = gen;
    const geo = ref.current.geometry as BufferGeometry;
    geo.setAttribute('position', new BufferAttribute(buildBorder(game, faction), 3));
  });
  return (
    <lineSegments ref={ref}>
      <bufferGeometry />
      <lineBasicMaterial color={ZONE_COLOR[faction]} linewidth={2} />
    </lineSegments>
  );
}

/**
 * Draws the zone-of-control encirclement for both factions — the outer border
 * of each faction's controlled-tile region, in its faction colour. The whole
 * board stays visible; this border is how territory is read at a glance. The
 * contested-tile pulse (spec 102 encroachment) is layered in by M8.6e.
 * See `docs/specs/102-zone-of-control.md`.
 */
export function ZoneBorder({ game }: { game: GameState }) {
  return (
    <group name="zone-border">
      <FactionBorder game={game} faction="player" />
      <FactionBorder game={game} faction="enemy" />
    </group>
  );
}
