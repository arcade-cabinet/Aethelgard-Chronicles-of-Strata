import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import type { AssetEntry } from '../src/assets/manifest-types';
import { ASSET_MAP, logicalIdToOutputPath } from './asset-map';

const REPO = process.cwd();
const OUT_DIR = join(REPO, 'public');
const ASSETS_DIR = join(OUT_DIR, 'assets');
const REFERENCES_DIR = resolve(REPO, 'references');
const io = new NodeIO();

/** A GLB or audio asset kind, derived from a source file extension. */
type AssetKind = 'glb' | 'ogg' | 'wav';

/**
 * Resolve a curation-map source path and assert it stays inside `references/`.
 * Guards against a malformed or hostile ASSET_MAP entry (e.g. `../../etc/...`)
 * copying files from outside the asset bundle.
 */
function resolveSourcePath(source: string): string {
  const abs = resolve(REPO, source);
  const rel = relative(REFERENCES_DIR, abs);
  if (rel.startsWith('..') || resolve(REFERENCES_DIR, rel) !== abs) {
    throw new Error(`Asset source escapes references/: ${source}`);
  }
  return abs;
}

/** Classify a source file by extension. */
function kindOf(source: string): AssetKind {
  const lower = source.toLowerCase();
  if (lower.endsWith('.glb')) return 'glb';
  if (lower.endsWith('.wav')) return 'wav';
  return 'ogg';
}

/** Triangle count + animation names for a loaded GLB document. */
function glbMeta(doc: Awaited<ReturnType<NodeIO['read']>>): {
  triangles: number;
  animations: string[];
} {
  let triangles = 0;
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const indices = prim.getIndices();
      const position = prim.getAttribute('POSITION');
      const count = indices ? indices.getCount() : (position?.getCount() ?? 0);
      triangles += Math.floor(count / 3);
    }
  }
  const animations = doc
    .getRoot()
    .listAnimations()
    .map((a) => a.getName())
    .filter((n) => n.length > 0);
  return { triangles, animations };
}

/**
 * Read a source GLB, embed every texture (clear external URIs so the image
 * data travels inside the binary), and write a self-contained GLB to `outAbs`.
 * Kenney's GLB exports reference `Textures/colormap.png` by external URI even
 * though the image bytes are present — Three.js then fails to fetch it. Clearing
 * the URI makes the GLB load without the sidecar file. Returns the GLB metadata.
 */
async function embedAndWriteGlb(
  src: string,
  outAbs: string,
): Promise<{ triangles: number; animations: string[] }> {
  const doc = await io.read(src);
  for (const texture of doc.getRoot().listTextures()) {
    // an embedded texture has image bytes; drop the external URI so the
    // writer packs the bytes into the GLB binary chunk.
    if (texture.getImage()) texture.setURI('');
  }
  await io.write(outAbs, doc);
  return glbMeta(doc);
}

async function main(): Promise<void> {
  // Pass 1: resolve and validate every source path. Collect all failures so the
  // run reports the complete missing-asset list and copies nothing on failure.
  const resolved: Array<{ src: string; kind: AssetKind; item: (typeof ASSET_MAP)[number] }> = [];
  const missing: string[] = [];
  for (const item of ASSET_MAP) {
    const src = resolveSourcePath(item.source);
    if (!existsSync(src)) {
      missing.push(item.source);
      continue;
    }
    resolved.push({ src, kind: kindOf(item.source), item });
  }
  if (missing.length > 0) {
    for (const m of missing) console.error(`MISSING: ${m}`);
    console.error(`Ingest failed: ${missing.length} source asset(s) missing — nothing copied.`);
    process.exit(1);
  }

  // Pass 2: copy every file and build the manifest. All sources are verified present.
  mkdirSync(ASSETS_DIR, { recursive: true });
  const entries: Record<string, AssetEntry> = {};
  for (const { src, kind, item } of resolved) {
    const outRel = logicalIdToOutputPath(item.id, kind);
    const outAbs = join(OUT_DIR, outRel);
    mkdirSync(dirname(outAbs), { recursive: true });
    const entry: AssetEntry = {
      id: item.id,
      path: outRel,
      category: item.id.split('.')[0] ?? 'misc',
      kind,
      animations: [],
      pack: item.pack,
      license: item.license,
    };
    if (kind === 'glb') {
      try {
        const meta = await embedAndWriteGlb(src, outAbs);
        entry.triangles = meta.triangles;
        entry.animations = meta.animations;
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        throw new Error(`Failed to process GLB ${item.source}: ${reason}`);
      }
    } else {
      // audio assets are copied verbatim
      copyFileSync(src, outAbs);
    }
    entries[item.id] = entry;
  }

  // Write the importable metadata to src/config/asset-metadata.json.
  // This is the source of truth for logical-id → path + metadata used by assets.ts.
  // public/assets/ is NOT written a manifest.json — that file was removed in favour of
  // the importable src/config/asset-metadata.json (Vite forbids importing from public/).
  const metadataPath = join(REPO, 'src', 'config', 'asset-metadata.json');
  mkdirSync(dirname(metadataPath), { recursive: true });
  writeFileSync(metadataPath, `${JSON.stringify(entries, null, 2)}\n`);
  console.log(`Ingested ${Object.keys(entries).length} assets → src/config/asset-metadata.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
