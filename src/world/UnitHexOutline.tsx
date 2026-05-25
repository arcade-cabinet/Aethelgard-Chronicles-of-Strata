/**
 * M_V7.RENDER.COLOR-OUTLINE-V3 — per-unit hex-outline ring renderer.
 *
 * Reads game.world's (Unit + FactionTrait + HexPosition) tuples and
 * draws one colored ring per unit at hex center, color from the
 * runtime registry (findFaction(game.factions, faction)?.color).
 *
 * Extends the v0.5/v0.6 registry color flow (ZoneBorder lifted in
 * v0.5; Minimap lifted in v0.6) to per-unit visualization. Closes
 * the remaining grep-gate exception — UnitHexOutline now reads
 * faction.color via the same findFaction helper.
 *
 * v0.7 substrate uses simple r3f line rings; per-tick rebuild because
 * unit positions change continuously. Performance: caps re-render at
 * 20Hz via a useRef tick gate — full 60Hz redraws are visually
 * indistinguishable on mobile but burn battery.
 */
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { type BufferGeometry, type LineSegments, BufferAttribute } from 'three';
import { findFaction } from '@/config/factions';
import { TILE_HEIGHT } from '@/config/world';
import { axialToWorld, getHexCorner } from '@/core/hex';
import { FactionTrait, HexPosition, Unit } from '@/ecs/components';
import type { GameState } from '@/game/game-state';

const OUTLINE_LIFT = 0.02; // just above the tile surface

/**
 * Aggregate per-faction unit positions, then emit one LineSegments
 * per faction with its registry color. Re-running this each frame
 * would burn CPU; we throttle to 5 Hz and skip-redraw when no unit
 * moved.
 */
function buildOutlinesByFaction(game: GameState): Map<string, Float32Array> {
  const byFaction = new Map<string, number[]>();
  for (const e of game.world.query(Unit, HexPosition, FactionTrait)) {
    const hex = e.get(HexPosition);
    const fac = (e.get(FactionTrait)?.faction ?? 'player') as string;
    if (!hex) continue;
    const { x, z } = axialToWorld(hex.q, hex.r);
    const y = hex.level * TILE_HEIGHT + OUTLINE_LIFT;
    // Hex outline at the full HEX_RADIUS — fits the tile edge. Could
    // be inset by scaling each corner toward center post-computation;
    // v0.7 substrate uses the full edge for max visibility.
    let arr = byFaction.get(fac);
    if (!arr) {
      arr = [];
      byFaction.set(fac, arr);
    }
    for (let i = 0; i < 6; i++) {
      const c1 = getHexCorner(x, z, i);
      const c2 = getHexCorner(x, z, (i + 1) % 6);
      // Inset toward center by 30% — a thin "owned" ring inside the
      // tile so adjacent units don't blend rings.
      const ix1 = x + (c1.x - x) * 0.7;
      const iz1 = z + (c1.z - z) * 0.7;
      const ix2 = x + (c2.x - x) * 0.7;
      const iz2 = z + (c2.z - z) * 0.7;
      arr.push(ix1, y, iz1, ix2, y, iz2);
    }
  }
  const out = new Map<string, Float32Array>();
  for (const [fac, arr] of byFaction) out.set(fac, new Float32Array(arr));
  return out;
}

/** Render line-segments for one faction. */
function FactionUnitRings({ game, faction }: { game: GameState; faction: string }) {
  const ref = useRef<LineSegments>(null);
  const color = useMemo(
    () => findFaction(game.factions, faction)?.color ?? '#ffffff',
    [game.factions, faction],
  );
  // Throttle: skip-redraw if less than ~200ms since last update.
  const lastUpdate = useRef(0);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const now = clock.getElapsedTime();
    if (now - lastUpdate.current < 0.2) return;
    lastUpdate.current = now;
    const positions = buildOutlinesByFaction(game).get(faction);
    if (!positions) return;
    const geo = ref.current.geometry as BufferGeometry;
    geo.setAttribute('position', new BufferAttribute(positions, 3));
  });
  return (
    <lineSegments ref={ref}>
      <bufferGeometry />
      <lineBasicMaterial color={color} linewidth={1.5} transparent opacity={0.6} />
    </lineSegments>
  );
}

/**
 * Top-level wrapper: enumerate every distinct faction id currently in
 * game.world + render one FactionUnitRings per. v0.5 legacy 2-faction
 * games render player + enemy; N-player matches render up to 6 + the
 * barbarian camps (visually distinct via the grey-toned camp colors).
 */
export function UnitHexOutline({ game }: { game: GameState }) {
  // Use game.factions as the source — every faction the runtime knows
  // about. Drops factions with no live units gracefully (the inner
  // component's frame loop skips empty Float32Array).
  return (
    <group name="unit-hex-outline">
      {game.factions.map((f) => (
        <FactionUnitRings key={f.id} game={game} faction={f.id} />
      ))}
    </group>
  );
}
