/**
 * Real 3D mountain peaks. Every level-5+ tile gets a mountain mesh;
 * level-6 tiles add a snow cap. Mirrors poc1's `spawnEcosystem` peak
 * placement.
 *
 * M_V11.POLISH.MOUNTAINS.VARIANTS — peak SHAPE varies per tile so a
 * mountain range reads as a real range, not a row of identical cones.
 * Four shape archetypes selected deterministically from the tile's
 * (q, r) coordinates (which derive from the map seed via board gen):
 *
 *   - 'jagged'  — sharp single cone with two offset sub-ridges (the
 *                  classic alpine spire shape; ~40% weight).
 *   - 'dome'    — rounded eroded shape; truncated sphere on a stub
 *                  cone base (ancient/glaciated peak; ~25% weight).
 *   - 'mesa'    — stepped flat-top plateau; two stacked low cylinders
 *                  + a thin cap slab (Monument Valley shape; ~20% weight).
 *   - 'cliff'   — asymmetric ridge with one sheer vertical face and
 *                  one sloped face (~15% weight).
 *
 * All four cast/receive shadows and use the same `slateRock` material
 * so they read as one biome family despite the shape variety. Snow caps
 * still apply on level-6 tiles regardless of shape.
 */
import { useMemo } from 'react';
import { TILE_HEIGHT } from '@/config/world';
import type { BoardData } from '@/core/board';
import { axialToWorld } from '@/core/hex';
import { biomeFlagsFor } from '@/rules/biome-flags';

type PeakShape = 'jagged' | 'dome' | 'mesa' | 'cliff';

/** A placed mountain peak. */
interface Peak {
  /** Stable React key. */
  key: string;
  /** World position of the tile centre. */
  x: number;
  /** Y of the tile top face. */
  y: number;
  /** World position. */
  z: number;
  /** Whether this peak carries a snow cap (level-6 tiles). */
  snow: boolean;
  /** Per-peak yaw so peaks do not all face the same way. */
  yaw: number;
  /** Shape archetype — picked deterministically from (q, r). */
  shape: PeakShape;
  /** Per-peak height jitter 0.85–1.15 so even same-shape peaks differ. */
  heightScale: number;
}

/** Deterministic shape pick from a tile coordinate. Weights:
 *  jagged 40% / dome 25% / mesa 20% / cliff 15%. */
function pickShape(q: number, r: number): PeakShape {
  // Hash q,r into 0..99. Mix primes that are pairwise coprime so
  // adjacent tiles get different shapes — clusters of identical-
  // shape peaks read as fake.
  const h = ((q * 311 + r * 643 + q * r * 977) >>> 0) % 100;
  if (h < 40) return 'jagged';
  if (h < 65) return 'dome';
  if (h < 85) return 'mesa';
  return 'cliff';
}

/** Per-peak height scale derived from (q, r) — keeps same-shape
 *  neighbouring peaks visually distinct. Range 0.85–1.15. */
function pickHeightScale(q: number, r: number): number {
  const h = ((q * 53 + r * 191) >>> 0) % 31;
  return 0.85 + (h / 31) * 0.3;
}

const ROCK_COLOR = '#475569';
const ROCK_ROUGHNESS = 0.95;
const SNOW_COLOR = '#f8fafc';

function PeakJagged({ heightScale }: { heightScale: number }) {
  const h = 3.5 * heightScale;
  return (
    <>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <coneGeometry args={[1.6, h, 6]} />
        <meshStandardMaterial color={ROCK_COLOR} flatShading roughness={ROCK_ROUGHNESS} />
      </mesh>
      {/* Two shorter offset sub-ridges for jagged silhouette. */}
      <mesh position={[0.85, h * 0.45, 0.3]} rotation={[0, Math.PI / 6, 0.18]} castShadow>
        <coneGeometry args={[0.85, h * 0.7, 5]} />
        <meshStandardMaterial color={ROCK_COLOR} flatShading roughness={ROCK_ROUGHNESS} />
      </mesh>
      <mesh position={[-0.7, h * 0.4, -0.45]} rotation={[0, -Math.PI / 5, -0.15]} castShadow>
        <coneGeometry args={[0.7, h * 0.6, 5]} />
        <meshStandardMaterial color={ROCK_COLOR} flatShading roughness={ROCK_ROUGHNESS} />
      </mesh>
    </>
  );
}

function PeakDome({ heightScale }: { heightScale: number }) {
  const h = 2.8 * heightScale;
  return (
    <>
      {/* Stub cone base for the dome to sit on (so the dome doesn't
          look like a buried sphere). */}
      <mesh position={[0, h * 0.3, 0]} castShadow receiveShadow>
        <coneGeometry args={[1.7, h * 0.6, 7]} />
        <meshStandardMaterial color={ROCK_COLOR} flatShading roughness={ROCK_ROUGHNESS} />
      </mesh>
      {/* Truncated sphere on top — eroded summit. */}
      <mesh position={[0, h * 0.65, 0]} castShadow receiveShadow>
        <sphereGeometry args={[1.25, 12, 8, 0, Math.PI * 2, 0, Math.PI / 1.6]} />
        <meshStandardMaterial color={ROCK_COLOR} flatShading roughness={ROCK_ROUGHNESS} />
      </mesh>
    </>
  );
}

function PeakMesa({ heightScale }: { heightScale: number }) {
  const h = 2.4 * heightScale;
  return (
    <>
      {/* Wide stepped base. */}
      <mesh position={[0, h * 0.18, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.7, 1.85, h * 0.36, 8]} />
        <meshStandardMaterial color={ROCK_COLOR} flatShading roughness={ROCK_ROUGHNESS} />
      </mesh>
      {/* Mid step. */}
      <mesh position={[0, h * 0.55, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.3, 1.5, h * 0.4, 8]} />
        <meshStandardMaterial color={ROCK_COLOR} flatShading roughness={ROCK_ROUGHNESS} />
      </mesh>
      {/* Flat top slab. */}
      <mesh position={[0, h * 0.88, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.05, 1.2, h * 0.18, 8]} />
        <meshStandardMaterial color={ROCK_COLOR} flatShading roughness={ROCK_ROUGHNESS} />
      </mesh>
    </>
  );
}

function PeakCliff({ heightScale }: { heightScale: number }) {
  const h = 3.0 * heightScale;
  // A box with a triangular wedge on top, offset so one face is
  // sheer-vertical and the opposite face slopes. The wedge gives it
  // the "leaning" cliff silhouette.
  return (
    <>
      {/* sheer block — one face is vertical, the body's top is at h*0.6 */}
      <mesh position={[0, h * 0.3, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.2, h * 0.6, 1.7]} />
        <meshStandardMaterial color={ROCK_COLOR} flatShading roughness={ROCK_ROUGHNESS} />
      </mesh>
      {/* Sloped ridge cap — a 4-sided cone offset toward -X so the +X
          face stays vertical. */}
      <mesh position={[-0.55, h * 0.78, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[1.6, h * 0.55, 4]} />
        <meshStandardMaterial color={ROCK_COLOR} flatShading roughness={ROCK_ROUGHNESS} />
      </mesh>
    </>
  );
}

/** Snow cap matched to each shape's apex height. */
function SnowCap({ shape, heightScale }: { shape: PeakShape; heightScale: number }) {
  if (shape === 'mesa') {
    // Flat snow slab covering the top step.
    return (
      <mesh position={[0, 2.4 * heightScale * 1.0, 0]} castShadow>
        <cylinderGeometry args={[1.05, 1.1, 0.18, 8]} />
        <meshStandardMaterial color={SNOW_COLOR} flatShading roughness={0.6} />
      </mesh>
    );
  }
  if (shape === 'dome') {
    return (
      <mesh position={[0, 2.8 * heightScale * 0.82, 0]} castShadow>
        <sphereGeometry args={[1.05, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2.2]} />
        <meshStandardMaterial color={SNOW_COLOR} flatShading roughness={0.6} />
      </mesh>
    );
  }
  if (shape === 'cliff') {
    return (
      <mesh
        position={[-0.55, 3.0 * heightScale * 0.95, 0]}
        rotation={[0, Math.PI / 4, 0]}
        castShadow
      >
        <coneGeometry args={[0.85, 0.9, 4]} />
        <meshStandardMaterial color={SNOW_COLOR} flatShading roughness={0.6} />
      </mesh>
    );
  }
  // jagged
  return (
    <mesh position={[0, 3.5 * heightScale * 0.74, 0]} castShadow>
      <coneGeometry args={[0.85, 1.8, 6]} />
      <meshStandardMaterial color={SNOW_COLOR} flatShading roughness={0.6} />
    </mesh>
  );
}

export function Mountains({ board }: { board: BoardData }) {
  const peaks = useMemo<Peak[]>(() => {
    const out: Peak[] = [];
    for (const tile of board.tiles.values()) {
      // M_REGISTRY.10 — peak placement driven by per-biome `peakLevel`
      // slot. HIGHLAND + MOUNTAIN both place peaks at level >= 5;
      // other biomes never (peakLevel = null). Future tribes / map
      // types can opt biomes in/out without code edits.
      const peakLevel = biomeFlagsFor(tile.type).peakLevel;
      if (peakLevel === null || tile.level < peakLevel) continue;
      const { x, z } = axialToWorld(tile.q, tile.r);
      out.push({
        key: `${tile.q},${tile.r}`,
        x,
        y: tile.level * TILE_HEIGHT,
        z,
        snow: tile.level >= 6,
        yaw: ((tile.q * 73 + tile.r * 149) % 360) * (Math.PI / 180),
        shape: pickShape(tile.q, tile.r),
        heightScale: pickHeightScale(tile.q, tile.r),
      });
    }
    return out;
  }, [board]);

  return (
    <group name="mountains">
      {peaks.map((p) => (
        <group key={p.key} position={[p.x, p.y, p.z]} rotation={[0, p.yaw, 0]}>
          {p.shape === 'jagged' && <PeakJagged heightScale={p.heightScale} />}
          {p.shape === 'dome' && <PeakDome heightScale={p.heightScale} />}
          {p.shape === 'mesa' && <PeakMesa heightScale={p.heightScale} />}
          {p.shape === 'cliff' && <PeakCliff heightScale={p.heightScale} />}
          {p.snow && <SnowCap shape={p.shape} heightScale={p.heightScale} />}
        </group>
      ))}
    </group>
  );
}
