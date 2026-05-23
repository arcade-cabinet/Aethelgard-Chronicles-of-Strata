import { Clone, useGLTF } from '@react-three/drei';
import { useMemo } from 'react';
import { assets } from '@/assets/assets';
import { TILE_HEIGHT } from '@/config/world';
import type { BiomeType } from '@/core/biome';
import type { BoardData } from '@/core/board';
import { axialToWorld, parseHexKey } from '@/core/hex';
import { createMapPrng } from '@/core/rng';
import type { BuildingType } from '@/ecs/components';
import { profileFor } from '@/rules/building-profiles';
import { skinFor } from '@/rules/skins';

// ---------------------------------------------------------------------------
// Per-biome decoration palette
// Each entry names a curated set of asset logical-ids and their spawn weight.
// The weights are relative — they do not need to sum to 1.
// ---------------------------------------------------------------------------

interface PropEntry {
  /** Logical asset id. */
  id: string;
  /** Relative spawn weight (higher = more common). */
  weight: number;
  /**
   * Optional Y-offset above tile top face. Small items like flowers need a
   * slight lift to avoid z-fighting with the tile mesh.
   */
  yOffset?: number;
  /** Optional uniform scale override. */
  scale?: number;
}

/** Weighted palette for one biome. `density` ∈ [0,1] — fraction of eligible tiles decorated. */
interface BiomePalette {
  density: number;
  props: PropEntry[];
}

const PALETTES: Partial<Record<BiomeType, BiomePalette>> = {
  FOREST: {
    density: 0.55,
    props: [
      { id: 'nature.tree.broadleaf-a', weight: 20 },
      { id: 'nature.tree.broadleaf-b', weight: 15 },
      { id: 'nature.tree.oak-a', weight: 15 },
      { id: 'nature.tree.pine-a', weight: 12 },
      { id: 'nature.tree.pine-b', weight: 10 },
      { id: 'nature.tree.pine-tall-a', weight: 8 },
      { id: 'nature.tree.pine-round-a', weight: 8 },
      { id: 'nature.mushroom-a', weight: 5, yOffset: 0.05, scale: 0.8 },
      { id: 'nature.mushroom-b', weight: 5, yOffset: 0.05, scale: 0.8 },
      { id: 'nature.stump-a', weight: 4, scale: 0.9 },
      { id: 'nature.bush-a', weight: 6, scale: 0.85 },
      { id: 'nature.bush-c', weight: 5, scale: 0.7 },
    ],
  },
  GRASS: {
    density: 0.32,
    props: [
      { id: 'nature.tree.small-a', weight: 18 },
      { id: 'nature.tree.broadleaf-a', weight: 10 },
      { id: 'nature.tree.oak-a', weight: 8 },
      { id: 'nature.bush-a', weight: 14, scale: 0.9 },
      { id: 'nature.bush-b', weight: 10, scale: 0.85 },
      { id: 'nature.bush-c', weight: 10, scale: 0.7 },
      { id: 'nature.flower-a', weight: 12, yOffset: 0.05, scale: 0.6 },
      { id: 'nature.flower-b', weight: 12, yOffset: 0.05, scale: 0.6 },
      { id: 'nature.flower-c', weight: 10, yOffset: 0.05, scale: 0.6 },
      { id: 'nature.grass-tuft', weight: 8, scale: 0.7 },
    ],
  },
  BEACH: {
    density: 0.18,
    props: [
      { id: 'nature.tree.palm-a', weight: 30 },
      { id: 'nature.tree.palm-bend', weight: 20 },
      { id: 'nature.flower-b', weight: 15, yOffset: 0.04, scale: 0.55 },
      { id: 'nature.grass-tuft', weight: 15, scale: 0.6 },
      { id: 'nature.rock.small-a', weight: 10, scale: 0.7 },
    ],
  },
  DESERT: {
    density: 0.22,
    props: [
      { id: 'nature.cactus.tall', weight: 25 },
      { id: 'nature.cactus.short', weight: 20 },
      { id: 'nature.rock.td-rocks', weight: 18, scale: 0.9 },
      { id: 'nature.rock.td-rocks-large', weight: 12, scale: 0.85 },
      { id: 'nature.mound-a', weight: 15, scale: 0.8 },
      { id: 'nature.mound-b', weight: 10, scale: 0.75 },
    ],
  },
  HIGHLAND: {
    density: 0.3,
    props: [
      { id: 'nature.rock.large-a', weight: 20 },
      { id: 'nature.rock.large-b', weight: 18 },
      { id: 'nature.rock.large-c', weight: 15 },
      { id: 'nature.rock.tall-a', weight: 12 },
      { id: 'nature.rock.crystal-a', weight: 14 },
      { id: 'nature.rock.crystal-large', weight: 10 },
      { id: 'nature.rock.td-rocks', weight: 8, scale: 0.9 },
      { id: 'nature.tree.pine-a', weight: 3 },
    ],
  },
  MOUNTAIN: {
    density: 0.35,
    props: [
      { id: 'nature.rock.large-a', weight: 18 },
      { id: 'nature.rock.large-b', weight: 16 },
      { id: 'nature.rock.large-c', weight: 14 },
      { id: 'nature.rock.tall-a', weight: 14 },
      { id: 'nature.rock.crystal-a', weight: 16 },
      { id: 'nature.rock.crystal-large', weight: 12 },
      { id: 'nature.rock.td-rocks-large', weight: 10 },
    ],
  },
};

// ---------------------------------------------------------------------------
// All decoration asset ids used anywhere in the palettes.
// The order here is FIXED — hooks must be called in constant order per render.
// ---------------------------------------------------------------------------

/** Stable ordered list of every decoration asset. DO NOT reorder. */
const DECO_IDS = [
  'nature.tree.broadleaf-a',
  'nature.tree.broadleaf-b',
  'nature.tree.oak-a',
  'nature.tree.pine-a',
  'nature.tree.pine-b',
  'nature.tree.pine-tall-a',
  'nature.tree.pine-round-a',
  'nature.tree.small-a',
  'nature.tree.palm-a',
  'nature.tree.palm-bend',
  'nature.mushroom-a',
  'nature.mushroom-b',
  'nature.stump-a',
  'nature.bush-a',
  'nature.bush-b',
  'nature.bush-c',
  'nature.flower-a',
  'nature.flower-b',
  'nature.flower-c',
  'nature.grass-tuft',
  'nature.cactus.tall',
  'nature.cactus.short',
  'nature.rock.large-a',
  'nature.rock.large-b',
  'nature.rock.large-c',
  'nature.rock.tall-a',
  'nature.rock.small-a',
  'nature.rock.crystal-a',
  'nature.rock.crystal-large',
  'nature.rock.td-rocks',
  'nature.rock.td-rocks-large',
  'nature.mound-a',
  'nature.mound-b',
] as const;

// M_MICRO.B.4 — verify DECO_IDS covers every asset referenced by
// PALETTES. The DECO_IDS list is the hook-call source (must be
// fixed-order for rules-of-hooks); the palettes are the per-biome
// scatter sources. Drift between the two would silently skip preload
// for new palette additions; this assertion fires at module-load if
// a palette mentions an asset DECO_IDS forgot.
const DECO_ID_SET: ReadonlySet<string> = new Set(DECO_IDS);
for (const palette of Object.values(PALETTES)) {
  for (const prop of palette.props) {
    if (!DECO_ID_SET.has(prop.id)) {
      throw new Error(
        `Decoration: PALETTES references "${prop.id}" but it is missing from DECO_IDS — add it (in fixed order) to keep useGLTF call order constant per rules-of-hooks.`,
      );
    }
  }
}

// Preload every decoration mesh at module load time.
for (const id of DECO_IDS) {
  useGLTF.preload(assets.url(id));
}

// ---------------------------------------------------------------------------
// Hook: load all decoration GLTFs at the top level (constant call order)
// ---------------------------------------------------------------------------

/**
 * Loads all 33 decoration GLTF assets and returns them keyed by logical id.
 * Every `useGLTF` call is unconditional and at the top level of this hook so
 * React's rules-of-hooks are satisfied. The order of calls matches DECO_IDS
 * and must never change.
 */
type SingleGltf = Exclude<ReturnType<typeof useGLTF>, unknown[]>;

function useDecorationGltfs(): Readonly<Record<string, SingleGltf>> {
  // One useGLTF call per asset — NEVER inside a loop or conditional.
  const g00 = useGLTF(assets.url('nature.tree.broadleaf-a'));
  const g01 = useGLTF(assets.url('nature.tree.broadleaf-b'));
  const g02 = useGLTF(assets.url('nature.tree.oak-a'));
  const g03 = useGLTF(assets.url('nature.tree.pine-a'));
  const g04 = useGLTF(assets.url('nature.tree.pine-b'));
  const g05 = useGLTF(assets.url('nature.tree.pine-tall-a'));
  const g06 = useGLTF(assets.url('nature.tree.pine-round-a'));
  const g07 = useGLTF(assets.url('nature.tree.small-a'));
  const g08 = useGLTF(assets.url('nature.tree.palm-a'));
  const g09 = useGLTF(assets.url('nature.tree.palm-bend'));
  const g10 = useGLTF(assets.url('nature.mushroom-a'));
  const g11 = useGLTF(assets.url('nature.mushroom-b'));
  const g12 = useGLTF(assets.url('nature.stump-a'));
  const g13 = useGLTF(assets.url('nature.bush-a'));
  const g14 = useGLTF(assets.url('nature.bush-b'));
  const g15 = useGLTF(assets.url('nature.bush-c'));
  const g16 = useGLTF(assets.url('nature.flower-a'));
  const g17 = useGLTF(assets.url('nature.flower-b'));
  const g18 = useGLTF(assets.url('nature.flower-c'));
  const g19 = useGLTF(assets.url('nature.grass-tuft'));
  const g20 = useGLTF(assets.url('nature.cactus.tall'));
  const g21 = useGLTF(assets.url('nature.cactus.short'));
  const g22 = useGLTF(assets.url('nature.rock.large-a'));
  const g23 = useGLTF(assets.url('nature.rock.large-b'));
  const g24 = useGLTF(assets.url('nature.rock.large-c'));
  const g25 = useGLTF(assets.url('nature.rock.tall-a'));
  const g26 = useGLTF(assets.url('nature.rock.small-a'));
  const g27 = useGLTF(assets.url('nature.rock.crystal-a'));
  const g28 = useGLTF(assets.url('nature.rock.crystal-large'));
  const g29 = useGLTF(assets.url('nature.rock.td-rocks'));
  const g30 = useGLTF(assets.url('nature.rock.td-rocks-large'));
  const g31 = useGLTF(assets.url('nature.mound-a'));
  const g32 = useGLTF(assets.url('nature.mound-b'));

  // Build the lookup map. useMemo is NOT used here intentionally — this is a
  // pure object construction from values already loaded (stable references
  // from useGLTF's internal cache). Rebuilding on every render is O(33) and
  // cheaper than an additional hook.
  return {
    'nature.tree.broadleaf-a': g00,
    'nature.tree.broadleaf-b': g01,
    'nature.tree.oak-a': g02,
    'nature.tree.pine-a': g03,
    'nature.tree.pine-b': g04,
    'nature.tree.pine-tall-a': g05,
    'nature.tree.pine-round-a': g06,
    'nature.tree.small-a': g07,
    'nature.tree.palm-a': g08,
    'nature.tree.palm-bend': g09,
    'nature.mushroom-a': g10,
    'nature.mushroom-b': g11,
    'nature.stump-a': g12,
    'nature.bush-a': g13,
    'nature.bush-b': g14,
    'nature.bush-c': g15,
    'nature.flower-a': g16,
    'nature.flower-b': g17,
    'nature.flower-c': g18,
    'nature.grass-tuft': g19,
    'nature.cactus.tall': g20,
    'nature.cactus.short': g21,
    'nature.rock.large-a': g22,
    'nature.rock.large-b': g23,
    'nature.rock.large-c': g24,
    'nature.rock.tall-a': g25,
    'nature.rock.small-a': g26,
    'nature.rock.crystal-a': g27,
    'nature.rock.crystal-large': g28,
    'nature.rock.td-rocks': g29,
    'nature.rock.td-rocks-large': g30,
    'nature.mound-a': g31,
    'nature.mound-b': g32,
  };
}

// ---------------------------------------------------------------------------
// Weighted random selection (seeded Rng — no Math.random)
// ---------------------------------------------------------------------------

function pickWeighted(props: PropEntry[], rng: () => number): PropEntry {
  let total = 0;
  for (const p of props) total += p.weight;
  let r = rng() * total;
  for (const p of props) {
    r -= p.weight;
    if (r <= 0) return p;
  }
  return props[props.length - 1] as PropEntry;
}

// ---------------------------------------------------------------------------
// Decoration placement plan (pure, no Three.js)
// ---------------------------------------------------------------------------

interface DecoInstance {
  /** Stable React key (tile hex key). */
  key: string;
  /** Logical asset id. */
  assetId: string;
  /** World X. */
  x: number;
  /** World Y (tile top face + optional yOffset). */
  y: number;
  /** World Z. */
  z: number;
  /** Y rotation in radians. */
  rotY: number;
  /** Uniform scale. */
  scale: number;
}

/**
 * Compute the full set of decoration instances for a board deterministically.
 * Skips tiles occupied by resource nodes. Ocean and Lake tiles never receive
 * decoration.
 */
function planDecoration(board: BoardData, occupiedKeys: ReadonlySet<string>): DecoInstance[] {
  // Dedicated stream — does not consume any gameplay-RNG draws.
  const rng = createMapPrng(`${board.seedPhrase}:decoration`);

  const out: DecoInstance[] = [];
  const sortedKeys = [...board.tiles.keys()].sort();

  for (const key of sortedKeys) {
    const tile = board.tiles.get(key);
    if (!tile) continue;
    if (tile.type === 'OCEAN' || tile.type === 'LAKE') continue;
    if (occupiedKeys.has(key)) continue;
    // never scatter props onto a crossing's landing tile — they would block it
    if (tile.isCrossingLanding) continue;

    const palette = PALETTES[tile.type];
    if (!palette) continue;

    if (rng() > palette.density) continue;

    const prop = pickWeighted(palette.props, rng);

    // Small XZ jitter within the tile (radius ~0.4 world units) + full yaw.
    const offsetX = (rng() - 0.5) * 0.8;
    const offsetZ = (rng() - 0.5) * 0.8;
    const rotY = rng() * Math.PI * 2;
    const { x, z } = axialToWorld(tile.q, tile.r);

    out.push({
      key,
      assetId: prop.id,
      x: x + offsetX,
      y: tile.level * TILE_HEIGHT + (prop.yOffset ?? 0),
      z: z + offsetZ,
      rotY,
      scale: prop.scale ?? 1,
    });
  }

  return out;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

// M_REGISTRY.7 + M_ARCH_UNIFY.9 — per-faction base-accretion is the
// `baseAccretion` slot on Skin (`src/rules/skins.ts` → BaseAccretionSkin).
// Was a local BaseAccretion interface here; type moved with the data so
// every consumer reads through skinFor(faction).baseAccretion.

/**
 * Per-building accretion config (M_MAPGEN.13). Each completed building's
 * type drives a small prop scatter in a 1-hex ring around it (per user:
 * "different buildings can have different adherence and accretion rules
 * and so on"). Composes with BASE_ACCRETION (which is per-FactionBase).
 * Adding a building accretion = ONE row.
 */
// M_REGISTRY.7 + M_ARCH_UNIFY.9 — per-building accretion moved to the
// BUILDING_PROFILES `accretion` slot (`src/rules/building-profiles.ts`
// → AccretionSlot). Decoration reads through profileFor(type).accretion;
// a missing slot = no accretion (House / Watchtower / Wall / TownHall /
// Wonder remain minimal; TownHall already gets baseAccretion via the
// Skin slot).

// M_REGISTRY.7 — BASE_ACCRETION moved to SKINS[faction].baseAccretion.
// Decoration reads through skinFor(faction).baseAccretion; the per-
// faction config table lives in src/rules/skins.ts. A future tribe
// drops its accretion pool in as ONE Skin row.

/**
 * M_MAPGEN.8+.11 — paint a faction-base accretion cluster around the
 * given base hex. Driven entirely by the BASE_ACCRETION config table;
 * adding a faction or swapping a prop pool is one config-row change.
 */
function appendBaseAccretion(
  out: DecoInstance[],
  board: BoardData,
  baseKey: string | undefined,
  faction: 'player' | 'enemy',
): void {
  if (!baseKey) return;
  const { q: bq, r: br } = parseHexKey(baseKey);
  // M_REGISTRY.7 — read from the Skin slot.
  const cfg = skinFor(faction).baseAccretion;
  const rng = createMapPrng(`${board.seedPhrase}:${cfg.seedTag}`);
  const [scaleLo, scaleHi] = cfg.scaleRange;
  for (let dq = -cfg.radius; dq <= cfg.radius; dq++) {
    for (let dr = -cfg.radius; dr <= cfg.radius; dr++) {
      const q = bq + dq;
      const r = br + dr;
      const dist = (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
      if (dist === 0 || dist > cfg.radius) continue;
      const tile = board.tiles.get(`${q},${r}`);
      if (!tile || tile.type === 'OCEAN' || tile.type === 'LAKE') continue;
      if (tile.isCrossingLanding) continue;
      if (rng() > cfg.density) continue;
      const idx = Math.floor(rng() * cfg.propPool.length);
      const assetId = cfg.propPool[idx] ?? cfg.propPool[0];
      if (!assetId) continue;
      const offsetX = (rng() - 0.5) * 0.7;
      const offsetZ = (rng() - 0.5) * 0.7;
      const rotY = rng() * Math.PI * 2;
      const { x, z } = axialToWorld(q, r);
      out.push({
        key: `${cfg.seedTag}-${q},${r}`,
        assetId,
        x: x + offsetX,
        y: tile.level * TILE_HEIGHT,
        z: z + offsetZ,
        rotY,
        scale: scaleLo + rng() * (scaleHi - scaleLo),
      });
    }
  }
}

/**
 * M_MAPGEN.13 — per-completed-building accretion scatter. Reads
 * BUILDING_ACCRETION; iterates each build site that has a configured
 * profile + is complete; paints a 1-hex ring of props.
 */
interface BuildSiteSnap {
  key: string;
  q: number;
  r: number;
  level: number;
  type: BuildingType;
  isComplete: boolean;
}

function appendBuildingAccretion(
  out: DecoInstance[],
  board: BoardData,
  sites: ReadonlyArray<BuildSiteSnap>,
): void {
  const rng = createMapPrng(`${board.seedPhrase}:building-accretion`);
  const NEIGHBORS = [
    [1, 0],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [0, -1],
    [1, -1],
  ] as const;
  for (const site of sites) {
    if (!site.isComplete) continue;
    // M_REGISTRY.7 — read from the BUILDING_PROFILES slot.
    const cfg = profileFor(site.type).accretion;
    if (!cfg) continue;
    const [scaleLo, scaleHi] = cfg.scaleRange;
    for (const [dq, dr] of NEIGHBORS) {
      const q = site.q + dq;
      const r = site.r + dr;
      const tile = board.tiles.get(`${q},${r}`);
      if (!tile || tile.type === 'OCEAN' || tile.type === 'LAKE') continue;
      if (tile.isCrossingLanding) continue;
      if (rng() > cfg.density) continue;
      const idx = Math.floor(rng() * cfg.propPool.length);
      const assetId = cfg.propPool[idx] ?? cfg.propPool[0];
      if (!assetId) continue;
      const offsetX = (rng() - 0.5) * 0.6;
      const offsetZ = (rng() - 0.5) * 0.6;
      const rotY = rng() * Math.PI * 2;
      const { x, z } = axialToWorld(q, r);
      out.push({
        key: `bld-${site.key}-${q},${r}`,
        assetId,
        x: x + offsetX,
        y: tile.level * TILE_HEIGHT,
        z: z + offsetZ,
        rotY,
        scale: scaleLo + rng() * (scaleHi - scaleLo),
      });
    }
  }
}

/** Props for the Decoration component. */
export interface DecorationProps {
  /** The generated board (supplies tile biomes + levels). */
  board: BoardData;
  /**
   * Hex tile keys already occupied by a resource node or building.
   * Decoration is skipped for these tiles so props do not overlap gameplay
   * objects. Build a Set from `game.resourceNodes.map(n => n.key)` at the
   * call site.
   */
  occupiedKeys: ReadonlySet<string>;
  /** Enemy base tile key — drives the enemy faction accretion cluster. */
  enemyBaseKey?: string;
  /** Player base tile key — drives the player faction accretion cluster. */
  playerBaseKey?: string;
  /** Live build-site snapshots — drives per-building accretion (M_MAPGEN.13). */
  buildSites?: ReadonlyArray<BuildSiteSnap>;
}

/**
 * Scatters ambient decoration props across the board's biomes.
 * Fully deterministic — seeds a PRNG from `board.seedPhrase` via
 * `createMapPrng`, never calls `Math.random`. Visual-only; no ECS components,
 * no pathfinding impact. Geometry is owned by the useGLTF cache and shared via
 * Clone so no manual disposal is needed here.
 */
export function Decoration({
  board,
  occupiedKeys,
  enemyBaseKey,
  playerBaseKey,
  buildSites,
}: DecorationProps) {
  const gltfs = useDecorationGltfs();

  // Compute the placement plan once per board + occupiedKeys change.
  // buildSitesKey condenses the per-tick snapshot into a string dep so the
  // memo re-fires when buildings complete (not on every frame).
  const buildSitesKey = (buildSites ?? []).map((s) => `${s.key}:${s.isComplete ? 1 : 0}`).join('|');
  const instances = useMemo(() => {
    const list = planDecoration(board, occupiedKeys);
    appendBaseAccretion(list, board, playerBaseKey, 'player');
    appendBaseAccretion(list, board, enemyBaseKey, 'enemy');
    if (buildSites && buildSites.length > 0) appendBuildingAccretion(list, board, buildSites);
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, occupiedKeys, enemyBaseKey, playerBaseKey, buildSitesKey]);

  return (
    <group name="decoration">
      {instances.map((inst) => {
        const gltf = gltfs[inst.assetId];
        if (!gltf) return null;
        return (
          <group
            key={inst.key}
            position={[inst.x, inst.y, inst.z]}
            rotation={[0, inst.rotY, 0]}
            scale={inst.scale}
          >
            <Clone object={gltf.scene} />
          </group>
        );
      })}
    </group>
  );
}
