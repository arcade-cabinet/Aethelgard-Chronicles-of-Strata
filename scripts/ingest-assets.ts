import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import type { AssetEntry, AssetManifest } from '../src/assets/manifest-types';
import { ASSET_MAP, logicalIdToOutputPath } from './asset-map';

const REPO = process.cwd();
const OUT_DIR = join(REPO, 'public');
const io = new NodeIO();

async function readGlbMeta(absPath: string): Promise<{ triangles: number; animations: string[] }> {
  const doc = await io.read(absPath);
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

async function main(): Promise<void> {
  const entries: AssetManifest['entries'] = {};
  let missing = 0;
  for (const item of ASSET_MAP) {
    const src = join(REPO, item.source);
    if (!existsSync(src)) {
      console.error(`MISSING: ${item.source}`);
      missing += 1;
      continue;
    }
    const kind = item.source.toLowerCase().endsWith('.glb') ? 'glb' : 'ogg';
    const outRel = logicalIdToOutputPath(item.id, kind);
    const outAbs = join(OUT_DIR, outRel);
    mkdirSync(dirname(outAbs), { recursive: true });
    copyFileSync(src, outAbs);
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
      const meta = await readGlbMeta(src);
      entry.triangles = meta.triangles;
      entry.animations = meta.animations;
    }
    entries[item.id] = entry;
  }
  if (missing > 0) {
    console.error(`Ingest failed: ${missing} source asset(s) missing.`);
    process.exit(1);
  }
  const manifest: AssetManifest = { generatedAt: new Date().toISOString(), entries };
  writeFileSync(join(OUT_DIR, 'assets', 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Ingested ${Object.keys(entries).length} assets.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
