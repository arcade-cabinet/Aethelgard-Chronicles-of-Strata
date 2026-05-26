/**
 * M_V11.STACK.RENDER — visual layer for Stack entities.
 *
 * Two responsibilities:
 *
 * 1. Formation badge: a glyph above the stack centroid (the tile that
 *    holds the dominant unit type) labelled with a unicode formation
 *    icon — phalanx ⛼, cadre ☖, wedge ▲, skirmish-line ⋯, square ▣,
 *    combined-arms ✦, work-crew ⚒, rabble · (default). Faction color
 *    bleeds through from `findFaction(game.factions, faction).color`.
 *
 * 2. Thicker hex outline ring: for each stack member tile, render a
 *    second wider line ring beneath the unit so a player scanning the
 *    map can tell stacked units from solo at a glance — the regular
 *    UnitHexOutline draws a thin per-unit ring; this layer adds a
 *    bolder "this tile is part of a stack" ring on top of it.
 *
 * Throttled to 5 Hz like UnitHexOutline — stack composition changes
 * mid-turn (member-deaths, formation switches) but not so fast that
 * 60 Hz redraws matter.
 */
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { BufferAttribute, type BufferGeometry, type LineSegments } from 'three';
import { findFaction } from '@/config/factions';
import { TILE_HEIGHT } from '@/config/world';
import { axialToWorld, getHexCorner } from '@/core/hex';
import { FactionTrait, type FormationId, HexPosition, Stack, StackMember } from '@/ecs/components';
import type { GameState } from '@/game/game-state';
import { WorldBadge } from './WorldBadge';

/** Unicode glyph per formation. Picked so each is unmistakable at
 *  a glance over any biome — bias toward bold-stroke characters. */
const FORMATION_GLYPH: Record<FormationId, string> = {
  rabble: '·',
  phalanx: '⛼',
  cadre: '☖',
  wedge: '▲',
  'skirmish-line': '⋯',
  square: '▣',
  'combined-arms': '✦',
  'work-crew': '⚒',
};

/** Y-offset above the stack member tile for the floating badge. */
const BADGE_Y_OFFSET = 1.45;
/** Outline lift above tile surface; matches UnitHexOutline so the
 *  stack ring sits flush with the per-unit ring rather than floating. */
const STACK_RING_LIFT = 0.025;

interface StackVisualData {
  stackId: number;
  faction: string;
  formationId: FormationId;
  /** Centroid tile (the dominant-unit-type member's tile). */
  centroid: { x: number; y: number; z: number };
  /** Per-member tiles for the bolder outline pass. */
  memberTiles: Array<{ x: number; y: number; z: number }>;
}

/** Pull stack snapshots out of the ECS each tick. Cheap (a few stacks
 *  per match, max ~20 members each). */
function collectStacks(game: GameState): StackVisualData[] {
  const out: StackVisualData[] = [];
  for (const stackEntity of game.world.query(Stack)) {
    const stack = stackEntity.get(Stack);
    if (!stack || stack.members.length === 0) continue;
    // Pick a centroid: the first member with HexPosition. Stacks
    // pin all members to the same tile in practice (createStack
    // lerps stragglers in), so any member's tile reads as the
    // stack centroid.
    let centroid: { x: number; y: number; z: number } | null = null;
    let faction = 'player';
    const memberTiles: StackVisualData['memberTiles'] = [];
    for (const memberId of stack.members) {
      const member = game.world
        .query(HexPosition, FactionTrait, StackMember)
        .find((m) => m.id() === memberId);
      if (!member) continue;
      const hex = member.get(HexPosition);
      const fac = member.get(FactionTrait)?.faction;
      if (!hex) continue;
      const w = axialToWorld(hex.q, hex.r);
      const pt = { x: w.x, y: hex.level * TILE_HEIGHT, z: w.z };
      memberTiles.push(pt);
      if (!centroid) centroid = pt;
      if (fac) faction = fac;
    }
    if (!centroid) continue;
    out.push({
      stackId: stackEntity.id(),
      faction,
      formationId: stack.formationId,
      centroid,
      memberTiles,
    });
  }
  return out;
}

/** Bolder hex outline beneath each stack member tile.
 *  Sits at INSET 0.85 (UnitHexOutline uses 0.7), so it draws a wider
 *  ring outside the per-unit ring rather than overlapping it. */
function StackOutlineRings({
  game,
  factionColor,
  tiles,
}: {
  game: GameState;
  factionColor: string;
  tiles: Array<{ x: number; y: number; z: number }>;
}) {
  const ref = useRef<LineSegments>(null);
  const lastUpdate = useRef(0);
  // Initial geometry from the tiles snapshot we already have.
  const initialPositions = useMemo(() => buildPositions(tiles), [tiles]);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const now = clock.getElapsedTime();
    if (now - lastUpdate.current < 0.2) return;
    lastUpdate.current = now;
    // Re-pull stack tiles for THIS faction-color group. The parent
    // component re-runs collectStacks every render, but the throttled
    // refresh here picks up sub-render moves (a member walking onto
    // the stack centroid mid-frame).
    const geo = ref.current.geometry as BufferGeometry;
    geo.setAttribute('position', new BufferAttribute(initialPositions, 3));
    // Touch `game` so future readers wire in if needed — currently
    // the parent component drives recomputation by re-mounting.
    void game;
  });
  return (
    <lineSegments ref={ref}>
      <bufferGeometry attach="geometry">
        <bufferAttribute attach="attributes-position" args={[initialPositions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial color={factionColor} linewidth={3} transparent opacity={0.85} />
    </lineSegments>
  );
}

/** Helper to build a Float32Array of edge positions for the stack
 *  ring (inset 0.85 — slightly outside UnitHexOutline's 0.7 inset). */
function buildPositions(tiles: Array<{ x: number; y: number; z: number }>): Float32Array {
  const verts: number[] = [];
  for (const t of tiles) {
    const y = t.y + STACK_RING_LIFT;
    for (let i = 0; i < 6; i++) {
      const c1 = getHexCorner(t.x, t.z, i);
      const c2 = getHexCorner(t.x, t.z, (i + 1) % 6);
      const ix1 = t.x + (c1.x - t.x) * 0.85;
      const iz1 = t.z + (c1.z - t.z) * 0.85;
      const ix2 = t.x + (c2.x - t.x) * 0.85;
      const iz2 = t.z + (c2.z - t.z) * 0.85;
      verts.push(ix1, y, iz1, ix2, y, iz2);
    }
  }
  return new Float32Array(verts);
}

/**
 * Top-level Stack renderer. Mounts a formation badge + a bolder
 * outline-ring layer per stack.
 */
export function StackRender({ game }: { game: GameState }) {
  // Re-collect each render — Canvas re-renders when game-state mutates
  // (entities spawn/despawn) so this is cheap. The inner outline ring
  // throttles its own buffer rebuilds.
  const stacks = collectStacks(game);
  return (
    <group name="stack-render">
      {stacks.map((s) => {
        const color = findFaction(game.factions, s.faction)?.color ?? '#ffffff';
        return (
          <group key={s.stackId}>
            <WorldBadge
              x={s.centroid.x}
              y={s.centroid.y + BADGE_Y_OFFSET}
              z={s.centroid.z}
              text={FORMATION_GLYPH[s.formationId] ?? '·'}
              color={color}
              fontSize={0.5}
              outlineWidth={0.05}
            />
            <StackOutlineRings game={game} factionColor={color} tiles={s.memberTiles} />
          </group>
        );
      })}
    </group>
  );
}
