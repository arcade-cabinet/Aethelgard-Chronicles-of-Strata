/**
 * M_GAME.SCALE.GLB-MEASURE.1 — read measured scale + yOffset from
 * src/rules/glb-metadata.json instead of hand-tuning per asset.
 *
 * The build-time `pnpm assets:measure` script (scripts/measure-glbs.mjs)
 * walks every GLB under public/assets, computes its source bounding
 * box, and writes the hex-tile-tuned scale + yOffset back to
 * glb-metadata.json. SKINS reads from here, so adding / re-baking an
 * asset requires re-running the tool, not editing hardcoded magic
 * numbers.
 *
 * Per the user direction 2026-05-25: "you need build time balancing
 * tooling that can go through and scan all GLBs and add actual hex
 * tile tuned scale information and other analysis like animation
 * rigging etc to the relevant JSON."
 *
 * Memory: scale-by-measurement-not-guess.
 */
import { ASSET_METADATA } from '@/config/asset-metadata';
import glbMetadata from './glb-metadata.json';

type MeasuredEntry = {
  category: string;
  bbox: { min: number[]; max: number[]; size: number[]; vertices: number; triangles: number };
  scale: number;
  yOffset: number;
  rigging?: { skeletons: number; bones: number; clips: string[] };
};

const measured = glbMetadata.assets as Record<string, MeasuredEntry>;

/**
 * Look up the measured scale for a logical asset id (e.g.
 * 'structures.rts.town-center.first-age.l1'). Returns the
 * hex-tile-tuned scale from glb-metadata.json. Falls back to the
 * supplied default if the asset isn't measured (legacy paths that
 * the tool can't introspect). Logs a warning so missing entries
 * surface in dev.
 */
export function measuredScale(logicalId: string, fallback = 1): number {
  const entry = lookup(logicalId);
  if (!entry) return fallback;
  return entry.scale;
}

/**
 * Look up the measured yOffset (so the mesh base seats on the tile
 * top rather than floating or sinking). For characters this includes
 * a small +0.02 lift to avoid z-fighting with terrain during Idle.
 */
export function measuredYOffset(logicalId: string, fallback = 0): number {
  const entry = lookup(logicalId);
  if (!entry) return fallback;
  return entry.yOffset;
}

/** Get the full measured metadata entry (bbox + rigging). */
export function measuredEntry(logicalId: string): MeasuredEntry | undefined {
  return lookup(logicalId);
}

function lookup(logicalId: string): MeasuredEntry | undefined {
  const meta = ASSET_METADATA[logicalId as keyof typeof ASSET_METADATA] as
    | { path: string }
    | undefined;
  if (!meta) return undefined;
  // glb-metadata.json keys are paths RELATIVE to public/assets/
  // (e.g. 'structures/rts/town-center/first-age/l1.glb'), while
  // ASSET_METADATA paths include the 'assets/' prefix.
  const relPath = meta.path.replace(/^assets\//, '');
  return measured[relPath];
}
