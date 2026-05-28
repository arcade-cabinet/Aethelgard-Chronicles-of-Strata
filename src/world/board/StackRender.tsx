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
 *    small inset hex-shaped band so a player scanning the map can
 *    tell stacked units from solo at a glance.
 *
 * Updates on every parent render — collectStacks is O(stacks +
 * members) with the pre-indexed member lookup; the geometry rebuild
 * is a useMemo so it only re-allocates when the underlying tile set
 * changes. (Was previously rebuilt on a 5 Hz useFrame loop which
 * churned Float32Arrays every 200ms even when nothing moved —
 * CodeRabbit PR #89.)
 */
import { useMemo } from 'react';
import { findFaction } from '@/config/ai';
import { TILE_HEIGHT } from '@/config/world';
import { axialToWorld, getHexCorner } from '@/core/hex';
import { FactionTrait, type FormationId, HexPosition, Stack, StackMember } from '@/ecs/components';
import type { GameState } from '@/game/game-state';
import { WorldBadge } from '../WorldBadge';

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
/** Inset multipliers — outer + inner edge of the band. UnitHexOutline
 *  uses 0.7; we draw a wider band 0.78..0.92 around it. */
const STACK_RING_OUTER_INSET = 0.92;
const STACK_RING_INNER_INSET = 0.78;

interface StackVisualData {
  stackId: number;
  faction: string;
  formationId: FormationId;
  /** Centroid tile (the dominant-unit-type member's tile). */
  centroid: { x: number; y: number; z: number };
  /** Per-member tiles for the bolder outline pass. */
  memberTiles: Array<{ x: number; y: number; z: number }>;
}

/** Pull stack snapshots out of the ECS each tick. Pre-indexes member
 *  entities by id so the per-stack inner loop is O(1) instead of
 *  scanning the full world.query per member (CodeRabbit PR #89). */
function collectStacks(game: GameState): StackVisualData[] {
  // Index every StackMember entity by its koota id once.
  const memberIndex = new Map<
    number,
    { hex: { q: number; r: number; level: number }; faction: string | undefined }
  >();
  for (const m of game.world.query(HexPosition, FactionTrait, StackMember)) {
    const hex = m.get(HexPosition);
    const fac = m.get(FactionTrait)?.faction;
    if (!hex) continue;
    memberIndex.set(m.id(), { hex, faction: fac });
  }

  const out: StackVisualData[] = [];
  for (const stackEntity of game.world.query(Stack)) {
    const stack = stackEntity.get(Stack);
    if (!stack || stack.members.length === 0) continue;
    let centroid: { x: number; y: number; z: number } | null = null;
    let faction = 'player';
    const memberTiles: StackVisualData['memberTiles'] = [];
    for (const memberId of stack.members) {
      const m = memberIndex.get(memberId);
      if (!m) continue;
      const w = axialToWorld(m.hex.q, m.hex.r);
      const pt = { x: w.x, y: m.hex.level * TILE_HEIGHT, z: w.z };
      memberTiles.push(pt);
      if (!centroid) centroid = pt;
      if (m.faction) faction = m.faction;
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

/** Stack outline ring drawn as a real triangle band (not a line) so
 *  width reads consistently across browsers / GPUs — WebGL clamps
 *  LineBasicMaterial.linewidth to 1px regardless of the value, so
 *  the previous lineSegments approach silently rendered as a thin
 *  line on every desktop/mobile target (CodeRabbit PR #89). The
 *  triangle band approach gives a fixed-thickness ring at any
 *  zoom level. */
function StackOutlineRings({
  factionColor,
  tiles,
}: {
  factionColor: string;
  tiles: Array<{ x: number; y: number; z: number }>;
}) {
  const positions = useMemo(() => buildBandPositions(tiles), [tiles]);
  return (
    <mesh>
      <bufferGeometry attach="geometry">
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <meshBasicMaterial color={factionColor} transparent opacity={0.85} side={2} />
    </mesh>
  );
}

/** Build a Float32Array of triangle positions for a hex-shaped band
 *  per tile (12 triangles × 3 verts × 3 floats = 108 floats/tile).
 *  Two concentric hexes (insets OUTER and INNER); each segment
 *  becomes a 2-triangle quad. */
function buildBandPositions(tiles: Array<{ x: number; y: number; z: number }>): Float32Array {
  const verts: number[] = [];
  for (const t of tiles) {
    const y = t.y + STACK_RING_LIFT;
    for (let i = 0; i < 6; i++) {
      const cOut1 = getHexCorner(t.x, t.z, i);
      const cOut2 = getHexCorner(t.x, t.z, (i + 1) % 6);
      const ox1 = t.x + (cOut1.x - t.x) * STACK_RING_OUTER_INSET;
      const oz1 = t.z + (cOut1.z - t.z) * STACK_RING_OUTER_INSET;
      const ox2 = t.x + (cOut2.x - t.x) * STACK_RING_OUTER_INSET;
      const oz2 = t.z + (cOut2.z - t.z) * STACK_RING_OUTER_INSET;
      const ix1 = t.x + (cOut1.x - t.x) * STACK_RING_INNER_INSET;
      const iz1 = t.z + (cOut1.z - t.z) * STACK_RING_INNER_INSET;
      const ix2 = t.x + (cOut2.x - t.x) * STACK_RING_INNER_INSET;
      const iz2 = t.z + (cOut2.z - t.z) * STACK_RING_INNER_INSET;
      // tri 1: out1, out2, in1
      verts.push(ox1, y, oz1, ox2, y, oz2, ix1, y, iz1);
      // tri 2: out2, in2, in1
      verts.push(ox2, y, oz2, ix2, y, iz2, ix1, y, iz1);
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
  // (entities spawn/despawn) so this is cheap with the pre-indexed
  // member lookup.
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
            <StackOutlineRings factionColor={color} tiles={s.memberTiles} />
          </group>
        );
      })}
    </group>
  );
}
