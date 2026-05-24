/**
 * scripts/build-manifest.ts
 *
 * Walk the actual files in public/assets/ and emit
 * src/config/asset-metadata.json. The filesystem IS the source of
 * truth — no asset-map indirection, no ingest pipeline, no
 * references/ → public/ copy step. To add an asset: drop the .glb /
 * .wav / .ogg into the right directory under public/assets/, re-run
 * `pnpm assets:manifest`, commit.
 *
 * Logical id derivation:
 *   public/assets/board/tile/grass.glb       →  board.tile.grass
 *   public/assets/audio/sfx/sword-clash.wav  →  audio.sfx.sword-clash
 *   public/assets/structures/rts/town-center/first-age/l1.glb
 *                                            →  structures.rts.town-center.first-age.l1
 *
 * The id is the path relative to public/assets/, with slashes
 * replaced by dots and the extension dropped. Filenames are
 * already kebab-case by convention.
 *
 * GLB metadata (triangle count, animation clips) comes from
 * @gltf-transform/core (already a dev dep).
 */
import { readFileSync, readdirSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { NodeIO } from '@gltf-transform/core';

const REPO = process.cwd();
const ASSETS_DIR = join(REPO, 'public/assets');
const MANIFEST_OUT = join(REPO, 'src/config/asset-metadata.json');

const io = new NodeIO();

/**
 * Recursively yield every file under `root`. M_SEC_REVIEW.4 — for
 * each entry, resolve symlinks via realpathSync and confirm the
 * resolved path stays inside `root`. A symlink under public/assets/
 * pointing to /etc/passwd would otherwise propagate to the manifest
 * (and then to runtime assets.url() callers).
 */
function* walk(root: string): Generator<string> {
  const rootReal = realpathSync(root);
  for (const name of readdirSync(root)) {
    const full = join(root, name);
    let real: string;
    try {
      real = realpathSync(full);
    } catch {
      // dangling symlink or perm-error — skip silently
      continue;
    }
    // Reject anything that resolves outside ASSETS_DIR (path-traversal symlink).
    if (!real.startsWith(rootReal + sep) && real !== rootReal) continue;
    if (statSync(full).isDirectory()) yield* walk(full);
    else yield full;
  }
}

function logicalIdFor(absPath: string): string {
  const rel = relative(ASSETS_DIR, absPath);
  const noExt = rel.replace(/\.(glb|gltf|ogg|wav|mp3)$/i, '');
  return noExt.split(/[/\\]/).join('.');
}

function kindFor(absPath: string): 'glb' | 'ogg' | 'wav' {
  const ext = absPath.toLowerCase().split('.').pop();
  if (ext === 'glb' || ext === 'gltf') return 'glb';
  if (ext === 'ogg') return 'ogg';
  if (ext === 'wav') return 'wav';
  throw new Error(`Unsupported extension on ${absPath}`);
}

/**
 * Pack name from the second path segment (the top-level domain
 * directory under public/assets/). This is the credits-screen
 * grouping. Specific overrides for the cases where the domain
 * doesn't read well as a pack name on its own.
 */
function packFor(absPath: string): string {
  const rel = relative(ASSETS_DIR, absPath);
  const top = rel.split(/[/\\]/)[0] ?? '';
  switch (top) {
    case 'board':
      return 'Kenney Hexagon Kit';
    case 'nature':
      return 'Kenney Nature Kit + Graveyard + Quaternius RTS';
    case 'structures':
      // Quaternius RTS is the dominant structure pack since the
      // M_HARDENING.5 reorg. The Castle Kit / Fantasy Town fallbacks
      // for granary/library/fountain/etc are minor.
      return 'Quaternius Ultimate Fantasy RTS + Kenney Castle/Town';
    case 'characters':
      return 'KayKit Adventurers + Mystery';
    case 'audio': {
      // sfx / ui / stinger → PixelLoops; music/biome → GameLoops V5.
      const sub = rel.split(/[/\\]/)[1] ?? '';
      if (sub === 'music') return 'GameLoops Vol.5 Fantasy RPG + PixelLoops Tavern/Menu';
      return 'PixelLoops SFX + UI + Impact';
    }
    case 'siege':
      return 'Kenney Tower Defense Kit';
    default:
      return top || 'Aethelgard';
  }
}

interface AssetEntry {
  id: string;
  path: string;
  category: string;
  kind: 'glb' | 'ogg' | 'wav';
  triangles?: number;
  animations: string[];
  pack: string;
}

async function buildEntry(absPath: string): Promise<AssetEntry> {
  const rel = relative(ASSETS_DIR, absPath);
  const id = logicalIdFor(absPath);
  const kind = kindFor(absPath);
  const category = rel.split(/[/\\]/)[0] ?? 'misc';
  const entry: AssetEntry = {
    id,
    path: `assets/${rel.split(/[/\\]/).join('/')}`,
    category,
    kind,
    animations: [],
    pack: packFor(absPath),
  };
  if (kind === 'glb') {
    try {
      const doc = await io.read(absPath);
      let triangles = 0;
      for (const mesh of doc.getRoot().listMeshes()) {
        for (const prim of mesh.listPrimitives()) {
          const indices = prim.getIndices();
          if (indices) triangles += indices.getCount() / 3;
          else {
            const pos = prim.getAttribute('POSITION');
            if (pos) triangles += pos.getCount() / 3;
          }
        }
      }
      entry.triangles = Math.round(triangles);
      entry.animations = doc
        .getRoot()
        .listAnimations()
        .map((a) => a.getName())
        .filter(Boolean);
    } catch (err) {
      console.warn(`Could not parse ${rel}: ${(err as Error).message}`);
    }
  }
  return entry;
}

async function main(): Promise<void> {
  const files: string[] = [];
  for (const f of walk(ASSETS_DIR)) {
    if (/\.(glb|gltf|ogg|wav)$/i.test(f)) files.push(f);
  }
  files.sort();
  const entries: Record<string, AssetEntry> = {};
  for (const f of files) {
    const e = await buildEntry(f);
    entries[e.id] = e;
  }
  writeFileSync(MANIFEST_OUT, `${JSON.stringify(entries, null, 2)}\n`);
  console.log(`Walked ${files.length} files → ${relative(REPO, MANIFEST_OUT)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
// Defeat ts unused-import lint when no GLBs are present.
void readFileSync;
