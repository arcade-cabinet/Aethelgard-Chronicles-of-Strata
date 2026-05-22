import metadataJson from '../config/asset-metadata.json';
import { staticAssets } from '../static-assets';
import type { StaticAssetPath } from '../static-assets';
import type { AssetAccessor } from './manifest';
import type { AssetEntry } from './manifest-types';

/**
 * The application's asset accessor.
 *
 * Logical-id → path metadata is imported from src/config/asset-metadata.json
 * (importable from src/, never from public/). URL resolution goes through the
 * vite-static-assets-plugin's `staticAssets()` helper, which validates the
 * path at compile time and applies the correct Vite base path at runtime.
 *
 * Asset lookup is synchronous — no manifest fetch, no loading state.
 */

// Cast the JSON import to a typed record. The shape matches AssetEntry[].
const metadata = metadataJson as Record<string, AssetEntry>;

function getEntry(id: string): AssetEntry {
  const e = metadata[id];
  if (!e) throw new Error(`Unknown asset id: ${id}`);
  return e;
}

export const assets: AssetAccessor = {
  url: (id) => staticAssets(getEntry(id).path as StaticAssetPath),
  entry: getEntry,
  idsInCategory: (category) =>
    Object.values(metadata)
      .filter((e) => e.category === category)
      .map((e) => e.id)
      .sort(),
  credits: () => {
    // Dedup on the (pack, license) pair so a pack appearing under two
    // licenses contributes both — the credits screen must be legally exact.
    const seen = new Map<string, { pack: string; license: string }>();
    for (const e of Object.values(metadata)) {
      const key = `${e.pack}::${e.license}`;
      if (!seen.has(key)) seen.set(key, { pack: e.pack, license: e.license });
    }
    return [...seen.values()].sort(
      (a, b) => a.pack.localeCompare(b.pack) || a.license.localeCompare(b.license),
    );
  },
};
