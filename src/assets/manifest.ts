import type { AssetEntry, AssetManifest } from './manifest-types';

/** Read-only accessor over a generated asset manifest. */
export interface AssetAccessor {
  /** Resolve the full URL for a logical asset id, with the site base prefixed. */
  url(id: string): string;
  /** Return the full manifest entry for a logical asset id. */
  entry(id: string): AssetEntry;
  /** Every logical id within a category, sorted. */
  idsInCategory(category: string): string[];
  /** Unique (pack, license) pairs for the credits screen, sorted by pack. */
  credits(): Array<{ pack: string; license: string }>;
}

/**
 * Build a typed accessor over a manifest. `base` is the site base path
 * (`import.meta.env.BASE_URL`), applied to every resolved url.
 */
export function createAssetAccessor(manifest: AssetManifest, base: string): AssetAccessor {
  const normBase = base.endsWith('/') ? base : `${base}/`;
  const get = (id: string): AssetEntry => {
    const e = manifest.entries[id];
    if (!e) throw new Error(`Unknown asset id: ${id}`);
    return e;
  };
  return {
    url: (id) => `${normBase}${get(id).path}`,
    entry: get,
    idsInCategory: (category) =>
      Object.values(manifest.entries)
        .filter((e) => e.category === category)
        .map((e) => e.id)
        .sort(),
    credits: () => {
      // Dedup on the (pack, license) pair so a pack appearing under two
      // licenses contributes both — the credits screen must be legally exact.
      const seen = new Map<string, { pack: string; license: string }>();
      for (const e of Object.values(manifest.entries)) {
        const key = `${e.pack}::${e.license}`;
        if (!seen.has(key)) seen.set(key, { pack: e.pack, license: e.license });
      }
      return [...seen.values()].sort(
        (a, b) => a.pack.localeCompare(b.pack) || a.license.localeCompare(b.license),
      );
    },
  };
}
