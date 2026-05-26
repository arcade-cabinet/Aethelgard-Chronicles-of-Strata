#!/usr/bin/env node
/**
 * GLB measurement tool — derives the correct hex-tile-tuned scale +
 * yOffset + rigging metadata for every GLB referenced by the game,
 * and writes it to `src/rules/glb-metadata.json` for SKINS to read.
 *
 * Why this tool exists (memory: scale-by-measurement-not-guess):
 *   The user explicitly rejected eyeball/guess scale tweaks. GLBs
 *   ship at wildly varying source scales (KayKit characters in
 *   meters, Quaternius RTS structures in ~8-unit grids, Kenney
 *   props in ~1-unit cubes). Hand-tuning each entry is unreliable
 *   and brittle. This tool computes the right number from the
 *   actual bounding box of each mesh.
 *
 * The rule (per category):
 *   - character: scale so the unit's tallest axis = TARGET_UNIT_HEIGHT
 *     (0.95 world units — ~95% of hex radius for the silhouette).
 *   - structure (Town Hall + base): scale so the longest XZ footprint
 *     = TARGET_BUILDING_FOOTPRINT (~1.1 hex widths — fills the tile,
 *     spills slightly so it reads dominant).
 *   - structure (wall/watchtower): scale so footprint = TARGET_WALL_FOOTPRINT
 *     (0.8 hex widths — fits with a clear gap).
 *   - structure (prop/decoration): scale so longest dim = TARGET_PROP_DIM
 *     (0.5 hex widths — clearly decorative).
 *   - structure (Wonder): scale so footprint = TARGET_WONDER_FOOTPRINT
 *     (1.6 hex widths — towers over the realm).
 *
 * yOffset is derived from the bbox.min.y after centering — pulls the
 * mesh down so its base sits on the tile top instead of floating.
 *
 * Rigging metadata (for character GLBs) is sparse for now: vertex/
 * triangle counts + skeleton bone count if present + animation clip
 * names. Future iterations can use this to validate that the shared
 * Rig_Medium/Rig_Large skeletons retarget cleanly onto each character.
 *
 * Usage: `pnpm assets:measure` (after `pnpm assets:ingest`).
 */
import { NodeIO } from '@gltf-transform/core';
import { writeFile, readdir } from 'node:fs/promises';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const PUBLIC_ASSETS = join(REPO_ROOT, 'public/assets');
const OUTPUT_JSON = join(REPO_ROOT, 'src/rules/glb-metadata.json');

const TARGET_UNIT_HEIGHT = 0.95;
const TARGET_BUILDING_FOOTPRINT = 1.1;
const TARGET_WALL_FOOTPRINT = 0.8;
const TARGET_PROP_DIM = 0.5;
const TARGET_WONDER_FOOTPRINT = 1.6;

/**
 * Decide which scaling rule applies to this asset given its public-assets
 * relative path. We don't read the SKINS table — that would be a circular
 * dependency. Instead we infer category from path conventions: characters
 * live under characters/, structures under structures/ (with subcat for
 * wall/wonder), nature/ are props, board/ are biome tiles (we DON'T
 * rescale these — terrain is computed from HEX_RADIUS at gen time).
 */
function categoryFor(relPath) {
  if (relPath.startsWith('characters/')) return 'character';
  if (relPath.startsWith('board/')) return 'tile'; // skipped
  if (relPath.startsWith('nature/')) return 'prop';
  if (relPath.startsWith('structures/')) {
    const tail = relPath.toLowerCase();
    if (tail.includes('wonder')) return 'wonder';
    if (tail.includes('wall')) return 'wall';
    if (tail.includes('watchtower') || tail.includes('tower-house')) return 'wall';
    if (tail.includes('banner') || tail.includes('fountain') || tail.includes('gravestone'))
      return 'prop';
    return 'building';
  }
  return 'prop'; // fallback
}

/** Walk a directory recursively, yielding every .glb file's absolute path. */
async function* walkGlbs(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkGlbs(full);
    } else if (entry.isFile() && entry.name.endsWith('.glb')) {
      yield full;
    }
  }
}

/**
 * Compute the world-space bounding box of a glTF document's default scene.
 * gltf-transform stores accessors with raw vertex data; we project every
 * primitive's position array through its node's world matrix to get
 * world-space extents.
 */
function computeBbox(doc) {
  const root = doc.getRoot();
  const scene = root.listScenes()[0];
  if (!scene) return null;
  let minX = Infinity,
    minY = Infinity,
    minZ = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity,
    maxZ = -Infinity;
  let vertCount = 0;
  let triCount = 0;

  const walk = (node, parentMatrix) => {
    const localMatrix = nodeMatrix(node);
    const worldMatrix = multiply4x4(parentMatrix, localMatrix);
    const mesh = node.getMesh();
    if (mesh) {
      for (const prim of mesh.listPrimitives()) {
        const positions = prim.getAttribute('POSITION');
        if (!positions) continue;
        const array = positions.getArray();
        const count = positions.getCount();
        vertCount += count;
        const indices = prim.getIndices();
        triCount += indices ? indices.getCount() / 3 : count / 3;
        for (let i = 0; i < count; i++) {
          const x = array[i * 3],
            y = array[i * 3 + 1],
            z = array[i * 3 + 2];
          const [wx, wy, wz] = applyMatrix4(worldMatrix, [x, y, z]);
          if (wx < minX) minX = wx;
          if (wx > maxX) maxX = wx;
          if (wy < minY) minY = wy;
          if (wy > maxY) maxY = wy;
          if (wz < minZ) minZ = wz;
          if (wz > maxZ) maxZ = wz;
        }
      }
    }
    for (const child of node.listChildren()) walk(child, worldMatrix);
  };

  const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  for (const node of scene.listChildren()) walk(node, identity);

  if (minX === Infinity) return null;
  return {
    min: [minX, minY, minZ],
    max: [maxX, maxY, maxZ],
    size: [maxX - minX, maxY - minY, maxZ - minZ],
    vertices: vertCount,
    triangles: Math.round(triCount),
  };
}

function nodeMatrix(node) {
  const m = node.getMatrix();
  if (m && m.length === 16) return m;
  // compose from TRS
  const t = node.getTranslation() ?? [0, 0, 0];
  const r = node.getRotation() ?? [0, 0, 0, 1];
  const s = node.getScale() ?? [1, 1, 1];
  return composeTRS(t, r, s);
}

function composeTRS(t, q, s) {
  const [x, y, z, w] = q;
  const x2 = x + x,
    y2 = y + y,
    z2 = z + z;
  const xx = x * x2,
    xy = x * y2,
    xz = x * z2;
  const yy = y * y2,
    yz = y * z2,
    zz = z * z2;
  const wx = w * x2,
    wy = w * y2,
    wz = w * z2;
  const [sx, sy, sz] = s;
  return [
    (1 - (yy + zz)) * sx,
    (xy + wz) * sx,
    (xz - wy) * sx,
    0,
    (xy - wz) * sy,
    (1 - (xx + zz)) * sy,
    (yz + wx) * sy,
    0,
    (xz + wy) * sz,
    (yz - wx) * sz,
    (1 - (xx + yy)) * sz,
    0,
    t[0],
    t[1],
    t[2],
    1,
  ];
}

function multiply4x4(a, b) {
  const result = new Array(16);
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) sum += a[i + k * 4] * b[k + j * 4];
      result[i + j * 4] = sum;
    }
  }
  return result;
}

function applyMatrix4(m, [x, y, z]) {
  const w = 1;
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12] * w,
    m[1] * x + m[5] * y + m[9] * z + m[13] * w,
    m[2] * x + m[6] * y + m[10] * z + m[14] * w,
  ];
}

function computeScaleForCategory(category, bbox) {
  const [sx, sy, sz] = bbox.size;
  const footprint = Math.max(sx, sz);
  switch (category) {
    case 'character':
      return sy > 0 ? TARGET_UNIT_HEIGHT / sy : 1;
    case 'building':
      return footprint > 0 ? TARGET_BUILDING_FOOTPRINT / footprint : 1;
    case 'wall':
      return footprint > 0 ? TARGET_WALL_FOOTPRINT / footprint : 1;
    case 'wonder':
      return footprint > 0 ? TARGET_WONDER_FOOTPRINT / footprint : 1;
    case 'prop':
      return footprint > 0 ? TARGET_PROP_DIM / footprint : 1;
    default:
      return 1;
  }
}

function computeYOffsetForCategory(category, bbox, computedScale) {
  // Pull the mesh down so bbox.min.y * scale lands at 0 (tile top).
  // Characters get a tiny lift (+0.02) so their feet aren't z-fighting
  // with terrain when the animation Idle has them grounded.
  const baseY = -bbox.min[1] * computedScale;
  if (category === 'character') return baseY + 0.02;
  return baseY;
}

/** Extract rigging info for character GLBs (skeleton + clips). */
function extractRigging(doc) {
  const root = doc.getRoot();
  const skins = root.listSkins();
  const animations = root.listAnimations();
  return {
    skeletons: skins.length,
    bones: skins.reduce((acc, s) => acc + s.listJoints().length, 0),
    clips: animations.map((a) => a.getName()),
  };
}

async function main() {
  const io = new NodeIO();
  const results = {};
  let count = 0;
  let skipped = 0;

  console.error(`[measure-glbs] scanning ${PUBLIC_ASSETS}`);
  for await (const absPath of walkGlbs(PUBLIC_ASSETS)) {
    const relPath = relative(PUBLIC_ASSETS, absPath);
    const category = categoryFor(relPath);
    if (category === 'tile') {
      skipped++;
      continue;
    }
    try {
      const doc = await io.read(absPath);
      const bbox = computeBbox(doc);
      if (!bbox) {
        console.error(`[measure-glbs] no geometry: ${relPath}`);
        skipped++;
        continue;
      }
      const scale = computeScaleForCategory(category, bbox);
      const yOffset = computeYOffsetForCategory(category, bbox, scale);
      const rigging = category === 'character' ? extractRigging(doc) : undefined;
      results[relPath] = {
        category,
        bbox,
        scale: Number(scale.toFixed(4)),
        yOffset: Number(yOffset.toFixed(4)),
        ...(rigging ? { rigging } : {}),
      };
      count++;
    } catch (err) {
      console.error(`[measure-glbs] failed ${relPath}: ${err.message}`);
      skipped++;
    }
  }

  const out = {
    $generated: 'pnpm assets:measure',
    $rules: {
      targetUnitHeight: TARGET_UNIT_HEIGHT,
      targetBuildingFootprint: TARGET_BUILDING_FOOTPRINT,
      targetWallFootprint: TARGET_WALL_FOOTPRINT,
      targetPropDim: TARGET_PROP_DIM,
      targetWonderFootprint: TARGET_WONDER_FOOTPRINT,
    },
    $note:
      'Edit this file by re-running the tool, not by hand. SKINS reads scale + yOffset from here keyed by the logical asset path (under public/assets/).',
    assets: results,
  };
  await writeFile(OUTPUT_JSON, JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.error(
    `[measure-glbs] wrote ${count} entries to ${relative(REPO_ROOT, OUTPUT_JSON)} (skipped ${skipped} tiles/errors)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
